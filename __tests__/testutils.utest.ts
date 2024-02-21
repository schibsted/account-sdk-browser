/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

import { compareUrls } from './utils.js';

describe('testutils', () => {
    describe('equal', () => {
        test('can compare simple urls', () => {
            compareUrls('https://example.com', 'https://example.com');
        });

        test('can compare urls searchParams', () => {
            compareUrls('https://example.com?foo=bar', 'https://example.com?foo=bar');
        });

        test('can compare multiple urls searchParams', () => {
            compareUrls('https://example.com?foo=bar&baz=qux', 'https://example.com?baz=qux&foo=bar');
        });

        test('can compare searchParams with multivalues', () => {
            compareUrls('https://example.com?foo=bar&foo=qux', 'https://example.com?foo=qux&foo=bar');
        });
    });
});
