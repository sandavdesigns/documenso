import sharp from 'sharp';

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';
const TRANSPARENT_ALPHA_THRESHOLD = 10;
const NEAR_WHITE_THRESHOLD = 245;

/**
 * Removes transparent or near-white outer whitespace from a PNG signature.
 *
 * Signature images saved by the upload editor can include the complete editor
 * canvas. Trimming that canvas before persisting the image prevents reused
 * signatures from being scaled down again when they are placed into a field.
 */
export const normalizeSignatureImage = async (signatureImageAsBase64: string): Promise<string> => {
  if (!signatureImageAsBase64.startsWith(PNG_DATA_URL_PREFIX)) {
    return signatureImageAsBase64;
  }

  const source = Buffer.from(signatureImageAsBase64.slice(PNG_DATA_URL_PREFIX.length), 'base64');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];

      const isTransparent = alpha <= TRANSPARENT_ALPHA_THRESHOLD;
      const isNearWhite = red > NEAR_WHITE_THRESHOLD && green > NEAR_WHITE_THRESHOLD && blue > NEAR_WHITE_THRESHOLD;

      if (!isTransparent && !isNearWhite) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return signatureImageAsBase64;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (minX === 0 && minY === 0 && width === info.width && height === info.height) {
    return signatureImageAsBase64;
  }

  const normalized = await sharp(source).extract({ left: minX, top: minY, width, height }).png().toBuffer();

  return `${PNG_DATA_URL_PREFIX}${normalized.toString('base64')}`;
};
