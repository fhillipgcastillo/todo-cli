import { Box, Text } from 'ink';
import { STATUSES, subtaskProgress, type Task } from '@todo/core';
import { truncate, viewColumn, type Columns } from './board-model.ts';
import { ACCENTS, BAR_COLORS } from './theme.ts';

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

const HELP = '←/→ h/l column  ↑/↓ j/k row  [ ] move  1-6 jump  enter open  a add  s subtask  e edit  d description  x delete  p project  r reload  q quit';

function columnTitle(status: string, count: number, width: number): string {
  const full = `${status} (${count})`;
  const text = full.length <= width ? full : status;
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return truncate(' '.repeat(pad) + text, width);
}

function Card({ task, meta, selected, width }: { task: Task; meta: string; selected: boolean; width: number }) {
  const label = `${selected ? '❯' : ' '}${task.parent_id !== null ? '↳' : ''}#${task.id} ${task.title}`;
  return (
    <Box flexDirection="column">
      <Text inverse={selected} dimColor={!selected && task.status === 'done'} wrap="truncate">{truncate(label, width)}</Text>
      {meta ? <Text dimColor wrap="truncate">{truncate(`  ${meta}`, width)}</Text> : null}
    </Box>
  );
}

export function Board({ cols, selectedId, project, all, live, message, width, height, showHelp }: BoardProps) {
  const columnWidth = Math.max(8, Math.floor(width / STATUSES.length) - 1);
  const innerWidth = columnWidth - 4;
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
      <Box justifyContent="space-between" paddingX={1} backgroundColor="gray">
        <Text>
          <Text bold color="cyanBright">todo</Text>
          <Text color="whiteBright"> · {all ? 'all projects' : `project: ${project}`}</Text>
        </Text>
        <Text>
          {live ? <Text bold color="greenBright">● live</Text> : <Text color="whiteBright">○ paused</Text>}
          <Text color="whiteBright">  q quit  ? help</Text>
        </Text>
      </Box>
      <Box>
        {STATUSES.map((status) => {
          const view = viewColumn(cols[status], selectedId, cardLines, lineCount);
          const active = cols[status].some((t) => t.id === selectedId);
          return (
            <Box
              key={status}
              flexDirection="column"
              width={columnWidth}
              marginRight={1}
              paddingX={1}
              borderStyle="round"
              borderColor={ACCENTS[status]}
              borderDimColor={!active}
            >
              <Text bold backgroundColor={BAR_COLORS[status]} color="white" wrap="truncate">{columnTitle(status, cols[status].length, innerWidth)}</Text>
              {view.above > 0 ? <Text dimColor>↑ {view.above} more</Text> : null}
              {view.tasks.map((task) => (
                <Card key={task.id} task={task} meta={metaOf(task)} selected={task.id === selectedId} width={innerWidth} />
              ))}
              {view.below > 0 ? <Text dimColor>↓ {view.below} more</Text> : null}
            </Box>
          );
        })}
      </Box>
      {showHelp ? <Box paddingX={1}><Text dimColor>{HELP}</Text></Box> : null}
      {message ? <Box paddingX={1}><Text inverse color="yellow"> {message} </Text></Box> : null}
    </Box>
  );
}
