import type { Status } from '@todo/core';

/** Border and text accent per status */
export const ACCENTS: Record<Status, string> = {
  backlog: 'gray',
  todo: 'blue',
  in_progress: 'yellow',
  review: 'magenta',
  on_hold: 'cyan',
  done: 'green',
};

/** Column title-bar background per status */
export const BAR_COLORS: Record<Status, string> = {
  backlog: 'gray',
  todo: 'blue',
  in_progress: '#7a5c00',
  review: '#6e4b78',
  on_hold: '#3d6b6b',
  done: 'green',
};
