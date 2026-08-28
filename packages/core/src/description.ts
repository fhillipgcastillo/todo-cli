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

export class EditorFailedError extends Error {
  code: number | null;
  constructor(code: number | null) {
    super(code === null ? 'editor could not be started' : `editor exited with ${code}`);
    this.name = 'EditorFailedError';
    this.code = code;
  }
}

/** Opens $VISUAL / $EDITOR / vi on a temp file seeded with `initial`; returns its final contents */
export function openEditor(initial: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'todo-edit-'));
  const file = join(dir, 'DESCRIPTION.md');
  writeFileSync(file, initial);
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  try {
    const result = spawnSync(editor, [file], { stdio: 'inherit', shell: true });
    if (result.status !== 0) throw new EditorFailedError(result.status);
    return readFileSync(file, 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function stdinSource(flag?: string): DescriptionSource {
  return {
    flag,
    stdinIsTTY: process.stdin.isTTY === true,
    readStdin: () => readFileSync(0, 'utf8'),
    openEditor: () => openEditor(''),
  };
}
