export type Mode = 'board' | 'detail' | 'form' | 'confirm';

export type Action =
  | { type: 'column'; delta: -1 | 1 }
  | { type: 'row'; delta: -1 | 1 }
  | { type: 'shift'; delta: -1 | 1 }
  | { type: 'jump'; column: number }
  | { type: 'open' }
  | { type: 'back' }
  | { type: 'add' }
  | { type: 'edit' }
  | { type: 'editDescription' }
  | { type: 'delete' }
  | { type: 'reload' }
  | { type: 'help' }
  | { type: 'quit' };

export interface KeyInfo {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  ctrl?: boolean;
}

function sharedAction(input: string, key: KeyInfo): Action | undefined {
  if (key.ctrl && input === 'c') return { type: 'quit' };
  if (key.upArrow || input === 'k') return { type: 'row', delta: -1 };
  if (key.downArrow || input === 'j') return { type: 'row', delta: 1 };
  if (input === '[') return { type: 'shift', delta: -1 };
  if (input === ']') return { type: 'shift', delta: 1 };
  if (/^[1-6]$/.test(input)) return { type: 'jump', column: Number(input) - 1 };
  switch (input) {
    case 'e': return { type: 'edit' };
    case 'd': return { type: 'editDescription' };
    case 'x': return { type: 'delete' };
    case 'r': return { type: 'reload' };
    case '?': return { type: 'help' };
    case 'q': return { type: 'quit' };
    default: return undefined;
  }
}

function boardAction(input: string, key: KeyInfo): Action | undefined {
  if (key.leftArrow || input === 'h') return { type: 'column', delta: -1 };
  if (key.rightArrow || input === 'l') return { type: 'column', delta: 1 };
  if (key.return) return { type: 'open' };
  if (input === 'a') return { type: 'add' };
  return sharedAction(input, key);
}

function detailAction(input: string, key: KeyInfo): Action | undefined {
  if (key.escape) return { type: 'back' };
  return sharedAction(input, key);
}

export function keyToAction(mode: Mode, input: string, key: KeyInfo): Action | undefined {
  if (mode === 'board') return boardAction(input, key);
  if (mode === 'detail') return detailAction(input, key);
  return undefined;
}
