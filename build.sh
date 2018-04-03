#!/bin/bash

OPTS="--mode=production --module-bind js=babel-loader --devtool source-map"

rm -rf es5
webpack src/es5/index.js -o es5/index.js $OPTS
webpack src/es5/identity.js -o es5/identity.js $OPTS
webpack src/es5/monetization.js -o es5/monetization.js $OPTS
webpack src/es5/payment.js -o es5/payment.js $OPTS
webpack src/es5/global.js -o es5/global.js $OPTS
