# todo

Project-scoped task manager: a CLI + SQLite core, an MCP server for Claude
Code, and a `/todo` skill. Full product vision in `docs/VISION.md`; this MVP in
`docs/superpowers/specs/2026-08-27-todo-mvp-design.md`.

## Install

    pnpm install && pnpm build
    npm link ./packages/core                      # `todo` on PATH
    claude mcp add --scope user todo -- node $PWD/packages/mcp/dist/index.js
    ln -s $PWD/packages/skill ~/.claude/skills/todo

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
