import { Box, Text } from 'ink';
import type { Task } from '@todo/core';

export interface DetailProps {
  task: Task;
  scroll: number;
  /** Rows available for the description */
  height: number;
  live: boolean;
  message: string | null;
}

export function Detail({ task, scroll, height, live, message }: DetailProps) {
  const lines = task.description.split('\n');
  const visible = lines.slice(scroll, scroll + height);
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>#{task.id} {task.title}</Text>
        <Text>{live ? '● live' : '○ paused'}  esc back</Text>
      </Box>
      <Text>project: {task.project}</Text>
      <Text>status:  {task.status}</Text>
      <Text>due:     {task.due ?? '-'}</Text>
      <Text>created: {task.created_at}</Text>
      <Text>updated: {task.updated_at}</Text>
      <Text> </Text>
      {visible.map((line, i) => <Text key={scroll + i}>{line || ' '}</Text>)}
      {lines.length > height ? <Text dimColor>({scroll + visible.length}/{lines.length} lines, ↑/↓ scroll)</Text> : null}
      {message ? <Text color="yellow">{message}</Text> : null}
    </Box>
  );
}
