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
    constructor(message: string, errorObject?: any);
}
