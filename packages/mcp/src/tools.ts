import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { STATUSES, type TaskStore } from '@todo/core';

const status = z.enum(STATUSES);
const id = z.number().int().positive();
const due = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD');
const parentId = z.number().int().positive().describe('id of the parent task');

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function guarded(fn: () => unknown): ToolResult {
  try {
    return ok(fn());
  } catch (error) {
    return { content: [{ type: 'text', text: (error as Error).message }], isError: true };
  }
}

export function registerTools(server: McpServer, store: TaskStore, defaultProject: string): void {
  const project = z.string().describe(`project name; defaults to "${defaultProject}"`);

  server.registerTool('add_task', {
    description: 'Create a task in the current project. New tasks start in backlog. Use parent_id to create it as a subtask (one level: a subtask cannot have subtasks).',
    inputSchema: { title: z.string(), description: z.string().optional(), due: due.optional(), parent_id: parentId.optional(), project: project.optional() },
  }, (args) => guarded(() => store.add({ ...args, project: args.project ?? defaultProject, parentId: args.parent_id })));

  server.registerTool('list_tasks', {
    description: 'List tasks for the current project (or all projects with all=true). parent_id restricts to the subtasks of that task.',
    inputSchema: { status: status.optional(), project: project.optional(), all: z.boolean().optional(), parent_id: parentId.optional() },
  }, (args) => guarded(() => store.list({ project: args.project ?? defaultProject, status: args.status, all: args.all, parentId: args.parent_id })));

  server.registerTool('show_task', {
    description: 'Get one task including its full description and subtasks.',
    inputSchema: { id },
  }, (args) => guarded(() => {
    const task = store.get(args.id);
    if (!task) throw new Error(`task ${args.id} not found`);
    return { ...task, subtasks: store.subtasks(args.id).map(({ id, title, status }) => ({ id, title, status })) };
  }));

  server.registerTool('update_task', {
    description: 'Change title, description, due date and/or parent. due=null clears it; parent_id attaches to a parent task, parent_id=null detaches.',
    inputSchema: { id, title: z.string().optional(), description: z.string().optional(), due: due.nullable().optional(), parent_id: parentId.nullable().optional() },
  }, (args) => guarded(() => store.update(args.id, { title: args.title, description: args.description, due: args.due, parentId: args.parent_id })));

  server.registerTool('set_status', {
    description: `Move a task to a status: ${STATUSES.join(', ')}.`,
    inputSchema: { id, status },
  }, (args) => guarded(() => store.setStatus(args.id, args.status)));

  server.registerTool('delete_task', {
    description: 'Delete a task permanently.',
    inputSchema: { id },
  }, (args) => guarded(() => {
    store.remove(args.id);
    return { ok: true };
  }));
}
