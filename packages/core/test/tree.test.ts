import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtaskProgress, treeOrder } from '../src/tree.ts';
import type { Status, Task } from '../src/types.ts';

function task(id: number, parent: number | null = null, status: Status = 'todo'): Task {
  return { id, parent_id: parent, status, project: 'p', title: `t${id}`, description: '', due: null, created_at: '', updated_at: '' };
}

test('treeOrder places subtasks after their parent, then by id', () => {
  const order = treeOrder([task(9, 5), task(6), task(5), task(7, 5)]).map((t) => t.id);
  assert.deepEqual(order, [5, 7, 9, 6]);
});

test('treeOrder falls back to own id when the parent is not in the set', () => {
  const order = treeOrder([task(9, 5), task(6), task(8)]).map((t) => t.id);
  assert.deepEqual(order, [6, 8, 9]);
});

test('subtaskProgress counts done over total subtasks of the id', () => {
  const tasks = [task(1), task(2, 1, 'done'), task(3, 1), task(4)];
  assert.deepEqual(subtaskProgress(tasks, 1), { done: 1, total: 2 });
  assert.deepEqual(subtaskProgress(tasks, 4), { done: 0, total: 0 });
});
