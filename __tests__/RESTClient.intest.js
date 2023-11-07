/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

/**
 * @jest-environment node
 */

import fetch from 'node-fetch';
import RESTClient from '../src/RESTClient.js';
import config from '../src/config.js';

describe('RESTClient', () => {

    test('can make a call to Schibsted account DEV /api/2/version', () => {
        const restClient = new RESTClient({
            serverUrl: 'PRE',
            envDic: config.ENDPOINTS.SPiD,
            fetch
        });

        return restClient.get('api/2/version').then(version => {
            expect(typeof version).toBe('object');
            expect(version).toHaveProperty('name');
            expect(version).toHaveProperty('version');
        });
    });

});
