import { Box, Text, useInput } from 'ink';

export interface ConfirmProps {
  question: string;
  onYes: () => void;
  onNo: () => void;
}

export function Confirm({ question, onYes, onNo }: ConfirmProps) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onYes();
    else if (input === 'n' || input === 'N' || key.escape) onNo();
  });
  return (
    <Box borderStyle="round" borderColor="red" paddingX={1} alignSelf="flex-start">
      <Text color="red">{question}</Text>
    </Box>
  );
}
