/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import {
    assert,
    isNonEmptyObj,
    isNonEmptyString,
    isObject,
    isStr,
    isStrIn,
    isUrl,
} from './utils/validate';
import { cloneDeep } from './utils/object';
import { urlMapper } from './utils/url';
import { ENDPOINTS, NAMESPACE } from './config/config';
import { EventEmitter } from 'events';
import Cache from './utils/cache';
import * as popup from './utils/popup';
import RESTClient from './clients/RESTClient';
import SDKError from './utils/SDKError';
import version from './version';
import { Environment, GenericObject, Optional, UserSession } from './utils/types';



interface IdentityOpts {
    /**
     * @property {string} clientId
     * @description Web applications client ID within Schibsted Account ecosystem
     */
    clientId: string,
    /**
     * @property {string} redirectUri
     * @description
     */
    redirectUri: string,
    /**
     * @property {string} sessionDomain
     * @description URL to brand-owned session domain pointing to global Session Service
     */
    sessionDomain: string,
    /**
     * @property {string} env
     * @description Schibsted Account environment code
     * @example 'PRE'
     */
    env: Environment,
    /**
     * @property {Function} log
     * @description Optional logger function
     */
    log: Function,
    /**
     * @property {Window} window
     * @description Reference to the window object, if not provided the SDK will use the default Window object
     */
    window: Window
}

interface VarnishCookieOpts {
    expiresIn: number,
    domain: string
}


interface LoginOpts {
    /**
     * @property {string} state
     * @description An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
     */
    state: string | Function,
    /**
     * @property {string} [acrValues]
     * @description Authentication Context Class Reference Values. If
     * omitted, the user will be asked to authenticate using username+password.
     * For 2FA (Two-Factor Authentication) possible values are `sms`, `otp` (one time password),
     * `password` (will force password confirmation, even if user is already logged in), `eid`. Those values might
     * be mixed as space-separated string. To make sure that user has authenticated with 2FA you need
     * to verify AMR (Authentication Methods References) claim in ID token.
     * Might also be used to ensure additional acr (sms, otp) for already logged in users.
     * Supported value is also 'otp-email' means one time password using email.
     * @example 'otp'
     */
    acrValues: string,
    /**
     * @property {string} [scope]
     * @description The OAuth scopes for the tokens. This is a list of
     * scopes, separated by space. If the list of scopes contains `openid`, the generated tokens
     * includes the id token which can be useful for getting information about the user. Omitting
     * scope is allowed, while `invalid_scope` is returned when the client asks for a scope you
     * aren’t allowed to request. {@link https://tools.ietf.org/html/rfc6749#section-3.3}
     */
    scope: string,
    /**
     * @property {string} [redirectUri]
     * @description Redirect uri that will receive the
     * code. Must exactly match a redirectUri from your client in self-service
     */
    redirectUri: string,
    /**
     * @property {boolean} [preferPopup]
     * @description Should we try to open a popup window?
     */
    preferPopup: boolean,
    /**
     * @property {string} [loginHint]
     * @description user email or UUID hint
     */
    loginHint: string,
    /**
     * @property {string} [tag]
     * @description Pulse tag
     */
    tag: string,
    /**
     * @property {string} [teaser]
     * @description Teaser slug. Teaser with given slug will be displayed
     * in place of default teaser
     */
    teaser: string,
    /**
     * @property {number|string} [maxAge]
     * @description Specifies the allowable elapsed time in seconds since
     * the last time the End-User was actively authenticated. If last authentication time is more
     * than maxAge seconds in the past, re-authentication will be required. See the OpenID Connect
     * spec section 3.1.2.1 for more information
     */
    maxAge: string | number,
    /**
     * @property {string} [locale]
     * @description Optional parameter to overwrite client locale setting.
     * New flows supports nb_NO, fi_FI, sv_SE, en_US
     * @example 'nb_NO'
     */
    locale: string,
    /**
     * @property {boolean} [oneStepLogin]
     * @description Display username and password on one screen
     */
    oneStepLogin: boolean,
    /**
     *  @property {string} [prompt]
     *  @description String that specifies whether the Authorization Server prompts the
     *  End-User for re-authentication or confirm account screen. Supported values: `select_account` or `login`
     *  @example 'login'
     */
    prompt: 'select_account',
}

/**
 * @typedef {object} SimplifiedLoginWidgetLoginOptions
 * @property {string|function(): (string|Promise<string>)} state - An opaque value used by the client to maintain state between
 * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
 * @property {string} [acrValues] - Authentication Context Class Reference Values. If
 * omitted, the user will be asked to authenticate using username+password.
 * For 2FA (Two-Factor Authentication) possible values are `sms`, `otp` (one time password) and
 * `password` (will force password confirmation, even if user is already logged in). Those values might
 * be mixed as space-separated string. To make sure that user has authenticated with 2FA you need
 * to verify AMR (Authentication Methods References) claim in ID token.
 * Might also be used to ensure additional acr (sms, otp) for already logged in users.
 * Supported value is also 'otp-email' means one time password using email.
 * @property {string} [scope] - The OAuth scopes for the tokens. This is a list of
 * scopes, separated by space. If the list of scopes contains `openid`, the generated tokens
 * includes the id token which can be useful for getting information about the user. Omitting
 * scope is allowed, while `invalid_scope` is returned when the client asks for a scope you
 * aren’t allowed to request. {@link https://tools.ietf.org/html/rfc6749#section-3.3}
 * @property {string} [redirectUri] - Redirect uri that will receive the
 * code. Must exactly match a redirectUri from your client in self-service
 * @property {boolean} [preferPopup] - Should we try to open a popup window?
 * @property {string} [loginHint] - user email or UUID hint
 * @property {string} [tag] - Pulse tag
 * @property {string} [teaser] - Teaser slug. Teaser with given slug will be displayed
 * in place of default teaser
 * @property {number|string} [maxAge] - Specifies the allowable elapsed time in seconds since
 * the last time the End-User was actively authenticated. If last authentication time is more
 * than maxAge seconds in the past, re-authentication will be required. See the OpenID Connect
 * spec section 3.1.2.1 for more information
 * @property {string} [locale] - Optional parameter to overwrite client locale setting.
 * New flows supports nb_NO, fi_FI, sv_SE, en_US
 * @property {boolean} [oneStepLogin] - display username and password on one screen
 * @property {string} [prompt] - String that specifies whether the Authorization Server prompts the
 * End-User for reauthentication or confirm account screen. Supported values: `select_account` or `login`
 */

interface SimplifiedLoginOpts {
    encoding: string,
    locale: string
}

interface SimplifiedLoginData {
    provider_id: string;
    identifier: string,
    display_text: string,
    client_name: string
}

/**
 * Emitted when an error happens (useful for debugging)
 * @event Identity#error
 */

/**
 * @typedef {object} HasSessionFailureResponse
 * @property {object} error
 * @property {number} error.code - Typically an HTTP response code. Example: 401
 * @property {string} error.description - Example: "No session found!"
 * @property {string} error.type - Example: "UserException"
 * @property {object} response
 * @property {string} response.baseDomain - Example: "localhost"
 * @property {number} response.expiresIn - Time span in milliseconds. Example: 30 * 60 * 1000 (for 30 minutes)
 * @property {boolean} response.result
 * @property {number} response.serverTime - Server time in seconds since the Unix Epoch. Example: 1506287788
 */

/**
 * @typedef {object} SimplifiedLoginData
 * @property {string} identifier - Deprecated: User UUID, to be be used as `loginHint` for {@link Identity#login}
 * @property {string} display_text - Human-readable user identifier
 * @property {string} client_name - Client name
 */

/**
 * @typedef {object} SimplifiedLoginWidgetOptions
 * @property {string} encoding - expected encoding of simplified login widget. Could be utf-8 (default), iso-8859-1 or iso-8859-15
 */

const HAS_SESSION_CACHE_KEY = 'hasSession-cache';
const globalWindow = () => window;

/**
 * Provides Identity functionalty to a web page
 */
export class Identity extends EventEmitter {
    /**
     * @param {object} options
     * @param {string} options.clientId - Example: "1234567890abcdef12345678"
     * @param {string} options.sessionDomain - Example: "https://id.site.com"
     * @param {string} options.redirectUri - Example: "https://site.com"
     * @param {string} [options.env=PRE] - Schibsted account environment: `PRE`, `PRO`, `PRO_NO`, `PRO_FI` or `PRO_DK`
     * @param {function} [options.log] - A function that receives debug log information. If not set,
     * no logging will be done
     * @param {object} [options.window] - window object
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, sessionDomain, env = 'PRE', log, window = globalWindow() }: IdentityOpts) {
        super();
        assert(isNonEmptyString(clientId), 'clientId parameter is required');
        assert(isObject(window), 'The reference to window is missing');
        assert(!redirectUri || isUrl(redirectUri), 'redirectUri parameter is invalid');
        assert(!sessionDomain || isUrl(sessionDomain), 'sessionDomain parameter is not a valid URL');

        this._sessionInitiatedSent = false;
        this.window = window;
        this.clientId = clientId;
        this.cache = new Cache(() => this.window && this.window.sessionStorage);
        this.redirectUri = redirectUri;
        this.env = env;
        this.log = log;
        this._sessionDomain = sessionDomain;

        // Internal hack: set to false to always refresh from hassession
        this._enableSessionCaching = true;

        // Old session
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        this._session = {};

        this._setBrandSessionServiceUrl(sessionDomain);
        this._setSpidServerUrl(env);
        this._setBffServerUrl(env);
        this._setOauthServerUrl(env);
        this._setGlobalSessionServiceUrl(env);
    }

    private _sessionInitiatedSent: boolean;

    private readonly window: Window;

    private readonly clientId: string;

    private readonly cache: Cache;

    private readonly redirectUri: string;

    private readonly env: Environment;

    private readonly _sessionDomain: string;

    private readonly _enableSessionCaching: boolean;

    private readonly log: Function;

    private _session: UserSession;

    private spidClient: RESTClient | undefined;

    private bffClient: RESTClient | undefined;

    private oauthServiceClient: RESTClient | undefined;

    private brandSessionServiceClient:  RESTClient | undefined;

    private globalSessionServiceClient:  RESTClient | undefined;

    private popupWindowRef: Optional<Window>;

    private setVarnishCookie: Optional<boolean>;

    private varnishExpiresIn: Optional<number>;

    private varnishCookieDomain: Optional<string>;

    // private _currentSession: Optional<UserSession>;


    /**
     * Set SPiD server URL
     * @private
     * @param {string} env - 'PRE' style key
     * @returns {void}
     */
    private _setSpidServerUrl(env: Environment): void {
        assert(isStr(env), `url parameter is invalid: ${env}`);
        this.spidClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.SPiD),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set OAuth server URL
     * @private
     * @param {string} env - environment eg. 'PRE'
     * @returns {void}
     */
    private _setOauthServerUrl(env: Environment): void {
        assert(isStr(env), `url parameter is invalid: ${env}`);
        this.oauthServiceClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.SPiD),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set BFF server URL
     * @private
     * @param {string} env - environment eg. 'PRE'
     * @returns {void}
     */
    private _setBffServerUrl(env: Environment): void {
        assert(isStr(env), `url parameter is invalid: ${env}`);
        this.bffClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.BFF),
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
    private _setBrandSessionServiceUrl(domain: string): void {
        assert(isStr(domain), `domain parameter is invalid: ${domain}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this.brandSessionServiceClient = new RESTClient({
            serverUrl: domain,
            log: this.log,
            defaultParams: { client_sdrn, redirect_uri: this.redirectUri, sdk_version: version },
        });
    }

    /**
     * Set global session-service server URL
     * @private
     * @param {string} env - environment eg. 'PRE'
     * @returns {void}
     */
    private _setGlobalSessionServiceUrl(env: Environment): void {
        assert(isStr(env), `url parameter is invalid: ${env}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this.globalSessionServiceClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.SESSION_SERVICE),
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
    private _emitSessionEvent(previous: UserSession, current: UserSession): void {
        /**
         * Emitted when the user is logged in (This happens as a result of calling
         * {@link Identity#hasSession}, so it is also emitted if the user was previously logged in)
         * @event Identity#login
         */
        if (current.userId) {
            this.emit('login', current);
        }
        /**
         * Emitted when the user logged out
         * @event Identity#logout
         */
        if (previous.userId && !current.userId) {
            this.emit('logout', current);
        }
        /**
         * Emitted when the user is changed. This happens as a result of calling
         * {@link Identity#hasSession}, and is emitted if there was a user both before and after
         * this invocation, and the userId has now changed
         * @event Identity#userChange
         */
        if (previous.userId && current.userId && previous.userId !== current.userId) {
            this.emit('userChange', current);
        }
        if (previous.userId || current.userId) {
            /**
             * Emitted when the session is changed. More accurately, this event is emitted if there
             * was a logged-in user either before or after {@link Identity#hasSession} was called.
             * In practice, this means the event is emitted a lot
             * @event Identity#sessionChange
             */
            this.emit('sessionChange', current);
        } else {
            /**
             * Emitted when there is no logged-in user. More specifically, it means that there was
             * no logged-in user neither before nor after {@link Identity#hasSession} was called
             * @event Identity#notLoggedin
             */
            this.emit('notLoggedin', current);
        }
        /**
         * Emitted when the session is first created
         * @event Identity#sessionInit
         */
        if (current.userId && !this._sessionInitiatedSent) {
            this._sessionInitiatedSent = true;
            this.emit('sessionInit', current);
        }
        /**
         * Emitted when the user status changes. This happens as a result of calling
         * {@link Identity#hasSession}
         * @event Identity#statusChange
         */
        if (previous.userStatus !== current.userStatus) {
            this.emit('statusChange', current);
        }
    }

    /**
     * Close this.popupWindowRef if it exists and is open
     * @private
     * @returns {void}
     */
    private _closePopup(): void {
        if (this.popupWindowRef) {
            if (!this.popupWindowRef.closed) {
                this.popupWindowRef.close();
            }
            this.popupWindowRef = null;
        }
    }

    /**
     * Set the Varnish cookie (`SP_ID`) when hasSession() is called. Note that most browsers require
     * that you are on a "real domain" for this to work — so, **not** `localhost`
     * @param {object} [options]
     * @param {number} [options.expiresIn] Override this to set number of seconds before the varnish
     * cookie expires. The default is to use the same time that hasSession responses are cached for
     * @param {string} [options.domain] Override cookie domain. E.g. «vg.no» instead of «www.vg.no»
     * @returns {void}
     */
    enableVarnishCookie(options: VarnishCookieOpts): void {
        assert(isObject(options), 'Invalid argument for enableVarnishCookie. An object was expected.');

        const expiresIn = options.expiresIn || 0;
        const domain = options.domain || '';

        assert(Number.isInteger(expiresIn), '\'expiresIn\' must be an integer');
        assert(expiresIn >= 0, '\'expiresIn\' cannot be negative');
        this.setVarnishCookie = true;
        this.varnishExpiresIn = expiresIn;
        this.varnishCookieDomain = domain;
    }

    /**
     * Set the Varnish cookie if configured
     * @private
     * @param {HasSessionSuccessResponse} sessionData
     * @returns {void}
     */
    private _maybeSetVarnishCookie(sessionData: UserSession): void {
        if (!this.setVarnishCookie) {
            return;
        }

        const date = new Date();
        const validExpires = this.varnishExpiresIn || sessionData.expiresIn > 0;

        if (validExpires) {
            const expires = this.varnishExpiresIn || sessionData.expiresIn;
            date.setTime(date.getTime() + (expires * 1000));
        } else {
            date.setTime(0);
        }

        // If the domain is missing or of the wrong type, we'll use document.domain
        const domain = this.varnishCookieDomain || sessionData.baseDomain || '';

        document.cookie = [
            `SP_ID=${sessionData.sp_id}`,
            `expires=${date.toUTCString()}`,
            'path=/',
            `domain=.${domain}`,
        ].join('; ');
    }

    /**
     * Clear the Varnish cookie if configured
     * @private
     * @returns {void}
     */
    private _maybeClearVarnishCookie(): void {
        if (this.setVarnishCookie) {
            this._clearVarnishCookie();
        }
    }

    /**
     * Clear the Varnish cookie
     * @private
     * @returns {void}
     */
    private _clearVarnishCookie(): void {
        const baseDomain =  this._session && this._session.baseDomain || document.domain;
        const domain = this.varnishCookieDomain || baseDomain || '';

        document.cookie = `SP_ID=nothing; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
    }

    /**
     * Log used settings and version
     * @throws {SDKError} - If log method is not provided
     * @return {void}
     */
    logSettings(): void {
        if (!this.log && !window.console) {
            throw new SDKError('You have to provide log method in constructor');
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

    // /**
    //  * @summary Queries the hassession endpoint and returns information about the status of the user
    //  * @description When we send a request to this endpoint, cookies sent along with the request
    //  * determines the status of the user.
    //  * @throws {SDKError} - If the call to the hasSession service fails in any way (this will happen
    //  * if, say, the user is not logged in)
    //  * @fires Identity#login
    //  * @fires Identity#logout
    //  * @fires Identity#userChange
    //  * @fires Identity#sessionChange
    //  * @fires Identity#notLoggedin
    //  * @fires Identity#sessionInit
    //  * @fires Identity#statusChange
    //  * @fires Identity#error
    //  * @return {Promise<HasSessionSuccessResponse|HasSessionFailureResponse>}
    //  */
    // async hasSession(): Promise<Optional<UserSession>> {
    //     if (isObject(this._currentSession)) {
    //         return this._currentSession;
    //     }
    //     const _postProcess = (sessionData: UserSession) => {
    //         if (sessionData.error) {
    //             throw new SDKError('HasSession failed', sessionData.error);
    //         }
    //         this._maybeSetVarnishCookie(sessionData);
    //         this._emitSessionEvent(this._session, sessionData);
    //         this._session = sessionData;
    //         return sessionData;
    //     };
    //     const _getSession = async () => {
    //         if (this._enableSessionCaching) {
    //             // Try to resolve from cache (it has a TTL)
    //             const cachedSession = this.cache.get<UserSession>(HAS_SESSION_CACHE_KEY);
    //             if (cachedSession) {
    //                 return _postProcess(cachedSession);
    //             }
    //         }
    //         let sessionData = null;
    //         try {
    //             sessionData = await this.brandSessionServiceClient!.get<UserSession>('/session');
    //         } catch (err) {
    //             if (err && err.code === 400 && this._enableSessionCaching) {
    //                 const expiresIn = 1000 * (err.expiresIn || 300);
    //                 this.cache.set(HAS_SESSION_CACHE_KEY, { error: err }, expiresIn);
    //             }
    //             throw err;
    //         }
    //
    //         if (sessionData && this._enableSessionCaching) {
    //             const expiresIn = 1000 * (sessionData.expiresIn || 300);
    //             this.cache.set(HAS_SESSION_CACHE_KEY, sessionData, expiresIn);
    //         }
    //         return _postProcess(sessionData);
    //     };
    //     this._currentSession = _getSession()
    //         .then(
    //             sessionData => {
    //                 this._currentSession = null;
    //                 return sessionData;
    //             },
    //             err => {
    //                 this.emit('error', err);
    //                 this._currentSession = null;
    //                 throw new SDKError('HasSession failed', err);
    //             },
    //         );
    //
    //     return this._currentSession;
    // }

    private _storedSession: Optional<UserSession>;

    private async _fetchSession(): Promise<Optional<UserSession>> {
        let session;

        try {
            session = await this.globalSessionServiceClient!.get<UserSession>('/session');
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (err && err.code === 400 && this._enableSessionCaching) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const expiresIn = 1000 * (err.expiresIn || 300);
                this.cache.set(HAS_SESSION_CACHE_KEY, { error: err }, expiresIn);
            }
            throw err;
        }

        return session;
    }

    async _hasSession(): Promise<Optional<UserSession>> {
        // check if there is an existing session in memory
        if (isObject(this._storedSession)) {
            // if yes return it
            return this._storedSession;
        }

        // cache lookup for any stored session data
        const cachedSession = this.cache.get<UserSession>(HAS_SESSION_CACHE_KEY);
        if (cachedSession && isNonEmptyObj(cachedSession)) {
            this._storedSession = cachedSession;
            this._maybeSetVarnishCookie(cachedSession);
            this._emitSessionEvent(this._session, cachedSession);
            return cachedSession;
        }

        // if cache fails, call global session service
        const session = await this._fetchSession();

        // update cache
        if (session && isNonEmptyObj(session)) {
            const expiresIn = 1000 * (session.expiresIn || 300);
            this.cache.set(HAS_SESSION_CACHE_KEY, session, expiresIn);
            this._maybeSetVarnishCookie(session);
            this._emitSessionEvent(this._session, session);
        }

        this._storedSession = session;
        return session;
    }

    /**
     * @async
     * @summary Allows the client app to check if the user is logged in to Schibsted account
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {Promise<boolean>}
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            const data = await this._hasSession();
            return !!data && data.result;
        } catch (_) {
            return false;
        }
    }

    /**
     * Removes the cached user session.
     * @returns {void}
     */
    clearCachedUserSession(): void {
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
    async isConnected(): Promise<boolean> {
        try {
            const data = await this._hasSession();
            // if data is not an object, the promise will fail.
            // if the result is present, it's boolean. But if it's not, it should be assumed false.
            return !!data && data.result;
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
     * @return {Promise<HasSessionSuccessResponse>}
     */
    async getUser(): Promise<UserSession> {
        const user = await this._hasSession();
        if (!user) {
            throw new SDKError('The user is not connected to this merchant');
        }
        return cloneDeep(user);
    }

    /**
     * @async
     * @summary
     * In Schibsted account, there are multiple ways of identifying a user; the `userId`,
     * `uuid` and `externalId` used for identifying a user-merchant pair (see {@link Identity#getExternalId}).
     * There are reasons for them all to exist. The `userId` is a numeric identifier, but
     * since Schibsted account is deployed separately in Norway and Sweden, there are a lot of
     * duplicates. The `userId` was introduced early, so many sites still need to use them for
     * legacy reasons. The `uuid` is universally unique, and so — if we could disregard a lot of
     * Schibsted components depending on the numeric `userId` — it would be a good identifier to use
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @return {Promise<string>} The `userId` field (not to be confused with the `uuid`)
     */
    async getUserId(): Promise<number> {
        const user = await this._hasSession();
        if (user && user.userId && user.result) {
            return user.userId;
        }
        throw new SDKError('The user is not connected to this merchant');
    }

    /**
     * @async
     * @function
     * @summary
     * Retrieves the external identifier (`externalId`) for the authenticated user.
     *
     * In Schibsted Account there are multiple ways of identifying users, however for integrations with
     * third-parties it's recommended to use `externalId` as it does not disclose
     * any critical data whilst allowing for user identification.
     *
     * `externalId` is merchant-scoped using a pairwise identifier (`pairId`),
     * meaning the same user's ID will differ between merchants.
     * Additionally, this identifier is bound to the external party provided as argument.
     *
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @param {string} externalParty
     * @param {string|null} optionalSuffix
     * @throws {SDKError} If the `pairId` is missing in user session.
     * @throws {SDKError} If the `externalParty` is not defined
     * @return {Promise<string>} The merchant- and 3rd-party-specific `externalId`
     */
    async getExternalId(externalParty: string, optionalSuffix: string = '') :Promise<string> {
        const session = await this._hasSession();

        if (!session)
            throw new SDKError('pairId missing in user session!');

        if (!externalParty || externalParty.length === 0) {
            throw new SDKError('externalParty cannot be empty');
        }
        const _toHexDigest = (hashBuffer: ArrayBuffer) => {
            // convert buffer to byte array
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            // convert bytes to hex string
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const _getSha256Digest = (data: Uint8Array) => {
            return crypto.subtle.digest('SHA-256', data);
        };

        const _hashMessage = async (message: string) => {
            const msgUint8 = new TextEncoder().encode(message);
            return _getSha256Digest(msgUint8).then( (it) => _toHexDigest(it));
        };

        const _constructMessage = (pairId: string, _externalParty: string, _optionalSuffix: string): string => {
            return optionalSuffix
                ? `${pairId}:${_externalParty}:${_optionalSuffix}`
                : `${pairId}:${_externalParty}`;
        };

        return _hashMessage(_constructMessage(session.pairId, externalParty, optionalSuffix));
    }

    /**
     * @async
     * @summary Enables brands to programmatically get the current the SDRN based on the user's session.
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the SDRN is missing in user session object.
     * @returns {Promise<string>}
     */
    async getUserSDRN() {
        const session = await this._hasSession();
        if (session) {
            return session.sdrn;
        }
        throw new SDKError('Failed to get SDRN from user session');
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
        const session = await this._hasSession();
        if (session && session.uuid && session.result) {
            return session.uuid;
        }
        throw new SDKError('The user is not connected to this merchant');
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
    async getUserContextData(): Promise<Optional<SimplifiedLoginData>> {
        try {
            return await this.globalSessionServiceClient!.get('/user-context');
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
        acrValues = '',
        scope = 'openid',
        redirectUri = this.redirectUri,
        preferPopup = false,
        loginHint = '',
        tag = '',
        teaser = '',
        maxAge = '',
        locale = '',
        oneStepLogin = false,
        prompt = 'select_account',
    }: LoginOpts): Optional<Window> {
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
            this.popupWindowRef =
                popup.open(this.window, url, 'Schibsted account', { width: 360, height: 570 });
            if (this.popupWindowRef) {
                return this.popupWindowRef;
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
    async getSpId(): Promise<Optional<string>> {
        try {
            const session = await this._hasSession();
            return (session && session.sp_id) || null;
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
        this.emit('logout');
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
        acrValues = '',
        scope = 'openid',
        redirectUri = this.redirectUri,
        loginHint = '',
        tag = '',
        teaser = '',
        maxAge = '',
        locale = '',
        oneStepLogin = false,
        prompt = 'select_account',
    }: Omit<LoginOpts, 'preferPopup'>): string {
        // if (typeof arguments[0] !== 'object') {
        //     // backward compatibility
        //     state = arguments[0];
        //     acrValues = arguments[1];
        //     scope = arguments[2] || scope;
        //     redirectUri = arguments[3] || redirectUri;
        //     loginHint = arguments[4] || loginHint;
        //     tag = arguments[5] || tag;
        //     teaser = arguments[6] || teaser;
        //     maxAge = isNaN(arguments[7]) ? maxAge : arguments[7];
        // }
        const isValidAcrValue = (acrValue: string) => isStrIn(acrValue, ['password', 'otp', 'sms', 'eid-no', 'eid-se', 'eid-fi', 'eid'], true);
        assert(!acrValues || isStrIn(acrValues, ['', 'otp-email'], true) || acrValues.split(' ').every(isValidAcrValue),
            `The acrValues parameter is not acceptable: ${acrValues}`);
        assert(isUrl(redirectUri),
            `loginUrl(): redirectUri must be a valid url but is ${redirectUri}`);
        assert(isNonEmptyString(state),
            `the state parameter should be a non empty string but it is ${state}`);

        return this.oauthServiceClient!.makeUrl('oauth/authorize', {
            response_type: 'code',
            redirect_uri: redirectUri,
            scope,
            state,
            acr_values: acrValues,
            login_hint: loginHint,
            tag,
            teaser,
            max_age: maxAge,
            locale,
            one_step_login: oneStepLogin || '',
            prompt: acrValues ? '' : prompt,
        });
    }

    /**
     * The url for logging the user out
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} url
     */
    logoutUrl(redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'logoutUrl(): redirectUri is invalid');
        const params = { redirect_uri: redirectUri };
        return this.brandSessionServiceClient!.makeUrl('logout', params);
    }

    /**
     * The account summary page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    accountUrl(redirectUri = this.redirectUri): string {
        return this.spidClient!.makeUrl('profile-pages', {
            response_type: 'code',
            redirect_uri: redirectUri,
        });
    }

    /**
     * The phone editing page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    phonesUrl(redirectUri = this.redirectUri): string {
        return this.spidClient!.makeUrl('profile-pages/about-you/phone', {
            response_type: 'code',
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
     * @fires Identity#simplifiedLoginOpened
     * @fires Identity#simplifiedLoginCancelled
     * @return {Promise<boolean|SDKError>} - will resolve to true if widget will be display. Otherwise, will throw SDKError
     */
    async showSimplifiedLoginWidget(loginParams: LoginOpts, options: SimplifiedLoginOpts): Promise<boolean> {
        // getUserContextData doesn't throw exception
        const userData = await this.getUserContextData();

        const queryParams: GenericObject = { client_id: this.clientId };
        if (options && options.encoding) {
            queryParams.encoding = options.encoding;
        }
        const widgetUrl = this.bffClient!.makeUrl('simplified-login-widget', queryParams, false);

        const prepareLoginParams = async (loginPrams: LoginOpts): Promise<LoginOpts> => {
            if (typeof loginPrams.state === 'function') {
                loginPrams.state = await loginPrams.state();
            }

            return loginPrams;
        };


        return new Promise(
            (resolve, reject) => {
                if (!userData || !userData.display_text || !userData.identifier) {
                    return reject(new SDKError('Missing user data'));
                }

                const initialParams: GenericObject<string | Function> = {
                    displayText: userData.display_text,
                    env: this.env,
                    clientName: userData.client_name,
                    clientId: this.clientId,
                    providerId: userData.provider_id,
                    windowWidth: () => window.innerWidth,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    windowOnResize: (f) => {
                        window.onresize = f;
                    },
                };

                if (options && options.locale) {
                    initialParams.locale = options.locale;
                }

                const loginHandler = async () => {
                    this.login(Object.assign(await prepareLoginParams(loginParams), { loginHint: userData.identifier }));
                };

                const loginNotYouHandler = async () => {
                    this.login(Object.assign(await prepareLoginParams(loginParams), { loginHint: userData.identifier, prompt: 'login' }));
                };

                const initHandler = () => {
                    /**
                     * Emitted when the simplified login widget is displayed on the screen
                     * @event Identity#simplifiedLoginOpened
                     */
                    this.emit('simplifiedLoginOpened');
                };

                const cancelLoginHandler = () => {
                    /**
                     * Emitted when the user closes the simplified login widget
                     * @event Identity#simplifiedLoginCancelled
                     */
                    this.emit('simplifiedLoginCancelled');
                };

                if (window.openSimplifiedLoginWidget) {
                    window.openSimplifiedLoginWidget(initialParams, loginHandler, loginNotYouHandler, initHandler, cancelLoginHandler);
                    return resolve(true);
                }

                const simplifiedLoginWidget = document.createElement('script');
                simplifiedLoginWidget.type = 'text/javascript';
                simplifiedLoginWidget.src = widgetUrl;
                simplifiedLoginWidget.onload = () => {
                    window.openSimplifiedLoginWidget!(initialParams, loginHandler, loginNotYouHandler, initHandler, cancelLoginHandler);
                    resolve(true);
                };
                simplifiedLoginWidget.onerror = () => {
                    reject(new SDKError('Error when loading simplified login widget content'));
                };
                document.getElementsByTagName('body')[0]!.appendChild(simplifiedLoginWidget);
            });
    }
}

export default Identity;