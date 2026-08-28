import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { watchChanges } from '../src/watch.ts';

function fakeStore() {
  let version = 1;
  return {
    dataVersion: () => version,
    bump: () => { version += 1; },
  };
}

test('fires once per change and not on idle ticks', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const store = fakeStore();
    const onChange = mock.fn();
    const stop = watchChanges(store, onChange, 100);
    mock.timers.tick(300);
    assert.equal(onChange.mock.callCount(), 0);
    store.bump();
    mock.timers.tick(100);
    assert.equal(onChange.mock.callCount(), 1);
    mock.timers.tick(300);
    assert.equal(onChange.mock.callCount(), 1);
    stop();
  } finally {
    mock.timers.reset();
  }
});

test('stop ends polling', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const store = fakeStore();
    const onChange = mock.fn();
    const stop = watchChanges(store, onChange, 100);
    stop();
    store.bump();
    mock.timers.tick(500);
    assert.equal(onChange.mock.callCount(), 0);
  } finally {
    mock.timers.reset();
  }
});
