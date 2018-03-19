# Contributing to Schibsted Account SDK for browsers

Aww, thanks for wanting to help out :tada:! We would be very grateful if you would discuss your idea
in an issue before implementing it, add tests for new features or bug fixes, and finally validate
your code (by running `npm test`) before making a PR.

## Code of Conduct
The project is governed by the [Schibsted Account Code of Conduct](../CODE_OF_CONDUCT.md). Please
report unacceptable behavior to support@spid.no.

## License
This SDK is released under the [MIT License](../LICENSE.md). Unless you explicitly state otherwise,
any code you submit to us will be released under the same license.

## Practical information
We expect submissions to be consistent with existing code in terms of architecture, coding style and
testing.

#### Build project and run tests
```
npm install
npm test
```

#### Releasing
Releases are triggered by Travis. The correct way to do this, is:

1. Update `package.json` with a new version
1. Run `npm install` so that `package-lock.json` is also up-to-date
1. Update `CHANGELOG.md` with relevant changes, in sections **New features**, **Fixes**, not to
   mention the most important one; **Breaking changes**
1. Commit those changes, push a PR and land it
1. Create a [new release](https://github.com/schibsted/account-sdk-browser/releases/new) and name it
   according to the version number you just placed in `package.json`
1. Pray to the Travis gods
