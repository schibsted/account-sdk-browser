/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import Cache from '../src/utils/cache';
import { MockStorage } from '../__mocks__/Storage.mock';
import { throwingFn, throwingFnMsg } from './utils';

const webStorageMock = (): Storage => {
    return new MockStorage();
};

const KEY = 'foo';
const VALUE = 'bar';

describe('cache', () => {
    describe('constructor', () => {

        test('can create new instance', () => {
            // @ts-expect-error
            expect(() => new Cache()).not.toThrow();
        });

        test('can force a cache with object literal storage', () => {
            const EXPECTED_CACHE_TYPE = 'ObjectLiteralStorage';

            // @ts-expect-error
            const cache = new Cache();

            expect(cache.type).toBe(EXPECTED_CACHE_TYPE);
        });

        test('can force a cache with session storage', () => {
            const EXPECTED_CACHE_TYPE = 'WebStorage';
            const cache = new Cache(webStorageMock);

            expect(cache.type).toBe(EXPECTED_CACHE_TYPE);
        });

        test('Falls back to object literal storage if supplied storage throws', () => {
            const EXPECTED_CACHE_TYPE = 'ObjectLiteralStorage';
            const TEST_VALUE = 'TEST-VALUE';

            const spy = jest.fn().mockImplementation(throwingFn);
            const storageMock = webStorageMock();
            storageMock.setItem = spy;

            const cache = new Cache(() => storageMock);

            expect(cache.type).toBe(EXPECTED_CACHE_TYPE);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.lastCall[1]).toBe(TEST_VALUE);
        });

        test('Falls back to object literal storage if fetching sessionStorage throws exception', () => {
            const EXPECTED_CACHE_TYPE = 'ObjectLiteralStorage';
            const spy = jest.fn().mockImplementation(throwingFn);
            const throwingWindowInstance = {
                get sessionStorage() { return spy(); },
            };

            const cache = new Cache(() => throwingWindowInstance.sessionStorage);

            expect(cache.type).toBe(EXPECTED_CACHE_TYPE);
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });
    describe('web storage', () => {
        describe('get/set/clear', () => {
            let cache: Cache;

            beforeEach(() => {
                cache = new Cache(webStorageMock);
            });

            test('can read/write values', () => {
                cache.set(KEY, VALUE, 1000);

                expect(cache.get(KEY)).toBe(VALUE);
            });

            test('values should not be saved at all with no expiration', () => {
                cache.set(KEY, VALUE);

                expect(cache.get(KEY)).toBe(null);
            });

            test('values should expire', () => {
                cache.set(KEY, VALUE, 2); // 2 ms

                return new Promise((resolve): void => {
                    setTimeout(() => {
                        expect(cache.get(KEY)).toBe(null);
                        resolve('');
                    }, 10); // wait 10 ms, then check
                });
            });

            test('should be able to delete values', () => {
                cache.set(KEY, VALUE, 10000);
                cache.delete(KEY);
                expect(cache.get(KEY)).toBe(null);
            });
        });
    });

    describe('object literal storage', () => {
        describe('get/set/clear', () => {
            let cache: Cache;

            beforeEach(() => {
                cache = new Cache(webStorageMock);
            });

            test('can read/write values', () => {
                cache.set(KEY, VALUE, 1000);

                expect(cache.get(KEY)).toBe(VALUE);
            });

            test('values should not be saved at all with no expiration', () => {
                cache.set(KEY, VALUE);

                expect(cache.get('foo')).toBe(null);
            });

            test('values should expire', () => {
                cache.set(KEY, VALUE, 2); // 2 ms

                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(cache.get(KEY)).toBe(null);
                        resolve('');
                    }, 10); // wait 10 ms, then check
                });
            });

            test('values should not expire if expiresIn is large', () => {
                cache.set(KEY, VALUE, 2592000000);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(cache.get(KEY)).toBe(VALUE);
                        resolve('');
                    }, 10); // wait 10 ms, then check
                });
            });

            test('should be able to delete values', () => {
                cache.set(KEY, VALUE, 10000);

                cache.delete(KEY);

                expect(cache.get(KEY)).toBe(null);
            });

            test('get should fail if impl fails to get', () => {
                cache.get = jest.fn().mockImplementationOnce(throwingFn);

                expect(() => cache.get(KEY)).toThrow(RegExp(throwingFnMsg));
            });

            test('get should return null if impl returns non-json-parsable mess', () => {
                expect(cache.get(KEY)).toBe(null);
            });

            test('get should fail if impl fails to delete', () => {
                cache.delete = jest.fn().mockImplementationOnce(throwingFn);

                expect(() => cache.delete(KEY)).toThrow(RegExp(throwingFnMsg));
            });

            test('set should fail if impl fails to set', () => {
                cache.set = jest.fn().mockImplementationOnce(throwingFn);

                expect(() => cache.set(KEY, VALUE, 1000)).toThrow(RegExp(throwingFnMsg));
            });

            test('set should fail if value is not serializable', () => {
                const cyclic = {};

                // @ts-expect-error
                cyclic.a = cyclic;

                expect(() => cache.set(KEY, cyclic, 1000))
                    .toThrow(/Converting circular structure to JSON/);
            });

            test('delete should fail if impl fails to delete', () => {
                cache.delete = jest.fn().mockImplementationOnce(throwingFn);

                expect(() => cache.delete(KEY)).toThrow(RegExp(throwingFnMsg));
            });
        });
    });
});
