# Project Scope Rules

This folder is the canonical working scope for `20k-10mil-challenge`.

## Scope

- Keep all routine reads and writes inside this project folder.
- Do not write to sibling folders under `/Volumes/Storage8TB/projects` unless the task explicitly requires cross-project work.
- Do not write to `/Users/talsmac/colleague` unless the task is specifically about Colleague infrastructure, templates, or operations.

## Placement Rules

- Put durable docs in `docs/` when present; otherwise use the established project docs area.
- Put scratch files in `tmp/` when present; otherwise use the established temp or scratch area.
- Put generated results in `output/` when present; otherwise use the established output or generated area.
- Prefer existing project folders over creating new loose root-level files.
- Keep code, scripts, and assets in the established project structure rather than creating parallel folder trees.
- Follow `CLAUDE.md` for project-specific workflow rules, but keep routine file placement local to this project unless it explicitly says otherwise.

## Search Rules

1. Search this project first.
2. Expand only to explicitly named related paths if the task truly needs them.
3. Do not scan the wider portfolio by default.
