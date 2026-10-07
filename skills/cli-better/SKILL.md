---
name: cli-better
description: Design, implement, or review command-line interfaces for clear human use and dependable automation. Use for command structure, flags, help, output streams, errors, exit codes, configuration, compatibility, and CLI UX; not for terminal UI applications whose primary interface is an interactive full-screen display.
---

# Better CLI

Treat a CLI as both a human interface and a versioned automation API. Preserve the user's chosen language and framework, and fit changes to the existing command vocabulary unless a redesign is requested.

## Work from observed behavior

Before changing an existing CLI, inspect its command tree, parser definitions, help output, representative success and failure output, exit statuses, tests, and documented compatibility promises. Run commands only with safe inputs; do not trigger mutations merely to inspect UX.

For a new CLI, first identify:

- the primary user tasks and the shortest useful invocation;
- which output is for humans, which is stable machine data, and which is diagnostics;
- interactive and non-interactive environments, supported platforms, and installation methods;
- configuration sources and precedence;
- compatibility constraints for commands, flags, output schemas, config, and exit codes.

When design details are substantial or the task is a review, read [references/design-checklist.md](references/design-checklist.md).

## Design the contract

- Organize commands around user tasks. Prefer memorable, consistent nouns and verbs over implementation details.
- Keep common operations short. Make dangerous or irreversible operations explicit, previewable where practical, and difficult to invoke accidentally.
- Use positional arguments for essential ordered operands; use flags for optional behavior. Keep flag spelling, negation, defaults, and value syntax consistent across commands.
- Validate early. Lead errors with what failed, then why, then a concrete recovery step. Suggest likely commands for typos without silently changing intent.
- Print result data to `stdout` and diagnostics, warnings, and progress to `stderr`. Do not contaminate machine-readable output.
- Return `0` only when the command achieved its documented success condition. Start with a simple `0`/nonzero model; add stable granular codes only when callers benefit.
- Make non-interactive behavior deterministic. Never require a prompt when stdin/stdout are not terminals; offer explicit flags or fail with guidance.
- Disable decorative formatting when output is not a TTY and honor `NO_COLOR`. Never encode meaning in color alone.
- Keep successful commands quiet when the result is already evident or the command is primarily an action. Show progress only for perceptibly slow work, and keep it off captured output.

## Help and discovery

Make `-h` and `--help` succeed, print to `stdout`, and ignore unrelated flags. Provide subcommand help. The top-level help should quickly answer:

1. What does this tool do?
2. What should a new user run first?
3. Where can the user learn more?

Include a concise description, usage forms, representative examples, commands, options, configuration sources, and relevant documentation links. Prefer parser-generated reference material so help cannot drift from implementation; keep longer conceptual guidance outside the generated reference when needed.

## Configuration and lifecycle

Define and document precedence among flags, environment variables, local config, global config, and remote defaults. Use conventional uppercase environment names. Parse booleans deliberately rather than relying on accidental truthiness. Avoid exposing secrets in arguments, logs, errors, process listings, or shell history.

Assume users may pin, upgrade, downgrade, or run multiple versions. Version evolvable config and structured output. Preserve old flags long enough to deprecate them clearly; do not auto-update across breaking changes. Respect package-manager ownership and leave the user's machine understandable and recoverable.

## Deliverables

For implementation work, update behavior, generated help or docs, and focused tests together. Test at least:

- representative success, invalid usage, and operational failure;
- exact exit status and stdout/stderr separation;
- piped or redirected output, `NO_COLOR`, and non-interactive execution where relevant;
- help at the root and changed subcommands;
- compatibility behavior for deprecated flags, config, or structured output.

For a design or audit, report findings in severity order with concrete evidence, explain the human and automation impact, and propose the smallest compatible correction. Distinguish established defects from optional improvements and product choices.

## Source

This skill is based on the [Better CLI design guide](https://bettercli.org/). Use the live guide when the user requests a comprehensive audit, installation/distribution guidance, autocomplete, analytics, networking, or another topic not covered by the local checklist.
