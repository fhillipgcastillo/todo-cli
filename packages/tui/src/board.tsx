import { Box, Text } from 'ink';
import { STATUSES, type Task } from '@todo/core';
import { truncate, type Columns } from './board-model.ts';

export interface BoardProps {
  cols: Columns;
  selectedId: number | null;
  project: string;
  all: boolean;
  live: boolean;
  message: string | null;
  width: number;
  showHelp: boolean;
}

const HELP = '←/→ h/l column  ↑/↓ j/k row  [ ] move  1-6 jump  enter open  a add  e edit  d description  x delete  r reload  q quit';

function Card({ task, selected, all, width }: { task: Task; selected: boolean; all: boolean; width: number }) {
  const label = `${selected ? '>' : ' '}#${task.id} ${task.title}`;
  const meta = [task.due, all ? `[${task.project}]` : null].filter(Boolean).join(' ');
  return (
    <Box flexDirection="column">
      <Text inverse={selected} wrap="truncate">{truncate(label, width)}</Text>
      {meta ? <Text dimColor wrap="truncate">{truncate(`  ${meta}`, width)}</Text> : null}
    </Box>
  );
}

export function Board({ cols, selectedId, project, all, live, message, width, showHelp }: BoardProps) {
  const columnWidth = Math.max(8, Math.floor(width / STATUSES.length) - 1);
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>todo · {all ? 'all projects' : `project: ${project}`}</Text>
        <Text>{live ? '● live' : '○ paused'}  q quit  ? help</Text>
      </Box>
      <Box>
        {STATUSES.map((status) => (
          <Box key={status} flexDirection="column" width={columnWidth} marginRight={1} borderStyle="single">
            <Text bold>{status} ({cols[status].length})</Text>
            {cols[status].map((task) => (
              <Card key={task.id} task={task} selected={task.id === selectedId} all={all} width={columnWidth - 2} />
            ))}
          </Box>
        ))}
      </Box>
      {showHelp ? <Text dimColor>{HELP}</Text> : null}
      {message ? <Text color="yellow">{message}</Text> : null}
    </Box>
  );
}
