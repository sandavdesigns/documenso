import { describe, expect, it } from 'vitest';

import { ZSignatureFieldMeta, getSignatureVariantLabel } from './field-meta';

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
