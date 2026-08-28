import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.TODO_DB || join(homedir(), '.todo', 'todo.db');
}
