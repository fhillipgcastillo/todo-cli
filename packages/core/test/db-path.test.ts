import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { resolveDbPath } from '../src/db-path.ts';

test('TODO_DB wins', () => {
  assert.equal(resolveDbPath({ TODO_DB: '/x/y.db' }), '/x/y.db');
});

test('defaults to ~/.todo/todo.db', () => {
  assert.equal(resolveDbPath({}), join(homedir(), '.todo', 'todo.db'));
});
