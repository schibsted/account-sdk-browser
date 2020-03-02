/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { assert, isStr, isNonEmptyString, isObject, isUrl, isStrIn } from './validate';
import { cloneDeep } from './object';
import { urlMapper } from './url';
import { ENDPOINTS, NAMESPACE } from './config';
import EventEmitter from 'tiny-emitter';
import JSONPClient from './JSONPClient';
import Cache from './cache';
import * as popup from './popup';
import ItpModal from './ItpModal';
import RESTClient from './RESTClient';
import SDKError from './SDKError';
import * as spidTalk from './spidTalk';

/**
 * @typedef {object} Identity#HasSessionSuccessResponse
 * @property {boolean} result - Is the user connected to the merchant? (it means that the merchant
 * id is in the list of merchants listed of this user in the database)? Example: false
 * @property {string} userStatus - Example: 'notConnected' or 'connected'. Deprecated, use
 * `Identity.isConnected()`
 * @property {string} baseDomain - Example: 'localhost'
 * @property {string} id - Example: '58eca10fdbb9f6df72c3368f'. Obsolete
 * @property {number} userId - Example: 37162
 * @property {string} uuid - Example: 'b3b23aa7-34f2-5d02-a10e-5a3455c6ab2c'
 * @property {string} sp_id - Example: 'eyJjbGllbnRfaWQ...'
 * @property {number} expiresIn - Example: 30 * 60 * 1000 (for 30 minutes)
 * @property {number} serverTime - Example: 1506285759
 * @property {string} sig - Example: 'NCdzXaz4ZRb7...' The sig parameter is a concatenation of an
 * HMAC SHA-256 signature string, a dot (.) and a base64url encoded JSON object (session). @see
 * http://techdocs.spid.no/sdks/js/response-signature-and-validation/
 * @property {string} displayName - (Only for connected users) Example: 'batman'
 * @property {string} givenName - (Only for connected users) Example: 'Bruce'
 * @property {string} familyName - (Only for connected users) Example: 'Wayne'
 * @property {string} gender - (Only for connected users) Example: 'male', 'female', 'undisclosed'
 * @property {string} photo - (Only for connected users) Example:
 * 'http://www.srv.com/some/picture.jpg'
 * @property {boolean} tracking - (Only for connected users)
 * @property {boolean} clientAgreementAccepted - (Only for connected users)
 * @property {boolean} defaultAgreementAccepted - (Only for connected users)
 */

/**
 * Emitted when an error happens (useful for debugging)
 * @event Identity#error
 */

/**
 * @typedef {object} Identity#HasSessionFailureResponse
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
 * @typedef {object} Identity#SimplifiedLoginData
 * @property {string} identifier - Deprecated: User UUID, to be be used as `loginHint` for {@link Identity#login}
 * @property {string} display_text - Human-readable user identifier
 * @property {string} client_name - Client name
 */

const HAS_SESSION_CACHE_KEY = 'hasSession-cache';
const LOGIN_IN_PROGRESS_KEY = 'loginInProgress-cache';
const globalWindow = () => window;

/**
 * Get type and value of something
 * @private
 * @param {string} thing
 * @returns {Array} Tuple of [type, value]
 */
function inspect(thing) {
    if (thing === null) {
        return [typeof thing, `${thing}`];
    }
    return [thing.constructor.name, thing.valueOf()];
}

/**
 * Provides Identity functionalty to a web page
 */
export class Identity extends EventEmitter {
    /**
     * @param {object} options
     * @param {string} options.clientId - Example: "1234567890abcdef12345678"
     * @param {string} [options.redirectUri] - Example: "https://site.com"
     * @param {string} [options.sessionDomain] - Example: "https://id.site.com"
     * @param {string} [options.env='PRE'] - Schibsted account environment: `PRE`, `PRO` or `PRO_NO`
     * @param {boolean} [options.siteSpecificLogout=true] - Whether site-specific logout should be used
     * @param {function} [options.log] - A function that receives debug log information. If not set,
     * no logging will be done
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, sessionDomain, env = 'PRE', siteSpecificLogout = true, log, window = globalWindow() }) {
        super();
        assert(isNonEmptyString(clientId), 'clientId parameter is required');
        assert(isObject(window), 'The reference to window is missing');
        assert(!redirectUri || isUrl(redirectUri), 'redirectUri parameter is invalid');

        spidTalk.emulate(window);
        this._sessionInitiatedSent = false;
        this.window = window;
        this.clientId = clientId;
        this.cache = new Cache(() => this.window && this.window.sessionStorage);
        this.redirectUri = redirectUri;
        this.env = env;
        this.siteSpecificLogout = siteSpecificLogout;
        this.log = log;

        if (sessionDomain) {
            assert(isUrl(sessionDomain), 'sessionDomain parameter is not a valid URL');
            this._setSessionServiceUrl(sessionDomain);
        }

        // Internal hack: set to false to always refresh from hassession
        this._enableSessionCaching = true;

        // Internal hack: set to true if the SDK is being used inside the ITP iframe to
        // avoid using the hasSession service and to prevent infinite iframe recursion
        this._itpMode = false;

        // Old session
        this._session = {};

        this._setSpidServerUrl(env);
        this._setBffServerUrl(env);
        this._setOauthServerUrl(env);
        this._setHasSessionServerUrl(env);
        this._setGlobalSessionServiceUrl(env);
    }

    /**
     * Set SPiD server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    _setSpidServerUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._spid = new JSONPClient({
            serverUrl: urlMapper(url, ENDPOINTS.SPiD),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set OAuth server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    _setOauthServerUrl(url) {
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
    _setBffServerUrl(url) {
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
    _setSessionServiceUrl(domain) {
        assert(isStr(domain), `domain parameter is invalid: ${domain}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this._sessionService = new RESTClient({
            serverUrl: domain,
            log: this.log,
            defaultParams: { client_sdrn, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set global session-service server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    _setGlobalSessionServiceUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        const client_sdrn = `sdrn:${NAMESPACE[this.env]}:client:${this.clientId}`;
        this._globalSessionService = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.SESSION_SERVICE),
            log: this.log,
            defaultParams: { client_sdrn },
        });
    }

    /**
     * Set HasSession server URL - real URL or 'PRE' style key
     * @private
     * @param {string} url
     * @returns {void}
     */
    _setHasSessionServerUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._hasSession = new JSONPClient({
            serverUrl: urlMapper(url, ENDPOINTS.HAS_SESSION),
            log: this.log,
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Emits the relevant events based on the previous and new reply from hassession
     * @private
     * @param {object} previous
     * @param {object} current
     * @returns {void}
     */
    _emitSessionEvent(previous, current) {
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
     * @param {object} [options]
     * @param {number} [options.expiresIn] Override this to set number of seconds before the varnish
     * cookie expires. The default is to use the same time that hasSession responses are cached for
     * @param {boolean} [options.domain] Override cookie domain. E.g. «vg.no» instead of «www.vg.no»
     * @returns {void}
     */
    enableVarnishCookie(options) {
        let expiresIn = 0;
        let domain;
        if (Number.isInteger(options)) {
            expiresIn = options;
        }
        else if (typeof options == 'object') {
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
     * @private
     * @param {HasSessionSuccessResponse} sessionData
     * @returns {void}
     */
    _maybeSetVarnishCookie(sessionData) {
        if (!this.setVarnishCookie) {
            return;
        }
        const date = new Date();
        const validExpires = this.varnishExpiresIn
            || typeof sessionData.expiresIn === 'number' && sessionData.expiresIn > 0;
        if (validExpires) {
            const expires = this.varnishExpiresIn || sessionData.expiresIn;
            date.setTime(date.getTime() + (expires * 1000));
        } else {
            date.setTime(0);
        }

        // If the domain is missing or of the wrong type, we'll use document.domain
        let domain = this.varnishCookieDomain ||
            (typeof sessionData.baseDomain === 'string'
                ? sessionData.baseDomain
                : document.domain) ||
            '';

        const cookie = [
            `SP_ID=${sessionData.sp_id}`,
            `expires=${date.toUTCString()}`,
            `path=/`,
            `domain=.${domain}`
        ].join('; ');
        document.cookie = cookie;
    }

    /**
     * Clear the Varnish cookie if configured
     * @private
     * @returns {void}
     */
    _maybeClearVarnishCookie() {
        if (this.setVarnishCookie) {
            this._clearVarnishCookie();
        }
    }

    /**
     * Clear the Varnish cookie
     * @private
     * @returns {void}
     */
    _clearVarnishCookie() {
        let domain = this.varnishCookieDomain ||
            ((this._session && typeof this._session.baseDomain === 'string')
                ? this._session.baseDomain
                : document.domain) ||
            '';

        document.cookie = `SP_ID=nothing; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
    }

    /**
     * Check if we need to use the ITP workaround for Safari versions >= 12
     * @private
     * @returns {boolean}
     */
    _itpModalRequired() {
        if (!document.requestStorageAccess || this._sessionService) {
            return false;
        }

        const safariVersion = navigator.userAgent.match(/Version\/(\d+)\./);
        if (!safariVersion || safariVersion.length < 2) {
            return false;
        }
        return parseInt(safariVersion[1], 10) >= 12;
    }

    /**
     * @summary Queries the hassession endpoint and returns information about the status of the user
     * @description When we send a request to this endpoint, cookies sent along with the request
     * determines the status of the user. If the user is not currently logged in, but has a cookie
     * with the "Remember me" flag switched on, calling this function will attempt to automatically
     * perform a login on the user
     * @param {boolean} [autologin=true] - Set this to `false` if you do **not** want the auto-login
     * to happen
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
     * @return {Promise<Identity#HasSessionSuccessResponse|Identity#HasSessionFailureResponse>}
     */
    hasSession(autologin = true) {
        if (this._hasSessionInProgress) {
            return this._hasSessionInProgress;
        }
        if (typeof autologin !== 'boolean') {
            const [type, value] = inspect(autologin);
            return Promise.reject(new SDKError(`Parameter 'autologin' must be boolean, was: "${type}:${value}"`));
        }
        const _postProcess = (sessionData) => {
            if (sessionData.error) {
                throw new SDKError('HasSession failed', sessionData.error);
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
            if (this._sessionService) {
                try {
                    sessionData = await this._sessionService.get('/session');
                } catch (err) {
                    if (this.siteSpecificLogout) {
                        // Don't fallback to other sources for user session lookup
                        throw err;
                    }

                    // The session-service returns 400 if no session-cookie is sent in the
                    // request. This will be the case if the user hasn't logged in since the
                    // site switched to using the session-service. If the request contains a
                    // session-cookie but no session is found (return code will be 404), then we
                    // *should* throw an exception and *not* fall through to spid-hassession
                    if (err.code !== 400) {
                        throw err;
                    }
                }
            }

            const autoLoginConverted = autologin ? 1 : 0;
            if (!sessionData && !this._itpMode) {
                sessionData = await this._hasSession.get('rpc/hasSession.js', { autologin: autoLoginConverted });
            }
            if (this._itpMode || (sessionData && isObject(sessionData.error) && sessionData.error.type === 'LoginException')) {
                sessionData = await this._spid.get('ajax/hasSession.js', { autologin: autoLoginConverted });
            }

            const shouldShowItpModal = this._itpModalRequired() && !this._itpMode && sessionData && isObject(sessionData.error)
                && sessionData.error.type === 'UserException' && this.cache.get(LOGIN_IN_PROGRESS_KEY) !== null;
            if (shouldShowItpModal) {
                this.cache.delete(LOGIN_IN_PROGRESS_KEY);
                const modal = new ItpModal(this._spid, this.clientId, this.redirectUri, this.env);
                sessionData = await modal.show()
            }
            if (sessionData && this._enableSessionCaching) {
                const expiresIn = 1000 * (sessionData.expiresIn || 300);
                this.cache.set(HAS_SESSION_CACHE_KEY, sessionData, expiresIn);
            }
            return _postProcess(sessionData);
        };
        this._hasSessionInProgress = _getSession()
            .then(
                sessionData => {
                    this._hasSessionInProgress = false;
                    return sessionData;
                },
                err => {
                    this.emit('error', err);
                    this._hasSessionInProgress = false;
                    throw new SDKError('HasSession failed', err);
                }
            );

        return this._hasSessionInProgress;
    }

    /**
     * @summary Allows the client app to check if the user is logged in to Schibsted account
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {boolean}
     */
    async isLoggedIn() {
        try {
            const data = await this.hasSession();
            return 'result' in data;
        } catch (_) {
            return false;
        }
    }

    /**
     * @summary Allows the caller to check if the current user is connected to the client_id in
     * Schibsted account. Being connected means that the user has agreed for their account to be
     * used by your web app and have accepted the required terms
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @summary Check if the user is connected to the client_id
     * @return {boolean}
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
     * @summary Returns information about the user
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @throws {SDKError} If we couldn't get the user
     * @return {HasSessionSuccessResponse}
     */
    async getUser() {
        const user = await this.hasSession();
        if (!user.result) {
            throw new SDKError('The user is not connected to this merchant');
        }
        return cloneDeep(user);
    }

    /**
     * @summary In Schibsted account, there are two ways of identifying a user; the `userId` and the
     * `uuid`. There are reasons for them both existing. The `userId` is a numeric identifier, but
     * since Schibsted account is deployed separately in Norway and Sweden, there are a lot of
     * duplicates. The `userId` was introduced early, so many sites still need to use them for
     * legacy reasons. The `uuid` is universally unique, and so — if we could disregard a lot of
     * Schibsted components depending on the numeric `userId` — it would be a good identifier to use
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @return {string} The `userId` field (not to be confused with the `uuid`)
     */
    async getUserId() {
        const user = await this.hasSession();
        if (user.userId && user.result) {
            return user.userId;
        }
        throw new SDKError('The user is not connected to this merchant');
    }

    /**
     * @summary In Schibsted account, there are two ways of identifying a user; the `userId` and the
     * `uuid`. There are reasons for them both existing. The `userId` is a numeric identifier, but
     * since Schibsted account is deployed separately in Norway and Sweden, there are a lot of
     * duplicates. The `userId` was introduced early, so many sites still need to use them for
     * legacy reasons. The `uuid` is universally unique, and so — if we could disregard a lot of
     * Schibsted components depending on the numeric `userId` — it would be a good identifier to use
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @return {string} The `uuid` field (not to be confused with the `userId`)
     */
    async getUserUuid() {
        const user = await this.hasSession();
        if (user.uuid && user.result) {
            return user.uuid;
        }
        throw new SDKError('The user is not connected to this merchant');
    }

    /**
     * @summary Get basic information about any user currently logged-in to their Schibsted account
     * in this browser. Can be used to provide context in a continue-as prompt.
     * @description This function relies on the global Schibsted account user session cookie, which
     * is a third-party cookie and hence might be blocked by the browser (for example due to ITP in
     * Safari). So there's no guarantee any data is returned, even though a user is logged-in in
     * the current browser.
     * @return {Identity#SimplifiedLoginData|null}
     */
    async getUserContextData() {
        try {
            return await this._globalSessionService.get('/user-context');
        } catch (_) {
            return null;
        }
    }

    /**
     * @summary Retrieve the sp_id (Varnish ID)
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @todo Is this an accurate description?
     * @return {string|null} - The sp_id string or null (if the server didn't return it)
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
     * If a popup is desired, this function needs to be called in response to a user event (like
     * click or tap) in order to work correctly. Otherwise the popup will be blocked by the
     * browser's popup blockers and has to be explicitly authorized to be shown.
     * @summary Perform a login, either using a full-page redirect or a popup
     * @see https://tools.ietf.org/html/rfc6749#section-4.1.1
     * @param {object} options
     * @param {string} [options.acrValues] - Authentication Context Class Reference Values. If
     * omitted, the user will be asked to authenticate using username+password. 'otp-email' means
     * one time password using email. 'otp-sms' means one time password using sms
     * @param {string} options.state - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF
     * @see https://tools.ietf.org/html/rfc6749#section-10.12
     * @param {string} [options.scope='openid'] - The OAuth scopes for the tokens. This is a list of
     * scopes, separated by space. If the list of scopes contains `openid`, the generated tokens
     * includes the id token which can be useful for getting information about the user. Omitting
     * scope is allowed, while `invalid_scope` is returned when the client asks for a scope you
     * aren’t allowed to request.
     * @see https://tools.ietf.org/html/rfc6749#section-3.3
     * @param {string} [options.redirectUri=this.redirectUri] - Redirect uri that will receive the
     * code. Must exactly match a redirectUri from your client in self-service
     * @param {boolean} [options.preferPopup=false] - Should we try to open a popup window?
     * @param {boolean} [options.newFlow=true] - Should we try the new GDPR-safe flow or the
     * legacy/stable SPiD flow?
     * @param {string} [options.loginHint=''] - user email or UUID hint
     * @param {string} [options.tag=''] - Pulse tag
     * @param {string} [options.teaser=''] - Teaser slug. Teaser with given slug will be displayed
     * in place of default teaser
     * @param {number|string} [options.maxAge=''] - Specifies the allowable elapsed time in seconds since
     * the last time the End-User was actively authenticated. If last authentication time is more
     * than maxAge seconds in the past, re-authentication will be required. See the OpenID Connect
     * spec section 3.1.2.1 for more information
     * @param {string} [options.locale=''] - Optional parameter to overwrite client locale setting.
     * New flows supports nb_NO, fi_FI, sv_SE, en_US
     * @param {boolean} [options.oneStepLogin=false] - display username and password on one screen
     * @return {Window|null} - Reference to popup window if created (or `null` otherwise)
     */
    login({
        acrValues,
        state,
        scope = 'openid',
        redirectUri = this.redirectUri,
        preferPopup = false,
        newFlow = true,
        loginHint = '',
        tag = '',
        teaser = '',
        maxAge = '',
        locale = '',
        oneStepLogin = false
    }) {
        this._closePopup();
        this.cache.delete(HAS_SESSION_CACHE_KEY);
        const url = this.loginUrl({ state, acrValues, scope, redirectUri, newFlow, loginHint, tag,
            teaser, maxAge, locale, oneStepLogin });

        this.showItpModalUponReturning();

        if (preferPopup) {
            this.popup =
                popup.open(this.window, url, 'Schibsted account', { width: 360, height: 570 });
            if (this.popup) {
                return this.popup;
            }
        }
        this.window.location.href = url;
        return null;
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
     * @param {object} options
     * @param {string} options.state - An opaque value used by the client to maintain state between the
     * request and callback. It's also recommended to prevent CSRF.
     * @see https://tools.ietf.org/html/rfc6749#section-10.12
     * @param {string} [options.acrValues] - Authentication method. If omitted, user authenticates with
     * username+password. If set to `'otp-email'`, then  passwordless login using email is used. If
     * `'otp-sms'`, then passwordless login using sms is used. Please note that this parameter has
     * no effect if `newFlow` is false
     * @param {string} [options.scope='openid']
     * @param {string} [options.redirectUri=this.redirectUri]
     * @param {boolean} [options.newFlow=true] - Should we try the new flow or the old Schibsted account
     * login? If this parameter is set to false, the `acrValues` parameter doesn't have any effect
     * @param {string} [options.loginHint=''] - user email or UUID hint
     * @param {string} [options.tag=''] - Pulse tag
     * @param {string} [options.teaser=''] - Teaser slug. Teaser with given slug will be displayed
     * in place of default teaser
     * @param {number|string} [options.maxAge=''] - Specifies the allowable elapsed time in seconds since
     * the last time the End-User was actively authenticated. If last authentication time is more
     * than maxAge seconds in the past, re-authentication will be required. See the OpenID Connect
     * spec section 3.1.2.1 for more information
     * @param {string} [options.locale=''] - Optional parameter to overwrite client locale setting.
     * New flows supports nb_NO, fi_FI, sv_SE, en_US
     * @param {boolean} [options.oneStepLogin=false] - display username and password on one screen
     * @return {string} - The url
     */
    loginUrl({
        state,
        acrValues,
        scope = 'openid',
        redirectUri = this.redirectUri,
        newFlow = true,
        loginHint = '',
        tag = '',
        teaser = '',
        maxAge = '',
        locale = '',
        oneStepLogin = false
    }) {
        if (typeof arguments[0] !== 'object') {
            // backward compatibility
            state = arguments[0];
            acrValues = arguments[1];
            scope = arguments[2] || scope;
            redirectUri = arguments[3] || redirectUri;
            newFlow = typeof arguments[4] === 'boolean' ? arguments[4] : newFlow;
            loginHint = arguments[5] || loginHint;
            tag = arguments[6] || tag;
            teaser = arguments[7] || teaser;
            maxAge = isNaN(arguments[8]) ? maxAge : arguments[8];
        }
        assert(!acrValues || isStrIn(acrValues, ['', 'otp-email', 'otp-sms'], true),
            `The acrValues parameter is not acceptable: ${acrValues}`);
        assert(isUrl(redirectUri),
            `loginUrl(): redirectUri must be a valid url but is ${redirectUri}`);
        assert(isNonEmptyString(state),
            `the state parameter should be a non empty string but it is ${state}`);


        if (newFlow) {
            return this._oauthService.makeUrl('oauth/authorize', {
                response_type: 'code',
                'new-flow': true,
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
                prompt: this.siteSpecificLogout ? 'select_account' : ''
            });
        } else {
            // acrValues do not work with the old flows
            return this._spid.makeUrl('flow/login', {
                response_type: 'code',
                redirect_uri: redirectUri,
                scope,
                state,
                email: loginHint,
                tag,
                teaser,
                locale
            });
        }
    }

    /**
     * The url for logging the user out
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} url
     */
    logoutUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `logoutUrl(): redirectUri is invalid`);
        const params = { redirect_uri: redirectUri };
        if (this._sessionService && this.siteSpecificLogout) {
            return this._sessionService.makeUrl('logout', params);
        }
        return this._spid.makeUrl('logout', Object.assign({ response_type: 'code' }, params));
    }


    /**
     * The account summary page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    accountUrl(redirectUri = this.redirectUri) {
        return this._spid.makeUrl('account/summary', {
            response_type: 'code',
            redirect_uri: redirectUri
        });
    }

    /**
     * The phone editing page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    phonesUrl(redirectUri = this.redirectUri) {
        return this._spid.makeUrl('account/phones', {
            response_type: 'code',
            redirect_uri: redirectUri
        });
    }

    /**
     * Url to render either signup or login
     * @see https://techdocs.spid.no/flows/auth-flow/
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - the url to the authentication page
     */
    authFlowUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `authFlowUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('flow/auth', {
            response_type: 'code',
            redirect_uri: redirectUri
        });
    }

    /**
     * Url to render a signup view and let the user login with credentials
     * @see https://techdocs.spid.no/flows/auth-flow/
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - the url to the signup page
     */
    signupFlowUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `signupFlowUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('flow/signup', {
            response_type: 'code',
            redirect_uri: redirectUri
        });
    }

    /**
     * To render a signin view and let the user login without credentials
     * @see https://techdocs.spid.no/flows/auth-flow/
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - the url to the signin page
     */
    signinFlowUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `signinFlowUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('flow/signin', {
            response_type: 'code',
            redirect_uri: redirectUri
        });
    }

    /**
     * Call this method immediately before sending a user to a Schibsted account flow if you
     * want to enable showing of the ITP modal upon returning to your site. You should
     * send the user to a Schibsted account flow immediately after calling this method without
     * invoking hasSession() again.
     *
     * Calling this is not required if you send the user to Schibsted account via the login()
     * method.
     *
     * @return {void}
     */
    showItpModalUponReturning() {
        // for safari, remember that we've got a login in progress so we can
        // work around some ITP issues when we come back from Schibsted Account
        if (this._itpModalRequired()) {
            this.cache.set(LOGIN_IN_PROGRESS_KEY, {}, 1000 * 60 * 15);
        }
    }

    /**
     * When returning after performing a flow, this method can be called prior to calling
     * hasSession() if you're certain that the user did not successfully log in. This will
     * prevent the ITP modal from showing up erroneously. If you're unsure, don't call this
     * method.
     *
     * @return {void}
     */
    suppressItpModal() {
        this.cache.delete(LOGIN_IN_PROGRESS_KEY);
    }
}

export default Identity;
