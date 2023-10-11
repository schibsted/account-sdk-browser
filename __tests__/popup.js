'use strict';

import * as popup from '../src/popup.js';

describe('Popup — open', () => {
    const defaultFeatures = 'scrollbars=yes,location=yes,status=no,menubar=no,toolbar=no,resizable=yes';

    test('Fails if window undefined', () => {
        expect(() => popup.open())
            .toThrow(/window was supposed to be an object but it is undefined/);
    });

    test('Fails if window lacks "screen"', () => {
        const window = {};
        expect(() => popup.open(window))
            .toThrow(/window should be a valid Window object but it lacks a 'screen' property/);
    });

    test('Fails if window lacks "open"', () => {
        const window = { screen: {} };
        expect(() => popup.open(window))
            .toThrow(/window should be a valid Window object but it lacks an 'open' function/);
    });

    test('Fails if url not valid', () => {
        const window = { screen: {}, open: () => {} };
        expect(() => popup.open(window)).toThrow(/Invalid URL for popup/);
    });

    test('Works with valid window and url', () => {
        return new Promise((resolve) => {
            const open = (url, windowName, features) => {
                expect(url).toBe('http://example.com');
                expect(windowName).toBe('');
                expect(features)
                    .toBe(defaultFeatures);
                resolve();
            };
            const window = { screen: {}, open };
            popup.open(window, 'http://example.com');
        });
    });

    test('Works with valid window, url and windowName', () => {
        return new Promise((resolve) => {
            const open = (url, windowName, features) => {
                expect(url).toBe('http://example.com');
                expect(windowName).toBe('FooBar');
                expect(features)
                    .toBe(defaultFeatures);
                resolve();
            };
            const window = { screen: {}, open };
            popup.open(window, 'http://example.com', 'FooBar');
        });
    });

    test('Works with valid window, url, windowName and features', () => {
        return new Promise((resolve) => {
            const open = (url, windowName, features) => {
                expect(url).toBe('http://example.com');
                expect(windowName).toBe('FooBar');
                expect(features)
                    .toBe(defaultFeatures + ',foo=bar');
                resolve();
            };
            const window = { screen: {}, open };
            popup.open(window, 'http://example.com', 'FooBar', { foo: 'bar' });
        });
    });

    test('Works with valid window, url, windowName, features and setting left+right', () => {
        return new Promise((resolve) => {
            const screen = { width: 400, height: 300 };
            const desiredFeatures = { width: 100, height: 200 };
            const open = (url, windowName, features) => {
                expect(url).toBe('http://example.com');
                expect(windowName).toBe('FooBar');
                const left = (screen.width - desiredFeatures.width) / 2;
                const top = (screen.height - desiredFeatures.height) / 2;
                expect(features)
                    .toBe(defaultFeatures + `,width=100,height=200,left=${left},top=${top}`);
                resolve();
            };
            const window = { screen, open };
            popup.open(window, 'http://example.com', 'FooBar', desiredFeatures);
        });
    });
});
