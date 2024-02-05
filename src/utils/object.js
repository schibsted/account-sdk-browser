/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { assert, isObject, isNonEmptyObj } from './validate.js';
import SDKError from './SDKError.js';

/**
 * @summary Some routines that work on javascript objects
 * @private
 */


/**
 * Deep copies an object. This is handy for immutability.
 * @memberof core
 * @param {object} obj - An object, array or null.
 * @return {object} - an exact copy of the object but deep copied
 * @throws {SDKError} - if the obj is not an accepted type or is not
 *         stringifiable by JSON for example if it has loops
 */
export function cloneDeep(obj) {
    assert(typeof obj === 'object', `obj should be an object (even null) but it is ${obj}`);
    return JSON.parse(JSON.stringify(obj)) || obj;
}

/**
 * Similar to Object.assign({}, src) but only clones the keys of an object that have non-undefined
 * values.
 * Please note that the values in the rightmost parameters can overwrite the values of the earlier
 * parameters so the order of the parameters matters.
 * @memberof core
 * @example
 * cloneDefined({foo: 1, bar: 2}, {foo: 2}) // returns {foo: 2, bar: 2}
 *
 * @param {object} sources - one or more sources. Their defined properties will override the ones
 *        that came before it. For example if `source1.foo = 'bar'` and `source2.foo = 'baz'`, the
 *        result will include `{ foo: 'baz' }`
 * @return {object} a new object that is similar to src with all the key/values where the
 *         keys for undefined values are removed.
 */
export function cloneDefined(...sources) {
    const result = {};
    if (!(sources && sources.length)) {
        throw new SDKError('No objects to clone');
    }
    sources.forEach(source => {
        assert(isObject(source));
        if (isNonEmptyObj(source)) {
            Object.entries(source).forEach(([key, value]) => {
                if (typeof value !== 'undefined' ) {
                    result[key] = isObject(value) ? cloneDeep(value) : value;
                }
            });
        }
    });
    return result;
}
