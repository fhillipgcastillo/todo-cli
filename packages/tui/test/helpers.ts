import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'todo-tui-test-')), 'todo.db');
}

export function tick(ms = 60): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
