import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { normalizeSignatureImage } from './normalize-signature-image';

const toDataUrl = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

const readDimensions = async (dataUrl: string) => {
  const image = Buffer.from(dataUrl.split(',')[1], 'base64');
  const metadata = await sharp(image).metadata();

  return { width: metadata.width, height: metadata.height };
};

describe('normalizeSignatureImage', () => {
  it('crops transparent whitespace around the visible signature', async () => {
    const signature = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 60,
              height: 10,
              channels: 4,
              background: { r: 20, g: 30, b: 40, alpha: 1 },
            },
          },
          left: 20,
          top: 20,
        },
      ])
      .png()
      .toBuffer();

    const normalized = await normalizeSignatureImage(toDataUrl(signature));

    await expect(readDimensions(normalized)).resolves.toEqual({ width: 60, height: 10 });
  });

  it('crops near-white whitespace from opaque images', async () => {
    const signature = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 40,
              height: 12,
              channels: 4,
              background: { r: 30, g: 40, b: 50, alpha: 1 },
            },
          },
          left: 15,
          top: 14,
        },
      ])
      .png()
      .toBuffer();

    const normalized = await normalizeSignatureImage(toDataUrl(signature));

    await expect(readDimensions(normalized)).resolves.toEqual({ width: 40, height: 12 });
  });

  it('leaves non-PNG signature values unchanged', async () => {
    await expect(normalizeSignatureImage('Max Mustermann')).resolves.toBe('Max Mustermann');
  });

  it('leaves an image without visible content unchanged', async () => {
    const blankImage = await sharp({
      create: {
        width: 20,
        height: 10,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataUrl = toDataUrl(blankImage);

    await expect(normalizeSignatureImage(dataUrl)).resolves.toBe(dataUrl);
  });
});
