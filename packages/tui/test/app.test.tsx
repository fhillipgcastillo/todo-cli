import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink-testing-library';
import { TaskStore } from '@todo/core';
import { App } from '../src/app.tsx';
import { tempDbPath, tick } from './helpers.ts';

let path: string;
let store: TaskStore;

beforeEach(() => {
  path = tempDbPath();
  store = TaskStore.open(path);
});
afterEach(() => store.close());

function mount(all = false) {
  return render(<App store={store} project="p" all={all} intervalMs={20} />);
}

test('renders the six columns with counts', async () => {
  store.add({ project: 'p', title: 'first' });
  const r = mount();
  await tick();
  const frame = r.lastFrame()!;
  for (const name of ['backlog', 'todo', 'in_progress', 'review', 'on_hold', 'done']) assert.match(frame, new RegExp(name));
  assert.equal(frame.match(/\(1\)/g)?.length, 1);
  assert.equal(frame.match(/\(0\)/g)?.length, 5);
  assert.match(frame, /#1 first/);
  assert.match(frame, /project: p/);
  assert.match(frame, /● live/);
  r.unmount();
});

test('loading tasks does not re-render in a loop', async () => {
  for (let i = 0; i < 6; i++) store.add({ project: 'p', title: `t${i}` });
  let calls = 0;
  const list = store.list.bind(store);
  store.list = (filter) => { calls++; return list(filter); };
  const r = render(<App store={store} project="p" all={true} intervalMs={100000} />);
  await tick(300);
  r.unmount();
  assert.ok(calls <= 2, `store.list() called ${calls} times`);
});

test('terminal resize re-lays out the columns without input', async () => {
  store.add({ project: 'p', title: 'first' });
  const r = mount();
  await tick();
  const widthOf = (frame: string) => Math.max(...frame.split('\n').map((l) => l.length));
  assert.ok(widthOf(r.lastFrame()!) > 60);
  Object.defineProperty(r.stdout, 'columns', { value: 60, configurable: true });
  r.stdout.emit('resize');
  await tick();
  assert.ok(widthOf(r.lastFrame()!) <= 60, `frame is ${widthOf(r.lastFrame()!)} wide`);
  r.unmount();
});

test('hides other projects unless all', async () => {
  store.add({ project: 'other', title: 'elsewhere' });
  const r = mount();
  await tick();
  assert.doesNotMatch(r.lastFrame()!, /elsewhere/);
  r.unmount();
  const r2 = mount(true);
  await tick();
  assert.match(r2.lastFrame()!, /elsewhere/);
  assert.match(r2.lastFrame()!, /\[other\]/);
  r2.unmount();
});

test('a write from another connection shows up without input', async () => {
  const r = mount();
  await tick();
  const remote = TaskStore.open(path);
  remote.add({ project: 'p', title: 'from ai' });
  remote.close();
  await tick(100);
  assert.match(r.lastFrame()!, /from ai/);
  r.unmount();
});

test('navigation moves the selection marker', async () => {
  store.add({ project: 'p', title: 'one' });
  store.add({ project: 'p', title: 'two' });
  const t3 = store.add({ project: 'p', title: 'three' });
  store.setStatus(t3.id, 'done');
  const r = mount();
  await tick();
  assert.match(r.lastFrame()!, />#1 one/);
  r.stdin.write('j');
  await tick();
  assert.match(r.lastFrame()!, />#2 two/);
  r.stdin.write('l');
  await tick();
  assert.match(r.lastFrame()!, />#3 three/);
  r.stdin.write('h');
  await tick();
  assert.match(r.lastFrame()!, />#1 one/);
  r.unmount();
});

test('selection survives a reload and falls back when its task is deleted remotely', async () => {
  store.add({ project: 'p', title: 'one' });
  const t2 = store.add({ project: 'p', title: 'two' });
  const r = mount();
  await tick();
  r.stdin.write('j');
  await tick();
  assert.match(r.lastFrame()!, />#2 two/);
  const remote = TaskStore.open(path);
  remote.add({ project: 'p', title: 'three' });
  await tick(100);
  assert.match(r.lastFrame()!, />#2 two/);
  remote.remove(t2.id);
  remote.close();
  await tick(100);
  assert.match(r.lastFrame()!, />#3 three/);
  r.unmount();
});

const ESC = '\x1b';

test('[ and ] move the selected task between columns; edges are no-ops', async () => {
  const t = store.add({ project: 'p', title: 'mover' });
  const r = mount();
  await tick();
  r.stdin.write('[');
  await tick();
  assert.equal(store.get(t.id)!.status, 'backlog');
  r.stdin.write(']');
  await tick();
  assert.equal(store.get(t.id)!.status, 'todo');
  assert.match(r.lastFrame()!, /todo \(1\)/);
  r.stdin.write('6');
  await tick();
  assert.equal(store.get(t.id)!.status, 'done');
  r.stdin.write(']');
  await tick();
  assert.equal(store.get(t.id)!.status, 'done');
  r.unmount();
});

test('acting on a task deleted remotely shows a message and does not crash', async () => {
  const t = store.add({ project: 'p', title: 'gone soon' });
  const r = mount();
  await tick();
  const remote = TaskStore.open(path);
  remote.remove(t.id);
  remote.close();
  r.stdin.write(']');
  await tick();
  assert.match(r.lastFrame()!, /task #1 no longer exists/);
  await tick(100);
  assert.doesNotMatch(r.lastFrame()!, /gone soon/);
  r.unmount();
});

test('enter opens detail, esc returns', async () => {
  store.add({ project: 'p', title: 'detailed', description: 'line one\nline two', due: '2026-09-01' });
  const r = mount();
  await tick();
  r.stdin.write('\r');
  await tick();
  const frame = r.lastFrame()!;
  assert.match(frame, /#1 detailed/);
  assert.match(frame, /status: {2}backlog/);
  assert.match(frame, /due: {5}2026-09-01/);
  assert.match(frame, /line two/);
  assert.doesNotMatch(frame, /in_progress/);
  r.stdin.write(ESC);
  await tick();
  assert.match(r.lastFrame()!, /in_progress/);
  r.unmount();
});

test('] works from detail and keeps the detail open', async () => {
  const t = store.add({ project: 'p', title: 'detailed' });
  const r = mount();
  await tick();
  r.stdin.write('\r');
  await tick();
  r.stdin.write(']');
  await tick();
  assert.equal(store.get(t.id)!.status, 'todo');
  assert.match(r.lastFrame()!, /status: {2}todo/);
  r.unmount();
});

const DEL = '\x7f';

async function press(r: ReturnType<typeof mount>, keys: string[]) {
  for (const key of keys) {
    r.stdin.write(key);
    await tick(20);
  }
  await tick();
}

test('a opens the add form; enter creates a backlog task in the project', async () => {
  const r = mount();
  await tick();
  r.stdin.write('a');
  await tick();
  assert.match(r.lastFrame()!, /add task · project: p/);
  r.stdin.write('new one');
  await tick();
  r.stdin.write('\t');
  await tick();
  r.stdin.write('2026-09-30');
  await tick();
  r.stdin.write('\r');
  await tick();
  const [task] = store.list({ project: 'p' });
  assert.equal(task!.title, 'new one');
  assert.equal(task!.due, '2026-09-30');
  assert.equal(task!.status, 'backlog');
  assert.match(r.lastFrame()!, /backlog \(1\)/);
  r.unmount();
});

test('add form rejects an empty title and a bad date', async () => {
  const r = mount();
  await tick();
  r.stdin.write('a');
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.match(r.lastFrame()!, /title is required/);
  r.stdin.write('x');
  await tick();
  r.stdin.write('\t');
  await tick();
  r.stdin.write('2026-02-30');
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.match(r.lastFrame()!, /due must be YYYY-MM-DD/);
  assert.equal(store.list({ project: 'p' }).length, 0);
  r.stdin.write(ESC);
  await tick();
  assert.match(r.lastFrame()!, /backlog \(0\)/);
  r.unmount();
});

test('e edits title and due of the selected task', async () => {
  const t = store.add({ project: 'p', title: 'old', due: '2026-01-01' });
  const r = mount();
  await tick();
  r.stdin.write('e');
  await tick();
  assert.match(r.lastFrame()!, /edit #1/);
  await press(r, [DEL, DEL, DEL, 'new', '\t', ...Array(10).fill(DEL), '\r']);
  await tick();
  const updated = store.get(t.id)!;
  assert.equal(updated.title, 'new');
  assert.equal(updated.due, null);
  r.unmount();
});

test('x asks for confirmation; n keeps, y deletes', async () => {
  const t = store.add({ project: 'p', title: 'doomed' });
  const r = mount();
  await tick();
  r.stdin.write('x');
  await tick();
  assert.match(r.lastFrame()!, /delete #1 "doomed"\? y\/n/);
  r.stdin.write('n');
  await tick();
  assert.ok(store.get(t.id));
  assert.match(r.lastFrame()!, /backlog \(1\)/);
  r.stdin.write('x');
  await tick();
  r.stdin.write('y');
  await tick();
  assert.equal(store.get(t.id), undefined);
  assert.match(r.lastFrame()!, /backlog \(0\)/);
  r.unmount();
});

test('board marks subtasks and shows parent progress', async () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  const sub = store.add({ project: 'p', title: 'child', parentId: parent.id });
  store.add({ project: 'p', title: 'child2', parentId: parent.id });
  store.setStatus(sub.id, 'done');
  const r = mount();
  await tick();
  const frame = r.lastFrame()!;
  assert.match(frame, /↳#3 child2/);
  assert.match(frame, /1\/2/);
  r.unmount();
});

test('s opens the subtask form and creates a subtask of the selection', async () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  const r = mount();
  await tick();
  r.stdin.write('s');
  await tick();
  assert.match(r.lastFrame()!, /add subtask of #1 · project: p/);
  r.stdin.write('child');
  await tick();
  r.stdin.write('\r');
  await tick();
  const created = store.list({ project: 'p', parentId: parent.id });
  assert.equal(created.length, 1);
  assert.equal(created[0]!.title, 'child');
  r.unmount();
});

test('s on a subtask creates a sibling under the same parent', async () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  store.add({ project: 'p', title: 'child', parentId: parent.id });
  const r = mount();
  await tick();
  r.stdin.write('j');
  await tick();
  assert.match(r.lastFrame()!, />↳#2 child/);
  r.stdin.write('s');
  await tick();
  assert.match(r.lastFrame()!, /add subtask of #1/);
  r.stdin.write('sibling');
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.equal(store.subtasks(parent.id).length, 2);
  r.unmount();
});

test('deleting a parent warns about its subtasks and cascades', async () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  store.add({ project: 'p', title: 'child', parentId: parent.id });
  const r = mount();
  await tick();
  r.stdin.write('x');
  await tick();
  assert.match(r.lastFrame()!, /delete #1 "parent" and 1 subtasks\? y\/n/);
  r.stdin.write('y');
  await tick();
  assert.equal(store.list({ project: 'p' }).length, 0);
  r.unmount();
});

test('detail shows the parent line on a subtask and the subtasks list on a parent', async () => {
  const parent = store.add({ project: 'p', title: 'parent' });
  store.add({ project: 'p', title: 'child', parentId: parent.id });
  const r = mount();
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.match(r.lastFrame()!, /subtasks \(0\/1\):/);
  assert.match(r.lastFrame()!, /\[backlog\] #2 child/);
  r.stdin.write(ESC);
  await tick();
  r.stdin.write('j');
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.match(r.lastFrame()!, /parent: {2}#1 parent/);
  r.unmount();
});

function withEditor(script: string, fn: () => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'todo-tui-editor-'));
  const file = join(dir, 'editor.sh');
  writeFileSync(file, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  const saved = { VISUAL: process.env.VISUAL, EDITOR: process.env.EDITOR };
  delete process.env.VISUAL;
  process.env.EDITOR = file;
  return fn().finally(() => {
    if (saved.VISUAL !== undefined) process.env.VISUAL = saved.VISUAL;
    if (saved.EDITOR === undefined) delete process.env.EDITOR; else process.env.EDITOR = saved.EDITOR;
  });
}

test('add form captures the description via $EDITOR and creates the task atomically', async () => {
  await withEditor('printf "from editor" >> "$1"', async () => {
    const r = mount();
    await tick();
    await press(r, ['a', 'titled', '\t', '\t']);
    assert.match(r.lastFrame()!, /description: \(none\)/);
    r.stdin.write('\r');
    await tick();
    assert.equal(store.list({ project: 'p' }).length, 0);
    assert.match(r.lastFrame()!, /description: 1 line/);
    await press(r, ['\t', '\r']);
    const [task] = store.list({ project: 'p' });
    assert.equal(task!.title, 'titled');
    assert.equal(task!.description, 'from editor');
    r.unmount();
  });
});

test('edit form seeds the current description into $EDITOR and saves on submit', async () => {
  const t = store.add({ project: 'p', title: 'described', description: 'first' });
  await withEditor('printf "\\nsecond" >> "$1"', async () => {
    const r = mount();
    await tick();
    await press(r, ['e', '\t', '\t', '\r']);
    assert.equal(store.get(t.id)!.description, 'first');
    await press(r, ['\t', '\r']);
    assert.equal(store.get(t.id)!.description, 'first\nsecond');
    r.unmount();
  });
});

test('esc cancels the form and discards the edited description', async () => {
  const t = store.add({ project: 'p', title: 'described', description: 'first' });
  await withEditor('printf "\\nsecond" >> "$1"', async () => {
    const r = mount();
    await tick();
    await press(r, ['e', '\t', '\t', '\r']);
    assert.match(r.lastFrame()!, /description: 2 lines/);
    r.stdin.write(ESC);
    await tick();
    assert.equal(store.get(t.id)!.description, 'first');
    assert.match(r.lastFrame()!, /backlog \(1\)/);
    r.unmount();
  });
});

test('a failing $EDITOR inside the form keeps the previous description and reports it', async () => {
  store.add({ project: 'p', title: 'described', description: 'first' });
  await withEditor('exit 2', async () => {
    const r = mount();
    await tick();
    await press(r, ['e', '\t', '\t', '\r']);
    assert.match(r.lastFrame()!, /editor exited with 2/);
    assert.match(r.lastFrame()!, /description: 1 line/);
    r.unmount();
  });
});

test('d opens $EDITOR on the description and saves the result', async () => {
  const t = store.add({ project: 'p', title: 'described', description: 'first' });
  await withEditor('printf "\\nsecond" >> "$1"', async () => {
    const r = mount();
    await tick();
    r.stdin.write('d');
    await tick();
    assert.equal(store.get(t.id)!.description, 'first\nsecond');
    assert.match(r.lastFrame()!, /● live/);
    r.unmount();
  });
});

test('a failing $EDITOR leaves the description untouched and reports it', async () => {
  const t = store.add({ project: 'p', title: 'described', description: 'first' });
  await withEditor('exit 2', async () => {
    const r = mount();
    await tick();
    r.stdin.write('d');
    await tick();
    assert.equal(store.get(t.id)!.description, 'first');
    assert.match(r.lastFrame()!, /editor exited with 2; description unchanged/);
    r.unmount();
  });
});

test('long columns scroll with the selection and show overflow counts', async () => {
  for (let i = 0; i < 20; i++) store.add({ project: 'p', title: `t${i + 1}` });
  const r = mount();
  await tick();
  assert.match(r.lastFrame()!, /↓ 4 more/);
  assert.doesNotMatch(r.lastFrame()!, /#20/);
  for (let i = 0; i < 19; i++) {
    r.stdin.write('j');
    await tick(20);
  }
  await tick();
  assert.match(r.lastFrame()!, />#20 t20/);
  assert.match(r.lastFrame()!, /↑ 4 more/);
  assert.doesNotMatch(r.lastFrame()!, /↓ \d+ more/);
  r.unmount();
});

test('board help is visible by default and ? toggles it', async () => {
  const r = mount();
  await tick();
  assert.match(r.lastFrame()!, /\[ \] move/);
  r.stdin.write('?');
  await tick();
  assert.doesNotMatch(r.lastFrame()!, /\[ \] move/);
  r.stdin.write('?');
  await tick();
  assert.match(r.lastFrame()!, /\[ \] move/);
  r.unmount();
});

test('detail shows its key help by default and ? toggles it', async () => {
  store.add({ project: 'p', title: 'detailed' });
  const r = mount();
  await tick();
  r.stdin.write('\r');
  await tick();
  assert.match(r.lastFrame()!, /e edit {2}d description/);
  assert.match(r.lastFrame()!, /esc back/);
  r.stdin.write('?');
  await tick();
  assert.doesNotMatch(r.lastFrame()!, /e edit/);
  r.unmount();
});
