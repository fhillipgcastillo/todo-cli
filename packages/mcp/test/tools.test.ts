import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TaskStore } from '@todo/core';
import { registerTools } from '../src/tools.ts';

let store: TaskStore;
let client: Client;

function text(result: { content: unknown }): unknown {
  const [first] = result.content as { type: string; text: string }[];
  return JSON.parse(first!.text);
}

beforeEach(async () => {
  store = TaskStore.open(join(mkdtempSync(join(tmpdir(), 'todo-mcp-')), 'todo.db'));
  const server = new McpServer({ name: 'todo', version: '0.1.0' });
  registerTools(server, store, 'default-proj');
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(b);
});
afterEach(async () => {
  await client.close();
  store.close();
});

test('lists the six tools', async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(),
    ['add_task', 'delete_task', 'list_tasks', 'set_status', 'show_task', 'update_task']);
});

test('add_task uses default project and returns the task', async () => {
  const r = await client.callTool({ name: 'add_task', arguments: { title: 'via mcp', description: 'body' } });
  const task = text(r) as { id: number; project: string; status: string };
  assert.equal(task.project, 'default-proj');
  assert.equal(task.status, 'backlog');
  assert.equal(store.get(task.id)?.description, 'body');
});

test('list_tasks scopes by default project, honours all and status', async () => {
  store.add({ project: 'default-proj', title: 'a' });
  const other = store.add({ project: 'other', title: 'b' });
  store.setStatus(other.id, 'done');
  assert.equal((text(await client.callTool({ name: 'list_tasks', arguments: {} })) as unknown[]).length, 1);
  assert.equal((text(await client.callTool({ name: 'list_tasks', arguments: { all: true } })) as unknown[]).length, 2);
  assert.equal((text(await client.callTool({ name: 'list_tasks', arguments: { all: true, status: 'done' } })) as unknown[]).length, 1);
});

test('show, update, set_status, delete round-trip', async () => {
  const t = store.add({ project: 'default-proj', title: 'x' });
  assert.equal((text(await client.callTool({ name: 'show_task', arguments: { id: t.id } })) as { title: string }).title, 'x');
  const u = text(await client.callTool({ name: 'update_task', arguments: { id: t.id, title: 'y', due: '2026-09-09' } })) as { title: string; due: string };
  assert.equal(u.title, 'y');
  assert.equal(u.due, '2026-09-09');
  const s = text(await client.callTool({ name: 'set_status', arguments: { id: t.id, status: 'review' } })) as { status: string };
  assert.equal(s.status, 'review');
  assert.deepEqual(text(await client.callTool({ name: 'delete_task', arguments: { id: t.id } })), { ok: true });
  assert.equal(store.get(t.id), undefined);
});

test('errors are returned as isError with the message', async () => {
  const r = await client.callTool({ name: 'show_task', arguments: { id: 999 } });
  assert.equal(r.isError, true);
  assert.match((r.content as { text: string }[])[0]!.text, /task 999 not found/);
});
