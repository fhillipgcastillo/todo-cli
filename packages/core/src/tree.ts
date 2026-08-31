import type { Task } from './types.ts';

export function treeOrder(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map((t) => t.id));
  const key = (t: Task): [number, number] =>
    t.parent_id !== null && ids.has(t.parent_id) ? [t.parent_id, 1] : [t.id, 0];
  return [...tasks].sort((a, b) => {
    const [ga, sa] = key(a);
    const [gb, sb] = key(b);
    return ga - gb || sa - sb || a.id - b.id;
  });
}

export function subtaskProgress(tasks: Task[], id: number): { done: number; total: number } {
  const subs = tasks.filter((t) => t.parent_id === id);
  return { done: subs.filter((t) => t.status === 'done').length, total: subs.length };
}
