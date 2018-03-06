[![logo](https://www.schibsted.com/Global/LogoTypes/Logos%202014/SMG_Small_2014_RGB.png)](https://github.com/schibsted/account-sdk-browser)

[![Build Status](https://travis-ci.org/schibsted/account-sdk-browser.svg?branch=master)](https://travis-ci.org/schibsted/account-sdk-browser)

# Schibsted Account SDK for browsers

Welcome! This is the home of the Schibsted Account JavaScript SDK for use by any website that wishes
to use Schibsted Account to sign up and log in users. Use it to generate URLs for your site's "Log
in" button, query the logged-in status of your users, and to check whether they have access to
products and subscriptions, etc.

## Getting started

1. Do `npm install --save @schibsted/account-sdk-browser`
1. Use this library as you would any other npm module (`const schAccount =
   require('@schibsted/account-sdk-browser')` for instance)
   1. It's possible to `require('@schibsted/account-sdk-browser/identity')` or `/monetization'` or
      `/payment'` if you don't need all of it, and you wish to reduce the size of included code on
      your site.
1. Build your site as you prefer. This library uses modern JavaScript syntax (including async/await
   and other ES2017 features). Use babel or something similar if you need to cater to older browsers

## Upgrading from 2.x

If you already use the 2.x branch of the SPiD JS SDK, certain changes will be required to use this
version of the SDK. We have chosen what we believe to be a middle ground between "remembering the
work done in the old SDK" and "starting fresh". Therefore it is recommended that you read this
document in full. But ok, let's present some highlighted differences:

#### Differences from 2.x

* Instead of using `SPiD.init()` for initialization, the new SDK exports three classes; `Identity`,
   `Monetization` and `Payment`
* The `'SPiD.'` string is removed from the name of all SDK events. So the event that used to be
   `'SPiD.login'` is not just `'login'`
* You don't log in by setting `window.location`. Instead, you use the `login()` method on an
   instance of `Identity`
* The JavaScript code in this browser SDK does **NOT** set any `document.cookie = ...` by default.
   There is a function `enableVarnishCookie` that you can call on an `Identity` instance. This will
   enable setting the `SP_ID` cookie whenever `hasSession()` is called. Any other cookie that you
   need set, you will have to set yourself
* You no longer `subscribe` to events but `listen` (using a function `.on` that's compatible with
   Node's `EventEmitter`). For example `SPiD.event.subscribe('SPiD.login', handler)` becomes
   `Identity.on('login', handler)`
* SPiD URI is gone. There are a handful of `***Url()` functions in each SDK for the relevant flows
* The new SDK uses promises where it makes sense (often written as `async` functions). For example
   `Identity.logout()` returns a promise
* The new SDK has inline jsdoc documentation that's available
   [here](https://pages.github.com/schibsted/account-sdk-browser/) instead of tech docs.
   These documents will always be up to date with the latest release so make sure to run `npm
   outdated` in your project to be notified about any new releases
* The new UI flows are different than the old ones in that they use the Schibsted Account API
  endpoints just like any other client. For most clients this means absolutely nothing at all, but
  for some, it's quite important; If you have ever asked our support staff to disable certain API
  endpoint accesses, there is a chance that you'll encounter problems. For instance, if you've set
  `NO ACCESS` on the `POST /signup` endpoint, **users will not be able to sign up to your site**
  using the new flows.

#### Polyfills required for older browsers

This SDK uses modern JavaScript features. If you support older browsers, you should use a tool like
babel to transform the JavaScript as needed. We consider this to be out of scope of this SDK.
Though, if popular demand becomes high enough, we are open to reconsider this policy. If you have
questions, contact us on support@spid.no, and we'll try to assist you as best we can.

## Events

The SDK fires events when something we deem interesting is happening. For example the
[Identity](https://pages.github.com/schibsted/account-sdk-browser/Identity.html) class
emits some events when the user is logged in or logged out. This SDK uses a familar interface that's
very similar to Node's [EventEmitter](https://nodejs.org/api/events.html). The most important
methods are `.on(eventName, listener)` (to subscribe to an event) and `.off(eventName, listener)`
(to unsubscribe to an event).

## Identity

Let's start with a bit of example code:

#### Example

```javascript
const Identity = require('@schibsted/account-sdk-browser/identity')

const identity = new Identity({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted Account env. A url or a special key: 'PRE', 'PRO' or 'PRO_NO'
})

async function whenSiteLoaded() {
    const loginContainer = document.getElementById('login-container');
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

#### Authentication methods

Although Schibsted Account abstracts away the details of how the users sign up or log in, it's worth
mentioning that your end users have a few ways to log in:

* Username & password: pretty self-explanatory; users register using an email address and a
  self-chosen password
* Passwordless - email: here, the users enter their email address and receive a one-time code that
  they can use to log in
* Passwordless - SMS: similar to the previous method but instead of an email address, they receive
  the code on their phone as an SMS

The default is username & password. If you wish to use one of the passwordless login methods, the
`login()` function takes an optional parameter called `acrValues` (yeah, it's an OAuth specific
name). Please set this parameter to either `otp-email` or `otp-sms`.

The classic way to authenticate a user, is to send them from your site to the Schibsted Account
domain, let the user authenticate there, and then have us redirect them back to your site. If you
prefer, we also provide a popup that you can use. In this method, the authentication happens on a
separate popup window and at the end of the auth flow. We recommend that you make the popup send a
signal to your main page — using
[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) or something
similar — to indicate that the user is logged in. If the popup window fails to open, it'll
automatically fall back to the redirect flow.

#### Is the user logged in?

Schibsted Account relies on browser cookies to determine whether a user is recognized as logged in.
The SDK provides functions that can be used to check if the user that's visiting your site is
already a Schibsted user or not.

* [Identity#isLoggedIn](https://pages.github.com/schibsted/account-sdk-browser/Identity.html#isLoggedIn)
  tells you if the user that is visiting your site is already logged in to Schibsted Account or not.
* [Identity#isConnected](https://pages.github.com/schibsted/account-sdk-browser/Identity.html#isConnected)
  tells you if the user is connected to your client. A user might have `isLoggedIn=true` and at the
  same time `isConnected=false` if they have logged in to Schibsted Account, but not accepted terms
  and privacy policy for your site.

If you've lately changed your terms & conditions, maybe the user still hasn't accepted them. In that
case they are considered *not connected*. In that case, if they click "Log in" from your site, we
will just ask them to accept those terms and redirect them right back to your site.

#### Logging out

If you want to log the user out of Schibsted Account, you can call
[Identity#logout](https://pages.github.com/schibsted/account-sdk-browser/Identity.html#logout). This
will remove the Schibsted Account browser session, and so log the user out of all Schibsted sites in
that browser.

On your site backend, it may or may not make sense to remove the access/refresh tokens that you got
from Schibsted Account. This can simply be achieved by removing it from your session or just
deleting the session. At this time, there are no ways to invalidate the tokens so they will not be
usable. *In the future you might be able to invalidate tokens. This comes in handy if you know that
a token is compromised and you don't want them to be usable in the future.*

## Monetization

This class has two important endpoints:

* [Monetization#hasProduct](https://pages.github.com/schibsted/account-sdk-browser/Monetization.html#hasProduct)
  for checking if the user has access to a particular product
* [Monetization#hasSubscription](https://pages.github.com/schibsted/account-sdk-browser/Monetization.html#hasSubscription)
  for checking if the user has access to a particular subscription

These two functions require a parameter `sp_id` that is obtained from
[Identity#getSpId](https://pages.github.com/schibsted/account-sdk-browser/Identity.html#getSpId)
asynchronously.

#### Example

```javascript
const Monetization = require('@schibsted/account-sdk-browser/monetization');

const monetization = new Monetization({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted Account env. A url or a special key: 'PRE', 'PRO' or 'PRO_NO'
});

try {
    // Check if the user has access to a a particular product
    // You need the sp_id parameter that is obtained from an Identity instance
    const sp_id = await identity.getSpId();
    const data = await monetization.hasProduct(productId, sp_id);
    alert(`User has access to ${productId}? ${data.result}`);
} catch (err) {
    alert(`Could not query if the user has access to ${productId} because ${err}`);
}
```

## Payment

This class provides methods for paying with a so-called paylink, buying a product, getting links to
pages for redeeming voucher codes, reviewing payment history, and more.

#### Example

```javascript
const Payment = require('@schibsted/account-sdk-browser/payment');

const paymentSDK = new Payment({
    clientId: '56e9a5d1eee0000000000000',
    redirectUri: 'https://awesomenews.site', // ensure it's listed in selfservice
    env: 'PRE', // Schibsted Account env. A url or a special key: 'PRE', 'PRO' or 'PRO_NO'
});

// Get the url to paymentSDK with paylink
const paylink = '...';
const paylinkUrl = paymentSDK.purchasePaylinkUrl(paylink);

// Or another example --- pay with paylink in a popup
paymentSDK.payWithPaylink(paylink);
```

## Appendix

#### Cookies

There are some cookies used by Schibsted Account. They should all be considered opaque on the
browser side. Nevertheless, here is a short description of them.

1. The **autologin** cookie (often called 'the remember-me-cookie'): The cookie name in the
   production environments is `vgs_email`, because reasons (on PRE, it is called `spid-pre-data`).
   It's a JSON string that's encoded using the standard `encodeURIComponent()` function and is an
   object that contains two pieces of information that's important:
   * `remember`: if set to `true`, the user chose to be remembered and this means we usually support
     auto-login (that is, if you call the Schibsted Account hassession service, and no session can
     be found in the session database, it will automatically create a new one for the user so that
     they don't have to authenticate again. If it is `false`, it should be interpreted as the user
     does not want to be automatically logged in to any site when their session expires
   * `v`: the version number
1. The **visitor** cookie: Cookie name in production environments is `spiduid`.
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
