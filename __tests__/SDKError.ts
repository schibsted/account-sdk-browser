/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from '../src/utils/SDKError';

const ERROR = new Error('TEST ERROR');

describe('SDKError', () => {

    const EXPECTED_ERROR_MSG = /SDKError: foo/;

    test('Should be able to stringify an error', () => {
        const expectedMessage = 'foo';
        const e = new SDKError(expectedMessage, ERROR);

        expect(e.toString()).toMatch(/SDKError: foo/);
    });

    test('Should be able to stringify an error with params by explicit function invocation', () => {
        const expectedMessage = 'foo';
        const e = new SDKError(expectedMessage, ERROR);

        expect(SDKError.prototype.toString.call(e)).toMatch(EXPECTED_ERROR_MSG);
    });

    test('Should be able to stringify an error by explicit function invocation', () => {
        const e = new SDKError('foo');
        expect(SDKError.prototype.toString.call(e)).toMatch(EXPECTED_ERROR_MSG);
    });
});
