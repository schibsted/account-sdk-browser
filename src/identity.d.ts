/**
 * Provides Identity functionality to a web page
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
    constructor({ clientId, redirectUri, sessionDomain, env, log, window }: {
        clientId: string;
        sessionDomain: string;
        redirectUri: string;
        env?: string;
        log?: Function;
        window?: any;
    });
    _sessionInitiatedSent: boolean;
    window: any;
    clientId: string;
    cache: any;
    redirectUri: string;
    env: string;
    log: Function;
    _sessionDomain: string;
    _enableSessionCaching: boolean;
    _session: {};
    /**
     * Set SPiD server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setSpidServerUrl;
    _spid: RESTClient;
    /**
     * Set OAuth server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setOauthServerUrl;
    _oauthService: RESTClient;
    /**
     * Set BFF server URL
     * @private
     * @param {string} url  - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setBffServerUrl;
    _bffService: RESTClient;
    /**
     * Set site-specific session-service domain
     * @private
     * @param {string} domain - real URL — (**not** 'PRE' style env key)
     * @returns {void}
     */
    private _setSessionServiceUrl;
    _sessionService: RESTClient;
    /**
     * Set global session-service server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setGlobalSessionServiceUrl;
    _globalSessionService: RESTClient;
    /**
     * Emits the relevant events based on the previous and new reply from hassession
     * @private
     * @param {object} previous
     * @param {object} current
     * @returns {void}
     */
    private _emitSessionEvent;
    /**
     * Close this.popup if it exists and is open
     * @private
     * @returns {void}
     */
    private _closePopup;
    popup: Window;
    /**
     * Set the Varnish cookie (`SP_ID`) when hasSession() is called. Note that most browsers require
     * that you are on a "real domain" for this to work — so, **not** `localhost`
     * @param {object} [options]
     * @param {number} [options.expiresIn] Override this to set number of seconds before the varnish
     * cookie expires. The default is to use the same time that hasSession responses are cached for
     * @param {string} [options.domain] Override cookie domain. E.g. «vg.no» instead of «www.vg.no»
     * @returns {void}
     */
    enableVarnishCookie(options?: {
        expiresIn?: number;
        domain?: string;
    }): void;
    setVarnishCookie: boolean;
    varnishExpiresIn: number;
    varnishCookieDomain: string;
    /**
     * Set the Varnish cookie if configured
     * @private
     * @param {HasSessionSuccessResponse} sessionData
     * @returns {void}
     */
    private _maybeSetVarnishCookie;
    /**
     * Clear the Varnish cookie if configured
     * @private
     * @returns {void}
     */
    private _maybeClearVarnishCookie;
    /**
     * Clear the Varnish cookie
     * @private
     * @returns {void}
     */
    private _clearVarnishCookie;
    /**
     * Log used settings and version
     * @throws {SDKError} - If log method is not provided
     * @return {void}
     */
    logSettings(): void;
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
     * @return {Promise<HasSessionSuccessResponse|HasSessionFailureResponse>}
     */
    hasSession(): Promise<HasSessionSuccessResponse | HasSessionFailureResponse>;
    _hasSessionInProgress: boolean | Promise<any>;
    /**
     * @async
     * @summary Allows the client app to check if the user is logged in to Schibsted account
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {Promise<boolean>}
     */
    isLoggedIn(): Promise<boolean>;
    /**
     * Removes the cached user session.
     * @returns {void}
     */
    clearCachedUserSession(): void;
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
    isConnected(): Promise<boolean>;
    /**
     * @async
     * @summary Returns information about the user
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @throws {SDKError} If the user isn't connected to the merchant
     * @throws {SDKError} If we couldn't get the user
     * @return {Promise<HasSessionSuccessResponse>}
     */
    getUser(): Promise<HasSessionSuccessResponse>;
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
     * @return {Promise<string>} The `userId` field (not to be confused with the `uuid`)
     */
    getUserId(): Promise<string>;
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
    getUserUuid(): Promise<string>;
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
    getUserContextData(): Promise<SimplifiedLoginData | null>;
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
    login({ state, acrValues, scope, redirectUri, preferPopup, loginHint, tag, teaser, maxAge, locale, oneStepLogin, prompt }: LoginOptions): Window | null;
    /**
     * @async
     * @summary Retrieve the sp_id (Varnish ID)
     * @description This function calls {@link Identity#hasSession} internally and thus has the side
     * effect that it might perform an auto-login on the user
     * @return {Promise<string|null>} - The sp_id string or null (if the server didn't return it)
     */
    getSpId(): Promise<string | null>;
    /**
     * @summary Logs the user out from the Identity platform
     * @param {string} redirectUri - Where to redirect the browser after logging out of Schibsted
     * account
     * @return {void}
     */
    logout(redirectUri?: string): void;
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
    loginUrl({ state, acrValues, scope, redirectUri, loginHint, tag, teaser, maxAge, locale, oneStepLogin, prompt, }: LoginOptions, ...args: any[]): string;
    /**
     * The url for logging the user out
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} url
     */
    logoutUrl(redirectUri?: string): string;
    /**
     * The account summary page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    accountUrl(redirectUri?: string): string;
    /**
     * The phone editing page url
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string}
     */
    phonesUrl(redirectUri?: string): string;
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
    showSimplifiedLoginWidget(loginParams: SimplifiedLoginWidgetLoginOptions, options?: SimplifiedLoginWidgetOptions): Promise<boolean | SDKError>;
}
export default Identity;
export type LoginOptions = {
    /**
     * - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
     */
    state: string;
    /**
     * - Authentication Context Class Reference Values. If
     * omitted, the user will be asked to authenticate using username+password.
     * For 2FA (Two-Factor Authentication) possible values are `sms`, `otp` (one time password),
     * `password` (will force password confirmation, even if user is already logged in), `eid`. Those values might
     * be mixed as space-separated string. To make sure that user has authenticated with 2FA you need
     * to verify AMR (Authentication Methods References) claim in ID token.
     * Might also be used to ensure additional acr (sms, otp, eid) for already logged in users.
     * Supported value is also 'otp-email' means one time password using email.
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
export type SimplifiedLoginWidgetLoginOptions = {
    /**
     * - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF {@link https://tools.ietf.org/html/rfc6749#section-10.12}
     */
     state: string | (() => (string | Promise<string>));
    /**
     * - Authentication Context Class Reference Values. If
     * omitted, the user will be asked to authenticate using username+password.
     * For 2FA (Two-Factor Authentication) possible values are `sms`, `otp` (one time password) and
     * `password` (will force password confirmation, even if user is already logged in). Those values might
     * be mixed as space-separated string. To make sure that user has authenticated with 2FA you need
     * to verify AMR (Authentication Methods References) claim in ID token.
     * Might also be used to ensure additional acr (sms, otp) for already logged in users.
     * Supported value is also 'otp-email' means one time password using email.
     */
    acrValues?: string;
    /**
     * - The OAuth scopes for the tokens. This is a list of
     * scopes, separated by space. If the list of scopes contains `openid`, the generated tokens
     * includes the id token which can be useful for getting information about the user. Omitting
     * scope is allowed, while `invalid_scope` is returned when the client asks for a scope you
     * aren’t allowed to request. {@link https ://tools.ietf.org/html/rfc6749#section-3.3}
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
    maxAge?: string | number;
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
    /**
     * - expected locale of simplified login widget. Should be provided in a short format like 'nb',
     * 'sv'. If not set, a value from the env variable is used.
     */
    locale?: "nb"|"sv"|"fi"|"da"|"en";
};
import RESTClient from "./RESTClient";
import SDKError from "./SDKError";
