/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import Identity from '../identity';
import { compareUrls } from './utils';
import { URL } from 'url';
import { URL as u } from 'whatwg-url';

describe('Identity', () => {

    beforeAll(() => {
        global.URL = u;
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
        test('Should close previous popup if it exists (and is open)', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window });
            const oldPopup = identity.popup = { close: jest.fn() };
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
            expect(oldPopup.close).toHaveBeenCalledTimes(1);
        });
        test('Should not try to close existing popup if already close', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window });
            const oldPopup = identity.popup = { close: jest.fn(), closed: true };
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
            expect(oldPopup.close).toHaveBeenCalledTimes(0);
        });
    });

    describe('logout()', () => {
        test('Should be able to log out from SPiD', async () => {
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window: {} });
            const fakeFetch = jest.fn();
            fakeFetch.mockImplementationOnce(async () => ({ ok: true, json: async () => ({})}));
            identity._spid.fetch = fakeFetch;
            identity._bffService.fetch = fakeFetch;
            await expect(identity.logout()).resolves.toBeUndefined();
            expect(fakeFetch).toHaveBeenCalledTimes(2);
            expect(fakeFetch.mock.calls[0][0]).toMatch(/ajax\/logout.js/);
            expect(fakeFetch.mock.calls[1][0]).toMatch(/authn\/api\/identity\/logout/);
        });
        test('Should be able to log out from BFF', async () => {
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window: {} });
            const fakeFetch = jest.fn();
            fakeFetch.mockImplementationOnce(async () => ({ ok: true, json: async () => ({})}));
            identity._spid.fetch = fakeFetch;
            identity._bffService.fetch = fakeFetch;
            await expect(identity.logout()).resolves.toBeUndefined();
            expect(fakeFetch).toHaveBeenCalledTimes(2);
            expect(fakeFetch.mock.calls[0][0]).toMatch(/ajax\/logout.js/);
            expect(fakeFetch.mock.calls[1][0]).toMatch(/authn\/api\/identity\/logout/);
        });
        test('Should handle error', async () => {
            const identity = new Identity({ clientId: 'foo', redirectUri: 'http://foo.com', window: {} });
            const fakeFetch = jest.fn();
            fakeFetch.mockImplementationOnce(async () => ({ ok: false }));
            identity._spid.fetch = fakeFetch;
            identity._bffService.fetch = fakeFetch;
            await expect(identity.logout()).rejects.toMatchObject({
                message: 'Could not log out from any endpoint'
            });
            expect(fakeFetch).toHaveBeenCalledTimes(2);
            expect(fakeFetch.mock.calls[0][0]).toMatch(/ajax\/logout.js/);
            expect(fakeFetch.mock.calls[1][0]).toMatch(/authn\/api\/identity\/logout/);
        });
    });

    describe('loginUrl()', () => {
        test('returns the expected endpoint for old flows', () => {
            const identity = new Identity({
                env: 'PRO_NO',
                clientId: 'foo',
                redirectUri: 'http://example.com',
                window: {},
            });
            compareUrls(identity.loginUrl(
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
            compareUrls(identity.loginUrl(
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
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
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

        test('throws if autologin is not a bool', async () => {
            await expect(identity.hasSession(123)).rejects.toMatchObject({
                message: `Parameter 'autologin' must be boolean, was: "Number:123"`
            });
            await expect(identity.hasSession(new Date(0))).rejects.toMatchObject({
                message: `Parameter 'autologin' must be boolean, was: "Date:0"`
            });
            await expect(identity.hasSession('')).rejects.toMatchObject({
                message: `Parameter 'autologin' must be boolean, was: "String:"`
            });
            await expect(identity.hasSession(null)).rejects.toMatchObject({
                message: `Parameter 'autologin' must be boolean, was: "object:null"`
            });
            await expect(identity.hasSession({})).rejects.toMatchObject({
                message: `Parameter 'autologin' must be boolean, was: "Object:[object Object]"`
            });
            expect(fetch).toHaveProperty('mock.calls.length', 0);
        });

        test('should be able to set varnish cookie', async () => {
            await identity.hasSession();
            expect(document.cookie).toBe('');
            identity.enableVarnishCookie();
            await identity.hasSession();
            expect(document.cookie).toBe('SP_ID=some-jwt-token');
        });

        test('should not set varnish cookie if session has no `expiresIn`', async () => {
            identity.enableVarnishCookie();
            const func = async () => ({ ok: true, json: async() => ({ result: true, sp_id: 'abc' }) });
            fetch.mockImplementationOnce(func);
            await identity.hasSession();
            expect(document.cookie).toBe('');
        });

        describe('`baseDomain`', () => {
            test('should respect `baseDomain` from session', async () => {
                identity.enableVarnishCookie();
                const session1 = { result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'foo.com' };
                fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session1 }));
                await identity.hasSession();
                expect(document.cookie).toBe('');
            });

            test('should respect `baseDomain` from session', async () => {
                identity.enableVarnishCookie();
                const session2 = { result: true, sp_id: 'abc', expiresIn: 3600 };
                fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session2 }));
                await identity.hasSession();
                expect(document.cookie).toBe('SP_ID=abc');
            });
        });

        test('should never cache if caching is off', async () => {
            identity._enableSessionCaching = false;
            await identity.hasSession();
            await identity.hasSession();

            // two calls per hasSession() invocation, since our mock is set up this way
            expect(fetch.mock.calls.length).toBe(4);
        });

        test('should use cached value on subsequent calls by default', async () => {
            await identity.hasSession();
            await identity.hasSession();

            // two calls per hasSession() invocation, since our mock is set up this way
            expect(fetch.mock.calls.length).toBe(2);
        });

        test('should emit event both when "real" and "cached" values are used', async () => {
            const spy = jest.fn();
            identity.on('login', spy);
            await identity.hasSession();
            await identity.hasSession();
            expect(spy).toHaveBeenCalledTimes(2);
        });
    });

    describe('isLoggedIn', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test('should work when we get a `result` from hasSession', async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ result: true }) }));
            const v = await identity.isLoggedIn();
            expect(v).toBe(true);
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ result: false }) }));
            const v2 = await identity.isLoggedIn();
            expect(v2).toBe(true);
        });

        test(`should fail when we don't get a 'result' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });
    });

    describe('isConnected', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test('should work when we get a `result` from hasSession', async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ result: true }) }));
            const v = await identity.isConnected();
            expect(v).toBe(true);
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ result: false }) }));
            const v2 = await identity.isConnected();
            expect(v2).toBe(false);
        });

        test(`should fail when we don't get a 'result' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });
    });

    describe('getUser', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test('should work when we get a `result` from hasSession', async () => {
            const session = await identity.hasSession();
            const user = await identity.getUser();
            expect(user).toMatchObject(session);
            expect(user).not.toBe(session); // should be cloned (not sure why, though..)
        });

        test(`should fail when we don't get a 'result' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getUser()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getUser()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getUserId', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test(`should fail when we don't get a 'userId' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'userId' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ userId: '123' }) }));
            await expect(identity.getUserId()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getUserUuid', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test(`should fail when we don't get a 'uuid' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'uuid' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ uuid: '123' }) }));
            await expect(identity.getUserUuid()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getSpId', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com' });
        });

        test(`should fail when we don't get a 'spId' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getSpId()).resolves.toBeNull();
        });

        test(`should work when we get a 'spId' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({ sp_id: '123' }) }));
            await expect(identity.getSpId()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getSpId()).resolves.toBeNull();
        });
    });
});
