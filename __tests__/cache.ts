/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import Cache from '../src/utils/cache';

const webStorageMock = () => {
    const mock = {
        store: {},
        setItem: (k, v) => mock.store[k] = v,
        getItem: (k) => mock.store[k],
        removeItem: (k) => delete mock.store[k],
    };
    return mock;
};

const throwingStorageMock = {
    spy: jest.fn().mockImplementation(() => { throw new Error() }),
    setItem: (...args) => throwingStorageMock.spy(...args),
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
            const cache = new Cache(webStorageMock);
            expect(cache.type).toBe('WebStorage');
        });
        test('Falls back to object literal storage if supplied storage throws', () => {
            const cache = new Cache(() => throwingStorageMock);
            expect(cache.type).toBe('ObjectLiteralStorage');
            expect(throwingStorageMock.spy).toHaveBeenCalledTimes(1);
            expect(throwingStorageMock.spy.mock.calls[0][1]).toBe('TEST-VALUE');
        });
        test('Falls back to object literal storage if fetching sessionStorage throws exception', () => {
            const spy = jest.fn().mockImplementation(() => {
                throw Error('Private mode, yo');
            });
            const throwingWindowInstance = {
                get sessionStorage() { return spy(); }
            };
            const cache = new Cache(() => throwingWindowInstance.sessionStorage);
            expect(cache.type).toBe('ObjectLiteralStorage');
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });
    describe('web storage', () => {
        describe('get/set/clear', () => {
            let cache;
            beforeEach(() => {
                cache = new Cache(webStorageMock);
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
            test('values should not expire if expiresIn is large', () => {
                cache.set('foo', 'bar', 2592000000);
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(cache.get('foo')).toBe('bar');
                        resolve();
                    }, 10); // wait 10 ms, then check
                });
            });
            test('should be able to delete values', () => {
                cache.set('foo', 'bar', 10000);
                cache.delete('foo');
                expect(cache.get('foo')).toBe(null);
            });

            test('get should fail if impl fails to get', () => {
                cache.cache.get = jest.fn().mockImplementationOnce(() => {
                    throw new Error('get failure')
                });
                expect(() => cache.get('foo')).toThrow(/get failure/);
            });

            test('get should return null if impl returns non-json-parsable mess', () => {
                cache.cache.get = jest.fn().mockImplementationOnce(() => ({}));
                expect(cache.get('foo')).toBe(null);
            });

            test('get should fail if impl fails to delete', () => {
                cache.cache.delete = jest.fn().mockImplementationOnce(() => {
                    throw new Error('delete failure')
                });
                expect(() => cache.get('foo')).toThrow(/delete/);
            });

            test('set should fail if impl fails to set', () => {
                cache.cache.set = jest.fn().mockImplementationOnce(() => {
                    throw new Error('set failure')
                });
                expect(() => cache.set('foo', 123, 1000)).toThrow(/set failure/);
            });

            test('set should fail if value is not serializable', () => {
                const cyclic = {};
                cyclic.a = cyclic;
                expect(() => cache.set('foo', cyclic, 1000))
                    .toThrow(/Converting circular structure to JSON/);
            });

            test('delete should fail if impl fails to delete', () => {
                cache.cache.delete = jest.fn().mockImplementationOnce(() => {
                    throw new Error('delete failure')
                });
                expect(() => cache.delete('foo')).toThrow(/delete failure/);
            });
        });
    });
});
