import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrace, EDGE_TARGETS } from '../js/data/targets.js';

test('parseTrace keeps only the data center code', () => {
  const reply = 'fl=12f\nh=1.1.1.1\nip=203.0.113.9\nts=1789839698.6\nuag=Mozilla/5.0\ncolo=IST\nhttp=http/2\nloc=TR\n';
  assert.deepEqual(parseTrace(reply), { colo: 'IST' });
});

test('parseTrace tolerates empty or unexpected replies', () => {
  assert.deepEqual(parseTrace(''), {});
  assert.deepEqual(parseTrace('<html>blocked</html>'), {});
  assert.deepEqual(parseTrace(), {});
});

test('every target uses HTTPS and has a unique id', () => {
  for (const target of EDGE_TARGETS) assert.match(target.url, /^https:\/\//);
  assert.equal(new Set(EDGE_TARGETS.map((t) => t.id)).size, EDGE_TARGETS.length);
});
