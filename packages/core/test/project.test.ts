import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectProject } from '../src/project.ts';

function scratch(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'todo-proj-')), name);
}

test('inside a git repo: repo root basename, even from a subdirectory', () => {
  const root = scratch('my-repo');
  mkdirSync(join(root, 'src', 'deep'), { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: root });
  assert.equal(detectProject(join(root, 'src', 'deep')), 'my-repo');
});

test('outside a git repo: cwd basename', () => {
  const dir = scratch('plain-dir');
  mkdirSync(dir, { recursive: true });
  assert.equal(detectProject(dir), 'plain-dir');
});
