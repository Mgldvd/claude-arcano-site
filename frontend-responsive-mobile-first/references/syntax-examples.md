# Responsive Syntax Examples

Use only the section matching the current project. Reuse existing tokens and helpers before introducing any example helper from this file.

## Contents

- [Plain CSS](#plain-css)
- [Native CSS nesting](#native-css-nesting)
- [Sass and SCSS](#sass-and-scss)
- [Less](#less)
- [PostCSS](#postcss)
- [Stylus](#stylus)

## Plain CSS

Keep the query close to its component when nesting is unavailable.

```css
.card-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

## Native CSS Nesting

Verify target-browser support before nesting an at-rule.

```css
.card-grid {
  display: grid;
  gap: 1rem;

  @media (width >= 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

## Sass and SCSS

Use the repository's breakpoint map or mixin. If none exists and reuse justifies a helper, use the canonical numeric name rather than encoding a device name. Group BEM suffixes, states, and breakpoint includes under their block when that makes the component easier to read.

```scss
@mixin m768 {
  @media (min-width: 768px) {
    @content;
  }
}

.card-grid {
  display: grid;
  gap: 1rem;

  &__item {
    min-width: 0;
  }

  &:focus-within {
    outline: 2px solid currentColor;
  }

  @include m768 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

This must compile to flat component selectors and a colocated media-query override:

```css
.card-grid {
  display: grid;
  gap: 1rem;
}

.card-grid__item {
  min-width: 0;
}

.card-grid:focus-within {
  outline: 2px solid currentColor;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Prefer `@use` and namespaced helpers in new Sass modules. Keep legacy mixin aliases only while active call sites require them. Keep selector nesting to one or two levels in normal components; reserve a third level for a modifier, state, pseudo-selector, or conditional at-rule. Never mirror the full DOM tree.

## Less

Use an existing Less mixin when available.

```less
.m768(@rules) {
  @media (min-width: 768px) {
    @rules();
  }
}

.card-grid {
  display: grid;
  gap: 1rem;

  .m768({
    grid-template-columns: repeat(2, minmax(0, 1fr));
  });
}
```

## PostCSS

Use `@custom-media` only when the installed PostCSS pipeline supports it.

```css
@custom-media --m768 (width >= 768px);

.card-grid {
  display: grid;
  gap: 1rem;

  @media (--m768) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Use direct `@media` rules when adding custom-media tooling would expand the task.

## Stylus

Preserve the repository's brace or indentation style.

```stylus
m768()
  @media (min-width: 768px)
    {block}

.card-grid
  display grid
  gap 1rem

  +m768()
    grid-template-columns repeat(2, minmax(0, 1fr))
```

## Shared Checks

- Keep base styles outside queries.
- Keep transitions in ascending order.
- Use only breakpoints where content requires change.
- Avoid empty helpers and duplicate unchanged declarations.
- Preserve the project's supported syntax and browser targets.
- Compile source styles and inspect the generated CSS rather than editing output directly.
- For each selected threshold `N`, test `N - 1px`, `N`, and `N + 1px`, plus a midpoint between consecutive transitions and content/zoom/accessibility stress cases.
