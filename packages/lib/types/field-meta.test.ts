import { FieldType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { getSignatureVariantLabel, ZEnvelopeFieldAndMetaSchema, ZSignatureFieldMeta } from './field-meta';

describe('radio field company defaults', () => {
  it('creates approval choices without preselecting a response', () => {
    const field = ZEnvelopeFieldAndMetaSchema.parse({ type: FieldType.RADIO });

    expect(field.fieldMeta).toMatchObject({
      type: 'radio',
      values: [
        { id: 1, value: 'genehmigt', checked: false },
        { id: 2, value: 'abgelehnt', checked: false },
      ],
    });
  });

  it('preserves existing custom choices and their selected value', () => {
    const fieldMeta = {
      type: 'radio',
      direction: 'horizontal',
      values: [
        { id: 4, value: 'Custom A', checked: false },
        { id: 7, value: 'Custom B', checked: true },
      ],
    };

    const field = ZEnvelopeFieldAndMetaSchema.parse({ type: FieldType.RADIO, fieldMeta });

    expect(field.fieldMeta).toMatchObject(fieldMeta);
  });
});

describe('signature field variants', () => {
  it('defaults existing signature fields to the standard variant', () => {
    expect(ZSignatureFieldMeta.parse({ type: 'signature' }).signatureVariant).toBe('standard');
  });

  it.each([
    ['standard', ''],
    ['ia', 'i.A.'],
    ['iv', 'i.V.'],
    ['ppa', 'ppa.'],
  ] as const)('maps %s to its visible label', (variant, label) => {
    expect(getSignatureVariantLabel(variant)).toBe(label);
  });

  it('rejects unsupported variants', () => {
    expect(ZSignatureFieldMeta.safeParse({ type: 'signature', signatureVariant: 'prokura' }).success).toBe(false);
  });
});
