import { FieldType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { getSignatureVariantLabel, ZEnvelopeFieldAndMetaSchema, ZSignatureFieldMeta } from './field-meta';

describe('dropdown field company defaults', () => {
  it('creates approval choices without preselecting a response', () => {
    const field = ZEnvelopeFieldAndMetaSchema.parse({ type: FieldType.DROPDOWN });

    expect(field.fieldMeta).toMatchObject({
      type: 'dropdown',
      values: [{ value: 'genehmigt' }, { value: 'abgelehnt' }],
      defaultValue: '',
    });
  });

  it('preserves existing custom choices and their selected value', () => {
    const fieldMeta = {
      type: 'dropdown',
      values: [{ value: 'Custom A' }, { value: 'Custom B' }],
      defaultValue: 'Custom B',
    };

    const field = ZEnvelopeFieldAndMetaSchema.parse({ type: FieldType.DROPDOWN, fieldMeta });

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
