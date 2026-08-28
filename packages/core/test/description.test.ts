import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDescription, openEditor, EditorFailedError } from '../src/description.ts';

function withEditor(script: string, fn: () => void) {
  const dir = mkdtempSync(join(tmpdir(), 'todo-editor-'));
  const file = join(dir, 'editor.sh');
  writeFileSync(file, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  const saved = { VISUAL: process.env.VISUAL, EDITOR: process.env.EDITOR };
  delete process.env.VISUAL;
  process.env.EDITOR = file;
  try {
    fn();
  } finally {
    if (saved.VISUAL !== undefined) process.env.VISUAL = saved.VISUAL;
    if (saved.EDITOR === undefined) delete process.env.EDITOR; else process.env.EDITOR = saved.EDITOR;
  }
}

test('openEditor seeds the file and returns the edited text', () => {
  withEditor('printf " more" >> "$1"', () => {
    assert.equal(openEditor('initial'), 'initial more');
  });
});

test('openEditor throws EditorFailedError on non-zero exit', () => {
  withEditor('exit 3', () => {
    assert.throws(() => openEditor('x'), (e: unknown) => e instanceof EditorFailedError && e.code === 3);
  });
});

const never = () => { throw new Error('should not be called'); };

test('flag wins', () => {
  assert.equal(readDescription({ flag: 'from flag', stdinIsTTY: false, readStdin: never, openEditor: never }), 'from flag');
});

test('piped stdin is used when no flag', () => {
  assert.equal(readDescription({ stdinIsTTY: false, readStdin: () => 'piped\n', openEditor: never }), 'piped');
});

test('interactive: editor is used', () => {
  assert.equal(readDescription({ stdinIsTTY: true, readStdin: never, openEditor: () => 'edited\n' }), 'edited');
});

test('empty editor result means undefined', () => {
  assert.equal(readDescription({ stdinIsTTY: true, readStdin: never, openEditor: () => '  \n' }), undefined);
});
