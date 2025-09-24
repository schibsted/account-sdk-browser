[![logo](https://www.schibsted.com/Global/LogoTypes/Logos%202014/SMG_Small_2014_RGB.png)](https://github.com/schibsted/account-sdk-browser)

![Build Status](https://github.com/schibsted/account-sdk-browser/actions/workflows/pr.yml/badge.svg)
[![Code coverage](https://codecov.io/gh/schibsted/account-sdk-browser/branch/master/graph/badge.svg)](https://codecov.io/gh/schibsted/account-sdk-browser)
[![Snyk](https://snyk.io/test/github/schibsted/account-sdk-browser/badge.svg?targetFile=package.json)](https://snyk.io/test/github/schibsted/account-sdk-browser)

# Schibsted account SDK for browsers

Welcome! This is the home of the Schibsted account JavaScript SDK for use by any website that wishes
to use Schibsted account to sign up and log in users. Use it to generate URLs for your site's "Log
in" button, query the logged-in status of your users, and to check whether they have access to
products and subscriptions, etc.

## Getting started

This sdk mainly communicates with a service named Session Service, which is available on brand
domains (i.e. id.vg.no) to avoid Third-Party Cookie request.

Since browsers started to block Third-Party Cookies, your top domain from local machine needs to
match your Session Service top domain. Otherwise, the Session Service cookie will be a third-party cookie
and will not be sent with a XHR request.

The same applies to cross scheme requests. The Session Service is hosted on https and therefore you need to [run your site with HTTPS locally](https://web.dev/how-to-use-local-https/).

For example if your `pre` domain is pre.sdk-example.com, and it uses id.pre.sdk-example.com Session Service
domain, your local domain should be local.sdk-example.com.

1. Do `npm install --save @schibsted/account-sdk-browser`
1. Use this library as you would any other npm module: `import { Identity, Monetization, Payment } from '@schibsted/account-sdk-browser'`
   With CommonJS it is possible to `require` the modules Identity, Monetization and Payment
   by appending `/identity`, `/monetization'` or `/payment'`.
1. Build your site as you prefer. This library uses modern JavaScript syntax (including async/await
   and other ES2017 and WHATWG features) by default. We recommend that you do any transpilation
   yourself for the browser versions you need to cater to. See [this paragraph](#polyfills) for
   info about our Babel-ified version and info about polyfills.
1. Initiate the SDK and provide at least `clientId`, `env` and `sessionDomain`.

If this is for a new site and there is no sessionDomain yet, contact
[support](mailto:schibstedaccount@schibsted.com) to initiate the process.

## Migration to 5.x.x (ITP)

Follow the [migration guide](./MIGRATION.md).

## Simplified login widget

1. Ensure that your site has no site specific terms and conditions in the Schibsted account login flow.
1. Define rules for when and how often the simplified login prompt should be shown to unique users on your site. How you do this is up to you, but we recommend starting with showing the prompt once per user before potentially increasing this frequency over time.
1. Set up a function to check if users landing on your domain [is logged in](https://schibsted.github.io/account-sdk-browser/Identity.html#isLoggedIn) to your site.
1. If the user is not logged-in to your site, call the [showSimplifiedLoginWidget](https://schibsted.github.io/account-sdk-browser/Identity.html#showSimplifiedLoginWidget) function. The `showSimplifiedLoginWidget` accepts the same params as login function (`state` is required, it might be string or async function). If the simplified login prompt is to be loaded, `showSimplifiedLoginWidget` will return `true`.
1. Set up a way to store information about which users have been shown the simplified login prompt. How you do this is up to you, but one way is to use localStorage. Use this information to execute on the rules defined in #2.

## Example project

There is an example that demonstrates how the SDK can be used. The code is
[here](https://github.com/schibsted/sdk-example), and you can see it live
[here](https://pro.sdk-example.com). You have a use-case that we haven't thought of? Ask us to add
it by creating an [issue](https://github.com/schibsted/sdk-example/issues/new).

You can use that code as inspiration or just fork and play with it. The account-sdk-browser NPM
module is used for authenticating the user with Schibsted account. Take a look at how the SDK is
initialized.

When a user wants to log in to your site, you direct them to a UI flow hosted by **Schibsted Account**. 
We authenticate the user and redirect them back to your site. This final redirect back to your site is performed in accordance with the OAuth2 specification. 
This means we pass a `code` in the query string of that redirect URI.
You can use that `code` on your site's backend, along with your client credentials (client ID and secret), to obtain an *Access Token* (AT) and a *Refresh Token* (RT). 
You should not send the AT (and **never** the RT!) to the browser. Instead, keep them on the server side and associate them with the specific user session. 
This allows you to call Schibsted Account APIs on behalf of that user.


## Events

The SDK fires events on the instances when something we deem interesting is happening. For example the
[Identity](https://schibsted.github.io/account-sdk-browser/Identity.html) class
emits some events when the user is logged in or logged out. This SDK uses a familar interface that's
very similar to Node's [EventEmitter](https://nodejs.org/api/events.html). The most important
methods are `.on(eventName, listener)` (to subscribe to an event) and `.off(eventName, listener)`
(to unsubscribe to an event).

The SDK also emits global events on the `document` when a new instance is created.
Events are emitted for: 

| Class | event name |
|--- | --- |
| Identity | `schIdentity:ready` |
| Monetization | `schMonetization:ready` |
| Payment | `schPayment:ready` |

```js
document.addEventListener('schIdentity:ready', e => {
    // The event contains the initialized instance (e.detail.instance);
}

```

## Identity

Let's start with a bit of example code:

#### Example

```javascript
import { Identity } from '@schibsted/account-sdk-browser'

const identity = new Identity({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted account env. A url or a special key: 'PRE', 'PRO', 'PRO_NO', 'PRO_FI' or 'PRO_DK'
    sessionDomain: 'https://id.awesomenews.site', // client-configured session-service domain
})

async function whenSiteLoaded() {
    const loginContainer = document.getElementById('login-container')
    if (await identity.isLoggedIn()) {
        const user = await identity.getUser()
        const span = document.createElement('span')
        span.textContent = `Hello ${user.givenName}`
        loginContainer.appendChild(span)
    } else {
        loginContainer.innerHTML = '<button class="login-button">Log in</button>'
    }
}

function userClicksLogIn() {
    identity.login({ state: 'some-random-string-1234-foobar-wonky-pig' })
}
```

#### Regarding `state`

This parameter is an OpenID Connect parameter (described in [this paragraph in the
spec](http://openid.net/specs/openid-connect-core-1_0.html#rfc.section.3.1.2.1)). It's formatted as
an opaque string. This means you can send anything that can be serialized to a string. In practice,
we have good experience sending something like a JSON value like a base64-url-encoded value — it's
just an easy way to avoid browsers or backends messing with special characters.

But as a trivial example, if you call `Identity.login(..)` with params
`redirectUri=https://site.com&state=article%3D1234` — then at the end of the authentication flow,
the user will be sent back to your redirectUri, and the `state` parameter will be forwarded along
with the auth `code` parameter.

It is recommended that you provide a unique identifier as part of the state, to prevent CSRF
attacks. For example this can be accomplished by:
1. Your backend generates random token: `1234abcd`, saves it in some tokenCache, and forwards to
   your browser frontend
1. Your frontend calls `Identity.login` with `state = base64Urlencode({ token: '1234abcd', article:
   '1234', ... })`
1. When auth flow completes, the user is redirected back to your site. Then, your backend sees the
   query parameters `code` (which it can exchange for OAuth tokens for the user) and `state`
1. Your backend can do `decodedState = base64Urldecode(query.state)` and then verify that its
   `tokenCache.contains(decodedState.token)`. If that fails, then possibly a CSRF attack was
   attempted. If successful, remove the token from the tokenCache so the same token can't be used
   again, and continue to show `decodedState.article`

#### Authentication methods

Although Schibsted account abstracts away the details of how the users sign up or log in, it's worth
mentioning that your end users have a few ways to log in:

* Username & password: pretty self-explanatory; users register using an email address and a
  self-chosen password
* Passwordless - email: here, the users enter their email address and receive a one-time code that
  they can use to log in
* Multifactor authentication: first client indicates which methods should be preferred, later these
  will be included (if fulfilled) in `AMR` claim of IDToken

The default is username & password. If you wish to use one of the passwordless login methods, the
`login()` function takes an optional parameter called `acrValues` (Authentication Context Class Reference).
The `acrValues` parameter with multifactor authentication can take following values:
 - `eid` - authentication using BankID (for DEV and PRE environments you can choose between country specific solution by specifying `eid-no` or `eid-se` instead)
 - `otp-email` - passwordless authentication using code sent to registered email
 - `password` - force password authentication (even if user is already logged in)
 - `otp` - authentication using registered one time code generator (https://tools.ietf.org/html/rfc6238)
 - `sms` - authentication using SMS code sent to phone number
 - `password otp sms` - those authentication methods might be combined

The classic way to authenticate a user, is to send them from your site to the Schibsted account
domain, let the user authenticate there, and then have us redirect them back to your site. If you
prefer, we also provide a popup that you can use. In this method, the authentication happens on a
separate popup window and at the end of the auth flow. We recommend that you make the popup send a
signal to your main page — using
[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) or something
similar — to indicate that the user is logged in. If the popup window fails to open, it'll
automatically fall back to the redirect flow. The SDK Example project mentioned above demonstrates
how it can work. Again, you can see [sdk-example](https://github.com/schibsted/sdk-example) if you
want a working example.

#### Is the user logged in?

Schibsted account relies on browser cookies to determine whether a user is recognized as logged in.
The SDK provides functions that can be used to check if the user that's visiting your site is
already a Schibsted user or not.

* [Identity#isLoggedIn](https://schibsted.github.io/account-sdk-browser/Identity.html#isLoggedIn)
  tells you if the user that is visiting your site is already logged in to Schibsted account or not.
* [Identity#isConnected](https://schibsted.github.io/account-sdk-browser/Identity.html#isConnected)
  tells you if the user is connected to your client. A user might have `isLoggedIn=true` and at the
  same time `isConnected=false` if they have logged in to Schibsted account, but not accepted terms
  and privacy policy for your site.

If you've lately changed your terms & conditions, maybe the user still hasn't accepted them. In that
case they are considered *not connected*. In that case, if they click "Log in" from your site, we
will just ask them to accept those terms and redirect them right back to your site.

#### Logging out

If you want to log the user out of Schibsted account, you can call
[Identity#logout](https://schibsted.github.io/account-sdk-browser/Identity.html#logout). This
will remove the Schibsted account brand session. User will still be logged into Schibsted account.

## Monetization

The preferred method for checking whether a user has access to a product/subscription is
[Monetization#hasAccess](https://schibsted.github.io/account-sdk-browser/Monetization.html#hasAccess).
It requires using Session Service, and supports both Schibsted account productId's and Zuora
feature id's.

#### Example
```javascript
import { Monetization } from '@schibsted/account-sdk-browser'

const monetization = new Monetization({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    sessionDomain: 'https://id.aweseome.site', // client-configured session-service domain
    env: 'PRE', // Schibsted account env. A url or a special key: 'PRE', 'PRO' or 'PRO_NO'
});

try {
    // Check if the user has access to a a particular product
    const userId = await identity.getUserId();
    const data = await monetization.hasAccess([productId], userId);
    alert(`User has access to ${productId}? ${data.entitled}`)
} catch (err) {
    alert(`Could not query if the user has access to ${productId} because ${err}`)
}
```

## Payment

This class provides methods for paying with a so-called paylink, buying a product, getting links to
pages for redeeming voucher codes, reviewing payment history, and more.

#### Example

```javascript
import { Payment } from '@schibsted/account-sdk-browser'

const paymentSDK = new Payment({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted account env. A url or a special key: 'PRE', 'PRO' or 'PRO_NO'
})

// Get the url to paymentSDK with paylink
const paylink = '...'
const paylinkUrl = paymentSDK.purchasePaylinkUrl(paylink)

// Or another example --- pay with paylink in a popup
paymentSDK.payWithPaylink(paylink)
```

## Appendix

#### Polyfills

This SDK uses modern JavaScript features. If you support older browsers, you should use a tool like
babel to transform the JavaScript as needed. However, since certain teams have deployment pipelines
where it's difficult to do their own transpilation, we do provide some opt-in es5 files as well:

1. `@schibsted/account-sdk-browser/es5`: Include both `Identity`, `Monetization` and `Payment`.
1. `@schibsted/account-sdk-browser/es5/global`: Include both `Identity`, `Monetization` and
   `Payment`. In addition, add them as variables to the global `window` object.
1. `@schibsted/account-sdk-browser/es5/identity`, `@schibsted/account-sdk-browser/es5/monetization`
   or `@schibsted/account-sdk-browser/es5/payment` can be used to only include each class by itself.

But then regardless of whether you use the es5 versions or not, you might need to polyfill certain
things that might be missing in the browsers you wish to support. A quick test using IE11 showed
that we needed polyfills for `Promise`, `URL`, `Object.entries`, `fetch`, `Number.isFinite` and
`Number.isInteger`.

#### Cookies

There are some cookies used by Schibsted account. They should all be considered opaque on the
browser side. Nevertheless, here is a short description of them.

1. The **autologin** cookie (often called 'the remember-me-cookie'): The cookie name in the
   production environments is `vgs_email`, because reasons (on PRE, it is called `spid-pre-data`).
   It's a JSON string that's encoded using the standard `encodeURIComponent()` function and is an
   object that contains two pieces of information that's important:
   * `remember`: if set to `true`, the user chose to be remembered and this means we usually support
     auto-login (that is, if you call the Schibsted account hassession service, and no session can
     be found in the session database, it will automatically create a new one for the user so that
     they don't have to authenticate again. If it is `false`, it should be interpreted as the user
     does not want to be automatically logged in to any site when their session expires
   * `v`: the version number
1. The **session** cookies: Cookie names in production environments are `identity`, and `SPID_SE` or
   `SPID_NO`. It contains:
   * `user`: an object (if it's missing, a call to hassession will return a `401` with a
     `UserException` that says `No session found`)
     * `userId` identifies the user. We use this property to compare "old" user with "new" user and
       fire events that indicate that the user has changed
     * `is_logged_in` indicates if the user is logged in
   * `user_tags`: a map that contains some flags about the user; namely:
     * `is_logged_in` indicates if the user is logged in (this seems to be a duplicate of a
       property with a similar name in the parent `user` object)
     * `terms`: a map of term ids that indicate if they've been accepted by the user.
   * `referer` (yep, missing the double "rr"..): If this is missing, a call to hassession will
     return a `401` with a `UserException` that says `No session found`.

## Releasing
Tags are pushed to NPM via Travis. To release a new version, run in master

```bash
$ npm version <major|minor|patch>
```

which will run the test, update version in package.json, commit, tag the commit
and push.

## LICENSE

Copyright (c) 2024 Schibsted Products & Technology AS

Licensed under the [MIT
License](https://github.com/schibsted/account-sdk-browser/blob/master/LICENSE.md)

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and limitations under the
License.
