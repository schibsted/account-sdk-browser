/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { assert, isNonEmptyString, isUrl, isStr } from './utils/validate';
import { urlMapper } from './utils/url';
import { ENDPOINTS } from './config/config';
import * as popupWindowRef from './utils/popup';
import RESTClient from './clients/RESTClient';
import { Environment, Optional } from './utils/types';

interface PaymentProps {
    clientId: string,
    redirectUri: string,
    env?: Environment,
    publisher?: string,
    window: Window;
}

interface PayWithPaylinkOpts {
    paylink: string;
    preferPopup?: boolean;
    redirectUri?: string;
}

const globalWindow = () => window;

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
    constructor({ clientId, redirectUri, env = 'PRE', publisher, window = globalWindow() }: PaymentProps) {
        assert(isNonEmptyString(clientId), 'clientId parameter is required');

        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.window = window;
        this.publisher = publisher;
        this._setSpidServerUrl(env);
        this._setBffServerUrl(env);
    }

    private spidClient: RESTClient | undefined;

    private bffClient: RESTClient | undefined;

    private readonly clientId: string;

    private readonly redirectUri: string;

    private readonly window: Window;

    private readonly publisher: Optional<string>;

    private popupWindowRef: Optional<Window>;

    /**
     * Set SPiD server URL
     * @private
     * @param {string} env - 'PRE' style key
     * @returns {void}
     */
    private _setSpidServerUrl(env: Environment) {
        assert(isStr(env), `env parameter is invalid: ${env}`);
        this.spidClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.SPiD),
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set BFF server URL - real URL or 'PRE' style key
     * @private
     * @param {string} env
     * @returns {void}
     */
    private _setBffServerUrl(env: Environment) {
        assert(isStr(env), `url parameter is invalid: ${env}`);
        this.bffClient = new RESTClient({
            serverUrl: urlMapper(env, ENDPOINTS.BFF),
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Close this.popupWindowRef if it exists and is open
     * @private
     * @returns {void}
     */
    private _closepopupWindowRef() {
        if (this.popupWindowRef) {
            if (!this.popupWindowRef.closed) {
                this.popupWindowRef.close();
            }
            this.popupWindowRef = null;
        }
    }

    /**
     * Starts the flow for the paylink in a popupWindowRef or current window
     * @param {object} options
     * @param {string} options.paylink - The paylink
     * @param {boolean} [options.preferpopupWindowRef=false] - Should we try to open a popupWindowRef?
     * @param {string} [options.redirectUri=this.redirectUri]
     * @returns {Window|null} - Returns a reference to the popupWindowRef window, or `null` if no popupWindowRef was
     * used
     */
    payWithPaylink({ paylink, preferPopup, redirectUri = this.redirectUri }: PayWithPaylinkOpts) {
        assert(isUrl(redirectUri), 'payWithPaylink(): redirectUri is invalid');
        this._closepopupWindowRef();
        const url = this.purchasePaylinkUrl(paylink, redirectUri);
        if (preferPopup) {
            this.popupWindowRef =
                popupWindowRef.open(this.window, url, 'Schibsted account', { width: 360, height: 570 });
            if (this.popupWindowRef) {
                return this.popupWindowRef;
            }
        }
        this.window.location.href = url;
        return null;
    }

    /**
     * Get the url for the end user to review the purchase history
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the purchase history review page
     */
    purchaseHistoryUrl(redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'purchaseHistoryUrl(): redirectUri is invalid');
        return this.spidClient!.makeUrl('account/purchasehistory', { redirect_uri: redirectUri });
    }

    /**
     * Get the url for the end user to redeem a voucher code
     * @param {string} voucherCode
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url
     */
    redeemUrl(voucherCode: string, redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'redeemUrl(): redirectUri is invalid');
        return this.spidClient!.makeUrl('account/redeem', { voucher_code: voucherCode });
    }

    /**
     * @deprecated https://github.com/schibsted/account-sdk-browser/issues/94
     *
     * Get the url for the paylink purchase
     * @todo Check working-ness for BFF + SPiD
     * @param {string} paylinkId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the API endpoint
     */
    purchasePaylinkUrl(paylinkId: string, redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'purchasePaylinkUrl(): redirectUri is invalid');
        assert(isNonEmptyString(paylinkId), 'purchasePaylinkUrl(): paylinkId is required');
        return this.bffClient!.makeUrl('payment/purchase', {
            paylink: paylinkId,
            redirect_uri: redirectUri,
        });
    }

    /**
     * Get the url for flow to purchase a product
     * @param {string} productId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseProductFlowUrl(productId: string, redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'purchaseProductUrl(): redirectUri is invalid');
        assert(isNonEmptyString(productId), 'purchaseProductFlowUrl(): productId is required');
        return this.bffClient!.makeUrl('flow/checkout', {
            response_type: 'code',
            flow: 'payment',
            product_id: productId,
            redirect_uri: redirectUri,
        });
    }

    /**
     * Get the url for flow to purchase a product through a campaign and voucher code
     * @todo Check working-ness for BFF + SPiD
     * @param {string} campaignId
     * @param {string} productId
     * @param {string} [voucherCode]
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseCampaignFlowUrl(campaignId: string, productId: string, voucherCode: string, redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'purchaseCampaignFlowUrl(): redirectUri is invalid');
        assert(isNonEmptyString(campaignId), 'purchaseCampaignFlowUrl(): campaignId is required');
        assert(isNonEmptyString(productId), 'purchaseCampaignFlowUrl(): productId is required');
        return this.bffClient!.makeUrl('flow/checkout', {
            response_type: 'code',
            flow: 'payment',
            campaign_id: campaignId,
            product_id: productId,
            voucher_code: voucherCode,
            redirect_uri: redirectUri,
        });
    }

    /**
     * @deprecated
     * Get the url for flow to purchase a promo code product with ZUORA
     * @param {string} code - promocode product code
     * @param {string} [state=''] - An opaque value used by the client to maintain state between
     * the request and callback. It's also recommended to prevent CSRF
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the buy promo code product flow
     */
    purchasePromoCodeProductFlowUrl(code: string, state = '', redirectUri = this.redirectUri): string {
        assert(isUrl(redirectUri), 'purchasePromoCodeProductFlowUrl(): redirectUri is invalid');
        assert(isNonEmptyString(code), 'purchasePromoCodeProductFlowUrl(): code is required');
        assert(isNonEmptyString(this.publisher), 'purchasePromoCodeProductFlowUrl(): publisher is required in the constructor');
        return this.bffClient!.makeUrl('payment/purchase/code', {
            code,
            publisher: this.publisher,
            state,
            redirect_uri: redirectUri,
        });
    }
}

export default Payment;
