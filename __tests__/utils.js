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
