/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { Optional } from './types';
import { isNonEmptyObj } from './validate';

/**
 * Represents a SDK error. This is returned from all rejected promises that are returned from an API
 * call. Constructs an SDK error ready to throw
 * @summary When the SDK throws an error, it's supposed to be an instance of this class
 * @private
 */
export default class SDKError extends Error {
    /**
     * @extends {Error}
     * @param {string} message - The error message
     * @param {object} [errorObject] - The error object that was returned from the server. Any
     * property of errorObject object will be copied into this instance SDKError
     */
    constructor(message: string, errorObject?: Partial<SDKError>) {
        super(message);
        this.message = message;
        if (isNonEmptyObj(errorObject)) {
            try {
                // At this point it doesn't matter if errorObject === null
                Object.assign(this, errorObject);
            } catch (err) {
                // silent
            }
        }
    }

    override readonly name: Readonly<string> = 'SDKError';

    override readonly message: Readonly<string>;

    readonly code: Readonly<Optional<number>>;

    /**
     * Serializes the error printing any interesting additional info
     * @private
     * @return {String}
     */
    override toString(): string {
        return `${this.name}: ${this.message}\n${this.stack}`;
    }
}
