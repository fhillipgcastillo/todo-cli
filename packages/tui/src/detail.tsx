import { Box, Text } from 'ink';
import type { Task } from '@todo/core';
import { ACCENTS } from './theme.ts';

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
      <Box flexDirection="column" borderStyle="round" borderColor={ACCENTS[task.status]} paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold>#{task.id} {task.title}</Text>
          <Text>
            {live ? <Text color="green">● live</Text> : <Text dimColor>○ paused</Text>}
            <Text dimColor>  esc back</Text>
          </Text>
        </Box>
        <Text><Text dimColor>project: </Text>{task.project}</Text>
        <Text><Text dimColor>status:  </Text><Text color={ACCENTS[task.status]}>{task.status}</Text></Text>
        {parent ? <Text><Text dimColor>parent:  </Text>#{parent.id} {parent.title}</Text> : null}
        <Text><Text dimColor>due:     </Text>{task.due ?? '-'}</Text>
        <Text><Text dimColor>created: </Text>{task.created_at}</Text>
        <Text><Text dimColor>updated: </Text>{task.updated_at}</Text>
        {subtasks.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>── subtasks ({subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}) ──</Text>
            {subtasks.map((s) => (
              <Text key={s.id}>  [<Text color={ACCENTS[s.status]}>{s.status}</Text>] #{s.id} {s.title}</Text>
            ))}
          </Box>
        ) : null}
        {task.description !== '' ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>── description ──</Text>
            {visible.map((line, i) => <Text key={scroll + i}>{line || ' '}</Text>)}
            {lines.length > height ? <Text dimColor>({scroll + visible.length}/{lines.length} lines, ↑/↓ scroll)</Text> : null}
          </Box>
        ) : null}
      </Box>
      {showHelp ? <Box paddingX={1}><Text dimColor>{HELP}</Text></Box> : null}
      {message ? <Box paddingX={1}><Text inverse color="yellow"> {message} </Text></Box> : null}
    </Box>
  );
}
