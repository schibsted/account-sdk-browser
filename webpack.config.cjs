const path = require("path");

const commonRules = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.d\.ts$/,
                use: 'file-loader?name=es5/[name].[ext]',
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            }
        ],
    },
    devtool: 'source-map',
    optimization: {
        minimize: true,
    },
    plugins: [],
}

const cjsConfig = {
    entry: {
        index: './src/es5/index.js',
        identity: './src/es5/identity.js',
        monetization: './src/es5/monetization.js',
        payment: './src/es5/payment.js',
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

module.exports = [cjsConfig, windowConfig]
