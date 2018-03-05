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
});
