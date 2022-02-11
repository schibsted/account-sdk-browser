/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from './SDKError';
/**
 * @typedef {() => Storage} StoreProvider
 */
type StoreProvider = () => Storage;
/**
 * Check whether we are able to use web storage
 * @param {StoreProvider} storeProvider - A function to return a WebStorage instance (either
 * `sessionStorage` or `localStorage` from a `Window` object)
 * @private
 * @returns {boolean}
 */
function webStorageWorks(storeProvider: StoreProvider) {
    if (!storeProvider) {
        return false;
    }
    try {
        const store = storeProvider();
        const randomKey = 'x-x-x-x'.replace(/x/g, () => Math.random().toString());
        const testValue = 'TEST-VALUE';
        store.setItem(randomKey, testValue);
        const val = store.getItem(randomKey);
        store.removeItem(randomKey);
        return (val === testValue);
    } catch (e) {
        return false;
    }
}

/**
 * Will be used if web storage is available
 * @private
 */
class WebStorageCache {
    store: Storage;
    get: (key: any) => any;
    set: (key: any, value: any) => any;
    delete: (key: any) => any;
    /**
     * Create web storage cache object
     * @param {Storage} store - A reference to either `sessionStorage` or `localStorage` from a
     * `Window` object
     */
    constructor(store: Storage) {
        this.store = store;
        this.get = (key) => this.store.getItem(key);
        this.set = (key, value) => this.store.setItem(key, value);
        this.delete = (key) => this.store.removeItem(key);
    }
}

/**
 * Will be used if session storage is not available
 * @private
 */
class LiteralCache {
    store: Record<string, any>;
    get: (key: any) => any;
    set: (key: any, value: any) => any;
    delete: (key: any) => boolean;
    /**
     * Create JS object literal cache object
     */
    constructor() {
        this.store = {};
        this.get = (key) => this.store[key];
        this.set = (key, value) => this.store[key] = value;
        this.delete = (key) => delete this.store[key];
    }
}

const maxExpiresIn = Math.pow(2, 31) - 1;

/**
 * Cache class that attempts WebStorage (session/local storage), and falls back to JS object literal
 * @private
 */
export default class Cache {
    private cache: WebStorageCache | LiteralCache;
    private type: string;
    /**
     * @param {StoreProvider} [storeProvider] - A function to return a WebStorage instance (either
     * `sessionStorage` or `localStorage` from a `Window` object)
     * @throws {SDKError} - If sessionStorage or localStorage are not accessible
     */
    constructor(storeProvider: StoreProvider) {
        if (webStorageWorks(storeProvider)) {
            this.cache = new WebStorageCache(storeProvider());
            this.type = 'WebStorage';
        } else {
            this.cache = new LiteralCache();
            this.type = 'ObjectLiteralStorage';
        }
    }

    /**
     * Get a value from cache (checks that the object has not expired)
     * @param {string} key
     * @private
     * @returns {*} - The value if it exists, otherwise null
     */
    get(key: string) {
        try {
            const raw = this.cache.get(key);
            const obj = raw ? JSON.parse(raw) : null;
            if (obj && Number.isInteger(obj.expiresOn) && obj.expiresOn > Date.now()) {
                return obj.value;
            }
            this.delete(key);
            return null;
        } catch (e) {
            throw new SDKError(e);
        }
    }

    /**
     * Set a cache entry
     * @param {string} key
     * @param {*} value
     * @param {Number} expiresIn - Value in milliseconds until the entry expires
     * @private
     * @returns {void}
     */
    set(key: string, value: any, expiresIn = 0) {
        if (expiresIn <= 0) {
            return;
        }
        expiresIn = Math.min(maxExpiresIn, expiresIn);

        try {
            const expiresOn = Math.floor(Date.now() + expiresIn);
            this.cache.set(key, JSON.stringify({ expiresOn, value }));
            setTimeout(() => this.delete(key), expiresIn);
        } catch (e) {
            throw new SDKError(e);
        }
    }

    /**
     * Delete a cache entry
     * @param {string} key
     * @private
     * @returns {void}
     */
    delete(key: string) {
        try {
            this.cache.delete(key);
        } catch (e) {
            throw new SDKError(e);
        }
    }
}
