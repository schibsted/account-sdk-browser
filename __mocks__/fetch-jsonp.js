import { URL } from 'url';
import { Fixtures } from '../__tests__/utils';

const mock = async (url) => {
    const { pathname, searchParams: search } = new URL(url);
    const autologin = search.get('autologin');
    if (autologin === 'true') {
        return { ok: true, json: async () => Fixtures.hasSessionLoginRequired };
    }
    if (pathname === '/rpc/hasSession.js') { // hasSession
        if (autologin === '1') {
            return { ok: true, json: async () => Fixtures.hasSessionLoginRequired };
        } else if (autologin === '0') {
            return { ok: true, json: async () => Fixtures.hasSessionUserException };
        } else {
            return { ok: false };
        }
    }
    if (pathname === '/ajax/hasSession.js') { // SPiD
        return { ok: true, json: async () => Fixtures.spidOk };
    } else if (pathname === '/ajax/hasproduct.js') {
        const productId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (productId) {
        case 'existing':
            return { ok: true, json: async () => Fixtures.spidProduct };
        case 'existing_no_expires':
            return { ok: true, json: async () => Fixtures.spidProductNoExpires };
        case 'existing_for_john':
            if (spId === 'john') {
                return { ok: true, json: async () => Fixtures.spidProduct };
            }
        }
        return { ok: true, json: async () => Fixtures.spidProductMissing };
    } else if (pathname === '/ajax/hassubscription.js') {
        const subscriptionId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (subscriptionId) {
        case 'existing':
            return { ok: true, json: async () => Fixtures.spidProduct };
        case 'existing_no_expires':
            return { ok: true, json: async () => Fixtures.spidProductNoExpires };
        case 'existing_for_john':
            if (spId === 'john') {
                return { ok: true, json: async () => Fixtures.spidProduct };
            }
        }
        return { ok: true, json: async () => Fixtures.spidProductMissing };
    } else if (pathname === '/ajax/logout.js') {
        return { ok: true, json: async () => {} };
    }
    return { statusText: `Unimplemented mock response for url: '${url}'` };
}

const mockFn = jest.fn().mockImplementation(mock);

module.exports = mockFn;
