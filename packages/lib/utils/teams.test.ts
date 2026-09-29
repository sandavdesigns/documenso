import { describe, expect, it } from 'vitest';

import { generateDefaultOrganisationSettings } from './organisations';
import { extractDerivedTeamSettings, generateDefaultTeamSettings } from './teams';

describe('company PDF appendix settings', () => {
  it('keeps certificate and audit-log pages disabled despite stored overrides', () => {
    const organisationSettings = {
      ...generateDefaultOrganisationSettings(),
      includeSigningCertificate: true,
      includeAuditLog: true,
    };
    const teamSettings = {
      ...generateDefaultTeamSettings(),
      includeSigningCertificate: true,
      includeAuditLog: true,
    };

    const settings = extractDerivedTeamSettings(organisationSettings, teamSettings);

    expect(settings.includeSigningCertificate).toBe(false);
    expect(settings.includeAuditLog).toBe(false);
  });
});
