#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TaskStore, detectProject } from '@todo/core';
import { registerTools } from './tools.ts';

const store = TaskStore.open();
const server = new McpServer({ name: 'todo', version: '0.1.0' });
registerTools(server, store, detectProject(process.cwd()));

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGTERM', () => {
  store.close();
  process.exit(0);
});
