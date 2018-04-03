#!/bin/bash

COMMON_OPTS="--mode=production --module-bind js=babel-loader --devtool source-map"
CJS_OPTS="--output-library-target=commonjs2"
WINDOW_OPTS="--output-library-target=window"

rm -rf es5
webpack src/es5/index.js -o es5/index.js $COMMON_OPTS $CJS_OPTS
webpack src/es5/identity.js -o es5/identity.js $COMMON_OPTS $CJS_OPTS
webpack src/es5/monetization.js -o es5/monetization.js $COMMON_OPTS $CJS_OPTS
webpack src/es5/payment.js -o es5/payment.js $COMMON_OPTS $CJS_OPTS
webpack src/es5/global.js -o es5/global.js $COMMON_OPTS $WINDOW_OPTS
