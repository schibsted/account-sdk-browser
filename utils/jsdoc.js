/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

export default {
    plugins: ['plugins/markdown' ],
    encoding: 'utf8',
    recurseDepth: 10,
    source: {
        include: [
            'src',
        ],
        includePattern: /.+\.js$/,
        excludePattern: /(node_modules|dist)/
    },
    sourceType: 'module',
    opts: {
        destination: './docs',
        encoding: 'utf8',
        readme: './README.md',
        recurse: true,
        template: 'node_modules/docdash',
    },
    templates: { cleverLinks: true },
    docdash: {
        static: true,
        sort: false,
        sectionOrder: [ // works in torarvids fork, and: https://github.com/clenemt/docdash/pull/34
            'Tutorials',
            'Modules',
            'Namespaces',
            'Classes',
            'Interfaces',
            'Events',
            'Externals',
            'Mixins',
        ],
    },
}
