const path = require("path");
const dev = {
    // Change to your "entry-point".
    mode: "none",
    devtool: 'source-map',
    entry: {
        index: "./src/es5/index.js",
        identity: "./src/es5/identity.js",
        monetization: "./src/es5/monetization.js",
        payment: "./src/es5/payment.js",
    },

    output: {
        path: path.resolve(__dirname, "es5"),
        filename: "[name].js",
        libraryTarget: "commonjs2",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
    },
    module: {
        rules: [
            {
                // Include ts, tsx, js, and jsx files.
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
        ],
    },
};
const prod = {
    ...dev,
    mode: "production",
    output: {
        path: path.resolve(__dirname, "es5"),
        filename: "[name].min.js",
    },
};
const devGlobal = {
    ...dev,
    entry: {
        global: "./src/es5/global.js",
    },
    output: {
        path: path.resolve(__dirname, "es5"),
        filename: "[name].js",
        libraryTarget: "window"
    },
};
const prodGlobal = {
    ...devGlobal,
    mode: "production",
    output: {
        path: path.resolve(__dirname, "es5"),
        filename: "[name].min.js",
        libraryTarget: "window"
    },
};
module.exports = [prod, dev, prodGlobal, devGlobal];
