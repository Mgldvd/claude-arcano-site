#!/usr/bin/env python3
"""Audit flat, prefix-based Codex skill families without external dependencies."""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path


VALID_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|\Z)", re.DOTALL)
FRONTMATTER_NAME = re.compile(r"^name:\s*[\"']?([^\"'\n]+?)[\"']?\s*$", re.MULTILINE)
DEFAULT_PROMPT = re.compile(r"^\s*default_prompt:\s*[\"'](.*)[\"']\s*$", re.MULTILINE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inventory skill families and report identity or metadata mismatches.",
    )
    parser.add_argument("skill_root", type=Path, help="Directory containing skill folders")
    parser.add_argument(
        "--min-family-size",
        type=int,
        default=2,
        help="Minimum members sharing a prefix to count as a family (default: 2)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit nonzero when any audit issue is found",
    )
    return parser.parse_args()


def read_text(path: Path, issues: list[str]) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        issues.append(f"{path}: cannot read file: {error}")
        return ""


def discover_skills(root: Path, issues: list[str]) -> list[Path]:
    if not root.is_dir():
        issues.append(f"{root}: skill root is not a directory")
        return []

    skills = []
    for child in sorted(root.iterdir(), key=lambda path: path.name):
        if child.name.startswith(".") or not child.is_dir():
            continue
        if (child / "SKILL.md").is_file():
            skills.append(child)
    return skills


def audit_skill(skill: Path, issues: list[str]) -> str:
    skill_name = skill.name
    skill_md = read_text(skill / "SKILL.md", issues)

    if not VALID_NAME.fullmatch(skill_name):
        issues.append(f"{skill}: folder name must use lowercase hyphen-case")

    frontmatter = FRONTMATTER.match(skill_md)
    match = FRONTMATTER_NAME.search(frontmatter.group(1)) if frontmatter else None
    if not match:
        issues.append(f"{skill / 'SKILL.md'}: missing frontmatter name")
    elif match.group(1).strip() != skill_name:
        issues.append(
            f"{skill / 'SKILL.md'}: name '{match.group(1).strip()}' "
            f"does not match folder '{skill_name}'",
        )

    openai_yaml = skill / "agents" / "openai.yaml"
    if not openai_yaml.is_file():
        issues.append(f"{openai_yaml}: missing UI metadata")
    else:
        metadata = read_text(openai_yaml, issues)
        prompt_match = DEFAULT_PROMPT.search(metadata)
        invocation = f"${skill_name}"
        if not prompt_match:
            issues.append(f"{openai_yaml}: missing quoted interface.default_prompt")
        elif invocation not in prompt_match.group(1):
            issues.append(
                f"{openai_yaml}: default_prompt must invoke '{invocation}'",
            )

    return skill_name


def print_inventory(names: list[str], minimum: int) -> None:
    by_prefix: dict[str, list[str]] = defaultdict(list)
    for name in names:
        parts = name.split("-")
        candidates = []
        for length in range(1, len(parts)):
            prefix = "-".join(parts[:length])
            members = [
                candidate
                for candidate in names
                if candidate.startswith(f"{prefix}-")
            ]
            if len(members) >= minimum:
                candidates.append(prefix)

        if candidates:
            by_prefix[candidates[-1]].append(name)

    family_names = {
        prefix: members
        for prefix, members in by_prefix.items()
        if len(members) >= minimum
    }
    family_members = {
        member for members in family_names.values() for member in members
    }
    singletons = [name for name in names if name not in family_members]

    print("Families")
    if not family_names:
        print("  (none)")
    for prefix, members in sorted(family_names.items()):
        print(f"  {prefix}-* ({len(members)})")
        for member in members:
            print(f"    - {member}")

    print("Singletons")
    if not singletons:
        print("  (none)")
    for name in singletons:
        print(f"  - {name}")


def main() -> int:
    args = parse_args()
    if args.min_family_size < 2:
        print("--min-family-size must be at least 2", file=sys.stderr)
        return 2

    issues: list[str] = []
    skills = discover_skills(args.skill_root, issues)
    names = [audit_skill(skill, issues) for skill in skills]

    print_inventory(names, args.min_family_size)
    print("Issues")
    if not issues:
        print("  (none)")
    for issue in issues:
        print(f"  - {issue}")

    return 1 if args.strict and issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
