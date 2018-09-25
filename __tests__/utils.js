/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

function stringify(search) {
    const keys = [...new Set(search.keys())];
    keys.sort();
    return keys.map(k => {
        const v = search.getAll(k);
        v.sort();
        return `'${k}'='${v.join(' / ')}'`;
    }).join(' & ');
}

/**
 * Compares two urls
 * @param {string} first - the first url
 * @param {string} second - the second url
 * @return {Array} - returns the URL objects that are made from first and second
 */
export function compareUrls(first, second) {
    const firstUrl = new URL(first);
    const secondUrl = new URL(second);
    expect(firstUrl).toBeDefined();
    expect(secondUrl).toBeDefined();
    expect(firstUrl.hash).toBe(secondUrl.hash);
    expect(firstUrl.host).toBe(secondUrl.host);
    expect(firstUrl.hostname).toBe(secondUrl.hostname);

    expect(firstUrl.origin).toBe(secondUrl.origin);
    expect(firstUrl.username).toBe(secondUrl.username);
    expect(firstUrl.password).toBe(secondUrl.password);
    expect(firstUrl.pathname).toBe(secondUrl.pathname);
    expect(firstUrl.port).toBe(secondUrl.port);
    expect(firstUrl.protocol).toBe(secondUrl.protocol);
    expect(stringify(firstUrl.searchParams)).toEqual(stringify(secondUrl.searchParams));
    return [firstUrl, secondUrl];
}

/**
 * Same as {@link compareUrls}  but expects the searchParams in the exact same order
 * @param {string} first - the first url
 * @param {string} second - the second url
 * @return {void}
 */
export function compareUrlsStrict(first, second) {
    const [firstUrl, secondUrl] = compareUrls(first, second);
    expect(firstUrl.href).toBe(secondUrl.href);
    expect(firstUrl.search).toBe(secondUrl.search);
}

const hasSessionLoginRequired = {
    error: {
        code: 401,
        type: 'LoginException',
        description: 'Autologin required'
    },
    response: {
        result: false,
        serverTime: 1520599943,
        expiresIn: null,
        baseDomain: 'localhost',
    }
};
const hasSessionUserException = {
    error: {
        code: 401,
        type: 'UserException',
        description: 'No session found'
    },
    response: {
        result: false,
        serverTime: 1520599943,
        expiresIn: null,
        baseDomain: 'localhost',
    }
};
const spidOk = {
    result: true,
    serverTime: 1520610964,
    expiresIn: 2592000,
    id: '59e9eaaaacb3ad0aaaedaaaa',
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    displayName: 'bruce_wayne',
    givenName: 'Bruce',
    familyName: 'Wayne',
    gender: 'withheld',
    photo: 'https://secure.gravatar.com/avatar/1234?s=200',
    tracking: true,
    userStatus: 'connected',
    clientAgreementAccepted: true,
    defaultAgreementAccepted: true,
    sp_id: 'some-jwt-token',
    sig: 'some-encrypted-value'
};
const spidProduct = {
    result: true,
    serverTime: 1520610964,
    expiresIn: 2592000,
    id: '59e9eaaaacb3ad0aaaedaaaa',
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    displayName: 'bruce_wayne',
    givenName: 'Bruce',
    familyName: 'Wayne',
    gender: 'withheld',
    photo: 'https://secure.gravatar.com/avatar/1234?s=200',
    tracking: true,
    userStatus: 'connected',
    clientAgreementAccepted: true,
    defaultAgreementAccepted: true,
    sp_id: 'some-jwt-token',
    sig: 'some-encrypted-value'
};
const spidProductNoExpires = {
    result: true,
    serverTime: 1520610964,
    id: '59e9eaaaacb3ad0aaaedaaaa',
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    displayName: 'bruce_wayne',
    givenName: 'Bruce',
    familyName: 'Wayne',
    gender: 'withheld',
    photo: 'https://secure.gravatar.com/avatar/1234?s=200',
    tracking: true,
    userStatus: 'connected',
    clientAgreementAccepted: true,
    defaultAgreementAccepted: true,
    sp_id: 'some-jwt-token',
    sig: 'some-encrypted-value'
};
const spidProductMissing = {
    result: false
};

export const Fixtures = {
    hasSessionLoginRequired,
    hasSessionUserException,
    spidOk,
    spidProduct,
    spidProductNoExpires,
    spidProductMissing,
};
