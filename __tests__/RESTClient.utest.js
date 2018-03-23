/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

const { ENDPOINTS } = require('../src/config');
const RESTClient = require('../src/RESTClient');

describe('RESTClient', () => {
    test('has the REST methods for get and go', () => {
        const restClient = new RESTClient({
            serverUrl: 'DEV',
            envDic: ENDPOINTS.SPiD,
            fetch: function(){},
        });

        expect(typeof restClient.get).toBe('function');
        expect(typeof restClient.go).toBe('function');
    });

    test('Supplied log function is called', async () => {
        const spy = jest.fn();
        const restClient = new RESTClient({
            envDic: ENDPOINTS.SPiD,
            log: spy,
            fetch: async () => ({ ok: true, json: async () => ({}) }),
        });
        await restClient.go({ method: 'get', pathname: '/' });
        expect(spy).toHaveBeenCalled();
    });

    test('Static `search` function is called and encoded correctly', () => {
        const NUL = String.fromCodePoint(0);
        const q = RESTClient.search({ foo: `b a!r'b(a)r~b${NUL}a` });
        expect(q).toBe('foo=b+a%21r%27b%28a%29r%7Eb\x00a');
    });
});
