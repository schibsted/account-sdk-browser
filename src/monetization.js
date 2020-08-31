/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { assert, isStr, isNonEmptyString, isUrl } from './validate';
import { urlMapper } from './url';
import { ENDPOINTS, NAMESPACE } from './config';
import EventEmitter from 'tiny-emitter';
import RESTClient from './RESTClient';
import Cache from './cache';
import * as spidTalk from './spidTalk';
import SDKError from './SDKError';

const globalWindow = () => window;

/**
 * Provides features related to monetization
 */
export class Monetization extends EventEmitter {
    /**
     * @param {object} options
     * @param {string} options.clientId - Mandatory client id
     * @param {string} [options.redirectUri] - Redirect uri
     * @param {string} [options.env=PRE] - Schibsted account environment: `PRE`, `PRO` or `PRO_NO`
     * @param {string} [options.sessionDomain] - Example: "https://id.site.com"
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, env = 'PRE', sessionDomain, window = globalWindow() }) {
        super();
        spidTalk.emulate(window);
        // validate options
        assert(isNonEmptyString(clientId), 'clientId parameter is required');

        this.cache = new Cache(() => window && window.sessionStorage);
        this.clientId = clientId;
        this.env = env;
        this.redirectUri = redirectUri;
        this._setSpidServerUrl(env);

        if (sessionDomain) {
            assert(isUrl(sessionDomain), 'sessionDomain parameter is not a valid URL');
            this._setSessionServiceUrl(sessionDomain);
        }
    }

    /**
     * Set SPiD server URL
     * @private
     * @param {string} url
     * @returns {void}
     */
    _setSpidServerUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._spid = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.SPiD),
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set session-service domain
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
     * Checks if the user has access to a set of products or features.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @throws {SDKError} - If the input is incorrect, or a network call fails in any way
     * (this will happen if, say, the user is not logged in)
     * @returns {Object|null} The data object returned from Schibsted account (or `null` if the user
     * doesn't have access to any of the given products/features)
     */
    async hasAccess(productIds, userId) {
        if (!this._sessionService) {
            throw new SDKError(`hasAccess can only be called if 'sessionDomain' is configured`);
        }
        if (!userId) {
            throw new SDKError(`'userId' must be specified`);
        }
        if (!Array.isArray(productIds)) {
            throw new SDKError(`'productIds' must be an array`);
        }

        const sortedIds = productIds.sort();
        const cacheKey = this._accessCacheKey(productIds, userId);
        let data = this.cache.get(cacheKey);
        if (!data) {
            data = await this._sessionService.get(`/hasAccess/${sortedIds.join(',')}`);
            const expiresSeconds = data.ttl;
            this.cache.set(cacheKey, data, expiresSeconds * 1000);
        }

        if (!data.entitled) {
            return null;
        }
        this.emit('hasAccess', { ids: sortedIds, data });
        return data;
    }

    /**
     * Removes the cached access result.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @returns {void}
     */
    clearCachedAccessResult(productIds, userId) {
        this.cache.delete(this._accessCacheKey(productIds, userId));
    }

    /**
     * Compute "has access" cache key for the given product ids and user id.
     * @param {array} productIds - which products/features to check
     * @param {number} userId - id of currently logged in user
     * @returns {string}
     * @private
     */
    _accessCacheKey(productIds, userId) {
        return `prd_${productIds.sort()}_${userId}`;
    }

    /**
     * Get the url for the end user to review the subscriptions
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the subscriptions review page
     */
    subscriptionsUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `subscriptionsUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('account/subscriptions', { redirect_uri: redirectUri });
    }

    /**
     * Get the url for the end user to review the products
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    productsUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `productsUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('account/products', { redirect_uri: redirectUri });
    }
}

export default Monetization;
