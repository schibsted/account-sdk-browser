/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

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
    constructor(message: string, errorObject?: Error) {
        super(message);
        this.name = 'SDKError';
        if (typeof errorObject === 'object') {
            try {
                // At this point it doesn't matter if errorObject === null
                Object.assign(this, errorObject);
            } catch (err) {
                // silent
            }
        }
    }

    /**
     * Serializes the error printing any interesting additional info
     * @private
     * @return {String}
     */
    override toString(): string {
        return `${this.name}: ${this.message}\n${this.stack}`;
    }
}
