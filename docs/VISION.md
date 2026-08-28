# todo — full vision

A personal task manager for project-related notes, driven from the terminal and
from Claude Code. This file records the complete intended product so that no
part of it is lost while shipping smaller versions. The first shipped version is
described in `superpowers/specs/2026-08-27-todo-mvp-design.md`.

## Task

- **title** — required, short
- **description** — free text, any length
- **dateline** — optional due date
- **status** — one of `backlog`, `todo`, `in_progress`, `review`, `on_hold`, `done`
- **project** — derived from the git repository (or directory) the task was created in
- **relations** *(post-MVP)* — link a task to another: blocks / blocked-by, relates-to,
  parent / sub-task — so the set behaves like a Jira / Kanban board
- **tags, search** *(post-MVP)*

## Surfaces

1. **CLI** (`todo`) — MVP. Add, list, show, edit, move, delete.
2. **MCP server** (`todo-mcp`) — MVP. Same verbs as tools so Claude Code can
   record and update project tasks while working in the project.
3. **Skill** (`/todo`) — MVP. Manual entry point that tells Claude when/how to use the tools.
4. **TUI board** *(post-MVP)* — columns in order:
   `backlog` (all pending) · `todo` (picked for active work) · `in_progress` ·
   `review` · `on_hold` · `done`. Move tasks between columns, open a task to read
   its full description, see relations.

## Storage

SQLite, single file at `~/.todo/todo.db`, schema versioned so relations and
board metadata can be added by migration.

## Roadmap

| version | scope |
|---|---|
| **MVP** | monorepo, `core` CLI + SQLite, `mcp` server, `skill` |
| v2 | task relations |
| v3 | TUI board |
| later | tags, search, export |
