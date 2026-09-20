/**
 * One timed HTTPS round trip.
 *
 * Browsers can't send ICMP pings, so latency is measured as the time a tiny
 * HTTPS request takes to reach a server and come back over an open
 * connection. The number is read from the Resource Timing API, which
 * timestamps the request inside the browser's network stack, so rendering
 * and other main-thread work can't inflate it. performance.now() is the
 * fallback when no timing entry is available.
 */

let counter = 0;

/** Adds a unique query parameter so no cache on the way can answer for the server. */
export function cacheBust(url) {
  counter = (counter + 1) % 1_000_000;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * Clears old Resource Timing entries. Browsers keep 250 by default and
 * silently drop new ones once the buffer is full, which would push later
 * runs onto the less precise clock.
 */
export function resetTimingBuffer(perf = globalThis.performance) {
  perf?.clearResourceTimings?.();
}

/**
 * The request-to-response time recorded in a Resource Timing entry.
 *
 * When the server sends Timing-Allow-Origin, requestStart and responseStart
 * are visible and exclude any DNS, TCP or TLS setup. Otherwise only the
 * total duration is exposed, which on a warm connection is the same round
 * trip plus the time to receive a few bytes.
 */
export function roundTrip(entry) {
  if (entry.requestStart > 0 && entry.responseStart >= entry.requestStart) {
    return entry.responseStart - entry.requestStart;
  }
  return entry.duration > 0 ? entry.duration : null;
}

/**
 * @param {string} url
 * @param {object} [options]
 * @param {'cors'|'no-cors'} [options.mode] no-cors works with any server but hides the response.
 * @param {boolean} [options.read] resolve with the response body as text.
 * @param {number} [options.timeout] milliseconds before the request counts as lost.
 * @param {AbortSignal} [options.signal]
 * @param {object} [options.env] fetch, performance and timer implementations, for tests.
 * @returns {Promise<{ok: true, rtt: number, body?: string} |
 *                   {ok: false, reason: 'timeout'|'network'|'http'|'aborted', status?: number}>}
 */
export async function probe(url, { mode = 'cors', read = false, timeout = 2000, signal, env = globalThis } = {}) {
  if (signal?.aborted) return { ok: false, reason: 'aborted' };

  const href = cacheBust(url);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = env.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const started = env.performance.now();
  try {
    const response = await env.fetch(href, {
      mode,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      priority: 'high',
      signal: controller.signal,
    });
    if (response.type !== 'opaque' && !response.ok) {
      response.body?.cancel().catch(() => {});
      return { ok: false, reason: 'http', status: response.status };
    }
    const body = read ? await response.text() : (await response.arrayBuffer(), undefined);
    const elapsed = env.performance.now() - started;
    const rtt = (await networkTime(href, env)) ?? elapsed;
    return read ? { ok: true, rtt, body } : { ok: true, rtt };
  } catch {
    if (signal?.aborted) return { ok: false, reason: 'aborted' };
    return { ok: false, reason: timedOut ? 'timeout' : 'network' };
  } finally {
    env.clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** Entries are queued once the response ends, so give the browser a few turns to add it. */
async function networkTime(href, env) {
  if (typeof env.performance.getEntriesByName !== 'function') return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [entry] = env.performance.getEntriesByName(href, 'resource');
    if (entry) return roundTrip(entry);
    await new Promise((resolve) => env.setTimeout(resolve, 0));
  }
  return null;
}
