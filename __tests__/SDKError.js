/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from '../src/utils/SDKError.ts';

describe('SDKError', () => {
    test('Should be able to stringify an error', () => {
        const e = new SDKError('foo', { bar: 'baz' });

        // FIXME: Enable this when.. we have babel7 and it (hopefully) works with Jest+Coverage
        // expect(e.toString()).toBe('SDKError: foo\n    bar: baz');
        expect(e.toString()).toMatch(/SDKError: foo/);
    });

    test('Should be able to stringify an error with params by explicit function invocation', () => {
        const e = new SDKError('foo', { bar: 'baz' });
        expect(SDKError.prototype.toString.call(e)).toMatch(/SDKError: foo\n {4}bar: baz/);
    });

    test('Should be able to stringify an error by explicit function invocation', () => {
        const e = new SDKError('foo');
        expect(SDKError.prototype.toString.call(e)).toMatch(/SDKError: foo/);
    });
});
