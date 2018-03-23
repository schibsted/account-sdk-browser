/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

const Identity = require('../src/identity');
const { URL } = require('url');

describe('Identity', () => {

    beforeAll(() => {
        global.URL = require('whatwg-url').URL;
    });

    describe('constructor()', () => {
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

    describe('login()', () => {
        test('Should work with only "state" param', () => {
            const window = { location: {} };
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window });
            identity.login({ state: 'foo' });
            expect(window).toHaveProperty('location.href',
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&new-flow=true&scope=openid&state=foo&login_hint=');
        });
        test('Should open popup if "preferPopup" is true', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window });
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
        });
        test('Should fall back to redirecting if popup fails', () => {
            const window = { location: {}, screen: {}, open: () => {} };
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window });
            identity.login({ state: 'foo', preferPopup: true });
            expect(window).toHaveProperty('location.href',
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&new-flow=true&scope=openid&state=foo&login_hint=');
        });
    });

    describe('loginUrl()', () => {
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
                false,
                'dev@spid.no'
            ), 'https://payment.schibsted.no/flow/login?client_id=foo&state=dummy-state&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Fexample.com&email=dev@spid.no');
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
                true,
                'dev@spid.no'
            ), 'https://login.schibsted.com/oauth/authorize?new-flow=true&redirect_uri=http%3A%2F%2Fexample.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&login_hint=dev@spid.no');
        });

    });

    describe('hasSession', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear()
            identity = new Identity({
                clientId: 'foo',
                redirectUri: 'http://example.com',
            });
        });

        test('Calls hasSession with autologin=1 (not "true")', async () => {
            const session = await identity.hasSession();
            expect(session).toMatchObject({ result: true });
            expect(fetch).toHaveProperty('mock.calls.length', 2);
            const { searchParams } = new URL(fetch.mock.calls[0][0]);
            expect(searchParams.get('autologin')).toBe('1');
        });

        test('Calls SPiD on failure', async () => {
            const session = await identity.hasSession();
            expect(session).toMatchObject({ result: true });
            expect(fetch).toHaveProperty('mock.calls.length', 2);
            expect(fetch.mock.calls[0][0]).toContain('session.identity-pre.schibsted.com/rpc');
            expect(fetch.mock.calls[1][0]).toContain('identity-pre.schibsted.com/ajax/');
        });

        test('Does not auto login if autologin=false', async () => {
            await expect(identity.hasSession(false)).rejects.toMatchObject({ type: 'UserException' });
            expect(fetch).toHaveProperty('mock.calls.length', 1);
        });
    });
});
