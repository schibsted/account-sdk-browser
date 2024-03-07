/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

import { expectUrlsToMatch } from './utils';

describe('testutils', () => {
    describe('equal', () => {
        test('can compare simple urls', () => {
            expectUrlsToMatch('https://example.com', 'https://example.com');
        });

        test('can compare urls searchParams', () => {
            expectUrlsToMatch('https://example.com?foo=bar', 'https://example.com?foo=bar');
        });

        test('can compare multiple urls searchParams', () => {
            expectUrlsToMatch('https://example.com?foo=bar&baz=qux', 'https://example.com?baz=qux&foo=bar');
        });

        test('can compare searchParams with multivalues', () => {
            expectUrlsToMatch('https://example.com?foo=bar&foo=qux', 'https://example.com?foo=qux&foo=bar');
        });
    });
});
