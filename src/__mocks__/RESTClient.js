import { URLSearchParams, URL } from 'url';
import { urlMapper } from '../url';
import { cloneDefined } from '../object';
import { Fixtures } from '../../__tests__/utils';
import SDKError from '../../src/SDKError';

const goFn = () => jest.fn().mockImplementation(async ({ pathname, data = {} }) => {
    const search = new URLSearchParams(data);
    if (pathname.startsWith('/hasProduct/')) {
        if (pathname.endsWith('/existing')) {
            return Fixtures.spidProduct;
        } else if (pathname.endsWith('no-session-cookie')) {
            throw new SDKError('Session cookie (schacc-session) missing', { code: 400 });
        } else if (pathname.endsWith('no-session')) {
            throw new SDKError('No session', { code: 401 });
        }
    }
    if (pathname.startsWith('/hasSubscription/')) {
        if (pathname.endsWith('/existing')) {
            return Fixtures.spidProduct;
        } else if (pathname.endsWith('no-session-cookie')) {
            throw new SDKError('Session cookie (schacc-session) missing', { code: 400 });
        } else if (pathname.endsWith('no-session')) {
            throw new SDKError('No session', { code: 401 });
        }
    }
    if (pathname.startsWith('/hasAccess/')) {
        if (pathname.endsWith('/existing')) {
            return Fixtures.sessionServiceAccess;
        } else if (pathname.endsWith('/non_existing')) {
            return Fixtures.sessionServiceNoAccess;
        } else if (pathname.endsWith('/existing,non_existing')) {
            return Fixtures.sessionServiceAccess;
        }
    }
    if (pathname === 'ajax/hasproduct.js') {
        const productId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (productId) {
        case 'existing':
            return Fixtures.spidProduct;
        case 'existing_no_expires':
            return Fixtures.spidProductNoExpires;
        case 'existing_for_john':
            if (spId === 'john') {
                return Fixtures.spidProduct;
            }
        }
        return Fixtures.spidProductMissing;
    }
    if (pathname === 'ajax/hassubscription.js') {
        const subscriptionId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (subscriptionId) {
        case 'existing':
            return Fixtures.spidProduct;
        case 'existing_no_expires':
            return Fixtures.spidProductNoExpires;
        case 'existing_for_john':
            if (spId === 'john') {
                return Fixtures.spidProduct;
            }
        }
        return Fixtures.spidProductMissing;
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
