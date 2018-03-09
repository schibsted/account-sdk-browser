/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

describe('Identity', () => {

    beforeAll(() => {
        global.URL = require('whatwg-url').URL;
    });

    describe('constructor()', () => {
        const Identity = require('../identity');

        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Identity()).toThrowError(/Cannot read property 'clientId' of undefined/);
        });

        test('throws if window is missing or has wrong type', () => {
            expect(() => new Identity({ window: 123, clientId: 'xxxx', redirectUri: true }))
                .toThrowError(/The reference to window is missing/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: true }))
                .not.toThrowError(/The reference to window is missing/);
        });

        test('throws if the redirectUri is missing or has wrong type', () => {
            expect(() => new Identity({ window: {}, clientId: 'xxxx' }))
                .not.toThrowError(/redirectUri parameter is invalid/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: true }))
                .toThrowError(/redirectUri parameter is invalid/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: 'http://foo.com' }))
                .not.toThrowError(/redirectUri parameter is invalid/);
        });

        test('throws if the client_id setting is missing or has wrong type', () => {
            expect(() => new Identity({ window: {} }))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Identity({ window: {}, clientId: true }))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx' }))
                .not.toThrowError(/clientId parameter is required/);
        });
    });

    describe('loginUrl()', () => {
        const Identity = require('../identity');
        const testutils = require('../utils/testutils');

        test('returns the expected endpoint for old flows', () => {
            const identity = new Identity({
                env: 'PRO_NO',
                clientId: 'foo',
                redirectUri: 'http://example.com',
                window: {},
            });
            testutils.compareUrls(identity.loginUrl(
                'dummy-state',
                'otp-email',
                undefined,
                undefined,
                false
            ), 'https://payment.schibsted.no/flow/login?client_id=foo&state=dummy-state&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Fexample.com');
        });

        test('returns the expected endpoint for new flows', () => {
            const identity = new Identity({
                env: 'PRO',
                clientId: 'foo',
                redirectUri: 'http://example.com',
                window: {},
            });
            testutils.compareUrls(identity.loginUrl(
                'dummy-state',
                undefined,
                undefined,
                undefined,
                true
            ), 'https://login.schibsted.com/oauth/authorize?new-flow=true&redirect_uri=http%3A%2F%2Fexample.com&client_id=foo&state=dummy-state&response_type=code&scope=openid');
        });

    });

    describe('hasSession', () => {
        let Identity;
        let mockSpy = {};

        const mockHasSessionLoginRequired = {
            error: {
                code: 401,
                type: 'LoginException',
                description: 'Autologin required'
            },
            response: {
                result: false,
                serverTime: 1520599943,
                expiresIn: null,
                baseDomain: 'localhost',
                visitor: {
                    uid: 'Xytpn4Xoi8rb9Xso27ks',
                    user_id: '36424'
                }
            }
        };
        const mockSPiDOk = {
            result: true,
            serverTime: 1520610964,
            expiresIn: 2592000,
            visitor: {
                uid: '1234',
                user_id: '12345'
            },
            id: '59e9eaaaacb3ad0aaaedaaaa',
            userId: 12345,
            uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
            displayName: 'bruce_wayne',
            givenName: 'Bruce',
            familyName: 'Wayne',
            gender: 'withheld',
            photo: 'https://secure.gravatar.com/avatar/1234?s=200',
            tracking: true,
            userStatus: 'connected',
            clientAgreementAccepted: true,
            defaultAgreementAccepted: true,
            sp_id: 'some-jwt-token',
            sig: 'some-encrypted-value'
        };

        beforeAll(() => {
            jest.resetModules();
            jest.mock('fetch-jsonp', () => {
                return async (url) => {
                    if (url.includes('rpc/hasSession.js')) { // hasSession
                        mockSpy.hasSessionCalled = true;
                        return { ok: true, json: async () => mockHasSessionLoginRequired };
                    }
                    if (url.includes('ajax/hasSession.js')) { // SPiD
                        mockSpy.spidCalled = true;
                        return { ok: true, json: async () => mockSPiDOk };
                    }
                    return;
                };
            });
            Identity = require('../src/identity');
        });

        test('Calls SPiD on failure', async () => {
            const identity = new Identity({
                clientId: 'foo',
                redirectUri: 'http://example.com',
            });
            const foo = await identity.hasSession();
            expect(foo).toMatchObject({ result: true });
            expect(mockSpy.hasSessionCalled).toBe(true);
            expect(mockSpy.spidCalled).toBe(true);
        });
    });
});
