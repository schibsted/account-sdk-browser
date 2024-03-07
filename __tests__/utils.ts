/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

export type ForceMutable<T> = {
    -readonly [K in keyof T]: T[K];
};

export const throwingFnMsg = 'TEST THROW';
export const throwingFn = () => { throw new Error(throwingFnMsg);};

function stringifySearchParams(search: URLSearchParams): string {
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
export function expectUrlsToMatch(first: string, second: string): URL[] {
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
    expect(stringifySearchParams(firstUrl.searchParams)).toEqual(stringifySearchParams(secondUrl.searchParams));
    return [firstUrl, secondUrl];
}

const sessionResponse = {
    result: true,
    serverTime: 1520610964,
    expiresIn: 300,
    id: '59e9eaaaacb3ad0aaaedaaaa',
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    sdrn: 'sdrn:spid.no:user:12345',
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
    sig: 'some-encrypted-value',
    pairId: 'b2a23caae8ead566099b43b2b33f0cd344f66d50a62034ccbe8bbaa435fd760e',
};
const sessionServiceAccess = {
    entitled: true,
    allowedFeatures: ['existing'],
    ttl: 10,
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    sig: 'ZUtX5e7WJcLl69m-puKJlFc413ZPi7wnMLTa_M9TFiU.eyJlbnRpdGxlZCI6dHJ1ZSwiYWxsb3dlZEZlYXR1cmVzIjpbImZlYXR1cmUtMSIsInByb2R1Y3RpZC0xIl0sInR0bCI6MTAsInVzZXJJZCI6MTIzNDUsInV1aWQiOiJ1c2VyVXVpZCIsImFsZ29yaXRobSI6IkhNQUMtU0hBMjU2In0',
};

const sessionServiceNoAccess = {
    entitled: false,
    allowedFeatures: [],
    ttl: 0,
    userId: 12345,
    uuid: 'aaaaaaaa-de42-5c4b-80ee-eeeeeeeeeeee',
    sig: 'Rqf5fQ-gXNOdrsegajNgTOzju5z9-0v92v-PGCnL5P8.eyJlbnRpdGxlZCI6ZmFsc2UsImFsbG93ZWRGZWF0dXJlcyI6W10sInR0bCI6MCwidXNlcklkIjoxMjM0NSwidXVpZCI6InVzZXJVdWlkIiwiYWxnb3JpdGhtIjoiSE1BQy1TSEEyNTYifQ',
};

export const Fixtures = {
    sessionResponse,
    sessionServiceAccess,
    sessionServiceNoAccess,
};
