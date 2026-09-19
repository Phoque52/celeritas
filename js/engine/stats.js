/**
 * Summary statistics for a run of latency samples.
 *
 * A sample is a round-trip time in milliseconds, or null when the request
 * got no answer in time. Null samples count as lost, like a dropped ping.
 */

/** @param {Array<number|null>} samples */
export function summarize(samples) {
  const received = samples.filter(isValue);
  const sent = samples.length;
  const lost = sent - received.length;
  const counts = { sent, received: received.length, lost, loss: sent === 0 ? 0 : lost / sent };

  if (received.length === 0) {
    return { ...counts, min: null, max: null, mean: null, median: null, jitter: null };
  }

  const sorted = [...received].sort((a, b) => a - b);
  return {
    ...counts,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: received.reduce((sum, x) => sum + x, 0) / received.length,
    median: quantile(sorted, 0.5),
    jitter: jitter(received),
  };
}

/** Quantile of an ascending array, interpolating between neighbours. */
export function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function median(samples) {
  return quantile(samples.filter(isValue).sort((a, b) => a - b), 0.5);
}

/**
 * Average change between consecutive samples: how much the latency wobbles
 * from one request to the next. Most speed tests report jitter this way;
 * RFC 3550's interarrival jitter is the same idea with smoothing added.
 */
export function jitter(samples) {
  const values = samples.filter(isValue);
  if (values.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < values.length; i++) total += Math.abs(values[i] - values[i - 1]);
  return total / (values.length - 1);
}

function isValue(x) {
  return typeof x === 'number' && Number.isFinite(x);
}
