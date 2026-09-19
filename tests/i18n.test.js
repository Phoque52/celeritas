import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, LANGUAGES, detectLanguage, createI18n } from '../js/i18n.js';
import { REGIONS } from '../js/data/targets.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every language has the same keys', () => {
  const [first, ...rest] = LANGUAGES;
  for (const lang of rest) {
    assert.deepEqual(Object.keys(MESSAGES[lang]).sort(), Object.keys(MESSAGES[first]).sort(), lang);
  }
});

test('translations use the same placeholders as English', () => {
  for (const lang of LANGUAGES) {
    for (const [key, text] of Object.entries(MESSAGES[lang])) {
      assert.deepEqual(placeholders(text), placeholders(MESSAGES.en[key]), `${lang} ${key}`);
    }
  }
});

test('every region has a city name in every language', () => {
  for (const lang of LANGUAGES) {
    for (const region of REGIONS) assert.ok(MESSAGES[lang][`region.${region.id}`], `${lang} ${region.id}`);
  }
});

test('detectLanguage picks the first supported browser language', () => {
  assert.equal(detectLanguage(['tr-TR', 'en-US']), 'tr');
  assert.equal(detectLanguage(['de-DE', 'tr']), 'tr');
  assert.equal(detectLanguage(['en-GB', 'tr']), 'en');
  assert.equal(detectLanguage(['TR']), 'tr');
  assert.equal(detectLanguage(['fr']), 'en');
  assert.equal(detectLanguage([]), 'en');
});

test('t fills placeholders and falls back to the key', () => {
  const { t } = createI18n('en');
  assert.equal(t('status.measuring', { done: 3, total: 16 }), 'Measuring 3 of 16');
  assert.equal(t('status.measuring', { done: 3 }), 'Measuring 3 of {total}');
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('an unknown language falls back to English', () => {
  assert.equal(createI18n('xx').lang, 'en');
});

test('durations are whole milliseconds in the local format', () => {
  const en = createI18n('en');
  const tr = createI18n('tr');
  assert.equal(en.ms(42.4), '42');
  assert.equal(en.ms(0.3), '<1');
  assert.equal(en.ms(0), '0');
  assert.equal(en.ms(null), '—');
  assert.equal(en.ms(1234), '1,234');
  assert.equal(tr.ms(1234), '1.234');
});

test('percentages follow each language’s convention', () => {
  assert.equal(createI18n('en').percent(0.0625), '6%');
  assert.equal(createI18n('tr').percent(0.0625), '%6');
});
