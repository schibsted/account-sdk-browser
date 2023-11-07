export default {
    testEnvironmentOptions: {
        url: 'http://spid.no'
    },
    testPathIgnorePatterns: [
        '/node_modules/(?!(node-fetch))',
        '__tests__/utils.js',
    ],
    testEnvironment: "./jest.test-env.js",
    transform: {
        "^.+\\.(js)$": "babel-jest",
    },
    globals: {
        fetch: global.fetch,
    }
};
