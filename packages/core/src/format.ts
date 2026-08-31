import { treeOrder } from './tree.ts';
import type { Task } from './types.ts';

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

export function renderTable(tasks: Task[]): string {
  if (tasks.length === 0) return 'no tasks\n';
  const rows = treeOrder(tasks).map((t) => [
    String(t.id),
    t.status,
    t.due ?? '-',
    (t.parent_id !== null ? '↳ ' : '') + t.title,
  ]);
  const header = ['ID', 'STATUS', 'DUE', 'TITLE'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === cells.length - 1 ? c : pad(c, widths[i]!))).join('  ');
  return [line(header), ...rows.map(line)].join('\n') + '\n';
}

export function renderTask(task: Task, context: { parent?: Task; subtasks?: Task[] } = {}): string {
  const lines = [
    `#${task.id}  ${task.title}`,
    `project: ${task.project}`,
    `status:  ${task.status}`,
  ];
  if (context.parent) lines.push(`parent:  #${context.parent.id} ${context.parent.title}`);
  lines.push(`due:     ${task.due ?? '-'}`, `created: ${task.created_at}`, `updated: ${task.updated_at}`);
  if (context.subtasks?.length) {
    lines.push('', 'subtasks:');
    for (const sub of context.subtasks) lines.push(`  [${sub.status}] #${sub.id} ${sub.title}`);
  }
  lines.push('', task.description, '');
  return lines.join('\n');
}
