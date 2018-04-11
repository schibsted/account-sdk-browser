# Changelog

## v3.0.0-rc.0 (2018-04-10)

### Breaking changes

* The function `Identity.getUserUuidId` is renamed to `Identity.getUserUuid`. This was a typo in the
  previous function name that was not detected until now :-/
* The function `Identity.getSpId` now returns `string|null` instead of `string|undefined`.

### Fixes

* The Identity class now clears its internal cache if `enableVarnishCookie()` is called. Previously,
  calling `hasSession` after calling `enableVarnishCookie` would re-use any cached value and thus
  skip setting the varnish cookie.

### Changes

* The function `Identity.getVisitorId` is now marked `async` in the codebase. It always returned a
  Promise, so functionally it does the same as before. Syntax has just been modernised.

## v3.0.0-beta.7 (2018-04-03)

### Fixes

* Webpack options needed tweaking, so -beta.6 didn't work at all. The code in this version is
  otherwise identical to -beta.6, so the `build.sh` script has the only change.

## v3.0.0-beta.6 (2018-04-03) — removed from npm, didn't work

### New features

* ES5 generation has been added. This is an opt-in feature, so a user can do:

      // Either 1)
      const Account = require('@schibsted/account-sdk-browser');
      // ... or 2)
      const Account = require('@schibsted/account-sdk-browser/es5');
      
      // The shortcuts work as well (if you only want Identity stuff, for instance):
      const Identity = require('@schibsted/account-sdk-browser/es5/identity');

### Changes

* Removed `parcel-bundler` and started using `webpack` instead. This was done to ease the production
  of ES5 code

## v3.0.0-beta.5 (2018-03-21)

### Fixes

* An issue where `Identity.hasSession` would call the backend server(s) with a wrong autologin
  parameter has been fixed. This could potentially cause the user to not be auto-logged-in when they
  were supposed to be

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
