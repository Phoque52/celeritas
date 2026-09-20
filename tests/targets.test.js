import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrace, EDGE_TARGETS, REGIONS } from '../js/data/targets.js';

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
  const all = [...EDGE_TARGETS, ...REGIONS];
  for (const target of all) assert.match(target.url, /^https:\/\//);
  assert.equal(new Set(all.map((t) => t.id)).size, all.length);
});

test('AWS regions point at their own DynamoDB ping endpoint', () => {
  for (const region of REGIONS) {
    assert.equal(region.url, `https://dynamodb.${region.id}.amazonaws.com/ping`);
  }
});
