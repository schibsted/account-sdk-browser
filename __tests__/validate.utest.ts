/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { isStr, isStrIn, isNonEmptyString, isObject, isNonEmptyObj } from '../src/utils/validate';

describe('validate', () => {

    describe('isStr()', () => {

        test('returns false for non strings', () => {
            // @ts-expect-error
            expect(isStr()).toBe(false);
            expect(isStr(0)).toBe(false);
            expect(isStr(1)).toBe(false);
            expect(isStr(null)).toBe(false);
            expect(isStr({})).toBe(false);
            expect(isStr([])).toBe(false);
            expect(isStr(true)).toBe(false);
        });

        test(
            'returns false for empty string but when min length is more than zero',
            () => {
                expect(isNonEmptyString('')).toBe(false);
            },
        );

        test('returns true for non-empty strings', () => {
            expect(isStr('hi')).toBe(true);
        });

    });

    describe('isStrIn()', () => {

        test('returns false for non strings as value', () => {
            // @ts-expect-error
            expect(isStrIn()).toBe(false);
            // @ts-expect-error
            expect(isStrIn(0)).toBe(false);
            // @ts-expect-error
            expect(isStrIn(1)).toBe(false);
            // @ts-expect-error
            expect(isStrIn(null)).toBe(false);
            // @ts-expect-error
            expect(isStrIn({})).toBe(false);
            // @ts-expect-error
            expect(isStrIn([])).toBe(false);
            // @ts-expect-error
            expect(isStrIn(true)).toBe(false);
        });

        test('returns false when options are empty', () => {
            expect(isStrIn('hi', [])).toBe(false);
            expect(isStrIn('', [])).toBe(false);
            // @ts-expect-error
            expect(isStrIn(undefined, [])).toBe(false);
        });

        test('returns false when options include value, case is wrong and sensitive=true', () => {
            expect(isStrIn('hi', ['HI'], true)).toBe(false);
            expect(isStrIn('hi', ['ho', 'HI'], true)).toBe(false);
            expect(isStrIn('hi', ['Hi'], true)).toBe(false);
        });

        test('returns true when options include value, case is wrong and sensitive=false', () => {
            expect(isStrIn('hi', ['HI'])).toBe(true);
            expect(isStrIn('hi', ['ho', 'HI'])).toBe(true);
            expect(isStrIn('hi', ['Hi'])).toBe(true);
        });

        test('returns true when options include value, case is correct and sensitive=true', () => {
            expect(isStrIn('hi', ['hi'], true)).toBe(true);
            expect(isStrIn('hi', ['ho', 'hi'], true)).toBe(true);
            expect(isStrIn('hi', ['hi'], true)).toBe(true);
        });

        test('returns true when options include value, case is correct and sensitive=false', () => {
            expect(isStrIn('hi', ['hi'])).toBe(true);
            expect(isStrIn('hi', ['ho', 'hi'])).toBe(true);
            expect(isStrIn('hi', ['hi'])).toBe(true);
        });
    });

    describe('isObject()', () => {
        test('returns false for non-object values', () => {
            // @ts-expect-error
            expect(isObject()).toBe(false);
            expect(isObject(1)).toBe(false);
            expect(isObject(false)).toBe(false);
            expect(isObject(0)).toBe(false);
            expect(isObject('hi')).toBe(false);
            expect(isObject(() => 0)).toBe(false);
        });

        test('returns false for null', () => {
            expect(isObject(null)).toBe(false);
        });

        test('returns true for objects and arrays', () => {
            expect(isObject({})).toBe(true);
            expect(isObject([])).toBe(true);
            expect(isObject({ a: 0 })).toBe(true);
        });

    });

    describe('isNonEmptyObj()', () => {

        test('returns false for non-object values', () => {
            // @ts-expect-error
            expect(isNonEmptyObj()).toBe(false);
            expect(isNonEmptyObj(1)).toBe(false);
            expect(isNonEmptyObj(false)).toBe(false);
            expect(isNonEmptyObj(0)).toBe(false);
            expect(isNonEmptyObj('hi')).toBe(false);
            expect(isNonEmptyObj(() => 0)).toBe(false);
        });

        test('returns false for null', () => {
            expect(isNonEmptyObj(null)).toBe(false);
        });

        test('returns false if the object has no keys', () => {
            expect(isNonEmptyObj({})).toBe(false);
        });

        test('returns false for an empty array', () => {
            expect(isNonEmptyObj([])).toBe(false);
        });

        test('returns false if the object has no own keys (but inherits some)', () => {
            const proto = { aaa: 13 };
            const obj = Object.create(proto);
            expect(isNonEmptyObj(obj)).toBe(false);
        });

        test('returns true if the object has own keys', () => {
            expect(isNonEmptyObj({ x: 234 })).toBe(true);
        });

        test('returns true for an array with elements', () => {
            expect(isNonEmptyObj(['a', 'b', 'c'])).toBe(true);
        });

    });

});
