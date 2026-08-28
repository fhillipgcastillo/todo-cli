import { Text, useInput } from 'ink';

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
  return <Text color="red">{question}</Text>;
}
