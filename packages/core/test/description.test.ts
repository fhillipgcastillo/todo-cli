import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDescription } from '../src/description.ts';

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
