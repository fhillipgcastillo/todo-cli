import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { TaskStore } from '../src/store.ts';
import { NotFoundError, InvalidStatusError, InvalidParentError } from '../src/types.ts';
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

test('projects returns distinct names sorted', () => {
  store.add({ project: 'beta', title: '1' });
  store.add({ project: 'alpha', title: '2' });
  store.add({ project: 'beta', title: '3' });
  assert.deepEqual(store.projects(), ['alpha', 'beta']);
});

test('projects is empty on a fresh store', () => {
  assert.deepEqual(store.projects(), []);
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

test('dataVersion is stable across own reads', () => {
  const a = store.dataVersion();
  store.list({ all: true });
  assert.equal(store.dataVersion(), a);
});

test('dataVersion changes after another connection writes', () => {
  const before = store.dataVersion();
  const other = TaskStore.open(path);
  other.add({ project: 'a', title: 'remote' });
  other.close();
  assert.notEqual(store.dataVersion(), before);
});

test('busy_timeout is set', () => {
  const other = TaskStore.open(path);
  try {
    other.add({ project: 'a', title: 'x' });
    store.add({ project: 'a', title: 'y' });
    assert.equal(store.list({ all: true }).length, 2);
  } finally {
    other.close();
  }
});

test('add with parentId inherits the parent project', () => {
  const parent = store.add({ project: 'alpha', title: 'parent' });
  const sub = store.add({ project: 'ignored', title: 'sub', parentId: parent.id });
  assert.equal(sub.parent_id, parent.id);
  assert.equal(sub.project, 'alpha');
});

test('rejects a subtask as parent (one level deep)', () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  const sub = store.add({ project: 'p', title: 'sub', parentId: parent.id });
  assert.throws(() => store.add({ project: 'p', title: 'x', parentId: sub.id }), InvalidParentError);
});

test('rejects attaching a task that has subtasks, and self-parenting', () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  store.add({ project: 'p', title: 'sub', parentId: parent.id });
  const other = store.add({ project: 'p', title: 'other' });
  assert.throws(() => store.update(parent.id, { parentId: other.id }), InvalidParentError);
  assert.throws(() => store.update(other.id, { parentId: other.id }), InvalidParentError);
});

test('rejects a missing parent and a cross-project re-parent', () => {
  assert.throws(() => store.add({ project: 'p', title: 'x', parentId: 999 }), NotFoundError);
  const parent = store.add({ project: 'p', title: 'parent' });
  const foreign = store.add({ project: 'q', title: 'foreign' });
  assert.throws(() => store.update(foreign.id, { parentId: parent.id }), InvalidParentError);
});

test('update can attach and detach; omitting parentId keeps it', () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  const task = store.add({ project: 'p', title: 'task' });
  assert.equal(store.update(task.id, { parentId: parent.id }).parent_id, parent.id);
  assert.equal(store.update(task.id, { title: 'renamed' }).parent_id, parent.id);
  assert.equal(store.update(task.id, { parentId: null }).parent_id, null);
});

test('subtasks() lists children; list({parentId}) filters', () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  const a = store.add({ project: 'p', title: 'a', parentId: parent.id });
  const b = store.add({ project: 'p', title: 'b', parentId: parent.id });
  assert.deepEqual(store.subtasks(parent.id).map((t) => t.id), [a.id, b.id]);
  assert.deepEqual(store.list({ project: 'p', parentId: parent.id }).map((t) => t.id), [a.id, b.id]);
});

test('remove cascades to subtasks and returns the count', () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  store.add({ project: 'p', title: 'a', parentId: parent.id });
  store.add({ project: 'p', title: 'b', parentId: parent.id });
  const keep = store.add({ project: 'p', title: 'keep' });
  assert.equal(store.remove(parent.id), 3);
  assert.deepEqual(store.list({ project: 'p' }).map((t) => t.id), [keep.id]);
});

test('migrates a v1 database in place', () => {
  const v1path = tempDbPath();
  const db = new DatabaseSync(v1path);
  db.exec(`CREATE TABLE schema_version (version INTEGER NOT NULL);
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, project TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'backlog',
      due TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO schema_version (version) VALUES (1);
    INSERT INTO tasks (project, title, created_at, updated_at) VALUES ('p', 'old', 't', 't');`);
  db.close();
  const migrated = TaskStore.open(v1path);
  try {
    const [task] = migrated.list({ project: 'p' });
    assert.equal(task!.parent_id, null);
    const sub = migrated.add({ project: 'p', title: 'sub', parentId: task!.id });
    assert.equal(sub.parent_id, task!.id);
  } finally {
    migrated.close();
  }
});

test('reopening keeps data', () => {
  store.add({ project: 'a', title: 'persist' });
  store.close();
  store = TaskStore.open(path);
  assert.equal(store.list({ all: true })[0]?.title, 'persist');
});
