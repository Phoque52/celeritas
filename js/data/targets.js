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

/** AWS DynamoDB answers GET /ping in every region, without a key and with CORS enabled. */
const aws = (id) => ({ id, name: `AWS ${id}`, url: `https://dynamodb.${id}.amazonaws.com/ping`, mode: 'cors' });

/** Ordered west to east, so the list reads like a map. City names are in i18n.js. */
export const REGIONS = [
  aws('us-west-1'), // California
  aws('us-east-1'), // Virginia
  aws('sa-east-1'), // São Paulo
  aws('eu-west-2'), // London
  aws('eu-central-1'), // Frankfurt
  aws('eu-north-1'), // Stockholm
  aws('af-south-1'), // Cape Town
  aws('me-central-1'), // UAE
  aws('ap-south-1'), // Mumbai
  aws('ap-southeast-1'), // Singapore
  aws('ap-northeast-1'), // Tokyo
  aws('ap-southeast-2'), // Sydney
];
