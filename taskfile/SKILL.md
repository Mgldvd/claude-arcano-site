---
name: taskfile
description: Create, extend, or reorganize Taskfiles for go-task/taskfile.dev while preserving existing project automation. Use for Taskfile initialization, task automation, stack-aware task generation, or an explicitly requested one-task-per-file layout.
---

# Taskfile automation

Work from the target project root. Inspect manifests, documentation, CI files,
scripts, and every supported existing Taskfile name before editing. Task searches
for `Taskfile.yml`, `taskfile.yml`, their `.yaml` forms, and `.dist` variants; keep
the existing name and organization when present.

## Choose the layout

- For an existing Taskfile, preserve its layout by default. Add the smallest
  compatible change and retain unrelated tasks, variables, includes, aliases,
  dependencies, conditions, and output settings.
- For a new project, use the opinionated scaffold in `assets/templates/`: a
  `Taskfile.yml` include index plus one task per file in `.tasks/commands/`.
- Reorganize an existing Taskfile into the scaffold only when the user requests
  that migration. Migrate and validate incrementally.

The one-task-per-file structure is this skill's convention, not a Task
requirement. Task natively supports multiple tasks and several shorthand forms
in one Taskfile.

## New-project scaffold

```text
Taskfile.yml
.tasks/
  commands/
    default.yml
    <one-file-per-command>.yml
  scripts/
    <substantial-or-reusable-script>
```

Copy `assets/templates/Taskfile.yml`, `assets/templates/.tasks/commands/default.yml`, and the
empty scripts directory. Use `assets/templates/.tasks/commands/example.yml` only as a
shape to copy and rewrite; never include it unchanged.

Each generated command file contains one task. For namespaced tasks, mirror the
namespace in the path: `db:migrate` belongs in
`.tasks/commands/db/migrate.yml`. Use a unique filesystem-derived include key.

Do not automatically flatten every include. Prefer normal Task namespaces when
they are useful. Use `flatten: true` for the one-task-per-file scaffold when the
intended CLI name is already declared in the included file, after checking that
it cannot collide with another task. Use `excludes` when an intentional include
needs collision handling.

## Implement tasks

Prefer Task's native features for orchestration and validation:

- `deps` or `task:` calls for task composition.
- `requires`, `preconditions`, and `if` for input and environment checks.
- `sources`, `generates`, `status`, and `method` for incremental work.
- `platforms` for OS-specific behavior and `vars`/`env`/`dotenv` for values.
- `prompt` only when an interactive confirmation is appropriate; do not rely on
  it as the sole safety control for automation or CI.

Keep a short, readable command inline. Use an external script when the logic is
substantial, reused outside Task, or clearer as a standalone program. In the
new-project scaffold, place skill-created scripts in `.tasks/scripts/`; do not
relocate a project's existing scripts merely to satisfy this convention.

Use the minimum Task schema version required by the features used. `version: '3'`
is suitable for broadly compatible files; choose a more specific SemVer
when a newer feature requires it.

## Detect common commands

For a new scaffold, `scripts/detect-stack.sh <project-root>` can propose
`setup`, `build`, `test`, `lint`, `dev`, and `clean` command files. Its output is
separated by `# file: .tasks/commands/<name>.yml` markers.

Treat its output as a proposal: compare commands with manifests, lockfiles,
project documentation, and CI before writing them. Keep unresolved commands as
loud failing TODOs rather than successful no-ops. For multi-stack repositories,
replace generic stack namespaces with project-specific component names when the
repository structure makes those names clear.

## Style

- Follow the official style guide: two-space indentation, blank lines between
  main sections, UPPERCASE variable names, compact templates such as
  `{{.VAR}}`, and `:` between namespace and task name.
- Give user-facing tasks a useful `desc`; mark non-CLI helpers `internal: true`.
- Quote YAML scalars when YAML punctuation could change their meaning.
- Avoid global `silent: true`; apply silence only to tasks or commands that
  benefit from it.
- Prefer portable commands. Do not assume Bash-specific behavior unless the
  task explicitly invokes Bash and the project requires it.

## Validate safely

1. Check `task --version` and run validation from the intended project root so
   parent-directory Taskfile discovery cannot select the wrong file.
2. Confirm every local include exists and inspect names for flatten collisions.
3. Run `task --list-all` to parse the full configuration and confirm each
   expected public command appears once.
4. Use `task --summary <task>` for important tasks when available.
5. Run only clearly safe tasks. Do not invoke an existing `default`, deployment,
   cleanup, publishing, or other potentially mutating task merely to validate.
6. Validate new shell scripts with `bash -n` or the appropriate interpreter;
   use `shellcheck` when available.

When a task cannot be executed safely, report the exact validation performed
and what remains unexecuted.

For uncertain syntax or behavior, consult Task's official
[guide](https://taskfile.dev/docs/guide),
[schema reference](https://taskfile.dev/docs/reference/schema), and
[style guide](https://taskfile.dev/docs/styleguide) rather than guessing.
