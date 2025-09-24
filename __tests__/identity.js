/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from '../src/SDKError.js';

import Identity from '../identity.js';
import { compareUrls, Fixtures } from './utils.js';
import { URL } from 'url';
import { URL as u } from 'whatwg-url';
import version from '../src/version.js';

import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, {TextEncoder, TextDecoder});

import crypto from "crypto";

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

describe('Identity', () => {
    const defaultOptions = {
        clientId: 'foo',
        redirectUri: 'http://foo.com',
        sessionDomain: 'http://id.foo.com/',
        callbackBeforeRedirect: jest.fn(),
        window:{
            location:{
                href:'http://test.no',
                origin: 'http://foo.bar'
            },
        }
    };

    const sessionServicePathedOptions = {
        clientId: 'foo',
        redirectUri: 'http://foo.com',
        sessionDomain: 'http://id.foo.com/test',
        callbackBeforeRedirect: jest.fn(),
        window:{
            location:{
                href:'http://test.no',
                origin: 'http://foo.bar'
            },
        }
    };

    beforeAll(() => {
        global.URL = u;
    });

    beforeEach(() => {
        window.sessionStorage.clear();
    });

    describe('constructor()', () => {
        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Identity()).toThrowError(/Cannot read properties of undefined \(reading 'clientId'\)/);
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

        test('Should return url with prompt query', () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.login({ state: 'foo', prompt: 'login' });
            compareUrls(
                window.location.href,
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&scope=openid&state=foo&prompt=login'
            );
        });

        test('Should return url with xDomainId, xEnvironmentId and originCampaign', () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.login({ state: 'foo', xDomainId: 'aaa1111BBBB', xEnvironmentId: 'hello', originCampaign: 'world' });
            compareUrls(
                window.location.href,
                'https://identity-pre.schibsted.com/oauth/authorize?client_id=foo&redirect_uri=http%3A%2F%2Ffoo.com&response_type=code&scope=openid&state=foo&prompt=select_account&x_domain_id=aaa1111BBBB&x_env_id=hello&utm_campaign=world'
            );
        });
    });

    describe('logout()', () => {
        test('Should be able to log out from Schibsted account', async () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.logout();

            const clientSdrn = `sdrn%3Aschibsted.com%3Aclient%3A${defaultOptions.clientId}`;
            expect(window.location.href).toBe(`${identity._sessionService.url}logout?client_sdrn=${clientSdrn}&redirect_uri=http%3A%2F%2Ffoo.com&sdk_version=${version}`);
        });
        test('Should redirect to session-service for site-specific logout if configured', async () => {
            const window = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.logout();

            expect(window.location.href).toBe(`${identity._sessionService.url}logout?client_sdrn=sdrn%3Aschibsted.com%3Aclient%3Afoo&redirect_uri=http%3A%2F%2Ffoo.com&sdk_version=${version}`);
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
            const sessionResponse = { ok: true, json: () => ({ result: true })};
            fakeFetch.mockImplementationOnce(() => sessionResponse);
            identity._sessionService.fetch = fakeFetch;
            await identity.hasSession();
            expect(fakeFetch).toHaveBeenCalledTimes(1);

            const fakeFetch2 = jest.fn();
            fakeFetch2.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            identity._sessionService.fetch = fakeFetch2;
            identity._bffService.fetch = fakeFetch2;
            identity.logout();

            fakeFetch.mockImplementationOnce(() => sessionResponse);
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

        test('returns the expected endpoint for new flows with prompt=login', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                loginHint: 'dev@spid.no',
                tag: 'sample-tag',
                teaser: 'sample-teaser-slug',
                maxAge: 0,
                locale: 'en_US',
                oneStepLogin: true,
                prompt: 'login'
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&login_hint=dev@spid.no&max_age=0&tag=sample-tag&teaser=sample-teaser-slug&locale=en_US&one_step_login=true&prompt=login');
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

        test('should accept variations of sms, otp, password, eid-dk, eid-no, eid-se, eid-fi, eid acrValues. Url shouldn\'t contain prompt=select_account', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'eid-dk',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=eid-dk');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'eid-no',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=eid-no');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'eid-se',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=eid-se');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'eid-fi',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=eid-fi');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'eid',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=eid');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms otp',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms+otp');

            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                acrValues: 'sms otp password',
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&acr_values=sms+otp+password');
        });

        test('returns the expected endpoint with default params and xDomainId', () => {
            const identity = new Identity(Object.assign({}, defaultOptions, { env: 'PRO' }));
            compareUrls(identity.loginUrl({
                state: 'dummy-state',
                xDomainId: 'aaa1111BBBB'
            }), 'https://login.schibsted.com/oauth/authorize?redirect_uri=http%3A%2F%2Ffoo.com&client_id=foo&state=dummy-state&response_type=code&scope=openid&prompt=select_account&x_domain_id=aaa1111BBBB');
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
        let identity;

        const getSessionMock = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        const mockSessionOkResponse = (response)=>{
            getSessionMock.mockImplementationOnce(() => ({ ok: true, json: () => response }));
        }

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = getSessionMock;
            identity._clearVarnishCookie();
        });

        afterEach(()=>{
            jest.clearAllMocks();
        })

        test('should clear varnish cookie for domain', async () => {
            identity.enableVarnishCookie(10);

            mockSessionOkResponse({ result: true, sp_id: 'abc', baseDomain: 'spid.no' });

            await identity.hasSession();

            expect(document.cookie).toBe('SP_ID=abc');

            identity._clearVarnishCookie();

            expect(document.cookie).toBe('');
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

            mockSessionOkResponse({ result: true, sp_id: 'abc' });

            await identity.hasSession();

            expect(document.cookie).toBe('');
        });

        test('should set varnish cookie also when reading from cache', async () => {
            identity.enableVarnishCookie();

            mockSessionOkResponse({ result: true, sp_id: 'should_not_expire', expiresIn: 2 })

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

            mockSessionOkResponse({ result: true, sp_id: 'should_remain_after_one_sec', expiresIn: 1 })

            await identity.hasSession();

            await new Promise((resolve) => setTimeout(resolve, 1010));

            expect(document.cookie).toBe('SP_ID=should_remain_after_one_sec');
        });

        test('should work to clear varnish cookie', async () => {
            mockSessionOkResponse({ result: true, sp_id: 'should_be_cleared', expiresIn: 1 });

            identity.enableVarnishCookie(3);

            await identity.hasSession();

            expect(document.cookie).toBe('SP_ID=should_be_cleared');

            identity._maybeClearVarnishCookie();

            expect(document.cookie).toBe('');
        });

        describe('`baseDomain`', () => {
            test('should respect `baseDomain` from session', async () => {
                identity.enableVarnishCookie();

                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'foo.com' });

                await identity.hasSession();

                expect(document.cookie).toBe('');
            });

            test('should respect `baseDomain` from session', async () => {
                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600 });

                identity.enableVarnishCookie();

                await identity.hasSession();

                expect(document.cookie).toBe('SP_ID=abc');
            });
        });

        describe(`enableVarnishCookie domain`, () => {
            const domain =  'spid.no';
            const expiresIn=  10;

            beforeEach(()=>{
                //session base domain is `tv.spid.no` which is different from jest testURL, so cookie is not set
                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'tv.spid.no' });
            })

            const cases = [
                [undefined, undefined, 0, ''],
                [{expiresIn}, undefined, expiresIn, ''],
                [{domain}, domain, 0, 'SP_ID=abc'],
                [{domain, expiresIn}, domain, expiresIn, 'SP_ID=abc'],
            ]

            test.each(cases)(
                "with %p as cookieSetup, %p as varnishCookieDomain, %p as varnishExpiresIn set cookies %p",
                async (cookieConfig, varnishCookieDomain, varnishExpiresIn, exepectedCookie) => {
                    identity.enableVarnishCookie(cookieConfig);

                    expect(identity.varnishCookieDomain).toBe(varnishCookieDomain);
                    expect(identity.varnishExpiresIn).toBe(varnishExpiresIn);

                    await identity.hasSession();

                    expect(document.cookie).toBe(exepectedCookie);
                }
            );
        });

        test('should only go to session-service for site specific logout', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 400, statusText: 'No cookie present' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "v2/session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should fail `hasSession` if session cookie is present but no session is found and site does not have specific logout', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 404, statusText: 'No session found' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "v2/session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should terminate "chain" if session-service call succeeds', async () => {
            mockSessionOkResponse({});

            await expect(identity.hasSession()).resolves.toMatchObject({});

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "v2/session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should throw en SDK error when get /session returned an error', async () => {
            mockSessionOkResponse({error: 'some error'});

            await expect(identity.hasSession()).rejects.toThrowError('HasSession failed');
        });

        test('should emit event both when "real" and "cached" values are used', async () => {
            const spy = jest.fn();

            identity.on('login', spy);

            await identity.hasSession();
            await identity.hasSession();

            expect(spy).toHaveBeenCalledTimes(2);
        });

        test('should return the same promise if invoked multiple times', async () => {
            mockSessionOkResponse({ sp_id: 'yo' });

            const promise1 = identity.hasSession();
            const promise2 = identity.hasSession(); // NOTE: no 'await' — we want the promise

            expect(promise2).toBe(promise1);

            const dummy = await promise1;

            expect(dummy).toMatchObject({ sp_id: 'yo' });
        });

        test('should throw error if session-service returns error without 404', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 401, statusText: 'Unauthorized' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "v2/session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        describe('cache', () => {
            test('should never cache if caching is off', async () => {
                identity._enableSessionCaching = false;

                await identity.hasSession();
                await identity.hasSession();

                expect(getSessionMock).toHaveBeenCalledTimes(2)
            });

            test('should use cached value on subsequent calls by default', async () => {
                await identity.hasSession();
                await identity.hasSession();

                expect(getSessionMock).toHaveBeenCalledTimes(1)
            });

            test('cache shouldn\'t be updated when hasSession returns data from cache, but should be if cache expired', async () => {
                jest.spyOn(Date, 'now')
                    .mockReturnValue(new Date("2019-11-09T10:00:00").getTime());

                const getExpiresOn = () => JSON.parse(identity.sessionStorageCache.cache.get('hasSession-cache')).expiresOn;

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

                expect(getSessionMock).toHaveBeenCalledTimes(2)
            });
        });

        describe('session refresh full page redirect', ()=>{
            test('should do redirect when session endpoint respond with redirectURL only', async () => {
                mockSessionOkResponse(Fixtures.sessionNeedsToBeRefreshedResponse)

                const MOCK_TAB_ID = 1234;
                const spy = jest.spyOn(Identity.prototype, '_getTabId');
                spy.mockImplementation(() => MOCK_TAB_ID);

                await identity.hasSession();

                expect(defaultOptions.callbackBeforeRedirect).toHaveBeenCalled();

                expect(defaultOptions.window.location.href).toBe(
                    [
                        identity._sessionService.url,
                        Fixtures.sessionNeedsToBeRefreshedResponse.redirectURL,
                        '?client_sdrn=sdrn%3Aschibsted.com%3Aclient%3A',
                        defaultOptions.clientId,
                        '&redirect_uri=',
                        encodeURIComponent(defaultOptions.redirectUri),
                        '&sdk_version=',
                        version,
                        '&tabId=',
                        MOCK_TAB_ID
                    ].join('')
                );
            });
        })
    });

    describe('hasSession pathed session-service', () => {
        let identity;

        const getSessionMock = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        const mockSessionOkResponse = (response)=>{
            getSessionMock.mockImplementationOnce(() => ({ ok: true, json: () => response }));
        }

        beforeEach(() => {
            identity = new Identity(sessionServicePathedOptions);
            identity._sessionService.fetch = getSessionMock;
            identity._clearVarnishCookie();
        });

        afterEach(()=>{
            jest.clearAllMocks();
        })

        test('should clear varnish cookie for domain', async () => {
            identity.enableVarnishCookie(10);

            mockSessionOkResponse({ result: true, sp_id: 'abc', baseDomain: 'spid.no' });

            await identity.hasSession();

            expect(document.cookie).toBe('SP_ID=abc');

            identity._clearVarnishCookie();

            expect(document.cookie).toBe('');
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

            mockSessionOkResponse({ result: true, sp_id: 'abc' });

            await identity.hasSession();

            expect(document.cookie).toBe('');
        });

        test('should set varnish cookie also when reading from cache', async () => {
            identity.enableVarnishCookie();

            mockSessionOkResponse({ result: true, sp_id: 'should_not_expire', expiresIn: 2 })

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

            mockSessionOkResponse({ result: true, sp_id: 'should_remain_after_one_sec', expiresIn: 1 })

            await identity.hasSession();

            await new Promise((resolve) => setTimeout(resolve, 1010));

            expect(document.cookie).toBe('SP_ID=should_remain_after_one_sec');
        });

        test('should work to clear varnish cookie', async () => {
            mockSessionOkResponse({ result: true, sp_id: 'should_be_cleared', expiresIn: 1 });

            identity.enableVarnishCookie(3);

            await identity.hasSession();

            expect(document.cookie).toBe('SP_ID=should_be_cleared');

            identity._maybeClearVarnishCookie();

            expect(document.cookie).toBe('');
        });

        describe('`baseDomain`', () => {
            test('should respect `baseDomain` from session', async () => {
                identity.enableVarnishCookie();

                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'foo.com' });

                await identity.hasSession();

                expect(document.cookie).toBe('');
            });

            test('should respect `baseDomain` from session', async () => {
                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600 });

                identity.enableVarnishCookie();

                await identity.hasSession();

                expect(document.cookie).toBe('SP_ID=abc');
            });
        });

        describe(`enableVarnishCookie domain`, () => {
            const domain =  'spid.no';
            const expiresIn=  10;

            beforeEach(()=>{
                //session base domain is `tv.spid.no` which is different from jest testURL, so cookie is not set
                mockSessionOkResponse({ result: true, sp_id: 'abc', expiresIn: 3600, baseDomain: 'tv.spid.no' });
            })

            const cases = [
                [undefined, undefined, 0, ''],
                [{expiresIn}, undefined, expiresIn, ''],
                [{domain}, domain, 0, 'SP_ID=abc'],
                [{domain, expiresIn}, domain, expiresIn, 'SP_ID=abc'],
            ]

            test.each(cases)(
                "with %p as cookieSetup, %p as varnishCookieDomain, %p as varnishExpiresIn set cookies %p",
                async (cookieConfig, varnishCookieDomain, varnishExpiresIn, exepectedCookie) => {
                    identity.enableVarnishCookie(cookieConfig);

                    expect(identity.varnishCookieDomain).toBe(varnishCookieDomain);
                    expect(identity.varnishExpiresIn).toBe(varnishExpiresIn);

                    await identity.hasSession();

                    expect(document.cookie).toBe(exepectedCookie);
                }
            );
        });

        test('should only go to session-service for site specific logout', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 400, statusText: 'No cookie present' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should fail `hasSession` if session cookie is present but no session is found and site does not have specific logout', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 404, statusText: 'No session found' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should terminate "chain" if session-service call succeeds', async () => {
            mockSessionOkResponse({});

            await expect(identity.hasSession()).resolves.toMatchObject({});

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        test('should throw en SDK error when get /session returned an error', async () => {
            mockSessionOkResponse({error: 'some error'});

            await expect(identity.hasSession()).rejects.toThrowError('HasSession failed');
        });

        test('should emit event both when "real" and "cached" values are used', async () => {
            const spy = jest.fn();

            identity.on('login', spy);

            await identity.hasSession();
            await identity.hasSession();

            expect(spy).toHaveBeenCalledTimes(2);
        });

        test('should return the same promise if invoked multiple times', async () => {
            mockSessionOkResponse({ sp_id: 'yo' });

            const promise1 = identity.hasSession();
            const promise2 = identity.hasSession(); // NOTE: no 'await' — we want the promise

            expect(promise2).toBe(promise1);

            const dummy = await promise1;

            expect(dummy).toMatchObject({ sp_id: 'yo' });
        });

        test('should throw error if session-service returns error without 404', async () => {
            getSessionMock.mockImplementationOnce(() => ({ ok: false, status: 401, statusText: 'Unauthorized' }));

            await expect(identity.hasSession()).rejects.toMatchObject({ message: 'HasSession failed' });

            expect(getSessionMock).toHaveBeenCalledTimes(1)
            expect(getSessionMock).toHaveBeenCalledWith(
                expect.stringContaining(identity._sessionService.url + "session"),
                {"credentials": "include", "headers": {}, "method": "get"}
            )
        });

        describe('cache', () => {
            test('should never cache if caching is off', async () => {
                identity._enableSessionCaching = false;

                await identity.hasSession();
                await identity.hasSession();

                expect(getSessionMock).toHaveBeenCalledTimes(2)
            });

            test('should use cached value on subsequent calls by default', async () => {
                await identity.hasSession();
                await identity.hasSession();

                expect(getSessionMock).toHaveBeenCalledTimes(1)
            });

            test('cache shouldn\'t be updated when hasSession returns data from cache, but should be if cache expired', async () => {
                jest.spyOn(Date, 'now')
                    .mockReturnValue(new Date("2019-11-09T10:00:00").getTime());

                const getExpiresOn = () => JSON.parse(identity.sessionStorageCache.cache.get('hasSession-cache')).expiresOn;

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

                expect(getSessionMock).toHaveBeenCalledTimes(2)
            });
        });

        describe('session refresh full page redirect', ()=>{
            test('should do redirect when session endpoint respond with redirectURL only', async () => {
                mockSessionOkResponse(Fixtures.sessionNeedsToBeRefreshedResponse)

                const MOCK_TAB_ID = 1234;
                const spy = jest.spyOn(Identity.prototype, '_getTabId');
                spy.mockImplementation(() => MOCK_TAB_ID);

                await identity.hasSession();

                expect(sessionServicePathedOptions.callbackBeforeRedirect).toHaveBeenCalled();

                expect(sessionServicePathedOptions.window.location.href).toBe(
                    [
                        identity._sessionService.url,
                        Fixtures.sessionNeedsToBeRefreshedResponse.redirectURL,
                        '?client_sdrn=sdrn%3Aschibsted.com%3Aclient%3A',
                        sessionServicePathedOptions.clientId,
                        '&redirect_uri=',
                        encodeURIComponent(sessionServicePathedOptions.redirectUri),
                        '&sdk_version=',
                        version,
                        '&tabId=',
                        MOCK_TAB_ID
                    ].join('')
                );
            });
        })
    });

    describe('isLoggedIn', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test('should work when we get a `result` from hasSession', async () => {
            const v = await identity.isLoggedIn();
            expect(v).toBe(true);
        });

        test(`should fail when we don't get a 'result' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            const v = await identity.isLoggedIn();
            expect(v).toBe(false);
        });
    });

    describe('isConnected', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test('should work when `!!result` from hasSession', async () => {
            const v = await identity.isConnected();
            expect(v).toBe(true);
        });

        test(`should fail when '!result' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });

        test(`should handle hasSession failure without throwing`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            const v = await identity.isConnected();
            expect(v).toBe(false);
        });
    });

    describe('getUser', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test('should work when we get a `result` from hasSession', async () => {
            const session = await identity.hasSession();
            const user = await identity.getUser();
            expect(user).toMatchObject(session);
            expect(user).not.toBe(session); // should be cloned (not sure why, though..)
        });

        test(`should fail when 'result' is false from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({ result: false }) }));
            await expect(identity.getUser()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
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
            const expectedData = { identifier: 'test@example.com' };
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
        let identity;

        beforeEach(() => {
            identity = new Identity(Object.assign({}, defaultOptions, { window: { location: {} } }));
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
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

            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({ result: false }) }));
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

            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => newUser }));
            await identity.hasSession(); // then call hassession again, now with user=newUser

            expect(spy).toHaveProperty('mock.calls.length');
            expect(spy.mock.calls.length).toBeGreaterThan(0);
            expect(spy.mock.calls.some(c => c[0] === 'userChange')).toBe(true);
        });
    });

    describe('getUserId', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test(`should fail when we don't get a 'userId' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should fail when we get a 'userId' from hasSession but result is false`, async () => {
            const result = { result: false, userId: '123' };
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => result }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'userId' from hasSession`, async () => {
            const result = { result: true, userId: '123' };
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => result }));
            await expect(identity.getUserId()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getUserId()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getExternalId', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test('should throw if pairId is missing in hasSession response', async () => {
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => ({}) }));
            expect(async () => await identity.getExternalId('3rd-party')).rejects.toThrowError(new SDKError('pairId missing in user session!'));
        })

        test('should throw if externalParty is missing', async () => {
            expect(async () => await identity.getExternalId()).rejects.toThrowError(new SDKError('externalParty cannot be empty'));
            expect(async () => await identity.getExternalId('')).rejects.toThrowError(new SDKError('externalParty cannot be empty'));
        })

        test('should return correct externalId when externalParty is provided', async () => {
            const expectedHash = "75907c00749031cfdc798cd29de9ac68e86b39e9edd873dedb6813dba5f97824";
            const externalId = await identity.getExternalId("3rd-party");

            expect(externalId).toBe(expectedHash);
        })

        test('should return correct externalId when externalParty and suffix are provided', async () => {
            const expectedHash = "a0ad9a8261f2dc1b687ddd2c51f48445340985e34cb9db5d0a42856480ecc5fb";
            const externalId = await identity.getExternalId("3rd-party", "suffix");

            expect(externalId).toBe(expectedHash);
        })
    })

    describe('getUserSDRN', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test(`should fail when sdrn is not present in hasSession response`, async () => {
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => ({}) }));
            expect(async () => await identity.getUserSDRN()).rejects.toThrowError(new SDKError('Failed to get SDRN from user session'));
        })

        test(`should return userSDRN`, async () => {
            const expectedSdrn = Fixtures.sessionResponse.sdrn;
            const sdrn = await identity.getUserSDRN();
            expect(sdrn).toBe(expectedSdrn);
        })
    })

    describe('getUserUuid', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test(`should fail when we don't get a 'uuid' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should fail when we get a 'uuid' from hasSession but result is false`, async () => {
            const result = { result: false, uuid: '123' };
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => result }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'The user is not connected to this merchant'
            });
        });

        test(`should work when we get a 'uuid' from hasSession`, async () => {
            const result = { result: true, uuid: '123' };
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => result }));
            await expect(identity.getUserUuid()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getUserUuid()).rejects.toMatchObject({
                message: 'HasSession failed'
            });
        });
    });

    describe('getSpId', () => {
        let identity;

        beforeEach(() => {
            identity = new Identity(defaultOptions);
            identity._sessionService.fetch = jest.fn(() => ({ ok: true, json: () => Fixtures.sessionResponse }));
        });

        test(`should fail when we don't get a 'spId' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({}) }));
            await expect(identity.getSpId()).resolves.toBeNull();
        });

        test(`should work when we get a 'spId' from hasSession`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: true, json: () => ({ sp_id: '123' }) }));
            await expect(identity.getSpId()).resolves.toBe('123');
        });

        test(`should propagate errors from HasSession call (why, though?)`, async () => {
            identity._sessionService.fetch.mockImplementationOnce(() => ({ ok: false, statusText: 'Blah!' }));
            await expect(identity.getSpId()).resolves.toBeNull();
        });
    });

    describe('*Url()', () => {
        const redirects = [undefined, 'http://other.example.com'];
        describe.each(redirects)(`redirect='%s'`, (redirect) => {
            const urlFunctions = [
                ['accountUrl', '/profile-pages'],
                ['phonesUrl', '/profile-pages/about-you/phone'],
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
            expect(url.origin).toBe(new URL(defaultOptions.sessionDomain).origin);
            expect(url.pathname).toBe(identity._sessionService.url.pathname + 'logout');
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
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();
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

        test('Should works with loginNotYouHandler', async () => {
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();
            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler, loginNotYouHandler) => {

                    await loginNotYouHandler();
                    expect(identity.login).toHaveBeenCalledWith({
                        state,
                        loginHint: expectedData.identifier,
                        prompt: 'login'
                    });

                    return true;
                });

                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state })).toEqual(true);
        });

        test('Should call state function on login not you action', async () => {
            const stateFn = jest.fn(() => state);
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();
            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler, loginNotYouHandler) => {

                    expect(stateFn).not.toHaveBeenCalled();
                    await loginNotYouHandler();
                    expect(stateFn).toHaveBeenCalled();
                    expect(identity.login).toHaveBeenCalledWith({
                        state,
                        prompt: 'login',
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

        test('Should call state function on login action', async () => {
            const stateFn = jest.fn(() => state);
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

        test('Should not pass any encoding param to simplified login widget script URL when not specified', async () => {
            const stateFn = jest.fn(() => state);
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();

            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(() => true);

                expect(el.src).toBe(`https://identity-pre.schibsted.com/authn/simplified-login-widget?client_id=${defaultOptions.clientId}`);
                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state: stateFn })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
        });

        test('Should pass encoding param to simplified login widget script URL', async () => {
            const stateFn = jest.fn(() => state);
            const expectedEncoding = 'iso-8859-1';
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();

            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(() => true);

                expect(el.src).toBe(`https://identity-pre.schibsted.com/authn/simplified-login-widget?client_id=${defaultOptions.clientId}&encoding=${expectedEncoding}`);
                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state: stateFn }, { encoding: expectedEncoding })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
        });

        test('Should pass locale param to simplified login widget', async () => {
            const expectedLocale = 'fi';
            const stateFn = jest.fn(() => state);
            identity._globalSessionService.fetch = jest.fn(() => ({ ok: true, json: () => expectedData }));
            identity.login = jest.fn();

            document.getElementsByTagName('body')[0].appendChild = jest.fn((el) => {
                window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler) => {
                    expect(initialParams.locale).toEqual(expectedLocale);
                    await loginHandler();
                    expect(identity.login).toHaveBeenCalledWith({
                        state,
                        loginHint: expectedData.identifier
                    });
                    return true;
                });

                el.onload();
            });

            expect(await identity.showSimplifiedLoginWidget({ state: stateFn }, { locale: expectedLocale })).toEqual(true);
            expect(document.getElementsByTagName('body')[0].appendChild).toHaveBeenCalledTimes(1);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
        });

        test('Should emit simplifiedLoginOpened if loaded successfully', async () => {
            const spy = jest.fn();

            window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler, loginNotYouHandler, initHandler) => {
                initHandler();
            });

            identity.on('simplifiedLoginOpened', spy);

            expect(await identity.showSimplifiedLoginWidget({ state })).toEqual(true);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledTimes(1);
        })

        test('Should emit simplifiedLoginCancelled after closing the widget', async () => {
            const spy = jest.fn();

            identity.on('simplifiedLoginCancelled', spy)

            window.openSimplifiedLoginWidget = jest.fn(async (initialParams, loginHandler, loginNotYouHandler, initHandler, cancelHandler) => {
                cancelHandler();
            });

            expect(await identity.showSimplifiedLoginWidget({ state })).toEqual(true);
            expect(window.openSimplifiedLoginWidget).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledTimes(1);
        })
    });

    describe('logSettings', () => {
        test('should print settings and version', () => {
            const window = { location: {} };
            const log = jest.fn();
            const settings = {
                clientId: defaultOptions.clientId,
                redirectUri: defaultOptions.redirectUri,
                env: 'PRE',
                sessionDomain: defaultOptions.sessionDomain,
                sdkVersion: version
            }

            const identity = new Identity(Object.assign({}, defaultOptions, { window, log }));
            identity.logSettings();

            expect(log).toHaveBeenCalledWith(`Schibsted account SDK for browsers settings: \n${JSON.stringify(settings, null, 2)}`);
        })

        test('should use console.log when exist and log do not exist', () => {
            jest.spyOn(console, 'log').mockImplementation(jest.fn());

            const window = { location: {}};
            const settings = {
                clientId: defaultOptions.clientId,
                redirectUri: defaultOptions.redirectUri,
                env: 'PRE',
                sessionDomain: defaultOptions.sessionDomain,
                sdkVersion: version
            }

            const identity = new Identity(Object.assign({}, defaultOptions, { window }));
            identity.logSettings();

            expect(console.log).toHaveBeenCalledWith(`Schibsted account SDK for browsers settings: \n${JSON.stringify(settings, null, 2)}`);
        })

        test('should throw error when log and console.log do not exist', () => {
            const console = window.console;
            window.console = undefined;
            const windowObj = { location: {} };
            const identity = new Identity(Object.assign({}, defaultOptions, { window: windowObj }));

            expect(() => {
                identity.logSettings()
            }).toThrowError(new SDKError('You have to provide log method in constructor'));

            window.console = console;
        })
    })

    describe('global registration', () => {
        test('should register as window.schIdentity', () => {
            const window = { location: {}};
            const instance = new Identity(Object.assign({}, defaultOptions, { window }));

            expect(window.schIdentity).toBe(instance);
        })
        test('should emit document event', async () => {
            const window = { location: {}};
            const event = new Promise(resolve => {
                window.addEventListener('schIdentity:init', e => {
                    resolve(e);
                });
            });
            const instance = new Identity(Object.assign({}, defaultOptions, { window }));

            expect(event).resolves.toMatchObject({ detail: { instance } });
        })
    });
});
