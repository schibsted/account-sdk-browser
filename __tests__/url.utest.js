/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { URL } from 'whatwg-url';
import { urlMapper } from '../src/url.js';
import RESTClient from '../src/RESTClient.js';

describe('url', () => {

    describe('urlMapper()', () => {

        test('can handle hostname keys', () => {
            expect(urlMapper('SHORTHAND1', {
                'SHORTHAND1': 'http://shorthand1.local'
            })).toBe('http://shorthand1.local');
        });

        test('if the first parameter is a valid URL, return that', () => {
            expect(urlMapper('http://shorthand2.local', {
                'SHORTHAND1': 'http://shorthand1.local'
            })).toBe('http://shorthand2.local');
        });

        test('if the first parameter is a bad lookup key, fail', () => {
            expect(() => urlMapper('BAD_KEY', {
                'GOOD_KEY': 'http://shorthand1.local'
            })).toThrow(/Bad URL given: 'BAD_KEY'/);
        });
    });

    /*
     * This part exists to demonstrate the plain URL ctor. We used to have a UrlBuilder class
     * before, which has now been removed. They work almost the same, and to illustrate any
     * differences, people should peruse the tests in this file.
     */
    describe('WHATWG URL', () => {
        test('constructs URL with abs path', () => {
            const url = new URL('/server', 'http://example.com');
            expect(url.href).toBe('http://example.com/server');
        });

        test('constructs URL with params', () => {
            const url = new URL('/server', 'http://example.com');
            url.search = RESTClient.search({ a: 1, foo: 'bar' });
            expect(url.href).toBe('http://example.com/server?a=1&foo=bar');
        });

        test('cuts base path from URL if pathname has leading /', () => {
            const url = new URL('/server', 'http://example.com/authn');
            expect(url.href).not.toBe('http://example.com/authn/server');
            expect(url.href).toBe('http://example.com/server');
        });

        test('keeps base path from URL if pathname has leading .', () => {
            const url = new URL('./server', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/authn/server');
        });

        test('keeps base path from URL if pathname is purely alphanumeric', () => {
            const url = new URL('server', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/authn/server');
        });

        test('cuts base path from URL if pathname is alphanumeric and base path lacks trailing /',
            () => {
                const url = new URL('server', 'http://example.com/authn');
                expect(url.href).toBe('http://example.com/server');
            }
        );

        test('cuts base path from URL if pathname is single /', () => {
            const url = new URL('/', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/');
        });

        test('keeps base path from URL if pathname is single .', () => {
            const url = new URL('.', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/authn/');
        });

        test('constructs URL with trailing slash after the path', () => {
            const url = new URL('somepath/', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/authn/somepath/');
        });

        test('can build uris with path having multiple parts separated by slash', () => {
            const url = new URL('some/path/with/parts', 'http://example.com/authn/');
            expect(url.href).toBe('http://example.com/authn/some/path/with/parts');
        });
    });
});
