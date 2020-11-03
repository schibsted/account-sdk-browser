/**
 * A simple utility function that allows looking up URLs from a dictionary
 * @memberof core
 * @param {string} url - A url like http://example.com, or a key used for lookup
 * @param {object<string,string>} urlMap - A map of URLs like
 * `{ DEV: 'http://dev.example.com' }`
 * @throws {SDKError} - If the url is not an string or is an empty string
 * @return {string} The url that points to the server
 */
export function urlMapper(url: string, urlMap: any): string;
