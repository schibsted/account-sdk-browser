/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

const Cache = require('../src/cache');

const webStorageMock = () => {
    const mock = {
        store: {},
        setItem: (k, v) => mock.store[k] = v,
        getItem: (k) => mock.store[k],
        removeItem: (k) => delete mock.store[k],
    };
    return mock;
};

describe('cache', () => {
    describe('ctor', () => {
        test('can create one', () => {
            expect(() => new Cache()).not.toThrow();
        });
        test('can force a cache with object literal storage', () => {
            const cache = new Cache();
            expect(cache.type).toBe('ObjectLiteralStorage');
        });
        test('can force a cache with session storage', () => {
            const cache = new Cache(webStorageMock());
            expect(cache.type).toBe('WebStorage');
        });
    });
    describe('web storage', () => {
        describe('get/set/clear', () => {
            let cache;
            beforeEach(() => {
                cache = new Cache(webStorageMock());
            });
            test('can read/write values', () => {
                cache.set('foo', 'bar', 1000);
                expect(cache.get('foo')).toBe('bar');
            });
            test('values should not be saved at all with no expiration', () => {
                cache.set('foo', 'bar');
                expect(cache.get('foo')).toBe(null);
            });
            test('values should expire', () => {
                cache.set('foo', 'bar', 2); // 2 ms
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(cache.get('foo')).toBe(null);
                        resolve();
                    }, 10); // wait 10 ms, then check
                });
            });
            test('should be able to delete values', () => {
                cache.set('foo', 'bar', 10000);
                cache.delete('foo');
                expect(cache.get('foo')).toBe(null);
            });
        });
    });
    describe('object literal storage', () => {
        describe('get/set/clear', () => {
            let cache;
            beforeEach(() => {
                cache = new Cache();
            });
            test('can read/write values', () => {
                cache.set('foo', 'bar', 1000);
                expect(cache.get('foo')).toBe('bar');
            });
            test('values should not be saved at all with no expiration', () => {
                cache.set('foo', 'bar');
                expect(cache.get('foo')).toBe(null);
            });
            test('values should expire', () => {
                cache.set('foo', 'bar', 2); // 2 ms
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(cache.get('foo')).toBe(null);
                        resolve();
                    }, 10); // wait 10 ms, then check
                });
            });
            test('should be able to delete values', () => {
                cache.set('foo', 'bar', 10000);
                cache.delete('foo');
                expect(cache.get('foo')).toBe(null);
            });
        });
    });
});
