import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from '../js/engine/verdict.js';

test('a fast, steady connection is excellent for everything', () => {
  assert.deepEqual(verdict({ median: 18, jitter: 2, loss: 0 }), {
    grade: 'excellent',
    uses: { gaming: true, calls: true, streaming: true },
  });
});

test('fine for gaming but not top tier is good', () => {
  assert.equal(verdict({ median: 45, jitter: 8, loss: 0 }).grade, 'good');
});

test('jitter alone can rule out gaming', () => {
  const result = verdict({ median: 25, jitter: 22, loss: 0 });
  assert.equal(result.grade, 'fair');
  assert.equal(result.uses.gaming, false);
  assert.equal(result.uses.calls, true);
});

test('one lost request out of 16 rules out gaming but not calls', () => {
  const result = verdict({ median: 25, jitter: 3, loss: 1 / 16 });
  assert.equal(result.uses.gaming, false);
  assert.equal(result.grade, 'fair');
});

test('a quick connection with a lag spike is unstable, not slow', () => {
  // 15 samples around 40 ms and one of 472 ms push jitter to 64 ms.
  const result = verdict({ median: 39, jitter: 64, loss: 0 });
  assert.equal(result.grade, 'unstable');
  assert.equal(result.uses.calls, false);
  assert.equal(result.uses.streaming, true);
});

test('high ping is only good enough for streaming', () => {
  assert.equal(verdict({ median: 220, jitter: 10, loss: 0 }).grade, 'slow');
});

test('very high ping or heavy loss is poor', () => {
  assert.equal(verdict({ median: 450, jitter: 10, loss: 0 }).grade, 'poor');
  assert.equal(verdict({ median: 40, jitter: 5, loss: 0.25 }).grade, 'poor');
});

test('no replies at all has its own grade', () => {
  assert.equal(verdict({ median: null, jitter: null, loss: 1 }).grade, 'none');
});
