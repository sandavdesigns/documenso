-- Keep certificate and audit evidence available separately without appending
-- additional pages to every completed PDF.

ALTER TABLE "OrganisationGlobalSettings"
  ALTER COLUMN "includeSigningCertificate" SET DEFAULT false,
  ALTER COLUMN "includeAuditLog" SET DEFAULT false;

UPDATE "OrganisationGlobalSettings"
SET
  "includeSigningCertificate" = false,
  "includeAuditLog" = false;

UPDATE "TeamGlobalSettings"
SET
  "includeSigningCertificate" = false,
  "includeAuditLog" = false;
