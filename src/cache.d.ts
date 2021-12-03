/**
 * @typedef {() => Storage} StoreProvider
 */
declare type StoreProvider = () => Storage;
/**
 * Cache class that attempts WebStorage (session/local storage), and falls back to JS object literal
 * @private
 */
export default class Cache {
    #private;
    /**
     * @param {StoreProvider} [storeProvider] - A function to return a WebStorage instance (either
     * `sessionStorage` or `localStorage` from a `Window` object)
     * @throws {SDKError} - If sessionStorage or localStorage are not accessible
     */
    constructor(storeProvider: StoreProvider);
    /**
     * Get a value from cache (checks that the object has not expired)
     * @param {string} key
     * @private
     * @returns {*} - The value if it exists, otherwise null
     */
    get(key: string): any;
    /**
     * Set a cache entry
     * @param {string} key
     * @param {*} value
     * @param {Number} expiresIn - Value in milliseconds until the entry expires
     * @private
     * @returns {void}
     */
    set(key: string, value: any, expiresIn?: number): void;
    /**
     * Delete a cache entry
     * @param {string} key
     * @private
     * @returns {void}
     */
    delete(key: string): void;
}
export {};
