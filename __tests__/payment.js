/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { Payment } from '../payment.js';
import { compareUrls } from './utils.js';

describe('Payment', () => {

    describe('constructor()', () => {
        test('throws if the options object is not passed to the constructor', () => {
            expect(() => new Payment())
                .toThrowError(/Cannot read properties of undefined \(reading 'clientId'\)/);
        });

        test('throws if the clientId setting is missing or has wrong type', () => {
            expect(() => new Payment({}))
                .toThrowError(/clientId parameter is required/);
            expect(() => new Payment({ clientId: true }))
                .toThrowError(/clientId parameter is required/);
        });

        test('should work if all params are ok', () => {
            const mon = new Payment({ clientId: 'a' });
            expect(mon).not.toBeNull();
            expect(mon).toBeDefined();
        });
    });

    describe('payWithPaylink()', () => {
        let payment;
        let window;
        const paylink = 'http://foo.bar';
        const open = (url, windowName, features) => ({ url, windowName, features });

        beforeEach(() => {
            window = { location: {}, screen: {}, open };
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work for a paylink', async () => {
            const response = await payment.payWithPaylink({ paylink });
            expect(response).toBeNull();
            expect(window.location.href).toMatch('paylink=http%3A%2F%2Ffoo.bar');
        });

        test('should open a popup when preferPopup==true', async () => {
            const popup = await payment.payWithPaylink({ paylink, preferPopup: true });
            expect(popup).toMatchObject({
                url: expect.stringMatching('paylink=http%3A%2F%2Ffoo.bar'),
                windowName: 'Schibsted account',
                features: 'scrollbars=yes,location=yes,status=no,menubar=no,toolbar=no,resizable=yes,width=360,height=570'
            });
        });

        test('should fall back if preferPopup==true but fails to create popup', async () => {
            window = { location: {}, screen: {}, open: () => null };
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
            const popup = await payment.payWithPaylink({ paylink, preferPopup: true });
            expect(popup).toBeNull();
            expect(window.location.href).toMatch('paylink=http%3A%2F%2Ffoo.bar');
        });

        test('should reset popup before creating new one', async () => {
            const oldPopup = { close: () => {} };
            payment.popup = oldPopup;
            const popup = await payment.payWithPaylink({ paylink, preferPopup: true });
            expect(payment.popup).toBe(popup);
            expect(payment.popup).not.toBe(oldPopup);
        });

        test('should close existing popup before creating new one', async () => {
            const oldPopup = { close: jest.fn() };
            payment.popup = oldPopup;
            const popup = await payment.payWithPaylink({ paylink, preferPopup: true });
            expect(payment.popup).toBe(popup);
            expect(payment.popup).not.toBe(oldPopup);
            expect(oldPopup.close).toBeCalled();
        });

        test('should not try to close existing popup if already closed', async () => {
            const oldPopup = { close: jest.fn(), closed: true };
            payment.popup = oldPopup;
            const popup = await payment.payWithPaylink({ paylink, preferPopup: true });
            expect(payment.popup).toBe(popup);
            expect(payment.popup).not.toBe(oldPopup);
            expect(oldPopup.close).not.toBeCalled();
        });
    });

    describe('purchasePaylinkUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work with simple paylinkId', () => {
            const url = payment.purchasePaylinkUrl('abc');
            expect(url).toMatch(/purchase\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&paylink=abc/);
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.purchasePaylinkUrl('abc')).toThrowError(/redirectUri is invalid/);
        });

        test('should fail without paylinkId', () => {
            expect(() => payment.purchasePaylinkUrl()).toThrowError(/paylinkId is required/);
        });
    });

    describe('purchaseHistoryUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work with implicit redirectUri', () => {
            const url = payment.purchaseHistoryUrl();
            expect(url).toMatch(/purchasehistory\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo/);
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.purchaseHistoryUrl('abc')).toThrowError(/redirectUri is invalid/);
        });
    });

    describe('redeemUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work with implicit redirectUri', () => {
            const url = payment.redeemUrl('123');
            expect(url).toMatch(/redeem\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&voucher_code=123/);
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.redeemUrl('abc')).toThrowError(/redirectUri is invalid/);
        });
    });

    describe('purchaseProductFlowUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work with implicit redirectUri', () => {
            const url = payment.purchaseProductFlowUrl('123');
            expect(url).toMatch(/checkout\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&response_type=code&flow=payment&product_id=123/);
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.purchaseProductFlowUrl('abc')).toThrowError(/redirectUri is invalid/);
        });

        test('should fail without product id', () => {
            expect(() => payment.purchaseProductFlowUrl()).toThrowError(/productId is required/);
        });
    });

    describe('purchaseCampaignFlowUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window });
        });

        test('should work with implicit redirectUri', () => {
            const url = payment.purchaseCampaignFlowUrl('12', '20032');
            expect(url).toMatch(/checkout\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&response_type=code&flow=payment&campaign_id=12&product_id=20032/);
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.purchaseCampaignFlowUrl('abc')).toThrowError(/redirectUri is invalid/);
        });

        test('should build uri with campaign_id and product_id', () => {
            const url = payment.purchaseCampaignFlowUrl('12', '20032');
            expect(url).toMatch(/checkout\?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&response_type=code&flow=payment&campaign_id=12&product_id=20032/);
        });

        test('should fail without campaign id', () => {
            expect(() => payment.purchaseCampaignFlowUrl()).toThrowError(/campaignId is required/);
        });
    });

    describe('purchasePromoCodeProductFlowUrl', () => {
        let payment;
        const open = (url, windowName, features) => ({ url, windowName, features });
        const window = { location: {}, screen: {}, open };

        beforeEach(() => {
            payment = new Payment({ clientId: 'a', redirectUri: 'http://redirect.foo', window, publisher: 'vkse' });
        });

        test('should work with implicit redirectUri', () => {
            compareUrls(
                payment.purchasePromoCodeProductFlowUrl('12'),
                'https://identity-pre.schibsted.com/authn/payment/purchase/code?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&code=12&publisher=vkse'
            );
        });

        test('should fail without redirectUri', () => {
            payment = new Payment({ clientId: 'a', window });
            expect(() => payment.purchasePromoCodeProductFlowUrl('abc')).toThrowError(/redirectUri is invalid/);
        });

        test('should fail without publisher', () => {
            payment = new Payment({ clientId: 'a', window, redirectUri: 'http://redirect.foo' });
            expect(() => payment.purchasePromoCodeProductFlowUrl('abc')).toThrowError(/publisher is required in the constructor/);
        });

        test('should fail without code', () => {
            expect(() => payment.purchasePromoCodeProductFlowUrl()).toThrowError(/code is required/);
        });

        test('should build uri with code and state', () => {
            compareUrls(
                payment.purchasePromoCodeProductFlowUrl('12', '20032'),
                'https://identity-pre.schibsted.com/authn/payment/purchase/code?client_id=a&redirect_uri=http%3A%2F%2Fredirect.foo&code=12&publisher=vkse&state=20032'
            );
        });
    });

    describe('global registration', () => {
        test('registers itself as window.sch_payment', () => {
            const window = { location: {}};
            const instance = new Payment({ clientId: 'a',  window });
            expect(window.sch_payment).toBe(instance);
        })

        test('emits document event', async () => {
            const window = { location: {}};
            const event = new Promise(resolve => {
                document.addEventListener('sch_payment:init', e => {
                    resolve(e);
                });
            });
            const instance = new Payment({ clientId: 'a', window });
            expect(event).resolves.toMatchObject({ detail: { instance } });
        })
    });
});
