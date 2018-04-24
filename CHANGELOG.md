# Changelog

## v3.0.0-rc.1 (2018-04-24)

### Breaking changes

* [#24](https://github.com/schibsted/account-sdk-browser/issues/24) — Change from CommonJS to ES
  Modules syntax (that is — change from require/module.exports to using import/export syntax). Yeah,
  this is a change that touched basically all the files in the whole project, but shouldn't really
  change the usage much. It **is** a breaking change for some people using the CommonJS format. If
  you find yourself in this group, your change should be:

      // from when you were using rc.0 or older:
      const Identity = require('@schibsted/account-sdk-browser/identity')

      // to now, using rc.1:
      const { Identity } = require('@schibsted/account-sdk-browser/identity')

  If you already used the syntax `const { Identity } = require('@schibsted/account-sdk-browser')`
  (that is — not the bundle-optimized version), then no change should be necessary

### Fixes

* [#23](https://github.com/schibsted/account-sdk-browser/issues/23) — The `Identity.logout()` docs
  should now be up to date
* An internal usage of fetch was failing and has been fixed. It could cause the `Identity.logout()`
  function to not clear all of its cookies. In the worst case, this could in turn cause the browser
  to be confused about whether a user was logged in or not

### Changes

* The documentation has been updated to have more details about how `redirectUri` is different
  between the old 2.x versions of the SDK and this 3.x version. Also, a section on the OpenID
  Connect parameter `state` has been added

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
