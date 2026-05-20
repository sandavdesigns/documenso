import { FieldType } from '@prisma/client';

import { env } from '@documenso/lib/utils/env';

export const MIN_FIELD_HEIGHT_PX = 12;
export const MIN_FIELD_WIDTH_PX = 36;

export const DEFAULT_FIELD_HEIGHT_PX = MIN_FIELD_HEIGHT_PX * 2.5;
export const DEFAULT_FIELD_WIDTH_PX = MIN_FIELD_WIDTH_PX * 2.5;

const PDF_POINTS_PER_CM = 72 / 2.54;

const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getSignatureFieldDefaultSize = () => {
  const widthCm = parsePositiveNumber(env('NEXT_PUBLIC_SIGNATURE_FIELD_DEFAULT_WIDTH_CM'), 5);
  const heightCm = parsePositiveNumber(env('NEXT_PUBLIC_SIGNATURE_FIELD_DEFAULT_HEIGHT_CM'), 1);

  return {
    height: heightCm * PDF_POINTS_PER_CM,
    width: widthCm * PDF_POINTS_PER_CM,
  };
};

export const getDefaultFieldSize = (fieldType: FieldType | null | undefined) => {
  if (fieldType === FieldType.SIGNATURE) {
    return getSignatureFieldDefaultSize();
  }

  return {
    height: DEFAULT_FIELD_HEIGHT_PX,
    width: DEFAULT_FIELD_WIDTH_PX,
  };
};

export const getDefaultFieldSizeForPage = (
  fieldType: FieldType | null | undefined,
  page: Element | null | undefined,
) => {
  const size = getDefaultFieldSize(fieldType);
  const pdfPageWidth = Number(page?.getAttribute('data-pdf-page-width'));
  const renderedPageWidth = page?.getBoundingClientRect().width;

  if (!Number.isFinite(pdfPageWidth) || pdfPageWidth <= 0 || !renderedPageWidth) {
    return size;
  }

  const scale = renderedPageWidth / pdfPageWidth;

  return {
    height: size.height * scale,
    width: size.width * scale,
  };
};
