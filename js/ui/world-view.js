/**
 * The "Around the world" list: one row per region, west to east, each with
 * a bar for its fastest round trip. Distance sets a floor under latency and
 * congestion only adds to it, so the fastest of a few pings is the steadiest
 * measure of how far away a region is. Every bar shares one scale and grows
 * from the same edge; the nearest region is drawn at full strength.
 */
export function createWorldView(list, regions) {
  const doc = list.ownerDocument;
  const rows = new Map();

  for (const region of regions) {
    const item = doc.createElement('li');
    item.className = 'region';
    item.title = region.name;
    const city = doc.createElement('span');
    city.className = 'city';
    const track = doc.createElement('span');
    track.className = 'track';
    const bar = doc.createElement('span');
    bar.className = 'bar';
    bar.setAttribute('aria-hidden', 'true');
    const value = doc.createElement('span');
    value.className = 'ms';
    track.append(bar, value);
    item.append(city, track);
    list.append(item);
    rows.set(region.id, { item, city, bar, value });
  }

  /**
   * @param {Map<string, object|null>} results measure() results by region id; missing means pending.
   * @param {ReturnType<import('../i18n.js').createI18n>} i18n
   */
  function update(results, i18n) {
    const times = [...results.values()].map((result) => result?.stats.min).filter((v) => v != null);
    const longest = Math.max(1, ...times);
    const fastest = times.length > 0 ? Math.min(...times) : null;

    for (const region of regions) {
      const { item, city, bar, value } = rows.get(region.id);
      const done = results.has(region.id);
      const ms = results.get(region.id)?.stats.min ?? null;

      city.textContent = i18n.t(`region.${region.id}`);
      item.dataset.state = !done ? 'pending' : ms == null ? 'failed' : 'done';
      item.classList.toggle('is-fastest', ms != null && ms === fastest);
      bar.style.setProperty('--share', ms == null ? '0' : String(ms / longest));
      value.textContent = !done ? '' : ms == null ? i18n.t('world.noReply') : `${i18n.ms(ms)} ms`;
    }
  }

  return { update };
}
