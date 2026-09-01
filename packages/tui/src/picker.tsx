import { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PickerProps {
  projects: string[];
  /** Active project, or null when showing all */
  current: string | null;
  /** Receives the chosen project, or null for all projects */
  onSelect: (project: string | null) => void;
  onCancel: () => void;
}

export function Picker({ projects, current, onSelect, onCancel }: PickerProps) {
  const entries: (string | null)[] = [null, ...projects];
  const [index, setIndex] = useState(Math.max(0, entries.indexOf(current)));

  useInput((input, key) => {
    if (key.escape) onCancel();
    else if (key.upArrow || input === 'k') setIndex((i) => Math.max(0, i - 1));
    else if (key.downArrow || input === 'j') setIndex((i) => Math.min(entries.length - 1, i + 1));
    else if (key.return) onSelect(entries[index] ?? null);
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} alignSelf="flex-start">
      <Text bold color="cyanBright">switch project</Text>
      {entries.map((entry, i) => (
        <Text key={entry ?? '*'} inverse={i === index}>
          {i === index ? '❯ ' : '  '}{entry ?? 'all projects'}
        </Text>
      ))}
      <Text dimColor>↑/↓ j/k move  enter select  esc cancel</Text>
    </Box>
  );
}
