import { URL } from 'url';

const mock = async (url) => {
    const { pathname } = new URL(url);
    if (pathname === '/ajax/logout.js') {
        return { ok: true, json: async () => {} };
    }
    return { statusText: `Unimplemented mock response for url: '${url}'` };
}

const mockFn = jest.fn().mockImplementation(mock);

module.exports = mockFn;
