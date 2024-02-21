import { TextEncoder, TextDecoder } from 'util';
import JSDOMEnvironment from 'jest-environment-jsdom';

/**
 * Custom Jest env with missing definitions
 * https://github.com/jsdom/jsdom/issues/2524
 */
export default class CustomJsDomEnv extends JSDOMEnvironment {
    // eslint-disable-next-line require-jsdoc
    constructor(...args: unknown[]) {
        //@ts-ignore
        const { global } = super(...args);
        if (!global.TextEncoder)
            global.TextEncoder = TextEncoder;
        if (!global.TextDecoder)
            global.TextDecoder = TextDecoder;
        global.fetch = fetch;
    }
}
