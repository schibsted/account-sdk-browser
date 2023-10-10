/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

jest.mock('../src/RESTClient.js');

import Monetization from '../monetization.js';

describe('Monetization', () => {

    beforeEach(() => {
        window.sessionStorage.clear();
    });

    describe('constructor()', () => {
        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Monetization())
                .toThrowError(/Cannot read properties of undefined \(reading 'clientId'\)/);
        });

        test('throws if the clientId setting is missing or has wrong type', () => {
            expect(() => new Monetization({}))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Monetization({ clientId: true }))
                .toThrowError(/clientId parameter is required/);
        });

        test('should work if all params are ok', () => {
            const mon = new Monetization({ clientId: 'a' });
            expect(mon).not.toBeNull();
            expect(mon).toBeDefined();
        });

        test('should accept sessionDomain param', () => {
            const mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            expect(mon._sessionService).toBeDefined();
        });
    });

    describe('hasAccess()', () => {
        let mon;

        beforeEach(() => {
            mon = new Monetization({clientId: 'a', sessionDomain: 'https://session.example'});
        });

        test('should get response for existing product', async () => {
            const response = await mon.hasAccess(['existing'], 12345);
            expect(response).not.toBeNull();
            expect(response).toBeDefined();
        });

        test('should get null for non-existing product', async () => {
            const response = await mon.hasAccess(['non_existing'], 12345);
            expect(response).toBeNull();
        });

        test('should cache response with requested pids sorted', async () => {
            await mon.hasAccess(['existing', 'non_existing'], 12345);
            await mon.hasAccess(['non_existing', 'existing'], 12345);

            expect(mon._sessionService.go.mock.calls.length).toBe(1);
        });

        test('should throw error for missing userId', async () => {
            await expect(mon.hasAccess(['existing', 'non_existing']))
                .rejects
                .toMatchObject({
                    name: 'SDKError',
                    message: `'userId' must be specified`,
                });
        });

        test('should throw error if not using session-service', async () => {
            const mon = new Monetization({clientId: 'a'});
            await expect(mon.hasAccess(['existing'], 12345))
                .rejects
                .toMatchObject({
                    name: 'SDKError',
                    message: `hasAccess can only be called if 'sessionDomain' is configured`,
                });
        });

        test('should throw error if pids is not array', async () => {
            await expect(mon.hasAccess(12345, 12345))
                .rejects
                .toMatchObject({
                    name: 'SDKError',
                    message: `'productIds' must be an array`,
                });
        });

        test('should clear cache when explicitly called', async () => {
            const productIds = ['existing', 'non_existing'];
            await mon.hasAccess(productIds, 12345);

            // clear cache with same keys, but different order
            // (the product ids should be sorted before being used as cache key)
            await mon.clearCachedAccessResult(productIds.reverse(), 12345);

            // the cached data should be removed so the second call should result in a new request
            await mon.hasAccess(productIds, 12345);

            expect(mon._sessionService.go.mock.calls.length).toBe(2);
        });
    });

    describe('productsUrl', () => {
        test('should complain with no redirect_uri', () => {
            const mon = new Monetization({ clientId: 'a' });
            expect(() => mon.subscriptionsUrl()).toThrowError(/redirectUri is invalid/);
        });

        test('should work if redirect_uri is supplied as function argument', () => {
            const mon = new Monetization({ clientId: 'a' });
            const url = mon.subscriptionsUrl('http://foo.bar');
            expect(url).toBe('https://identity-pre.schibsted.com/account/subscriptions?client_id=a&redirect_uri=http%3A%2F%2Ffoo.bar');
        });

        test('should work if redirect_uri is supplied in Monetization ctor', () => {
            const mon = new Monetization({ clientId: 'a', redirectUri: 'http://foo.bar' });
            const url = mon.subscriptionsUrl();
            expect(url).toBe('https://identity-pre.schibsted.com/account/subscriptions?client_id=a&redirect_uri=http%3A%2F%2Ffoo.bar');
        });
    });

    describe('productsUrl', () => {
        test('should complain with no redirect_uri', () => {
            const mon = new Monetization({ clientId: 'a' });
            expect(() => mon.productsUrl()).toThrowError(/redirectUri is invalid/);
        });

        test('should work if redirect_uri is supplied as function argument', () => {
            const mon = new Monetization({ clientId: 'a' });
            const url = mon.productsUrl('http://foo.bar');
            expect(url).toBe('https://identity-pre.schibsted.com/account/products?client_id=a&redirect_uri=http%3A%2F%2Ffoo.bar');
        });

        test('should work if redirect_uri is supplied in Monetization ctor', () => {
            const mon = new Monetization({ clientId: 'a', redirectUri: 'http://foo.bar' });
            const url = mon.productsUrl();
            expect(url).toBe('https://identity-pre.schibsted.com/account/products?client_id=a&redirect_uri=http%3A%2F%2Ffoo.bar');
        });
    });
});
