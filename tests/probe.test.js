import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probe, cacheBust, roundTrip } from '../js/engine/probe.js';
import { fakeEnv } from './fake-env.js';

const URL = 'https://example.test/ping';

test('uses the request-to-response time when the server allows detailed timing', async () => {
  const env = fakeEnv(() => ({ elapsed: 90, entry: { requestStart: 100, responseStart: 142.5, duration: 88 } }));
  assert.deepEqual(await probe(URL, { env }), { ok: true, rtt: 42.5 });
});

test('falls back to the entry duration without Timing-Allow-Origin', async () => {
  const env = fakeEnv(() => ({ elapsed: 90, entry: { duration: 51 } }));
  assert.equal((await probe(URL, { env })).rtt, 51);
});

test('falls back to the clock when the browser records no entry', async () => {
  const env = fakeEnv(() => ({ elapsed: 63 }));
  assert.equal((await probe(URL, { env })).rtt, 63);
});

test('makes every URL unique so no cache can answer', () => {
  const first = cacheBust(URL);
  assert.notEqual(first, cacheBust(URL));
  assert.match(first, /^https:\/\/example\.test\/ping\?_=\w+$/);
  assert.match(cacheBust('https://example.test/down?bytes=0'), /\?bytes=0&_=\w+$/);
});

test('sends no cookies or referrer and skips the HTTP cache', async () => {
  const env = fakeEnv();
  await probe(URL, { env, mode: 'no-cors' });
  const { init } = env.requests[0];
  assert.equal(init.cache, 'no-store');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.referrerPolicy, 'no-referrer');
  assert.equal(init.mode, 'no-cors');
});

test('reports a timeout when the server does not answer', async () => {
  const env = fakeEnv(() => ({ hang: true }));
  assert.deepEqual(await probe(URL, { env, timeout: 20 }), { ok: false, reason: 'timeout' });
});

test('reports aborted when the caller stops it', async () => {
  const env = fakeEnv(() => ({ hang: true }));
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5);
  assert.deepEqual(await probe(URL, { env, timeout: 1000, signal: controller.signal }), { ok: false, reason: 'aborted' });
});

test('sends nothing when already aborted', async () => {
  const env = fakeEnv();
  assert.equal((await probe(URL, { env, signal: AbortSignal.abort() })).reason, 'aborted');
  assert.equal(env.requests.length, 0);
});

test('reports unreachable hosts as network errors', async () => {
  const env = fakeEnv(() => ({ networkError: true }));
  assert.deepEqual(await probe(URL, { env }), { ok: false, reason: 'network' });
});

test('treats HTTP errors as lost', async () => {
  const env = fakeEnv(() => ({ status: 503 }));
  assert.deepEqual(await probe(URL, { env }), { ok: false, reason: 'http', status: 503 });
});

test('accepts opaque no-cors replies', async () => {
  const env = fakeEnv(() => ({ type: 'opaque', entry: { duration: 37 } }));
  assert.deepEqual(await probe(URL, { env, mode: 'no-cors' }), { ok: true, rtt: 37 });
});

test('returns the body when asked to', async () => {
  const env = fakeEnv(() => ({ body: 'colo=IST', entry: { duration: 12 } }));
  assert.deepEqual(await probe(URL, { env, read: true }), { ok: true, rtt: 12, body: 'colo=IST' });
});

test('roundTrip prefers the detailed timestamps and rejects empty entries', () => {
  assert.equal(roundTrip({ requestStart: 10, responseStart: 30, duration: 50 }), 20);
  assert.equal(roundTrip({ requestStart: 0, responseStart: 0, duration: 44 }), 44);
  assert.equal(roundTrip({ requestStart: 0, responseStart: 0, duration: 0 }), null);
});
