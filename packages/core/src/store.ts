import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveDbPath } from './db-path.ts';
import { InvalidStatusError, NotFoundError, isStatus, type Status, type Task } from './types.ts';

const SCHEMA_VERSION = 1;

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
}

export interface ListFilter {
  project?: string;
  status?: Status;
  /** Ignore `project` and return every project */
  all?: boolean;
}

export interface UpdatePatch {
  title?: string;
  description?: string;
  /** YYYY-MM-DD, or null to clear */
  due?: string | null;
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
    return new TaskStore(db);
  }

  add(input: AddInput): Task {
    const ts = now();
    const result = this.#db
      .prepare('INSERT INTO tasks (project, title, description, due, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(input.project, input.title, input.description ?? '', input.due ?? null, ts, ts);
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
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return this.#db.prepare(`SELECT * FROM tasks ${clause} ORDER BY id ASC`).all(...params) as unknown as Task[];
  }

  get(id: number): Task | undefined {
    return this.#db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as unknown as Task | undefined;
  }

  update(id: number, patch: UpdatePatch): Task {
    const current = this.#require(id);
    this.#db
      .prepare('UPDATE tasks SET title = ?, description = ?, due = ?, updated_at = ? WHERE id = ?')
      .run(
        patch.title ?? current.title,
        patch.description ?? current.description,
        patch.due === undefined ? current.due : patch.due,
        now(),
        id,
      );
    return this.#require(id);
  }

  setStatus(id: number, status: string): Task {
    if (!isStatus(status)) throw new InvalidStatusError(status);
    this.#require(id);
    this.#db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
    return this.#require(id);
  }

  remove(id: number): void {
    const result = this.#db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    if (result.changes === 0) throw new NotFoundError(id);
  }

  dataVersion(): number {
    const row = this.#db.prepare('PRAGMA data_version').get() as { data_version: number };
    return row.data_version;
  }

  close(): void {
    this.#db.close();
  }

  #require(id: number): Task {
    const task = this.get(id);
    if (!task) throw new NotFoundError(id);
    return task;
  }
}
