import { FieldType } from '@prisma/client';

import { env } from '@documenso/lib/utils/env';

export const MIN_FIELD_HEIGHT_PX = 12;
export const MIN_FIELD_WIDTH_PX = 36;

export const DEFAULT_FIELD_HEIGHT_PX = MIN_FIELD_HEIGHT_PX * 2.5;
export const DEFAULT_FIELD_WIDTH_PX = MIN_FIELD_WIDTH_PX * 2.5;

const CSS_PIXELS_PER_CM = 96 / 2.54;

const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getSignatureFieldDefaultSize = () => {
  const widthCm = parsePositiveNumber(env('NEXT_PUBLIC_SIGNATURE_FIELD_DEFAULT_WIDTH_CM'), 5);
  const heightCm = parsePositiveNumber(env('NEXT_PUBLIC_SIGNATURE_FIELD_DEFAULT_HEIGHT_CM'), 1);

  return {
    height: heightCm * CSS_PIXELS_PER_CM,
    width: widthCm * CSS_PIXELS_PER_CM,
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
