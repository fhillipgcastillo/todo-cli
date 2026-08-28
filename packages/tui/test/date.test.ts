import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDate } from '../src/date.ts';

test('isValidDate', () => {
  assert.equal(isValidDate('2026-09-01'), true);
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('26-09-01'), false);
  assert.equal(isValidDate(''), false);
});
