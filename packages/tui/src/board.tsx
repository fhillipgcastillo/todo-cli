import { Box, Text } from 'ink';
import { STATUSES, subtaskProgress, type Task } from '@todo/core';
import { truncate, viewColumn, type Columns } from './board-model.ts';

export interface BoardProps {
  cols: Columns;
  selectedId: number | null;
  project: string;
  all: boolean;
  live: boolean;
  message: string | null;
  width: number;
  /** Terminal rows available to the whole board */
  height: number;
  showHelp: boolean;
}

const HELP = '←/→ h/l column  ↑/↓ j/k row  [ ] move  1-6 jump  enter open  a add  s subtask  e edit  d description  x delete  r reload  q quit';

function Card({ task, meta, selected, width }: { task: Task; meta: string; selected: boolean; width: number }) {
  const label = `${selected ? '>' : ' '}${task.parent_id !== null ? '↳' : ''}#${task.id} ${task.title}`;
  return (
    <Box flexDirection="column">
      <Text inverse={selected} wrap="truncate">{truncate(label, width)}</Text>
      {meta ? <Text dimColor wrap="truncate">{truncate(`  ${meta}`, width)}</Text> : null}
    </Box>
  );
}

export function Board({ cols, selectedId, project, all, live, message, width, height, showHelp }: BoardProps) {
  const columnWidth = Math.max(8, Math.floor(width / STATUSES.length) - 1);
  const cardLines = Math.max(3, height - 6);
  const tasks = STATUSES.flatMap((status) => cols[status]);
  const metaOf = (task: Task): string => {
    const { done, total } = subtaskProgress(tasks, task.id);
    const progress = total > 0 ? `${done}/${total}` : null;
    return [progress, task.due, all ? `[${task.project}]` : null].filter(Boolean).join(' ');
  };
  const lineCount = (task: Task): number => (metaOf(task) ? 2 : 1);
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>todo · {all ? 'all projects' : `project: ${project}`}</Text>
        <Text>{live ? '● live' : '○ paused'}  q quit  ? help</Text>
      </Box>
      <Box>
        {STATUSES.map((status) => {
          const view = viewColumn(cols[status], selectedId, cardLines, lineCount);
          return (
            <Box key={status} flexDirection="column" width={columnWidth} marginRight={1} borderStyle="single">
              <Text bold>{status} ({cols[status].length})</Text>
              {view.above > 0 ? <Text dimColor>↑ {view.above} more</Text> : null}
              {view.tasks.map((task) => (
                <Card key={task.id} task={task} meta={metaOf(task)} selected={task.id === selectedId} width={columnWidth - 2} />
              ))}
              {view.below > 0 ? <Text dimColor>↓ {view.below} more</Text> : null}
            </Box>
          );
        })}
      </Box>
      {showHelp ? <Text dimColor>{HELP}</Text> : null}
      {message ? <Text color="yellow">{message}</Text> : null}
    </Box>
  );
}
