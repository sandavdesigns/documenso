import Konva from 'konva';

import { DEFAULT_SIGNATURE_TEXT_FONT_SIZE, getSignatureFontFamily } from '../../constants/pdf';
import { AppError } from '../../errors/app-error';
import type { TSignatureFieldMeta } from '../../types/field-meta';
import { getSignatureVariantLabel, resolveFieldOverflowMode } from '../../types/field-meta';
import { calculateOverflowLayout } from './calculate-overflow-layout';
import { createFieldHoverInteraction, upsertFieldGroup, upsertFieldRect } from './field-generic-items';
import type { FieldToRender, RenderFieldElementOptions } from './field-renderer';
import { calculateFieldPosition } from './field-renderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SkiaImage: any;

void (async () => {
  if (typeof window === 'undefined') {
    const mod = await import('@documenso/skia-canvas');
    SkiaImage = mod.Image;
  }
})();

const getImageDimensions = (img: HTMLImageElement, fieldWidth: number, fieldHeight: number) => {
  let imageWidth = img.width;
  let imageHeight = img.height;

  const scalingFactor = Math.min(fieldWidth / imageWidth, fieldHeight / imageHeight);

  imageWidth = imageWidth * scalingFactor;
  imageHeight = imageHeight * scalingFactor;

  const imageX = (fieldWidth - imageWidth) / 2;
  const imageY = (fieldHeight - imageHeight) / 2;

  return {
    width: imageWidth,
    height: imageHeight,
    x: imageX,
    y: imageY,
  };
};

type FieldSignature =
  | {
      node: Konva.Text;
      isImageSignature: false;
      isLabel: boolean;
    }
  | {
      node: Konva.Image | Konva.Group;
      isImageSignature: true;
      isLabel: boolean;
      resize: (width: number, height: number, cache?: boolean) => void;
    };

/**
 * The pixel ratio used when caching the signature image as an offscreen bitmap.
 *
 * Konva's default redraw composites the source image with low-quality scaling
 * which makes signatures look blurry, especially when the source PNG is much
 * larger than the field. Caching at a high pixel ratio rasterises the shape
 * once into a sharp bitmap that is then reused on every redraw.
 *
 * Multiplied by `devicePixelRatio` to keep the cache crisp on retina displays.
 */
const SIGNATURE_IMAGE_CACHE_PIXEL_RATIO = 2;
const SIGNATURE_IMAGE_AREA_X = 'signatureImageAreaX';
const SIGNATURE_IMAGE_AREA_WIDTH = 'signatureImageAreaWidth';
const SIGNATURE_IMAGE_AREA_HEIGHT = 'signatureImageAreaHeight';

const resizeSignatureImage = (
  image: Konva.Image,
  offsetX: number,
  fieldWidth: number,
  fieldHeight: number,
  cache = false,
) => {
  const source = image.image() as HTMLImageElement | undefined;

  image.setAttr(SIGNATURE_IMAGE_AREA_X, offsetX);
  image.setAttr(SIGNATURE_IMAGE_AREA_WIDTH, fieldWidth);
  image.setAttr(SIGNATURE_IMAGE_AREA_HEIGHT, fieldHeight);
  image.clearCache();

  if (source?.width && source.height) {
    const dimensions = getImageDimensions(source, fieldWidth, fieldHeight);

    image.x(offsetX + dimensions.x);
    image.y(dimensions.y);
    image.width(dimensions.width);
    image.height(dimensions.height);
  } else {
    image.x(offsetX);
    image.y(0);
    image.width(fieldWidth);
    image.height(fieldHeight);
  }

  if (cache && typeof window !== 'undefined') {
    image.cache({
      pixelRatio: SIGNATURE_IMAGE_CACHE_PIXEL_RATIO * (window.devicePixelRatio || 1),
    });
  }
};

/**
 * Build a Konva.Image for a base64 signature, sized to fit within the given
 * field dimensions. Works in both browser and Node.js (via skia-canvas).
 */
const createSignatureImage = (
  signatureImageAsBase64: string,
  fieldWidth: number,
  fieldHeight: number,
  offsetX = 0,
): Konva.Image => {
  if (typeof window !== 'undefined') {
    const img = new Image();

    const image = new Konva.Image({
      image: img,
      x: offsetX,
      y: 0,
      width: fieldWidth,
      height: fieldHeight,
      listening: false,
    });

    img.onload = () => {
      image.image(img);
      resizeSignatureImage(
        image,
        (image.getAttr(SIGNATURE_IMAGE_AREA_X) as number | undefined) ?? offsetX,
        (image.getAttr(SIGNATURE_IMAGE_AREA_WIDTH) as number | undefined) ?? fieldWidth,
        (image.getAttr(SIGNATURE_IMAGE_AREA_HEIGHT) as number | undefined) ?? fieldHeight,
        true,
      );
    };

    img.src = signatureImageAsBase64;

    return image;
  }

  // Node.js with skia-canvas
  if (!SkiaImage) {
    throw new Error('Skia image not found');
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const img = new SkiaImage(signatureImageAsBase64) as unknown as HTMLImageElement;

  return new Konva.Image({
    image: img,
    ...getImageDimensions(img, fieldWidth, fieldHeight),
    x: offsetX + getImageDimensions(img, fieldWidth, fieldHeight).x,
    listening: false,
  });
};

const createSignatureImageWithVariant = (
  signatureImageAsBase64: string,
  fieldWidth: number,
  fieldHeight: number,
  variantLabel: string,
): {
  node: Konva.Group;
  resize: (width: number, height: number, cache?: boolean) => void;
} => {
  const group = new Konva.Group({ listening: false });
  const prefix = new Konva.Text({
    text: variantLabel,
    fontFamily: 'Noto Sans',
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
  });
  const image = createSignatureImage(signatureImageAsBase64, fieldWidth, fieldHeight);

  group.add(prefix);
  group.add(image);

  const resize = (width: number, height: number, cache = false) => {
    const gap = Math.min(4, width * 0.025);
    const prefixWidth = Math.min(width * 0.24, Math.max(24, height * 1.2));
    const imageX = prefixWidth + gap;
    const imageWidth = Math.max(1, width - imageX);

    group.width(width);
    group.height(height);
    prefix.setAttrs({
      x: 0,
      y: 0,
      width: prefixWidth,
      height,
      fontSize: Math.max(8, Math.min(14, height * 0.38)),
    });
    resizeSignatureImage(image, imageX, imageWidth, height, cache);
  };

  resize(fieldWidth, fieldHeight, true);

  return { node: group, resize };
};

const createFieldSignature = (field: FieldToRender, options: RenderFieldElementOptions): FieldSignature => {
  const { pageWidth, pageHeight, mode = 'edit', translations } = options;

  const { fieldX, fieldY, fieldWidth, fieldHeight } = calculateFieldPosition(field, pageWidth, pageHeight);
  const fontSize = field.fieldMeta?.fontSize || DEFAULT_SIGNATURE_TEXT_FONT_SIZE;
  const fieldMeta = field.fieldMeta as TSignatureFieldMeta | undefined;
  const signatureVariantLabel = getSignatureVariantLabel(fieldMeta?.signatureVariant);

  const fieldText = new Konva.Text({
    id: `${field.renderId}-text`,
    name: 'field-text',
    listening: false,
  });

  const fieldTypeName = translations?.[field.type] || field.type;
  const fieldTypeLabel = signatureVariantLabel ? `${signatureVariantLabel} ${fieldTypeName}` : fieldTypeName;

  // Calculate text positioning based on alignment
  const textX = 0;
  const textY = 0;

  let textToRender: string = fieldTypeLabel;

  const signature = field.signature;

  // Handle edit mode.
  if (mode === 'edit') {
    textToRender = fieldTypeLabel;

    // If the field has already been signed and we have the signature data
    // available, render it. Otherwise leave the field type label as a placeholder.
    if (field.inserted && signature?.typedSignature) {
      textToRender = signatureVariantLabel
        ? `${signatureVariantLabel} ${signature.typedSignature}`
        : signature.typedSignature;
    }

    if (field.inserted && signature?.signatureImageAsBase64) {
      if (signatureVariantLabel) {
        const signatureWithVariant = createSignatureImageWithVariant(
          signature.signatureImageAsBase64,
          fieldWidth,
          fieldHeight,
          signatureVariantLabel,
        );

        return { ...signatureWithVariant, isImageSignature: true, isLabel: false };
      }

      const image = createSignatureImage(signature.signatureImageAsBase64, fieldWidth, fieldHeight);

      return {
        node: image,
        isImageSignature: true,
        isLabel: false,
        resize: (width, height, cache) => resizeSignatureImage(image, 0, width, height, cache),
      };
    }
  }

  // Handle sign mode.
  if (mode === 'sign' || mode === 'export') {
    textToRender = fieldTypeLabel;

    if (field.inserted && !signature) {
      throw new AppError('MISSING_SIGNATURE');
    }

    if (signature?.typedSignature) {
      textToRender = signatureVariantLabel
        ? `${signatureVariantLabel} ${signature.typedSignature}`
        : signature.typedSignature;
    }

    if (signature?.signatureImageAsBase64) {
      if (signatureVariantLabel) {
        const signatureWithVariant = createSignatureImageWithVariant(
          signature.signatureImageAsBase64,
          fieldWidth,
          fieldHeight,
          signatureVariantLabel,
        );

        return { ...signatureWithVariant, isImageSignature: true, isLabel: false };
      }

      const image = createSignatureImage(signature.signatureImageAsBase64, fieldWidth, fieldHeight);

      return {
        node: image,
        isImageSignature: true,
        isLabel: false,
        resize: (width, height, cache) => resizeSignatureImage(image, 0, width, height, cache),
      };
    }
  }

  // Whether we're rendering the field type name (like "Signature") vs actual signed content.
  // Overflow should not apply to the label.
  const isLabel = !signature?.typedSignature;

  const overflowLayout = calculateOverflowLayout({
    overflowMode: resolveFieldOverflowMode(fieldMeta),
    isLabel,
    textToRender,
    fontSize,
    fontFamily: getSignatureFontFamily(textToRender),
    lineHeight: 1,
    letterSpacing: 0,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseX: textX,
    baseY: textY,
    baseWidth: fieldWidth,
    baseHeight: fieldHeight,
    groupX: fieldX,
    groupY: fieldY,
    pageWidth,
    pageHeight,
  });

  fieldText.setAttrs({
    x: overflowLayout.x,
    y: overflowLayout.y,
    verticalAlign: overflowLayout.verticalAlign,
    wrap: overflowLayout.wrap,
    text: textToRender,
    fontSize,
    fontFamily: getSignatureFontFamily(textToRender),
    align: overflowLayout.textAlign,
    width: overflowLayout.width,
    height: overflowLayout.height,
  } satisfies Partial<Konva.TextConfig>);

  return { node: fieldText, isImageSignature: false, isLabel };
};

export const renderSignatureFieldElement = (field: FieldToRender, options: RenderFieldElementOptions) => {
  const { mode = 'edit', pageLayer, pageWidth, pageHeight, color } = options;

  const isFirstRender = !pageLayer.findOne(`#${field.renderId}`);

  const fieldGroup = upsertFieldGroup(field, options);

  // Clear previous children and listeners to re-render fresh.
  fieldGroup.removeChildren();
  fieldGroup.off('transform');

  // Assign elements to group and any listeners that should only be run on initialization.
  if (isFirstRender) {
    pageLayer.add(fieldGroup);
  }

  // Render the field background and text.
  const fieldRect = upsertFieldRect(field, options);
  const fieldSignatureResult = createFieldSignature(field, options);
  const { node: fieldSignature } = fieldSignatureResult;

  fieldGroup.add(fieldRect);
  fieldGroup.add(fieldSignature);

  fieldGroup.on('transform', () => {
    const groupScaleX = fieldGroup.scaleX();
    const groupScaleY = fieldGroup.scaleY();

    // Adjust text scale so it doesn't change while group is resized.
    fieldSignature.scaleX(1 / groupScaleX);
    fieldSignature.scaleY(1 / groupScaleY);

    const rectWidth = fieldRect.width() * groupScaleX;
    const rectHeight = fieldRect.height() * groupScaleY;

    // During active transform, use crop dimensions (field bounds only).
    if (!fieldSignatureResult.isImageSignature) {
      fieldSignatureResult.node.x(0);
      fieldSignatureResult.node.y(0);
      fieldSignatureResult.node.wrap('word');
    }

    if (fieldSignatureResult.isImageSignature) {
      fieldSignatureResult.resize(rectWidth, rectHeight);
    } else {
      fieldSignature.width(rectWidth);
      fieldSignature.height(rectHeight);
    }

    fieldGroup.getLayer()?.batchDraw();
  });

  fieldGroup.on('transformend', () => {
    fieldSignature.scaleX(1);
    fieldSignature.scaleY(1);

    const rectWidth = fieldRect.width();
    const rectHeight = fieldRect.height();

    if (!fieldSignatureResult.isImageSignature) {
      const fieldMeta = field.fieldMeta as TSignatureFieldMeta | undefined;
      const signatureText = fieldSignatureResult.node;

      const newOverflowLayout = calculateOverflowLayout({
        overflowMode: resolveFieldOverflowMode(fieldMeta),
        isLabel: fieldSignatureResult.isLabel,
        textToRender: signatureText.text(),
        fontSize: signatureText.fontSize(),
        fontFamily: getSignatureFontFamily(signatureText.text()),
        lineHeight: 1,
        letterSpacing: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseX: 0,
        baseY: 0,
        baseWidth: rectWidth,
        baseHeight: rectHeight,
        groupX: fieldGroup.x(),
        groupY: fieldGroup.y(),
        pageWidth,
        pageHeight,
      });

      signatureText.x(newOverflowLayout.x);
      signatureText.y(newOverflowLayout.y);
      signatureText.width(newOverflowLayout.width);
      signatureText.height(newOverflowLayout.height);
      signatureText.wrap(newOverflowLayout.wrap);
      signatureText.verticalAlign(newOverflowLayout.verticalAlign);
    } else {
      fieldSignatureResult.resize(rectWidth, rectHeight, true);
    }

    fieldGroup.getLayer()?.batchDraw();
  });

  // Handle export mode.
  if (mode === 'export') {
    // Hide the rectangle.
    fieldRect.opacity(0);
  }

  if (color !== 'readOnly' && mode !== 'export') {
    createFieldHoverInteraction({ fieldGroup, fieldRect, options });
  }

  return {
    fieldGroup,
    isFirstRender,
  };
};
