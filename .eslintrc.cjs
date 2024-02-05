module.exports = {
    extends: [
        'eslint:recommended',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript/base'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2016,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: ['import', '@typescript-eslint'],
    env: {
        commonjs: true,
        browser: true,
        mocha: true,
        es6: true
    },
    rules: {
        'import/extensions': ['error', 'ignorePackages', { js: 'always', jsx: 'never', ts: '', tsx: 'never' }],
        'no-undefined': 'error',
        'no-var': 'error',
        indent: ['error', 4],
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/ban-types': [
            'error',
            {
                types: {
                    Object: false,
                    Function: false,
                },
                extendDefaults: true,
            },
        ],
        '@typescript-eslint/naming-convention': 0,
        'no-unused-vars': 'error',
        'require-jsdoc': [
            'warn',
            {
                require: {
                    FunctionDeclaration: true,
                    ClassDeclaration: true,
                    MethodDefinition: true,
                    ArrowFunctionExpression: false,
                    FunctionExpression: true
                }
            }
        ],
        'valid-jsdoc': [
            'warn',
            {
                requireParamDescription: false,
                requireReturnDescription: false
            }
        ]
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "import/extensions": ["error", "ignorePackages", { "ts": "never" }]
            }
        },
        {
            files: ["*.js", "*.jsx"],
            rules: {
                "import/extensions": ["error", "always", { "js": "always", "ts": "always" }]
            }
        }
    ]
};
