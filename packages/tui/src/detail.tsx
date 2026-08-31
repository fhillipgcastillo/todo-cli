import { Box, Text } from 'ink';
import type { Task } from '@todo/core';

export interface DetailProps {
  task: Task;
  /** The task's parent, when it is a subtask */
  parent?: Task;
  /** The task's subtasks, empty when it has none */
  subtasks: Task[];
  scroll: number;
  /** Rows available for the description */
  height: number;
  live: boolean;
  message: string | null;
  showHelp: boolean;
}

const HELP = '↑/↓ j/k scroll  [ ] move  1-6 jump  e edit  d description  x delete  r reload  esc back  q quit';

export function Detail({ task, parent, subtasks, scroll, height, live, message, showHelp }: DetailProps) {
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
      {parent ? <Text>parent:  #{parent.id} {parent.title}</Text> : null}
      <Text>due:     {task.due ?? '-'}</Text>
      <Text>created: {task.created_at}</Text>
      <Text>updated: {task.updated_at}</Text>
      {subtasks.length > 0 ? (
        <Box flexDirection="column">
          <Text> </Text>
          <Text bold>subtasks ({subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}):</Text>
          {subtasks.map((s) => <Text key={s.id}>  [{s.status}] #{s.id} {s.title}</Text>)}
        </Box>
      ) : null}
      <Text> </Text>
      {visible.map((line, i) => <Text key={scroll + i}>{line || ' '}</Text>)}
      {lines.length > height ? <Text dimColor>({scroll + visible.length}/{lines.length} lines, ↑/↓ scroll)</Text> : null}
      {showHelp ? <Text dimColor>{HELP}</Text> : null}
      {message ? <Text color="yellow">{message}</Text> : null}
    </Box>
  );
}
