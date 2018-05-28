/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

/* This file is usually not used by the SDK, but is a simple wrapper to generate a file where the
 * three classes Identity, Monetization and Payment are available on the window object.
 */

'use strict';

const regeneratorRuntime = require('regenerator-runtime');
const { Identity } = require('../identity');
const { Monetization } = require('../monetization');
const { Payment } = require('../payment');

module.exports = { Identity, Monetization, Payment };

Object.assign(window, { Identity, Monetization, Payment, regeneratorRuntime });
