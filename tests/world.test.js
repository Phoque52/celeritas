import { test } from 'node:test';
import assert from 'node:assert/strict';
import { survey } from '../js/engine/world.js';
import { fakeEnv } from './fake-env.js';

const regions = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, url: `https://${id}.test/ping`, mode: 'cors' }));
const quick = { samples: 2, warmup: 1, interval: 0, timeout: 50, warmupTimeout: 50 };
const hostOf = (href) => new URL(href).hostname.split('.')[0];

test('measures every region and reports each one as it finishes', async () => {
  const env = fakeEnv((href) => ({ entry: { duration: 10 * (hostOf(href).charCodeAt(0) - 96) } }));
  const reported = [];
  const results = await survey(regions, { ...quick, env, onResult: (region) => reported.push(region.id) });
  assert.equal(results.size, 5);
  assert.deepEqual([...reported].sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(results.get('c').stats.median, 30);
});

test('never measures more than `concurrency` regions at once', async () => {
  const active = new Set();
  let peak = 0;
  const env = fakeEnv((href) => {
    active.add(hostOf(href));
    peak = Math.max(peak, active.size);
    return { entry: { duration: 5 }, delay: 3 };
  });
  await survey(regions, {
    ...quick,
    env,
    concurrency: 2,
    onResult: (region) => active.delete(region.id),
  });
  assert.equal(peak, 2);
});

test('a region that does not answer does not stop the others', async () => {
  const env = fakeEnv((href) => (hostOf(href) === 'b' ? { networkError: true } : { entry: { duration: 20 } }));
  const results = await survey(regions, { ...quick, env });
  assert.equal(results.get('b'), null);
  assert.equal(results.get('a').stats.median, 20);
  assert.equal(results.get('e').stats.median, 20);
});

test('stopping the survey rejects with an AbortError', async () => {
  const controller = new AbortController();
  const env = fakeEnv(() => ({ entry: { duration: 5 }, delay: 2 }));
  const run = survey(regions, { ...quick, env, concurrency: 1, signal: controller.signal, onResult: () => controller.abort() });
  await assert.rejects(run, { name: 'AbortError' });
});
