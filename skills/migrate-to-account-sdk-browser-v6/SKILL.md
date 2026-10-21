---
name: migrate-account-sdk-v6
description: Migrate a repository from @schibsted/account-sdk-browser v5 to v6. Use when a developer asks to upgrade/migrate this package from v5 to v6, or mentions migrating off Identity/Monetization to the new Account API.
---

# Migrate to @schibsted/account-sdk-browser v6

You are helping one developer migrate one repository, in one supervised session. The developer
reviews and approves everything; you never commit or push on your own. Read `migration-guide.md`
(bundled next to this file) now — it is the primary reference for what changed between v5 and v6.
Everything below is about *how* to apply it safely, not a restatement of its content.

**The guide can be wrong or out of date — it is a description of the SDK, not the SDK itself.** Before treating any guide claim about a *removed* or *changed* API as
fact — especially the removed-legacy-methods list and anything you're about to tell the developer is
"gone" — check it against the actual package installed in this repo (its published `.d.ts` files
under `node_modules/@schibsted/account-sdk-browser/dist/`, or `npm view`/`npm pack` the exact
declared version if it's not installed yet). If the real package disagrees with the guide, trust the
real package for what you propose, and flag the discrepancy so the developer can raise it on
`#connect-all` per the guardrails below — don't silently pick one source and don't let the mismatch
block the migration.

## Why this isn't a find-and-replace job

v6's goal is to let applications delete code, not just rename it. Client code commonly reimplements
things v6 now does natively: singletons that hand out an already-initialized SDK instance, ad hoc
"ready" events, wrappers around Varnish setup. A migration that only renames v5 symbols to v6
symbols will miss this, and can actively make things worse if it treats client-invented code as if
it were part of the SDK's own public surface — client-invented names and events are not the SDK's to
rename.

Treat every integration as unique. Don't assume a shape because a past migration had one — there is
no "typical" repo here.

## Guardrails

- Never commit or push. The developer reviews and commits everything themselves.
- Never scan outside the current repository (e.g. an org-wide code search, or reaching out to other
  repos or systems) without the developer's explicit request and initiative in this session. You may
  *suggest* this kind of check; you never perform it unprompted. This does not cover reading
  `node_modules` inside this repo's own install — that's code already on disk, scoped to what this
  repo actually depends on, not an external system you're reaching into. The two targeted
  `node_modules` checks named later in this skill (verifying a guide claim against the real package;
  checking whether an installed dependency reads a client-invented global) stay in scope.
- Never guess in places that require confirming semantics — Payment API usage, removed legacy
  methods without a 1:1 replacement, removed events, anything where you can't find every consumer
  in this repository. Ask and wait.
- If something looks like a real bug or ambiguity in the SDK or the migration guide itself (not the
  client's code), suggest the developer post it in the `#connect-all` Slack channel. Never report
  anything anywhere yourself.
- You do bump the SDK version in `package.json` and create a dedicated branch for this migration as
  part of your own work — this is in scope, shown as a normal diff like everything else, not a
  precondition the developer has to satisfy first.

## Step 1 — Announce, then go quiet

Before touching anything, tell the developer briefly what's about to happen: you'll check versions,
find how the SDK is integrated, and map what depends on what, before proposing anything. This may
take a while. Say that you'll come back with one plan covering everything — you won't ask anything
else until then.

The analysis (Step 2) never interrupts and never asks anything mid-way, regardless of what it finds.
Everything that needs the developer's input gets collected and presented together in Step 3, once.

## Step 2 — Understand the integration before proposing anything

This is the core of the work. Do all of it before writing a single line of a plan, let alone code.

Whenever you already know you need to read several files and reading one doesn't depend on what's
in another (e.g. a manifest you already found plus the files it references, or a file and the
consumers you already traced), request them together in one batch rather than one at a time. Only
go file-by-file when a file's content is what tells you the next file to read — don't force that
into a batch, but don't default to one-at-a-time when there's nothing to wait for.

Whatever you search or read *to discover or understand the client's own integration code*, exclude
`node_modules`, `dist`, `build`, and other generated/vendored output, plus `.git` — vendored copies
of the SDK itself and build artifacts are never the client's own integration code, only noise that's
slow to search and can produce false matches (the SDK's own source, bundled inside `node_modules`,
will itself contain words like "Identity" or "schAccount"). This exclusion doesn't narrow *what
shape* of client code counts as the integration — that stays as open as ever — only *where* it's
pointless to look for it.

This exclusion does not apply to two specific, targeted checks elsewhere in this skill, where
`node_modules` is itself the thing being verified rather than noise around it: the guide-vs-real-
package check above (reads specific `.d.ts` files under
`node_modules/@schibsted/account-sdk-browser/dist/` to verify a guide claim against the real
package), and checking whether other installed packages read a client-invented global (Category 2,
point 3 below — reads other packages' own compiled output under `node_modules/@<scope>/<package>` to
verify a real, live read, not a guess from the package name alone). Both are deliberate, narrow reads
of a known path for a specific question, not a repo-wide search for integration code.

### 2.1 Version preflight

Read every `package.json` in the repository, not just the root — monorepos can have several, and
they are not guaranteed to agree.

If the declared version is below `5.x`, **stop**. This skill covers v5→v6 only. Tell the developer
this repo needs an earlier migration first, and that you won't attempt it. Still report anything you
already noticed that will matter for that earlier migration (e.g. an `/es5` deep import, direct
access to underscore-prefixed/private fields on an SDK instance) — you've already seen it, and it
costs nothing extra to mention.

Don't assume one manifest's version applies to the whole repo. A monorepo can contain a second,
unrelated application with no SDK dependency at all — check dependencies, don't infer from directory
names or a version you saw elsewhere in the tree.

### 2.2 Confirm real imports, not name mentions

A search for the package name will also match plain strings — a version number rendered in a debug
panel, a comment, a URL. Before treating a file as part of the integration, confirm an actual
`import`/`require` of the package.

### 2.3 Find the integration, in whatever shape it takes

There is rarely one canonical wrapper. Look for all of:
- A dedicated package inside a monorepo (own `package.json`) wrapping the SDK
- Direct SDK usage spread across state-management code (Redux/nanostores/etc.) with no dedicated
  wrapper at all
- Framework-specific init hooks (e.g. a `useEffect` in React/Next.js) with no wrapper package
- Module-level singletons or promise caches acting as the de facto "wrapper," even if never named
  as one
- Bare `window.<Something>` globals set once and read elsewhere

Before analyzing anything found this way, confirm it's actually live. Trace build-tool aliases
(webpack/tsconfig paths, etc.) to their real target rather than trusting that a file is reachable
just because it exists — orphaned code from an earlier, unrelated refactor is common and easy to
mistake for a second integration point.

**In a monorepo with multiple SDK-dependent packages, build the internal dependency graph before
classifying anything.** Multiple manifests declaring the SDK does not mean multiple independent
integrations. A common shape: one "foundation" package does the actual SDK construction and defines
a client-invented accessor (event, global, or helper); several other internal packages just import
that accessor rather than touching the SDK directly. Treat the accessor as one integration point
with multiple internal consumers — not as one decision per consumer. Some packages may *also* touch
SDK globals independently on top of using the shared accessor; note those separately, they're real,
just not duplicates of the foundation package's own decision.

### 2.4 Classify every touchpoint

Sort everything you found into exactly one of these four categories. Do not skip ahead to proposing
changes until this classification is done for the whole repo.

**Category 1 — SDK-native surface.**
Things named and behaving exactly as the migration guide describes: `new Identity()`/
`new Monetization()`, the SDK's own ready event and globals, `enableVarnishCookie()`, the v5 events
the guide lists as removed, etc. Safe to change automatically — no question needed, just show the
diff.

One frequent mistake to avoid: `enableVarnishCookie` becomes a **construction-time config option**
(`varnish: {...}` passed to `createAccountSdk()`) in v6, not a method you call on the resulting
instance. Don't propose calling it as a method on the new Account-style instance or global.

This category has more specific traps than this one example — see **2.5 Known gotchas in the current
SDK version** below (after all four categories) before treating anything here as a pure rename.

**Category 2 — Client-invented surface.**
Names and events the *client* made up — a custom "ready" event, a bespoke accessor function, a hook
with a project-specific name. Never rename or remove these based on name similarity to something in
the SDK alone:

1. Trace the emission/definition to its actual trigger by reading the code — don't assume a
   plausible-sounding name maps to a specific SDK mechanism. Verify.
2. Map every consumer *in this repository*. Once you know the literal name (a global like
   `window.Identity`, an event name, an exported function name), do an exhaustive text search for
   that exact string across the whole repo (still excluding `node_modules`/`dist`/`build`/`.git`, per
   Step 2) — don't rely only on the consumers you happened to trace by following imports outward
   from the definition. This is different from how you *found* the integration in the first place:
   avoiding name-pattern-matching applies to recognizing unfamiliar code by its role, not to
   confirming every use of a name you've already identified and confirmed as client-invented. A
   consumer reached via a fallback, a destructured import, or a helper function several calls away
   from the definition is easy to miss by tracing alone and easy to catch by searching the literal
   name.
3. **Absence of consumers in this repo is never sufficient grounds to remove the name or contract.**
   Your view of this repo has no visibility into: scripts injected at runtime by ad tech or tag
   managers, other internal packages published from the same monorepo and consumed elsewhere, or
   sibling repositories that depend on this one transitively. Specifically scan comments near the
   definition and usage sites — this is where engineers tend to record "required by X" or
   "needed for Y" warnings.

   For a client-invented **global** specifically (`window.<Something>`, not a scoped
   function/event name), go one step further than checking `package.json`: for every installed
   package that plausibly reads SDK globals implicitly (ad, analytics, widget, header/masthead
   packages — anything that would run in the same page and want the logged-in user or subscription
   state), grep its actual installed output under `node_modules/@<scope>/<package>` for the literal
   global name. This is a deliberate, narrow exception to the node_modules exclusion in Step 2 (see
   there) — you're not exploring *this repo's* integration, you're checking whether an *already-
   identified* global is really read by code you already have on disk. A hit here is a real,
   confirmed, live consumer — cite it as such (which package, roughly what it reads the global for)
   rather than as a hypothetical. Not finding a hit doesn't clear the global for removal on its own
   (per this point's own rule) — it just means this particular check didn't turn up evidence either
   way; still ask, per point 4 below.
4. Default action: **ask** the developer whether the name/event is needed outside this repository —
   never scan for the answer yourself (per the guardrails above). Apply the shared removal-framing
   rule below to phrase the recommendation.
5. If the client-invented surface is itself published as its own package (its own `package.json`,
   not a private file), flag explicitly that changing its public shape can affect consumers outside
   this repository and outside this session's visibility — same rule as point 3, just at package
   granularity instead of file granularity.

**Category 3 — New v6 behavior without precedent.**
Some v6 behavior has no v5 equivalent to map from — there's nothing to translate, only new
consequences to surface. Check `migration-guide.md` for anything described as a new constraint,
default, or failure mode (timeouts, thrown errors on repeat calls, etc.) that a client's own
hand-rolled equivalent almost certainly never had. For each one:
- Find every call site that would be affected.
- Ask explicitly how the new behavior should be handled there — don't silently wrap it in a way that
  masks it.
- Check whether double-initialization could happen unintentionally in this codebase (framework
  strict-mode double-invoke in development, server-rendering plus hydration, independently mounted
  widgets/micro-frontends) — the guide will tell you what happens on a second initialization in v6;
  confirm this repo can't trigger it by accident.
- If a proposed change removes a module-level cache or singleton in favor of calling the new
  SDK-native API directly, check whether that cache was *accidentally* providing protection against
  something else beyond its stated purpose (most commonly: accidental double-init protection).
  Removing it can silently reintroduce a bug the old code happened to be preventing.

**Category 4 — Recognizing a role, not a name.**
Client code often reimplements "give me the already-initialized SDK instance" under many different
shapes: a module-level singleton getter, a framework context/hook, a state-management selector, a
bare global assignment, a hand-rolled promise with an externally-triggered resolve. Recognize the
*role* being played, not the specific shape, and map it to whatever the guide's native answer is for
that role (check both the synchronous/eager-read case and the async/wait-for-ready case — v6 may
answer these differently).

**The underlying mechanism always moves to the SDK-native accessor — this is not optional and not a
choice you present to the developer.** The point of this migration is one shared way to reach the
instance, not a client-maintained getter/wrapper that happens to forward to it. Whatever internal
logic currently hands out the instance (a hand-rolled promise, an event-wait, a module-level getter)
gets replaced by a call to `createAccountSdk()`/`getAccountSdk()` underneath. Don't offer "keep the
old internal mechanism" as an option, and don't let a decision about the *external name* (Category
2) become a reason to leave the *internal mechanism* unchanged — they are two separate things:

- **The name/contract the rest of the app or outside consumers see** (a global, an exported
  function name) is what Category 2's ask-before-removing rule applies to. If it needs to stay for
  compatibility, keep the name — but still repoint what's *behind* the name to the SDK-native call.
- **The internal implementation** is never a question. It changes.

When you write this up in Step 3, apply the shared removal-framing rule below — the naming question
is secondary to the mechanism swap, which happens regardless.

Before doing this:
- Enumerate every method the client actually calls on their old accessor and confirm each has a
  matching method on the new native surface. Not everything will (see 2.5 below) — flag any gap as
  its own point rather than silently dropping the mismatched call.
- This is not a like-for-like rename when the accessor is its own published package — apply the
  Category 2, point 5 rule: flag the cross-repo risk before proposing removal of the *name*, even
  though the implementation swap underneath still happens regardless.
- **Tell the developer about the behavior change, don't ask them to approve it as a choice.** v6's
  accessor can time out (currently 4 seconds) and reject; a client's own hand-rolled
  equivalent almost certainly never had this. State plainly, as part of the plan: "this call site
  now has a timeout it didn't have before, here's what happens when it fires, here's how I've
  handled it / here's what I need you to decide about the fallback." The existence of the new
  behavior is a fact to communicate. What to *do* about the fallback at a given call site (silent
  no-op vs. a visible error, for instance) is the actual decision — don't blur the two into one
  vague question, and don't present "avoid the timeout by keeping the old mechanism" as a way out of
  it, because that path doesn't exist.

**Shared rule — how to frame a "keep the name/wrapper, or remove it" recommendation (Category 2
point 4 and Category 4 both point here).** Regardless of which one applies: **removal is the goal,
stated as such, not softened into "keep it for now."** What's conditional is *when*, not *whether* —
and clearing that condition is the developer's job, not something you resolve by leaving the old
name or wrapper in place indefinitely. Write it in this shape: "Recommended: remove `<name>` — but
that's blocked on you confirming `<the specific dependents you found>` are ready for it; until then,
keep it and repoint the implementation underneath." Never end on "keep it" as the final word — the
final word is "remove it, once you've confirmed `<X>`." If the developer confirms nothing depends on
it, propose full removal now, in this session. If real dependents exist that aren't ready, repoint
the implementation underneath immediately and name removal as the next step once those dependents
are updated — you're not deferring the decision, you're naming who acts on it next.

### 2.5 Known gotchas in the current SDK version

The four categories above are the durable model; this section is the opposite — a running list of
specific, version-dependent traps in the exact SDK version this skill currently targets. Expect this
section to grow as the SDK evolves; when it does, add here rather than folding a new
special case into one of the four categories above and blurring their definitions.

- **`generateState` must preserve the existing login-state flow** (see `migration-guide.md` §10).
  Trace how the application generates, stores, and validates `state`, including callback handling.
  Move the existing generation logic into the required synchronous `generateState` function, which
  must return a non-empty string, preserving the state format and validation flow. Keep explicit
  `state` overrides where a call site needs its own value; do not remove them mechanically.
- **`sessionChange` → `sessionUpdated` requires checking listener expectations**, not just renaming
  the event (see `migration-guide.md` §8). The response moves to `event.detail`, and emission depends
  on changes to `userId` or `result`. Identify listeners that rely on every session read, changes to
  other response fields, or treat the event as confirmation of login/logout. Surface any mismatch
  as a migration decision rather than silently changing the listener's behavior.
- **`enableVarnishCookie` is now construction-time config**, not a method on the resulting instance
  (Category 1). `varnish: {...}` passed to `createAccountSdk()`, not called afterward.
- **`hasAccess()` no longer takes a `userId` argument** — `Account` always resolves the current user
  from the session. `identity.hasAccess(ids, userId)` → `account.hasAccess(ids)` is safe to
  auto-rename (Category 1) **only if** every call site's `userId` is always the currently logged-in
  user. If any call site passes a `userId` that could differ from the session's own user (an admin
  panel checking someone else's access, a server-relayed id), there is no v6 equivalent for that
  call — dropping the argument silently changes whose access gets checked. That specific call site is
  simultaneously a Category 3 case (new behavior with no v5 precedent: v6 physically cannot check
  another user's access the way v5 could) — treat it as a decision, not an auto-change: flag it with
  file/line, explain what would silently change, and ask.

  Before rewriting each call site individually, look across all of them for a shared set of
  `productIds` the client checks by default for the logged-in user. If most pass the same ids,
  that's an opportunity to delete repetition, not just rename: propose moving that shared set into
  `defaultProductIds` on the `createAccountSdk()` config, collapsing those call sites to a bare
  `account.hasAccess()`. Keep explicit ids only at call sites checking a genuinely *different* set of
  products — v6 supports passing ids directly as an override. Still Category 1-style automatic, but
  requires enumerating all call sites first, same as Category 4 does before proposing a replacement.
- **A hand-rolled type guard narrowing `SessionResponse`** (or any other SDK response type) — a
  function of the shape `(x): x is SomeSdkType { ... }` written in the client's own code. Find these
  by what they check, not by what they're named (Category 4's "role, not a name" rule applies here
  too) — a client can call this anything (`isValidSession`, `hasUser`), with no resemblance to the
  SDK's own naming. Recognize the role instead: a function inspecting the shape of an SDK response
  object (a `result`/`error` field, a specific property's presence, a redirect-string shape) to
  decide which variant it's dealing with. v6 exports this narrowing natively
  (`isSessionSuccessResponse`, `isConnectedSessionResponse`, `isConnectedSessionWithUserIdResponse`,
  `isSessionFailureResponse` — see `migration-guide.md` §5); once found, the client should never keep
  maintaining its own version.

  Before swapping one in, check what the hand-rolled version actually tests against what the
  SDK-native guard covers: `SessionResponse` is a four-way union (success, failure, unrecognized, or
  a redirect-URL string), and a guard written against an older two-way mental model may narrow
  differently for variants it was never written to consider. If behavior is equivalent, swap it in as
  a Category 1-style automatic change. If not, surface the mismatch as a decision rather than
  silently changing what a call site treats as a valid session.

## Step 3 — Present one plan, once

Write this for someone who may be looking at v6 for the very first time — no assumed familiarity
with the categories above, the ADR, or SDK internals. Those are your working model, not vocabulary
to hand to the developer. Explain things in terms of *their* code and what changes for them, not in
terms of "Category 2" or "client-invented surface."

Keep the whole thing as short as it can be while staying complete — this is a plan the developer
needs to actually read, not a dump of everything you looked at. Cut anything that doesn't change
their decision.

**Format it so it can be scanned, not just read top to bottom.** A wall of paragraphs with a bold
word here and there is still a wall of text — bold doesn't create structure, headings and spacing do:

- Give each of the three parts below its own `##`/`###` heading — not a bold lead-in sentence buried
  in a paragraph. Headings let someone jump straight to part 3 without reading part 2.
- Inside part 3, give **each decision item its own heading** (`### 1. <short title>`), not a bold
  sentence that starts a paragraph. A heading is visually distinct at a glance; a bold sentence
  inside body text isn't, especially by the third or fourth item.
- Keep the "Where" / "What" / "Recommended" pieces of each decision as short, separately labeled
  lines or sub-bullets — not folded into one continuous paragraph. Someone should be able to read
  just the "Recommended:" lines down the whole document and get the gist.
- One idea per line or per short paragraph (2-3 sentences max). If a paragraph is doing three jobs —
  stating a fact, listing dependents, and giving a recommendation — split it into the three pieces
  the structure below already asks for, rather than writing it as prose and bolding the important
  parts after the fact.
- File paths, symbols, and versions always in backticks, consistently — it gives the eye something
  to land on when scanning past a wall of prose.
- Use a list (numbered or bulleted) for anything with more than two of the same kind of thing —
  dependents, call sites, options. Don't narrate a list as a sentence with "and"s.
- Bold the specific word or short phrase that carries the decision ("recommended: remove", "keep the
  name"), not the whole sentence around it. Bolding entire sentences repeatedly makes nothing stand
  out — it just reads as louder text.

Structure, in this order. Each of the three parts below is a real heading in the output (`##
Summary`, `## What changes automatically`, `## Decisions needed`) — not a label folded into a
paragraph:

**1. Summary.** A few sentences: what this repo's integration looks like, roughly how much can
happen automatically vs. needs a decision, and whether anything blocks starting (e.g. the version
gate). This is what someone reads to know whether to keep reading.

**2. What changes automatically.** Category 1 changes, and any Category 4 changes with no real
ambiguity. Group by outcome, not by file — "all Identity/Monetization instances become one Account
instance" is one bullet, not one per call site. State what and why in one line each.

This is also where confirmed non-findings and settled calls belong — not as their own "decisions." If
an item's recommendation has no real fork ("I'd do this regardless," "I see no reason not to," a
plain confirmation that something wasn't found in this repo), it isn't a decision — put it here as a
short bullet with a one-line reason, not a full writeup under part 3. Reserve part 3 for points where
a reasonable developer could actually pick differently than your recommendation.

**3. Decisions needed.** This is where more space is justified — each item genuinely needs enough
context to decide, not a one-liner. Before writing an item here, check it actually forks: if you
can't picture a developer reasonably answering anything other than your recommendation, it belongs in
part 2 instead, not here padded out to look like one.

Give each item its own heading — `### 1. <short title>` — not a bold sentence starting a paragraph.
Under each heading, use these labeled lines (not one continuous paragraph):

- `**Where:**` the exact file(s) and line(s) or symbol(s) involved, e.g. `identity.ts:18` or
  `getGlobalIdentityInstance() in packages/nanostores-account/src/account.ts` — enough that the
  developer can jump straight to the code and check it themselves, not a vague reference to "the
  identity module."
- `**What:**` what you found and why it concretely matters — what actually breaks or changes, not
  "this is Category 3." One short paragraph, not a page.
- `**Affects:**` only when there are multiple distinct dependents (several consumer files, several
  packages, a mix of internal and external code, a global read by more than one thing) — a sub-list,
  one dependent per line, each with what it reads/does and what happens to it under the proposed
  change. Skip this line entirely for single-dependent items; don't force the label onto a one-liner.
- `**Recommended:**` a single, plainly stated line: "remove X" or "option A." Don't leave the
  developer to infer what you think they should do from the paragraph above alone. If you're offering
  named options, still say which one you'd pick, even if the final call is theirs. If the recommended
  action genuinely differs across dependents in the same item (e.g. "keep the global for these
  external readers, but this internal caller can be updated directly"), give that its own two short
  lines under `**Recommended:**` — never one sentence trying to hold both. If you find yourself
  writing "isn't literal since X, so this needs care" or similarly hedging mid-sentence, stop and
  split it: state plainly what you'd actually do, not that it's complicated.

Number the item headings themselves (`### 1. ...`, `### 2. ...`) so the developer can reply "1: yes,
2: no, 3: option B."

**One number, one fork.** If a touchpoint raises two questions a developer could answer
independently of each other (e.g. "guard against double-init?" and, separately, "how should the new
timeout be handled?"), give them separate headings and numbers, even if they're about the same call
site or the same underlying SDK change. Don't combine them into one item just because they're
related — that forces one reply to cover two decisions, and makes it unclear which part they're
agreeing to.

**Don't promise a later section that doesn't exist.** If you write "flagging this below" or "see the
gap noted further down," that has to correspond to an actual separate item — not the sentence you're
already writing. If there's nothing further to add, say the thing once, where you are, and don't
gesture at a followup that never arrives.

Things you noticed but can't act on now (a sibling package below v5, a dependency you can't verify,
something worth raising on `#connect-all`) belong folded into the relevant decision item above as
context, or mentioned in passing in the summary — don't give them their own separate section; a
"things I'm not doing" list adds length without helping the developer decide anything.

Ask the developer to respond to part 3; nothing proceeds until they do.

## Step 4 — Apply changes

Execute Category 1 changes and the decisions resolved in Step 3, showing diffs as you go — don't ask
again per file for things already agreed. For anything in Category 2/3/4 where the developer's
answer was itself a design decision (not just yes/no), confirm you understood it correctly before
editing.

## Step 5 — Verify

- Tell the developer which lint/typecheck/build/test scripts you found in `package.json`, and ask
  whether they want you to run them now. Don't just start executing — they may prefer to run checks
  themselves, or skip this step entirely. That's their call.
- If they agree, say so before running each command ("Running `npm run typecheck` now...") and
  report the outcome plainly — pass/fail and the actual error output.
- If a command hangs, fails in a way that isn't immediately explicable, or you find yourself
  retrying the same command expecting a different result, **stop and say so explicitly.** Never
  retry silently or try workarounds without saying what you're doing and why. Surface it as "this
  isn't working and I don't know why, here's what I tried."
- Explicitly state what these checks do **not** cover. Login/session flows are commonly
  under-tested — a green run does not mean the login flow works. Name this as its own item, not an
  implicit assumption.
- Walk `migration-guide.md`'s final checklist item by item with the developer.
