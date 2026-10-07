# Source and Compiled Output

Use this reference whenever a task generates or changes frontend code.

## Choose Directories

Follow the repository's configured paths first. For a new standalone deliverable without an established layout, use:

```text
src/
├── index.html
├── scripts/
│   └── main.js
└── styles/
    └── main.scss
dist/
├── index.html
└── assets/
    ├── main.css
    └── main.js
```

For Vue, keep `.vue` components and browser source modules in `src/`; let the Vue build generate HTML, CSS, and JavaScript assets in `dist/` or the configured output directory.

Do not create a second `src/` or `dist/` when the project already uses names such as `app/`, `resources/`, `public/build/`, or `build/`.

## Preserve Ownership

- Edit only source files, templates, and build configuration.
- Generate compiled artifacts exclusively through the project build.
- Do not copy fixes backward from generated CSS or JavaScript into source by hand; locate the originating source module.
- Keep generated headers, hashes, manifests, and source maps consistent with the toolchain.
- Do not mix source and generated assets in the same directory unless the existing project deliberately does so.

## Produce the Correct Outputs

| Source | Generated browser output |
| --- | --- |
| Sass/SCSS, Less, Stylus | CSS and optional source map |
| PostCSS | processed CSS and optional source map |
| JavaScript modules | copied, bundled, transpiled, or minified JavaScript according to the configured build |
| Vue SFCs | generated HTML entry, JavaScript chunks, CSS assets, and build manifest when configured |
| HTML templates | rendered, processed, or copied HTML according to the configured build |

Do not call a manually rewritten file “compiled.” The output must be reproducible by a command.

## Build Workflow

1. Inspect `package.json`, build configuration, ignored paths, and existing output.
2. Identify the package manager, lockfile, runtime version, and canonical development and production build commands. Preserve them unless the task explicitly changes the toolchain; never mix or refresh lockfiles incidentally.
3. Modify readable source files.
4. Run the available formatter, linter, and focused tests for the coherent change set.
5. Run the smallest canonical build that produces every affected output. Always run it before handoff when code changed; do not rebuild after every individual file edit unless required by the toolchain.
6. Inspect warnings, fail on compilation errors, and compare generated artifacts to confirm they correspond only to intended source changes.
7. Complete visual and accessibility checks against the generated output.
8. With source and configuration unchanged, rerun the canonical build once when feasible. Require no unexplained tracked diff; compare semantic outputs and manifests instead of byte equality when hashes or timestamps are expected to vary.

For a new standalone deliverable, include a reproducible build command and generate `dist/` before handoff.

If a check cannot run, record the exact command, the blocking reason, and the behavior or output that remains unverified.

## Keep Output Understandable

- Prefer expanded CSS and source maps for development builds.
- Keep production minification, chunk names, and content hashes under build-tool control.
- Use source maps to connect compiled lines to human-readable source when supported.
- Add a generated-file notice only through the compiler or bundler configuration; do not maintain notices manually across files.

## Handle Ignored Output

When `dist/` or another output directory is ignored, run the build and verify that the files exist locally. Report their location and the build command, but preserve the repository's version-control policy unless the user explicitly changes it.
