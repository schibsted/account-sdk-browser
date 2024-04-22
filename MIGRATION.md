# Schibsted Account SDK v5.0.0 Migration Guide

## Overview
<p align="justify">
The release of version 5.x.x of Schibsted Account SDK ships with changes to how we're dealing with user sessions
and addresses Apple's Intelligent Tracking Prevention enabling us to safely refresh cookies on Safari-based
browsers. To achieve this, breaking changes were introduced to some functionalities of the SDK.
</p>

### Force-redirect when refreshing user sessions

<p align="justify">
To ensure sessions stored in Safari-based browsers work properly we now force a redirect to session-service causing a full-page load in order to refresh sessions in the `hasSession` method. Once cookies are refreshed, session-service will redirect users back to the client app.

This directly affects the following methods depending on `hasSession`:

- `isLoggedIn`
- `isConnected`
- `getUser`
- `getUserId`
- `getUserSDRN`
- `getUserUuid`

Calling these methods may as a side-effect trigger a redirect to session-service.

To prevent loss of state, we’ve introduced a callback function you can pass in the Identity class constructor that will trigger right before the redirect.
</p>

# Adopting ITP changes without using SchAcc SDK

## Overview

<p align="justify">
If you’re using Schibsted Account services without using the SDK, you’ll need to migrate to
a new version of our API. Otherwise session cookies for all Safari users will be capped to 7 days.
Additionally, we’ll deprecate the currently used API in the future.
</p>

### Necessary changes

<p align="justify">
Firstly, change the session-service API you’re using to query for sessions from  `/session` to `/v2/session`.

This new API will detect sessions that are about to expire and in cases where the browser sending the request is Safari-based, will return a new payload:

```json
{
    "redirectURL": "some-path-in-session-service"
}
```

For Safari-based browsers, our service will return the aforementioned payload when there's a need to refresh the session. Check the response, and if it contains a `redirectURL` manually redirect the client to the session-service page URL returned in the response.

This action has to be made client-side, the full redirect URL can be constructed following this example:

```https://global-session-service-url/redirect-url?redirect_uri=url_to_your_app```

At last, trigger page navigation by loading this URL. The simplest way to achieve that is to overwrite `window.location.href`

```window.location.href = redirectURL```

On that page, session-service will be able to set new session cookies and will redirect back to the `redirect_uri` provided as a query param.
</p>
