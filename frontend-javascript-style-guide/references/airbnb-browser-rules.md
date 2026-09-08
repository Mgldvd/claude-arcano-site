# Airbnb-derived Browser JavaScript Rules

This is a concise browser-focused interpretation of the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript). Use repository tooling first. Do not apply Airbnb sections for React, CSS-in-JavaScript, Node-only code, or deprecated ES5 workflows.

## Contents

- [Values and references](#values-and-references)
- [Objects and arrays](#objects-and-arrays)
- [Strings](#strings)
- [Functions](#functions)
- [Modules](#modules)
- [Control flow](#control-flow)
- [Formatting](#formatting)
- [Naming](#naming)
- [Browser safety](#browser-safety)
- [Intentional adaptations](#intentional-adaptations)

## Values and References

- Use `const` by default and `let` only when reassignment is required.
- Never use undeclared assignments or `var`.
- Declare one binding per statement and group `const` before `let` when that remains readable.
- Assign bindings near their use and remove unused bindings.
- Avoid chained assignments and unary `++`/`--` outside established loop conventions.
- Treat arrays, objects, and functions as references; make mutation deliberate and local.

## Objects and Arrays

- Use `{}` and `[]` instead of constructors.
- Use computed property names for dynamic keys and method/property shorthand for static keys.
- Quote object keys only when the key is not a valid identifier or a data contract requires exact quoting.
- Prefer object spread for a shallow copy and object rest for omission.
- Use `push()` for append operations and spread for copying iterables when compatibility permits.
- Use `Array.from(arrayLike)` for array-like values and `Array.from(iterable, mapper)` when mapping during conversion avoids an intermediate array.
- Return a value from callbacks for `map`, `filter`, and `reduce`; use `forEach` when no returned collection is intended.
- Use object destructuring for multiple properties and named-object results that may evolve.

## Strings

- Use single quotes for ordinary strings.
- Use template literals for interpolation or meaningful multiline strings.
- Do not split a long searchable string into concatenated fragments merely to meet line length.
- Never evaluate a string as JavaScript.

## Functions

- Prefer default parameters and put them after required parameters.
- Never mutate parameters; derive a local binding instead.
- Use rest parameters instead of `arguments` and spread instead of `apply()` for variadic calls.
- Use arrow functions for inline callbacks that do not require their own `this`, `arguments`, `super`, or `new.target`.
- Extract complex callbacks into descriptive named functions.
- Keep multiline parameters and arguments one per line with a trailing comma where valid.
- Avoid unnecessary constructors and avoid manually saving `this` when lexical arrows or explicit binding express the intent.

## Modules

- Prefer standard `import` and `export` in browser builds that support or transform them.
- Keep imports at the top after any required directives.
- Import from a given path once per module.
- Avoid wildcard imports when explicit imports make the dependency surface clearer.
- Keep import/export syntax compatible with the repository's bundler and native-module policy.
- Do not add or remove `.js` extensions blindly; browser-native ESM and bundlers can require different conventions.

## Control Flow

- Use `===` and `!==`.
- Use concise boolean checks only when the value is genuinely boolean-like; compare strings and numbers explicitly when `0` or `''` is meaningful.
- Use braces for multiline blocks and place `else` on the same line as the closing brace.
- Avoid nested ternaries and assignment inside conditions.
- Add lexical braces around `case` clauses that declare bindings.
- Use early returns when they reduce nesting without obscuring a single exit requirement.

## Formatting

- Use 2-space indentation and spaces around binary operators.
- Put one space before block braces and none between a function name and its call parentheses.
- Add spaces inside object braces, not array brackets or function-call parentheses.
- Use leading dots for multiline method chains.
- Put commas after items, not before them; use trailing commas in multiline structures where supported.
- Terminate statements with semicolons.
- Target 100-character lines as a fallback, excluding URLs and long strings that become less searchable when split.
- End each file with one newline.

## Naming

- Use descriptive names; reserve conventional short names for tiny, obvious scopes.
- Use camelCase for values and functions and PascalCase for classes and constructors.
- Do not prefix or suffix pseudo-private properties with underscores as a substitute for real privacy.
- Name booleans so their truth is readable, commonly with `is`, `has`, `can`, or `should`.
- Use uppercase names only for exported or module-level constants that are truly fixed by convention; do not uppercase every `const`.
- Name files according to the repository's existing module convention.

## Browser Safety

- Prefer `Object.hasOwn()` when supported; otherwise call `Object.prototype.hasOwnProperty` safely.
- Prefer `Number.isNaN()` and `Number.isFinite()` to coercive globals.
- Specify a radix when parsing integers.
- Avoid direct HTML injection and dynamic code execution.
- Keep event payloads explicit and document non-obvious event contracts.
- Write focused tests for behavior and edge cases using the project's existing test framework.

## Intentional Adaptations

Airbnb's guide assumes Babel and shims. This skill does not. Verify browsers and build tooling before using syntax, APIs, or polyfills.

Airbnb's import-extension advice targets bundler conventions. Preserve explicit `.js` extensions when native browser ESM or repository rules require them.

Airbnb discourages iterators largely for historical transpilation cost. Do not mechanically replace a clear native `for...of` loop when current browser targets support it and the repository permits it; still avoid `for...in` for array iteration.

Airbnb includes jQuery guidance. Apply it only when maintaining an existing jQuery frontend; never introduce jQuery merely to follow the guide.
