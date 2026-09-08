---
name: agent-extension-pi-creator
description: Create or modify reusable or project-local Pi coding-agent extensions, including slash commands, custom tools, lifecycle hooks, and Pi-native UI interactions.
---

# Pi Extension Creator

Use this skill whenever creating or editing a Pi extension in any project.

## Contract

- **Input:** A requested Pi extension behavior and a target project or explicit global destination.
- **Output:** A TypeScript extension in the target project, plus any narrowly required package metadata and usage notes.
- **Preconditions:** The target must be a trusted, writable project. Global installation requires an explicit user request.
- **Permissions and side effects:** Read the project and installed Pi documentation; write only the selected extension directory and, when required, its dependency metadata and the repository lockfile. Do not install Pi or contact unrelated services.
- **Failures:** Stop with an actionable explanation when the target is ambiguous, required documentation or validation tooling is unavailable, dependency installation fails, or safe validation cannot be completed. Do not report partial output as a validated extension.
- **Non-goals:** Do not configure Pi globally, redesign unrelated project code, or introduce external UI tools unless requested.

## Mandatory project convention

Every project-local extension **must live in its own folder** under the project extension folder:

```text
.pi/extensions/<extension-name>/index.ts
```

Do **not** create project extensions as loose files like `.pi/extensions/foo.ts`.
Do **not** put project-specific extensions under `~/.pi/agent/extensions/` unless the user explicitly asks for a global extension.

Use kebab-case for `<extension-name>`.

## Workflow

1. Read the relevant Pi extension docs before implementation:
   - First inspect the repository's installed `@earendil-works/pi-coding-agent` package under its package-manager-resolved `node_modules` directory. If present, read `docs/extensions.md` and only the examples relevant to the requested feature.
   - If the package is not installed locally, inspect an already-installed global package without changing the environment.
   - Otherwise retrieve the official extension documentation at `https://pi.dev/docs/latest/extensions`. Do not install Pi merely to obtain documentation.
2. Create this structure:

   ```text
   .pi/extensions/<extension-name>/
   ├── index.ts
   └── README.md              # optional when the extension needs usage notes
   ```

3. Implement the extension as a TypeScript module with a default export:

   ```ts
   import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

   export default function myExtension(pi: ExtensionAPI) {
     // register commands, tools, events, etc.
   }
   ```

4. If registering a tool:
   - Import schemas from `typebox`.
   - Return `{ content: [{ type: "text", text: "..." }], details?: {...} }`.
   - Add `promptSnippet` / `promptGuidelines` when useful.

5. If registering a command:
   - Use `pi.registerCommand("name", { description, handler })`.
   - Use `ctx.ui` for Pi-native UI unless the user specifically asks for external CLI UI.

6. If the extension needs external dependencies:
   - Create `package.json` inside the extension folder.
   - Put runtime packages in `dependencies`.
   - Preserve the repository's package manager and lockfile. Add only the requested runtime dependencies, then run that package manager's normal install command in the extension folder.
   - Do not download dependencies implicitly during verification; use already-installed local executables.

7. Tell the user to run `/reload` after creating or changing the extension.

## Path checklist

Before finishing, verify:

- [ ] The extension is in `.pi/extensions/<extension-name>/index.ts`.
- [ ] The folder name is kebab-case.
- [ ] There are no new loose `.ts` files directly under `.pi/extensions/`.
- [ ] The extension has a default export function receiving `ExtensionAPI`.
- [ ] Existing package-manager and lockfile conventions were preserved.
- [ ] Validation used installed Pi/runtime tooling, or the exact unavailable prerequisite is reported.
- [ ] The final response includes how to use the extension and `/reload`.

## Reference

See [project conventions](references/project-extension-conventions.md) for examples and templates.
