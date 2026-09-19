import { probe } from './probe.js';
import { summarize } from './stats.js';

export class UnreachableError extends Error {
  constructor(target) {
    super(`${target.name} did not respond`);
    this.name = 'UnreachableError';
    this.target = target;
  }
}

export function abortError() {
  return new DOMException('The measurement was stopped.', 'AbortError');
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

/**
 * Measures latency to one target.
 *
 * The first `warmup` requests open the connection (a DNS lookup plus TCP and
 * TLS handshakes, several round trips in all) and are not counted. The
 * samples that follow reuse that connection, so each is a single round trip.
 *
 * @param {{name: string, url: string, mode?: string, parse?: (body: string) => object}} target
 * @param {object} [options]
 * @param {number} [options.samples] round trips to time.
 * @param {number} [options.warmup] requests sent first and not counted.
 * @param {number} [options.interval] minimum ms between the starts of two samples.
 * @param {number} [options.timeout] ms before a sample counts as lost.
 * @param {number} [options.warmupTimeout] ms allowed for opening the connection.
 * @param {AbortSignal} [options.signal]
 * @param {(target: object, meta: object) => void} [options.onReady] called when sampling starts.
 * @param {(rtt: number|null, index: number) => void} [options.onSample]
 * @param {object} [options.env] see probe().
 */
export async function measure(target, {
  samples = 16,
  warmup = 2,
  interval = 50,
  timeout = 2000,
  warmupTimeout = 4000,
  signal,
  onReady,
  onSample,
  env = globalThis,
} = {}) {
  let meta = {};
  for (let i = 0; i < warmup; i++) {
    const result = await probe(target.url, {
      mode: target.mode,
      read: Boolean(target.parse),
      timeout: warmupTimeout,
      signal,
      env,
    });
    if (result.reason === 'aborted') throw abortError();
    if (!result.ok) {
      // If the connection can't even be opened, don't spend time sampling it.
      if (i === 0) throw new UnreachableError(target);
      continue;
    }
    if (target.parse) meta = { ...meta, ...target.parse(result.body) };
  }
  onReady?.(target, meta);

  const rtts = [];
  for (let i = 0; i < samples; i++) {
    const started = env.performance.now();
    const result = await probe(target.url, { mode: target.mode, timeout, signal, env });
    if (result.reason === 'aborted') throw abortError();
    const rtt = result.ok ? result.rtt : null;
    rtts.push(rtt);
    onSample?.(rtt, i);
    const pause = interval - (env.performance.now() - started);
    if (pause > 0 && i < samples - 1) await sleep(pause, signal, env);
  }

  return { target, meta, samples: rtts, stats: summarize(rtts) };
}

/** Measures the first target that answers, trying them in order. */
export async function measureFirst(targets, options = {}) {
  let lastError = new Error('No targets to measure');
  for (const target of targets) {
    try {
      return await measure(target, options);
    } catch (error) {
      if (isAbortError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function sleep(ms, signal, env) {
  return new Promise((resolve, reject) => {
    const timer = env.setTimeout(() => {
      signal?.removeEventListener('abort', stop);
      resolve();
    }, ms);
    function stop() {
      env.clearTimeout(timer);
      reject(abortError());
    }
    if (signal?.aborted) return stop();
    signal?.addEventListener('abort', stop, { once: true });
  });
}
