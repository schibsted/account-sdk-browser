/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

/* This file is usually not used by the SDK, but is a simple wrapper to generate a file where the
 * three classes Identity, Monetization and Payment are available on the window object.
 */

'use strict';

import 'regenerator-runtime/runtime';

import Identity from '../../identity';
import Monetization from '../../monetization';
import Payment from '../../payment';

Object.assign(window, { Identity, Monetization, Payment });
