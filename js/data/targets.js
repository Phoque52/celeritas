/**
 * Where Celeritas measures to. Every endpoint here answers tiny requests
 * from any website, runs in many locations and needs no API key.
 */

/** Reads Cloudflare's /cdn-cgi/trace reply (key=value lines). Only the data center code is kept. */
export function parseTrace(text = '') {
  for (const line of text.split('\n')) {
    const [key, value] = line.split('=');
    if (key?.trim() === 'colo' && value) return { colo: value.trim() };
  }
  return {};
}

/**
 * The nearest server, tried in order. Cloudflare routes each request to the
 * closest of its 330+ data centers and its trace endpoint names the one that
 * answered. 1.1.1.1 skips the DNS lookup; the hostname covers networks that
 * block that address, and Google covers networks that block Cloudflare.
 */
export const EDGE_TARGETS = [
  { id: 'cloudflare', name: 'Cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace', mode: 'cors', parse: parseTrace },
  { id: 'cloudflare-www', name: 'Cloudflare', url: 'https://www.cloudflare.com/cdn-cgi/trace', mode: 'cors', parse: parseTrace },
  { id: 'google', name: 'Google', url: 'https://www.google.com/generate_204', mode: 'no-cors' },
];
