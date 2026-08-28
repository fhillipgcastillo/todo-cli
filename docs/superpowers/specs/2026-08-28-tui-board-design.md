# todo TUI board — design

Date: 2026-08-28. Builds on the MVP (`2026-08-27-todo-mvp-design.md`). Full
product vision: `docs/VISION.md`.

## Goal

A terminal board (`todo-tui`) over the same SQLite file the CLI and the MCP
server use, that **updates in real time** while an AI session (or anything
else) changes tasks. Full board from the first drop: navigate, move between
columns, open a task, add, edit title/due, edit description in `$EDITOR`,
delete.

Out of scope: task relations (VISION v2 — the board ships before them, so no
relation display), tags, search, mouse support, theming.

## Decisions

- **Framework:** Ink (React for terminals). Matches the maintainer's React
  background; testable with `ink-testing-library`.
- **Entry point:** separate package `packages/tui` (`@todo/tui`), binary
  `todo-tui`. `core` stays free of React.
- **Live updates:** poll `PRAGMA data_version` on the TUI's own connection
  every 250 ms (`--interval <ms>` to change). The pragma is an in-memory read
  that changes only when *another connection* commits — verified on Node
  24.18 across processes. No daemon, no socket, no filesystem watching, and
  no change to how the CLI or MCP write. Any writer is detected.
- **Editing:** title and due inline in a two-field form; description via
  `$VISUAL` / `$EDITOR` / `vi`, reusing core's editor helper.
- **Scoping:** `detectProject(process.cwd())` by default, `--project <name>`
  overrides, `--all` shows every project (cards then carry a project tag).
  Same semantics as CLI and MCP.
- **Data flow:** one `TaskStore` owned by the app. Every action → store call →
  reload → render. Remote changes → watcher fires → reload → render. Same
  path, no optimistic state.

## Changes to `@todo/core`

| file | change |
|---|---|
| `store.ts` | `dataVersion(): number` — `PRAGMA data_version`. `open()` also sets `PRAGMA busy_timeout = 2000` so a write that collides with the MCP's lock waits instead of throwing `SQLITE_BUSY` (benefits CLI/MCP too). |
| `watch.ts` (new) | `watchChanges(store, onChange, intervalMs = 250): () => void`. `setInterval`; calls `onChange()` only when `dataVersion()` differs from the last seen value; the returned function stops the timer. Timer is `unref()`'d. |
| `description.ts` | `openEditor(initial: string): string` becomes exported and seeds the temp file with `initial` (today it is private and starts empty). Returns the file contents; the CLI's existing behaviour is unchanged. Exit status of the editor is surfaced: on non-zero exit the function throws `EditorFailedError` and the caller keeps the old text. |
| `index.ts` | export `watchChanges`, `openEditor`, `EditorFailedError`. |

`mcp` does not change.

## `packages/tui`

```
packages/tui/
├── package.json     bin todo-tui; deps @todo/core, ink, react, ink-text-input
│                    dev: ink-testing-library, @types/react
├── tsconfig.json    extends base, jsx: react-jsx
├── src/
│   ├── index.tsx    parse flags, guards, TaskStore.open(), render(<App/>)
│   ├── app.tsx      mode state machine, watcher wiring, store actions
│   ├── board.tsx    six columns, selection highlight
│   ├── detail.tsx   full task view
│   ├── form.tsx     title + due form (add / edit)
│   ├── confirm.tsx  y/n prompt
│   └── keys.ts      pure key → action mapping per mode
└── test/
    ├── keys.test.ts
    └── app.test.tsx
```

### Flags

`--project <name>`, `--all`, `--db <path>` (same as `TODO_DB`), `--interval <ms>`
(default 250), `--version`, `--help`.

### Screens

**Board** — header `todo · project: <name>` (or `all projects`), a live
indicator (`● live` / `○ paused` while `$EDITOR` is open), and the key hint.
Six columns in `STATUSES` order, each titled `<status> (<count>)`. Column width
= `stdout.columns / 6`, card text truncated with `…`. Cards: `#id title`, due
on a second line if set, project tag under `--all`. Tasks in a column are
ordered by id.

Selection is a task **id** (not an index). After every reload, if the id is
gone the selection falls to the nearest task in the same column, or the first
task on the board, or nothing.

**Detail** — title, project, status, due, created, updated, then the
description; `↑/↓` scroll the description when it overflows.

**Form** — fields `title` and `due`; `tab` switches, `enter` submits, `esc`
cancels. Empty title → inline error, form stays open. Due must be empty or
`YYYY-MM-DD` (a real calendar date) → inline error otherwise. Add creates in
`backlog` with the scoped project; under `--all` it uses
`detectProject(cwd)` and shows that project in the form header.

**Confirm** — `delete #<id> "<title>"? y/n`.

### Keys

| key | board | detail |
|---|---|---|
| `←/→` `h/l` | change column | — |
| `↑/↓` `j/k` | change row | scroll description |
| `[` / `]` | move task to previous / next status | same |
| `1`–`6` | move task to that column | same |
| `enter` | open detail | — |
| `esc` | — | back to board |
| `a` | add task | — |
| `e` | edit title/due | same |
| `d` | edit description in `$EDITOR` | same |
| `x` | delete (confirm) | same |
| `r` | reload now | same |
| `?` | toggle key help | same |
| `q` / `ctrl-c` | quit | quit |

`[` on `backlog` and `]` on `done` are no-ops.

### `$EDITOR` handoff

1. stop watcher, set indicator to paused
2. `stdin.setRawMode(false)`, Ink's input is paused
3. `openEditor(task.description)` (blocking, `stdio: 'inherit'`)
4. restore raw mode, resume input
5. if the editor succeeded and the text changed → `store.update(id, { description })`
6. restart watcher, reload

On `EditorFailedError` the status line shows `editor exited with <code>; description unchanged`.

## Error handling

| situation | behaviour |
|---|---|
| `TaskStore.open` throws | message on stderr, exit 1, nothing rendered |
| `stdout` is not a TTY | `todo-tui needs an interactive terminal`, exit 1 |
| selected task removed / changed remotely between poll and keypress (`NotFoundError`) | status line `task #<id> no longer exists`, reload; never crashes |
| `InvalidStatusError` (cannot happen from the key table; defensive) | status line message |
| write collides with another writer | `busy_timeout` waits up to 2 s; if it still fails the error text goes to the status line |
| terminal resize | Ink re-renders; column widths recomputed from `stdout.columns` |
| `ctrl-c` / `q` | stop watcher, `store.close()`, exit 0 |

The status line clears on the next keypress.

## Testing

- `core/test/store.test.ts` — `dataVersion()` is stable across reads and
  changes after a write from a second `TaskStore` opened on the same file.
- `core/test/watch.test.ts` — with `node:test` mock timers: `onChange` fires
  once per change and not on idle ticks; the stop function ends polling.
- `core/test/description.test.ts` — `openEditor(initial)` seeds the file;
  non-zero exit throws `EditorFailedError` (editor = a tiny script via `EDITOR`).
- `tui/test/keys.test.ts` — the key table, per mode.
- `tui/test/app.test.tsx` — `ink-testing-library` with a temp-file store:
  board renders columns and counts; a write from a **second store instance**
  shows up in the next frame within one interval; navigation, move (`[`/`]`,
  digits), add, edit, delete + cancelled delete via `stdin.write`; selection
  survives reload and falls back when its task is deleted; remote deletion
  of the selected task shows the status line, does not throw; `$EDITOR` path
  with `EDITOR` set to a script that appends a line.
- Existing CLI and MCP suites unchanged and green.

## README / install

README gets `packages/tui` in the structure tree, a `todo-tui` row in the
system diagram, and an install step `npm link ./packages/tui`. VISION.md
roadmap row v3 marked shipped ahead of v2 (relations).
