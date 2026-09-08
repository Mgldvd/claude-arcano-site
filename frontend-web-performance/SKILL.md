---
name: frontend-web-performance
description: Audit or optimize frontend performance for HTML, CSS, Sass, Less, PostCSS, Stylus, browser JavaScript, Vue, Nuxt, and their static assets. Use for Core Web Vitals, page-load traces, network waterfalls, bundle analysis, layout shifts, caching, rendering, Vue or Nuxt runtime performance, and generated stylesheet cost; rely on current web.dev and Chrome documentation for thresholds and tooling.
---

# Frontend Web Performance

Keep this skill separate from code-style skills: measure behavior first, then use an installed HTML, CSS, JavaScript, Vue, Nuxt, or responsive companion to implement a verified fix. Companion skills are optional; complete the audit and provide evidence-backed source changes from this skill when they are unavailable. Do not expand the audit into backend languages or unrelated frontend frameworks.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow the repository's performance budgets, measurement scripts, formatter, linter, build, browser targets, and established local conventions.
3. Apply this skill's evidence, like-for-like comparison, frontend scope, source-ownership, and generated-output invariants.
4. Use current primary-source guidance and the remaining rules in this skill as fallbacks.

## Retrieve Current Guidance

Treat metric definitions, thresholds, Lighthouse scoring, and browser-tool APIs as time-sensitive. Check current primary sources before quoting them:

- [Web Vitals](https://web.dev/articles/vitals)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance)
- [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)

Confirm the current Core Web Vitals set and thresholds from the linked primary sources before each audit.

## Establish Evidence

1. Confirm the target URL, tool and browser versions, environment, production build, viewport, device profile, throttling, and cache state.
2. Prefer field data for real-user conclusions and lab traces for diagnosis.
3. Use the repository's established measurement protocol when present. Otherwise capture five equivalent lab runs per state, report every result plus the median and a stated spread such as min-max or interquartile range, and compare like for like.
4. Use the available browser performance tooling. If trace tooling is unavailable, explain the limitation and continue with network, built-output, and code analysis that can still be supported.
5. Do not install or reconfigure tooling unless the user authorizes it.

Never present a single local Lighthouse run as real-user performance.

## Audit Workflow

### 1. Capture a Baseline

- Record URL, tool and browser versions, viewport, throttling, cache state, production build identifier or configuration, and run count.
- Capture LCP, CLS, and lab responsiveness diagnostics.
- Keep FCP, TTFB, TBT, and Speed Index as diagnostic metrics rather than Core Web Vitals.
- Compare like-for-like runs before and after changes.

### 2. Diagnose Rendering

- Identify the LCP element and split its time into server wait, discovery, transfer, and render delay where the tooling permits.
- Locate layout-shift sources such as unsized media, late content, font swaps, and client-only DOM changes.
- Inspect long tasks and interaction handlers that can delay responses.
- Confirm the measured bottleneck before recommending a fix.

### 3. Inspect the Network

Review documents, stylesheets, scripts, fonts, images, and Vue chunks for:

- blocking or late-discovered critical resources;
- deep request chains;
- duplicate or unused transfers;
- weak cache policy;
- missing compression;
- oversized or incorrectly encoded media;
- unnecessary preload or preconnect hints;
- development-only code in a production build.

Verify that an origin or resource is unused before recommending removal.

### 4. Inspect HTML, CSS, JavaScript, and Vue

- **HTML:** check critical-resource discovery, media dimensions, responsive image markup, and excessive DOM depth.
- **CSS and preprocessors:** check blocking delivery, large generated output, unused rules, selector cost only when evidence shows it matters, and font loading.
- **JavaScript:** check bundle size, duplicate dependencies, long tasks, eager modules, third-party scripts, and event-handler cost.
- **Vue:** check route/component lazy loading, hydration or client-render delays, unnecessary reactive work, large lists, and avoidable rerenders.
- **Assets:** check dimensions, formats, compression, caching, and whether above-the-fold media is discovered early.

Inspect the active frontend build pipeline without expanding into other application languages:

- identify Vite, webpack, Rollup, esbuild, Parcel, or the Vue/Nuxt-owned build configuration;
- confirm that the inspected output is a production build;
- review tree-shaking boundaries, `sideEffects`, barrel exports, and unnecessarily broad imports;
- inspect browser targets and polyfills for avoidable payload while preserving compatibility;
- verify minification, chunking, compression evidence, production source-map policy, and development-only code.

Inspect both human-readable source files and compiled browser output. Attribute bundle, selector, or asset findings back to their source modules and build configuration.

Stay within HTML, CSS, JavaScript, Vue, Nuxt, Sass, Less, PostCSS, Stylus, and their browser assets. Apply `frontend-nuxt` to Nuxt-specific source or build changes when installed; otherwise preserve Nuxt's existing source and build conventions. Do not generalize into other frameworks.

### 5. Verify Fixes

- Apply one coherent change set at a time.
- Change source files only, then regenerate the compiled output with the existing build.
- Preserve the package manager, lockfile, runtime version, and canonical build command. Do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it.
- Build after each coherent source change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Repeat the same baseline conditions and compare distributions, not only the best run. When no repository protocol exists, use five equivalent before runs and five equivalent after runs and report their medians and the same spread measure.
- Check visual behavior and basic accessibility after performance changes.
- Capture an accessibility-tree or equivalent semantic snapshot when tooling supports it, especially after changing rendering, visibility, or interaction behavior.
- Reject optimizations that save no meaningful work or damage semantics, accessibility, caching correctness, or maintainability.
- Run available change verification in this order: formatter, linter, focused tests, canonical build, generated-output inspection, then visual and accessibility checks; run the like-for-like performance comparison against the verified production output.
- After the final build, rerun it once with unchanged source when feasible. Require no unexplained tracked diff; compare semantic chunks, manifests, resource graphs, and behavior rather than promising byte equality when hashes or timestamps can vary.
- If a check or measurement cannot run, report its exact command, the blocking reason, and what remains unverified.

## Prioritize Findings

Rank findings by measured user impact, confidence, effort, and regression risk. Prefer exact findings such as “the hero image starts after the stylesheet and adds 700 ms to LCP” over generic advice such as “optimize images.”

Do not claim byte or millisecond savings unless the tool reports them or the estimation method is stated.

## Report Results

Return:

1. test conditions and limitations;
2. Core Web Vitals or available lab metrics with source and rating;
3. prioritized evidence with affected resources or components;
4. specific fixes limited to HTML, CSS, JavaScript, Vue, preprocessors, and assets;
5. verification results or a verification plan when changes were not requested.

Clearly separate field data, lab data, estimates, and inferences.
