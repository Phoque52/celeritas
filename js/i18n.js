/**
 * English and Turkish text. Every key must exist in both languages with the
 * same {placeholders}; tests/i18n.test.js checks this.
 */
export const MESSAGES = {
  en: {
    'page.title': 'Celeritas — a minimalist ping test',
    'lang.label': 'Language',

    'action.start': 'Ping',
    'action.stop': 'Stop',
    'action.again': 'Ping again',
    'action.copy': 'Copy result',
    'action.copied': 'Copied',
    'hint.keys': 'or press Space',

    'status.idle': 'Waiting for ping…',
    'status.connecting': 'Connecting…',
    'status.measuring': 'Measuring {done} of {total}',
    'status.world': 'Pinging the world…',
    'status.stopped': 'Stopped.',
    'status.offline': 'You’re offline.',
    'status.failed': 'No test server answered. Check your connection and try again.',

    'stats.jitter': 'jitter {value} ms',
    'stats.loss': 'loss {value}',
    'stats.via': 'via {place}',

    'delta.faster': '{value} ms faster than last time',
    'delta.slower': '{value} ms slower than last time',
    'delta.same': 'Same as last time',

    'verdict.excellent': 'Excellent — as quick as connections get.',
    'verdict.good': 'Good — smooth for gaming, video calls and streaming.',
    'verdict.fair': 'Fair — fine for calls and streaming; fast games may feel laggy.',
    'verdict.unstable': 'Unstable — the delay keeps jumping; calls and games may stutter.',
    'verdict.slow': 'Slow — fine for browsing and streaming, but calls and games will lag.',
    'verdict.poor': 'Poor — expect lag and dropouts.',
    'verdict.none': 'No replies — your connection may be down.',

    'world.title': 'Around the world',
    'world.note': 'AWS data centers, best of 3 pings',
    'world.noReply': 'no reply',
    'region.us-west-1': 'California',
    'region.us-east-1': 'Virginia',
    'region.sa-east-1': 'São Paulo',
    'region.eu-west-2': 'London',
    'region.eu-central-1': 'Frankfurt',
    'region.eu-north-1': 'Stockholm',
    'region.af-south-1': 'Cape Town',
    'region.me-central-1': 'UAE',
    'region.ap-south-1': 'Mumbai',
    'region.ap-southeast-1': 'Singapore',
    'region.ap-northeast-1': 'Tokyo',
    'region.ap-southeast-2': 'Sydney',

    'chart.label': 'Round trips for {count} requests, {min} to {max} ms',
    'chart.sample': 'Request {index}: {value} ms',
    'chart.lost': 'Request {index}: no reply',

    'share.text': 'Ping {ping} ms, jitter {jitter} ms, loss {loss}. Measured with Celeritas: {url}',
    'announce.result': 'Ping {ping} milliseconds, jitter {jitter} milliseconds, loss {loss}. {verdict}',

    'about.open': 'How it works',
    'about.title': 'How it works',
    'about.p1': 'Browsers can’t send real ping packets, so Celeritas times tiny HTTPS requests instead.',
    'about.p2':
      'It first opens a connection to the nearest Cloudflare data center, so the one-time setup (DNS, TCP and TLS) isn’t counted. Then it sends 16 requests, one after another, and reads each round trip from your browser’s own network timing.',
    'about.p3':
      'Ping is the median round trip. Jitter is how much one round trip differs from the next, on average. Loss is the share of requests with no reply within 2 seconds.',
    'about.p4':
      'The world list does the same with 12 AWS data centers, three requests each, and shows the fastest. Celeritas has no server of its own and collects nothing: your past results stay in this browser, and the servers it pings only see an ordinary web request.',
    'about.close': 'Close',
    'footer.source': 'Source code',
  },

  tr: {
    'page.title': 'Celeritas — minimalist ping testi',
    'lang.label': 'Dil',

    'action.start': 'Ping Gönder',
    'action.stop': 'Durdur',
    'action.again': 'Tekrar Gönder',
    'action.copy': 'Sonucu kopyala',
    'action.copied': 'Kopyalandı',
    'hint.keys': 'ya da boşluk tuşuna basın',

    'status.idle': 'Ping bekleniyor…',
    'status.connecting': 'Bağlanılıyor…',
    'status.measuring': 'Ölçülüyor: {done}/{total}',
    'status.world': 'Dünyaya ping atılıyor…',
    'status.stopped': 'Durduruldu.',
    'status.offline': 'Çevrimdışısınız.',
    'status.failed': 'Hiçbir test sunucusu yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.',

    'stats.jitter': 'jitter {value} ms',
    'stats.loss': 'kayıp {value}',
    'stats.via': '{place} üzerinden',

    'delta.faster': 'Geçen seferden {value} ms daha hızlı',
    'delta.slower': 'Geçen seferden {value} ms daha yavaş',
    'delta.same': 'Geçen seferle aynı',

    'verdict.excellent': 'Mükemmel — bağlantı bundan hızlı olmaz.',
    'verdict.good': 'İyi — oyun, görüntülü görüşme ve yayın için akıcı.',
    'verdict.fair': 'Orta — görüşme ve yayın için yeterli; hızlı oyunlarda gecikme hissedilebilir.',
    'verdict.unstable': 'Dengesiz — gecikme sürekli dalgalanıyor; görüşme ve oyunlarda takılmalar olabilir.',
    'verdict.slow': 'Yavaş — gezinme ve yayın için yeterli; görüşme ve oyunlarda gecikme olur.',
    'verdict.poor': 'Zayıf — gecikme ve kopmalar beklenebilir.',
    'verdict.none': 'Yanıt yok — bağlantınız kesilmiş olabilir.',

    'world.title': 'Dünya genelinde',
    'world.note': 'AWS veri merkezleri, 3 pingin en iyisi',
    'world.noReply': 'yanıt yok',
    'region.us-west-1': 'Kaliforniya',
    'region.us-east-1': 'Virginia',
    'region.sa-east-1': 'São Paulo',
    'region.eu-west-2': 'Londra',
    'region.eu-central-1': 'Frankfurt',
    'region.eu-north-1': 'Stockholm',
    'region.af-south-1': 'Cape Town',
    'region.me-central-1': 'BAE',
    'region.ap-south-1': 'Mumbai',
    'region.ap-southeast-1': 'Singapur',
    'region.ap-northeast-1': 'Tokyo',
    'region.ap-southeast-2': 'Sidney',

    'chart.label': '{count} isteğin gidiş-dönüş süresi, {min}–{max} ms',
    'chart.sample': '{index}. istek: {value} ms',
    'chart.lost': '{index}. istek: yanıt yok',

    'share.text': 'Ping {ping} ms, jitter {jitter} ms, kayıp {loss}. Celeritas ile ölçüldü: {url}',
    'announce.result': 'Ping {ping} milisaniye, jitter {jitter} milisaniye, kayıp {loss}. {verdict}',

    'about.open': 'Nasıl çalışır?',
    'about.title': 'Nasıl çalışır?',
    'about.p1': 'Tarayıcılar gerçek ping paketi gönderemez; bu yüzden Celeritas küçük HTTPS isteklerinin süresini ölçer.',
    'about.p2':
      'Önce size en yakın Cloudflare veri merkezine bağlanır; böylece tek seferlik kurulum (DNS, TCP ve TLS) sonuca katılmaz. Ardından art arda 16 istek gönderir ve her gidiş-dönüşü tarayıcınızın kendi ağ zamanlamasından okur.',
    'about.p3':
      'Ping, gidiş-dönüş sürelerinin ortancasıdır. Jitter, bir ölçümün bir sonrakinden ortalama ne kadar farklı olduğunu gösterir. Kayıp, 2 saniye içinde yanıt alınamayan isteklerin oranıdır.',
    'about.p4':
      'Dünya listesi aynı ölçümü 12 AWS veri merkeziyle, her birine üç istek göndererek yapar ve en hızlısını gösterir. Celeritas’ın kendi sunucusu yoktur ve hiçbir veri toplamaz: geçmiş sonuçlarınız bu tarayıcıda kalır, ping atılan sunucular ise yalnızca sıradan bir web isteği görür.',
    'about.close': 'Kapat',
    'footer.source': 'Kaynak kod',
  },
};

export const LANGUAGES = Object.keys(MESSAGES);

/** The first supported language in the visitor's browser preferences, else English. */
export function detectLanguage(preferred = globalThis.navigator?.languages ?? []) {
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LANGUAGES.includes(base)) return base;
  }
  return 'en';
}

export function createI18n(lang) {
  const code = LANGUAGES.includes(lang) ? lang : 'en';
  const messages = MESSAGES[code];
  const number = new Intl.NumberFormat(code, { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 0 });

  return {
    lang: code,
    /** The message for `key`, with {placeholders} filled from `values`. */
    t(key, values = {}) {
      const template = messages[key] ?? key;
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match));
    },
    /** A duration in whole milliseconds; "<1" for tiny values and "—" when missing. */
    ms(value) {
      if (value == null || !Number.isFinite(value)) return '—';
      if (value > 0 && value < 1) return '<1';
      return number.format(Math.round(value));
    },
    percent: (fraction) => percent.format(fraction),
  };
}
