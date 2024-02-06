/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from './SDKError';
import { Optional } from './types';

interface IStorage {
    get: (key: string) => Optional<string>,
    set: (key: string, value: string) => void,
    delete: (key: string) => void,
}

/**
 * Check whether we are able to use web storage
 * @param {Storage} storeProvider - A function to return a WebStorage instance (either
 * `sessionStorage` or `localStorage` from a `Window` object)
 * @private
 * @returns {boolean}
 */
function webStorageWorks(storeProvider: () => Storage) {
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
class WebStorageCache implements IStorage {
    /**
     * Create web storage cache object
     * @param {Storage} store - A reference to either `sessionStorage` or `localStorage` from a
     * `Window` object
     */
    constructor(store: Storage) {
        this.store = store;
    }

    private readonly store: Storage;

    get(key: string): Optional<string> {
        if (!this.store) {
            return null;
        }

        return this.store.getItem(key);
    }

    set(key: string, value: string): void {
        if (!this.store) {
            return;
        }

        this.store.setItem(key, value);
    }

    delete(key: string): void {
        if (!this.store) {
            return;
        }

        this.store.removeItem(key);
    }
}

/**
 * Will be used if session storage is not available
 * @private
 */
class LiteralCache implements IStorage {
    /**
     * Create JS object literal cache object
     */
    constructor() {
        this.store = {};
    }

    private readonly store: Record<string, string>  = {};

    get(key: string): Optional<string> {
        return this.store[key];
    }

    set(key: string, value: string): void {
        this.store[key] = value;
    }

    delete(key: string): void {
        if (key in this.store) {
            delete this.store[key];
        }
    }
}

const maxExpiresIn = Math.pow(2, 31) - 1;

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
    constructor(storeProvider: () => Storage) {
        if (webStorageWorks(storeProvider)) {
            this.cache = new WebStorageCache(storeProvider());
            this.type = 'WebStorage';
        } else {
            this.cache = new LiteralCache();
            this.type = 'ObjectLiteralStorage';
        }
    }

    private readonly cache: IStorage;

    readonly type: string;

    /**
     * Get a value from cache (checks that the object has not expired)
     * @param {string} key
     * @private
     * @returns {*} - The value if it exists, otherwise null
     */
    get(key: string): Optional<string> {
        /**
         * JSON.parse safe wrapper
         * @param {string} raw
         * @returns {*} parsed value or null if failed to parse
         */
        function getObj(raw: string) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        }

        const raw = this.cache.get(key);
        if (!raw) {
            return null;
        }

        try {
            const obj = getObj(raw);
            if (obj && Number.isInteger(obj.expiresOn) && obj.expiresOn > Date.now()) {
                return obj.value;
            }
            this.delete(key);
            return null;
        } catch (e) {
            if (e instanceof Error) throw new SDKError(e.message, e);
            else throw new SDKError('Failed to prase JSON while reading from cache.');
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
    set(key: string, value: unknown, expiresIn = 0): void {
        if (expiresIn <= 0) {
            return;
        }
        expiresIn = Math.min(maxExpiresIn, expiresIn);

        try {
            const expiresOn = Math.floor(Date.now() + expiresIn);
            this.cache.set(key, JSON.stringify({ expiresOn, value }));
            setTimeout(() => this.delete(key), expiresIn);
        } catch (e) {
            if (e instanceof Error) throw new SDKError(e.message, e);
            else throw new SDKError('Failed to JSON stringify while writing to cache.');
        }
    }

    /**
     * Delete a cache entry
     * @param {string} key
     * @private
     * @returns {void}
     */
    delete(key: string): void {
        try {
            this.cache.delete(key);
        } catch (e) {
            if (e instanceof Error) throw new SDKError(e.message, e);
            else throw new SDKError('Failed to delete cache entry.');
        }
    }
}
