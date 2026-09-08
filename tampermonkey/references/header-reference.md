# Userscript header reference

Verified against https://www.tampermonkey.net/documentation.php. Only
tags with real day-to-day relevance are covered; see that page for the
full list (`@copyright`, `@tag`, `@webRequest`, `@unwrap`, `@sandbox`,
etc.).

## Identity

| Tag                 | Required            | Notes                                                                                                          |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@name`             | Yes                 | Supports i18n via `@name:fr`, `@name:de`, etc.                                                                 |
| `@namespace`        | Recommended         | Disambiguates scripts with the same `@name`. A URL you control is the convention; it doesn't need to resolve.  |
| `@version`          | Yes for auto-update | Semantic-ish (`1.2.3`); Tampermonkey compares versions to detect updates — see `version-numbering` note below. |
| `@description`      | Recommended         | One line, supports `:locale` suffix same as `@name`.                                                           |
| `@author`           | Optional            | Free text.                                                                                                     |
| `@icon` / `@icon64` | Optional            | Shown in the dashboard; `@icon64` for high-DPI.                                                                |

## Targeting

| Tag         | Notes                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@match`    | Preferred over `@include` — stricter syntax (`scheme://host/path`), matches the browser's own extension-matching rules. Use multiple `@match` lines rather than a broad pattern. |
| `@include`  | Legacy, accepts loose glob/regex. Prefer `@match` for new scripts.                                                                                                               |
| `@exclude`  | Subtracts from `@match`/`@include`.                                                                                                                                              |
| `@noframes` | Script runs only in the top frame, not in `<iframe>`s on the matched page.                                                                                                       |

```
@match        https://example.com/*
@match        https://*.example.com/*
@exclude      https://example.com/admin/*
```

## Timing

| `@run-at` value           | Fires                                       | Typical use                                                  |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `document-start`          | Before any page script runs                 | Blocking/patching globals before the page's own JS sees them |
| `document-body`           | As soon as `<body>` exists                  | Early DOM insertion                                          |
| `document-end`            | At `DOMContentLoaded`                       | Most scripts                                                 |
| `document-idle` (default) | After `DOMContentLoaded`, page idle         | Safe default; used in the boilerplate                        |
| `context-menu`            | Only when invoked from the right-click menu | User-triggered one-off actions                               |

`@run-in` (Tampermonkey v5.3+) restricts _where_ the script runs
regardless of timing: `@run-in normal-tabs` / `@run-in incognito-tabs` /
a specific Firefox container. Rarely needed — omit unless the user asks
for incognito/container isolation.

## Permissions (`@grant`)

`@grant none` disables the API sandbox entirely (script runs closer to
page context, gets `GM_info` only) — the right default for scripts that
only touch the DOM. Add grants only for what's actually called:

| Need                                                     | Grant                                                                                                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persist small values across page loads                   | `GM_setValue` / `GM_getValue` (or `GM.setValue`/`GM.getValue`, promise-based)                                                                                           |
| Cross-origin request `fetch` can't make                  | `GM_xmlhttpRequest` + one `@connect <host>` per external domain                                                                                                         |
| Inject CSS without a `<style>` tag                       | `GM_addStyle`                                                                                                                                                           |
| Read the page's real `window` (bypass sandbox isolation) | `unsafeWindow` — see Gotchas in `SKILL.md`, this is the highest-risk grant                                                                                              |
| Desktop notification                                     | `GM_notification`                                                                                                                                                       |
| Dashboard menu entry                                     | `GM_registerMenuCommand` / `GM_unregisterMenuCommand`                                                                                                                   |
| Detect SPA URL changes without polling                   | `window.onurlchange` (Tampermonkey-specific; not portable to Greasemonkey/Violentmonkey — the boilerplate's `MutationObserver`-based URL diff is the portable fallback) |
| Bundle a CSS/text resource at install time               | `GM_getResourceText` / `GM_getResourceURL` + `@resource`                                                                                                                |
| Mute/read tab audio state                                | `GM_audio.setMute` / `GM_audio.getState`                                                                                                                                |

Every `GM_x` sync/callback function has a `GM.x` Promise-based
equivalent (e.g. `GM.getValue`, `GM.xmlHttpRequest`) — prefer the
Promise form in new scripts so `await` composes normally with the rest
of the script; keep `async () => { ... }` as the outer wrapper instead
of a plain IIFE when using them.

## External code and resources

```
@require      https://code.jquery.com/jquery-3.6.0.min.js#sha256-<hash>
@resource     myCSS https://example.com/style.css
@grant        GM_getResourceText
@grant        GM_addStyle
```

- `@require` loads an external script before yours runs. Pin a
  `#sha256-` (or `#md5=`) integrity hash — an unpinned `@require` is a
  supply-chain risk (the remote file can change under you). Prefer zero
  dependencies over adding one.
- `@resource` preloads a named resource (commonly CSS) without executing
  it; read it via `GM_getResourceText('myCSS')` and inject with
  `GM_addStyle`.

## Distribution

| Tag            | Notes                                             |
| -------------- | ------------------------------------------------- |
| `@updateURL`   | Where Tampermonkey checks for a newer `@version`. |
| `@downloadURL` | Where it fetches the new script from.             |
| `@supportURL`  | Bug-report/support link shown in the dashboard.   |

Omit all three for a script that's just being handed to one user as a
`.txt` file — they only matter for scripts distributed via a hosted URL
with auto-update.
