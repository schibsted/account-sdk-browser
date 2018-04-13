/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { ENDPOINTS, JSONP } from '../src/config';
import JSONPClient from '../src/JSONPClient';

describe('JSONPClient', () => {
    test('Should have a default timeout', () => {
        const jsonpClient = new JSONPClient({
            serverUrl: 'DEV',
            envDic: ENDPOINTS.SPiD,
            fetch: function(){},
        });
        expect(jsonpClient.timeout).toBe(JSONP.TIMEOUT);
    });

    test('Should be able to override timeout', () => {
        const jsonpClient = new JSONPClient({
            serverUrl: 'DEV',
            envDic: ENDPOINTS.SPiD,
            fetch: function(){},
            timeout: 3456
        });
        expect(jsonpClient.timeout).toBe(3456);
    });

    test('Should be able to call go without options', async () => {
        const jsonpClient = new JSONPClient({
            serverUrl: 'DEV',
            envDic: ENDPOINTS.SPiD,
            fetch: async () => ({ ok: true, json: async () => {} }),
        });
        await expect(jsonpClient.go()).resolves.toBeUndefined();
    });
});
