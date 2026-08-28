import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface DescriptionSource {
  /** Value of -d/--description when given */
  flag?: string;
  stdinIsTTY: boolean;
  readStdin: () => string;
  openEditor: () => string;
}

export function readDescription(src: DescriptionSource): string | undefined {
  if (src.flag !== undefined) return src.flag;
  const raw = src.stdinIsTTY ? src.openEditor() : src.readStdin();
  const text = raw.trim();
  return text === '' ? undefined : text;
}

function openEditor(): string {
  const dir = mkdtempSync(join(tmpdir(), 'todo-edit-'));
  const file = join(dir, 'DESCRIPTION.md');
  writeFileSync(file, '');
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  spawnSync(editor, [file], { stdio: 'inherit', shell: true });
  const text = readFileSync(file, 'utf8');
  rmSync(dir, { recursive: true, force: true });
  return text;
}

export function stdinSource(flag?: string): DescriptionSource {
  return {
    flag,
    stdinIsTTY: process.stdin.isTTY === true,
    readStdin: () => readFileSync(0, 'utf8'),
    openEditor,
  };
}
