---
name: frontend-style-guide
description: Write, generate, or review maintainable HTML and stylesheets in CSS, Sass, Less, PostCSS, Stylus, or native CSS nesting. Use for frontend formatting, readable nesting, selector discipline, tokens, source-versus-compiled output, markup quality, or preprocessor organization; combine with the specialized BEM, responsive, JavaScript, or Vue skill when those concerns apply.
---

# Frontend HTML and Stylesheet Guide

Apply this skill as the shared baseline for HTML and stylesheet work. Do not extend it to backend code, general-purpose languages, React, Svelte, or frameworks outside the Vue/Nuxt scope.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow repository-owned formatter, linter, build, design-system, browser-target, and established local conventions.
3. Apply this skill's HTML, stylesheet, source-ownership, and compiled-output invariants.
4. Use the remaining rules in this guide as fallback conventions.

Do not silently replace a coherent repository rule with a fallback from this guide. Report material conflicts and migrate only when the user requests it. Do not reformat unrelated code.

## Coordinate Companion Skills

Companion skills are optional specializations. This skill must remain usable by itself; when a named companion is unavailable, apply the repository convention and the relevant baseline rules in this guide instead of blocking the task.

- Use `frontend-bem-css` for BEM class architecture; this guide controls its formatting.
- Use `frontend-responsive-mobile-first` for breakpoints, media queries, and container queries.
- Use `frontend-javascript-style-guide` for browser JavaScript.
- Use `frontend-vue-style-guide` for Vue single-file components; apply this guide only to their template and style regions.
- Use `frontend-nuxt` for Nuxt 4 installation, `app/` structure, SSR/hydration, assets, and `.output/` builds.
- Keep `frontend-web-performance` independent because measurement and optimization are a separate workflow.

## Write HTML

- Indent standalone HTML with 4 spaces when the repository has no formatter rule. Let the Vue skill govern indentation inside `.vue` files.
- Use lowercase element and attribute names and double quotes around attribute values.
- Close every non-void element. Do not add closing tags or XML-style trailing slashes to HTML void elements.
- Prefer semantic HTML before adding ARIA roles. Keep labels, accessible names, heading order, and alternative text meaningful.
- Omit values from boolean attributes such as `disabled`, `checked`, `selected`, `required`, `multiple`, and `autofocus`.
- Keep one element on one line only while it remains readable; wrap long or multi-attribute elements consistently.

Order attributes as a stable fallback:

1. `class`;
2. `id`, `name`;
3. `data-*`;
4. `src`, `for`, `type`, `href`, `value`;
5. `title`, `alt`;
6. `role`, `aria-*`.

Do not reorder attributes when the repository formatter or Vue tooling defines another order.

```html
<a class="account-link" id="account-link" data-track="account" href="/account">
    Account
</a>
```

## Write CSS

- Indent with 2 spaces.
- Put one declaration per line, one space after `:`, one space before `{`, and a semicolon after every declaration.
- Put grouped selectors on separate lines.
- Use lowercase hyphenated names for non-BEM classes. When BEM applies, preserve its
  `block__element` and `block--modifier` separators.
- Use meaningful structural class names rather than presentational names.
- Do not introduce HTML tag selectors or ID selectors for styling; use classes.
- Do not style `.js-*` hooks.
- Do not use `!important`.
- Keep selector specificity low and nesting shallow. Limit selector nesting to three levels, and prefer fewer.
- Nest pseudo-classes, pseudo-elements, state/modifier selectors, and colocated at-rules only when the active syntax supports them.
- Keep compiled BEM selectors flat. In SCSS, allow `&__element` and `&--modifier` grouping when the project adopts that readable source convention.
- Use unitless zero and a leading zero for decimals.
- Use variables or custom properties for colors. Raw hexadecimal values are allowed only in variable definitions; write hexadecimal values in lowercase.
- Write alpha values with a leading zero and at most two decimal places.
- Reuse existing custom properties, tokens, and scales. Do not invent a parallel token system during a focused change.
- Prefer logical properties when they match the repository's browser targets and writing-mode needs.

Order declarations by concern when no formatter enforces another order:

1. positioning and stacking;
2. display and box model;
3. typography;
4. visual treatment;
5. transforms, transitions, and animation;
6. interaction and miscellaneous behavior.

Keep related longhands together. Do not reorder custom properties away from the rules that depend on them merely to satisfy this fallback order.

## Use SCSS Nesting for Readability

- Use nesting to keep one component's base rule, pseudo-classes, pseudo-elements, BEM suffixes, state selectors, and responsive at-rules together.
- Prefer one or two nesting levels. Allow a third level only for a modifier, state, pseudo-selector, or conditional at-rule whose compiled selector remains simple.
- Use `&` when the relationship to the current selector is explicit: `&:hover`, `&::before`, `&[aria-expanded="true"]`, `&__element`, and `&--modifier`.
- Allow a nested descendant only when the DOM relationship is an intentional part of the component API. Prefer adding a class when the child needs independent styling.
- Do not mirror the entire HTML tree in SCSS or create page-context chains such as `.page .section .card .card__title`.
- Avoid property nesting such as `font: { ... }` when explicit declarations are easier to scan and search.
- Inspect compiled selectors after changing nesting. Reject output with accidental descendant combinators, duplicated parents, or excessive specificity.

```scss
.card {
  display: grid;

  &__title {
    font-weight: 700;
  }

  &--featured {
    border-color: var(--color-accent);
  }

  &:focus-within {
    outline: 2px solid currentColor;
  }
}
```

## Handle Spacing

- Use `gap` for layout-owned spacing when possible.
- Do not use `margin-top`. Put trailing space on the preceding element with `margin-bottom` or `margin-block-end`, use `gap`, or use top padding on the containing layout.
- Keep one directional spacing convention within a component flow.
- Keep external component placement in the parent layout and internal rhythm inside the component.

## Preserve Stylesheet Languages

- Preserve the current file extension, syntax, formatter, and build pipeline.
- Do not translate Sass, Less, PostCSS, Stylus, or native CSS nesting merely to apply this guide.
- Put Sass module directives or legacy imports at the top; do not place declarations before them.
- For new Sass modules, prefer `@use` and `@forward`; retain deprecated `@import` only while maintaining legacy code that still depends on it.
- Order a shared Sass entry file as imports/modules, variables, base styles, components, header, forms, and footer unless the user explicitly defines another team order.
- Keep variables, mixins, functions, and custom media in shared files only when reuse justifies the indirection.
- Name local Sass variables with lowercase snake case and global constants with uppercase snake case. Preserve established Less and CSS custom-property naming.
- Avoid deep preprocessor nesting and generated selector explosions.

## Generate Source and Compiled Files

- Treat source files as the only editable source of truth.
- When generating a frontend deliverable, create or update both the source files and the compiled browser output.
- Follow existing source and output directories. If a new standalone project has no convention, use `src/` for authored files and `dist/` for generated files.
- Preserve the repository's package manager, lockfile, runtime version, and canonical build command. Do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it.
- Compile Sass, Less, PostCSS, Stylus, Vue, and JavaScript with the project's existing build command. Never hand-edit or manually duplicate generated output.
- Rebuild after each coherent source change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Keep development output readable and emit source maps when the pipeline supports them. Let the configured production build control minification and hashing.
- If generated files are intentionally ignored, still run the build and verify the output locally; do not force ignored artifacts into version control.
- Treat the task as incomplete when required compilation fails. Report the exact command and failure instead of fabricating output.
- After the final build, rerun the canonical build once with unchanged source when feasible. Require no unexplained tracked diff. Compare semantic output, manifests, and behavior rather than promising byte equality when the toolchain emits hashes or timestamps.

Read [references/source-and-build-output.md](references/source-and-build-output.md) when creating files, choosing `src/` and `dist/` structure, or deciding which compiled artifacts must be produced.

## Delegate Responsive Rules

Keep base styles outside queries and use the repository's breakpoint system. In SCSS and another preprocessor with suitable helpers, keep responsive changes inside the affected selector and use the shared breakpoint mixin or helper. In plain CSS, keep the media query close to the selector. When available, load `frontend-responsive-mobile-first` for responsive work; otherwise preserve the project system and introduce only content-required breakpoints.

## Review Checklist

- Confirm the active formatter and linter before changing style.
- Validate semantic HTML and accessible names.
- Check selector specificity, nesting, and component boundaries.
- Check for forbidden tag/ID selectors, `.js-*` styling, `!important`, and `margin-top`.
- Check that colors use variables and Sass variables follow the team naming convention.
- Check that tokens and existing variables are reused.
- Check that the chosen preprocessor syntax is valid for the current pipeline.
- Check SCSS source readability and the selectors emitted by nesting.
- Check that source changes were compiled and generated output was not edited directly.
- Check that BEM and responsive decisions follow their specialized skills.
- Run available verification in this order: formatter, linter, focused tests, canonical build,
  generated-output inspection, then visual and accessibility checks. If a check cannot run,
  report its exact command, the blocking reason, and what remains unverified.
- Limit this skill's edits to HTML, stylesheet files, and the template/style regions of Vue
  components. Delegate standalone browser JavaScript and Vue script logic to their specialized
  skills when available.

## References

- [WHATWG HTML Standard](https://html.spec.whatwg.org/)
- [MDN CSS guides](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides)
- [Sass nested style rules](https://sass-lang.com/documentation/style-rules/)
- [Sass parent selector](https://sass-lang.com/documentation/style-rules/parent-selector/)
- [Sass module system and `@import` deprecation](https://sass-lang.com/documentation/breaking-changes/import/)
