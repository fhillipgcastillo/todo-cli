import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { isValidDate } from './date.ts';

export interface FormValues {
  title: string;
  due: string;
  description: string;
}

export interface FormProps {
  heading: string;
  initial: FormValues;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  /** Opens $EDITOR seeded with the current text and returns the edited text */
  onEditDescription: (current: string) => string;
  message?: string | null;
}

const FIELDS = ['title', 'due', 'description'] as const;
type Field = (typeof FIELDS)[number];

function validate(values: FormValues): string | null {
  if (values.title.trim() === '') return 'title is required';
  if (values.due !== '' && !isValidDate(values.due)) return 'due must be YYYY-MM-DD';
  return null;
}

function summary(text: string): string {
  if (text === '') return '(none)';
  const count = text.split('\n').length;
  return `${count} ${count === 1 ? 'line' : 'lines'}`;
}

export function Form({ heading, initial, onSubmit, onCancel, onEditDescription, message }: FormProps) {
  const [title, setTitle] = useState(initial.title);
  const [due, setDue] = useState(initial.due);
  const [description, setDescription] = useState(initial.description);
  const [field, setField] = useState<Field>('title');
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) onCancel();
    if (key.tab) setField((f) => FIELDS[(FIELDS.indexOf(f) + 1) % FIELDS.length]!);
    if (key.return && field === 'description') setDescription(onEditDescription(description));
  });

  const submit = () => {
    const values = { title: title.trim(), due: due.trim(), description };
    const problem = validate(values);
    if (problem) { setError(problem); return; }
    onSubmit(values);
  };

  const marker = (name: Field) => (field === name ? <Text color="cyan">❯ </Text> : <Text>  </Text>);
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} alignSelf="flex-start">
        <Text bold color="cyan">{heading}</Text>
        <Box>
          <Text>{marker('title')}title: </Text>
          <TextInput value={title} onChange={setTitle} onSubmit={submit} focus={field === 'title'} />
        </Box>
        <Box>
          <Text>{marker('due')}due:   </Text>
          <TextInput value={due} onChange={setDue} onSubmit={submit} focus={field === 'due'} placeholder="YYYY-MM-DD" />
        </Box>
        <Box>
          <Text>{marker('description')}description: {summary(description)}</Text>
          {field === 'description' ? <Text dimColor>  (enter opens $EDITOR)</Text> : null}
        </Box>
      </Box>
      <Box paddingX={1}><Text dimColor>tab switch field · enter save / on description open $EDITOR · esc cancel</Text></Box>
      {error ? <Box paddingX={1}><Text inverse color="red"> {error} </Text></Box> : null}
      {message ? <Box paddingX={1}><Text inverse color="yellow"> {message} </Text></Box> : null}
    </Box>
  );
}
