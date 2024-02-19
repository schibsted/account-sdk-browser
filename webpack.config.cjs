const path = require("path");

const commonRules = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
        ],
    },
    devtool: 'source-map',
    optimization: {
        minimize: true,
    },
    plugins: [],
}

const tsConfig = {
    mode: 'production',
    entry: './index.ts',
    output: {
        filename: 'es5/[name].min.js',
        path: __dirname,
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: [/node_modules/, /\.d\.ts$/],
            }
        ]
    }
}

const cjsConfig = {
    entry: {
        identity: './src/identity.ts',
        monetization: './src/monetization.ts',
        payment: './src/payment.ts',
    },
    output: {
        path: path.resolve(__dirname, 'es5'),
        filename: '[name].min.js',
        library: {
            type: 'commonjs2'
        }
    },
    ...commonRules,
};

const windowConfig = {
    entry: {
        global: './src/es5/global.js',
    },
    output: {
        path: path.resolve(__dirname, 'es5'),
        filename: '[name].min.js',
        library: {
            type: 'window'
        }
    },
    ...commonRules,
}

module.exports = [tsConfig]
