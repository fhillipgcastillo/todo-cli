import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveDbPath } from './db-path.ts';
import { InvalidParentError, InvalidStatusError, NotFoundError, isStatus, type Status, type Task } from './types.ts';

const SCHEMA_VERSION = 2;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY,
  project     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'backlog'
              CHECK (status IN ('backlog','todo','in_progress','review','on_hold','done')),
  due         TEXT,
  parent_id   INTEGER REFERENCES tasks(id),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_project_status ON tasks (project, status);
`;

export interface AddInput {
  project: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  due?: string | null;
  /** Create as a subtask of this task; the parent's project wins */
  parentId?: number;
}

export interface ListFilter {
  project?: string;
  status?: Status;
  /** Ignore `project` and return every project */
  all?: boolean;
  /** Only subtasks of this task */
  parentId?: number;
}

export interface UpdatePatch {
  title?: string;
  description?: string;
  /** YYYY-MM-DD, or null to clear */
  due?: string | null;
  /** Attach to a parent task, or null to detach */
  parentId?: number | null;
}

function now(): string {
  return new Date().toISOString();
}

export class TaskStore {
  readonly #db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.#db = db;
  }

  static open(path: string = resolveDbPath()): TaskStore {
    mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 2000');
    db.exec(SCHEMA);
    const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
    if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    else if (row.version < 2) {
      db.exec('ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id)');
      db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
    }
    return new TaskStore(db);
  }

  add(input: AddInput): Task {
    const parent = input.parentId === undefined ? undefined : this.#validParent(input.parentId);
    const ts = now();
    const result = this.#db
      .prepare('INSERT INTO tasks (project, title, description, due, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(parent?.project ?? input.project, input.title, input.description ?? '', input.due ?? null, input.parentId ?? null, ts, ts);
    return this.#require(Number(result.lastInsertRowid));
  }

  list(filter: ListFilter = {}): Task[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (!filter.all && filter.project) {
      where.push('project = ?');
      params.push(filter.project);
    }
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter.parentId !== undefined) {
      where.push('parent_id = ?');
      params.push(filter.parentId);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return this.#db.prepare(`SELECT * FROM tasks ${clause} ORDER BY id ASC`).all(...params) as unknown as Task[];
  }

  projects(): string[] {
    const rows = this.#db.prepare('SELECT DISTINCT project FROM tasks ORDER BY project ASC').all() as unknown as { project: string }[];
    return rows.map((r) => r.project);
  }

  get(id: number): Task | undefined {
    return this.#db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as unknown as Task | undefined;
  }

  update(id: number, patch: UpdatePatch): Task {
    const current = this.#require(id);
    if (typeof patch.parentId === 'number') {
      const parent = this.#validParent(patch.parentId, current);
      if (parent.project !== current.project)
        throw new InvalidParentError(`task ${id} is in project "${current.project}", parent ${parent.id} in "${parent.project}"`);
    }
    this.#db
      .prepare('UPDATE tasks SET title = ?, description = ?, due = ?, parent_id = ?, updated_at = ? WHERE id = ?')
      .run(
        patch.title ?? current.title,
        patch.description ?? current.description,
        patch.due === undefined ? current.due : patch.due,
        patch.parentId === undefined ? current.parent_id : patch.parentId,
        now(),
        id,
      );
    return this.#require(id);
  }

  subtasks(id: number): Task[] {
    return this.#db.prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY id ASC').all(id) as unknown as Task[];
  }

  setStatus(id: number, status: string): Task {
    if (!isStatus(status)) throw new InvalidStatusError(status);
    this.#require(id);
    this.#db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
    return this.#require(id);
  }

  remove(id: number): number {
    this.#require(id);
    const result = this.#db.prepare('DELETE FROM tasks WHERE id = ? OR parent_id = ?').run(id, id);
    return Number(result.changes);
  }

  dataVersion(): number {
    const row = this.#db.prepare('PRAGMA data_version').get() as { data_version: number };
    return row.data_version;
  }

  close(): void {
    this.#db.close();
  }

  #validParent(parentId: number, child?: Task): Task {
    const parent = this.get(parentId);
    if (!parent) throw new NotFoundError(parentId);
    if (parent.parent_id !== null) throw new InvalidParentError(`task ${parentId} is a subtask and cannot have subtasks`);
    if (child?.id === parentId) throw new InvalidParentError(`task ${parentId} cannot be its own parent`);
    if (child && this.subtasks(child.id).length > 0)
      throw new InvalidParentError(`task ${child.id} has subtasks and cannot become a subtask`);
    return parent;
  }

  #require(id: number): Task {
    const task = this.get(id);
    if (!task) throw new NotFoundError(id);
    return task;
  }
}
