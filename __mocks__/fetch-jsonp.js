import { URL } from 'url';

const mockHasSessionLoginRequired = {
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
const mockHasSessionUserException = {
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
const mockSPiDOk = {
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
const mockSPiDProduct = {
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
const mockSPiDProductNoExpires = {
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
const mockSPiDProductMissing = {
    result: false
};

const mock = async (url) => {
    const { pathname, searchParams: search } = new URL(url);
    const autologin = search.get('autologin');
    if (autologin === 'true') {
        return { ok: true, json: async () => mockHasSessionLoginRequired };
    }
    if (pathname === '/rpc/hasSession.js') { // hasSession
        if (autologin === '1') {
            return { ok: true, json: async () => mockHasSessionLoginRequired };
        } else if (autologin === '0') {
            return { ok: true, json: async () => mockHasSessionUserException };
        } else {
            return { ok: false };
        }
    }
    if (pathname === '/ajax/hasSession.js') { // SPiD
        return { ok: true, json: async () => mockSPiDOk };
    } else if (pathname === '/ajax/hasproduct.js') {
        const productId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (productId) {
        case 'existing':
            return { ok: true, json: async () => mockSPiDProduct };
        case 'existing_no_expires':
            return { ok: true, json: async () => mockSPiDProductNoExpires };
        case 'existing_for_john':
            if (spId === 'john') {
                return { ok: true, json: async () => mockSPiDProduct };
            }
        }
        return { ok: true, json: async () => mockSPiDProductMissing };
    } else if (pathname === '/ajax/hassubscription.js') {
        const subscriptionId = search.get('product_id');
        const spId = search.get('sp_id');
        switch (subscriptionId) {
        case 'existing':
            return { ok: true, json: async () => mockSPiDProduct };
        case 'existing_no_expires':
            return { ok: true, json: async () => mockSPiDProductNoExpires };
        case 'existing_for_john':
            if (spId === 'john') {
                return { ok: true, json: async () => mockSPiDProduct };
            }
        }
        return { ok: true, json: async () => mockSPiDProductMissing };
    }
    return { statusText: `Unimplemented mock response for url: '${url}'` };
}

const mockFn = jest.fn().mockImplementation(mock);

module.exports = mockFn;
