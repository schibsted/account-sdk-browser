/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

const { cloneDefined } = require('./object');
const RESTClient = require('./RESTClient');
const config = require('./config');
const fetch = require('fetch-jsonp');

/**
 * To enable communication with JSONP endpoints
 * @memberof core
 * @private
 */
class JSONPClient extends RESTClient {
    /**
     * @param {object} options - See the `options` parameter of {@link RESTClient#constructor}
     * @param {number} [options.timeout=7000] - Timeout for fetch requests in milliseconds
     * @throws {SDKError} - when validating the options
     */
    constructor(options) {
        super(cloneDefined({ fetch }, options));

        // Set minimum refresh timeout
        this.timeout = options.timeout === undefined ?
            config.JSONP.TIMEOUT : Number(options.timeout);
    }

    /**
     * Makes the actual call to the server and deals with headers, data objects and the edge cases
     * @private
     * @override
     * @param {object} options
     * @param {string} options.method - Currently it can only be 'GET' (case sensitive)
     * @param {string} options.pathname - The path to the endpoint like 'api/2/endpoint-name'
     * @param {object} [options.data={}] - Data payload (sent as query string)
     * @throws {SDKError} - If the call can't be invoked
     * @return {Promise} - A promise that will represent the success or failure of the call
     */
    go(options = {}) {
        const fetchOptions = {
            method: options.method,
            credentials: 'include',
            timeout: this.timeout
        };
        return super.go(Object.assign({ fetchOptions }, options));
    }
}

module.exports = JSONPClient;
