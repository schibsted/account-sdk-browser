import { URL } from 'url';
import { urlMapper } from '../url';
import { cloneDefined } from '../object';
import { Fixtures } from '../../__tests__/utils';

const goFn = () => jest.fn().mockImplementation(async ({ pathname }) => {
    if (pathname.startsWith('/hasAccess/')) {
        if (pathname.endsWith('/existing')) {
            return Fixtures.sessionServiceAccess;
        } else if (pathname.endsWith('/non_existing')) {
            return Fixtures.sessionServiceNoAccess;
        } else if (pathname.endsWith('/existing,non_existing')) {
            return Fixtures.sessionServiceAccess;
        }
    }
    throw new Error(`Unimplemented mock response for url: '${pathname}'`);
});

function search(query, useDefaultParams, defaultParams) {
    const params = useDefaultParams ? cloneDefined(defaultParams, query) : cloneDefined(query);
    return Object.keys(params).filter(p => params[p]!=='').map(p => `${encode(p)}=${encode(params[p])}`).join('&');
}

function encode(str) {
    const replace = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '~': '%7E',
        '%20': '+',
        '%00': '\x00'
    };
    return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, match => replace[match]);
}

export const RESTClient = jest.fn().mockImplementation(({ serverUrl = 'PRE', envDic, defaultParams = {} }) => {
    const foo = {
        url: new URL(urlMapper(serverUrl, envDic)),
        defaultParams,
        go: goFn(),
        makeUrl: (pathname = '', query = {}, useDefaultParams = true) => {
            const url = new URL(pathname, foo.url);
            url.search = search(query, useDefaultParams, foo.defaultParams);
            return url.href;
        },
        get: (pathname, data) => {
            return foo.go({ method: 'get', pathname, data });
        },
    }
    return foo;
});

export default RESTClient;
