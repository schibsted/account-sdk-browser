/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { cloneDefined, cloneDeep } from '../src/object';

describe('object', () => {

    describe('cloneDefined()', () => {

        test('throws for non objects', () => {
            expect(() => cloneDefined()).toThrow();
            expect(() => cloneDefined(1)).toThrow();
            expect(() => cloneDefined(null)).toThrow();
            expect(() => cloneDefined('str')).toThrow();
            expect(() => cloneDefined(true)).toThrow();
        });

        test('clones an empty object', () => {
            const emptyObj = {};
            const clonedObj = cloneDefined(emptyObj);
            expect(Object.keys(clonedObj)).toHaveLength(0);
            expect(emptyObj).not.toBe(clonedObj);
        });

        test('creates a new object', () => {
            const empty = {};
            const nonEmpty = { a: 2 };
            const array = [ 1, 2, 3, 4, 5, 6 ];
            expect(cloneDefined(empty) === empty).toBe(false);
            expect(cloneDefined(empty)).not.toBe(empty);
            expect(cloneDefined(nonEmpty)).not.toBe(nonEmpty);
            expect(cloneDefined(array)).not.toBe(array);
        });

        test('ignores the prototypically inherited members', () => {
            const proto = { a: 19834 };
            const obj = Object.create(proto);
            let clonedObj = cloneDefined(obj);
            expect(clonedObj).toEqual({});
            expect(clonedObj).not.toBe(proto);

            obj.foo = 'bar';
            clonedObj = cloneDefined(obj);
            expect(clonedObj).toEqual({ foo: 'bar' });
            expect(clonedObj).not.toBe(proto);
        });

        test('ignores the values that are undefined', () => {
            const obj = { a: 19834, b: undefined, c: 'to be deleted' }; // eslint-disable-line no-undefined
            delete obj.c;
            const clonedObj = cloneDefined(obj);
            expect(clonedObj).toEqual({ a: 19834 });
        });

        test('does not ignore any non-undefined values', () => {
            const clonedObj = cloneDefined({
                b: true,
                s: 'a string',
                n: 1300
            });
            expect(clonedObj.b).toBe(true);
            expect(clonedObj.s).toBe('a string');
            expect(clonedObj.n).toBe(1300);
        });

        test('later objects overwrite the earlier objects', () => {
            expect(cloneDefined({foo: 1, bar: 2}, {foo: 2})).toEqual({foo: 2, bar: 2});
        });

        test('deeply clones any objectvalue', () => {
            const obj = {a: 'foo'};
            const result = cloneDefined({ a: 'bar' }, obj);
            expect(result).toEqual({a: 'foo'});
            expect(result).not.toBe(obj);
        });

        test('deeply clones any objectvalue', () => {
            const arr = [13];
            const result = cloneDefined({ a: 'bar' }, arr);
            expect(result).toEqual({a: 'bar', '0': 13});
            expect(result).not.toBe(arr);

        });

    });

    describe('cloneDeep()', () => {

        test('clones an empty object', () => {
            const a = {};
            const b = cloneDeep(a);
            expect(typeof b).toBe('object');
            expect(b).not.toBe(a);
        });

        test('clones a simple object', () => {
            const a = { foo: 'bar' };
            const cloneA = cloneDeep(a);
            expect(cloneA).not.toBe(a);
            expect(cloneA).toHaveProperty('foo');
            expect(cloneA).toEqual(a);
        });

        test('clones a nested object', () => {
            const a = {
                foo: 'bar',
                b: {
                    baz: 'qux'
                }
            };
            const cloneA = cloneDeep(a);
            expect(cloneA).not.toBe(a);
            expect(cloneA).toHaveProperty('foo');
            expect(cloneA).toEqual(a);
            expect(cloneA).toEqual({
                foo: 'bar',
                b: {
                    baz: 'qux'
                }
            });
            expect(cloneA.b).not.toBe(a.b);
        });

        test('clones an array', () => {
            const a = [ 1, 2, null, 'foo', false ];
            const cloneA = cloneDeep(a);
            expect(cloneA).not.toBe(a);
            expect(cloneA).toEqual(a);
            expect(cloneA).toEqual([ 1, 2, null, 'foo', false ]);
        });

        test('clones null', () => {
            const a = null;
            const cloneA = cloneDeep(a);
            expect(cloneA).toBeNull();
        });

    });
});
