import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TaskStore } from '../src/store.ts';
import { NotFoundError, InvalidStatusError } from '../src/types.ts';
import { tempDbPath } from './helpers.ts';

let store: TaskStore;
let path: string;

beforeEach(() => {
  path = tempDbPath();
  store = TaskStore.open(path);
});
afterEach(() => store.close());

test('open creates the file and schema', () => {
  assert.equal(existsSync(path), true);
  assert.deepEqual(store.list({ all: true }), []);
});

test('add returns a backlog task with timestamps', () => {
  const t = store.add({ project: 'p1', title: 'first' });
  assert.equal(t.id, 1);
  assert.equal(t.status, 'backlog');
  assert.equal(t.description, '');
  assert.equal(t.due, null);
  assert.match(t.created_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(t.updated_at, t.created_at);
});

test('add stores description and due', () => {
  const t = store.add({ project: 'p1', title: 'x', description: 'long\ntext', due: '2026-09-01' });
  assert.equal(store.get(t.id)?.description, 'long\ntext');
  assert.equal(store.get(t.id)?.due, '2026-09-01');
});

test('list filters by project, status, all', () => {
  store.add({ project: 'a', title: '1' });
  const b = store.add({ project: 'b', title: '2' });
  store.setStatus(b.id, 'done');
  assert.equal(store.list({ project: 'a' }).length, 1);
  assert.equal(store.list({ project: 'b', status: 'done' }).length, 1);
  assert.equal(store.list({ project: 'b', status: 'todo' }).length, 0);
  assert.equal(store.list({ all: true }).length, 2);
  assert.equal(store.list().length, 2);
});

test('list orders by id ascending', () => {
  store.add({ project: 'a', title: 'one' });
  store.add({ project: 'a', title: 'two' });
  assert.deepEqual(store.list({ project: 'a' }).map((t) => t.title), ['one', 'two']);
});

test('update patches fields and bumps updated_at', async () => {
  const t = store.add({ project: 'a', title: 'old' });
  await new Promise((r) => setTimeout(r, 5));
  const u = store.update(t.id, { title: 'new', due: '2026-10-01' });
  assert.equal(u.title, 'new');
  assert.equal(u.due, '2026-10-01');
  assert.equal(u.description, '');
  assert.notEqual(u.updated_at, t.updated_at);
});

test('update with due null clears it', () => {
  const t = store.add({ project: 'a', title: 'x', due: '2026-10-01' });
  assert.equal(store.update(t.id, { due: null }).due, null);
});

test('setStatus validates', () => {
  const t = store.add({ project: 'a', title: 'x' });
  assert.equal(store.setStatus(t.id, 'in_progress').status, 'in_progress');
  assert.throws(() => store.setStatus(t.id, 'doing'), InvalidStatusError);
});

test('remove deletes; missing ids throw NotFoundError', () => {
  const t = store.add({ project: 'a', title: 'x' });
  store.remove(t.id);
  assert.equal(store.get(t.id), undefined);
  assert.throws(() => store.remove(t.id), NotFoundError);
  assert.throws(() => store.update(99, { title: 'y' }), NotFoundError);
  assert.throws(() => store.setStatus(99, 'done'), NotFoundError);
});

test('reopening keeps data', () => {
  store.add({ project: 'a', title: 'persist' });
  store.close();
  store = TaskStore.open(path);
  assert.equal(store.list({ all: true })[0]?.title, 'persist');
});
