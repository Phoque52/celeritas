import { measure, isAbortError } from './measure.js';

/**
 * Measures latency to many regions with a small pool of parallel workers.
 * Each region has its own connection and the requests are tiny, so a few
 * at a time barely affect each other and the survey stays short.
 *
 * Regions that don't answer get a null result instead of failing the survey.
 *
 * @param {Array<object>} regions targets, as accepted by measure().
 * @param {object} [options] measure() options, plus:
 * @param {number} [options.concurrency] regions measured at the same time.
 * @param {(region: object, result: object|null) => void} [options.onResult]
 * @returns {Promise<Map<string, object|null>>} results keyed by region id.
 */
export async function survey(regions, { concurrency = 6, onResult, ...options } = {}) {
  const queue = [...regions];
  const results = new Map();

  async function worker() {
    while (queue.length > 0) {
      const region = queue.shift();
      let result = null;
      try {
        result = await measure(region, options);
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
      results.set(region.id, result);
      onResult?.(region, result);
    }
  }

  const workers = Math.max(1, Math.min(concurrency, queue.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
