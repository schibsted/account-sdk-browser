/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

window.regeneratorRuntime = require('regenerator-runtime');

const { Identity } = require('../identity');
const { Monetization } = require('../monetization');
const { Payment } = require('../payment');

module.exports = { Identity, Monetization, Payment };
