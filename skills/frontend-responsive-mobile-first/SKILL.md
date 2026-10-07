---
name: frontend-responsive-mobile-first
description: Write or review mobile-first responsive styles in CSS, Vue style blocks, Sass, Less, PostCSS, Stylus, or native CSS nesting. Use for the canonical breakpoint catalog, content-driven breakpoint selection, media or container queries, fluid layouts, viewport constraints, and responsive accessibility preferences.
---

# Responsive Mobile First

Apply responsive layout rules without changing the project's styling language or class methodology. Use `frontend-style-guide` for general formatting and `frontend-bem-css` when available, but complete responsive work from this skill and repository conventions when either companion is absent.

## Resolve Rules in Order

1. Follow the user's explicit requirements, including required breakpoint values.
2. Follow the repository's formatter, linter, build, browser targets, breakpoint map, mixins, custom media, tokens, and established local conventions.
3. Apply this skill's mobile-first, content-driven, accessibility, source-ownership, and generated-output invariants.
4. Use the canonical catalog and remaining rules in this skill as fallbacks.

Do not remove or rename an established breakpoint system during unrelated work. Treat migration as an explicit change and preserve compatibility aliases while they have active call sites.

## Inspect Before Writing

1. Identify the stylesheet language, build pipeline, browser targets, and nesting support.
2. Find existing breakpoint tokens, mixins, custom media, container conventions, and layout primitives.
3. Reuse the established system when it is coherent.
4. If no system exists, select only the needed values from the canonical catalog.

The canonical values are available candidates, not a requirement to emit every query. Introduce a breakpoint where content, line length, controls, or layout actually stop working well.

## Use the Canonical Catalog

Read [references/breakpoint-system.md](references/breakpoint-system.md) whenever the repository lacks breakpoint definitions, the user asks which values are supported, or a migration must map legacy helpers. It provides the detailed catalog for:

- primary width values from mobile through wide desktop;
- optional values for large, Full HD, QHD, ultrawide, and 4K layouts;
- separate primary and optional height values;
- the fallback `m...` and `h...` names;
- legacy breakpoint compatibility.

The explicit fallback catalog is:

- Primary widths: `m360` = `360px`, `m390` = `390px`, `m480` = `480px`,
  `m768` = `768px`, `m1024` = `1024px`, `m1200` = `1200px`, `m1366` = `1366px`,
  and `m1440` = `1440px`.
- Optional large widths: `m1600` = `1600px`, `m1920` = `1920px`, `m2560` = `2560px`,
  `m3440` = `3440px`, and `m3840` = `3840px`.
- Primary heights: `h560` = `560px`, `h640` = `640px`, `h720` = `720px`,
  `h800` = `800px`, `h900` = `900px`, and `h1080` = `1080px`.
- Optional heights: `h480` = `480px`, `h1440` = `1440px`, and `h2160` = `2160px`.

Keep this catalog and the reference synchronized. Define tokens or helpers once, then emit only the queries actually used by a component.

## Build Mobile First

- Put the smallest practical layout in the base rules.
- Add enhancements with `min-width` or modern range syntax when the target browsers support it.
- Keep breakpoints in ascending order within a component.
- Avoid repeating properties whose values do not change.
- Do not create empty media-query or mixin blocks.
- Keep responsive overrides colocated with the component when syntax and repository organization permit it.
- In plain CSS without nesting, keep the wrapping media query near the base component rule.
- Preserve a coherent desktop-first legacy section during a focused fix; migrate it only when the user requests or the component can be safely converted as a unit.

## Choose the Right Query

- Use a **container query** when a component should adapt to the space its container provides.
- Use a **viewport-width query** when the page shell or viewport drives the change.
- Use a **height query** only when available vertical space changes the experience, such as a clipped modal or fullscreen panel.
- Combine width and height only when both constraints are independently necessary.
- Prefer capability and user-preference queries such as `hover`, `pointer`, `prefers-reduced-motion`, `prefers-contrast`, or `forced-colors` over assumptions based on device names.
- Do not infer input capability from width.

## Prefer Fluid Layouts

- Use Grid, Flexbox, intrinsic sizing, `minmax()`, `clamp()`, `min()`, and `max()` before adding a breakpoint.
- Keep readable line lengths and prevent overflow at zoomed text sizes.
- Let images and media shrink within their containers; preserve intrinsic dimensions or aspect ratios to avoid layout shifts.
- Avoid fixed heights for content that can grow through translation, zoom, or user-generated text.
- Preserve the project's breakpoint units. Do not convert the canonical pixel catalog to relative units without an explicit project convention and verification.

## Keep Selectors Searchable

- Keep each component selector as a clear source of truth.
- Do not duplicate IDs for styling; prefer component classes.
- Do not scatter repeated responsive selector blocks across unrelated files without a layering or ownership reason.
- Keep compiled BEM selectors flat. In SCSS, allow `&__element` grouping and nest breakpoint includes inside the selector they modify.

```css
.profile-card {
  display: grid;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
```

If native nesting is unavailable:

```css
.profile-card {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .profile-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
```

## Use Syntax-specific Examples

Read [references/syntax-examples.md](references/syntax-examples.md) when writing Sass/SCSS, Less, PostCSS, Stylus, plain CSS, or native CSS nesting. Load only the relevant syntax section, use values from the canonical catalog, and preserve existing project helpers.

## Compile Responsive Output

- Edit responsive rules in the source stylesheet or Vue component, never in generated CSS.
- Preserve the repository's package manager, lockfile, runtime version, and canonical build command. Do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it.
- Run the existing compiler or frontend build after each coherent source change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Generate the configured CSS, JavaScript, HTML, source maps, and manifests affected by the change.
- Inspect compiled media/container queries and selectors for unintended duplication or specificity.
- Follow existing source and output directories. For a new standalone deliverable without a convention, author under `src/`, generate under `dist/`, and never edit compiled output directly.
- After the final build, rerun it once with unchanged source when feasible. Require no unexplained tracked diff; compare semantic queries, selectors, manifests, and behavior rather than promising byte equality when hashes or timestamps can vary.

## Verify Behavior

For every selected width or height breakpoint `N`, test `N - 1px`, `N`, and `N + 1px`. Also test a representative midpoint between consecutive selected transitions. Check:

- narrow and wide content;
- text zoom and browser zoom;
- long labels and translated text;
- keyboard focus and pointer targets;
- reduced motion and forced colors when applicable;
- overflow in both axes;
- content stress with long labels, translations, empty states, and dense data;
- intermediate widths, text zoom, browser zoom, and accessibility preferences rather than only named devices;
- the generated browser output produced from the source files.

Run available verification in this order: formatter, linter, focused tests, canonical build,
generated-output inspection, then visual and accessibility checks. If a check cannot run, report
its exact command, the blocking reason, and what remains unverified.

## References

- [MDN responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN media query fundamentals](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries)
- [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
