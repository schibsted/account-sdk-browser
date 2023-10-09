/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { ENDPOINTS } from '../src/config';
import { RESTClient } from '../src/RESTClient';

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

    test('fetch default works', () => {
        window.fetch = function () {
            if (this !== window) {
                throw new Error('Illegal invocation!');
            }
        };
        jest.resetModuleRegistry();
        const restClient = new RESTClient({
            serverUrl: 'DEV',
            envDic: ENDPOINTS.SPiD,
        });
        expect(restClient.fetch).not.toThrow(/Illegal invocation/);
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

    test('Check that headers are sent', async () => {
        const spy = jest.fn();
        spy.mockImplementation(async () => ({ ok: true, json: async () => ({}) }));
        const restClient = new RESTClient({ envDic: ENDPOINTS.SPiD, fetch: spy });
        await restClient.go({ method: 'get', pathname: '/' });
        await restClient.go({ method: 'get', pathname: '/', headers: { foo: 'bar' } });
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy.mock.calls[0][1].headers).toEqual({});
        expect(spy.mock.calls[1][1].headers).toEqual({ foo: 'bar' });
    });

    test('Should return SDKError on failed requests', async () => {
        const spy = jest.fn();
        spy.mockImplementation(async () => ({ ok: false, status: 400, statusText: 'Errorz' }));
        const restClient = new RESTClient({ envDic: ENDPOINTS.SPiD, fetch: spy });
        await expect(restClient.go({ method: 'get', pathname: '/' })).rejects.toMatchObject({
            name: 'SDKError',
            message: `Failed to 'get' 'https://identity-pre.schibsted.com/': 'Errorz'`,
            code: 400
        });
    });

    test('Should return SDKError when fetch throws', async () => {
        const spy = jest.fn();
        spy.mockImplementation(async () => { throw 'Errorz'; });
        const restClient = new RESTClient({ envDic: ENDPOINTS.SPiD, fetch: spy });
        await expect(restClient.go({ method: 'get', pathname: '/' })).rejects.toMatchObject({
            name: 'SDKError',
            message: `Failed to 'get' 'https://identity-pre.schibsted.com/': 'Errorz'`,
        });
    });

    test('makeUrl should work', async () => {
        const spy = jest.fn();
        spy.mockImplementation(async () => { throw 'Errorz'; });
        const restClient = new RESTClient({ envDic: ENDPOINTS.SPiD, defaultParams: { foo: 'bar'} });
        const u = restClient.makeUrl();
        expect(u).toBe('https://identity-pre.schibsted.com/?foo=bar');
        const u2 = restClient.makeUrl('', {}, false);
        expect(u2).toBe('https://identity-pre.schibsted.com/');
    });
});
