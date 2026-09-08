---
name: bash-scripting
description: Create or review robust Bash scripts with explicit inputs, safe shell expansion, scoped side effects, cleanup, error handling, and reproducible validation. Use for Bash automation, deployment helpers, CI scripts, administration tools, or ShellCheck and Bats hardening.
---

# Bash Scripting

Create maintainable Bash without relying on companion skills. Preserve the repository's shell version, formatting, lint, and test conventions before applying these fallbacks.

## Contract

- **Input:** The script's purpose, supported Bash version and platforms, inputs, outputs, environment, side effects, and success criteria.
- **Output:** A Bash script plus focused tests or deterministic verification commands.
- **Permissions:** Use only the files, commands, credentials, network access, and privileges required by the requested operation. Never embed secrets.
- **Failure behavior:** Validate before mutation, emit actionable errors to standard error, return documented nonzero statuses, and clean up temporary resources.
- **Non-goals:** Do not silently install packages, elevate privileges, change unrelated shell configuration, or claim POSIX `sh` compatibility for Bash-specific code.

## Design Before Writing

1. Inspect repository instructions and existing scripts.
2. Define arguments, standard input, environment variables, output streams, exit statuses, and side effects.
3. Identify destructive operations and verify their exact targets before execution.
4. Decide whether repeated execution must be idempotent and document exceptions.
5. Prefer existing commands and repository utilities over new dependencies.

## Write Defensive Bash

- Use `#!/usr/bin/env bash` when environment-based resolution is acceptable; use a repository-required absolute interpreter path when deployment requires it.
- Use `set -euo pipefail` only after reviewing commands whose nonzero status is expected. Handle those commands explicitly.
- Quote expansions as `"${value}"` unless intentional splitting or globbing is documented.
- Use arrays for argument lists. Never construct a shell command as a string and execute it with `eval`.
- Parse options explicitly, reject unknown options, validate required values, and provide `--help`.
- Use `printf` for predictable output. Send diagnostics to standard error.
- Resolve paths from an explicit root or the script directory. Reject traversal or broad targets when input controls a path.
- Create temporary directories with `mktemp -d`, register cleanup with `trap`, and quote cleanup targets.
- Check command availability before use and report the missing executable.
- Use bounded timeouts and retries for external operations. Retry only operations that are safe to repeat.
- Avoid parsing human-oriented command output when a stable machine-readable format exists.

## Control Side Effects

- Validate all inputs and planned destinations before the first write.
- Prefer staging and atomic replacement for generated files.
- Do not overwrite existing files without an explicit option or contract.
- Make no-op results explicit.
- Preserve file permissions intentionally and apply restrictive permissions to sensitive temporary data.
- Never log credentials, tokens, private data, or full credential-bearing URLs.

## Minimal Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly script_name=${0##*/}
temporary_dir=''

cleanup() {
  if [[ -n ${temporary_dir} && -d ${temporary_dir} ]]; then
    rm -rf -- "${temporary_dir}"
  fi
}
trap cleanup EXIT

usage() {
  printf 'Usage: %s <input-file>\n' "${script_name}"
}

main() {
  if (($# != 1)); then
    usage >&2
    return 2
  fi

  local input_file=$1
  if [[ ! -f ${input_file} ]]; then
    printf 'Error: input file does not exist: %s\n' "${input_file}" >&2
    return 1
  fi

  temporary_dir=$(mktemp -d)
  printf 'Validated input: %s\n' "${input_file}"
}

main "$@"
```

Adapt the pattern to the operation; do not copy cleanup or strict mode mechanically when they conflict with the actual contract.

## Verify

1. Run `bash -n <script>`.
2. Run the repository's ShellCheck command when available.
3. Run existing Bats or shell tests.
4. Exercise normal input, missing input, invalid options, unsafe paths, expected command failures, cleanup, and repeated execution where idempotency applies.
5. Run in each supported Bash/platform environment or report what remains unverified.

Report the commands actually run, their results, documented side effects, and any environment-specific limitation.
