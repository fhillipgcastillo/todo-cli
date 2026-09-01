import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from 'ink-testing-library';
import { Picker } from '../src/picker.tsx';
import { tick } from './helpers.ts';

const projects = ['alpha', 'beta', 'gamma'];

test('lists all projects first and highlights the current project', async () => {
  const { lastFrame, unmount } = render(
    <Picker projects={projects} current="beta" onSelect={() => {}} onCancel={() => {}} />,
  );
  await tick();
  const frame = lastFrame()!;
  assert.match(frame, /all projects[\s\S]*alpha[\s\S]*beta[\s\S]*gamma/);
  assert.match(frame, /❯ beta/);
  assert.doesNotMatch(frame, /❯ alpha/);
  unmount();
});

test('highlights all projects when current is null', async () => {
  const { lastFrame, unmount } = render(
    <Picker projects={projects} current={null} onSelect={() => {}} onCancel={() => {}} />,
  );
  await tick();
  assert.match(lastFrame()!, /❯ all projects/);
  unmount();
});

test('enter selects the highlighted project', async () => {
  let picked: string | null | undefined;
  const { stdin, unmount } = render(
    <Picker projects={projects} current="alpha" onSelect={(p) => { picked = p; }} onCancel={() => {}} />,
  );
  await tick();
  stdin.write('j');
  await tick();
  stdin.write('\r');
  await tick();
  assert.equal(picked, 'beta');
  unmount();
});

test('moving above the first entry selects all projects (null)', async () => {
  let picked: string | null | undefined;
  const { stdin, unmount } = render(
    <Picker projects={projects} current="alpha" onSelect={(p) => { picked = p; }} onCancel={() => {}} />,
  );
  await tick();
  stdin.write('k');
  await tick();
  stdin.write('\r');
  await tick();
  assert.equal(picked, null);
  unmount();
});

test('movement clamps at both ends', async () => {
  let picked: string | null | undefined;
  const { stdin, unmount } = render(
    <Picker projects={projects} current={null} onSelect={(p) => { picked = p; }} onCancel={() => {}} />,
  );
  await tick();
  stdin.write('k');
  await tick();
  for (let i = 0; i < 6; i++) {
    stdin.write('j');
    await tick();
  }
  stdin.write('\r');
  await tick();
  assert.equal(picked, 'gamma');
  unmount();
});

test('escape cancels without selecting', async () => {
  let cancelled = false;
  let picked = false;
  const { stdin, unmount } = render(
    <Picker projects={projects} current={null} onSelect={() => { picked = true; }} onCancel={() => { cancelled = true; }} />,
  );
  await tick();
  stdin.write('');
  await tick();
  assert.equal(cancelled, true);
  assert.equal(picked, false);
  unmount();
});
