// Turns a link into material the AI can read: caption / description, structured recipe data
// (schema.org), page text, and the video itself when it can be downloaded.

const { safeFetch, readBodyLimited } = require('./safe-fetch');
const { ImportError } = require('./errors');
const { compressImage, toDataUri, MAX_INPUT_BYTES: MAX_IMAGE_BYTES } = require('./image');

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
// Instagram / Facebook serve their Open Graph tags (caption, image, sometimes the video) to link-preview crawlers
const PREVIEW_CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 15 * 60;
const MAX_PAGE_TEXT_CHARS = 12000;

function detectPlatform(url) {
  const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
  if (/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/.test(host)) return 'facebook';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube';
  if (/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/.test(host)) return 'pinterest';
  return 'url';
}

// ---------- HTML helpers ----------

function decodeEntities(text) {
  return (text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Reads <meta property|name="key" content="..."> whatever the attribute order. */
function readMeta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return '';
}

/** Finds a schema.org Recipe in the page's JSON-LD blocks (arrays and @graph included). */
function findJsonLdRecipe(html) {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, raw] of blocks) {
    let data;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }

    const queue = [data];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node)) {
        queue.push(...node);
        continue;
      }
      const type = node['@type'];
      if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
        return node;
      }
      if (node['@graph']) queue.push(node['@graph']);
      if (node.mainEntity) queue.push(node.mainEntity);
    }
  }
  return null;
}

/** Visible text of a page, for sites without structured data. */
function extractPageText(html) {
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] || html;
  return decodeEntities(
    body
      .replace(/<(script|style|noscript|svg|header|footer|nav|form)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, MAX_PAGE_TEXT_CHARS);
}

async function fetchHtml(url, userAgent) {
  const response = await safeFetch(url, {
    headers: { 'User-Agent': userAgent, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8', Accept: 'text/html,*/*' }
  });
  if (!response.ok) {
    throw new ImportError(422, `Ce lien ne répond pas (erreur ${response.status})`);
  }
  const buffer = await readBodyLimited(response, MAX_HTML_BYTES);
  return {
    html: buffer ? buffer.toString('utf8') : '',
    finalUrl: response.finalUrl,
    cookies: (response.headers.getSetCookie?.() || []).map(cookie => cookie.split(';')[0]).join('; ')
  };
}

async function downloadVideo(url, headers = {}) {
  try {
    const response = await safeFetch(url, { headers: { 'User-Agent': BROWSER_UA, ...headers }, timeoutMs: 60000 });
    if (!response.ok) return null;
    const mimeType = (response.headers.get('content-type') || 'video/mp4').split(';')[0];
    if (!mimeType.startsWith('video/')) return null;
    const buffer = await readBodyLimited(response, MAX_VIDEO_BYTES);
    return buffer ? { buffer, mimeType } : null;
  } catch (error) {
    console.warn('[recipe-import] Video download failed:', error.message);
    return null;
  }
}

/**
 * Social networks' image URLs are signed and expire after a few hours or days:
 * keep a copy of the cover as a (compressed) data URI so the recipe keeps its picture.
 */
async function toDurableImage(imageUrl, platform) {
  if (!imageUrl) return undefined;
  if (!['tiktok', 'instagram', 'facebook'].includes(platform)) return imageUrl;

  try {
    const response = await safeFetch(imageUrl, { headers: { 'User-Agent': BROWSER_UA }, timeoutMs: 10000 });
    const mimeType = (response.headers.get('content-type') || '').split(';')[0];
    if (!response.ok || !mimeType.startsWith('image/')) return undefined;
    const buffer = await readBodyLimited(response, MAX_IMAGE_BYTES);
    const image = buffer ? await compressImage(buffer, mimeType) : null;
    return image ? toDataUri(image) : undefined;
  } catch (error) {
    console.warn('[recipe-import] Cover not kept:', error.message);
    return undefined;
  }
}

// ---------- Platforms ----------

async function fromTikTok(url) {
  const { html, finalUrl, cookies } = await fetchHtml(url, BROWSER_UA);
  const source = { platform: 'tiktok', finalUrl };

  const raw = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  let item = null;
  try {
    item = raw ? JSON.parse(raw)?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct : null;
  } catch {
    item = null;
  }

  if (item) {
    source.caption = item.desc || '';
    source.author = item.author?.nickname || item.author?.uniqueId || '';
    source.imageUrl = item.video?.originCover || item.video?.cover || item.imagePost?.cover?.imageURL?.urlList?.[0];

    const videoUrl = item.video?.playAddr || item.video?.downloadAddr;
    const duration = Number(item.video?.duration) || 0;
    if (videoUrl && duration <= MAX_VIDEO_SECONDS) {
      // The video CDN only answers with the cookies the page just set
      source.video = await downloadVideo(videoUrl, { Referer: 'https://www.tiktok.com/', Cookie: cookies, Range: 'bytes=0-' });
    }
  } else {
    // Page layout changed or blocked: the oEmbed endpoint still gives the caption and cover
    const response = await safeFetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`);
    if (response.ok) {
      const data = await response.json();
      source.caption = data.title || '';
      source.author = data.author_name || '';
      source.imageUrl = data.thumbnail_url;
    }
  }

  return source;
}

async function fromYouTube(url) {
  const parsed = new URL(url);
  const id = parsed.hostname.includes('youtu.be')
    ? parsed.pathname.slice(1)
    : parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if (!id) {
    throw new ImportError(400, "Ce lien YouTube n'est pas reconnu");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  // Gemini reads public YouTube videos straight from their URL: no download needed
  const source = { platform: 'youtube', finalUrl: watchUrl, youtubeUrl: watchUrl };

  const oembed = await safeFetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`);
  if (oembed.ok) {
    const data = await oembed.json();
    source.title = data.title || '';
    source.author = data.author_name || '';
    source.imageUrl = data.thumbnail_url;
  }

  try {
    const { html } = await fetchHtml(watchUrl, BROWSER_UA);
    const description = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1];
    if (description) source.caption = JSON.parse(`"${description}"`);
  } catch {
    // The description is a bonus: the video itself is the main source
  }

  return source;
}

/** Instagram, Facebook, Pinterest, recipe websites, blogs... */
async function fromWebPage(url, platform) {
  const isSocial = ['instagram', 'facebook'].includes(platform);
  const { html, finalUrl } = await fetchHtml(url, isSocial ? PREVIEW_CRAWLER_UA : BROWSER_UA);

  const source = {
    platform,
    finalUrl,
    title: readMeta(html, 'og:title') || decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim(),
    caption: readMeta(html, 'og:description') || readMeta(html, 'description') || readMeta(html, 'twitter:description'),
    imageUrl: readMeta(html, 'og:image') || readMeta(html, 'twitter:image'),
    structuredRecipe: findJsonLdRecipe(html)
  };

  // Full page text only helps on regular websites; on social networks it is login-wall noise
  if (!isSocial && !source.structuredRecipe) {
    source.pageText = extractPageText(html);
  }

  const videoUrl = readMeta(html, 'og:video:secure_url') || readMeta(html, 'og:video:url') || readMeta(html, 'og:video');
  if (videoUrl && /^https?:/.test(videoUrl)) {
    source.video = await downloadVideo(videoUrl, { Referer: finalUrl });
  }

  return source;
}

/**
 * @returns {Promise<{platform, finalUrl, title?, author?, caption?, pageText?, structuredRecipe?,
 *   imageUrl?, video?: {buffer, mimeType}, youtubeUrl?}>}
 */
async function fetchSource(url) {
  const platform = detectPlatform(url);
  let source;

  try {
    if (platform === 'tiktok') source = await fromTikTok(url);
    else if (platform === 'youtube') source = await fromYouTube(url);
    else source = await fromWebPage(url, platform);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    console.error('[recipe-import] Source fetch failed:', error);
    throw new ImportError(422, 'Impossible de lire ce lien. Vérifie qu’il est public.', error);
  }

  source.imageUrl = await toDurableImage(source.imageUrl, platform);
  return source;
}

module.exports = { fetchSource, detectPlatform, findJsonLdRecipe, readMeta, decodeEntities };
