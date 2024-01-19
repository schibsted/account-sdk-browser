/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from './SDKError.js';
import { cloneDefined } from './object.js';
import { urlMapper } from './url.js';
import { assert, isObject, isFunction, isStr, isNonEmptyString } from './validate.js';

/**
 * Converts a series of parameters of various types to a string that's suitable for logging.
 * @private
 * @param {Array.<*>} msg - a number of parameters from any type (including objects)
 * @return {string}
 */
const logString = (msg) => msg.map(m => isObject(m) ? JSON.stringify(m, null, 2) : m).join(' ');

/**
 * Calls a log function passing a string
 * @private
 * @param {function} fn - the log function
 * @param {...*} msg - a series of message objects
 * @return {*} - The result of calling fn
 */
const logFn = (fn, ...msg) => (typeof fn === 'function') && fn(logString(msg));

/**
 * Encode a string like URLSearchParams would do
 * @private
 * @param {string} str - The input
 * @returns {string} The encoded string
 */
function encode(str) {
    const replace = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '~': '%7E',
        '%20': '+',
        '%00': '\x00'
    };
    return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, match => replace[match]);
}

const globalFetch = () => window.fetch && window.fetch.bind(window);

/**
 * This class can be used for creating a wrapper around a server and all its endpoints.
 * Its functionality is extended by {@link JSONPClient}
 * Creates a client to a REST server. While useful stand-alone, it's also used for some other
 * types of client that change some functionalities.
 * @throws {SDKError} if any of options are invalid
 * @summary the simplest way to communicate to a REST endpoint without any
 *          special authentication
 * @memberof core
 * @private
 */
export class RESTClient {

    /**
     * @param {object} options
     * @param {string} [options.serverUrl=PRE] - The URL to the server eg.
     * https://login.schibsted.com or a URL key like 'DEV' in combination with {@link envDic}.
     * @param {object} [options.envDic] - A dictionary that will be used for looking up
     * {@link serverUrl} keys. If serverUrl is always a URL, you don't need this.
     * @param {function} [options.fetch=window.fetch] - The fetch function to use. It can be native
     * or a polyfill
     * @param {function} [options.log] - A function that will be called with log messages about
     * request and response
     * @param {object} [options.defaultParams={}] - a set of parameters to add to every call custom.
     *        As long as it supports the standard fetch API we're good.
     */
    constructor({ serverUrl = 'PRE', envDic, fetch = globalFetch(), log, defaultParams = {}}) {
        assert(isObject(defaultParams), `defaultParams should be a non-null object`);

        this.url = new URL(urlMapper(serverUrl, envDic));

        this.defaultParams = defaultParams;

        if (log) {
            assert(isFunction(log), `log must be a function but it is ${log}`);
            this.log = log;
        }

        if (fetch) {
            assert(isFunction(fetch), 'Fetch should be a function');
            this.fetch = fetch;
        }
    }

    /**
     * Makes the actual call to the server and deals with headers, data objects and the edge cases.
     * Please note that this method expects the response to be in JSON format. However, it'll not
     * parse the response if its code is not in the 200 range.
     * @param {object} options - an obligatory options object
     * @param {string} options.method - can be 'GET', 'POST', 'DELETE', etc. case sensitive.  To be
     *        more specific, this can be one of the values that are passed to the `methods`
     *        property of the constructor's `options` parameter.
     * @param {string} options.pathname - the path to the endpoint like 'api/2/endpoint-name'
     * @param {Object} [options.data={}] - data payload (depending on GET/DELETE or POST it may be a query
     *        string or form body)
     * @param {array} [options.headers] - fetch options headers
     * @param {boolean} [options.useDefaultParams] - should we add the defaultParams to the query?
     * @param {object} [options.fetchOptions] - fetch options
     * @throws {SDKError} - if the call can't be made for whatever reason.
     * @return {Promise<object>} - A promise that will resolve to the call's response or reject if there
     *         is an error before making the call or if the server returns a non-2xx error or
     *         something that's not parsable as JSON.
     */
    async go({
        method,
        headers,
        pathname,
        data = {},
        useDefaultParams = true,
        fetchOptions = { method, credentials: 'include' }
    }) {
        assert(isFunction(this.fetch),
            `Can't make a call. The reference to fetch is missing or not a function.`);
        assert(isNonEmptyString(method), `Method must be a non empty string but it is "${method}"`);
        assert(isNonEmptyString(pathname), `Pathname must be string but it is "${pathname}"`);
        assert(isObject(data), `data must be a non-null object`);

        fetchOptions.headers = isObject(headers) ? cloneDefined(headers) : {};
        const fullUrl = this.makeUrl(pathname, data, useDefaultParams);

        logFn(this.log, 'Request:', fetchOptions.method.toUpperCase(), fullUrl);
        logFn(this.log, 'Request Headers:', fetchOptions.headers);
        logFn(this.log, 'Request Body:', fetchOptions.body);
        try {
            const response = await this.fetch(fullUrl, fetchOptions);
            logFn(this.log, 'Response Code:', response.status, response.statusText);
            if (!response.ok) {
                // status code not in range 200-299
                throw new SDKError(response.statusText, { code: response.status });
            }
            const responseObject = await response.json();
            logFn(this.log, 'Response Parsed:', responseObject);
            return responseObject;
        } catch (err) {
            let msg = isStr(err) ? err : 'Unknown RESTClient error';
            if (isObject(err) && isStr(err.message)) {
                msg = err.message;
            }
            throw new SDKError(`Failed to '${method}' '${fullUrl}': '${msg}'`, err);
        }
    }

    /**
     * Creates a url that points to an endpoint in the server
     * @param {string} [pathname=] - WHATWG pathname ie. 'api/2/endpoint-name'
     * @param {object} [query={}] - WHATWG query. It's the data payload.
     * @param {boolean} [useDefaultParams=true] - should we add the defaultParams to the query?
     * @return {string} - the resulting url string ready to pass to fetch
     */
    makeUrl(pathname = '', query = {}, useDefaultParams = true) {
        const url = new URL(pathname, this.url);
        url.search = RESTClient.search(query, useDefaultParams, this.defaultParams);
        return url.href;
    }

    /**
     * Make a GET request
     * @param {string} pathname - WHATWG pathname ie. 'api/2/endpoint-name'
     * @param {object} [data={}] - the data payload.
     * @return {Promise}
     */
    get(pathname, data) {
        return this.go({ method: 'get', pathname, data });
    }

    /**
     * Construct query string for WHATWG urls
     * @private
     * @param {object} query - Object to generate query string from
     * @param {boolean} useDefaultParams - Use defaultParams or not
     * @param {object} defaultParams - Default params
     * @returns {string} Query string
     */
    static search(query, useDefaultParams, defaultParams) {
        const params = useDefaultParams ? cloneDefined(defaultParams, query) : cloneDefined(query);
        return Object.keys(params).filter(p => params[p]!=='').map(p => `${encode(p)}=${encode(params[p])}`).join('&');
    }
}

export default RESTClient;
