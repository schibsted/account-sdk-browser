/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

import * as spidTalk from '../src/spidTalk.js';

describe('spidTalk', () => {
    test('should be able to call response function', () => {
        const wnd = {};
        spidTalk.emulate(wnd);
        wnd['test_function'] = jest.fn((...args) => {
            if (args.length !== 1) {
                throw new Error(`Should be called with exactly one arg. Something's up!`);
            }
            return args[0];
        });
        const ret1 = wnd.SPiD.Talk.response('test_function', 'a', 'b'); // 'b' should be ignored
        expect(ret1).toBe('a');
        expect(wnd.SPiD.Talk.response('test_function')).toBeUndefined();
    });
});
