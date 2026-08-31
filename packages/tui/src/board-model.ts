import { STATUSES, treeOrder, type Status, type Task } from '@todo/core';

export type Columns = Record<Status, Task[]>;

export function columns(tasks: Task[]): Columns {
  const cols = Object.fromEntries(STATUSES.map((s) => [s, [] as Task[]])) as Columns;
  for (const task of treeOrder(tasks)) cols[task.status].push(task);
  return cols;
}

function columnTasks(cols: Columns, column: number): Task[] {
  return cols[STATUSES[column]!]!;
}

export function locate(cols: Columns, id: number): { column: number; row: number } | undefined {
  for (let column = 0; column < STATUSES.length; column++) {
    const row = columnTasks(cols, column).findIndex((t) => t.id === id);
    if (row !== -1) return { column, row };
  }
  return undefined;
}

function firstTask(cols: Columns): number | null {
  for (const status of STATUSES) {
    const first = cols[status][0];
    if (first) return first.id;
  }
  return null;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

export function resolveSelection(cols: Columns, selectedId: number | null, lastColumn: number, lastRow: number): number | null {
  if (selectedId !== null && locate(cols, selectedId)) return selectedId;
  const tasks = columnTasks(cols, clamp(lastColumn, STATUSES.length - 1));
  if (tasks.length > 0) return tasks[clamp(lastRow, tasks.length - 1)]!.id;
  return firstTask(cols);
}

function nextNonEmptyColumn(cols: Columns, from: number, delta: -1 | 1): number {
  for (let column = from + delta; column >= 0 && column < STATUSES.length; column += delta) {
    if (columnTasks(cols, column).length > 0) return column;
  }
  return from;
}

export function moveSelection(
  cols: Columns,
  selectedId: number | null,
  delta: { column?: -1 | 1; row?: -1 | 1 },
): number | null {
  const at = selectedId === null ? undefined : locate(cols, selectedId);
  if (!at) return firstTask(cols);
  const column = delta.column ? nextNonEmptyColumn(cols, at.column, delta.column) : at.column;
  const tasks = columnTasks(cols, column);
  const row = clamp(at.row + (delta.row ?? 0), tasks.length - 1);
  return tasks[row]!.id;
}

export interface ColumnView {
  tasks: Task[];
  /** Cards hidden above the window */
  above: number;
  /** Cards hidden below the window */
  below: number;
}

export function viewColumn(
  tasks: Task[],
  selectedId: number | null,
  lines: number,
  lineCount: (task: Task) => number,
): ColumnView {
  const heights = tasks.map(lineCount);
  const total = heights.reduce((sum, h) => sum + h, 0);
  if (total <= lines) return { tasks, above: 0, below: 0 };
  const budget = Math.max(2, lines - 2);
  const endFrom = (start: number): number => {
    let used = 0;
    let end = start;
    while (end < tasks.length && used + heights[end]! <= budget) {
      used += heights[end]!;
      end++;
    }
    return Math.max(end, start + 1);
  };
  const selected = Math.max(0, tasks.findIndex((t) => t.id === selectedId));
  let start = 0;
  let end = endFrom(start);
  while (selected >= end) {
    start++;
    end = endFrom(start);
  }
  return { tasks: tasks.slice(start, end), above: start, below: tasks.length - end };
}

export function truncate(text: string, width: number): string {
  if (text.length <= width) return text.padEnd(width);
  return text.slice(0, Math.max(0, width - 1)) + '…';
}
