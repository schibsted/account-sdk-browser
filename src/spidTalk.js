/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

/**
 * A workaround for how SPiD handles JSONP calls in the browser
 * @private
 */

const { isFunction } = require('./validate');

/**
 * This is a workaround for making the old SPiD/hassess on JSONP APIs compatible with more common
 * JSONP convention where the callback function is expected to exist in the global object.
 *
 * How does it work?
 * =================
 * The old SPiD JSONP APIs relied on SPiD.Talk.response(callbackName, data) but fetch-jsonp
 * merely calls window[callbackName](data) which is more common practice. This module simply acts
 * as an adapter to modernize the old mechanism until we support CORS.
 * To see how the SPiD solution works, try to run a simple JSONP request or debug it in netowrk tab.
 * This module will be removed when CORS is supported.
 * @memberof core
 * @param {object} global - a reference to the global object if SPiD SDK is used in the var mode
 *        you can also pass a reference to SPiD directly in which case the `objectName` param should
 *        be omitted.
 * @return {void}
 */
function emulate(global) {
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

module.exports = { emulate };
