import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

export function detectProject(cwd: string): string {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    return basename(root);
  } catch {
    return basename(cwd);
  }
}
