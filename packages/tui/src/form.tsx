import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { isValidDate } from './date.ts';

export interface FormValues {
  title: string;
  due: string;
}

export interface FormProps {
  heading: string;
  initial: FormValues;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}

function validate(values: FormValues): string | null {
  if (values.title.trim() === '') return 'title is required';
  if (values.due !== '' && !isValidDate(values.due)) return 'due must be YYYY-MM-DD';
  return null;
}

export function Form({ heading, initial, onSubmit, onCancel }: FormProps) {
  const [title, setTitle] = useState(initial.title);
  const [due, setDue] = useState(initial.due);
  const [field, setField] = useState<'title' | 'due'>('title');
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) onCancel();
    if (key.tab) setField((f) => (f === 'title' ? 'due' : 'title'));
  });

  const submit = () => {
    const values = { title: title.trim(), due: due.trim() };
    const problem = validate(values);
    if (problem) { setError(problem); return; }
    onSubmit(values);
  };

  return (
    <Box flexDirection="column">
      <Text bold>{heading}</Text>
      <Box>
        <Text>{field === 'title' ? '> ' : '  '}title: </Text>
        <TextInput value={title} onChange={setTitle} onSubmit={submit} focus={field === 'title'} />
      </Box>
      <Box>
        <Text>{field === 'due' ? '> ' : '  '}due:   </Text>
        <TextInput value={due} onChange={setDue} onSubmit={submit} focus={field === 'due'} placeholder="YYYY-MM-DD" />
      </Box>
      <Text dimColor>tab switch field · enter save · esc cancel</Text>
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
