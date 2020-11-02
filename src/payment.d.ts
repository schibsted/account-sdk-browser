/**
 * Provides features related to payment
 */
export class Payment {
    /**
     * @param {object} options
     * @param {string} options.clientId - Mandatory client id
     * @param {string} [options.redirectUri] - Redirect uri
     * @param {string} [options.env=PRE] - Schibsted account environment: `PRE`, `PRO` or `PRO_NO`
     * @param {string} [options.publisher] - ZUORA publisher
     * @param {object} [options.window]
     *
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, env, publisher, window }: {
        clientId: string;
        redirectUri?: string;
        env?: string;
        publisher?: string;
        window?: any;
    });
    clientId: string;
    redirectUri: string;
    window: any;
    publisher: string;
    /**
     * Set SPiD server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    private _setSpidServerUrl;
    _spid: RESTClient;
    /**
     * Set BFF server URL - real URL or 'PRE' style key
     * @private
     * @param {string} url
     * @returns {void}
     */
    private _setBffServerUrl;
    _bff: RESTClient;
    /**
     * Close this.popup if it exists and is open
     * @private
     * @returns {void}
     */
    private _closePopup;
    popup: Window;
    /**
     * Starts the flow for the paylink in a popup or current window
     * @param {object} options
     * @param {string} options.paylink - The paylink
     * @param {boolean} [options.preferPopup=false] - Should we try to open a popup?
     * @param {string} [options.redirectUri=this.redirectUri]
     * @returns {Window|null} - Returns a reference to the popup window, or `null` if no popup was
     * used
     */
    payWithPaylink({ paylink, preferPopup, redirectUri }: {
        paylink: string;
        preferPopup?: boolean;
        redirectUri?: string;
    }): Window;
    /**
     * Get the url for the end user to review the purchase history
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the purchase history review page
     */
    purchaseHistoryUrl(redirectUri?: string): string;
    /**
     * Get the url for the end user to redeem a voucher code
     * @param {string} voucherCode
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url
     */
    redeemUrl(voucherCode: string, redirectUri?: string): string;
    /**
     * @deprecated https://github.com/schibsted/account-sdk-browser/issues/94
     *
     * Get the url for the paylink purchase
     * @todo Check working-ness for BFF + SPiD
     * @param {string} paylinkId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the API endpoint
     */
    purchasePaylinkUrl(paylinkId: string, redirectUri?: string): string;
    /**
     * Get the url for flow to purchase a product
     * @param {string} productId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseProductFlowUrl(productId: string, redirectUri?: string): string;
    /**
     * Get the url for flow to purchase a product through a campaign and voucher code
     * @todo Check working-ness for BFF + SPiD
     * @param {string} campaignId
     * @param {string} productId
     * @param {string} [voucherCode]
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseCampaignFlowUrl(campaignId: string, productId: string, voucherCode?: string, redirectUri?: string): string;
    /**
     * Get the url for flow to purchase a promo code product with ZUORA
     * @param {string} code - promocode product code
     * @param {string} [state=''] - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the buy promo code product flow
     */
    purchasePromoCodeProductFlowUrl(code: string, state?: string, redirectUri?: string): string;
}
export default Payment;
import RESTClient from "./RESTClient";
