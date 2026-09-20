import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { MESSAGES } from '../js/i18n.js';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('index.html', root), 'utf8');

test('every local file the page references exists', async () => {
  const references = [...page.matchAll(/(?:href|src|srcset)="([^"#:]+)"/g)].map((match) => match[1]);
  assert.ok(references.length > 10);
  for (const reference of references) {
    await assert.doesNotReject(access(new URL(reference, root)), reference);
  }
});

test('every translated element has a message', () => {
  for (const [, key] of page.matchAll(/data-i18n="([^"]+)"/g)) {
    assert.ok(MESSAGES.en[key], key);
  }
});

test('the interface modules load outside a browser', async () => {
  const { createApp } = await import('../js/ui/app.js');
  const { createSparkline } = await import('../js/ui/sparkline.js');
  const { createWorldView } = await import('../js/ui/world-view.js');
  for (const factory of [createApp, createSparkline, createWorldView]) assert.equal(typeof factory, 'function');
});
