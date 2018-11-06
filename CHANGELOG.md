# Changelog

## v3.0.1 (2018-11-06)

## Fixes

* Fix LOCAL SDRN namespace
* Silent error on Object.assign in SDKError for ios 9
* Update jest

## v3.0.0 (2018-10-15)

## Fixes

* Fix LOCAL SDRN namespace 

## v3.0.0 (2018-10-15)

## Removed rc

## Fixes

* fix typeof in clearVarnishCookie

## v3.0.0-rc.21 (2018-10-10)

## Semi-breaking ish changes

* Monetization functions `hasProduct` and `hasSubscription` didn't list `@throws` in the docs, even
  though there was always a chance of those functions throwing SDKError if anything went wrong
  during a network call. Also, the `spId` parameter is back to being a required parameter, since
  it's used when caching results (and without it, cache data could in theory span different users)

## Fixes

* Monetization functions `hasProduct` and `hasSubscription` now fall back to calling the Schibsted
  account backend if a call to the session-service fails with a 400 error (meaning a session-cookie
  is not present).

## Changes

* Monetization functions `hasProducts` and `hasSubscription` now caches both failures (for 10
  seconds) and successes (for 1 hour)

## v3.0.0-rc.20 (2018-10-09)

### Fixes

* Setting a Varnish cookie (the `SP_ID` cookie) will now be done with a top-level domain as the
  domain value. So if done from some.sub.site.example, we will use `domain=site.example`. Thanks to
  @olekenneth for fixing it

## v3.0.0-rc.19 (2018-09-28)

### Breaking changes

* If you are using the session-service, calls to `Identity.hasSession` will not return the obsolete
  `userStatus` or `id` fields (the numeric `userId` and the `uuid` fields are still returned).
* Calling `Identity.hasSession` multiple times will now cause only one network call. While this call
  is running, other calls to `Identity.hasSession` will simply wait for that call to complete, and
  then they will all resolve to the same result

### New features

* We can communicate with the session-service instead of Schibsted account in `Identity.hasSession`,
  `Monetization.hasProduct` and `Monetization.hasSubscription` (quick howto; to opt into this, add a
  param `sessionDomain: 'https://id.site.example'` to the constructor for Identity and Monetization)

## v3.0.0-rc.18 (2018-09-18 — second one today, yay 🎉)

### Breaking changes

* The `Identity.logout()` function is no longer an `async` function, and now does a full-page
  redirect to the Schibsted account domain to log the user out. This is because we can't trust that
  the XHR way of logging people out will work for Safari 12 users. Sorry for the breaking change,
  but at least it works in a consistent way. It now also takes a parameter `redirectUri` that
  defaults to the `redirectUri` from the `Identity` constructor. The browser will be redirected
  there after Schibsted account has logged the user out

## v3.0.0-rc.17 (2018-09-18)

### Fixes

* Varnish cookie fixes: 1) The localstorage item was wrongly cleared when calling
  `Identity.enableVarnishCookie()`, and 2) The varnish cookie was not removed correctly when calling
  `Identity.logout()`.

## v3.0.0-rc.16 (2018-09-14)

### Fixes

* ITP: Set the z-index of the ITP dialog to a "zooper high value" to 🤞🏼 ensure 🤞🏼 that it hovers
  above the main site content

## v3.0.0-rc.15 (2018-09-06)

### New features

* Support for new `Identity.login` parameters: `tag`, `teaser` and `maxAge`
* ITP: There are explicit methods in Identity for users that don't use the `login` method. See the
  docs for
  [showItpModalUponReturning](https://schibsted.github.io/account-sdk-browser/Identity.html#showItpModalUponReturning)
  and
  [suppressItpModal](https://schibsted.github.io/account-sdk-browser/Identity.html#suppressItpModal)
  if you're interested

### Breaking changes (ish)

* The `Identity.loginUrl` method used to take a lot of arguments, and with this release it was about
  to become even more (with the added `tag`, `teaser` and `maxAge` params mentioned above). This
  release changes the signature to have a single `options` object instead of the argument list. In
  this case we made it backwards-compatible, so it won't break (YET!) if you continue using an
  argument list. Beware though, that passing a list of arguments is considered DEPRECATED as of now
* The es5 folder now contains both minified and unminified code. The minified ones have the
  `.min.js` suffix. Before, only minified files were published, so if you're using those, you might
  suddenly have bigger files than you did before. Sorry.. 🤷🏼‍

### Fixes

* [#76](https://github.com/schibsted/account-sdk-browser/issues/76) — Login on Chrome/iOS should now
  work once again

## v3.0.0-rc.14 (2018-09-03)

### Changes

* The only change is adding a typings file to the `es5` folder. There are no functional changes from
  rc.13

## v3.0.0-rc.13 (2018-08-31)

### Fixes

* The "Safari 12 ITP2 workaround" from v3.0.0-rc.11 had a bug where we passed the wrong query
  parameter to the ITP dialog, so the dialog then failed to post a message back to the parent page.
  In conclusion; calls to `Identity.hasSession` would still fail 😭.

## v3.0.0-rc.12 (2018-08-30)

This release is identical to rc.11 but includes index.d.ts in the npm package.

## v3.0.0-rc.11 (2018-08-30)

### New features

* Initial support for Safari 12. For users of this browser, there could be issues related to
  Intelligent Tracking Prevention (ITP) v2. For the people who experience it, it would be impossible
  to detect whether you're logged in or not from a given site (because cookies to Schibsted account
  would be blocked because it's a third party). The Apple way to solve this, is to call
  `requestStorageAccess` from an iframe, and let the user choose "Allow" in a scary Safari dialog.
  Then cookies will once more be allowed to go to that third party. This SDK will now work around
  this by showing a friendlier dialog before calling `requestStorageAccess` so people are hopefully
  more inclined to click "Allow".

## v3.0.0-rc.10 (2018-08-10)

### Fixes

* [#68](https://github.com/schibsted/account-sdk-browser/issues/68) — Cache was not cleared after
  calling `Identity.logout()` or `Identity.enableVarnishCache`

## v3.0.0-rc.9 (2018-08-08)

### Fixes

* Upgraded regenerator-runtime to fix [this CSP
  issue](https://github.com/facebook/regenerator/issues/336) (courtesy of @henninga)
* [#64](https://github.com/schibsted/account-sdk-browser/issues/64) — This issue was fixed in two
  ways. First, by changing the implementation so we set the Varnish cookie on every call to
  `hasSession` (before we didn't do so when a `hasSession` returned cached data). Second, we
  introduced an optional parameter `expiresIn` on the `Identity.enableVarnishCookie` where you can
  override the default expiry of the Varnish cookie.
* [#54](https://github.com/schibsted/account-sdk-browser/issues/54) — Ensure that we clear the
  Varnish cookie when a user logs out.

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
