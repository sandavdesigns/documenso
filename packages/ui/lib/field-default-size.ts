import { FieldType } from '@prisma/client';

export const MIN_FIELD_HEIGHT_PX = 12;
export const MIN_FIELD_WIDTH_PX = 36;

export const DEFAULT_FIELD_HEIGHT_PX = MIN_FIELD_HEIGHT_PX * 2.5;
export const DEFAULT_FIELD_WIDTH_PX = MIN_FIELD_WIDTH_PX * 2.5;

export const DEFAULT_SIGNATURE_FIELD_HEIGHT_PX = DEFAULT_FIELD_HEIGHT_PX;
export const DEFAULT_SIGNATURE_FIELD_WIDTH_PX = DEFAULT_SIGNATURE_FIELD_HEIGHT_PX * 5;

export const getDefaultFieldSize = (fieldType: FieldType | null | undefined) => {
  if (fieldType === FieldType.SIGNATURE) {
    return {
      height: DEFAULT_SIGNATURE_FIELD_HEIGHT_PX,
      width: DEFAULT_SIGNATURE_FIELD_WIDTH_PX,
    };
  }

  return {
    height: DEFAULT_FIELD_HEIGHT_PX,
    width: DEFAULT_FIELD_WIDTH_PX,
  };
};
