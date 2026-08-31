---
name: todo
description: Record and update project tasks with the `todo` MCP tools (add_task, list_tasks, show_task, update_task, set_status, delete_task), including breaking a big todo into subtasks via parent_id. Use when the user says "/todo", "add a task", "note this as a todo", "what's pending", "mark X done", or wants project-scoped tasks tracked while working.
---

# todo

Tasks live in a SQLite DB shared with the `todo` CLI. The MCP server scopes
everything to the current project (git repo name) automatically — never pass
`project` unless the user names a different one.

## Rules

- `title` short and imperative. Everything else — context, links, findings,
  acceptance notes — goes in `description`. Any length is fine.
- New tasks stay in `backlog` unless the user says to start it (`todo`),
  is doing it now (`in_progress`), or asks for another status.
- Statuses: `backlog`, `todo`, `in_progress`, `review`, `on_hold`, `done`.
- After any write, call `list_tasks` and show the result so the user sees state.
- Never delete without an explicit ask; prefer `set_status` → `done`.
- If the user asks what to do next: `list_tasks` with `status: "todo"`, then
  `in_progress`, and summarise.

## Subtasks

A task can have one level of subtasks (`parent_id`). Use them whenever one
todo expands into several units of work — planning "create X page" reveals
UI, backend CRUD, API integration, subpage steps. Keep one main task per
outcome; its steps become subtasks. Never pile the steps into the
description and never create them as unrelated top-level tasks.

- Before starting work on a todo that clearly needs several distinct steps,
  create its subtasks (`add_task` with `parent_id`) — propose the breakdown
  to the user first when the steps aren't obvious from their request.
- Work subtasks one at a time: `in_progress` when you start one, `done` when
  it's finished — the board then shows real progress per step.
- The parent goes `done` only after its last subtask is done.
- A subtask inherits the parent's project; nesting deeper than one level is
  refused by the store.
- Deleting a parent deletes its subtasks — one more reason to prefer
  `set_status` → `done` over deletion.
- `show_task` on a parent lists its subtasks; `list_tasks` with `parent_id`
  filters to one family.

## Manual CLI equivalents

`todo add "<title>" -d "<desc>" [--due YYYY-MM-DD] [--parent <id>]`,
`todo list [--all]`, `todo show <id>`, `todo edit <id> [--parent <id|none>]`,
`todo status <id> <status>`, `todo done <id>`, `todo rm <id>`.
