[![logo](https://www.schibsted.com/Global/LogoTypes/Logos%202014/SMG_Small_2014_RGB.png)](https://github.com/schibsted/account-sdk-browser)

[![Build Status](https://travis-ci.com/schibsted/account-sdk-browser.svg?branch=master)](https://travis-ci.com/schibsted/account-sdk-browser)
[![Code coverage](https://codecov.io/gh/schibsted/account-sdk-browser/branch/master/graph/badge.svg)](https://codecov.io/gh/schibsted/account-sdk-browser)
[![Snyk](https://snyk.io/test/github/schibsted/account-sdk-browser/badge.svg?targetFile=package.json)](https://snyk.io/test/github/schibsted/account-sdk-browser)

# Schibsted account SDK for browsers

Welcome! This is the home of the Schibsted account JavaScript SDK for use by any website that wishes
to use Schibsted account to sign up and log in users. Use it to generate URLs for your site's "Log
in" button, query the logged-in status of your users, and to check whether they have access to
products and subscriptions, etc.

<a name="getting-started"></a>

## Getting started

You can do local development using our `dev` or `pre` environment.

Since browsers started to block Third-Party Cookies, your top domain from local machine needs to
match your session service top domain. Otherwise session service cookie will be Third-Party Cookie,
and will not be sent with XHR request.

For example if your `pre` domain is pre.sdk-example.com, and it uses id.pre.sdk-example.com session
service domain, your local domain should be local.sdk-example.com.

1. Do `npm install --save @schibsted/account-sdk-browser`
1. Use this library as you would any other npm module: `import { Identity, Monetization, Payment }
   from '@schibsted/account-sdk-browser'`
   1. If you use the CommonJS `require` syntax and you both want to reduce the size of your
      JavaScript bundle **and** don't need all of Identity, Monetization and Payment modules from
      this SDK — it's possible to `require('@schibsted/account-sdk-browser/identity')` (note the
      `/identity` at the end) or `/monetization'` or `/payment'`
1. Build your site as you prefer. This library uses modern JavaScript syntax (including async/await
   and other ES2017 and WHATWG features) by default. We recommend that you do any transpilation
   yourself for the browser versions you need to cater to. See [this paragraph](#polyfills-yo) for
   info about our babelified version and info about polyfills.

<a name="upgrading-from-2.x"></a>

## Upgrading from 2.x

If you already use the 2.x branch of the Schibsted account JS SDK, certain changes will be required
to use this version of the SDK. We have chosen what we believe to be a middle ground between
"remembering the work done in the old SDK" and "starting fresh". Therefore it is recommended that
you read this document in full. But ok, let's present some highlighted differences:

<a name="differences-from-2.x"></a>

#### Differences from 2.x

* Instead of using `SPiD.init()` for initialization, the new SDK exports three classes; `Identity`,
   `Monetization` and `Payment`
* Many features (like logging in) requires a `redirectUri` parameter — both in the 2.x and 3.x
  versions of the SDK. An important difference in the new version of our backends, is that we strive
  to be more compliant with OpenID Connect standards. This means that redirect uris need to match
  **exactly** (that is — including the query string). This will be a breaking change for some
  people, because in the 2.x world, a redirect uri might look like `https://site.com` in self
  service, and a login attempt with `redirectUri=https://site.com?article=1234` would then be ok
  because it would only match on domain+path — but not query string. However — this will **not**
  work in the 3.x world. OpenID Connect **does** have a suggestion for how to handle these
  situations though, which is a parameter called `state` that you send in addition to the
  `redirectUri`. See [this paragraph](#regarding-state) for more information
* The `'SPiD.'` string is removed from the name of all SDK events. So the event that used to be
   `'SPiD.login'` is now just `'login'`
* You don't log in by setting `window.location`. Instead, you use the `login()` method on an
   instance of `Identity`
* The JavaScript code in this browser SDK does **NOT** set any `document.cookie = ...` by default.
   There is a function `enableVarnishCookie` that you can call on an `Identity` instance. This will
   enable setting the `SP_ID` cookie whenever `hasSession()` is called (though most browsers require
   that you are on a "real domain" for this to work — so, **not** `localhost`). Any other cookie
   that you need set, you will have to set yourself
* All functions that used to take callback functions in the 2.x version of the SDK don't do that
   anymore. The new SDK instead uses promises where it makes sense (often written as `async`
   functions). For example `Identity.getUser()` returns a promise. So, for instance if you used to do
   this in v2.x:
   ```javascript
   identity.hasSession((err, data) => {
       if (err) {
           console.log('Nooo!', err)
       } else {
           console.log('Yay', data)
       }
   });
   ```
   Now you should instead do:
   ```javascript
   // Either
   identity.hasSession()
       .then(data => console.log('Yay', data))
       .catch(err => console.log('Nooo!', err));
   // ... or if you're using async functions
   try {
       const data = await identity.hasSession();
       console.log('Yay', data);
   } catch (err) {
       console.log('Nooo!', err);
   }
   ```
* Listening to events is still supported, although since many functions return Promises, we expect
   many users will find the use of Promise results preferable. But for those that prefer the events,
   it works using a function `.on` that's compatible with Node's `EventEmitter`. For example
   `SPiD.event.subscribe('SPiD.login', handler)` from 2.x becomes `Identity.on('login', handler)`.
   Also, the functions `.off` and `.once` are supported
* SPiD URI is gone. There are a handful of `***Url()` functions in each of the `Identity`,
  `Monetization` and `Payment` classes for the relevant flows
* The new SDK has inline jsdoc documentation that's available
   [here](https://schibsted.github.io/account-sdk-browser/) instead of tech docs.
   These documents will always be up to date with the latest release so make sure to run `npm
   outdated` in your project to be notified about any new releases
* The new UI flows are different than the old ones in that they use the Schibsted account API
  endpoints just like any other client. For most clients this means absolutely nothing at all, but
  for some, it's quite important; If you have ever asked our support staff to disable certain API
  endpoint accesses, there is a chance that you'll encounter problems. For instance, if you've set
  `NO ACCESS` on the `POST /signup` endpoint, **users will not be able to sign up to your site**
  using the new flows
* If you use our session-service, there are certain changes in the response from the session endpoint.
  * The `userStatus` field makes no sense in the session-service world, since it operates "per-site"
    (there is one id.site.example domain for each site, so being logged in and connected for that
    site means the same thing. Also, there is the `Identity.isConnected` function that's still kept
    in case people prefer to keep the same logic with and without the session-service).
  * The `id` field (the one returning a MongoDb identifier like `abcdef0123456789abcdd00d`) has
    finally been removed. It's been deprecated for a long time. The numeric `userId` (legacy) and
    `uuid` fields are still present.

<a name="polyfills-yo"></a>

#### Polyfills required for older browsers

This SDK uses modern JavaScript features. If you support older browsers, you should use a tool like
babel to transform the JavaScript as needed. However — since certain teams have deployment pipelines
where it's difficult to do their own transpilation, we do provide some opt-in es5 files as well:

1. `@schibsted/account-sdk-browser/es5`: Include both `Identity`, `Monetization` and `Payment`.
1. `@schibsted/account-sdk-browser/es5/global`: Include both `Identity`, `Monetization` and
   `Payment`. In addition, add them as variables to the global `window` object.
1. `@schibsted/account-sdk-browser/es5/identity`, `@schibsted/account-sdk-browser/es5/monetization`
   or `@schibsted/account-sdk-browser/es5/payment` can be used to only include each class by itself.

But then regardless of whether you use the es5 versions or not, you might need to polyfill certain
things that might be missing in the browsers you wish to support. A quick test using IE11 showed
that we needed polyfills for `Promise`, `URL`, `Object.entries`, `fetch`, `Number.isFinite` and
`Number.isInteger`. If you want any sort of debugging to work (say, if you're passing a function
using `console.log` as a parameter to any SDK function that supports logging), you might also need
to polyfill `console` and `console.log` (yeah, it's baffling, but a [known
issue](https://stackoverflow.com/questions/22315167/in-ie11-how-to-use-console-log) in IE). We added
them from polyfill.io like this:

    <script src="https://cdn.polyfill.io/v2/polyfill.js?features=Promise,URL,Object.entries,fetch,Number.isFinite,Number.isInteger,console,console.log"></script>

<a name="itp-yo"></a>

#### Local development on Chrome version 88 (or higher)

Google Chrome in version 88 (or higher) [introduced changes](https://support.google.com/chrome/a/answer/7679408#88&zippy=%2Cchrome) in the definition of cookies `same-site` attribute. 
From now on cross-scheme requests (e.g. `http` <-> `https`) will be considered cross-site instead of same-site, hence you may experience problems with localhost development, resulting in `Bad Request` responses from `hasSession` calls.
While we are working on more permanent resolution of this this issue, as a temporary workaround we can suggest [running your site with HTTPS locally](https://web.dev/how-to-use-local-https/) or disabling `schemeful-same-site` flag in Chrome for the time of local development.

More info: https://web.dev/schemeful-samesite/

## Notes on Apple Intelligent Tracking Prevention (ITP)
#### or.. how I learned to stop worrying and ❤️ the Schibsted account session service

Right, as of Safari 12, we can't rely on making requests from a site domain to the Schibsted account
domain. Safari 12 will possibly partition cookies in such requests in an attempt to protect the
user's privacy. While this is good for end-users, it presented a real problem for Schibsted account,
since our technique for deciding whether a user is logged in, is to send a request in precisely this
manner.

To ensure consistent user sessions despite these restrictions, we have re-designed our platform and
introduced what we call the
session-service. If your site lives on site.example, you should assign a sub-domain for use with the
session-service (we propose id.site.example for production and id-pre.site.example for staging —
talk to our Customer Success team regarding how to get this set up). The goal is to have
https://id.site.example be a DNS name resolving to our session-service, since this enables us to
place a cookie on that domain that indicates that the user is logged in.

When the domain is set up, your client needs to be modified by our Customer Success team to enable
using this feature (this is done by them setting `session_service_domain = https://id.site.example`
in SysAdmin).

Finally, and this is where you, the user of account-sdk-browser need a change; When creating an
instance of `Identity` or `Monetization`, include the property `sessionDomain:
'https://id.site.example` in the constructor'.

So to sum up:

1. Prepare a subdomain id.site.example (optionally id-pre.site.example for staging)
2. Enable the session-service for the client you use on your site
3. Add the `sessionDomain` property to the `Identity` or `Monetization` constructors

1 and 2 requires [communication with us](mailto:schibstedaccount@schibsted.com), and 3 is done by you at a time of your choosing.

<a name="example-project"></a>

## Simplified login widget

Implementing this functionality requires that your brand uses session service. With this as a starting point, implementing simplified login in production is relatively straightforward:

1. Ensure that your site has no site specific terms and conditions in the Schibsted account login flow. 
2. Define rules for when and how often the simplified login prompt should be shown to unique users on your site. How you do this is up to you, but we recommend starting with showing the prompt once per user before potentially increasing this frequency over time.
3. Set up a function to check if users landing on your domain [is logged in](https://schibsted.github.io/account-sdk-browser/Identity.html#isLoggedIn) to your site. 
4. If the user is not logged-in to your site, call the [showSimplifiedLoginWidget](https://schibsted.github.io/account-sdk-browser/Identity.html#showSimplifiedLoginWidget) function. The `showSimplifiedLoginWidget` accepts the same params as login function (`state` is required, it might be string or async function). If the simplified login prompt is to be loaded, `showSimplifiedLoginWidget` will return `true`.
5. Set up a way to store information about which users have been shown the simplified login prompt. How you do this is up to you, but one way is to use localStorage. Use this information to execute on the rules defined in #2. 

## Example project

There is an example that demonstrates how the SDK can be used. The code is
[here](https://github.com/schibsted/sdk-example), and you can see it live
[here](https://pro.sdk-example.com). You have a use-case that we haven't thought of? Ask us to add
it by creating an [issue](https://github.com/schibsted/sdk-example/issues/new).

You can use that code as inspiration or just fork and play with it. The account-sdk-browser NPM
module is used for authenticating the user with Schibsted account. Take a look at how the SDK is
initialized.

When a user wants to log in to your site, you direct them to a UI flow that is hosted by Schibsted
Account. We authenticate the user and redirect them back to your site. This final redirect back to
your site is done in accordance with the OAuth2 spec. That means that we pass a `code` in the query
string in that redirect uri. You can use that `code` on your site backend along with your client
credentials (client id & secret) to get an *Access Token* (AT) and *Refresh Token* (RT). You don't
send the AT (and never ever the RT!) to the browser but rather keep it on the server side and
associate it with that particular user session in order to be able to call Schibsted account APIs on
behalf of that user.

<a name="events"></a>

## Events

The SDK fires events when something we deem interesting is happening. For example the
[Identity](https://schibsted.github.io/account-sdk-browser/Identity.html) class
emits some events when the user is logged in or logged out. This SDK uses a familar interface that's
very similar to Node's [EventEmitter](https://nodejs.org/api/events.html). The most important
methods are `.on(eventName, listener)` (to subscribe to an event) and `.off(eventName, listener)`
(to unsubscribe to an event).

<a name="identity"></a>

## Identity

Let's start with a bit of example code:

#### Example

```javascript
import { Identity } from '@schibsted/account-sdk-browser'

const identity = new Identity({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted account env. A url or a special key: 'PRE', 'PRO', 'PRO_NO', 'PRO_FI' or 'PRO_DK'
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

<a name="regarding-state"></a>

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

<a name="authentication-methods"></a>

#### Authentication methods

Although Schibsted account abstracts away the details of how the users sign up or log in, it's worth
mentioning that your end users have a few ways to log in:

* Username & password: pretty self-explanatory; users register using an email address and a
  self-chosen password
* Passwordless - email: here, the users enter their email address and receive a one-time code that
  they can use to log in
* Passwordless - SMS (BETA): similar to the previous method but instead of an email address, they receive
  the code on their phone as an SMS
* Multifactor authentication: first client indicates which methods should be preferred, later these 
  will be included (if fulfilled) in `AMR` claim of IDToken  

IMPORTANT: Passwordless using SMS is still in BETA. It's only recommended to use it for testing and
experimental purposes for now. Please let us know before using this in production.

The default is username & password. If you wish to use one of the passwordless login methods, the
`login()` function takes an optional parameter called `acrValues` (Authentication Context Class Reference).
The `acrValues` parameter with multifactor authentication can take following values: 
 - `eid` - authentication using BankID (for DEV and PRE environments you can choose between country specific solution by specifying `eid-no` or `eid-se` instead)
 - `otp-email` - passwordless authentication using code sent to registered email
 - `otp-sms` - passwordless authentication using code sent to registered phone number
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

<a name="is-the-user-logged-in"></a>

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

<a name="logging-out"></a>

#### Logging out

If you want to log the user out of Schibsted account, you can call
[Identity#logout](https://schibsted.github.io/account-sdk-browser/Identity.html#logout). This
will remove the Schibsted account browser session, and so log the user out of all Schibsted sites in
that browser.

On your site backend, it may or may not make sense to remove the access/refresh tokens that you got
from Schibsted account. This can simply be achieved by removing it from your session or just
deleting the session. At this time, there are no ways to invalidate the tokens so they will not be
usable. *In the future you might be able to invalidate tokens. This comes in handy if you know that
a token is compromised and you don't want them to be usable in the future.*

<a name="monetization"></a>

## Monetization

The preferred method for checking whether a user has access to a product/subscription is
[Monetization#hasAccess](https://schibsted.github.io/account-sdk-browser/Monetization.html#hasAccess).
It requires using session-service, and supports both Schibsted account productId's and Zuora
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

<a name="payment"></a>

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

<a name="appendix"></a>

## Appendix

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

## LICENSE

Copyright (c) 2018 Schibsted Products & Technology AS

Licensed under the [MIT
License](https://github.com/schibsted/account-sdk-browser/blob/master/LICENSE.md)

Unless required by applicable law or agreed to in writing, software distributed under the License is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and limitations under the
License.
