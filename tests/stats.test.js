import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, quantile, median, jitter } from '../js/engine/stats.js';

test('summarize reports the median, spread and jitter', () => {
  const stats = summarize([30, 40, 20, 50]);
  assert.equal(stats.sent, 4);
  assert.equal(stats.lost, 0);
  assert.equal(stats.loss, 0);
  assert.equal(stats.min, 20);
  assert.equal(stats.max, 50);
  assert.equal(stats.mean, 35);
  assert.equal(stats.median, 35);
  // |40 - 30| + |20 - 40| + |50 - 20| = 60, over 3 steps
  assert.equal(stats.jitter, 20);
});

test('lost samples count toward loss but not toward timing', () => {
  const stats = summarize([10, null, 20, null]);
  assert.equal(stats.received, 2);
  assert.equal(stats.lost, 2);
  assert.equal(stats.loss, 0.5);
  assert.equal(stats.median, 15);
  assert.equal(stats.jitter, 10);
});

test('a run where every sample was lost has no timing', () => {
  const stats = summarize([null, null, null]);
  assert.equal(stats.loss, 1);
  assert.equal(stats.median, null);
  assert.equal(stats.jitter, null);
});

test('an empty run has nothing lost', () => {
  const stats = summarize([]);
  assert.equal(stats.loss, 0);
  assert.equal(stats.median, null);
});

test('NaN and Infinity are treated as lost', () => {
  const stats = summarize([10, Number.NaN, Infinity]);
  assert.equal(stats.lost, 2);
  assert.equal(stats.median, 10);
});

test('quantile interpolates between neighbours', () => {
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
  assert.equal(quantile([10, 20, 30], 0.5), 20);
  assert.equal(quantile([5], 0.9), 5);
  assert.equal(quantile([], 0.5), null);
});

test('median ignores lost samples and input order', () => {
  assert.equal(median([50, null, 10, 30]), 30);
  assert.equal(median([null]), null);
});

test('jitter is zero with fewer than two samples', () => {
  assert.equal(jitter([42]), 0);
  assert.equal(jitter([]), 0);
});
