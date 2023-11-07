import { TextEncoder, TextDecoder } from 'util';
import pkg from 'jest-environment-jsdom';
const { default: JSDOMEnvironment } = pkg;

/**
 * Custom Jest env with missing definitions
 * https://github.com/jsdom/jsdom/issues/2524
 */
export default class CustomJsDomEnv extends JSDOMEnvironment {
    constructor(...args) {
        const { global } = super(...args);
        if (!global.TextEncoder)
            global.TextEncoder = TextEncoder;
        if (!global.TextDecoder)
            global.TextDecoder = TextDecoder;
    }
}
