# todo subtasks — design

Date: 2026-08-31. Builds on the MVP (`2026-08-27-todo-mvp-design.md`) and the
TUI board (`2026-08-28-tui-board-design.md`). Full product vision:
`docs/VISION.md`.

## Goal

Replace the planned generic task relations (blocks / blocked-by / relates-to /
parent) with the one relation that matches the real workflow: **subtasks**.
Notes start as simple todos; digging into one produces the concrete execution
steps ("create X page" → app UI, backend CRUD, API integration, subpage…).
Those steps become subtasks of the original todo, so the board keeps a clean
history: one main task per outcome, its subtasks tracking the steps.

Every surface participates: store + CLI, MCP tools, TUI board, and the skill —
which now tells Claude to break a todo into subtasks before working it.

Out of scope: other relation kinds (blocks, relates-to — VISION "later"),
nesting deeper than one level, automatic parent status changes, tags, search.

## Model

- `tasks.parent_id INTEGER NULL` — set means the task is a **subtask** of that
  task. Absent/`NULL` means top-level.
- **One level deep.** A subtask cannot have subtasks. Attaching is refused
  when the intended parent is itself a subtask, and when the task being
  attached has subtasks of its own. Self-parenting is refused. (With one
  level enforced on both ends, cycles are impossible.)
- **Same project.** A subtask created with `parentId` inherits the parent's
  project (any provided project is ignored). Re-parenting an existing task to
  a parent in another project is refused.
- **No status coupling.** Moving a parent or subtask never moves the other.
  The *skill* instructs that a parent is only `done` when all its subtasks
  are; the store does not enforce it.
- **Cascade delete.** Removing a parent removes its subtasks. Every surface
  that deletes says so first (TUI confirm shows the count; CLI prints it).

## Migration

`SCHEMA_VERSION = 2`. Fresh databases are created with the `parent_id` column.
A version-1 database gets `ALTER TABLE tasks ADD COLUMN parent_id INTEGER
REFERENCES tasks(id)` and its version row updated, inside `TaskStore.open()`.
The semantic rules (one level, same project, cascade) live in code; note that
`node:sqlite` enforces foreign keys by default, so the `REFERENCES` clause is
active as a backstop. Older binaries holding the same file keep working: v1
readers ignore the extra column, v1 writers name their columns explicitly.

## Changes to `@todo/core`

| file | change |
|---|---|
| `types.ts` | `Task.parent_id: number \| null`. New `InvalidParentError` (message says which rule failed). |
| `store.ts` | v2 schema + migration. `AddInput.parentId?: number`, `UpdatePatch.parentId?: number \| null` (null detaches). `subtasks(id): Task[]`. `remove(id)` returns the number of rows deleted (task + cascaded subtasks). `ListFilter.parentId?: number`. |
| `tree.ts` (new) | Pure helpers shared by CLI table and TUI board: `treeOrder(tasks)` — subtasks sort directly after their parent when the parent is in the set, otherwise by their own id; `subtaskProgress(tasks, id)` — `{ done, total }` over the subtasks present in `tasks`. |
| `format.ts` | `renderTable` orders with `treeOrder` and prefixes subtask titles with `↳ `. `renderTask` adds a `parent: #<id> <title>` line for subtasks and a `subtasks:` section (`[status] #<id> <title>` per line) for parents. |
| `cli.ts` | `add --parent <id>`; `edit --parent <id\|none>`; `rm` prints `removed #<id> (+N subtasks)` when it cascades. `show` needs the parent task and subtask list → passes them to `renderTask`. |
| `index.ts` | export `treeOrder`, `subtaskProgress`, `InvalidParentError`. |

`treeOrder` sort key: `(parentInSet ? parent_id : id, parentInSet ? 1 : 0, id)`.
Deterministic for every filter combination — a status-filtered list where the
parent didn't make the cut shows the subtask at its own id position.

## MCP (`todo-mcp`)

- `add_task` + `parent_id?` — "create as a subtask of that task".
- `update_task` + `parent_id?` nullable — null detaches.
- `list_tasks` + `parent_id?` filter.
- `show_task` result gains `subtasks: [{ id, title, status }]` (empty for
  tasks without subtasks) alongside the task fields, which now include
  `parent_id`.

## TUI

- **Board card:** subtasks render `↳` before the id. Parents append
  `done/total` progress (e.g. `2/4`) to the meta line, before due/project.
- **Column order:** `columns()` sorts each column with `treeOrder`, so
  subtasks sit under their parent whenever they share a column.
- **Detail:** subtask shows `parent:  #<id> <title>`; parent shows a
  `subtasks (done/total):` list with `[status] #<id> <title>` lines.
- **`s` key (board):** add a subtask of the selected task — of its *parent*
  when a subtask is selected (siblings; one level stays one level). Form
  heading `add subtask of #<id> · project: <name>`; the new task starts in
  `backlog` with the parent's project.
- **Delete confirm:** `delete #<id> "<title>" and N subtasks? y/n` when the
  task has subtasks.
- Help line gains `s subtask`.

## Skill

`packages/skill/SKILL.md` gains a **Subtasks** section:

- A task that expands into multiple units of work (planning a todo reveals
  steps — UI, backend, integration…) gets those steps as subtasks via
  `add_task` with `parent_id`, not one bloated description and not unrelated
  top-level tasks.
- Before starting work on a todo that clearly needs several distinct steps,
  create the subtasks first (or ask the user to confirm the breakdown), so
  progress is visible per step.
- Work subtasks one at a time: `in_progress` when started, `done` when
  finished. The parent moves to `done` only after its last subtask is done.
- Deleting a parent deletes its subtasks — one more reason `set_status` →
  `done` is preferred over deletion.

## Testing

- `core/test/store.test.ts` — add with `parentId` (inherits project);
  one-level and self-parent rules refused with `InvalidParentError`; detach
  via `update(parentId: null)`; re-parent across projects refused;
  `subtasks()`; cascade `remove()` returns count; `list({ parentId })`;
  opening a file created by a v1 schema migrates it and keeps existing rows.
- `core/test/tree.test.ts` — `treeOrder` grouping, parent-absent fallback,
  `subtaskProgress`.
- `core/test/format.test.ts` — table indent + ordering; `renderTask` parent
  line and subtasks section.
- `core/test/cli.test.ts` — `add --parent`, `edit --parent none`, cascade
  `rm` output.
- `mcp/test/tools.test.ts` — `add_task` with `parent_id`, `show_task`
  subtasks array, `update_task` detach, `list_tasks` filter, refusal message
  as tool error.
- `tui/test/board-model.test.ts` — column grouping.
- `tui/test/keys.test.ts` — `s` maps to add-subtask on the board only.
- `tui/test/app.test.tsx` — `s` creates a subtask of the selection; board
  shows `↳` and progress; delete confirm mentions subtask count.

## README / VISION

README: `--parent` flags, tree list output, MCP `parent_id`, TUI `s` key.
VISION: task field `relations` → `parent / sub-task (v2, shipped)`, other
relation kinds stay "later"; roadmap v2 = subtasks, shipped 2026-08-31.
