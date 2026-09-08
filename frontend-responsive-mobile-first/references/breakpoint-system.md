# Canonical Breakpoint System

Use this catalog as the shared fallback when the user or repository does not
already define a coherent breakpoint system. These are CSS viewport values,
not claims about physical device pixels.

## Contents

- [Resolution order](#resolution-order)
- [Width breakpoints](#width-breakpoints)
- [Height breakpoints](#height-breakpoints)
- [Selection rules](#selection-rules)
- [Token and helper names](#token-and-helper-names)
- [Legacy compatibility](#legacy-compatibility)

## Resolution Order

1. Follow breakpoints explicitly required by the user.
2. Preserve an established repository map, mixin, custom-media, or token system.
3. Use this canonical catalog when no coherent project system exists.
4. Add a value outside the catalog only when content demonstrates a transition
   that the available values cannot express cleanly; document that exception.

Do not silently replace or remove a named breakpoint system during unrelated
work. Treat a migration as a separate, explicit change.

## Width Breakpoints

Primary values cover the normal mobile-to-desktop progression:

| Name | Value | Viewport class |
| --- | ---: | --- |
| `m360` | `360px` | narrow mobile viewport |
| `m390` | `390px` | common mobile viewport |
| `m480` | `480px` | large mobile viewport |
| `m768` | `768px` | tablet portrait or expanded component |
| `m1024` | `1024px` | tablet landscape or small laptop |
| `m1200` | `1200px` | laptop or compact desktop |
| `m1366` | `1366px` | HD desktop viewport |
| `m1440` | `1440px` | wide desktop viewport |

Optional values apply only when the design actually changes on large displays:

| Name | Value | Viewport class |
| --- | ---: | --- |
| `m1600` | `1600px` | large desktop or wide dashboard |
| `m1920` | `1920px` | Full HD viewport |
| `m2560` | `2560px` | QHD or 2K viewport |
| `m3440` | `3440px` | ultrawide viewport |
| `m3840` | `3840px` | 4K viewport |

## Height Breakpoints

Use height queries only when available vertical space changes the experience.
They are not substitutes for width queries.

Primary height values:

| Name | Value | Viewport constraint |
| --- | ---: | --- |
| `h560` | `560px` | short mobile or embedded viewport |
| `h640` | `640px` | common mobile vertical space |
| `h720` | `720px` | tall mobile vertical space |
| `h800` | `800px` | tablet or short laptop |
| `h900` | `900px` | comfortable laptop height |
| `h1080` | `1080px` | Full HD height |

Optional height values:

| Name | Value | Viewport constraint |
| --- | ---: | --- |
| `h480` | `480px` | extremely constrained or landscape viewport |
| `h1440` | `1440px` | QHD or 2K height |
| `h2160` | `2160px` | 4K height |

## Selection Rules

- Make the base styles work below the first selected breakpoint.
- Select the smallest canonical value at which the content can safely change.
- Do not emit every value merely because it exists in this catalog.
- Keep selected queries in ascending order.
- Use optional large-screen values only when layout, density, or line length
  changes intentionally; do not stretch content just to fill the viewport.
- Combine width and height only when both constraints are independently needed.
- Keep width and height names distinct; never mirror the width catalog into
  height helpers.
- For every selected threshold `N`, test `N - 1px`, `N`, and `N + 1px`.
- Test a representative midpoint between consecutive selected thresholds, plus
  content stress, text/browser zoom, keyboard access, and applicable accessibility
  preferences.

## Token and Helper Names

Preserve repository naming when present. Otherwise use the canonical `m...`
names for `min-width` and `h...` names for `min-height` so the value remains
visible and searchable.

Define values once in a map, custom-media file, or equivalent shared source.
Use a generic helper when the language supports it instead of duplicating the
same `@media` implementation in every named mixin. A helper or token must not
emit CSS until a component actually uses it.

Do not convert the canonical pixel values to `rem` or `em` mechanically. Use
relative query units only when the project has deliberately adopted them and
the conversion preserves its breakpoint contract.

## Legacy Compatibility

Keep active legacy aliases during a migration; do not rewrite all call sites as
part of an unrelated component change. Use these mappings as review guidance,
not automatic replacements:

| Legacy width | Preferred candidate |
| --- | --- |
| `m450` | `m390` or `m480` after testing content |
| `m576` | retain for framework-grid compatibility, otherwise evaluate `m480` or `m768` |
| `m600` | `m480` or `m768` |
| `m650` | `m768` |
| `m800` | `m768` |
| `m900`, `m992` | `m1024` |
| `m1400` | `m1366` or `m1440` |
| `m1800` | `m1920` |
| `m2200` | `m2560` |

| Legacy height | Preferred candidate |
| --- | --- |
| `h360` | retain only for extreme landscape constraints |
| `h450` | `h480` |
| `h576`, `h600`, `h650` | `h560` or `h640` after testing |
| `h768` | `h720` or `h800` |
| `h992` | `h900` or `h1080` |
| `h1200` | `h1080` or `h1440` |
| `h1400` | `h1440` |
| `h1800`, `h2200` | `h2160` only when the large-height design requires it |
