/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from './SDKError';

/**
 * Check whether we are able to use web storage
 * @param {Storage} store - A reference to either `sessionStorage` or `localStorage` from a `Window`
 * object
 * @private
 * @returns {boolean}
 */
function webStorageWorks(store) {
    if (!store) {
        return false;
    }
    try {
        const randomKey = 'x-x-x-x'.replace(/x/g, () => Math.random());
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
    /**
     * Create web storage cache object
     * @param {Storage} store - A reference to either `sessionStorage` or `localStorage` from a
     * `Window` object
     */
    constructor(store) {
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
    /**
     * @param {Storage} [store] - A reference to either `sessionStorage` or `localStorage` from a
     * `Window` object
     * @throws {SDKError} - If sessionStorage or localStorage are not accessible
     */
    constructor(store) {
        if (webStorageWorks(store)) {
            this.cache = new WebStorageCache(store);
            this.type = 'WebStorage';
        } else {
            this.cache = new LiteralCache();
            this.type = 'ObjectLiteralStorage';
        }
    }

    /**
     * Get a value from cache (checks that the object has not expired)
     * @param {string} key
     * @returns {*} - The value if it exists, otherwise null
     */
    get(key) {
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
     * @returns {void}
     */
    set(key, value, expiresIn = 0) {
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
     * @returns {void}
     */
    delete(key) {
        try {
            this.cache.delete(key);
        } catch (e) {
            throw new SDKError(e);
        }
    }
}
