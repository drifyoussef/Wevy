// Recipe covers are stored inside the recipe document (as a data URI), so they must stay small:
// every list of recipes sends them along. Big pictures are shrunk and re-encoded here.

const sharp = require('sharp');

// 800 px on the longest side is sharp on a 2x screen for the largest place a cover is shown
const MAX_SIDE = 800;
const WEBP_QUALITY = 75;
// Below this, re-encoding isn't worth it (and could even make the file bigger)
const COMPRESS_ABOVE_BYTES = 60 * 1024;
// Refuse anything bigger than this before even decoding it
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * @param {Buffer} buffer any image format sharp can read (jpeg, png, webp, heic, gif...)
 * @returns {Promise<{buffer: Buffer, mimeType: string} | null>} null when it isn't a readable image
 */
async function compressImage(buffer, mimeType) {
  if (!buffer || buffer.length > MAX_INPUT_BYTES) return null;

  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return null; // not an image
  }

  const tooHeavy = buffer.length > COMPRESS_ABOVE_BYTES;
  const tooLarge = (metadata.width || 0) > MAX_SIDE || (metadata.height || 0) > MAX_SIDE;
  if (!tooHeavy && !tooLarge && mimeType && mimeType.startsWith('image/')) {
    return { buffer, mimeType };
  }

  const output = await sharp(buffer, { animated: false })
    .rotate() // apply the EXIF orientation before it is stripped
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Very rare, but never make things worse
  if (mimeType && mimeType.startsWith('image/') && output.length >= buffer.length && !tooLarge) {
    return { buffer, mimeType };
  }
  return { buffer: output, mimeType: 'image/webp' };
}

function toDataUri({ buffer, mimeType }) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Compresses an image data URI if it is too big. Anything that isn't a data URI (a regular
 * https link to a recipe website's picture) is returned untouched.
 * @returns {Promise<string | undefined>} undefined when the data URI isn't a valid image
 */
async function compressDataUri(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return value;

  const match = value.match(/^data:([\w/+.-]+);base64,(.+)$/s);
  if (!match) return undefined;

  const compressed = await compressImage(Buffer.from(match[2], 'base64'), match[1]);
  return compressed ? toDataUri(compressed) : undefined;
}

module.exports = { compressImage, compressDataUri, toDataUri, MAX_INPUT_BYTES };
