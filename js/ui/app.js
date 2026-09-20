import { measureFirst, isAbortError, abortError } from '../engine/measure.js';
import { resetTimingBuffer } from '../engine/probe.js';
import { summarize } from '../engine/stats.js';
import { verdict } from '../engine/verdict.js';
import { survey } from '../engine/world.js';
import { EDGE_TARGETS, REGIONS } from '../data/targets.js';
import { createHistory } from '../history.js';
import { createI18n, detectLanguage, LANGUAGES } from '../i18n.js';
import { createSparkline } from './sparkline.js';
import { createWorldView } from './world-view.js';

/** 16 round trips to the nearest data center, at most one every 60 ms. */
const EDGE = { samples: 16, warmup: 2, interval: 60, timeout: 2000, warmupTimeout: 4000 };
/** Three round trips to each AWS region, six regions at a time. */
const WORLD = { samples: 3, warmup: 1, interval: 0, timeout: 3000, warmupTimeout: 5000, concurrency: 6 };

const SITE_URL = 'https://phoque52.github.io/celeritas/';
const LANGUAGE_KEY = 'celeritas.lang';
const RUNNING = new Set(['connecting', 'measuring', 'world']);

/**
 * Wires the engine to the page. All state lives in `state`; render() is the
 * only place that writes to the DOM, so every phase can be redrawn at any
 * time, including after switching language mid-test.
 */
export function createApp(doc) {
  const win = doc.defaultView;
  const $ = (id) => doc.getElementById(id);
  const el = {
    run: $('run'),
    hint: $('hint'),
    globe: $('globe'),
    reading: $('reading'),
    value: $('value'),
    note: $('note'),
    stats: $('stats'),
    verdict: $('verdict'),
    copy: $('copy'),
    world: $('world'),
    announcer: $('announcer'),
    about: $('about'),
    aboutOpen: $('about-open'),
    languages: $('languages'),
  };

  const history = createHistory();
  const sparkline = createSparkline($('spark'), { total: EDGE.samples });
  const worldView = createWorldView($('world-list'), REGIONS);
  const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');

  let i18n = createI18n(savedLanguage() ?? detectLanguage());
  let controller = null;
  let cities = null;
  let lastPulse = 0;
  let copyTimer = 0;

  const state = {
    phase: 'idle', // idle | connecting | measuring | world | done | stopped | failed
    online: win.navigator.onLine !== false,
    samples: [], // round trips to the nearest server so far, null when lost
    colo: null, // Cloudflare data center code, e.g. "IST"
    result: null, // { stats, verdict } once the local test is done
    previous: null, // the last saved result, for comparison
    world: new Map(), // region id -> measure() result, or null when unreachable
    copied: false,
  };

  function start() {
    el.run.addEventListener('click', toggle);
    el.copy.addEventListener('click', copyResult);
    el.aboutOpen.addEventListener('click', () => el.about.showModal());
    // A click on the dialog element itself (not its content) is a click on the backdrop.
    el.about.addEventListener('click', (event) => event.target === el.about && el.about.close());
    el.languages.addEventListener('click', (event) => {
      const lang = event.target.closest('[data-lang]')?.dataset.lang;
      if (lang) setLanguage(lang);
    });
    doc.addEventListener('keydown', onKey);
    win.addEventListener('online', () => {
      state.online = true;
      render();
    });
    win.addEventListener('offline', () => {
      state.online = false;
      stop();
      render();
    });
    applyLanguage();
  }

  function toggle() {
    if (controller) stop();
    else run();
  }

  function stop() {
    controller?.abort();
  }

  async function run() {
    controller = new AbortController();
    const { signal } = controller;
    Object.assign(state, {
      phase: 'connecting',
      samples: [],
      colo: null,
      result: null,
      previous: history.latest(),
      world: new Map(),
    });
    render();

    try {
      // Let the globe and fonts finish downloading so they don't compete with the test.
      await pageLoaded(3000);
      if (signal.aborted) throw abortError();
      resetTimingBuffer();

      const { stats } = await measureFirst(EDGE_TARGETS, {
        ...EDGE,
        signal,
        onReady(target, meta) {
          state.phase = 'measuring';
          state.colo = meta.colo ?? null;
          if (state.colo) loadCities();
          render();
        },
        onSample(rtt) {
          state.samples.push(rtt);
          if (rtt != null) pulse();
          render();
        },
      });

      state.result = { stats, verdict: verdict(stats) };
      announce(summaryText());
      if (stats.median == null) {
        state.phase = 'done';
        return;
      }
      history.add({ time: Date.now(), median: stats.median, jitter: stats.jitter, loss: stats.loss, colo: state.colo ?? undefined });

      state.phase = 'world';
      render();
      await survey(REGIONS, {
        ...WORLD,
        signal,
        onResult(region, result) {
          state.world.set(region.id, result);
          if (result) pulse();
          render();
        },
      });
      state.phase = 'done';
    } catch (error) {
      state.phase = isAbortError(error) ? 'stopped' : 'failed';
      if (state.phase === 'failed') announce(noteText());
    } finally {
      controller = null;
      render();
    }
  }

  function render() {
    const { t } = i18n;
    const running = RUNNING.has(state.phase);
    doc.body.dataset.phase = state.phase;

    el.run.textContent = t(running ? 'action.stop' : state.phase === 'idle' ? 'action.start' : 'action.again');
    el.run.disabled = !running && !state.online;
    el.hint.hidden = state.phase !== 'idle' || !state.online;

    const stats = state.result?.stats ?? summarize(state.samples);
    el.reading.hidden = stats.median == null;
    el.reading.classList.toggle('is-live', !state.result);
    el.value.textContent = i18n.ms(stats.median);

    const note = noteText();
    el.note.textContent = note;
    el.note.hidden = note === '';

    el.stats.hidden = stats.received === 0;
    if (stats.received > 0) el.stats.textContent = statsText(stats);
    sparkline.update(state.samples, i18n);

    el.verdict.hidden = !state.result;
    if (state.result) el.verdict.textContent = t(`verdict.${state.result.verdict.grade}`);
    el.copy.hidden = stats.median == null || !state.result || !win.navigator.clipboard;
    el.copy.textContent = t(state.copied ? 'action.copied' : 'action.copy');

    el.world.hidden = state.world.size === 0 && state.phase !== 'world';
    worldView.update(state.world, i18n);
  }

  function noteText() {
    const { t } = i18n;
    if (!state.online && !RUNNING.has(state.phase)) return t('status.offline');
    switch (state.phase) {
      case 'idle':
        return t('status.idle');
      case 'connecting':
        return t('status.connecting');
      case 'measuring':
        return t('status.measuring', { done: state.samples.length, total: EDGE.samples });
      case 'world':
        return t('status.world');
      case 'stopped':
        return t('status.stopped');
      case 'failed':
        return t('status.failed');
      default:
        return comparisonText();
    }
  }

  function comparisonText() {
    const now = state.result?.stats.median;
    if (now == null || !state.previous) return '';
    const difference = Math.round(now) - Math.round(state.previous.median);
    if (difference === 0) return i18n.t('delta.same');
    return i18n.t(difference < 0 ? 'delta.faster' : 'delta.slower', { value: i18n.ms(Math.abs(difference)) });
  }

  function statsText(stats) {
    const { t } = i18n;
    const parts = [t('stats.jitter', { value: i18n.ms(stats.jitter) }), t('stats.loss', { value: i18n.percent(stats.loss) })];
    if (state.colo) parts.push(t('stats.via', { place: cities?.[state.colo] ?? state.colo }));
    return parts.join(' · ');
  }

  function summaryText() {
    const { stats, verdict: rating } = state.result;
    const grade = i18n.t(`verdict.${rating.grade}`);
    if (stats.median == null) return grade;
    return i18n.t('announce.result', {
      ping: i18n.ms(stats.median),
      jitter: i18n.ms(stats.jitter),
      loss: i18n.percent(stats.loss),
      verdict: grade,
    });
  }

  function announce(text) {
    el.announcer.textContent = text;
  }

  /** Sends a ring out from the globe, at most every 240 ms so bursts stay calm. */
  function pulse() {
    if (reducedMotion.matches) return;
    const now = win.performance.now();
    if (now - lastPulse < 240) return;
    lastPulse = now;
    const ring = doc.createElement('span');
    ring.className = 'ring';
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    el.globe.append(ring);
  }

  /** City names for data center codes are only needed after the first test, so load them then. */
  async function loadCities() {
    if (cities) return;
    try {
      cities = (await import('../data/colos.js')).default;
      render();
    } catch {
      // Keep showing the code.
    }
  }

  async function copyResult() {
    const { stats } = state.result;
    const text = i18n.t('share.text', {
      ping: i18n.ms(stats.median),
      jitter: i18n.ms(stats.jitter),
      loss: i18n.percent(stats.loss),
      url: SITE_URL,
    });
    try {
      await win.navigator.clipboard.writeText(text);
    } catch {
      return; // Clipboard access denied; nothing to confirm.
    }
    state.copied = true;
    render();
    win.clearTimeout(copyTimer);
    copyTimer = win.setTimeout(() => {
      state.copied = false;
      render();
    }, 2000);
  }

  function onKey(event) {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || el.about.open) return;
    if (event.key === 'Escape' && controller) {
      stop();
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Buttons, links and the chart handle these keys themselves.
    if (event.target.closest?.('a, button, input, select, textarea, [tabindex], [contenteditable]')) return;
    event.preventDefault();
    if (!el.run.disabled) toggle();
  }

  function savedLanguage() {
    try {
      const lang = win.localStorage.getItem(LANGUAGE_KEY);
      return LANGUAGES.includes(lang) ? lang : null;
    } catch {
      return null;
    }
  }

  function setLanguage(lang) {
    i18n = createI18n(lang);
    try {
      win.localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Not remembered, but the switch still applies.
    }
    applyLanguage();
  }

  function applyLanguage() {
    const { t, lang } = i18n;
    doc.documentElement.lang = lang;
    doc.title = t('page.title');
    for (const node of doc.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    el.languages.setAttribute('aria-label', t('lang.label'));
    for (const button of el.languages.querySelectorAll('[data-lang]')) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    }
    render();
  }

  function pageLoaded(timeout) {
    if (doc.readyState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timer = win.setTimeout(resolve, timeout);
      win.addEventListener(
        'load',
        () => {
          win.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }

  return { start };
}
