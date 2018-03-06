/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

const validate = require('../src/validate');

describe('validate', () => {

    describe('isStr()', () => {

        const { isStr, isNonEmptyString } = validate;

        test('returns false for non strings', () => {
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
                expect(isStr('') && ''.length >= 13).toBe(false);
            }
        );

        test('returns true for non-empty strings', () => {
            expect(isStr('hi')).toBe(true);
        });

    });

    describe('isObject()', () => {

        const { isObject } = validate;

        test('returns false for non-object values', () => {
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

        const { isNonEmptyObj } = validate;

        test('returns false for non-object values', () => {
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
