import { Box, Text } from 'ink';
import { STATUSES, subtaskProgress, type Task } from '@todo/core';
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

const HELP = '←/→ h/l column  ↑/↓ j/k row  [ ] move  1-6 jump  enter open  a add  s subtask  e edit  d description  x delete  r reload  q quit';

function Card({ task, progress, selected, all, width }: { task: Task; progress: string | null; selected: boolean; all: boolean; width: number }) {
  const label = `${selected ? '>' : ' '}${task.parent_id !== null ? '↳' : ''}#${task.id} ${task.title}`;
  const meta = [progress, task.due, all ? `[${task.project}]` : null].filter(Boolean).join(' ');
  return (
    <Box flexDirection="column">
      <Text inverse={selected} wrap="truncate">{truncate(label, width)}</Text>
      {meta ? <Text dimColor wrap="truncate">{truncate(`  ${meta}`, width)}</Text> : null}
    </Box>
  );
}

export function Board({ cols, selectedId, project, all, live, message, width, showHelp }: BoardProps) {
  const columnWidth = Math.max(8, Math.floor(width / STATUSES.length) - 1);
  const tasks = STATUSES.flatMap((status) => cols[status]);
  const progressOf = (task: Task): string | null => {
    const { done, total } = subtaskProgress(tasks, task.id);
    return total > 0 ? `${done}/${total}` : null;
  };
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
              <Card key={task.id} task={task} progress={progressOf(task)} selected={task.id === selectedId} all={all} width={columnWidth - 2} />
            ))}
          </Box>
        ))}
      </Box>
      {showHelp ? <Text dimColor>{HELP}</Text> : null}
      {message ? <Text color="yellow">{message}</Text> : null}
    </Box>
  );
}
