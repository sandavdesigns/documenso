-- Company defaults for Sandav/GSWN self-hosted Documenso.
-- Existing team overrides are intentionally left untouched so changed team settings stay as-is.

ALTER TABLE "DocumentMeta" ALTER COLUMN "dateFormat" SET DEFAULT 'dd.MM.yyyy';
ALTER TABLE "DocumentMeta" ALTER COLUMN "language" SET DEFAULT 'de';
ALTER TABLE "DocumentMeta" ALTER COLUMN "typedSignatureEnabled" SET DEFAULT false;
ALTER TABLE "DocumentMeta" ALTER COLUMN "drawSignatureEnabled" SET DEFAULT false;

ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "documentLanguage" SET DEFAULT 'de';
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "documentDateFormat" SET DEFAULT 'dd.MM.yyyy';
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "includeAuditLog" SET DEFAULT true;
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "typedSignatureEnabled" SET DEFAULT false;
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "drawSignatureEnabled" SET DEFAULT false;

UPDATE "OrganisationGlobalSettings"
SET "documentLanguage" = 'de'
WHERE "documentLanguage" = 'en';

UPDATE "OrganisationGlobalSettings"
SET "documentDateFormat" = 'dd.MM.yyyy'
WHERE "documentDateFormat" = 'yyyy-MM-dd hh:mm a';

UPDATE "OrganisationGlobalSettings"
SET "includeAuditLog" = true
WHERE "includeAuditLog" = false;

UPDATE "OrganisationGlobalSettings"
SET
  "typedSignatureEnabled" = false,
  "uploadSignatureEnabled" = true,
  "drawSignatureEnabled" = false
WHERE
  "typedSignatureEnabled" = true
  AND "uploadSignatureEnabled" = true
  AND "drawSignatureEnabled" = true;

UPDATE "OrganisationGlobalSettings"
SET "emailReplyTo" = 'noreply@example.com'
WHERE "emailReplyTo" IS NULL OR "emailReplyTo" = '';

UPDATE "OrganisationGlobalSettings"
SET "emailDocumentSettings" = '{
  "recipientSigningRequest": true,
  "recipientRemoved": true,
  "recipientSigned": false,
  "documentPending": false,
  "documentCompleted": false,
  "documentDeleted": true,
  "ownerDocumentCompleted": true,
  "ownerRecipientExpired": true,
  "ownerDocumentCreated": true
}'::jsonb
WHERE
  "emailDocumentSettings" IS NULL
  OR "emailDocumentSettings" = '{
    "recipientSigningRequest": true,
    "recipientRemoved": true,
    "recipientSigned": true,
    "documentPending": true,
    "documentCompleted": true,
    "documentDeleted": true,
    "ownerDocumentCompleted": true,
    "ownerRecipientExpired": true,
    "ownerDocumentCreated": true
  }'::jsonb;

UPDATE "OrganisationGlobalSettings"
SET "envelopeExpirationPeriod" = '{"unit":"day","amount":5}'::jsonb
WHERE
  "envelopeExpirationPeriod" IS NULL
  OR "envelopeExpirationPeriod" = '{"unit":"month","amount":3}'::jsonb;

UPDATE "OrganisationGlobalSettings"
SET "reminderSettings" = '{
  "sendAfter": { "unit": "day", "amount": 1 },
  "repeatEvery": { "unit": "day", "amount": 1 }
}'::jsonb
WHERE
  "reminderSettings" IS NULL
  OR "reminderSettings" = '{
    "sendAfter": { "unit": "day", "amount": 5 },
    "repeatEvery": { "unit": "day", "amount": 2 }
  }'::jsonb;
