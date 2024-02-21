export default {
    preset: 'ts-jest',
    testEnvironmentOptions: {
        url: 'http://spid.no'
    },
    testPathIgnorePatterns: [
        '__tests__/utils.js',
    ],
    testEnvironment: "./jest.test-env.ts",
    transform: {
        "^.+\\.(js)$": "babel-jest",
        '^.+\\.ts?$': 'ts-jest',
    },
    globals: {
        fetch: global.fetch,
    }
};
