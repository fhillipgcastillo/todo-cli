import { useCallback, useEffect, useState } from 'react';
import { useApp, useInput, useStdin, useStdout } from 'ink';
import { EditorFailedError, NotFoundError, STATUSES, openEditor, watchChanges, type Task, type TaskStore } from '@todo/core';
import { columns, locate, moveSelection, resolveSelection } from './board-model.ts';
import { keyToAction, type Action, type Mode } from './keys.ts';
import { Board } from './board.tsx';
import { Detail } from './detail.tsx';
import { Form, type FormValues } from './form.tsx';
import { Confirm } from './confirm.tsx';

export interface AppProps {
  store: TaskStore;
  project: string;
  all: boolean;
  intervalMs: number;
  /** Overrides stdout.columns */
  width?: number;
}

export function App({ store, project, all, intervalMs, width }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { setRawMode, isRawModeSupported } = useStdin();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastPos, setLastPos] = useState({ column: 0, row: 0 });
  const [mode, setMode] = useState<Mode>('board');
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [formTarget, setFormTarget] = useState<Task | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [returnMode, setReturnMode] = useState<Mode>('board');

  const cols = columns(tasks);

  const reload = useCallback(() => {
    const fresh = store.list({ project, all });
    setTasks(fresh);
    setSelectedId((current) => resolveSelection(columns(fresh), current, lastPos.column, lastPos.row));
  }, [store, project, all, lastPos]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!live) return;
    return watchChanges(store, reload, intervalMs);
  }, [store, live, intervalMs, reload]);

  useEffect(() => {
    if (selectedId === null) return;
    const at = locate(cols, selectedId);
    if (at) setLastPos(at);
  }, [selectedId, tasks]);

  const selectedTask = (): Task | undefined => tasks.find((t) => t.id === selectedId);

  const withTask = (fn: (task: Task) => void) => {
    const task = selectedTask();
    if (!task) return;
    try {
      fn(task);
      reload();
    } catch (error) {
      if (error instanceof NotFoundError) setMessage(`task #${task.id} no longer exists`);
      else setMessage((error as Error).message);
      reload();
    }
  };

  const shiftStatus = (task: Task, delta: -1 | 1) => {
    const index = STATUSES.indexOf(task.status) + delta;
    if (index < 0 || index >= STATUSES.length) return;
    store.setStatus(task.id, STATUSES[index]!);
  };

  const editDescription = (task: Task) => {
    setLive(false);
    if (isRawModeSupported) setRawMode(false);
    try {
      const text = openEditor(task.description).trim();
      if (text !== task.description) store.update(task.id, { description: text });
    } catch (error) {
      if (error instanceof EditorFailedError) setMessage(`${error.message}; description unchanged`);
      else throw error;
    } finally {
      if (isRawModeSupported) setRawMode(true);
      setLive(true);
    }
  };

  const dispatch = (action: Action) => {
    setMessage(null);
    switch (action.type) {
      case 'column':
        setSelectedId(moveSelection(cols, selectedId, { column: action.delta }));
        return;
      case 'row':
        if (mode === 'detail') setScroll((s) => Math.max(0, s + action.delta));
        else setSelectedId(moveSelection(cols, selectedId, { row: action.delta }));
        return;
      case 'shift':
        withTask((task) => shiftStatus(task, action.delta));
        return;
      case 'jump':
        withTask((task) => store.setStatus(task.id, STATUSES[action.column]!));
        return;
      case 'open':
        if (selectedTask()) { setScroll(0); setMode('detail'); }
        return;
      case 'back':
        setMode('board');
        return;
      case 'add':
        setFormTarget('new');
        setMode('form');
        return;
      case 'edit':
        withTask((task) => { setFormTarget(task); setMode('form'); });
        return;
      case 'editDescription':
        withTask(editDescription);
        return;
      case 'delete':
        withTask((task) => { setDeleteTarget(task); setReturnMode(mode); setMode('confirm'); });
        return;
      case 'reload':
        reload();
        return;
      case 'help':
        setShowHelp((v) => !v);
        return;
      case 'quit':
        exit();
        return;
      default:
        return;
    }
  };

  useInput((input, key) => {
    const action = keyToAction(mode, input, key);
    if (action) dispatch(action);
  });

  const closeForm = () => { setFormTarget(null); setMode('board'); };

  const submitForm = (values: FormValues) => {
    const due = values.due === '' ? null : values.due;
    try {
      if (formTarget === 'new') {
        const created = store.add({ project, title: values.title, due });
        setSelectedId(created.id);
      } else if (formTarget) {
        store.update(formTarget.id, { title: values.title, due });
      }
    } catch (error) {
      setMessage(error instanceof NotFoundError ? `task #${(formTarget as Task).id} no longer exists` : (error as Error).message);
    }
    closeForm();
    reload();
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      try {
        store.remove(deleteTarget.id);
      } catch (error) {
        setMessage(error instanceof NotFoundError ? `task #${deleteTarget.id} no longer exists` : (error as Error).message);
      }
    }
    setDeleteTarget(null);
    setMode('board');
    reload();
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setMode(returnMode);
  };

  const height = Math.max(3, (stdout.rows ?? 24) - 10);
  const task = selectedTask();
  if (mode === 'confirm' && deleteTarget) {
    return <Confirm question={`delete #${deleteTarget.id} "${deleteTarget.title}"? y/n`} onYes={confirmDelete} onNo={cancelDelete} />;
  }
  if (mode === 'form' && formTarget) {
    const editing = formTarget === 'new' ? null : formTarget;
    return (
      <Form
        heading={editing ? `edit #${editing.id}` : `add task · project: ${project}`}
        initial={{ title: editing?.title ?? '', due: editing?.due ?? '' }}
        onSubmit={submitForm}
        onCancel={closeForm}
      />
    );
  }
  if (mode === 'detail' && task) {
    return <Detail task={task} scroll={scroll} height={height} live={live} message={message} />;
  }
  if (mode === 'detail') setMode('board');
  return (
    <Board
      cols={cols}
      selectedId={selectedId}
      project={project}
      all={all}
      live={live}
      message={message}
      width={width ?? stdout.columns ?? 80}
      showHelp={showHelp}
    />
  );
}
