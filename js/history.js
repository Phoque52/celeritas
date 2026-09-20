/**
 * Past results, kept only in this browser. Storage can be missing or throw
 * (private windows, blocked site data), so every access is guarded and the
 * app works the same without it.
 */

const KEY = 'celeritas.history.v1';
const LIMIT = 30;

/** @param {Storage|null} [storage] */
export function createHistory(storage = defaultStorage()) {
  function list() {
    try {
      const saved = JSON.parse(storage?.getItem(KEY) ?? '[]');
      return Array.isArray(saved) ? saved.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  return {
    /** Saved results, newest first. */
    list,
    latest: () => list()[0] ?? null,
    /** @param {{time: number, median: number, jitter: number, loss: number, colo?: string}} entry */
    add(entry) {
      const entries = [entry, ...list()].slice(0, LIMIT);
      try {
        storage?.setItem(KEY, JSON.stringify(entries));
      } catch {
        // Storage is full or blocked; this result just won't be remembered.
      }
      return entries;
    },
  };
}

function isEntry(entry) {
  return typeof entry === 'object' && entry !== null && Number.isFinite(entry.time) && Number.isFinite(entry.median);
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
