#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { render } from 'ink';
import { TaskStore, detectProject, resolveDbPath } from '@todo/core';
import { App } from './app.tsx';

const USAGE = `usage: todo-tui [--project <name>] [--all] [--db <path>] [--interval <ms>]

  --project <name>  show this project instead of the one detected from cwd
  --all             show every project
  --db <path>       SQLite file (default: $TODO_DB or ~/.todo/todo.db)
  --interval <ms>   poll interval for live updates (default: 250)
  --version, --help
`;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    all: { type: 'boolean', default: false },
    db: { type: 'string' },
    interval: { type: 'string', default: '250' },
    version: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) { process.stdout.write(USAGE); process.exit(0); }
if (values.version) { process.stdout.write('0.1.0\n'); process.exit(0); }
if (!process.stdout.isTTY || !process.stdin.isTTY) fail('todo-tui needs an interactive terminal');

const intervalMs = Number(values.interval);
if (!Number.isInteger(intervalMs) || intervalMs < 50) fail('--interval must be an integer ≥ 50');

let store: TaskStore;
try {
  store = TaskStore.open(values.db ?? resolveDbPath());
} catch (error) {
  fail((error as Error).message);
}

const project = values.project ?? detectProject(process.cwd());
const instance = render(<App store={store} project={project} all={values.all} intervalMs={intervalMs} />);
await instance.waitUntilExit();
store.close();
