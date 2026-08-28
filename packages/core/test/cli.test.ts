import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tempDbPath } from './helpers.ts';

const CLI = resolve(import.meta.dirname, '../src/cli.ts');
let db: string;
let cwd: string;

function run(args: string[], input?: string) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: { ...process.env, TODO_DB: db, EDITOR: 'false' },
    input,
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

beforeEach(() => {
  db = tempDbPath();
  cwd = join(db, '..', 'proj-alpha');
  mkdirSync(cwd, { recursive: true });
});

test('add + list + show', () => {
  const add = run(['add', 'First task', '-d', 'details here', '--due', '2026-09-01']);
  assert.equal(add.code, 0, add.err);
  assert.match(add.out, /^added #1/);

  const list = run(['list']);
  assert.match(list.out, /1\s+backlog\s+2026-09-01\s+First task/);

  const show = run(['show', '1']);
  assert.ok(show.out.includes('details here'));
  assert.ok(show.out.includes('project: proj-alpha'));
});

test('description from stdin when -d omitted', () => {
  run(['add', 'Piped'], 'from stdin\n');
  assert.ok(run(['show', '1']).out.includes('from stdin'));
});

test('list scopes to current project unless --all / --project', () => {
  run(['add', 'mine']);
  run(['add', 'theirs', '--project', 'other']);
  assert.doesNotMatch(run(['list']).out, /theirs/);
  assert.match(run(['list', '--all']).out, /theirs/);
  assert.match(run(['list', '--project', 'other']).out, /theirs/);
});

test('status, done, edit, rm', () => {
  run(['add', 'flow']);
  assert.match(run(['status', '1', 'in_progress']).out, /in_progress/);
  assert.match(run(['list', '--status', 'in_progress']).out, /flow/);
  assert.match(run(['done', '1']).out, /done/);
  assert.match(run(['edit', '1', '--title', 'renamed', '-d', 'new body']).out, /renamed/);
  assert.ok(run(['show', '1']).out.includes('new body'));
  assert.equal(run(['rm', '1']).code, 0);
  assert.equal(run(['list']).out, 'no tasks\n');
});

test('--json prints records', () => {
  run(['add', 'j']);
  const parsed = JSON.parse(run(['list', '--json']).out);
  assert.equal(parsed[0].title, 'j');
  assert.equal(JSON.parse(run(['show', '1', '--json']).out).id, 1);
});

test('errors go to stderr with exit 1', () => {
  const missing = run(['show', '42']);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /task 42 not found/);
  run(['add', 'x']);
  const bad = run(['status', '1', 'doing']);
  assert.equal(bad.code, 1);
  assert.match(bad.err, /invalid status "doing"/);
});
