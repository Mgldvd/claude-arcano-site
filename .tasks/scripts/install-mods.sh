#!/usr/bin/env bash
# Mirrors mods/ into the local claude-mods marketplace that install.md sets up
# ($CFG/arcano/claude-mods), so an edit here reaches the installed mods after /reload-plugins.
set -euo pipefail

SRC="${1:?usage: install-mods.sh <mods dir>}"
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DEST="$CFG/arcano/claude-mods"

if [ ! -f "$DEST/.claude-plugin/marketplace.json" ]; then
  echo "No claude-mods marketplace at $DEST." >&2
  echo "Install the mods once as https://claude.arcano.site/install.md describes, then run this again." >&2
  exit 1
fi

# Only the catalog and the mod folders: mods/ also holds scratch output that is not published.
cp "$SRC/.claude-plugin/marketplace.json" "$DEST/.claude-plugin/marketplace.json"
count=0
for manifest in "$SRC"/*/.claude-plugin/plugin.json; do
  mod="$(dirname "$(dirname "$manifest")")"
  # The engine writes .claude-plugin/types/ into each loaded mod: never copy or delete it.
  rsync -a --exclude '.claude-plugin/types/' "$mod/" "$DEST/$(basename "$mod")/"
  count=$((count + 1))
done
echo "Copied $count mods to $DEST"

claude plugin marketplace update claude-mods
echo "Run /reload-plugins in Claude Code to load them. A new mod needs: claude plugin install <mod>@claude-mods"
