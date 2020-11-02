/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import SDKError from './SDKError';

/*
 * This module defines a set of validation functions which are used in the rest of the SDK.
 * Why make our own validation module?
 * 1. To implement the validations that we specifically need for the SDK
 * 2. To have one less dependency
 */

/**
 * A utility function that throws an SDKError if an assertion fails. It's mostly useful for
 * validating function inputs.
 * @memberof core
 * @param {boolean} condition - The condition that we're asserting
 * @param {string} [message = Assertion failed] - The error message
 * @throws {SDKError} - If the condition is falsy it throws the appropriate error
 * @return {void}
 */
export function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new SDKError(message);
    }
}

/**
 * Checks if a value is a string or not
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isStr(value) {
    return typeof value === 'string';
}

/**
 * Checks if a value is a non-empty string
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}

/**
 * checks if a given value is an object (but not null)
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isObject(value) {
    return typeof value === 'object' && value !== null;
}

/**
 * Checks if a given value is an object with at least one own key
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isNonEmptyObj(value) {
    return isObject(value) && Object.keys(value).length > 0;
}

/**
 * Checks if a given string is a valid URL
 * @memberof core
 * @param {string} value - The string to be tested
 * @param {...string} mandatoryFields - A list of mandatory fields that should exist in the parsed
 * URL object
 * @return {boolean}
 */
export function isUrl(value, ...mandatoryFields) {
    try {
        const parsedUrl = new URL(value);
        return mandatoryFields.every(f => parsedUrl[f]);
    } catch (urlParsingError) {
        return false;
    }
}

/**
 * Checks if a given value is a function
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isFunction(value) {
    return typeof value === 'function';
}

/**
 * Checks if a string matches any of the strings in a set of possibilities
 * @memberof core
 * @param {string} value
 * @param {string[]} possibilities - An array of strings that'll be used to check the string
 * inclusion. Note that for performance reasons, we don't validate this parameter.
 * @param {boolean} [caseSensitive=false] - Should the check be case sensitive
 * @return {boolean}
 */
export function isStrIn(value, possibilities, caseSensitive = false) {
    const _isSameStrCaseInsensitive = str =>
        isStr(str) && value.toUpperCase() === str.toUpperCase();
    if (!(isStr(value) && Array.isArray(possibilities))) {
        return false;
    }
    if (caseSensitive) {
        return possibilities.indexOf(value) !== -1;
    }
    return possibilities.some(_isSameStrCaseInsensitive);
}
