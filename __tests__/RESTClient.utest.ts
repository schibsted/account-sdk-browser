/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { RESTClient } from '../src/clients/RESTClient';
import { throwingFn, throwingFnMsg } from './utils';
import { ENDPOINTS } from '../src/config/config';

const TEST_URL = ENDPOINTS.SPiD.DEV;

describe('RESTClient', () => {
    test('has the REST methods for get and go', () => {
        const restClient = new RESTClient({
            defaultParams: {},
            serverUrl: TEST_URL,
            fetch: () => {},
        });

        expect(typeof restClient.get).toBe('function');
        expect(typeof restClient.go).toBe('function');
    });

    test('fetch default works', () => {
        window.fetch = fetch;
        jest.resetModules();
        const restClient = new RESTClient({
            defaultParams: {},
            serverUrl: TEST_URL,
        });
        // @ts-expect-error
        expect(restClient.fetch).not.toThrow(/Illegal invocation/);
    });

    test('Supplied log function is called', async () => {
        const spy = jest.fn();
        const restClient = new RESTClient({
            defaultParams: {},
            serverUrl: TEST_URL,
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
        const restClient = new RESTClient({ defaultParams: {}, serverUrl: TEST_URL, fetch: spy });
        await restClient.go({ method: 'get', pathname: '/' });
        await restClient.go({ method: 'get', pathname: '/', headers: { foo: 'bar' } });
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy.mock.calls[0][1].headers).toEqual({});
        expect(spy.mock.calls[1][1].headers).toEqual({ foo: 'bar' });
    });

    test('Should return SDKError on failed requests', async () => {
        const EXPECTED_STATUS = 400;
        const EXPECTED_TEXT = `API call failed with code ${EXPECTED_STATUS}`;
        const EXPECTED_NAME = 'SDKError';
        const EXPECTED_MSG = `Failed to 'get' 'https://identity-pre.schibsted.com/': '${EXPECTED_TEXT}'`;

        const spy = jest.fn().mockImplementation(async () => ({ ok: false, status: EXPECTED_STATUS, statusText: EXPECTED_TEXT }));
        const restClient = new RESTClient({ defaultParams: {}, serverUrl: TEST_URL, fetch: spy });

        const res = restClient.go({ method: 'get', pathname: '/' });

        await expect(res).rejects.toMatchObject({
            name: EXPECTED_NAME,
            message: EXPECTED_MSG,
            code: EXPECTED_STATUS,
        });
    });

    test('Should return SDKError when fetch throws', async () => {
        const spy = jest.fn();
        spy.mockImplementation(throwingFn);
        const restClient = new RESTClient({ defaultParams: {}, serverUrl: TEST_URL, fetch: spy });

        await expect(restClient.go({ method: 'get', pathname: '/' })).rejects.toMatchObject({
            name: 'SDKError',
            message: `Failed to 'get' 'https://identity-pre.schibsted.com/': '${throwingFnMsg}'`,
        });
    });

    test('makeUrl should work', async () => {
        const spy = jest.fn();
        spy.mockImplementation(throwingFn);
        const restClient = new RESTClient({ serverUrl: TEST_URL, defaultParams: { foo: 'bar' } });
        const u = restClient.makeUrl();
        expect(u).toBe(TEST_URL + '/?foo=bar');
        const u2 = restClient.makeUrl('', {}, false);
        expect(u2).toBe(TEST_URL + '/');
    });
});
