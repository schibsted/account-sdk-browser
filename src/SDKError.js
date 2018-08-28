/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

/*
 * Note: this module can't have any internal dependencies because it's used in ./validate which
 * in turn is used as a dependency to a lot of other modules. Doing so may create a circular
 * dependency that's hard to debug in Node.
 */

const STRINGIFY_TYPES = ['boolean', 'number', 'string'];

/**
 * Represents a SDK error. This is returned from all rejected promises that are returned from an API
 * call. Constructs an SDK error ready to throw
 * @summary When the SDK throws an error, it's supposed to be an instance of this class
 * @private
 */
export default class SDKError extends Error {
    /**
     * @property {number} code - The HTTP error code
     * @extends {Error}
     * @param {string} message - The error message
     * @param {object} [errorObject] - The error object that was returned from the server. Any
     * property of errorObject object will be copied into this instance SDKError
     */
    constructor(message, errorObject) {
        super(message);
        this.name = 'SDKError';
        if (typeof errorObject === 'object') {
            // At this point it doesn't matter if errorObject === null
            Object.assign(this, errorObject);
        }
    }

    /**
     * Serializes the error printing any interesting additional info
     * @private
     * @return {String}
     */
    toString() {
        const ret = `${this.name}: ${this.message}`;
        const additionalInfo = Object.keys(this)
            .filter(key => key !== 'name' && STRINGIFY_TYPES.includes(typeof this[key]))
            .map(key => `    ${key}: ${this[key]}`)
            .join('\n');
        return additionalInfo ? `${ret}\n${additionalInfo}` : ret;
    }
}
