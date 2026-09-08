#!/usr/bin/env bash
# Detect the language/ecosystem stack(s) of a project and print a
# one complete YAML document per common lifecycle command (setup, build,
# test, lint, dev, clean). Each document is preceded by its destination
# marker: `# file: .tasks/commands/<name>.yml`. Real commands are used where
# the manifest gives enough confidence; everything else is a loud TODO stub.
# Read-only: prints to stdout, writes nothing.
#
# Usage: detect-stack.sh [path]
#
# If more than one stack is detected, commands are namespaced by detected
# stack and their destinations become `.tasks/commands/<stack>/<name>.yml`.
set -euo pipefail

target="${1:-.}"
cd "$target"

todo() {
  # $1 = task label, used only in the stub's message.
  # The whole line is wrapped in YAML single quotes: a plain (unquoted)
  # YAML scalar cannot contain ": " (colon-space), and this message does
  # ("TODO: define...") — without the outer quotes Task fails the whole
  # file with "invalid keys in command". Verified by hitting it live.
  printf "      - 'echo \"TODO: define %s for this project\" && exit 1'\n" "$1"
}

split_commands() {
  # Convert the emitted task entries into independent, one-task Taskfiles.
  # $1 is an optional namespace used for multi-stack projects.
  local namespace="${1:-}"
  awk -v namespace="$namespace" '
    /^  [a-z0-9-]+:$/ {
      name=$0
      sub(/^  /, "", name)
      sub(/:$/, "", name)
      path=(namespace == "" ? name : namespace "/" name)
      if (seen++) print ""
      print "# file: .tasks/commands/" path ".yml"
      print "---"
      print "version: '\''3'\''"
      print ""
      print "tasks:"
      if (namespace == "") print $0
      else print "  " namespace ":" name ":"
      next
    }
    { print }
  '
}

node_scripts_json() {
  if command -v jq >/dev/null 2>&1; then
    jq -r '.scripts // {} | keys[]' package.json 2>/dev/null
  else
    node -e 'console.log(Object.keys(require("./package.json").scripts||{}).join("\n"))' 2>/dev/null
  fi
}

node_pm() {
  if [[ -f pnpm-lock.yaml ]]; then echo pnpm
  elif [[ -f yarn.lock ]]; then echo yarn
  elif [[ -f bun.lockb || -f bun.lock ]]; then echo bun
  else echo npm
  fi
}

node_install_command() {
  case "$1" in
    npm)
      [[ -f package-lock.json || -f npm-shrinkwrap.json ]] && echo "npm ci" || echo "npm install"
      ;;
    pnpm) echo "pnpm install --frozen-lockfile" ;;
    yarn) echo "yarn install" ;;
    bun) echo "bun install --frozen-lockfile" ;;
  esac
}

emit_node() {
  local pm scripts install_command
  pm="$(node_pm)"
  scripts="$(node_scripts_json || true)"
  install_command="$(node_install_command "$pm")"

  echo "  setup:"
  echo "    desc: Install dependencies."
  echo "    cmds:"
  echo "      - $install_command"

  for name in build test lint dev; do
    echo "  $name:"
    case "$name" in
      build) echo "    desc: Build the project." ;;
      test) echo "    desc: Run the test suite." ;;
      lint) echo "    desc: Lint the project." ;;
      dev) echo "    desc: Run the development server." ;;
    esac
    echo "    cmds:"
    if grep -qx "$name" <<<"$scripts"; then
      if [[ "$name" == "test" && "$pm" == "npm" ]]; then
        echo "      - npm test"
      else
        echo "      - $pm run $name"
      fi
    elif [[ "$name" == "dev" ]] && grep -qx "start" <<<"$scripts"; then
      echo "      - $pm start"
    else
      todo "$name"
    fi
  done

  echo "  clean:"
  echo "    desc: Remove build artifacts."
  echo "    cmds:"
  if grep -qx "clean" <<<"$scripts"; then
    echo "      - $pm run clean"
  else
    todo "clean"
  fi
}

emit_go() {
  cat <<'EOF'
  setup:
    desc: Download dependencies.
    cmds:
      - go mod download
  build:
    desc: Build the project.
    cmds:
      - go build ./...
  test:
    desc: Run the test suite.
    cmds:
      - go test ./...
  lint:
    desc: Vet the code.
    cmds:
      - go vet ./...
  dev:
    desc: Run the project.
    cmds:
      - go run .
  clean:
    desc: Remove build artifacts.
    cmds:
      - go clean
EOF
}

emit_rust() {
  cat <<'EOF'
  setup:
    desc: Fetch dependencies.
    cmds:
      - cargo fetch
  build:
    desc: Build the project.
    cmds:
      - cargo build
  test:
    desc: Run the test suite.
    cmds:
      - cargo test
  lint:
    desc: Lint with clippy.
    cmds:
      - cargo clippy
  dev:
    desc: Run the project.
    cmds:
      - cargo run
  clean:
    desc: Remove build artifacts.
    cmds:
      - cargo clean
EOF
}

emit_python() {
  local mgr=unknown runner=""
  if [[ -f uv.lock ]]; then
    mgr=uv
    runner="uv run "
  elif [[ -f poetry.lock ]] || { [[ -f pyproject.toml ]] && grep -q '^\[tool\.poetry\]' pyproject.toml 2>/dev/null; }; then
    mgr=poetry
    runner="poetry run "
  elif [[ -f pdm.lock ]] || { [[ -f pyproject.toml ]] && grep -q '^\[tool\.pdm\]' pyproject.toml 2>/dev/null; }; then
    mgr=pdm
    runner="pdm run "
  elif [[ -f Pipfile ]]; then
    mgr=pipenv
    runner="pipenv run "
  elif [[ -f requirements.txt ]]; then
    mgr=pip
  fi

  echo "  setup:"
  echo "    desc: Install dependencies."
  echo "    cmds:"
  case "$mgr" in
    uv) echo "      - uv sync --frozen" ;;
    poetry) echo "      - poetry install" ;;
    pdm) echo "      - pdm sync --frozen-lockfile" ;;
    pipenv) echo "      - pipenv sync" ;;
    pip) echo "      - python -m pip install -r requirements.txt" ;;
    unknown) todo setup ;;
  esac

  echo "  build:"
  echo "    desc: Build the project."
  echo "    cmds:"
  if [[ "$mgr" == poetry ]]; then
    echo "      - poetry build"
  elif [[ -f pyproject.toml ]] && grep -q '^\[build-system\]' pyproject.toml 2>/dev/null; then
    echo "      - ${runner}python -m build"
  else
    todo build
  fi

  echo "  test:"
  echo "    desc: Run the test suite."
  echo "    cmds:"
  if [[ -d tests ]] || compgen -G "test_*.py" >/dev/null 2>&1 || \
     [[ -f pytest.ini || -f tox.ini ]] || \
     { [[ -f pyproject.toml ]] && grep -q '^\[tool\.pytest' pyproject.toml 2>/dev/null; }; then
    echo "      - ${runner}pytest"
  else
    todo test
  fi

  echo "  lint:"
  echo "    desc: Lint the codebase."
  echo "    cmds:"
  if [[ -f ruff.toml || -f .ruff.toml ]] || \
     { [[ -f pyproject.toml ]] && grep -q '^\[tool\.ruff' pyproject.toml 2>/dev/null; }; then
    echo "      - ${runner}ruff check ."
  else
    todo lint
  fi

  echo "  dev:"
  echo "    desc: Run the project."
  echo "    cmds:"
  todo dev

  echo "  clean:"
  echo "    desc: Remove build artifacts."
  echo "    cmds:"
  todo clean
}

stacks=()
[[ -f package.json ]] && stacks+=(node)
[[ -f go.mod ]] && stacks+=(go)
[[ -f Cargo.toml ]] && stacks+=(rust)
[[ -f pyproject.toml || -f requirements.txt || -f uv.lock || -f poetry.lock || \
   -f pdm.lock || -f Pipfile ]] && stacks+=(python)

if [[ "${#stacks[@]}" -eq 0 ]]; then
  echo "No known stack detected (looked for Node.js, Go, Rust, and Python" \
       "manifests or lockfiles). Emitting individual TODO commands." >&2
  {
    for name in setup build test lint dev clean; do
      echo "  $name:"
      case "$name" in
        setup) echo "    desc: Install project dependencies." ;;
        build) echo "    desc: Build the project." ;;
        test) echo "    desc: Run the test suite." ;;
        lint) echo "    desc: Lint the project." ;;
        dev) echo "    desc: Run the project in development mode." ;;
        clean) echo "    desc: Remove build artifacts." ;;
      esac
      echo "    cmds:"
      todo "$name"
    done
  } | split_commands
  exit 0
fi

if [[ "${#stacks[@]}" -gt 1 ]]; then
  echo "Multiple stacks detected: ${stacks[*]}. Emitting namespaced, individual" \
       "command files under .tasks/commands/<stack>/. Rename stack namespaces" \
       "to project-specific part names when appropriate." >&2
  for stack in "${stacks[@]}"; do
    "emit_$stack" | split_commands "$stack"
    echo
  done
  exit 0
fi

"emit_${stacks[0]}" | split_commands
