---
name: docs-readme-instructions
description: Create or update English instructions inside README files. Use when Codex needs to add, rewrite, or clean README usage, setup, install, run, test, deployment, troubleshooting, or workflow instructions as simple step-by-step English directions without explanatory paragraphs.
---

# README Instructions

## Overview

Use this skill to write README instructions that are easy to follow, concise, and action-oriented.

## Workflow

1. Inspect the existing README and the project files needed to understand the real commands.
2. Identify the exact user workflow: prerequisites, setup, run, test, build, deploy, or troubleshooting.
3. Write instructions in English only.
4. Use numbered steps for ordered workflows.
5. Use short imperative sentences.
6. Put one command per line inside fenced code blocks.
7. Keep explanations out of the steps unless the user explicitly asks for context.
8. Preserve existing accurate README sections that are outside the requested change.
9. Verify command names, paths, environment variables, and file names against the repo before finalizing.

## Style Rules

- Write in English.
- Keep each step simple and direct.
- Start steps with verbs such as `Install`, `Copy`, `Create`, `Run`, `Open`, `Set`, `Check`, or `Deploy`.
- Avoid explaining why a step exists.
- Avoid long paragraphs before or after the steps.
- Avoid marketing copy, feature descriptions, and conceptual background.
- Avoid inline commands when a command block is clearer.
- Prefer exact commands over generic descriptions.
- Use placeholders only when the real value is user-specific, such as `<your-api-key>`.

## README Patterns

Use headings that match the project and existing README structure. Common headings:

- `## Prerequisites`
- `## Setup`
- `## Run`
- `## Test`
- `## Build`
- `## Deploy`
- `## Troubleshooting`

## Example Output

````markdown
## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment file.

```bash
cp .env.example .env
```

3. Start the app.

```bash
npm run dev
```
````
