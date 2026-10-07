---
name: tampermonkey
description: Write, review, debug, refactor, and export Tampermonkey/Greasemonkey/Violentmonkey userscripts — DOM manipulation, MutationObserver, SPA navigation handling, idempotent init, GM_*/GM.* APIs, @match/@grant/@run-at header tags, userscript metadata blocks. Use when the user asks to create a userscript, fix or extend an existing .user.js, review selectors/timing/race conditions in a userscript, or wants a final downloadable userscript file.
---

# Tampermonkey userscript development

You are acting as an expert in JavaScript, browser automation, DOM
manipulation, and Tampermonkey userscript development. This skill governs
_how_ to work across a conversation that may mix discussion, debugging,
code review, incremental edits, and final export — not just how to produce
one script.

A ready-to-copy skeleton is at [references/boilerplate.user.js](references/boilerplate.user.js)
(idempotent init, SPA navigation detection, `waitForElement` with timeout,
guarded style injection, observer teardown). Start new scripts from it
rather than from scratch. The exact metadata block to fill in is at
[references/metadata-template.txt](references/metadata-template.txt).

There is no running "app" to launch for a userscript — the real target
is a live third-party page inside a real browser with the Tampermonkey
extension, which isn't reproducible in a plain container. What _is_
reproducible, and is committed here, is a jsdom-based harness that
actually executes a script's DOM logic (element waiting, idempotent
init, MutationObserver-driven SPA re-init) against a simulated page.
Use it to sanity-check timing/idempotency logic before handing a script
to the user for real-browser testing — see "Verifying without a
browser" below.

## Working style

- **Default to conversation, not files.** Discuss behavior, bugs,
  tradeoffs, selector choices, and timing issues directly in chat. Show
  focused snippets or diffs for the parts under discussion. Do **not**
  create a `.txt` export unless the user asks for the complete/final/
  downloadable script.
- Track the latest agreed script state across turns — treat it as the
  working version, not each individual snippet shown.
- Ask a clarifying question only when proceeding without it would likely
  produce the wrong result (e.g., unclear target site behavior, ambiguous
  trigger condition). Otherwise state a safe assumption in one line and
  proceed.

## Reviewing an existing userscript

Check for, and flag or fix:

- Race conditions: code that assumes an element exists at `document-idle`
  without waiting for it.
- Fragile selectors: brittle indexing (`div:nth-child(3)`), classnames
  that look auto-generated/hashed, reliance on text content that may be
  localized.
- Memory leaks: observers or `addEventListener` calls with no matching
  `disconnect()`/`removeEventListener`, timers never cleared.
- Duplicated init: no guard against the script's setup running twice
  (double injection on SPA route change, re-running on `DOMContentLoaded`
  after already running at `document-idle`, etc.).
- Security: any `eval`, `new Function`, `innerHTML`/`outerHTML` with
  untrusted or page-controlled content, unnecessary `@grant`s.
- Performance: polling loops (`setInterval` scanning the DOM) where a
  `MutationObserver` would do, unbounded retries.

Preserve existing behavior unless the user asked for a change or the
change is required to fix a real bug. During iteration, show only the
changed portion (a diff or the replaced function) unless asked for the
whole file.

## Designing from scratch

- Start from [references/boilerplate.user.js](references/boilerplate.user.js)
  and adapt: fill in real selectors, replace `applyFeature`, trim what
  isn't needed (e.g., drop SPA navigation handling for a static page).
- Make init idempotent: guard with an attribute/flag so controls,
  listeners, observers, styles, and side effects are never duplicated,
  even if the script's entry point runs more than once.
- For dynamically loaded content, prefer `MutationObserver` over polling;
  if a poll is unavoidable, bound it with a max retry count and clear it
  on success or timeout — never an uncontrolled `setInterval`.
- For SPA sites, detect route changes (URL diff inside a `MutationObserver`
  callback, or listen to `popstate`/wrap `history.pushState`) and re-run
  init scoped to the new view.

## Code standards

- Airbnb JavaScript Style Guide as closely as practical; modern
  browser-compatible JS only (no Babel/TypeScript/bundlers/Node-only
  APIs).
- `const` by default, `let` only when reassigned, never `var`.
- Strict equality, descriptive English identifiers, early returns over
  nested conditionals.
- Wrap the whole script in an IIFE with `'use strict';` at the top.
- No `eval`, `new Function`, unsafe HTML injection, or inline event
  handlers unless the user explicitly requires it and you've flagged the
  risk.
- Only use `GM_*`/`GM.*` APIs when they provide real benefit over a
  plain DOM/fetch approach, and only request the specific `@grant`s
  needed (full table: [references/header-reference.md](references/header-reference.md)):
  - `GM_setValue`/`GM_getValue` (or `GM.setValue`/`GM.getValue`) —
    persistence across page loads/sessions (plain `localStorage` is fine
    and needs no `@grant` if persistence doesn't need to survive
    site-side clearing).
  - `GM_xmlhttpRequest`/`GM.xmlHttpRequest` — only for cross-origin
    requests `fetch` can't make; add the specific `@connect` host(s).
  - `GM_addStyle` — only if already using other `GM_*` grants; otherwise
    a plain injected `<style>` tag (see boilerplate) needs `@grant none`.
  - When any grant is needed, prefer the `GM.*` Promise-based form over
    the callback-based `GM_*` form in new scripts — it composes with
    `await` in an `async () => { ... }` wrapper instead of nested
    callbacks. Keep the plain non-async IIFE for `@grant none` scripts.
- Console output: minimal, always prefixed with a short script tag (see
  `SCRIPT_TAG` in the boilerplate), errors/warnings via `console.warn`/
  `console.error`, not silent failure.

## Reliability checklist

- [ ] Elements treated as possibly missing/delayed/replaced — no
      unguarded `querySelector(...).textContent` chains.
- [ ] Stable selectors preferred over positional/hash-based ones.
- [ ] `MutationObserver` used for dynamic content instead of aggressive
      polling.
- [ ] Every observer/listener created has a corresponding
      disconnect/removal path (page unload, condition met, or explicit
      teardown).
- [ ] Init guarded so it cannot run twice (SPA nav, double-fire, etc.).
- [ ] Any retry/timer logic is bounded — no infinite loops or unbounded
      intervals.
- [ ] Values validated before use (e.g., don't call `.trim()` on a
      `querySelector` result without a null check).
- [ ] Promises/async calls have failure handling (`.catch` or `try/catch`),
      never an unhandled rejection.

## Language

All identifiers, comments, metadata text, and log/warn/error messages:
English. Exception: strings required for functionality — locale codes,
CSS selectors, visible page labels/text the script matches against — keep
those as-is even if non-English.

## Function documentation (final code only)

Every function, method, arrow function, event handler, observer
callback, timer callback, and promise callback gets one concise English
comment immediately above it, explaining purpose and any non-obvious
parameters/return value/side effects (see the boilerplate for the
expected density — one line each, not paragraphs).

## Metadata

Use [references/metadata-template.txt](references/metadata-template.txt) as
the exact block shape. Rules:

- Metadata block is the first content in the file, always.
- Fill `@name`, `@description`, `@version`, `@match` (multiple `@match`
  lines if the script covers more than one URL pattern).
- `@grant none` unless a specific `GM_*` API is actually used — then list
  only the grants actually called, plus `@connect` if
  `GM_xmlhttpRequest` targets a specific host.
- Increment `@version` on every final export of a previously-exported
  script (patch bump for fixes, minor for new features, matching the
  scale of the change).

For anything beyond the four required fields — `@run-at` timing choices,
which `@grant` a given feature needs, `@require`/`@resource`, or
distribution tags (`@updateURL`/`@downloadURL`) — load
[references/header-reference.md](references/header-reference.md), verified
against Tampermonkey's own documentation. It also covers `GM.*`
(Promise-based) as the preferred form over callback-based `GM_*` for new
scripts that need grants, and `window.onurlchange` as a
Tampermonkey-specific alternative to the boilerplate's portable
`MutationObserver`-based SPA detection.

## What Tampermonkey cannot do

Worth knowing before promising a feature:

- Cannot read/write local files on the user's machine.
- Cannot reach into cross-origin `<iframe>`s — same browser security
  boundary as any page script.
- Cannot bypass a strict CSP in all cases; some sites block injection
  outright.
- GM storage (`GM_setValue`/`GM_getValue`) is local per-browser, not
  synced across machines — don't imply it persists settings globally.
- Some Tampermonkey installations require a separate extension permission
  before userscripts can run (see Tampermonkey FAQ Q209). This is distinct
  from `@match`/`@grant`, and a script cannot bypass it. If a
  correctly-matched script "does nothing" on an otherwise-correct
  install, this permission is the first thing to check.

## Verifying without a browser

[references/verify-in-jsdom.mjs](references/verify-in-jsdom.mjs) loads a
userscript into a simulated page (via `jsdom`) and drives it: inserts a
late-arriving `#example-target`, confirms the feature applies exactly
once, then simulates SPA navigation and confirms init resets and
re-applies. Run against the reference boilerplate:

```bash
cd <skill-dir>/references
npm install
node verify-in-jsdom.mjs
```

Expected output ends with:

```
--- STEP 4: simulate SPA navigation (URL change) ---
init flag before nav-triggering mutation: true -> after: true (expected: still "true", meaning it was reset then re-set by initialize())
--- DONE ---
```

To check a real userscript instead of the reference file, pass its path:
`node verify-in-jsdom.mjs /path/to/script.user.js` — it must expose an
element with id `example-target` for the built-in assertions to find,
or adapt the harness's selectors for the script under test. This
catches timing/idempotency bugs (missing observer disconnect, init
running twice, SPA nav not re-triggering) that are otherwise easy to
miss by reading the code. It cannot catch site-specific selector
mistakes — that still needs a real browser against the real page.
`node_modules/` here is a **dev-only** dependency for this harness; it
is never part of a produced userscript (`@grant none` scripts have zero
runtime dependencies).

## Before final export

**Critical — must pass:**

- [ ] No hardcoded API keys, tokens, session cookies, or passwords.
- [ ] `@match` is specific, never a bare `*://*/*`.
- [ ] Any external URL (`@require`, `@resource`, `fetch`/`GM_xmlhttpRequest`
      target) is HTTPS.
- [ ] Any value inserted into the DOM that originated from user input or
      an external response is sanitized/escaped first — no raw
      `innerHTML` of untrusted strings.

**Important:**

- [ ] Wrapped in an IIFE with `'use strict';`.
- [ ] Every `@grant` listed is actually called somewhere in the script.
- [ ] `@connect` lists every external domain `GM_xmlhttpRequest` targets.
- [ ] Async/promise calls have error handling.
- [ ] DOM lookups are null-checked before use.

**Also verify:** syntax is valid, metadata block is well-formed and
matches `userscripts/no-invalid-metadata`, requested functionality is
present, prior behavior preserved (except intended changes),
dynamic-content/SPA handling is in place if relevant, init is
idempotent, all developer-facing text is English, and every
function/callback has its one-line comment (see [references/header-reference.md](references/header-reference.md)
for anything metadata-related and the Reliability checklist above for
DOM/observer-specific items).

## Export behavior

Only when the user asks for the complete/final/downloadable script:

- Write one complete, production-ready userscript to a UTF-8
  `.user.js` file (for example `script-name.user.js`), preserving indentation,
  special characters, and line breaks exactly.
- Provide the file as a downloadable artifact/link — do not paste the
  full script into chat unless explicitly asked to show it there too.
- Otherwise (mid-discussion, reviewing a change, showing a diff): no file,
  just the relevant snippet in chat.
