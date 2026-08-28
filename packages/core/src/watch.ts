import type { TaskStore } from './store.ts';

/** Returns a function that stops watching */
export function watchChanges(
  store: Pick<TaskStore, 'dataVersion'>,
  onChange: () => void,
  intervalMs = 250,
): () => void {
  let last = store.dataVersion();
  const timer = setInterval(() => {
    const current = store.dataVersion();
    if (current === last) return;
    last = current;
    onChange();
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
