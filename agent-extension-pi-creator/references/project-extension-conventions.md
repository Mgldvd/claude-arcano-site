# Project Pi Extension Conventions

## Required layout

All project-local Pi extensions belong in their own directory:

```text
.pi/extensions/<extension-name>/index.ts
```

Good:

```text
.pi/extensions/gum-checklist/index.ts
.pi/extensions/permission-gate/index.ts
.pi/extensions/my-tool/index.ts
```

Bad:

```text
.pi/extensions/gum-checklist.ts
.pi/extensions/permission-gate.ts
~/.pi/agent/extensions/project-specific-extension.ts
```

## Minimal command extension template

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function exampleExtension(pi: ExtensionAPI) {
  pi.registerCommand("example", {
    description: "Run the example command",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Example extension works", "info");
    },
  });
}
```

## Minimal tool extension template

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function exampleToolExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "example_tool",
    label: "Example Tool",
    description: "Echo text back to the user.",
    parameters: Type.Object({
      text: Type.String({ description: "Text to echo" }),
    }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: params.text }],
        details: { text: params.text },
      };
    },
  });
}
```

## Interactive UI preference

Prefer Pi-native `ctx.ui` methods for interactive extensions:

```ts
const choice = await ctx.ui.select("Pick one", ["A", "B", "C"]);
const ok = await ctx.ui.confirm("Confirm", "Continue?");
const value = await ctx.ui.input("Name", "Enter a value");
```

Only use external CLI tools such as `gum` when the user explicitly requests them. External CLIs may need a real TTY and can fail in non-interactive modes.

## Reload

After changes, use:

```text
/reload
```

Project-local extensions load only after the project is trusted.
