import type { Task } from './types.ts';

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

export function renderTable(tasks: Task[]): string {
  if (tasks.length === 0) return 'no tasks\n';
  const rows = tasks.map((t) => [String(t.id), t.status, t.due ?? '-', t.title]);
  const header = ['ID', 'STATUS', 'DUE', 'TITLE'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === cells.length - 1 ? c : pad(c, widths[i]!))).join('  ');
  return [line(header), ...rows.map(line)].join('\n') + '\n';
}

export function renderTask(task: Task): string {
  return [
    `#${task.id}  ${task.title}`,
    `project: ${task.project}`,
    `status:  ${task.status}`,
    `due:     ${task.due ?? '-'}`,
    `created: ${task.created_at}`,
    `updated: ${task.updated_at}`,
    '',
    task.description,
    '',
  ].join('\n');
}
