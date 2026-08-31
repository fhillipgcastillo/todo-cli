#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { TaskStore } from './store.ts';
import { detectProject } from './project.ts';
import { readDescription, stdinSource } from './description.ts';
import { renderTable, renderTask } from './format.ts';
import { STATUSES, isStatus, type Status, type Task } from './types.ts';

const program = new Command();
const store = TaskStore.open();

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new InvalidArgumentError('id must be a positive integer');
  return id;
}

function parseStatus(value: string): Status {
  if (!isStatus(value)) throw new InvalidArgumentError(`expected one of: ${STATUSES.join(', ')}`);
  return value;
}

function currentProject(override?: string): string {
  return override ?? detectProject(process.cwd());
}

function emit(json: boolean, data: Task | Task[], text: string): void {
  process.stdout.write(json ? JSON.stringify(data, null, 2) + '\n' : text);
}

program
  .name('todo')
  .description('Project-scoped task manager')
  .version('0.1.0');

program
  .command('add')
  .argument('<title>')
  .option('-d, --description <text>')
  .option('--due <date>', 'YYYY-MM-DD')
  .option('--parent <id>', 'create as a subtask of that task', parseId)
  .option('--project <name>')
  .option('--json')
  .action((title: string, opts) => {
    const task = store.add({
      project: currentProject(opts.project),
      title,
      description: readDescription(stdinSource(opts.description)),
      due: opts.due ?? null,
      parentId: opts.parent,
    });
    emit(Boolean(opts.json), task, `added #${task.id} ${task.title}\n`);
  });

program
  .command('list')
  .option('--status <status>', `one of: ${STATUSES.join(', ')}`, parseStatus)
  .option('--project <name>')
  .option('--all')
  .option('--json')
  .action((opts) => {
    const tasks = store.list({ project: currentProject(opts.project), status: opts.status, all: Boolean(opts.all) });
    emit(Boolean(opts.json), tasks, renderTable(tasks));
  });

program
  .command('show')
  .argument('<id>', undefined, parseId)
  .option('--json')
  .action((id: number, opts) => {
    const task = store.get(id);
    if (!task) throw new Error(`task ${id} not found`);
    const parent = task.parent_id === null ? undefined : store.get(task.parent_id);
    emit(Boolean(opts.json), task, renderTask(task, { parent, subtasks: store.subtasks(id) }));
  });

program
  .command('edit')
  .argument('<id>', undefined, parseId)
  .option('--title <title>')
  .option('-d, --description <text>')
  .option('--due <date>', 'YYYY-MM-DD, or "none" to clear')
  .option('--parent <id|none>', 'attach to a parent task, or "none" to detach')
  .option('--json')
  .action((id: number, opts) => {
    const task = store.update(id, {
      title: opts.title,
      description: opts.description,
      due: opts.due === undefined ? undefined : opts.due === 'none' ? null : opts.due,
      parentId: opts.parent === undefined ? undefined : opts.parent === 'none' ? null : parseId(opts.parent),
    });
    emit(Boolean(opts.json), task, `updated #${task.id} ${task.title}\n`);
  });

program
  .command('status')
  .argument('<id>', undefined, parseId)
  .argument('<status>')
  .option('--json')
  .action((id: number, status: string, opts) => {
    const task = store.setStatus(id, status);
    emit(Boolean(opts.json), task, `#${task.id} → ${task.status}\n`);
  });

program
  .command('done')
  .argument('<id>', undefined, parseId)
  .option('--json')
  .action((id: number, opts) => {
    const task = store.setStatus(id, 'done');
    emit(Boolean(opts.json), task, `#${task.id} → done\n`);
  });

program
  .command('rm')
  .argument('<id>', undefined, parseId)
  .action((id: number) => {
    const removed = store.remove(id);
    process.stdout.write(removed > 1 ? `removed #${id} (+${removed - 1} subtasks)\n` : `removed #${id}\n`);
  });

try {
  program.parse();
} catch (error) {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
} finally {
  store.close();
}
