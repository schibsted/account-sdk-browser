# Changelog

## v3.0.0-rc.8 (2018-07-17)

### Fixes

* Remove not logged in user cache on login call https://github.com/schibsted/account-sdk-browser/issues/62

## v3.0.0-rc.7 (2018-07-11)

### Fixes

* There was a caching issue that caused a flood of requests to the Schibsted account hasSession
  endpoint. This is fixed in this release. Please update ASAP!
* The `Payment.purchaseCampaignFlowUrl` function used to have `null` as a default parameter for some
  parameters that were required. This signature has been updated to match the documentation

### Other changes

* Documentation updates

## v3.0.0-rc.6 (2018-06-25)

### Breaking changes

* The `Identity.agreementUrl` has been removed. This function called an endpoint on the Schibsted
  account backend that will be removed due to GDPR, and so it makes no sense to keep it in the SDK.

### Other fixes

* Some (mostly trivial) documentation polish here and there

## v3.0.0-rc.5 (2018-06-21)

### Breaking changes

* The 'visitor' concept is being removed both from the Schibsted account backend and thus also from
  the SDKs. This means that `Identity.getVisitorId` and all references to `visitor` including the
  emitting of the `visitor` event is removed in this version. If you depend on it, now's the time to
  stop doing that.

### Fixes

* The ES5 global file should now work correctly. Yeah — before, I once again failed to fix it, by
  not making sure that the symbol `regeneratorRuntime` was bound to the `window` globally **before**
  loading `Identity`, `Monetization` and `Payment`. Third time's the charm, though 🤞🏼
* Both `Identity.getUserId` and `Identity.getUserUuid` now behave according to their documentation,
  which is to say that they reject the returned Promise if the user is logged in, but not connected
  to this merchant.
* Two functions, `Identity.accountUrl` and `Identity.phonesUrl` did not take a `redirectUri`
  parameter, causing the Schibsted account backend to render a default `Back to [Site]` link on that
  web page. Now you should be able to pick any valid redirect uri here.

## v3.0.0-rc.4 (2018-05-29)

### Fixes

* [#37](https://github.com/schibsted/account-sdk-browser/issues/37) — The files in the `es5`
  directory have been rewritten to CommonJS syntax (yes, like in the good 'ol days). I still don't
  fully understand what was happening here, but at least now it seems like it works for people
* [#40](https://github.com/schibsted/account-sdk-browser/issues/40) — Events are now emitted from
  Identity when a call to `hasSession()` used a cached value
* [#41](https://github.com/schibsted/account-sdk-browser/issues/41) — References to the global
  `window` have all been wrapped in functions, so that it can be loaded in Server-side rendering
  contexts
* The caching could fail if the cache time in milliseconds were greater than `2^31 - 1` (just under
  25 days). This has been fixed by capping the cache time to that maximum value

### Changes

* Documentation for the `Identity` class has been updated

## v3.0.0-rc.3 (2018-05-14)

### Fixes

* [#38](https://github.com/schibsted/account-sdk-browser/issues/38) — Source maps are now included
  for generated ES5 files
* [#22](https://github.com/schibsted/account-sdk-browser/issues/22) — Documented that varnish
  cookies need an Origin that is `!== localhost` for the logic to work in most (all?) browsers
* [#21](https://github.com/schibsted/account-sdk-browser/issues/21) — Fix documentation issue on
  `Monetization.hasProduct` and `Monetization.hasSubscription`

### Changes

* Documentation (the main README.md file) has been updated to point to the SDK Example project in
  case people might want to go look at it
* Be more explicit about the browsers supported in our ES5 generated files. In package.json for
  those who are curious

## v3.0.0-rc.2 (2018-04-30)

### Fixes

* [#31](https://github.com/schibsted/account-sdk-browser/issues/31) — Our internal helper function
  `urlMapper` now doesn't perform calls like `new URL('PRE')` without first checking if `'PRE'` is a
  key in our url map object. This should ensure that outdated browsers like IE11 (that require a
  polyfill for WHATWG `URL`) don't get flustered in this scenario.

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
