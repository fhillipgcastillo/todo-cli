# todo

Project-scoped task manager: a CLI + SQLite core, an MCP server for Claude
Code, and a `/todo` skill. Full product vision in `docs/VISION.md`; this MVP in
`docs/superpowers/specs/2026-08-27-todo-mvp-design.md`.

## Install into Claude Code (from source, no marketplace)

Requirements: Node ≥ 24, pnpm, the `claude` CLI. Everything runs from your
clone — no publish step. `<REPO>` below is the absolute path of the clone.

### 1. Build

    git clone git@github.com:fhillipgcastillo/todo-cli.git
    cd todo-cli
    pnpm install && pnpm build

### 2. `todo` command on your PATH (optional, for manual use)

    npm link ./packages/core
    todo --version        # 0.1.0

### 3. MCP server (what Claude uses to read/write tasks)

    claude mcp add --scope user todo -- node <REPO>/packages/mcp/dist/index.js
    claude mcp list       # todo: … - ✔ Connected

`--scope user` makes it available in every project. Use `--scope project`
instead to register it for a single repo (writes `.mcp.json` there).

### 4. `/todo` skill (tells Claude when and how to use the tools)

    mkdir -p ~/.claude/skills
    ln -s <REPO>/packages/skill ~/.claude/skills/todo

A symlink, so pulling updates to the repo updates the skill.

### 5. Restart Claude Code and verify

Start a new session inside any git repo, then run `/todo list`. Claude should
call the `list_tasks` tool and answer with the tasks for that repo (empty at
first). `/mcp` shows the `todo` server as connected.

### Uninstall

    claude mcp remove --scope user todo
    rm ~/.claude/skills/todo
    npm unlink -g @todo/core

### After pulling changes

    pnpm install && pnpm build

The MCP registration and skill symlink point at the clone, so a rebuild is all
that is needed; restart Claude Code to pick up the new server binary.

DB: `~/.todo/todo.db` (`TODO_DB` overrides).

## Use

    todo add "Fix login redirect" -d "repro: ..." --due 2026-09-01
    todo list            # current repo only
    todo list --all
    todo status 3 in_progress
    todo done 3

## Develop

    pnpm test            # node --test, temp DBs
    pnpm typecheck
