# Changelog

## v3.0.0-beta.4 (2018-03-19)

### New features

* There is only one change in this release, and that is the addition of a `loginHint` parameter on
  the `Indentity.login()` and `Identity.loginUrl()` functions. This enables the caller to pre-fill
  the user identifier (email or phone number)

## v3.0.0-beta.3 (2018-03-16)

### Fixes

* Issue #8 is fixed by not relying on URLSearchParams to create query strings.

## v3.0.0-beta.2 (2018-03-09)

This release has only one notable change, and it is the fix from [this
PR](https://github.com/schibsted/account-sdk-browser/pull/7) so we correctly fall back to calling
SPiD when a call to the hasSession service fails with a LoginException. Thanks to Terje Andersen who
found and helped to identify this issue.

## v3.0.0-beta.1 (2018-03-06)

This is the initial public release. Hello, world!
