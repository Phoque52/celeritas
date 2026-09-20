import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../js/history.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

const entry = (median, time = 1_700_000_000_000 + median) => ({ time, median, jitter: 2, loss: 0 });

test('keeps results newest first', () => {
  const history = createHistory(memoryStorage());
  history.add(entry(40));
  history.add(entry(35));
  assert.deepEqual(history.list().map((e) => e.median), [35, 40]);
  assert.equal(history.latest().median, 35);
});

test('keeps at most 30 results', () => {
  const history = createHistory(memoryStorage());
  for (let i = 0; i < 40; i++) history.add(entry(i));
  assert.equal(history.list().length, 30);
  assert.equal(history.latest().median, 39);
});

test('starts empty without storage', () => {
  const history = createHistory(null);
  assert.equal(history.latest(), null);
  assert.equal(history.add(entry(20)).length, 1);
});

test('survives storage that throws', () => {
  const broken = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  const history = createHistory(broken);
  assert.deepEqual(history.list(), []);
  assert.doesNotThrow(() => history.add(entry(20)));
});

test('ignores corrupted or foreign data', () => {
  const storage = memoryStorage();
  storage.setItem('celeritas.history.v1', '{not json');
  assert.deepEqual(createHistory(storage).list(), []);
  storage.setItem('celeritas.history.v1', JSON.stringify([{ median: 'fast' }, null, entry(25)]));
  assert.deepEqual(createHistory(storage).list(), [entry(25)]);
});
