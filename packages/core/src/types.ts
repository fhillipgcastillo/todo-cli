export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'on_hold', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export interface Task {
  id: number;
  project: string;
  title: string;
  description: string;
  status: Status;
  /** ISO date (YYYY-MM-DD) or null */
  due: string | null;
  created_at: string;
  updated_at: string;
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export class NotFoundError extends Error {
  constructor(id: number) {
    super(`task ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class InvalidStatusError extends Error {
  constructor(value: string) {
    super(`invalid status "${value}" (expected one of: ${STATUSES.join(', ')})`);
    this.name = 'InvalidStatusError';
  }
}
