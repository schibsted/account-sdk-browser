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
     * Construct query string for WHATWG urls
     * @private
     * @param {object} query - Object to generate query string from
     * @param {boolean} useDefaultParams - Use defaultParams or not
     * @param {object} defaultParams - Default params
     * @returns {string} Query string
     */
    private static search;
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
    constructor({ serverUrl, envDic, fetch, log, defaultParams }: {
        serverUrl?: string;
        envDic?: any;
        fetch?: Function;
        log?: Function;
        defaultParams?: any;
    });
    url: URL;
    defaultParams: any;
    log: Function;
    fetch: Function;
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
    go({ method, headers, pathname, data, useDefaultParams, fetchOptions }: {
        method: string;
        pathname: string;
        data?: any;
        headers?: any[];
        useDefaultParams?: boolean;
        fetchOptions?: any;
    }): Promise<any>;
    /**
     * Creates a url that points to an endpoint in the server
     * @param {string} [pathname=] - WHATWG pathname ie. 'api/2/endpoint-name'
     * @param {object} [query={}] - WHATWG query. It's the data payload.
     * @param {boolean} [useDefaultParams=true] - should we add the defaultParams to the query?
     * @return {string} - the resulting url string ready to pass to fetch
     */
    makeUrl(pathname?: string, query?: any, useDefaultParams?: boolean): string;
    /**
     * Make a GET request
     * @param {string} pathname - WHATWG pathname ie. 'api/2/endpoint-name'
     * @param {object} [data={}] - the data payload.
     * @return {Promise}
     */
    get(pathname: string, data?: any): Promise<any>;
}
export default RESTClient;
