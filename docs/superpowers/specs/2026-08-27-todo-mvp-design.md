# todo MVP — design

Date: 2026-08-27. Full product vision: `docs/VISION.md`.

## Goal

A CLI task manager backed by SQLite, plus an MCP server and a Claude Code skill,
so project tasks can be recorded and updated from the terminal and from inside a
Claude Code session working on that project.

Out of scope for the MVP (kept in VISION.md): task relations, TUI board, tags, search.

## Repository

`~/Dev/todo` — pnpm workspace, TypeScript, Node ≥ 24, ESM.

```
todo/
├── packages/
│   ├── core/     # @todo/core — TaskStore, project detection, `todo` CLI
│   ├── mcp/      # @todo/mcp  — stdio MCP server, `todo-mcp` binary
│   └── skill/    # SKILL.md for /todo
└── docs/
```

The Claude Code glue (skill, MCP) lives in this repo, not in `ai-tools`;
`ai-tools/README.md` gets a pointer row, as it does for `agentic-memory`.

## Decisions

- **Runtime:** Node 24 + TypeScript. SQLite via built-in `node:sqlite` — no native build.
- **MCP ↔ core:** the MCP imports `TaskStore` from `@todo/core` directly. No
  shelling out to the CLI, no daemon. "Starting the app" is opening the DB.
- **Project scoping:** `git rev-parse --show-toplevel` → basename; outside a repo,
  cwd basename. `--project <name>` overrides; `--all` lists every project.
- **Statuses:** all six from the vision from day one:
  `backlog | todo | in_progress | review | on_hold | done`. New tasks start as `backlog`.
- **DB location:** `~/.todo/todo.db`; `TODO_DB=<path>` overrides (tests use a temp file).

## Data model

```sql
CREATE TABLE schema_version (version INTEGER NOT NULL);

CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY,
  project     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'backlog'
              CHECK (status IN ('backlog','todo','in_progress','review','on_hold','done')),
  due         TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX tasks_project_status ON tasks (project, status);
```

`due` and timestamps are ISO-8601 strings. `updated_at` is set on every write.

## @todo/core

### `TaskStore`

```ts
class TaskStore {
  static open(path?: string): TaskStore      // creates dir + schema, runs migrations
  add(input: { project; title; description?; due? }): Task
  list(filter: { project?; status?; all?: boolean }): Task[]
  get(id: number): Task | undefined
  update(id: number, patch: { title?; description?; due? }): Task   // throws NotFound
  setStatus(id: number, status: Status): Task                        // validates status
  remove(id: number): void
  close(): void
}
```

`detectProject(cwd: string): string` implements the scoping rule.

### CLI `todo`

```
todo add "<title>" [-d "<desc>"] [--due YYYY-MM-DD] [--project X]
todo list [--status S] [--project X] [--all]
todo show <id>
todo edit <id> [--title T] [-d "<desc>"] [--due D]
todo status <id> <status>
todo done <id>
todo rm <id>
```

- `add`/`edit` without `-d`: read description from stdin if piped, else open `$EDITOR`.
- `list` prints a table (id, status, due, title); `show` prints the full record.
- `--json` on any command prints the raw record(s).
- Unknown id / invalid status → message to stderr, exit 1.
- Built with `commander`.

## @todo/mcp

stdio server (`@modelcontextprotocol/sdk`), binary `todo-mcp`. Opens `TaskStore`
once at startup. Project defaults to `detectProject(process.cwd())` — Claude Code
launches MCP servers in the session's working directory.

| tool | input | returns |
|---|---|---|
| `add_task` | title, description?, due?, project? | Task |
| `list_tasks` | status?, project?, all? | Task[] |
| `show_task` | id | Task |
| `update_task` | id, title?, description?, due? | Task |
| `set_status` | id, status | Task |
| `delete_task` | id | `{ ok: true }` |

Errors are returned as MCP tool errors (`isError: true`) with the message.

Registration (once, user scope):
`claude mcp add --scope user todo -- node ~/Dev/todo/packages/mcp/dist/index.js`

## Skill `/todo`

`packages/skill/SKILL.md` (frontmatter `name: todo`). Tells Claude: use the
`todo` MCP tools to record/update tasks for the current project; new tasks go to
`backlog` unless the user says otherwise; put detail in `description`, keep
`title` short; confirm with `list_tasks` after writes. Installed by symlinking
into `~/.claude/skills/todo`.

## Testing

`node:test` + `node --test`, temp DB via `TODO_DB`.

- core: `TaskStore` CRUD, status validation, migration on fresh DB, `detectProject`
  inside/outside a git repo.
- CLI: spawn the built binary per command, assert stdout/exit code.
- mcp: call tool handlers directly against a temp store.

## Milestones

1. Workspace scaffold, `TaskStore` with tests.
2. CLI, all seven commands, tests.
3. MCP server, tools, tests; register in Claude Code.
4. Skill file; `ai-tools` README pointer; `docs/` final.
