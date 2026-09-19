/**
 * Rates a connection for everyday uses from its median ping, jitter and loss.
 *
 * The limits follow common guidance for each use, with a little headroom
 * because an HTTPS round trip runs a few milliseconds above an ICMP ping over
 * the same path. Loss is the share of requests with no reply: with 16
 * samples, one lost request is 6.25%, so gaming tolerates none, calls one
 * and streaming two.
 */
export const LIMITS = {
  gaming: { ping: 60, jitter: 15, loss: 0.01 },
  calls: { ping: 150, jitter: 30, loss: 0.07 },
  streaming: { ping: 300, jitter: Infinity, loss: 0.15 },
};

/**
 * @param {{median: number|null, jitter: number|null, loss: number}} stats
 * @returns {{grade: 'excellent'|'good'|'fair'|'slow'|'poor'|'none',
 *            uses: {gaming: boolean, calls: boolean, streaming: boolean}}}
 */
export function verdict({ median, jitter, loss }) {
  if (median == null) {
    return { grade: 'none', uses: { gaming: false, calls: false, streaming: false } };
  }
  const fits = (limit) => median <= limit.ping && jitter <= limit.jitter && loss <= limit.loss;
  const uses = { gaming: fits(LIMITS.gaming), calls: fits(LIMITS.calls), streaming: fits(LIMITS.streaming) };

  let grade = 'poor';
  if (uses.gaming) grade = median <= 30 && jitter <= 5 && loss === 0 ? 'excellent' : 'good';
  else if (uses.calls) grade = 'fair';
  else if (uses.streaming) grade = 'slow';
  return { grade, uses };
}
