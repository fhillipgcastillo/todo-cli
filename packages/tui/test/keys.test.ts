import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyToAction } from '../src/keys.ts';

const none = {};

test('board navigation keys', () => {
  assert.deepEqual(keyToAction('board', '', { leftArrow: true }), { type: 'column', delta: -1 });
  assert.deepEqual(keyToAction('board', 'h', none), { type: 'column', delta: -1 });
  assert.deepEqual(keyToAction('board', 'l', none), { type: 'column', delta: 1 });
  assert.deepEqual(keyToAction('board', '', { rightArrow: true }), { type: 'column', delta: 1 });
  assert.deepEqual(keyToAction('board', 'k', none), { type: 'row', delta: -1 });
  assert.deepEqual(keyToAction('board', '', { downArrow: true }), { type: 'row', delta: 1 });
});

test('board action keys', () => {
  assert.deepEqual(keyToAction('board', '[', none), { type: 'shift', delta: -1 });
  assert.deepEqual(keyToAction('board', ']', none), { type: 'shift', delta: 1 });
  assert.deepEqual(keyToAction('board', '1', none), { type: 'jump', column: 0 });
  assert.deepEqual(keyToAction('board', '6', none), { type: 'jump', column: 5 });
  assert.equal(keyToAction('board', '7', none), undefined);
  assert.deepEqual(keyToAction('board', '', { return: true }), { type: 'open' });
  assert.deepEqual(keyToAction('board', 'a', none), { type: 'add' });
  assert.deepEqual(keyToAction('board', 's', none), { type: 'addSubtask' });
  assert.deepEqual(keyToAction('board', 'e', none), { type: 'edit' });
  assert.deepEqual(keyToAction('board', 'd', none), { type: 'editDescription' });
  assert.deepEqual(keyToAction('board', 'x', none), { type: 'delete' });
  assert.deepEqual(keyToAction('board', 'p', none), { type: 'pickProject' });
  assert.deepEqual(keyToAction('board', 'r', none), { type: 'reload' });
  assert.deepEqual(keyToAction('board', '?', none), { type: 'help' });
  assert.deepEqual(keyToAction('board', 'q', none), { type: 'quit' });
  assert.deepEqual(keyToAction('board', 'c', { ctrl: true }), { type: 'quit' });
  assert.equal(keyToAction('board', '', { escape: true }), undefined);
});

test('detail keys', () => {
  assert.deepEqual(keyToAction('detail', '', { escape: true }), { type: 'back' });
  assert.deepEqual(keyToAction('detail', 'j', none), { type: 'row', delta: 1 });
  assert.deepEqual(keyToAction('detail', ']', none), { type: 'shift', delta: 1 });
  assert.deepEqual(keyToAction('detail', '3', none), { type: 'jump', column: 2 });
  assert.deepEqual(keyToAction('detail', 'x', none), { type: 'delete' });
  assert.equal(keyToAction('detail', 'a', none), undefined);
  assert.equal(keyToAction('detail', 'p', none), undefined);
  assert.equal(keyToAction('detail', 's', none), undefined);
  assert.equal(keyToAction('detail', 'h', none), undefined);
  assert.equal(keyToAction('detail', '', { return: true }), undefined);
});

test('form, confirm and picker are not mapped', () => {
  assert.equal(keyToAction('form', 'q', none), undefined);
  assert.equal(keyToAction('confirm', 'q', none), undefined);
  assert.equal(keyToAction('picker', 'q', none), undefined);
});
