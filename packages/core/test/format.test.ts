import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTable, renderTask } from '../src/format.ts';
import type { Task } from '../src/types.ts';

const task: Task = {
  id: 3, project: 'demo', title: 'Ship it', description: 'line one\nline two',
  status: 'in_progress', due: '2026-09-01', created_at: '2026-08-27T10:00:00.000Z', updated_at: '2026-08-27T11:00:00.000Z',
};

test('renderTable has a header and one row per task', () => {
  const out = renderTable([task, { ...task, id: 4, due: null, title: 'Other' }]);
  const lines = out.trimEnd().split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0]!, /ID\s+STATUS\s+DUE\s+TITLE/);
  assert.match(lines[1]!, /^3\s+in_progress\s+2026-09-01\s+Ship it$/);
  assert.match(lines[2]!, /^4\s+in_progress\s+-\s+Other$/);
});

test('renderTable on empty list says so', () => {
  assert.equal(renderTable([]), 'no tasks\n');
});

test('renderTask prints every field and the full description', () => {
  const out = renderTask(task);
  for (const s of ['#3', 'demo', 'Ship it', 'in_progress', '2026-09-01', 'line one\nline two']) {
    assert.ok(out.includes(s), `missing ${s}`);
  }
});
