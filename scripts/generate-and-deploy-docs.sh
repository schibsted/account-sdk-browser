#!/usr/bin/env sh

# Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
# See LICENSE.md in the project root.
#

# This script will generate jsdocs and push them to the gh-pages branch of the repo. Use with care.

set -e
set -x

# First, see where we are
VERSION=$(git rev-parse HEAD)

# Generate the docs (will clear, and then generate files in docs/ folder)
npm run docs

# Commit it (that commit will be used by 'git subtree' later)
git add -f docs
git commit -m "Docs from version '${VERSION}'"

# Generate a commit SHA — only for the docs folder, using git subtree
SUBTREE=$(git subtree split --prefix docs HEAD)

# Construct a repo path that we have write access to
REPO=https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/schibsted/account-sdk-browser

# Push the commit for that subtree to the gh-pages branch
git push ${REPO} ${SUBTREE}:gh-pages --force

# Reset the commit back to where we were
git reset --hard ${VERSION}
