/**
 * Provides features related to monetization
 */
export class Monetization {
    /**
     * @param {object} options
     * @param {string} options.clientId - Mandatory client id
     * @param {string} options.redirectUri - Redirect uri
     * @param {string} options.sessionDomain - Example: "https://id.site.com"
     * @param {string} [options.env=PRE] - Schibsted account environment: `PRE`, `PRO` or `PRO_NO`
     * @param {object} [options.window]
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, env, sessionDomain, window }: {
        clientId: string;
        redirectUri: string;
        sessionDomain: string;
        env?: string;
        window?: any;
    });
    cache: any;
    clientId: string;
    env: string;
    redirectUri: string;
    /**
     * Set SPiD server URL
     * @private
     * @param {string} url
     * @returns {void}
     */
    private _setSpidServerUrl;
    _spid: RESTClient;
    /**
     * Set session-service domain
     * @private
     * @param {string} domain - real URL — (**not** 'PRE' style env key)
     * @returns {void}
     */
    private _setSessionServiceUrl;
    _sessionService: RESTClient;
    /**
     * Checks if the user has access to a set of products or features.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @throws {SDKError} - If the input is incorrect, or a network call fails in any way
     * (this will happen if, say, the user is not logged in)
     * @returns {Object|null} The data object returned from Schibsted account (or `null` if the user
     * doesn't have access to any of the given products/features)
     */
    hasAccess(productIds: any[], userId: number): any;
    /**
     * Removes the cached access result.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @returns {void}
     */
    clearCachedAccessResult(productIds: any[], userId: number): void;
    /**
     * Compute "has access" cache key for the given product ids and user id.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @returns {string}
     * @private
     */
    private _accessCacheKey;
    /**
     * Get the url for the end user to review the subscriptions
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the subscriptions review page
     */
    subscriptionsUrl(redirectUri?: string): string;
    /**
     * Get the url for the end user to review the products
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    productsUrl(redirectUri?: string): string;
}
export default Monetization;
import RESTClient from "./clients/RESTClient.js";
