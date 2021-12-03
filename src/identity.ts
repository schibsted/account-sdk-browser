/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

"use strict";

import { assert, isStr, isNonEmptyString, isObject, isUrl, isStrIn } from "./validate";
import { cloneDeep } from "./object";
import { urlMapper } from "./url";
import { ENDPOINTS, NAMESPACE } from "./config";
import { TinyEmitter } from "tiny-emitter";
import Cache from "./cache";
import * as popup from "./popup";
import RESTClient from "./RESTClient";
import SDKError from "./SDKError";
import * as spidTalk from "./spidTalk";
const { version } = require("../package.json");



function isHasSessionSuccessResponse(
    response: HasSessionResponse
): response is HasSessionSuccessResponse {
    return "result" in response;
}
function isHasSessionFailureResponse(
    response: HasSessionResponse
): response is HasSessionFailureResponse {
    return "error" in response;
}

export type SimplifiedLoginData = {
    /**
     * - Deprecated: User UUID, to be be used as `loginHint` for {@link Identity#login}
     */
    identifier: string;
    /**
     * - Human-readable user identifier
     */
    display_text: string;
    /**
     * - Client name
     */
    client_name: string;
};

export type SimplifiedLoginWidgetOptions = {
    /**
     * - expected encoding of simplified login widget. Could be utf-8 (default), iso-8859-1 or iso-8859-15
     */
    encoding: string;
};

export type EnableVarnishCookieOptions = {
    /**
     * Override this to set number of seconds before the varnish
     * cookie expires. The default is to use the same time that hasSession responses are cached for
     */
    expiresIn?: number;
    /** Override cookie domain. E.g. «vg.no» instead of «www.vg.no» */
    domain?: string;
};

const HAS_SESSION_CACHE_KEY = "hasSession-cache";
const globalWindow = () => window;

export interface IdentityOptions {
    /** Example: "1234567890abcdef12345678" */
    clientId: string;
    /** Example: "https://id.site.com" */
    sessionDomain: string;
    /** Example: "https://site.com" */
    redirectUri: string;
    /** Schibsted account environment: `PRE`, `PRO`, `PRO_NO`, `PRO_FI` or `PRO_DK` */
    env?: string;
    /** A function that receives debug log information. If not set, no logging will be done */
    log?: Function;
    /** window object */
    window?: Window;
}
/**
 * Provides Identity functionalty to a web page
 */
export class Identity extends TinyEmitter {
    private _sessionInitiatedSent: boolean = false;
    private _sessionDomain: string;
    private _enableSessionCaching: boolean;
    private _session: HasSessionSuccessResponse | undefined;
    private _spid: RESTClient;
    private _oauthService: RESTClient;
    private _bffService: RESTClient;
    private _sessionService: RESTClient;
    private _globalSessionService: RESTClient;
    private _hasSessionInProgress: Promise<HasSessionSuccessResponse> | undefined;
    window: Window;
    clientId: string;
    cache: Cache;
    redirectUri: string;
    env: string;
    log: Function;
    popup: any;
    setVarnishCookie: boolean;
    varnishExpiresIn: number;
    varnishCookieDomain: any;
    /**
     * @param options
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({
        clientId,
        redirectUri,
        sessionDomain,
        env = "PRE",
        log,
        window = globalWindow(),
    }: IdentityOptions) {
        super();
        assert(isNonEmptyString(clientId), "clientId parameter is required");
        assert(isObject(window), "The reference to window is missing");
        assert(!redirectUri || isUrl(redirectUri), "redirectUri parameter is invalid");
        assert(sessionDomain && isUrl(sessionDomain), "sessionDomain parameter is not a valid URL");

        spidTalk.emulate(window);

        this.window = window;
        this.clientId = clientId;
        this.cache = new Cache(() => this.window && this.window.sessionStorage);
        this.redirectUri = redirectUri;
        this.env = env;
        this.log = log;
        this._sessionDomain = sessionDomain;
        this._session.baseDomain = "";

        // Internal hack: set to false to always refresh from hassession
        this._enableSessionCaching = true;

        this._setSessionServiceUrl(sessionDomain);
        this._setSpidServerUrl(env);
        this._setBffServerUrl(env);
        this._setOauthServerUrl(env);
        this._setGlobalSessionServiceUrl(env);
    }

    /**
     * Set SPiD server URL
     * @param url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setSpidServerUrl(url: string) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._spid = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.SPiD),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set OAuth server URL
     * @param url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setOauthServerUrl(url: string) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._oauthService = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.SPiD),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set BFF server URL
     * @private
     * @param {string} url  - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setBffServerUrl(url: string) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._bffService = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.BFF),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set site-specific session-service domain
     * @private
     * @param {string} domain - real URL — (**not** 'PRE' style env key)
     * @returns {void}
     */
    private _setSessionServiceUrl(domain: string) {
        assert(isStr(domain), `domain parameter is invalid: ${domain}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this._sessionService = new RESTClient({
            serverUrl: domain,
            log: this.log,
            defaultParams: { client_sdrn, redirect_uri: this.redirectUri, sdk_version: version },
        });
    }

    /**
     * Set global session-service server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setGlobalSessionServiceUrl(url: string) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this._globalSessionService = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.SESSION_SERVICE),
            log: this.log,
            defaultParams: { client_sdrn, sdk_version: version },
        });
    }

    /**
     * Emits the relevant events based on the previous and new reply from hassession
     * @private
     * @param {object} previous
     * @param {object} current
     * @returns {void}
     */
    private _emitSessionEvent(
        previous: HasSessionSuccessResponse,
        current: HasSessionSuccessResponse
    ) {
        /**
         * Emitted when the user is logged in (This happens as a result of calling
         * {@link Identity#hasSession}, so it is also emitted if the user was previously logged in)
         * @event Identity#login
         */
        if (current.userId) {
            this.emit("login", current);
        }
        /**
         * Emitted when the user logged out
         * @event Identity#logout
         */
        if (previous.userId && !current.userId) {
            this.emit("logout", current);
        }
        /**
         * Emitted when the user is changed. This happens as a result of calling
         * {@link Identity#hasSession}, and is emitted if there was a user both before and after
         * this invocation, and the userId has now changed
         * @event Identity#userChange
         */
        if (previous.userId && current.userId && previous.userId !== current.userId) {
            this.emit("userChange", current);
        }
        if (previous.userId || current.userId) {
            /**
             * Emitted when the session is changed. More accurately, this event is emitted if there
             * was a logged-in user either before or after {@link Identity#hasSession} was called.
             * In practice, this means the event is emitted a lot
             * @event Identity#sessionChange
             */
            this.emit("sessionChange", current);
        } else {
            /**
             * Emitted when there is no logged-in user. More specifically, it means that there was
             * no logged-in user neither before nor after {@link Identity#hasSession} was called
             * @event Identity#notLoggedin
             */
            this.emit("notLoggedin", current);
        }
        /**
         * Emitted when the session is first created
         * @event Identity#sessionInit
         */
        if (current.userId && !this._sessionInitiatedSent) {
            this._sessionInitiatedSent = true;
            this.emit("sessionInit", current);
        }
        /**
         * Emitted when the user status changes. This happens as a result of calling
         * {@link Identity#hasSession}
         * @event Identity#statusChange
         */
        if (previous.userStatus !== current.userStatus) {
            this.emit("statusChange", current);
        }
    }

    /**
     * Close this.popup if it exists and is open
     * @private
     * @returns {void}
     */
    _closePopup() {
        if (this.popup) {
            if (!this.popup.closed) {
                this.popup.close();
            }
            this.popup = null;
        }
    }

    /**
     * Set the Varnish cookie (`SP_ID`) when hasSession() is called. Note that most browsers require
     * that you are on a "real domain" for this to work — so, **not** `localhost`
     * @param {EnableVarnishCookieOptions|number} [options] Either VarnishCookieOptions or expiresIn
     */
    enableVarnishCookie(options: EnableVarnishCookieOptions | number) {
        let expiresIn = 0;
        let domain;
        if (typeof options === "number" && Number.isInteger(options)) {
            expiresIn = options;
        } else if (typeof options == "object") {
            ({ expiresIn = expiresIn, domain = domain } = options);
        }

        assert(Number.isInteger(expiresIn), `'expiresIn' must be an integer`);
        assert(expiresIn >= 0, `'expiresIn' cannot be negative`);
        this.setVarnishCookie = true;
        this.varnishExpiresIn = expiresIn;
        this.varnishCookieDomain = domain;
    }

    /**
     * Set the Varnish cookie if configured
     */
    private _maybeSetVarnishCookie(sessionData: HasSessionSuccessResponse) {
        if (!this.setVarnishCookie) {
            return;
        }
        const date = new Date();
        const validExpires =
            this.varnishExpiresIn ||
            (typeof sessionData.expiresIn === "number" && sessionData.expiresIn > 0);
        if (validExpires) {
            const expires = this.varnishExpiresIn || sessionData.expiresIn;
            date.setTime(date.getTime() + expires * 1000);
        } else {
            date.setTime(0);
        }

        // If the domain is missing or of the wrong type, we'll use document.domain
        let domain =
            this.varnishCookieDomain ||
            (typeof sessionData.baseDomain === "string"
                ? sessionData.baseDomain
                : document.domain) ||
            "";

        const cookie = [
            `SP_ID=${sessionData.sp_id}`,
            `expires=${date.toUTCString()}`,
            `path=/`,
            `domain=.${domain}`,
        ].join("; ");
        document.cookie = cookie;
    }

    /**
     * Clear the Varnish cookie if configured
     */
    private _maybeClearVarnishCookie(): void {
        if (this.setVarnishCookie) {
            this._clearVarnishCookie();
        }
    }

    /**
     * Clear the Varnish cookie
     */
    private _clearVarnishCookie(): void {
        let domain =
            this.varnishCookieDomain ||
            (this._session && typeof this._session.baseDomain === "string"
                ? this._session.baseDomain
                : document.domain) ||
            "";

        document.cookie = `SP_ID=nothing; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
    }

    /**
     * Log used settings and version
     * @throws {SDKError} - If log method is not provided
     * @return {void}
     */
    logSettings() {
        if (!this.log && !window.console) {
            throw new SDKError("You have to provide log method in constructor");
        }

        const log = this.log || console.log;

        const settings = {
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            env: this.env,
            sessionDomain: this._sessionDomain,
            sdkVersion: version,
        };

        log(`Schibsted account SDK for browsers settings: \n${JSON.stringify(settings, null, 2)}`);
    }

    /**
     * @summary Queries the hassession endpoint and returns information about the status of the user
     * @description When we send a request to this endpoint, cookies sent along with the request
     * determines the status of the user.
     * @throws {SDKError} - If the call to the hasSession service fails in any way (this will happen
     * if, say, the user is not logged in)
     * @fires Identity#login
     * @fires Identity#logout
     * @fires Identity#userChange
     * @fires Identity#sessionChange
     * @fires Identity#notLoggedin
     * @fires Identity#sessionInit
     * @fires Identity#statusChange
     * @fires Identity#error
     * @return {Promise<HasSessionSuccessResponse>}
     */
    public hasSession(): Promise<HasSessionSuccessResponse> {
        if (this._hasSessionInProgress) {
            return this._hasSessionInProgress;
        }
        const _postProcess = (sessionData: HasSessionResponse) => {
            if (isHasSessionFailureResponse(sessionData)) {
                throw new SDKError("HasSession failed", sessionData.error);
            }
            this._maybeSetVarnishCookie(sessionData);
            this._emitSessionEvent(this._session, sessionData);
            this._session = sessionData;
            return sessionData;
        };
        const _getSession = async () => {
            if (this._enableSessionCaching) {
                // Try to resolve from cache (it has a TTL)
                let cachedSession = this.cache.get(HAS_SESSION_CACHE_KEY);
                if (cachedSession) {
                    return _postProcess(cachedSession);
                }
            }
            let sessionData = null;
            try {
                sessionData = await this._sessionService.get("/session");
            } catch (err) {
                if (err && err.code === 400 && this._enableSessionCaching) {
                    const expiresIn = 1000 * (err.expiresIn || 300);
                    this.cache.set(HAS_SESSION_CACHE_KEY, { error: err }, expiresIn);
                }
                throw err;
            }

            if (sessionData && this._enableSessionCaching) {
                const expiresIn = 1000 * (sessionData.expiresIn || 300);
                this.cache.set(HAS_SESSION_CACHE_KEY, sessionData, expiresIn);
            }
            return _postProcess(sessionData);
        };
        this._hasSessionInProgress = _getSession().then(
            (sessionData) => {
                this._hasSessionInProgress = undefined;
                return sessionData;
            },
            (err) => {
                this.emit("error", err);
                this._hasSessionInProgress = undefined;
                throw new SDKError("HasSession failed", err);
            }
        );

        return this._hasSessionInProgress;
    }

    /**
     * @async
     * @summary Allows the client app to check if the user is logged in to Schibsted account
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {Promise<boolean>}
     */
    async isLoggedIn() {
        try {
            const data = await this.hasSession();
            // TODO: Should this not also check data.result?
            return isHasSessionSuccessResponse(data);
        } catch (_) {
            return false;
        }
    }

    /**
     * Removes the cached user session.
     * @returns {void}
     */
    clearCachedUserSession() {
        this.cache.delete(HAS_SESSION_CACHE_KEY);
    }

    /**
     * @async
     * @summary Allows the caller to check if the current user is connected to the client_id in
     * Schibsted account. Being connected means that the user has agreed for their account to be
     * used by your web app and have accepted the required terms
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @summary Check if the user is connected to the client_id
     * @return {Promise<boolean>}
     */
    async isConnected() {
        try {
            const data = await this.hasSession();
            // if data is not an object, the promise will fail.
            // if the result is present, it's boolean. But if it's not, it should be assumed false.
            return !!data.result;
        } catch (_) {
            return false;
        }
    }

    /**
     * @async
     * @summary Returns information about the user
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @throws {SDKError} If we couldn't get the user
     */
    async getUser(): Promise<HasSessionSuccessResponse> {
        const user = await this.hasSession();
        if (!user.result) {
            throw new SDKError("The user is not connected to this merchant");
        }
        return cloneDeep(user);
    }

    /**
     * @async
     * @summary In Schibsted account, there are two ways of identifying a user; the `userId` and the
     * `uuid`. There are reasons for them both existing. The `userId` is a numeric identifier, but
     * since Schibsted account is deployed separately in Norway and Sweden, there are a lot of
     * duplicates. The `userId` was introduced early, so many sites still need to use them for
     * legacy reasons. The `uuid` is universally unique, and so — if we could disregard a lot of
     * Schibsted components depending on the numeric `userId` — it would be a good identifier to use
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @return The `userId` field (not to be confused with the `uuid`)
     */
    async getUserId(): Promise<string> {
        const user = await this.hasSession();
        if (user.userId && user.result) {
            return String(user.userId);
        }
        throw new SDKError("The user is not connected to this merchant");
    }

    /**
     * @async
     * @summary In Schibsted account, there are two ways of identifying a user; the `userId` and the
     * `uuid`. There are reasons for them both existing. The `userId` is a numeric identifier, but
     * since Schibsted account is deployed separately in Norway and Sweden, there are a lot of
     * duplicates. The `userId` was introduced early, so many sites still need to use them for
     * legacy reasons. The `uuid` is universally unique, and so — if we could disregard a lot of
     * Schibsted components depending on the numeric `userId` — it would be a good identifier to use
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @return {Promise<string>} The `uuid` field (not to be confused with the `userId`)
     */
    async getUserUuid() {
        const user = await this.hasSession();
        if (user.uuid && user.result) {
            return user.uuid;
        }
        throw new SDKError("The user is not connected to this merchant");
    }

    /**
     * @async
     * @summary Get basic information about any user currently logged-in to their Schibsted account
     * in this browser. Can be used to provide context in a continue-as prompt.
     * @description This function relies on the global Schibsted account user session cookie, which
     * is a third-party cookie and hence might be blocked by the browser (for example due to ITP in
     * Safari). So there's no guarantee any data is returned, even though a user is logged-in in
     * the current browser.
     * @return {Promise<SimplifiedLoginData|null>}
     */
    async getUserContextData() {
        try {
            return await this._globalSessionService.get("/user-context");
        } catch (_) {
            return null;
        }
    }
    /**
     * If a popup is desired, this function needs to be called in response to a user event (like
     * click or tap) in order to work correctly. Otherwise the popup will be blocked by the
     * browser's popup blockers and has to be explicitly authorized to be shown.
     * @summary Perform a login, either using a full-page redirect or a popup
     * @see https://tools.ietf.org/html/rfc6749#section-4.1.1
     *
     * @param {LoginOptions} options
     * @param {string} options.state
     * @param {string} [options.acrValues]
     * @param {string} [options.scope=openid]
     * @param {string} [options.redirectUri]
     * @param {boolean} [options.preferPopup=false]
     * @param {string} [options.loginHint]
     * @param {string} [options.tag]
     * @param {string} [options.teaser]
     * @param {number|string} [options.maxAge]
     * @param {string} [options.locale]
     * @param {boolean} [options.oneStepLogin=false]
     * @param {string} [options.prompt=select_account]
     * @return {Window|null} - Reference to popup window if created (or `null` otherwise)
     */
    login({
        state,
        acrValues = "",
        scope = "openid",
        redirectUri = this.redirectUri,
        preferPopup = false,
        loginHint = "",
        tag = "",
        teaser = "",
        maxAge = "",
        locale = "",
        oneStepLogin = false,
        prompt = "select_account",
    }: LoginOptions) {
        this._closePopup();
        this.cache.delete(HAS_SESSION_CACHE_KEY);
        const url = this.loginUrl({
            state,
            acrValues,
            scope,
            redirectUri,
            loginHint,
            tag,
            teaser,
            maxAge,
            locale,
            oneStepLogin,
            prompt,
        });

        if (preferPopup) {
            this.popup = popup.open(this.window, url, "Schibsted account", {
                width: 360,
                height: 570,
            });
            if (this.popup) {
                return this.popup;
            }
        }
        this.window.location.href = url;
        return null;
    }

    /**
     * @async
     * @summary Retrieve the sp_id (Varnish ID)
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {Promise<string|null>} - The sp_id string or null (if the server didn't return it)
     */
    async getSpId() {
        try {
            const user = await this.hasSession();
            return user.sp_id || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * @summary Logs the user out from the Identity platform
     * @param {string} redirectUri - Where to redirect the browser after logging out of Schibsted
     * account
     * @return {void}
     */
    logout(redirectUri = this.redirectUri) {
        this.cache.delete(HAS_SESSION_CACHE_KEY);
        this._maybeClearVarnishCookie();
        this.emit("logout");
        this.window.location.href = this.logoutUrl(redirectUri);
    }

    /**
     * Generates the link to the new login page that'll be used in the popup or redirect flow
     * @param {LoginOptions} options
     * @param {string} options.state
     * @param {string} [options.acrValues]
     * @param {string} [options.scope=openid]
     * @param {string} [options.redirectUri]
     * @param {string} [options.loginHint]
     * @param {string} [options.tag]
     * @param {string} [options.teaser]
     * @param {number|string} [options.maxAge]
     * @param {string} [options.locale]
     * @param {boolean} [options.oneStepLogin=false]
     * @param {string} [options.prompt=select_account]
     * @return {string} - The url
     */
    loginUrl({
        state,
        acrValues = "",
        scope = "openid",
        redirectUri = this.redirectUri,
        loginHint = "",
        tag = "",
        teaser = "",
        maxAge = "",
        locale = "",
        oneStepLogin = false,
        prompt = "select_account",
    }: LoginOptions) {
        if (typeof arguments[0] !== "object") {
            // backward compatibility
            state = arguments[0];
            acrValues = arguments[1];
            scope = arguments[2] || scope;
            redirectUri = arguments[3] || redirectUri;
            loginHint = arguments[4] || loginHint;
            tag = arguments[5] || tag;
            teaser = arguments[6] || teaser;
            maxAge = isNaN(arguments[7]) ? maxAge : arguments[7];
        }
        const isValidAcrValue = (acrValue: string) =>
            isStrIn(acrValue, ["password", "otp", "sms"], true);
        assert(
            !acrValues ||
                isStrIn(acrValues, ["", "otp-email", "otp-sms"], true) ||
                acrValues.split(" ").every(isValidAcrValue),
            `The acrValues parameter is not acceptable: ${acrValues}`
        );
        assert(
            isUrl(redirectUri),
            `loginUrl(): redirectUri must be a valid url but is ${redirectUri}`
        );
        assert(
            isNonEmptyString(state),
            `the state parameter should be a non empty string but it is ${state}`
        );

        return this._oauthService.makeUrl("oauth/authorize", {
            response_type: "code",
            redirect_uri: redirectUri,
            scope,
            state,
            acr_values: acrValues,
            login_hint: loginHint,
            tag,
            teaser,
            max_age: maxAge,
            locale,
            one_step_login: oneStepLogin || "",
            prompt: acrValues ? "" : prompt,
        });
    }

    /**
     * The url for logging the user out
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} url
     */
    logoutUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `logoutUrl(): redirectUri is invalid`);
        const params = { redirect_uri: redirectUri };
        return this._sessionService.makeUrl("logout", params);
    }

    /**
     * The account summary page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    accountUrl(redirectUri = this.redirectUri) {
        return this._spid.makeUrl("account/summary", {
            response_type: "code",
            redirect_uri: redirectUri,
        });
    }

    /**
     * The phone editing page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    phonesUrl(redirectUri = this.redirectUri) {
        return this._spid.makeUrl("account/phones", {
            response_type: "code",
            redirect_uri: redirectUri,
        });
    }

    /**
     * Function responsible for loading and displaying simplified login widget. How often
     * widget will be display is up to you. Preferred way would be to show it once per user,
     * and store that info in localStorage. Widget will be display only if user is logged in to SSO.
     *
     * @async
     * @param {SimplifiedLoginWidgetLoginOptions} loginParams - the same as `options` param for login function. Login will be called on user
     * continue action. `state` might be string or async function.
     * @param {SimplifiedLoginWidgetOptions} [options] - additional configuration of Simplified Login Widget
     * @return {Promise<boolean|SDKError>} - will resolve to true if widget will be display. Otherwise will throw SDKError
     */
    async showSimplifiedLoginWidget(
        loginParams: SimplifiedLoginWidgetLoginOptions,
        options: SimplifiedLoginWidgetOptions
    ) {
        // getUserContextData doens't throw exception
        const userData = await this.getUserContextData();

        const queryParams: Record<string, string> = { client_id: this.clientId };
        if (options && options.encoding) {
            queryParams.encoding = options.encoding;
        }
        const widgetUrl = this._bffService.makeUrl("simplified-login-widget", queryParams, false);

        const prepareLoginParams = async (
            loginPrams: SimplifiedLoginWidgetLoginOptions
        ): Promise<LoginOptions> => {
            if (typeof loginParams.state === "function") {
                return { ...loginPrams, state: await loginParams.state() };
            }
            return loginParams as LoginOptions;
        };

        return new Promise((resolve, reject) => {
            if (!userData || !userData.display_text || !userData.identifier) {
                return reject(new SDKError("Missing user data"));
            }

            const initialParams = {
                displayText: userData.display_text,
                env: this.env,
                clientName: userData.client_name,
                clientId: this.clientId,
                providerId: userData.provider_id,
                windowWidth: () => window.innerWidth,
                windowOnResize: (f: ((this: GlobalEventHandlers, ev: UIEvent) => any) & ((this: Window, ev: UIEvent) => any)) => {
                    window.onresize = f;
                },
            };

            const loginHandler = async () => {
                this.login(
                    Object.assign(await prepareLoginParams(loginParams), {
                        loginHint: userData.identifier,
                    })
                );
            };

            const loginNotYouHandler = async () => {
                this.login(
                    Object.assign(await prepareLoginParams(loginParams), {
                        loginHint: userData.identifier,
                        prompt: "login",
                    })
                );
            };

            if (window.openSimplifiedLoginWidget) {
                window.openSimplifiedLoginWidget(initialParams, loginHandler, loginNotYouHandler);
                return resolve(true);
            }

            const simplifiedLoginWidget = document.createElement("script");
            simplifiedLoginWidget.type = "text/javascript";
            simplifiedLoginWidget.src = widgetUrl;
            simplifiedLoginWidget.onload = () => {
                window.openSimplifiedLoginWidget(initialParams, loginHandler, loginNotYouHandler);
                resolve(true);
            };
            simplifiedLoginWidget.onerror = () => {
                reject(new SDKError("Error when loading simplified login widget content"));
            };
            document.getElementsByTagName("body")[0].appendChild(simplifiedLoginWidget);
        });
    }
}

export default Identity;
export type BaseLoginOptions = {
    /**
     * - Authentication Context Class Reference Values. If
     * omitted, the user will be asked to authenticate using username+password.
     * For 2FA (Two-Factor Authentication) possible values are `sms`, `otp` (one time password) and
     * `password` (will force password confirmation, even if user is already logged in). Those values might
     * be mixed as space-separated string. To make sure that user has authenticated with 2FA you need
     * to verify AMR (Authentication Methods References) claim in ID token.
     * Might also be used to ensure additional acr (sms, otp) for already logged in users.
     * Supported values are also 'otp-email' means one time password using email, and 'otp-sms' means
     * one time password using sms.
     */
    acrValues?: string;
    /**
     * - The OAuth scopes for the tokens. This is a list of
     * scopes, separated by space. If the list of scopes contains `openid`, the generated tokens
     * includes the id token which can be useful for getting information about the user. Omitting
     * scope is allowed, while `invalid_scope` is returned when the client asks for a scope you
     * aren’t allowed to request. {@link https://tools.ietf.org/html/rfc6749#section-3.3}
     */
    scope?: string;
    /**
     * - Redirect uri that will receive the
     * code. Must exactly match a redirectUri from your client in self-service
     */
    redirectUri?: string;
    /**
     * - Should we try to open a popup window?
     */
    preferPopup?: boolean;
    /**
     * - user email or UUID hint
     */
    loginHint?: string;
    /**
     * - Pulse tag
     */
    tag?: string;
    /**
     * - Teaser slug. Teaser with given slug will be displayed
     * in place of default teaser
     */
    teaser?: string;
    /**
     * - Specifies the allowable elapsed time in seconds since
     * the last time the End-User was actively authenticated. If last authentication time is more
     * than maxAge seconds in the past, re-authentication will be required. See the OpenID Connect
     * spec section 3.1.2.1 for more information
     */
    maxAge?: number | string;
    /**
     * - Optional parameter to overwrite client locale setting.
     * New flows supports nb_NO, fi_FI, sv_SE, en_US
     */
    locale?: string;
    /**
     * - display username and password on one screen
     */
    oneStepLogin?: boolean;
    /**
     * - String that specifies whether the Authorization Server prompts the
     * End-User for reauthentication or confirm account screen. Supported values: `select_account` or `login`
     */
    prompt?: string;
};

export interface LoginOptions extends BaseLoginOptions {
    /**
     * - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
     */
    state: string;
}

export interface SimplifiedLoginWidgetLoginOptions extends BaseLoginOptions {
    /**
     * - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
     */
    state: string | (() => string | Promise<string>);
}

export type HasSessionSuccessResponse = {
    /**
     * - Is the user connected to the merchant? (it means that the merchant
     * id is in the list of merchants listed of this user in the database)? Example: false
     */
    result: boolean;
    /**
     * - Example: 'notConnected' or 'connected'. Deprecated, use
     * `Identity.isConnected()`
     */
    userStatus: string;
    /**
     * - Example: 'localhost'
     */
    baseDomain: string;
    /**
     * - Example: '58eca10fdbb9f6df72c3368f'. Obsolete
     */
    id: string;
    /**
     * - Example: 37162
     */
    userId: number;
    /**
     * - Example: 'b3b23aa7-34f2-5d02-a10e-5a3455c6ab2c'
     */
    uuid: string;
    /**
     * - Example: 'eyJjbGllbnRfaWQ...'
     */
    sp_id: string;
    /**
     * - Example: 30 * 60 * 1000 (for 30 minutes)
     */
    expiresIn: number;
    /**
     * - Example: 1506285759
     */
    serverTime: number;
    /**
     * - Example: 'NCdzXaz4ZRb7...' The sig parameter is a concatenation of an
     * HMAC SHA-256 signature string, a dot (.) and a base64url encoded JSON object (session).
     * {@link http://techdocs.spid.no/sdks/js/response-signature-and-validation/}
     */
    sig: string;
    /**
     * - (Only for connected users) Example: 'batman'
     */
    displayName: string;
    /**
     * - (Only for connected users) Example: 'Bruce'
     */
    givenName: string;
    /**
     * - (Only for connected users) Example: 'Wayne'
     */
    familyName: string;
    /**
     * - (Only for connected users) Example: 'male', 'female', 'undisclosed'
     */
    gender: string;
    /**
     * - (Only for connected users) Example:
     * 'http://www.srv.com/some/picture.jpg'
     */
    photo: string;
    /**
     * - (Only for connected users)
     */
    tracking: boolean;
    /**
     * - (Only for connected users)
     */
    clientAgreementAccepted: boolean;
    /**
     * - (Only for connected users)
     */
    defaultAgreementAccepted: boolean;
};

/**
 * Emitted when an error happens (useful for debugging)
 * @event Identity#error
 */

export type HasSessionFailureResponse = {
    error: {
        /**
         * - Typically an HTTP response code. Example: 401
         */
        code: number;
        /**
         * - Example: "No session found!"
         */
        description: string;
        /**
         * - Example: "UserException"
         */
        type: string;
    };
    response: {
        /**
         * - Example: "localhost"
         */
        baseDomain: string;
        /**
         * - Time span in milliseconds. Example: 30 * 60 * 1000 (for 30 minutes)
         */
        expiresIn: number;
        result: boolean;
        /**
         * - Server time in seconds since the Unix Epoch. Example: 1506287788
         */
        serverTime: number;
    };
};
/**
 * A promise for the user's favorite color.
 *
 * @promise HasSessionResponse
 * @fulfill {HasSessionSuccessResponse} Successfull session request.
 * @reject {HasSessionFailureResponse} Unable to get session
 */
export type HasSessionResponse = HasSessionSuccessResponse | HasSessionFailureResponse;
