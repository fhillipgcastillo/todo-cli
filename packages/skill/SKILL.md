---
name: todo
description: Record and update project tasks with the `todo` MCP tools (add_task, list_tasks, show_task, update_task, set_status, delete_task). Use when the user says "/todo", "add a task", "note this as a todo", "what's pending", "mark X done", or wants project-scoped tasks tracked while working.
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

## Manual CLI equivalents

`todo add "<title>" -d "<desc>" [--due YYYY-MM-DD]`, `todo list [--all]`,
`todo show <id>`, `todo status <id> <status>`, `todo done <id>`, `todo rm <id>`.
