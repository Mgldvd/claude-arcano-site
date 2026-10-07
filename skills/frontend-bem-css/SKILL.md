---
name: frontend-bem-css
description: Apply or review BEM class architecture in HTML, CSS, Vue templates, Sass, Less, PostCSS, Stylus, or native CSS nesting. Use when naming blocks, elements, modifiers, refactoring high-specificity component styles, or auditing BEM consistency.
---

# BEM CSS

Apply BEM only to class architecture. When installed, use `frontend-style-guide` for formatting, `frontend-responsive-mobile-first` for responsive behavior, `frontend-vue-style-guide` for Vue conventions, and `frontend-javascript-style-guide` for JavaScript. Treat companions as optional refinements: complete the BEM task from this skill and repository conventions when they are unavailable.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow the repository's formatter, linter, build, class methodology, BEM dialect, and established local conventions.
3. Apply this skill's BEM invariants: explicit blocks, flat elements, base classes with modifiers, and selectors that do not couple independent blocks.
4. Use the two-dashes dialect and remaining rules in this skill as fallbacks.

Do not introduce BEM into a project that already uses CSS Modules, utilities, or another coherent method unless the user asks for a migration. Preserve an established BEM dialect and do not mix dialects during a focused change. When no convention exists, use:

- Block: `card`
- Element: `card__title`
- Modifier: `card--featured` or `card__title--muted`

Preserve these supported dialect details instead of normalizing them silently:

- Two-dashes: `block`, `block__element`, `block--modifier`, `block__element--modifier`.
- Two-dashes key-value modifier when needed: `block--key-value` or the repository's established `block--key--value` form.
- Underscore dialect: `block_modifier`, `block_modifier_value`, `block__element_modifier`, or `block__element_modifier_value`.

Never mix dialects within the same component set. Change dialect only as an explicit migration.

## Model Components

- Define a **block** as a reusable component meaningful on its own.
- Define an **element** as a part that has no useful meaning outside its block.
- Define a **modifier** as a variation, state, or behavior of a block or element.
- Use a **mix** by placing multiple classes on one node when composition is clearer than inheritance or cross-block selectors.
- Keep element names flat. Never create `block__element__child`; use `block__child` or extract another block.
- Keep modifiers with their base class.

```html
<article class="card card--featured">
  <h2 class="card__title">Title</h2>
  <div class="card__actions card__actions--stacked">
    <button class="button">Save</button>
  </div>
</article>
```

## Write Selectors

- Prefer one class per compiled selector: `.card`, `.card__title`, `.card--featured`.
- Avoid tag-qualified classes, IDs, DOM-depth selectors, and selectors that couple independent blocks.
- In plain CSS, write BEM selectors explicitly. In SCSS, allow readable `&__element` and `&--modifier` nesting that compiles to the same flat selectors.
- Do not confuse source nesting with BEM hierarchy: `&__child` is still a direct element of the block, never an element of an element.
- Nest pseudo-classes, pseudo-elements, states, modifiers, and colocated at-rules when the repository permits it.
- Use modifiers for durable visual or behavioral variants. Use semantic state attributes such as `disabled`, `aria-expanded`, or `aria-current` when the state also has platform meaning.
- Do not use a modifier as the only class.

```css
.card {}
.card__title {}
.card__actions {}
.card--featured {}
.card__actions--stacked {}
```

For new SCSS without an established convention, group one block for human readability while keeping the emitted selectors flat:

```scss
.card {
  &__title {}

  &__actions {
    &--stacked {}
  }

  &--featured {}
}
```

Do not mix grouped `&__element` syntax and repeated explicit `.card__element` blocks inside the same component without a repository-level reason. Inspect the compiled CSS to confirm that no descendant combinator was introduced.

## Control Layout Ownership

- Keep a block responsible for its internal layout.
- Let the containing layout control external placement, grid position, and contextual spacing.
- Use a parent element class, layout utility, or mix at the usage site when a block needs contextual geometry.
- Do not move every margin out of a block mechanically; distinguish internal rhythm from external placement.

## Review Anti-patterns

Flag and correct:

- elements of elements;
- modifiers without base classes;
- presentational names such as `red-text` or `left-box`;
- selectors that depend on a specific DOM hierarchy;
- cross-block selectors such as `.header .button` when composition is sufficient;
- styling JavaScript hook classes;
- duplicated block definitions scattered without a layering reason.

## Return Useful Results

For a BEM conversion or review, provide:

1. a map of blocks, elements, modifiers, and mixes;
2. the updated HTML or Vue template;
3. the updated stylesheet in the repository's existing syntax;
4. a short explanation of boundary or naming decisions;
5. any intentional exceptions.

When code is generated, update the source template and stylesheet and regenerate the compiled browser output through the project build. Follow existing directories; for a new standalone deliverable with no convention, author under `src/` and generate under `dist/`. Never edit compiled BEM selectors directly.

## Build and Verify

- Preserve the repository's package manager, lockfile, runtime version, and canonical build command. Do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it.
- Build after each coherent BEM change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Run available verification in this order: formatter, linter, focused tests, canonical build, generated-output inspection, then visual and accessibility checks.
- Inspect emitted selectors and the rendered component so a rename does not introduce accidental descendants, specificity changes, broken state semantics, or missing classes.
- After the final build, rerun it once with unchanged source when feasible. Require no unexplained tracked diff; compare semantic selectors and manifests rather than promising byte equality when hashes or timestamps can vary.
- If a check cannot run, report its exact command, the blocking reason, and what remains unverified.

## References

- [BEM methodology](https://en.bem.info/methodology/)
- [BEM quick start](https://en.bem.info/methodology/quick-start/)
- [getbem naming](https://getbem.com/naming/)
- [Sass parent selector and BEM suffixes](https://sass-lang.com/documentation/style-rules/parent-selector/)
