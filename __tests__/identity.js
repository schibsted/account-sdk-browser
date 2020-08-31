/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from "../src/SDKError";

import Identity from '../identity';
import RESTClient from '../src/RESTClient';
import { compareUrls, Fixtures } from './utils';
import { URL } from 'url';
import { URL as u } from 'whatwg-url';

describe('Identity', () => {
    const defaultOptions = {
        clientId: 'foo',
        redirectUri: 'http://foo.com',
        sessionDomain: 'http://id.foo.com',
    };

    beforeAll(() => {
        global.URL = u;
    });

    describe('constructor()', () => {
        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Identity()).toThrowError(/Cannot read property 'clientId' of undefined/);
        });

        test('throws if window is missing or has wrong type', () => {
            expect(() => new Identity({ window: 123, clientId: 'xxxx', redirectUri: true, sessionDomain: 'http://id.foo.com' }))
                .toThrowError(/The reference to window is missing/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: true , sessionDomain: 'http://id.foo.com'}))
                .not.toThrowError(/The reference to window is missing/);
        });

        test('throws if the redirectUri is missing or has wrong type', () => {
            expect(() => new Identity({ window: {}, clientId: 'xxxx', sessionDomain: 'http://id.foo.com' }))
                .not.toThrowError(/redirectUri parameter is invalid/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: true, sessionDomain: 'http://id.foo.com' }))
                .toThrowError(/redirectUri parameter is invalid/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', redirectUri: 'http://foo.com', sessionDomain: 'http://id.foo.com' }))
                .not.toThrowError(/redirectUri parameter is invalid/);
        });

        test('throws if the client_id setting is missing or has wrong type', () => {
            expect(() => new Identity({ window: {} }))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Identity({ window: {}, clientId: true , sessionDomain: 'http://id.foo.com'}))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', sessionDomain: 'http://id.foo.com'}))
                .not.toThrowError(/clientId parameter is required/);
        });

        test('throws if the sessionDomain is missing or has wrong type', () => {
            expect(() => new Identity({ window: {}, clientId: 'xxxx' }))
                .toThrowError(/sessionDomain parameter is not a valid URL/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', sessionDomain: 'not-a-url' }))
                .toThrowError(/sessionDomain parameter is not a valid URL/);
            expect(() => new Identity({ window: {}, clientId: 'xxxx', sessionDomain: 'http://id.foo.com' }))
                .not.toThrowError(/sessionDomain parameter is not a valid URL/);
        });
    });

    describe('login()', () => {
        test('Should work with only "state" param', () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.login({ state: 'foo' });
            compareUrls(
                window.location.href,
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&scope=openid&state=foo&prompt=select_account'
            );
        });
        test('Should work with only "state" param for site specific logout', () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.login({ state: 'foo' });
            compareUrls(
                window.location.href,
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&scope=openid&state=foo&prompt=select_account'
            );
        });
        test('Should open popup if "preferPopup" is true', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
        });
        test('Should fall back to redirecting if popup fails', () => {
            const window = { location: {}, screen: {}, open: () => {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.login({ state: 'foo', preferPopup: true });
            compareUrls(
                window.location.href,
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&scope=openid&state=foo&prompt=select_account'
            );
        });
        test('Should close previous popup if it exists (and is open)', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            const oldPopup = identity.popup = { close: jest.fn() };
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
            expect(oldPopup.close).toHaveBeenCalledTimes(1);
        });
        test('Should not try to close existing popup if already close', () => {
            const window = { screen: {}, open: () => ({ fakePopup: 'yup' }) };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            const oldPopup = identity.popup = { close: jest.fn(), closed: true };
            const popup = identity.login({ state: 'foo', preferPopup: true });
            expect(popup).toHaveProperty('fakePopup', 'yup');
            expect(oldPopup.close).toHaveBeenCalledTimes(0);
        });
    });

    describe('logout()', () => {
        test('Should be able to log out from Schibsted account', async () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.logout();

            const clientSdrn = `sdrn%3Aschibsted.com%3Aclient%3A${defaultOptions.clientId}`;
            expect(window.location.href).toBe(`${defaultOptions.sessionDomain}/logout?client_sdrn=${clientSdrn}&redirect_uri=http%3A%2F%2Ffoo.com`);
        });
        test('Should redirect to session-service for site-specific logout if configured', async () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.logout();

            expect(window.location.href).toBe('http://id.foo.com/logout?client_sdrn=sdrn%3Aschibsted.com%3Aclient%3Afoo&redirect_uri=http%3A%2F%2Ffoo.com');
        });
        test('Should clear cache when logging out', async () => {
            const webStorageMock = () => {
                const mock = {
                    store: {},
                    setItem: (k, v) => mock.store[k] = v,
                    getItem: (k) => mock.store[k],
                    removeItem: (k) => delete mock.store[k],
                };
                return mock;
            };
            const window = { sessionStorage: webStorageMock(), location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            const fakeFetch = jest.fn();
            const sessionResponse = { ok: true, json: async () => ({ result: true })};
            fakeFetch.mockImplementationOnce(async () => sessionResponse);
            identity._sessionService.fetch = fakeFetch;
            await identity.hasSession();
            expect(fakeFetch).toHaveBeenCalledTimes(1);

            const fakeFetch2 = jest.fn();
            fakeFetch2.mockImplementationOnce(async () => ({ ok: true, json: async () => ({})}));
            identity._sessionService.fetch = fakeFetch2;
            identity._bffService.fetch = fakeFetch2;
            identity.logout();

            fakeFetch.mockImplementationOnce(async () => sessionResponse);
            identity._sessionService.fetch = fakeFetch;
            await identity.hasSession();
            expect(fakeFetch).toHaveBeenCalledTimes(2); // now it should have been called again, so 2
        });
    });

    describe('loginUrl() with options object', () => {
        test('returns the expected endpoint for new flows', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                loginHint: 'dev@spid.no',
                tag: 'sample-tag',
                teaser: 'sample-teaser-slug',
                maxAge: 0,
                locale: 'en_US',
                oneStepLogin: true
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&login_hint=dev@spid.no&max_age=0&tag=sample-tag&teaser=sample-teaser-slug&locale=en_US&one_step_login=true&prompt=select_account');
        });

        test('returns the expected endpoint for new flows with default params', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl({
                state: 'dummy-state',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&prompt=select_account');
        });

        test('should throw error on wrong acrValues', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));

            expect(() => {
                identity.loginUrl({state: 'dummy-state', acrValues: 'myOwnAcrValue'})
            }).toThrowError(new SDKError('The acrValues parameter is not acceptable: myOwnAcrValue'));

            expect(() => {
                identity.loginUrl({state: 'dummy-state', acrValues: 'sms otp password youShallNoTPass'})
            }).toThrowError(new SDKError('The acrValues parameter is not acceptable: sms otp password youShallNoTPass'));
        });

        test('should accept variations of sms, otp, password acrValues. Url shouldn\'t contain prompt=select_account', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms otp',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms+otp');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms otp password',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms+otp+password');
        });
    });

    describe('loginUrl() with arguments', () => {
        test('returns the expected endpoint for new flows', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl(
                'dummy-state',
                undefined,
                undefined,
                undefined,
                'dev@spid.no',
                'sample-tag',
                'sample-teaser-slug',
                0
            ), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&login_hint=dev@spid.no&max_age=0&tag=sample-tag&teaser=sample-teaser-slug&prompt=select_account');
        });

        test('returns the expected endpoint for new flows with default params', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl(
                'dummy-state',
                undefined,
                undefined,
                undefined,
            ), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&prompt=select_account');
        });
    });

    describe('hasSession', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => {} })));
            identity._clearVarnishCookie();
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

        test('should set varnish cookie also when reading from cache', async () => {
            identity.enableVarnishCookie();
            const session = { result: true, sp_id: 'should_not_expire', expiresIn: 2 };
            fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session }));
            await identity.hasSession();
            expect(document.cookie).toBe('SP_ID=should_not_expire');

            // 1. Here we first wait a little bit (*less* than the 2 second cache expiry)
            await new Promise((resolve) => setTimeout(resolve, 1800));

            // 2. Then we fetch session info — this should fetch from the cache and set the varnish
            //    cookie again. In other words, it should exist in document.cookie for at least 2s
            await identity.hasSession();

            // 3. Finally, we wait another second. In total, we have waited slightly more than 3
            //    seconds required to expire the *initial* varnish cookie, but as long as the
            //    retrieval from cache also sets the cookie, we should be good
            await new Promise((resolve) => setTimeout(resolve, 1000));
            expect(document.cookie).toBe('SP_ID=should_not_expire');
        });

        test('should work to set varnish cache expiration', async () => {
            identity.enableVarnishCookie(3);
            const session = { result: true, sp_id: 'should_remain_after_one_sec', expiresIn: 1 };
            fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session }));
            await identity.hasSession();
            await new Promise((resolve) => setTimeout(resolve, 1010));
            expect(document.cookie).toBe('SP_ID=should_remain_after_one_sec');
        });

        test('should work to clear varnish cookie', async () => {
            identity.enableVarnishCookie(3);
            const session = { result: true, sp_id: 'should_be_cleared', expiresIn: 1 };
            fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session }));
            await identity.hasSession();
            expect(document.cookie).toBe('SP_ID=should_be_cleared');
            identity._maybeClearVarnishCookie();
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

        describe(`enableVarnishCookie domain`, () => {
            test('works', async () => {
                identity.enableVarnishCookie({ domain: 'spid.no' });
                expect(identity.varnishCookieDomain).toBe('spid.no');
                const session1 = { result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'tv.spid.no' };
                fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => session1 }));
                await identity.hasSession();
                expect(document.cookie).toBe('SP_ID=abc');
            });
        });

        test('should only go to session-service for site specific logout', async () => {
            identity = new Identity(defaultOptions);
            const fetch = jest.fn((() => ({ ok: false, status: 400, statusText: 'No cookie present' })));
            identity._sessionService.fetch = fetch;
            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });
            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toMatch(/^http:\/\/id.foo.com\/session/);
        });

        test('should fail `hasSession` if session cookie is present but no session is found and site does not have specific logout', async () => {
            const options = { clientId: 'foo', redirectUri: 'http://e.com', sessionDomain: 'http://id.e.com' };
            const client_sdrn = `sdrn:schibsted:client:${options.clientId}`;
            identity = new Identity(options);
            identity._sessionService = new RESTClient({
                serverUrl: options.sessionDomain,
                fetch,
                defaultParams: { client_sdrn, redirect_uri: options.redirectUri },
            });
            fetch.mockImplementationOnce(async () => ({ ok: false, status: 404, statusText: 'No session found' }));
            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });
            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toMatch(/^http:\/\/id.e.com\//);
        });

        test('should terminate "chain" if session-service call succeeds', async () => {
            const options = { clientId: 'foo', redirectUri: 'http://e.com', sessionDomain: 'http://id.e.com' };
            const client_sdrn = `sdrn:schibsted:client:${options.clientId}`;
            identity = new Identity(options);
            identity._sessionService = new RESTClient({
                serverUrl: options.sessionDomain,
                fetch,
                defaultParams: { client_sdrn, redirect_uri: options.redirectUri },
            });
            fetch.mockImplementationOnce(async () => ({ ok: true, json: async() => ({}) }));
            await expect(identity.hasSession()).resolves.toMatchObject({});
            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toMatch(/^http:\/\/id.e.com\//);
        });

        test('should emit event both when "real" and "cached" values are used', async () => {
            const spy = jest.fn();
            identity.on('login', spy);
            await identity.hasSession();
            await identity.hasSession();
            expect(spy).toHaveBeenCalledTimes(2);
        });

        test('should return the same promise if invoked multiple times', async () => {
            fetch.mockImplementationOnce(() => new Promise((resolve) => {
                setTimeout(resolve({ ok: true, json: async () => ({ sp_id: 'yo' }) }), 1);
            }));
            const promise1 = identity.hasSession();
            const promise2 = identity.hasSession(); // NOTE: no 'await' — we want the promise
            expect(promise2).toBe(promise1);
            const dummy = await promise1;
            expect(dummy).toMatchObject({ sp_id: 'yo' });
        });

        test('should throw error if session-service returns error without 404', async () => {
            const options = { clientId: 'foo', redirectUri: 'http://e.com', sessionDomain: 'http://id.e.com' };
            const client_sdrn = `sdrn:schibsted:client:${options.clientId}`;
            identity = new Identity(options);
            identity._sessionService = new RESTClient({
                serverUrl: options.sessionDomain,
                fetch,
                defaultParams: { client_sdrn, redirect_uri: options.redirectUri },
            });
            fetch.mockImplementationOnce(async () => ({ ok: false, status: 401, statusText: 'Unauthorized' }));
            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });
            expect(fetch.mock.calls.length).toBe(1);
            expect(fetch.mock.calls[0][0]).toMatch(/^http:\/\/id.e.com\//);
        });

        describe('cache', () => {
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

            test('should cache value even when an error is returned', async () => {
                await expect(identity.hasSession(false)).rejects.toMatchObject({ type: 'UserException' });
                await expect(identity.hasSession(false)).rejects.toMatchObject({ type: 'UserException' });

                expect(fetch).toHaveProperty('mock.calls.length', 1);
            });

            test('cache shouldn\'t be updated when hasSession returns data from cache, but should be if cache expired', async () => {
                const getExpiresOn = () => JSON.parse(identity.cache.cache.get('hasSession-cache')).expiresOn;
                jest.spyOn(Date, 'now')
                    .mockReturnValue(new Date("2019-11-09T10:00:00").getTime());
                await identity.hasSession();
                const cacheExpires = getExpiresOn();
                jest.spyOn(Date, 'now')
                    .mockReturnValue(new Date("2019-11-09T10:02:00").getTime());
                await identity.hasSession();
                expect(getExpiresOn()).toBe(cacheExpires); // expiresOn shouldn't change on call less than 5m
                jest.spyOn(Date, 'now')
                    .mockReturnValue(new Date("2019-11-09T11:05:00").getTime());
                await identity.hasSession();
                // expiresOn should change after 1h
                expect(getExpiresOn()).not.toBe(cacheExpires);
            });

            test('should clear cache when explicitly called', async () => {
                await identity.hasSession();
                await identity.clearCachedUserSession();
                // the cached data should be removed so the second call should result in a new request
                await identity.hasSession();

                // two calls per hasSession() invocation, since our mock is set up this way
                expect(fetch.mock.calls.length).toBe(4);
            });
        });
    });

    describe('isLoggedIn', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => Fixtures.sessionResponse })));
        });

        test('should work when we get a `result` from hasSession', async () => {
            const v = await identity.isLoggedIn();
            expect(v).toBe(true);
        });

        test(`should fail when we don't get a 'result' from hasSession`, async () => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => ({}) })));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: false, statusText: 'Blah!' })));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });
    });

    describe('isConnected', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: async () => Fixtures.sessionResponse })));
        });

        test('should work when `!!result` from hasSession', async () => {
            const v = await identity.isConnected();
            expect(v).toBe(true);
        });

        test(`should fail when '!result' from hasSession`, async () => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: async () => ({}) })));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: false, statusText: 'Blah!' })));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });
    });

    describe('getUser', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com', sessionDomain: 'http://id.example.com' });
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => Fixtures.sessionResponse })));
        });

        test('should work when we get a `result` from hasSession', async () => {
            const session = await identity.hasSession();
            const user = await identity.getUser();
            expect(user).toMatchObject(session);
            expect(user).not.toBe(session); // should be cloned (not sure why, though..)
        });

        test(`should fail when 'result' is false from hasSession`, async () => {
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: async () => ({ result: false }) })));
            await expect(identity.getUser()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: false, statusText: 'Blah!' })));
            await expect(identity.getUser()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getUserContextData', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
        });

        test('should work when we get a result from session-service', async () => {
            const expectedData = { identifier: 'test@example.com' }
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            const userData = await identity.getUserContextData();
            expect(userData).toMatchObject(expectedData);
        });

        test('should return null on failure from session-service', async () => {
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: false }));
            const userData = await identity.getUserContextData();
            expect(userData).toBeNull();
        });
    });

    describe('_emitSessionEvent', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity(Object.assign({}, defaultOptions, { window: { location: {} } }));
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => Fixtures.sessionResponse })));
        });

        test(`spy notices a 'login' event`, async () => {
            const spy = jest.spyOn(identity, 'emit');
            await identity.hasSession();
            expect(spy).toHaveProperty('mock.calls.length');
            expect(spy.mock.calls.length).toBeGreaterThan(0);
            expect(spy.mock.calls.some(c => c[0] === 'login')).toBe(true);
        });

        test(`spy notices a 'logout' event`, async () => {
            await identity.hasSession(); // initialize with a session
            identity.logout(); // then log out

            const spy = jest.spyOn(identity, 'emit');

            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => ({ result: false }) })));
            await identity.hasSession(); // then call hassession again, now with logged out user

            expect(spy).toHaveProperty('mock.calls.length');
            expect(spy.mock.calls.length).toBeGreaterThan(0);
            expect(spy.mock.calls.some(c => c[0] === 'logout')).toBe(true);
        });

        test(`spy notices a 'userChange' event`, async () => {
            await identity.hasSession(); // initialize with a session
            identity.logout(); // then log out

            const newUser = { result: true, userId: 99999 };
            const spy = jest.spyOn(identity, 'emit');

            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => newUser })));
            await identity.hasSession(); // then call hassession again, now with user=newUser

            expect(spy).toHaveProperty('mock.calls.length');
            expect(spy.mock.calls.length).toBeGreaterThan(0);
            expect(spy.mock.calls.some(c => c[0] === 'userChange')).toBe(true);
        });
    });

    describe('getUserId', () => {
        const fetch = require('fetch-jsonp');
        let identity;

        beforeEach(() => {
            fetch.mockClear();
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => {} })));
        });

        test(`should fail when we don't get a 'userId' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should fail when we get a 'userId' from hasSession but result is false`, async () => {
            const result = { result: false, userId: '123' };
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => (result) }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'userId' from hasSession`, async () => {
            const result = { result: true, userId: '123' };
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => (result) }));
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
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => {} })));
        });

        test(`should fail when we don't get a 'uuid' from hasSession`, async () => {
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => ({}) }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should fail when we get a 'uuid' from hasSession but result is false`, async () => {
            const result = { result: false, uuid: '123' };
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => (result) }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'uuid' from hasSession`, async () => {
            const result = { result: true, uuid: '123' };
            fetch.mockImplementationOnce(() => ({ ok: true, json: async () => (result) }));
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
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn((() => ({ ok: true, json: () => {} })));
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

    describe('*Url()', () => {
        const redirects = [undefined, 'http://other.example.com'];
        describe.each(redirects)(`redirect='%s'`, (redirect) => {
            const urlFunctions = [
                ['accountUrl', '/account/summary'],
                ['phonesUrl', '/account/phones'],
            ];
            test.each(urlFunctions)('%s -> %s', (func, pathname) => {
                const identity = new Identity(defaultOptions);
                const url = new URL(identity[func](redirect));
                expect(url.origin).toBe('https://identity-pre.schibsted.com');
                expect(url.pathname).toBe(pathname);
                expect(url.searchParams.get('client_id')).toBe('foo');
                expect(url.searchParams.get('response_type')).toBe('code');
                expect(url.searchParams.get('redirect_uri')).toBe(redirect || identity.redirectUri);
            });
        });

        describe.each(redirects)(`logoutUrl: redirect='%s'`, (redirect) => {
            const identity = new Identity(defaultOptions);
            const url = new URL(identity.logoutUrl(redirect));
            expect(url.origin).toBe(defaultOptions.sessionDomain);
            expect(url.pathname).toBe('/logout');
            expect(url.searchParams.get('client_sdrn')).toBe('sdrn:schibsted.com:client:foo');
            expect(url.searchParams.get('redirect_uri')).toBe(redirect || identity.redirectUri);
        });
    });

    describe('Simplified login widget', () => {
        let identity;
        const expectedData = { identifier: 'test-uuid', display_text: 'test' };
        const state = 'sample-state';

        beforeEach(() => {
            identity = new Identity({ clientId: 'foo', redirectUri: 'http://example.com', sessionDomain: 'http://id.example.com' });
        });

        afterEach(() => {
            jest.resetAllMocks();
            window.openSimplifiedLoginWidget = undefined;
        });

        test('Should throw SDKError if could not get user context data', async () => {
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: false }));
            try {
                await identity.showSimplifiedLoginWidget({});
            } catch (e) {
                expect(e).toEqual(new SDKError('Missing user data'));
            }
        });

        test('Should throw SDKError if could not load simplified login widget script', async () => {
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                el.onerror();
            });

            try {
                await identity.showSimplifiedLoginWidget({});
            } catch (e) {
                expect(e).toEqual(new SDKError('Error when loading simplified login widget content'));
            }
        });

        test('Should return true if simplified login widget was successfully loaded and display. Should load widget script only once', async () => {
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();
            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler) => {
                    const onWindowResize = jest.fn();

                    expect(initialParams.windowWidth()).toEqual(window.innerWidth);
                    initialParams.windowOnResize(onWindowResize);
                    expect(window.onresize).toEqual(onWindowResize);

                    await loginHandler();
                    expect(identity.login).toHaveBeenCalledWith({
                        state,
                        loginHint: expectedData.identifier
                    });

                    return true;
                });

                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);

            expect(await identity.showSimplifiedLoginWidget({ state })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(2);
        });

        test('Should call state function on login action', async () => {
            const stateFn = jest.fn(async () => { return state; });
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();
            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler) => {
                    const onWindowResize = jest.fn();

                    expect(initialParams.windowWidth()).toEqual(window.innerWidth);
                    initialParams.windowOnResize(onWindowResize);
                    expect(window.onresize).toEqual(onWindowResize);

                    expect(stateFn).not.toHaveBeenCalled();
                    await loginHandler();
                    expect(stateFn).toHaveBeenCalled();
                    expect(identity.login).toHaveBeenCalledWith({
                        state,
                        loginHint: expectedData.identifier
                    });

                    return true;
                });

                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state: stateFn })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
        });
    });
});
