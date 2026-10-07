# Skills Directory

Index of every skill available in this folder, with a classification tag and the recommended install group.

## Full table

| Folder                                 | Skill Name                             | Tag                | Install Group                                  |
| -------------------------------------- | -------------------------------------- | ------------------ | ---------------------------------------------- |
| agent-extension-plugin-creator         | agent-extension-plugin-creator         | `agent-extension`  | C. Codex Extension/Skill Authoring             |
| agent-extension-skill-creator          | agent-extension-skill-creator          | `agent-extension`  | C. Codex Extension/Skill Authoring             |
| agent-extension-skill-family-organizer | agent-extension-skill-family-organizer | `agent-extension`  | C. Codex Extension/Skill Authoring             |
| agent-extension-skill-installer        | agent-extension-skill-installer        | `agent-extension`  | C. Codex Extension/Skill Authoring             |
| agentic-engineering-source-context     | agentic-engineering-source-context     | `research`         | B. Agentic Engineering Workflow                |
| agentic-engineering-structure-cleanup  | agentic-engineering-structure-cleanup  | `refactoring`      | B. Agentic Engineering Workflow                |
| agentic-engineering-workflow           | agentic-engineering-workflow           | `workflow`         | B. Agentic Engineering Workflow (orchestrator) |
| frontend-bem-css                       | frontend-bem-css                       | `css`              | A. Frontend Web Stack                          |
| frontend-javascript-style-guide        | frontend-javascript-style-guide        | `javascript`       | A. Frontend Web Stack                          |
| frontend-nuxt                          | frontend-nuxt                          | `nuxt`             | A. Frontend Web Stack                          |
| frontend-responsive-mobile-first       | frontend-responsive-mobile-first       | `css`              | A. Frontend Web Stack                          |
| frontend-style-guide                   | frontend-style-guide                   | `html-css`         | A. Frontend Web Stack (base)                   |
| frontend-vue-style-guide               | frontend-vue-style-guide               | `vue`              | A. Frontend Web Stack                          |
| frontend-web-performance               | frontend-web-performance               | `performance`      | A. Frontend Web Stack                          |
| imagegen                               | imagegen                               | `image-generation` | H. OpenAI Ecosystem                            |
| linux-mint-engineer                    | linux-mint-engineer                    | `sysadmin`         | Standalone                                     |
| memory-adr                             | memory-adr                             | `documentation`    | G. Documentation & Memory                      |
| openai-docs                            | openai-docs                            | `openai`           | H. OpenAI Ecosystem                            |
| qt-qml-review                          | qt-qml-review                          | `qt`               | Standalone (third-party: theqtcompanyrnd/agent-skills) |

⚠️ = overlap/duplicate detected, see the group notes below. ✅ = already merged into one skill.



## Recommended install groups

### A. Frontend Web Stack

`frontend-style-guide` (base) + `frontend-bem-css` + `frontend-responsive-mobile-first` + `frontend-javascript-style-guide` + `frontend-vue-style-guide` + `frontend-nuxt` + `frontend-web-performance`

**Why together:** each one explicitly declares itself as a "companion" of the others in its own SKILL.md (e.g. `frontend-bem-css` says "use `frontend-style-guide` for formatting, `frontend-responsive-mobile-first` for responsive, `frontend-vue-style-guide` for Vue"). Installing only one leaves gaps the others are designed to cover.
**Install partially if:** you don't use Vue/Nuxt, you can skip `frontend-vue-style-guide` and `frontend-nuxt`. `frontend-web-performance` is optional if you're not auditing performance.

### B. Agentic Engineering Workflow

`agentic-engineering-workflow` (orchestrator) + `agentic-engineering-source-context` + `agentic-engineering-structure-cleanup` + `agentic-engineering-review-agent` + `agentic-engineering-review-loop`

**Why together:** `agentic-engineering-workflow` explicitly says it coordinates the other four as "companion skills" at each phase (context → implementation → cleanup → review). It's a complete feature-dev pipeline with agents; installing only the orchestrator without the rest leaves it citing skills that don't exist.
**Install partially if:** you only need the small-PR review loop — `agentic-engineering-review-agent` + `agentic-engineering-review-loop` is enough.

### C. Codex Extension/Skill Authoring

`agent-extension-skill-creator` + `agent-extension-plugin-creator` + `agent-extension-skill-family-organizer` + `agent-extension-skill-installer`

**Why together:** these are the meta-tools for creating, packaging, organizing, and installing Codex skills/plugins. If you're going to maintain your own skill collection (like this folder), the four together cover the full cycle: create → organize into families → package as a plugin → install from an external repo.

### D. Pi Extension Authoring ⚠️ (pick one, not both)

`agent-extension-pi-creator` vs `pi-extension-creator`

**Duplicate detected:** both do the same thing (create Pi agent extensions: slash commands, tools, hooks). The only difference is that `agent-extension-pi-creator` allows global installation in addition to local, while `pi-extension-creator` is project-local only. Installing both is redundant and can create confusion about which one activates. Recommendation: keep `agent-extension-pi-creator` (superset of functionality) unless you specifically want to guarantee global config is never touched.

### E. Userscript Development

`tampermonkey` + `tampermonkey-gui-builder`

**Why together:** `tampermonkey` covers the general develop/debug/review cycle for userscripts; `tampermonkey-gui-builder` is a specialized pattern for separating GUI (HTML/CSS/JS) from the core and compiling it into a single file. If your userscripts never need a settings panel/dialogs, `tampermonkey` alone is enough.

### F. Git Commit & Attribution ✅ Merged

`git-commit-no-ai` (replaces `git-commit` + `no-co-author`)

**What was done:** both skills covered the same end-to-end flow (generate message → commit → optionally push, guaranteeing zero AI attribution), so they were merged into a single `git-commit-no-ai` skill instead of keeping them as two separate installs that had to be coordinated by hand.

**What the merged skill includes:**

- The full `git-commit` flow (Conventional Commits, Message/Commit/Push modes, repo inspection, secret detection).
- Both layers from `no-co-author`: the behavioral layer (instructions to the agent) and the infallible enforcement layer (`scripts/commit-msg`, a git hook that strips any AI trailer before the commit is finalized, regardless of which tool wrote it).
- `scripts/install.sh` and `scripts/verify.sh`, `reference/patterns.md` and `reference/clean-history.md`, and the per-tool templates (`templates/CLAUDE.md.snippet`, `.cursorrules.snippet`, `copilot-instructions.snippet`).
- The "no AI attribution" rule is **repeated in every section** of the `SKILL.md` (setup, each mode, message building, history verification, and the final report) instead of appearing once, so it's impossible to miss at any phase of the flow.

**Original folders:** `git-commit/` and `no-co-author/` were deleted after the merge was confirmed; the active skill going forward is `git-commit-no-ai/`.

### G. Documentation & Memory

`readme-instructions` vs `docs-readme-instructions` ⚠️ (pick one) + `memory-adr`

**Duplicate detected:** `readme-instructions` and `docs-readme-instructions` cover the same thing (writing/updating a README). `docs-readme-instructions` is stricter — plain step-by-step English only, no explanatory paragraphs. `readme-instructions` allows a bit more "GitHub-friendly" structure. Install only the one that matches the style you prefer; keeping both can leave the agent unsure which one to apply.
**`memory-adr`** is complementary, not a duplicate: it covers decision memory (ADRs) + active project state, not usage documentation. It makes sense alongside either of the two above if you want both a user-facing README and memory for the agent itself.

### H. OpenAI Ecosystem

`openai-docs` + `imagegen`

**Why together:** `imagegen` has a CLI fallback mode that depends on `OPENAI_API_KEY` and OpenAI models; `openai-docs` is the authoritative reference for those same models/APIs. If you only generate images through the built-in mode (no CLI/API), `openai-docs` is optional.

### I. Go CLI Development

`cli-go-cobra` + `cli-go-cobra-wails` (+ optionally `cli-better` as the design layer)

**Why related (not duplicates):** `cli-go-cobra` covers the pure Cobra framework — scaffolding with `cobra-cli`, command shape, flags, args validators, completions — plus the Charm ecosystem (charm.land) for polishing the terminal: `fang` (styled help/usage/errors/version), `lipgloss` (custom styling), `huh` (interactive prompts/forms), and `log` (structured, leveled logging). All of it for any Go CLI that lives in the terminal. `cli-go-cobra-wails` assumes that same Cobra as a base and adds a Wails+Vue layer so specific commands (e.g. `config`) can open a native window. Use only `cli-go-cobra` for a terminal-only CLI (with or without Charm); add `cli-go-cobra-wails` only when the project also needs a GUI window for some subcommand — don't install the second one "just in case" if you're never going to open a window.

**`cli-better` complements both, but isn't Go-specific — that's why it's listed separately, not merged into this group.** `cli-go-cobra`/`cli-go-cobra-wails` are the *implementation* layer (how a command looks in Go+Cobra code); `cli-better` is the *design/UX* layer, and it's explicit about staying language- and framework-agnostic ("preserve the user's chosen language and framework"): stdout/stderr separation, exit-code conventions, `NO_COLOR` and TTY detection, help-text structure, config precedence, flag-deprecation policy. None of that is covered by `cli-go-cobra` or `cli-go-cobra-wails`, and neither of those two dictates it either — they show you how to wire a `RunE` and a flag, not whether a given command should exist, be a flag, or be interactive. Pair `cli-better` with either Go skill when designing or reviewing a CLI's actual user-facing contract, not just its Cobra plumbing.

### Standalone (install individually as needed)

`bash-scripting`, `cli-better`, `taskfile`, `playwright-cli`, `linux-mint-engineer`

Listed standalone because none of them requires another skill in this collection to be useful on its own — `cli-better` in particular is still worth installing even with zero Go skills present, since it applies to a CLI in any language. The rest solve self-contained domains (scripting, task automation, browser testing, or Linux Mint system support). Install each only when the project needs it — and see Group I above for how `cli-better` pairs with the Go CLI skills when both apply.

## General notes

- Tags shared by more than one skill (`css`, `agent-extension`, `docs`, `git`, `userscript`) point to natural grouping candidates; the groups above make the real reason explicit (declared companions, same domain, or duplicate).
- ⚠️ marks pairs that probably shouldn't coexist as-is — not because of technical incompatibility, but because they cover the same use case with different nuances, and having both active can make skill selection ambiguous.
