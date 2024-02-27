'use strict';

import * as popup from '../src/utils/popup';
import { ENDPOINTS } from '../src/config/config';
import { ForceMutable } from './utils';

const TEST_URL_INVALID = 'invalid url';
const TEST_URL_VALID = ENDPOINTS.SPiD.DEV;

const SCREEN: Screen = {
    availHeight: 0,
    availWidth: 0,
    colorDepth: 0,
    height: 0,
    orientation: screen.orientation,
    pixelDepth: 0,
    width: 0,
};

describe('Popup — open', () => {
    let mockWindow: ForceMutable<Window>;
    beforeEach(() => {
        // shallow copy of window
        mockWindow = { ...window };
    });

    const defaultFeatures = 'scrollbars=yes,location=yes,status=no,menubar=no,toolbar=no,resizable=yes';

    test('Fails if window undefined', () => {
        // @ts-expect-error
        expect(() => popup.open())
            .toThrow(/window was supposed to be an object but it is undefined/);
    });

    test('Fails if window lacks "screen"', () => {
        delete (mockWindow as Partial<ForceMutable<Window>>).screen;

        expect(() => popup.open(mockWindow, TEST_URL_VALID))
            .toThrow(/window should be a valid Window object but it lacks a 'screen' property/);
    });

    test('Fails if window lacks "open"', () => {
        mockWindow.screen = SCREEN;
        delete (mockWindow as Partial<ForceMutable<Window>>).open;

        expect(() => popup.open(mockWindow, TEST_URL_VALID))
            .toThrow(/window should be a valid Window object but it lacks an 'open' function/);
    });

    test('Fails if url not valid', () => {
        mockWindow.screen = SCREEN;

        expect(() => popup.open(mockWindow, TEST_URL_INVALID)).toThrow(/Invalid URL for popup/);
    });

    test('Works with valid window and url', () => {
        return new Promise((resolve) => {
            const open = (url: string, windowName: string, features: string) => {
                expect(url).toBe(TEST_URL_VALID);
                expect(windowName).toBe('');
                expect(features)
                    .toBe(defaultFeatures);
                resolve('');
            };
            const spy = jest.fn().mockImplementation(open);

            mockWindow.screen = SCREEN;
            mockWindow.open = spy;
            popup.open(mockWindow, TEST_URL_VALID);
        });
    });

    test('Works with valid window, url and windowName', () => {
        const EXPECTED_WINDOW_NAME = 'FooBar';

        return new Promise((resolve) => {
            const open = (url: string, windowName: string, features: string) => {
                expect(url).toBe(TEST_URL_VALID);
                expect(windowName).toBe(EXPECTED_WINDOW_NAME);
                expect(features)
                    .toBe(defaultFeatures);
                resolve('');
            };
            const spy = jest.fn().mockImplementation(open);

            mockWindow.screen = SCREEN;
            mockWindow.open = spy;
            popup.open(mockWindow, TEST_URL_VALID, EXPECTED_WINDOW_NAME);
        });
    });

    test('Works with valid window, url, windowName and features', () => {
        const EXPECTED_WINDOW_NAME = 'FooBar';
        const FEATURES = { foo: 'bar' };

        return new Promise((resolve) => {
            const open = (url: string, windowName: string, features: string) => {
                expect(url).toBe(TEST_URL_VALID);
                expect(windowName).toBe(EXPECTED_WINDOW_NAME);
                expect(features)
                    .toBe(defaultFeatures + ',foo=bar');
                resolve('');
            };
            const spy = jest.fn().mockImplementation(open);

            mockWindow.screen = SCREEN;
            mockWindow.open = spy;
            popup.open(mockWindow, TEST_URL_VALID, EXPECTED_WINDOW_NAME, FEATURES);
        });
    });

    test('Works with valid window, url, windowName, features and setting left+right', () => {
        const EXPECTED_WINDOW_NAME = 'FooBar';

        return new Promise((resolve) => {
            const screenSetup = { width: 400, height: 300 };
            const desiredFeatures = { width: 100, height: 200 };
            const open = (url: string, windowName: string, features: string) => {
                expect(url).toBe(TEST_URL_VALID);
                expect(windowName).toBe(EXPECTED_WINDOW_NAME);
                const left = (screenSetup.width - desiredFeatures.width) / 2;
                const top = (screenSetup.height - desiredFeatures.height) / 2;
                expect(features)
                    .toBe(defaultFeatures + `,width=100,height=200,left=${left},top=${top}`);
                resolve('');
            };
            const spy = jest.fn().mockImplementation(open);

            mockWindow.screen = {
                ...SCREEN,
                ...screenSetup,
            };
            mockWindow.open = spy;
            popup.open(mockWindow, TEST_URL_VALID, EXPECTED_WINDOW_NAME, desiredFeatures);
        });
    });
});
