/**
 * Stand-ins for fetch, performance and timers so the engine can be tested
 * without a network. `reply(href, init, env)` describes each response:
 *
 *   elapsed       ms the fake clock advances before the response arrives
 *   entry         Resource Timing fields recorded for the request
 *   status, type  the response status and type ('cors' or 'opaque')
 *   body          response text
 *   delay         real ms to wait before answering
 *   hang          never answer (until aborted)
 *   networkError  fail like an unreachable host
 */
export function fakeEnv(reply = () => ({})) {
  const env = {
    clock: 0,
    requests: [],
    entries: new Map(),
    performance: {
      now: () => env.clock,
      getEntriesByName: (name) => (env.entries.has(name) ? [env.entries.get(name)] : []),
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    fetch(href, init) {
      env.requests.push({ href, init });
      const r = reply(href, init, env) ?? {};
      return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (init.signal.aborted) return abort();
        init.signal.addEventListener('abort', abort, { once: true });
        if (r.hang) return;
        setTimeout(() => {
          if (init.signal.aborted) return;
          if (r.networkError) return reject(new TypeError('Failed to fetch'));
          env.clock += r.elapsed ?? 0;
          if (r.entry) env.entries.set(href, { requestStart: 0, responseStart: 0, duration: 0, ...r.entry });
          const type = r.type ?? 'cors';
          const status = r.status ?? (type === 'opaque' ? 0 : 200);
          resolve({
            type,
            status,
            ok: type !== 'opaque' && status >= 200 && status < 300,
            body: { cancel: async () => {} },
            text: async () => r.body ?? '',
            arrayBuffer: async () => new ArrayBuffer(0),
          });
        }, r.delay ?? 0);
      });
    },
  };
  return env;
}
