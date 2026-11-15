/* ABYSS offline shell. Render both build placeholders before publishing. */
'use strict';

const VERSION = '11.0';
const BUILD_ID = 'v110hydrolights';
const SCOPE = new URL(self.registration.scope);
const scopeKey = (() => {
  let hash = 2166136261;
  for (const character of SCOPE.href) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
})();
// CacheStorage is shared by every app on an origin. Include this app's scope.
const CACHE_PREFIX = `abyss-shell-${scopeKey}-`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}-${BUILD_ID}`;
const BUILD_HEADER = 'X-ABYSS-Cache-Build';
const VERSION_HEADER = 'X-ABYSS-Cache-Version';
const BYTES_HEADER = 'X-ABYSS-Cache-Bytes';
const ASSETS = Object.freeze([
  { path: 'index.html', kind: 'html' },
  { path: 'manifest.webmanifest', kind: 'manifest' },
  { path: 'icon-192.png', kind: 'png' },
  { path: 'icon-512.png', kind: 'png' },
  { path: 'icon-maskable-512.png', kind: 'png' },
  { path: 'apple-touch-icon.png', kind: 'png' }
].map(asset => Object.freeze({ ...asset, url: new URL(asset.path, SCOPE).href })));
const ASSET_BY_PATH = new Map(ASSETS.map(asset => [new URL(asset.url).pathname, asset]));
let saving = null;

function inScope(value) {
  try {
    const url = new URL(value);
    return url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE.pathname);
  } catch (_) {
    return false;
  }
}

function isEntry(url) {
  return url.pathname === SCOPE.pathname || url.pathname === new URL('index.html', SCOPE).pathname;
}

function baseMessage(type) {
  return { type, version: VERSION, buildId: BUILD_ID, cacheName: CACHE_NAME, total: ASSETS.length };
}

async function broadcast(message) {
  // An unavailable client must never make an otherwise valid installation fail.
  try {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (inScope(client.url)) {
        try { client.postMessage(message); } catch (_) { /* Client closed. */ }
      }
    }
  } catch (_) { /* A later GET_STATUS still reports the durable cache state. */ }
}

function reply(event, message) {
  try {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(message);
    else if (event.source && event.source.postMessage) event.source.postMessage(message);
  } catch (_) { /* The requesting page may have closed. */ }
}

function validHeaders(response, asset) {
  if (!response || response.status !== 200 || response.type === 'opaque' || response.type === 'opaqueredirect') return false;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (asset.kind === 'html' && type !== 'text/html') return false;
  if (asset.kind === 'manifest' && !['application/manifest+json', 'application/json', 'text/json'].includes(type)) return false;
  if (asset.kind === 'png' && type !== 'image/png') return false;
  // This application never needs authenticated or private documents offline.
  if (/(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get('Cache-Control') || '')) return false;
  if ((response.headers.get('Vary') || '').split(',').some(value => value.trim() === '*')) return false;
  return true;
}

function validStoredResponse(response, asset) {
  return validHeaders(response, asset) &&
    response.headers.get(BUILD_HEADER) === BUILD_ID &&
    response.headers.get(VERSION_HEADER) === VERSION &&
    Number(response.headers.get(BYTES_HEADER)) > 0;
}

async function statusFor(cacheName = CACHE_NAME) {
  let cached = 0;
  if ((await caches.keys()).includes(cacheName)) {
    const cache = await caches.open(cacheName);
    for (const asset of ASSETS) {
      if (validStoredResponse(await cache.match(asset.url), asset)) cached += 1;
    }
  }
  return { ...baseMessage('APP_STATUS'), cached, offlineReady: cached === ASSETS.length };
}

function failureMessage(error) {
  if (error && error.code === 'BUILD_MISMATCH') return 'A newer ABYSS build is on the server. Check for an update before saving it offline.';
  return 'The complete offline copy could not be saved. Keep ABYSS open with an internet connection and try again.';
}

async function prepareResponse(response, asset) {
  if (!validHeaders(response, asset)) throw new Error(`Invalid public shell response: ${asset.path}`);
  if (response.url) {
    const finalURL = new URL(response.url);
    const expected = new URL(asset.url);
    // Allow a host's /index.html -> / canonical redirect, but not login/error pages.
    if (!inScope(finalURL.href) ||
        (finalURL.pathname !== expected.pathname && !(asset.kind === 'html' && isEntry(finalURL)))) {
      throw new Error(`Unexpected shell redirect: ${asset.path}`);
    }
  }
  // Consume the whole response before storing it. A broken stream cannot look ready.
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength) throw new Error(`Empty shell response: ${asset.path}`);
  if (asset.kind === 'html') {
    const beginning = new TextDecoder().decode(bytes.slice(0, 32768));
    const meta = beginning.match(/<meta\b(?=[^>]*\bname\s*=\s*["']abyss-build["'])(?=[^>]*\bcontent\s*=\s*["']([^"']+)["'])[^>]*>/i);
    if (!meta || meta[1] !== BUILD_ID) {
      const error = new Error('The HTML does not match this service worker build.');
      error.code = 'BUILD_MISMATCH';
      throw error;
    }
  } else if (asset.kind === 'manifest') {
    const manifest = JSON.parse(new TextDecoder().decode(bytes));
    if (manifest.name !== 'ABYSS' || !Array.isArray(manifest.icons) || manifest.icons.length < 3) {
      throw new Error('The app manifest is incomplete.');
    }
  } else if (asset.kind === 'png') {
    const png = new Uint8Array(bytes);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (png.length < 24 || signature.some((value, index) => png[index] !== value)) {
      throw new Error(`Invalid icon: ${asset.path}`);
    }
  }
  const headers = new Headers(response.headers);
  // Fetch has already decoded the network body; do not label the stored bytes gzip.
  headers.delete('Content-Encoding');
  headers.set('Content-Length', String(bytes.byteLength));
  headers.set(BUILD_HEADER, BUILD_ID);
  headers.set(VERSION_HEADER, VERSION);
  headers.set(BYTES_HEADER, String(bytes.byteLength));
  return new Response(bytes, { status: 200, statusText: 'OK', headers });
}

async function saveShell(reason) {
  const candidate = `${CACHE_NAME}-candidate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let touchedFinal = false;
  let lastAsset = '';
  try {
    const existing = await statusFor();
    if (existing.offlineReady) {
      await broadcast({ ...existing, type: 'CACHE_READY', reason });
      return existing;
    }
    const staging = await caches.open(candidate);
    await broadcast({ ...baseMessage('INSTALL_PROGRESS'), cached: 0, offlineReady: false, reason });
    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index];
      lastAsset = asset.path;
      const request = new Request(asset.url, { cache: 'reload', credentials: 'omit', mode: 'same-origin', redirect: 'follow' });
      const response = await prepareResponse(await fetch(request), asset);
      await staging.put(asset.url, response);
      await broadcast({ ...baseMessage('INSTALL_PROGRESS'), cached: index + 1, offlineReady: false, asset: asset.path, reason });
    }
    if (!(await statusFor(candidate)).offlineReady) throw new Error('The staged offline copy is incomplete.');
    const finalCache = await caches.open(CACHE_NAME);
    touchedFinal = true;
    // A new worker cannot activate until this whole transaction succeeds. A repair
    // stages the same build, so it also cannot mix a newer HTML into an older app.
    for (const asset of ASSETS) await finalCache.put(asset.url, await staging.match(asset.url));
    const result = await statusFor();
    if (!result.offlineReady) throw new Error('The committed offline copy is incomplete.');
    await broadcast({ ...result, type: 'CACHE_READY', reason });
    return result;
  } catch (error) {
    // The pre-existing final cache was incomplete. Never erase a complete old build.
    if (touchedFinal) await caches.delete(CACHE_NAME).catch(() => false);
    await broadcast({ ...baseMessage('CACHE_ERROR'), offlineReady: false, asset: lastAsset, reason, code: error.code || 'CACHE_FAILED', error: failureMessage(error) });
    throw error;
  } finally {
    await caches.delete(candidate).catch(() => false);
  }
}

function ensureShell(reason) {
  if (!saving) saving = saveShell(reason).finally(() => { saving = null; });
  return saving;
}

self.addEventListener('install', event => {
  event.waitUntil(ensureShell('install'));
  // Deliberately no skipWaiting(): an update must not reset a running simulation.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const status = await statusFor();
    if (status.offlineReady) {
      for (const name of await caches.keys()) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
      }
    }
    await self.clients.claim();
    if (status.offlineReady) await broadcast({ ...status, type: 'CACHE_READY', reason: 'activate' });
    else await broadcast({ ...status, type: 'CACHE_ERROR', code: 'CACHE_INCOMPLETE', error: 'The offline copy is incomplete. Use Save for offline play while connected.' });
  })());
});

self.addEventListener('message', event => {
  if (event.source && event.source.url && !inScope(event.source.url)) return;
  const type = event.data && event.data.type;
  if (!['GET_STATUS', 'CACHE_APP', 'SKIP_WAITING'].includes(type)) return;
  event.waitUntil((async () => {
    try {
      if (type === 'CACHE_APP') await ensureShell('repair');
      const status = await statusFor();
      if (type === 'SKIP_WAITING') {
        if (!status.offlineReady) {
          reply(event, { ...status, type: 'CACHE_ERROR', code: 'CACHE_INCOMPLETE', error: 'Save the complete offline copy before applying the update.' });
          return;
        }
        await self.skipWaiting();
      }
      reply(event, { ...status, activationRequested: type === 'SKIP_WAITING' });
    } catch (error) {
      let status;
      try { status = await statusFor(); } catch (_) {
        status = { ...baseMessage('APP_STATUS'), cached: 0, offlineReady: false };
      }
      reply(event, { ...status, code: error.code || 'CACHE_FAILED', error: failureMessage(error) });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization') || request.headers.has('Range')) return;
  const url = new URL(request.url);
  if (!inScope(url.href)) return;
  const asset = isEntry(url) ? ASSETS[0] : ASSET_BY_PATH.get(url.pathname);
  if (!asset) return;
  event.respondWith((async () => {
    try {
      const response = await caches.match(asset.url, { cacheName: CACHE_NAME });
      if (validStoredResponse(response, asset)) return response;
    } catch (_) { /* An unavailable device cache falls back to the network. */ }
    // Do not cache runtime responses: only the validated complete shell is saved.
    return fetch(request);
  })());
});
