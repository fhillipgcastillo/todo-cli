import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES, isStatus, NotFoundError, InvalidStatusError } from '../src/types.ts';

test('STATUSES lists the six statuses in board order', () => {
  assert.deepEqual([...STATUSES], ['backlog', 'todo', 'in_progress', 'review', 'on_hold', 'done']);
});

test('isStatus accepts known and rejects unknown', () => {
  assert.equal(isStatus('review'), true);
  assert.equal(isStatus('doing'), false);
});

test('errors carry useful messages', () => {
  assert.equal(new NotFoundError(7).message, 'task 7 not found');
  assert.equal(new InvalidStatusError('doing').message,
    'invalid status "doing" (expected one of: backlog, todo, in_progress, review, on_hold, done)');
});
