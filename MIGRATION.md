# Schibsted Account SDK v5.0.0 Migration Guide

## Overview

The release of version 5.x.x of Schibsted Account SDK ships with changes to handling user sessions and session refreshing that address Apple’s Intelligent Tracking Prevention. To achieve a working solution, breaking changes were introduced to some functionalities of the SDK.
Changes

### 1. Force-redirect when refreshing user sessions

To ensure sessions stored in Safari-based browsers work properly we now force a redirect causing a full-page load to refresh users’ sessions in the hasSession method.

This directly affects the following methods depending on hasSession:

- isLoggedIn
- isConnected
- getUser
- getUserId
- getUserSDRN
- getUserUuid

Calling these methods may as a side-effect trigger a redirect to Session-service.

To prevent loss of state, we’ve introduced a callback function you can pass in the Identity class constructor that will trigger right before the redirect.


# Adopting ITP changes without using SchAcc SDK

## Overview

If you’re using Schibsted Account sessions without using SchAcc SDK, you’ll have to migrate to a new version of our API for the sessions to not be capped to 7 days.
Additionally, we’ll deprecate the currently used API in the future.

### Necessary changes
Firstly, you’ll need to change the session-service API you’re using to query for sessions from /session to /v2/session.


This new API will detect sessions that are about to expire and in cases where the browser sending the request is Safari-based, will return a new payload:

```json
{
    "redirectURL": "some-path-in-session-service"
}
```


You’ll have to check the response and if it matches the aforementioned payload, you’ll have to manually redirect the client to the resource returned in a response.

This action has to be made client-side, you’ll have to create a valid URL to session service:

```https://global-session-service-url/redirect-url?redirect_uri=url_to_your_app```

At last, you’ll need to trigger a full-page reload by redirecting to this URL. The simplest way to achieve that is to overwrite window.location.href

```window.location.href = redirectURL```

On that page, session-service will be able to set new session cookies and will redirect back to the redirect_uri provided as a query param.
