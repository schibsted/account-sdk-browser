# Schibsted Account SDK v6.0.0 Migration Guide

## Overview

Version 6 replaces the separate `Identity` and `Monetization` APIs with one `Account` API. Most
commonly used methods keep their names, but initialization, globals, imports, and events have
changed. The Payment API and other unsupported legacy APIs have been removed.

Version 6 supports ES modules only. The ES5 build and SDK-provided polyfills are no longer
included.

The goal is to give browser applications one clear integration point and reduce the public API to
the parts actively supported by the SDK.

## What you need to do

### Site developers

- Assess the needed changes and plan your upgrade. 
- Note that v5 is effectively deprecated. Libraries your site depends on (e.g. Advertory,
  Sourcepoint, video players) should be upgraded to support v6. If a dependency is not ready yet,
  use the temporary compatibility layer described below while migrating your own code to Account.

### Library developers

If your library depends on `@schibsted/account-sdk-browser`, update it so sites do not need to rely
on the temporary compatibility layer. Choose one of the following:

- Upgrade your library to support both v5 (`Identity`) and v6 (`Account`) APIs in parallel. The two
  are runtime-compatible, so this can ship as a non-breaking release. 
- Or make a breaking-change release of your library that supports only v6.

> Integrating by reading an expected `window.Identity`, `window.SPiD_Identity`, or similar global is
> no longer recommended.

## Temporary backward compatibility

Account SDK v6 provides an optional compatibility layer for dependencies that still expect the v5
Identity and Monetization globals. Application code should still be migrated to the `Account` API;
the shims are only a temporary bridge for libraries that have not been updated yet.

Enable compatibility before creating Account:

```ts
import { createAccountSdk } from '@schibsted/account-sdk-browser';
import { enableLegacyCompatibility } from '@schibsted/account-sdk-browser/compatibility';

enableLegacyCompatibility();
const account = createAccountSdk(config);
```

The legacy Identity `clientId`, `env`, and `redirectUri` properties are read from the Account
configuration; migrate them to `account.clientId`, `account.env`, and
`account.redirectUri`. If Account has already been created, calling `enableLegacyCompatibility()` installs
the shims immediately. Pass `{ window }` when Account was created on a provided browser window.

Enable compatibility where Account is initialized, using the same SDK module instance. Remove the
old Identity/Monetization initialization first.

If a wrapper creates Account for your application, migrate the wrapper to v6 and enable
compatibility inside it, using its SDK imports—not a separate SDK copy in the application.

If Sourcepoint uses a custom Identity reference, point it to the shim.

The compatibility layer provides:

- `window.schIdentity` and `window.Identity` with supported Identity methods delegated to Account;
- `window.schMonetization` with `hasAccess()` and `clearCachedAccessResult()` delegated to Account;
- the `schIdentity:ready` and `schMonetization:ready` window events, with the corresponding shim in
  `event.detail.instance`;
- the legacy Identity `clientId`, `env`, `redirectUri`, and `_session` properties;
- the legacy Identity `logout` subscription used by Sourcepoint. It fires when a logout flow starts
  and when a session update detects that the previous user has logged out. Other Identity instance
  events remain removed.

The `logout` subscription accepts the v5 `on('logout', listener, context)` signature. During a
session update, listeners can still read the previous `_session`. Synchronous exceptions from each
listener are reported to `console.error` and do not prevent other listeners or the Account session
update from completing.

The Identity shim also accepts the legacy positional
`loginUrl(state, acrValues, scope, redirectUri, loginHint, tag, teaser, maxAge)` signature, preserving
the v5 defaults. Migrate this usage to `account.loginUrl({ ... })` in application code and let
the configured [`generateState`](#10-generate-login-state-in-the-account-configuration) provide
`state`.

The legacy `userId` argument passed to `schMonetization.hasAccess()` is ignored. Account resolves
the currently logged-in user before performing the access check. This can perform a session lookup
even when Sourcepoint supplied a user id; if the current user cannot be resolved, the check fails.

The compatibility layer does not restore:

- Identity and Monetization constructors or their old package imports;
- Identity instance events other than `logout`, and all Monetization instance events;
- `enableVarnishCookie()`;
- `logSettings()`, `phonesUrl()`, `subscriptionsUrl()`, or `productsUrl()`;
- the Payment API.

Each legacy global or property access and method call emits a deprecation warning with its Account
replacement. Only the compatibility installation warning is shown once per page load. Do not use
the shims in new code, and remove `enableLegacyCompatibility()` after all dependencies support the
Account API. The entire compatibility entrypoint will be removed in v7.

## Migration at a glance

1. Upgrade `@schibsted/account-sdk-browser` to v6.
2. Replace `Identity` and `Monetization` instances with one `Account` created by
   `createAccountSdk()`.
3. Initialize the SDK once per browser window. Use the returned `Account` instance or
   `getAccountSdk()` in other modules.
4. Replace ES5 and deep imports with ESM imports from `@schibsted/account-sdk-browser`.
5. Update TypeScript imports and session response types.
6. Remove Payment usage and any calls to removed legacy methods.
7. Update SDK event listeners.
8. Check [consent forwarding](#9-configure-consent-forwarding), especially when upgrading from a version older than v5.3.0.
9. Configure [`generateState`](#10-generate-login-state-in-the-account-configuration) and drop
   `state` from `login()`, `loginUrl()`, and `showSimplifiedLoginWidget()` calls.

## 1. Use one Account instance

### v5

```ts
import { Identity, Monetization } from '@schibsted/account-sdk-browser';

const identity = new Identity(config);
const monetization = new Monetization(config);
```

### v6

```ts
import { createAccountSdk } from '@schibsted/account-sdk-browser';

const account = createAccountSdk(config);
```

Most Identity and Monetization methods keep their names and move to `Account`. For example, replace
`identity.hasSession()` with `account.hasSession()`.

## 2. Initialize the SDK once

`createAccountSdk()` registers the instance as `window.schAccount`. Calling it again in the same
window throws an `SDKError`.

Only the application entry point should initialize the SDK. Other modules should use:

```ts
import { getAccountSdk } from '@schibsted/account-sdk-browser';

const account = await getAccountSdk();
```

`getAccountSdk()` returns the existing instance or waits for initialization. It rejects if the SDK
is not initialized within four seconds.

You should avoid directly using browser globals or ready events in your integration, but if you must, you also have to replace references as follows:

| v5 | v6 |
| --- | --- |
| `window.schIdentity` | `window.schAccount` |
| `window.schMonetization` | `window.schAccount` |
| `schIdentity:ready` / `schMonetization:ready` | `schAccount:ready` |

`window.schAccount` property and the `schAccount:ready` event are both set by the SDK itself, at the moment `createAccountSdk()` creates the instance. Your code does not need to set either of them; it only
needs to read the global or listen for the event.


## 3. Update access checks

### v5

```ts
const userId = await identity.getUserId();
const access = await monetization.hasAccess(['premium'], userId);
```

### v6

```ts
const account = createAccountSdk({
    ...config,
    defaultProductIds: ['premium'],
});

const access = await account.hasAccess();
```

`Account` resolves the current user from the session, so do not pass a user id to `hasAccess()`.
Configure `defaultProductIds` when the same products or features are checked by default. For a
different check, pass the ids directly; they override the configured defaults:

```ts
const access = await account.hasAccess(['another-product']);
```

Calling `hasAccess()` without an argument requires `defaultProductIds` in `AccountConfig`. If
neither is provided, the method throws an `SDKError`.

This signature change applies only to `hasAccess()`. Cache invalidation still requires both values:

```ts
account.clearCachedAccessResult(productIds, userId);
```

## 4. Use root ESM imports

v6 no longer publishes the CommonJS/ES5 bundles. Replace imports from the ES5 build with an ESM
import from the package root:

```diff
- const { Identity } = require('@schibsted/account-sdk-browser/es5');
+ import { createAccountSdk } from '@schibsted/account-sdk-browser';
```

Imports from `/identity`, `/monetization`, `/payment`, `/src/*`, and `/es5` must be removed.
Applications that loaded `/es5/global` using a regular `<script>` must switch to an ESM-aware build
or loader.

v6 does not include SDK-provided polyfills. Make sure your browser support and build pipeline handle
modern JavaScript, `async`/`await`, and standard browser APIs.

## 5. Update TypeScript types

v6 exports its public types from the package root. Update renamed session types:

| v5 | v6 |
| --- | --- |
| `HasSessionSuccessResponse` | `SessionSuccessResponse` |
| `HasSessionFailureResponse` | `SessionFailureResponse` |

Use `Account` as the SDK instance type, `AccountConfig` for its configuration, and
`HasAccessResult` for access-check results.

`SessionResponse` represents all possible results of `hasSession()`: `SessionSuccessResponse`,
`SessionFailureResponse`, an unrecognized object response, or `RedirectSessionResponse` (a
session-refresh URL string). If you need to narrow it, v6 exports type guards for this purpose:
`isSessionSuccessResponse`, `isConnectedSessionResponse`, `isConnectedSessionWithUserIdResponse`,
and `isSessionFailureResponse`.

## 6. Move Varnish configuration

Configure the Varnish cookie when creating the Account:

```diff
- const identity = new Identity(config);
- identity.enableVarnishCookie({ domain: 'example.com', expiresIn: 3600 });
+ const account = createAccountSdk({
+     ...config,
+     varnish: { domain: 'example.com', expiresIn: 3600 },
+ });
```

If you previously called `identity.enableVarnishCookie()` without options, use `varnish: {}`. The
SDK will enable the `SP_ID` cookie and use the domain and expiration returned with the session when
available.

## 7. Remove APIs without a v6 replacement

The complete Payment API has been removed. Applications using it must migrate their payment flow
before upgrading to v6.

The following legacy methods have also been removed:

- `Identity.logSettings()`
- `Identity.phonesUrl()`
- `Monetization.subscriptionsUrl()`
- `Monetization.productsUrl()`

`account.getExternalId()` is available on `Account`, but deprecated; it is retained only for
compatibility with existing integrations and should not be used in new code.

## 8. Update event listeners

`Account` supports these events:

| Event | When it is emitted |
| --- | --- |
| `loginRequested` | `login()` starts a login flow (`event.detail.method` is `popup` or `default`) |
| `logoutRequested` | `logout()` starts the logout redirect |
| `sessionUpdated` | `hasSession()` detects a change in the stored session state |
| `simplifiedLoginOpened` | the simplified login widget opens |
| `simplifiedLoginCancelled` | the simplified login widget closes |

Subscriptions now use native event listeners instead of `tiny-emitter`:

- `off(event, listener)` requires the same function reference passed to `on()`. The v5
  `off(event)` form that removed all listeners is no longer supported.
- `on(event, listener, context)` no longer accepts a context argument. Use an arrow function or
  `bind(context)` and keep the resulting function reference for `off()`.
- `once()` is no longer available. For a one-time subscription, call `off(event, listener)` at the
  start of the listener.

The `loginRequested`, `logoutRequested`, and `sessionUpdated` events provide their data in
`event.detail`:

```ts
account.on('loginRequested', (event) => {
    console.log(event.detail.url, event.detail.method);
});
```

The v5 `login` and `logout` events were tied to session data updates made by `hasSession()`. They
have no same-named replacement in v6. The v6 `loginRequested` and `logoutRequested` events mean
only that `account.login()` or `account.logout()` started the corresponding flow. They do not
confirm that the user has logged in or out. Check the session after navigation to determine the
current state.

Replace v5 `sessionChange` listeners with `sessionUpdated`. The v5 event was emitted for fresh or
cached data, even if unchanged, but only when the previous or current response contained a
`userId`; its listener received the response directly. The v6 event is emitted when `hasSession()`
detects a change in `userId` or `result`; changes to other fields alone do not emit it.
Receiving the same fresh or cached session does not emit it. The response is available in
`event.detail`. It does not confirm that the user is logged in.

The v5 Identity events `userChange`, `notLoggedin`, `sessionInit`, `statusChange`, and `error`, as
well as the Monetization `hasAccess` event, are no longer emitted.

## 9. Configure consent forwarding

Consent forwarding was introduced in v5.3.0 and is also available in v6. If you are upgrading
from a version older than v5.3.0, include it in your migration checks.

In v6, the SDK reads consents from the Schibsted Sourcepoint integration by default, so sites
using that integration do not need to configure `getConsents`. Sites using another CMP must
provide their own synchronous `getConsents` reader when calling `createAccountSdk()`.

If you already configured a custom reader or `refreshLoginLinks` in v5, carry those settings
over to your Account configuration. Use `getConsents: () => null` to forward no consents.

## 10. Generate login state in the Account configuration

`createAccountSdk()` requires a `generateState` function. The SDK calls it with the configured
window whenever `login()`, `loginUrl()`, or the simplified login widget start a login without an
explicit `state`. It must synchronously return a non-empty string.

```diff
- const identity = new Identity(config);
- identity.login({ state: createLoginState(), preferPopup: true });
+ const account = createAccountSdk({
+     ...config,
+     generateState: (window) => createLoginState(window),
+ });
+ account.login({ preferPopup: true });
```

Passing `state` explicitly is still supported and overrides `generateState` for that call.