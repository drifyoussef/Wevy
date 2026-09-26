// fetch() for URLs typed by users.
// The server fetches whatever link it is given, so without checks anyone could make it call
// internal addresses (localhost, cloud metadata, the MongoDB host...): classic SSRF.
// Every hop (including redirects) is resolved and rejected if it points to a private network.

const dns = require('dns').promises;
const net = require('net');
const { ImportError } = require('./errors');

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 15000;

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||           // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224                               // multicast / reserved
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.slice(7)); // IPv4-mapped
  return (
    lower.startsWith('fc') || lower.startsWith('fd') || // unique local
    lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') // link-local
  );
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImportError(400, "Ce lien n'est pas valide");
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ImportError(400, 'Seuls les liens http(s) sont acceptés');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (net.isIP(host)) {
    addresses = [{ address: host, family: net.isIP(host) }];
  } else {
    try {
      addresses = await dns.lookup(host, { all: true });
    } catch {
      throw new ImportError(422, "Impossible de joindre ce site. Vérifie le lien.");
    }
  }

  const blocked = addresses.some(({ address, family }) =>
    family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address)
  );
  if (blocked) {
    throw new ImportError(400, "Ce lien n'est pas autorisé");
  }

  return url;
}

/**
 * fetch() with the SSRF checks above on every redirect hop, and a timeout.
 * Returns the final Response; `response.finalUrl` is the URL after redirects.
 */
async function safeFetch(rawUrl, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const response = await fetch(url, {
      ...fetchOptions,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs)
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }

    response.finalUrl = url.toString();
    return response;
  }

  throw new ImportError(422, 'Trop de redirections sur ce lien');
}

/** Reads a response body into a Buffer, refusing anything bigger than maxBytes. */
async function readBodyLimited(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (declared && declared > maxBytes) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}

module.exports = { safeFetch, readBodyLimited, assertPublicUrl };
