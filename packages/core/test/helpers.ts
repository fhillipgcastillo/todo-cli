import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'todo-test-')), 'todo.db');
}
