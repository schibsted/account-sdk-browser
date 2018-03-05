/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

const testUtils = require('../testutils');

describe('testutils', () => {
    describe('equal', () => {
        test('can compare simple urls', () => {
            testUtils.compareUrls('https://example.com', 'https://example.com');
        });

        test('can compare urls searchParams', () => {
            testUtils.compareUrls('https://example.com?foo=bar', 'https://example.com?foo=bar');
        });

        test('can compare multiple urls searchParams', () => {
            testUtils.compareUrls('https://example.com?foo=bar&baz=qux', 'https://example.com?baz=qux&foo=bar');
        });

        test('can compare searchParams with multivalues', () => {
            testUtils.compareUrls('https://example.com?foo=bar&foo=qux', 'https://example.com?foo=qux&foo=bar');
        });
    });
});
