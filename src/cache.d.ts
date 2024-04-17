/**
 * Cache class that attempts WebStorage (session/local storage), and falls back to JS object literal
 * @private
 */
export default class Cache {
    /**
     * @param {Storage} [storeProvider] - A function to return a WebStorage instance (either
     * `sessionStorage` or `localStorage` from a `Window` object)
     * @throws {SDKError} - If sessionStorage or localStorage are not accessible
     */
    constructor(storeProvider?: Storage);
    cache: WebStorageCache | LiteralCache;
    type: string;
    /**
     * Get a value from cache (checks that the object has not expired)
     * @param {string} key
     * @returns {*} - The value if it exists, otherwise null
     */
    private get;
    /**
     * Set a cache entry
     * @param {string} key
     * @param {*} value
     * @param {Number} expiresIn - Value in milliseconds until the entry expires
     * @returns {void}
     */
    private set;
    /**
     * Delete a cache entry
     * @param {string} key
     * @returns {void}
     */
    private delete;
}
/**
 * Will be used if web storage is available
 * @private
 */
declare class WebStorageCache {
    /**
     * Create web storage cache object
     * @param {Storage} store - A reference to either `sessionStorage` or `localStorage` from a
     * `Window` object
     */
    constructor(store: Storage);
    store: Storage;
    get: (key: any) => string;
    set: (key: any, value: any) => void;
    delete: (key: any) => void;
}
/**
 * Will be used if session storage is not available
 * @private
 */
declare class LiteralCache {
    store: {};
    get: (key: any) => any;
    set: (key: any, value: any) => any;
    delete: (key: any) => boolean;
}
export {};
