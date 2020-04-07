/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

jest.mock('../src/RESTClient');

import Monetization from '../monetization';

describe('Monetization', () => {

    describe('constructor()', () => {
        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Monetization())
                .toThrowError(/Cannot read property 'clientId' of undefined/);
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

    describe('hasProduct()', () => {
        let mon;

        beforeEach(() => {
            mon = new Monetization({ clientId: 'a' });
            mon._spid.go.mockClear();
        });

        test('should get response for existing product (no qualifier)', async () => {
            const response = await mon.hasProduct('existing');
            expect(response).not.toBeNull();
            expect(response).toBeDefined();
        });

        test('should get null for non-existing product', async () => {
            const response = await mon.hasProduct('non_existing');
            expect(response).toBeNull();
        });

        test('should not get cached response for calls with different sp_id', async () => {
            const response1 = await mon.hasProduct('existing_for_john', 'john');
            const response2 = await mon.hasProduct('existing_for_john', 'mary');
            expect(response1).not.toBeNull();
            expect(response2).toBeNull();
        });

        test('should get response for existing product for john', async () => {
            const response = await mon.hasProduct('existing_for_john', 'john');
            expect(response).not.toBeNull();
            expect(response).toBeDefined();
        });

        test('should get null for existing product for someone-other-than-john', async () => {
            const response = await mon.hasProduct('existing_for_john', 'mary');
            expect(response).toBeNull();
        });

        test('should get null for existing product (that needs sp_id) if no sp_id is given', async () => {
            const response = await mon.hasProduct('existing_for_john');
            expect(response).toBeNull();
        });

        test('should use cache if called twice with same args', async () => {
            await mon.hasProduct('existing');
            await mon.hasProduct('non_existing_1');
            await mon.hasProduct('non_existing_2');
            await mon.hasProduct('existing');

            // we call it 4 times, but 3 unique products
            expect(mon._spid.go.mock.calls.length).toBe(3);
        });

        test(`should also use cache when products don't exist`, async () => {
            await mon.hasProduct('non_existing_1');
            await mon.hasProduct('non_existing_2');
            await mon.hasProduct('non_existing_2');
            await mon.hasProduct('non_existing_2');

            // we call it 4 times, but 2 unique products — but none of these products exist
            expect(mon._spid.go.mock.calls.length).toBe(2);
        });

        test('should cache response for <default> time even if expiresIn missing', async () => {
            await mon.hasProduct('existing_no_expires');
            await mon.hasProduct('existing_no_expires');

            expect(mon._spid.go.mock.calls.length).toBe(1);
        });

        test('should use session service if defined', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            await mon.hasProduct('existing');
            expect(mon._sessionService.go.mock.calls.length).toBe(1);
            expect(mon._spid.go.mock.calls.length).toBe(0);
        });

        test('should fall back from session-service to spid if no session cookie', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            await mon.hasProduct('no-session-cookie');
            expect(mon._sessionService.go.mock.calls.length).toBe(1);
            expect(mon._spid.go.mock.calls.length).toBe(1);
        });

        test('should not fall back from session-service to spid if no session', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            try {
                await mon.hasProduct('no-session');
                throw new Error('Should not get here');
            } catch (e) {
                expect(e.message).toBe('No session');
                expect(mon._sessionService.go.mock.calls.length).toBe(1);
                expect(mon._spid.go.mock.calls.length).toBe(0);
            }
        });
    });

    describe('hasSubscription()', () => {
        let mon;

        beforeEach(() => {
            mon = new Monetization({ clientId: 'a' });
            mon._spid.go.mockClear();
        });

        test('should get response for existing product', async () => {
            const response = await mon.hasSubscription('existing');
            expect(response).not.toBeNull();
            expect(response).toBeDefined();
        });

        test('should get null for non-existing product', async () => {
            const response = await mon.hasSubscription('non_existing');
            expect(response).toBeNull();
        });

        test('should not get cached response for calls with different sp_id', async () => {
            const response1 = await mon.hasSubscription('existing_for_john', 'john');
            const response2 = await mon.hasSubscription('existing_for_john', 'mary');
            expect(response1).not.toBeNull();
            expect(response2).toBeNull();
        });

        test('should get response for existing product for john', async () => {
            const response = await mon.hasSubscription('existing_for_john', 'john');
            expect(response).not.toBeNull();
            expect(response).toBeDefined();
        });

        test('should get null for existing product for someone-other-than-john', async () => {
            const response = await mon.hasSubscription('existing_for_john', 'mary');
            expect(response).toBeNull();
        });

        test('should get null for existing product (that needs sp_id) if no sp_id is given', async () => {
            const response = await mon.hasSubscription('existing_for_john');
            expect(response).toBeNull();
        });

        test('should use cache if called twice with same args', async () => {
            await mon.hasSubscription('existing');
            await mon.hasSubscription('non_existing_1');
            await mon.hasSubscription('non_existing_2');
            await mon.hasSubscription('existing');

            // we call it 4 times, but 3 unique products
            expect(mon._spid.go.mock.calls.length).toBe(3);
        });

        test(`should also use cache when products don't exist`, async () => {
            await mon.hasSubscription('non_existing_1');
            await mon.hasSubscription('non_existing_2');
            await mon.hasSubscription('non_existing_2');
            await mon.hasSubscription('non_existing_2');

            // we call it 4 times, but 2 unique products — but none of these products exist
            expect(mon._spid.go.mock.calls.length).toBe(2);
        });

        test('should cache response for <default> time even if expiresIn missing', async () => {
            await mon.hasSubscription('existing_no_expires');
            await mon.hasSubscription('existing_no_expires');

            expect(mon._spid.go.mock.calls.length).toBe(1);
        });

        test('should use session service if defined', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            await mon.hasSubscription('existing');
            expect(mon._sessionService.go.mock.calls.length).toBe(1);
            expect(mon._spid.go.mock.calls.length).toBe(0);
        });

        test('should fall back from session-service to spid if no session cookie', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            await mon.hasSubscription('no-session-cookie');
            expect(mon._sessionService.go.mock.calls.length).toBe(1);
            expect(mon._spid.go.mock.calls.length).toBe(1);
        });

        test('should not fall back from session-service to spid if no session', async () => {
            mon = new Monetization({ clientId: 'a', sessionDomain: 'https://session.example' });
            try {
                await mon.hasSubscription('no-session');
                throw new Error('Should not get here');
            } catch (e) {
                expect(e.message).toBe('No session');
                expect(mon._sessionService.go.mock.calls.length).toBe(1);
                expect(mon._spid.go.mock.calls.length).toBe(0);
            }
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
