import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Task } from '@todo/core';
import { columns, locate, resolveSelection, moveSelection, truncate } from '../src/board-model.ts';

function task(id: number, status: Task['status'], parent: number | null = null): Task {
  return { id, project: 'p', title: `t${id}`, description: '', status, due: null, parent_id: parent, created_at: '', updated_at: '' };
}

const tasks = [task(1, 'backlog'), task(2, 'backlog'), task(3, 'in_progress'), task(4, 'done')];
const cols = columns(tasks);

test('columns groups by status in STATUSES order', () => {
  assert.deepEqual(Object.keys(cols), ['backlog', 'todo', 'in_progress', 'review', 'on_hold', 'done']);
  assert.deepEqual(cols.backlog.map((t) => t.id), [1, 2]);
  assert.deepEqual(cols.todo, []);
});

test('locate finds column and row', () => {
  assert.deepEqual(locate(cols, 3), { column: 2, row: 0 });
  assert.equal(locate(cols, 99), undefined);
});

test('resolveSelection keeps an existing id', () => {
  assert.equal(resolveSelection(cols, 2, 0, 1), 2);
});

test('resolveSelection falls back to nearest in the same column, then first task, then null', () => {
  assert.equal(resolveSelection(cols, 99, 0, 5), 2);
  assert.equal(resolveSelection(cols, 99, 1, 0), 1);
  assert.equal(resolveSelection(columns([]), 99, 0, 0), null);
  assert.equal(resolveSelection(cols, null, 0, 0), 1);
});

test('moveSelection by row clamps', () => {
  assert.equal(moveSelection(cols, 1, { row: 1 }), 2);
  assert.equal(moveSelection(cols, 2, { row: 1 }), 2);
  assert.equal(moveSelection(cols, 1, { row: -1 }), 1);
});

test('moveSelection by column skips empty columns and clamps at edges', () => {
  assert.equal(moveSelection(cols, 2, { column: 1 }), 3);
  assert.equal(moveSelection(cols, 3, { column: 1 }), 4);
  assert.equal(moveSelection(cols, 4, { column: 1 }), 4);
  assert.equal(moveSelection(cols, 3, { column: -1 }), 1);
});

test('moveSelection with no selection picks the first task', () => {
  assert.equal(moveSelection(cols, null, { row: 1 }), 1);
});

test('columns keeps subtasks under their parent within a column', () => {
  const grouped = columns([task(5, 'todo'), task(6, 'todo'), task(7, 'todo', 5)]);
  assert.deepEqual(grouped.todo.map((t) => t.id), [5, 7, 6]);
});

test('truncate pads and cuts', () => {
  assert.equal(truncate('abc', 5), 'abc  ');
  assert.equal(truncate('abcdefgh', 5), 'abcd…');
  assert.equal(truncate('abcde', 5), 'abcde');
});
