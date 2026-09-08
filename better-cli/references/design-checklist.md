# CLI design and review checklist

Use the applicable sections; do not force every item onto a small utility.

## Command model

- Does the command tree reflect user tasks and use consistent terminology?
- Is the default invocation useful, or does it show concise help?
- Are required operands positional and optional behavior flagged consistently?
- Are aliases, abbreviations, negated flags, repeated values, and `--` handling unambiguous?
- Are destructive actions explicit and automation-safe?

## Help and recovery

- Do `-h`, `--help`, and subcommand help succeed on `stdout`?
- Does help state purpose, usage, a useful example, commands/options, configuration, and next documentation step?
- Does invalid input identify the offending token and offer a concrete correction?
- Are suggestions clearly suggestions rather than silently executed substitutions?
- Is generated reference synchronized with the parser?

## Output contract

- Is result data on `stdout`, with diagnostics and progress on `stderr`?
- Is normal output composable with pipes and redirection?
- Does structured output have a documented, stable schema and no decorative text?
- Are headings, tables, wrapping, Unicode, and color adjusted for TTY capabilities?
- Is color disabled for non-TTY output and when `NO_COLOR` is present?
- Is color redundant with text or symbols for accessibility?

## Exit and error semantics

- Does `0` precisely mean the documented task succeeded?
- Do invalid usage and operational failures return nonzero?
- Are partial success, empty results, cancellation, timeout, and remote-service errors defined?
- Are granular codes few, documented, and stable if exposed?
- Do errors say what failed, why, and how to recover without leaking secrets?

## Interaction and performance

- Are prompts restricted to interactive terminals and bypassable with explicit flags?
- Are defaults safe in unattended execution?
- Are progress indicators transient, sent to `stderr`, and disabled outside a TTY?
- Is startup responsive, especially for help, version, typo, and validation paths?
- Are network calls deferred until needed and bounded by sensible timeouts?

## Configuration and security

- Is precedence among flags, environment, local/global files, and remote settings explicit?
- Are config formats evolvable and versioned when migrations may be required?
- Are environment variables conventionally named and booleans parsed explicitly?
- Are secrets accepted through safer channels than command arguments where possible?
- Are paths, shell-outs, network endpoints, privileges, files touched, and dependencies controlled and documented?
- Are installs and updates verifiable, predictable, and compatible with the installation method?

## Lifecycle and compatibility

- Can old configuration and credentials be read after upgrade?
- Does downgrade encounter future config safely and explain the incompatibility?
- Are commands, flags, exit codes, and machine-readable schemas treated as public API?
- Are deprecations announced with replacements and sufficient transition time?
- Are breaking updates opt-in and separated by an appropriate major version?
- Can users pin versions, install side by side where needed, and uninstall cleanly?

## Suggested verification matrix

Capture command, environment, expected stdout, expected stderr, expected status, and filesystem/network effects for each representative case:

- root and subcommand help;
- ordinary success and quiet success;
- invalid command, flag, and value;
- missing dependency, permission failure, timeout, and interruption;
- TTY versus pipe/redirection;
- color enabled, disabled, and `NO_COLOR`;
- JSON or other machine format;
- interactive confirmation versus explicit non-interactive approval;
- legacy flag/config and upgrade/downgrade behavior.

Avoid brittle snapshots for incidental spacing unless formatting itself is the contract. Assert semantic content, streams, statuses, and stable schemas.
