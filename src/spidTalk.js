/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

/**
 * A workaround for how Schibsted account handles JSONP calls in the browser
 * @private
 */

import { isFunction } from './validate.js';

/**
 * This is a workaround for making the old SPiD/hassession on JSONP APIs compatible with more common
 * JSONP convention where the callback function is expected to exist in the global object.
 *
 * How does it work?
 * =================
 * The old SPiD JSONP APIs relied on SPiD.Talk.response(callbackName, data) but fetch-jsonp merely
 * calls window[callbackName](data) which is more common practice. This module simply acts as an
 * adapter to modernize the old mechanism until we support CORS. To see how the SPiD solution works,
 * try to run a simple JSONP request or debug it in netowrk tab. This module will be removed when
 * CORS is supported.
 * @memberof core
 * @param {object} global - a reference to the global object
 * @return {void}
 */
export function emulate(global) {
    if (global.SPiD === null || typeof global.SPiD !== 'object') {
        global.SPiD = {};
    }
    if (global.SPiD.Talk === null || typeof global.SPiD.Talk !== 'object') {
        global.SPiD.Talk = {}
    }
    if (!isFunction(global.SPiD.Talk.response)) {
        global.SPiD.Talk.response = (callbackName, data) => global[callbackName](data);
    }
}
