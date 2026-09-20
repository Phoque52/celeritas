import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, measureFirst, UnreachableError } from '../js/engine/measure.js';
import { fakeEnv } from './fake-env.js';

const target = (url, extra = {}) => ({ name: url, url, mode: 'cors', ...extra });
const quick = { interval: 0, timeout: 50, warmupTimeout: 50 };

test('discards warm-up requests and times the warm connection', async () => {
  let count = 0;
  const env = fakeEnv(() => ({ entry: { duration: ++count <= 2 ? 400 : 40 } }));
  const result = await measure(target('https://a.test/'), { ...quick, samples: 5, warmup: 2, env });
  assert.equal(env.requests.length, 7);
  assert.deepEqual(result.samples, [40, 40, 40, 40, 40]);
  assert.equal(result.stats.median, 40);
});

test('reads metadata during warm-up and reports it before sampling', async () => {
  const env = fakeEnv(() => ({ body: 'ip=203.0.113.9\ncolo=IST\n', entry: { duration: 30 } }));
  const events = [];
  const withTrace = target('https://a.test/', { parse: (body) => ({ colo: body.match(/colo=(\w+)/)[1] }) });
  const result = await measure(withTrace, {
    ...quick,
    samples: 2,
    warmup: 1,
    env,
    onReady: (_, meta) => events.push(['ready', meta.colo]),
    onSample: (rtt, index) => events.push(['sample', index, rtt]),
  });
  assert.deepEqual(result.meta, { colo: 'IST' });
  assert.deepEqual(events, [['ready', 'IST'], ['sample', 0, 30], ['sample', 1, 30]]);
});

test('counts unanswered samples as lost', async () => {
  let count = 0;
  const env = fakeEnv(() => (++count === 3 ? { hang: true } : { entry: { duration: 20 } }));
  const result = await measure(target('https://a.test/'), { ...quick, samples: 4, warmup: 1, env });
  assert.deepEqual(result.samples, [20, null, 20, 20]);
  assert.equal(result.stats.loss, 0.25);
});

test('gives up at once on a target whose connection cannot be opened', async () => {
  const env = fakeEnv(() => ({ networkError: true }));
  await assert.rejects(measure(target('https://down.test/'), { ...quick, env }), UnreachableError);
  assert.equal(env.requests.length, 1);
});

test('measureFirst falls back to the next target', async () => {
  const env = fakeEnv((href) => (href.startsWith('https://down.test/') ? { networkError: true } : { entry: { duration: 25 } }));
  const result = await measureFirst([target('https://down.test/'), target('https://up.test/')], { ...quick, samples: 3, env });
  assert.equal(result.target.url, 'https://up.test/');
  assert.equal(result.stats.median, 25);
});

test('measureFirst fails when no target answers', async () => {
  const env = fakeEnv(() => ({ networkError: true }));
  await assert.rejects(measureFirst([target('https://a.test/'), target('https://b.test/')], { ...quick, env }), UnreachableError);
});

test('stops as soon as it is aborted', async () => {
  const controller = new AbortController();
  const env = fakeEnv(() => ({ entry: { duration: 10 }, delay: 2 }));
  const run = measure(target('https://a.test/'), {
    ...quick,
    samples: 100,
    warmup: 1,
    env,
    signal: controller.signal,
    onSample: (_, index) => index === 2 && controller.abort(),
  });
  await assert.rejects(run, { name: 'AbortError' });
  assert.equal(env.requests.length, 4);
});

test('spaces samples at least `interval` ms apart', async () => {
  const env = fakeEnv(() => ({ entry: { duration: 1 } }));
  const started = Date.now();
  await measure(target('https://a.test/'), { ...quick, interval: 30, samples: 3, warmup: 0, env });
  assert.ok(Date.now() - started >= 55);
});
