/**
 * A utility function that throws an SDKError if an assertion fails. It's mostly useful for
 * validating function inputs.
 * @memberof core
 * @param {boolean} condition - The condition that we're asserting
 * @param {string} [message = Assertion failed] - The error message
 * @throws {SDKError} - If the condition is falsy it throws the appropriate error
 * @return {void}
 */
export function assert(condition: boolean, message?: string): void;
/**
 * Checks if a value is a string or not
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isStr(value: any): boolean;
/**
 * Checks if a value is a non-empty string
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isNonEmptyString(value: any): boolean;
/**
 * checks if a given value is an object (but not null)
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isObject(value: any): boolean;
/**
 * Checks if a given value is an object with at least one own key
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isNonEmptyObj(value: any): boolean;
/**
 * Checks if a given string is a valid URL
 * @memberof core
 * @param {string} value - The string to be tested
 * @param {...string} mandatoryFields - A list of mandatory fields that should exist in the parsed
 * URL object
 * @return {boolean}
 */
export function isUrl(value: unknown, ...mandatoryFields: string[]): boolean;
/**
 * Checks if a given value is a function
 * @memberof core
 * @param {*} value - The value to check
 * @return {boolean}
 */
export function isFunction(value: any): boolean;
/**
 * Checks if a string matches any of the strings in a set of possibilities
 * @memberof core
 * @param {string} value
 * @param {string[]} possibilities - An array of strings that'll be used to check the string
 * inclusion. Note that for performance reasons, we don't validate this parameter.
 * @param {boolean} [caseSensitive=false] - Should the check be case sensitive
 * @return {boolean}
 */
export function isStrIn(value: string, possibilities: string[], caseSensitive?: boolean): boolean;
