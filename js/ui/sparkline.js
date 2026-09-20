import { median } from '../engine/stats.js';

const SVG = 'http://www.w3.org/2000/svg';
const WIDTH = 240;
const HEIGHT = 44;
const PAD = { x: 5, top: 7, bottom: 5 };

/**
 * A small line chart of round trips as they arrive, on a scale from zero so
 * the wobble isn't exaggerated. Lost requests break the line and leave a tick
 * along the top; a hairline marks the median.
 *
 * Pointer, touch and arrow keys move a crosshair that reads out each
 * request. The hidden list in the figcaption gives screen readers the same
 * numbers.
 *
 * @param {HTMLElement} figure holds an <svg>, a .spark-tip, a .spark-summary and a .spark-data list.
 * @param {{total: number}} options how many samples a full run has.
 */
export function createSparkline(figure, { total }) {
  const doc = figure.ownerDocument;
  const svg = figure.querySelector('svg');
  const tip = figure.querySelector('.spark-tip');
  const summary = figure.querySelector('.spark-summary');
  const list = figure.querySelector('.spark-data');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

  const shape = (tag, className) => {
    const node = doc.createElementNS(SVG, tag);
    node.setAttribute('class', className);
    svg.append(node);
    return node;
  };
  const guide = shape('line', 'spark-median');
  const line = shape('path', 'spark-line');
  const lost = shape('path', 'spark-lost');
  const cross = shape('line', 'spark-cross');
  const end = shape('circle', 'spark-dot');
  const focus = shape('circle', 'spark-dot');
  end.setAttribute('r', '4');
  focus.setAttribute('r', '4');
  cross.setAttribute('y1', '0');
  cross.setAttribute('y2', String(HEIGHT));

  let samples = [];
  let i18n = null;
  let active = null; // sample index under the crosshair
  let top = 1; // value at the top edge

  const step = (WIDTH - 2 * PAD.x) / Math.max(1, total - 1);
  const x = (i) => PAD.x + i * step;
  const y = (value) => HEIGHT - PAD.bottom - (value / top) * (HEIGHT - PAD.top - PAD.bottom);
  const set = (node, attributes) => {
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value.toFixed(1));
  };
  const toggle = (node, visible) => {
    node.style.display = visible ? '' : 'none';
  };

  function update(next, nextI18n) {
    samples = next;
    i18n = nextI18n;
    figure.hidden = samples.length === 0;
    if (samples.length === 0) {
      hide();
      return;
    }

    const values = samples.filter((v) => v != null);
    top = Math.max(1, ...values) * 1.1;

    let path = '';
    let drawing = false;
    samples.forEach((value, i) => {
      if (value == null) {
        drawing = false;
        return;
      }
      path += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)} ${y(value).toFixed(1)}`;
      drawing = true;
    });
    line.setAttribute('d', path);
    lost.setAttribute('d', samples.map((v, i) => (v == null ? `M${x(i).toFixed(1)} 1V8` : '')).join(''));

    const middle = median(samples);
    toggle(guide, middle != null);
    if (middle != null) set(guide, { x1: PAD.x, x2: WIDTH - PAD.x, y1: y(middle), y2: y(middle) });

    const last = samples.findLastIndex((v) => v != null);
    toggle(end, last >= 0);
    if (last >= 0) set(end, { cx: x(last), cy: y(samples[last]) });

    describe(values);
    if (active != null) show(Math.min(active, samples.length - 1));
  }

  function label(i) {
    const value = samples[i];
    return value == null
      ? i18n.t('chart.lost', { index: i + 1 })
      : i18n.t('chart.sample', { index: i + 1, value: i18n.ms(value) });
  }

  function describe(values) {
    summary.textContent = values.length
      ? i18n.t('chart.label', { count: samples.length, min: i18n.ms(Math.min(...values)), max: i18n.ms(Math.max(...values)) })
      : '';
    list.replaceChildren(
      ...samples.map((_, i) => {
        const item = doc.createElement('li');
        item.textContent = label(i);
        return item;
      }),
    );
  }

  function show(i) {
    active = i;
    const value = samples[i];
    set(cross, { x1: x(i), x2: x(i) });
    toggle(cross, true);
    toggle(focus, value != null);
    if (value != null) set(focus, { cx: x(i), cy: y(value) });

    tip.textContent = label(i);
    tip.hidden = false;
    const width = svg.getBoundingClientRect().width;
    const half = tip.offsetWidth / 2;
    const left = (x(i) / WIDTH) * width;
    tip.style.left = `${Math.min(Math.max(left, half), width - half)}px`;
  }

  function hide() {
    active = null;
    toggle(cross, false);
    toggle(focus, false);
    tip.hidden = true;
  }

  function indexAt(clientX) {
    const box = svg.getBoundingClientRect();
    const position = ((clientX - box.left) / box.width) * WIDTH;
    return Math.min(samples.length - 1, Math.max(0, Math.round((position - PAD.x) / step)));
  }

  svg.addEventListener('pointermove', (event) => samples.length > 0 && show(indexAt(event.clientX)));
  svg.addEventListener('pointerleave', hide);
  figure.addEventListener('focus', () => samples.length > 0 && show(samples.length - 1));
  figure.addEventListener('blur', hide);
  figure.addEventListener('keydown', (event) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (active == null || !(event.key in moves)) return;
    event.preventDefault();
    show(Math.min(samples.length - 1, Math.max(0, active + moves[event.key])));
  });

  hide();
  return { update };
}
