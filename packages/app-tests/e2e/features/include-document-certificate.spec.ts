import { getDocumentByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { getEnvelopeItemPdfUrl } from '@documenso/lib/utils/envelope-download';
import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedTeam } from '@documenso/prisma/seed/teams';
import { seedUser } from '@documenso/prisma/seed/users';
import { PDF } from '@libpdf/core';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType } from '@prisma/client';

import { signSignaturePad } from '../fixtures/signature';

test.describe('Company PDF appendix policy', () => {
  test('individual document should not append signing certificate pages', async ({ page }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients[0];

    const documentData = await prisma.envelopeItem
      .findFirstOrThrow({
        where: {
          envelopeId: document.id,
        },
      })
      .then(async (data) => {
        const documentUrl = getEnvelopeItemPdfUrl({
          type: 'download',
          envelopeItem: data,
          token: recipient.token,
          version: 'signed',
        });
        return fetch(documentUrl).then(async (res) => await res.arrayBuffer());
      });

    const originalPdf = await PDF.load(new Uint8Array(documentData));

    // Sign the document
    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();

    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Sign' }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await page.waitForTimeout(10000);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    // Get the completed document
    const completedDocument = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const firstDocumentData = completedDocument.envelopeItems[0];

    const documentUrl = getEnvelopeItemPdfUrl({
      type: 'download',
      envelopeItem: firstDocumentData,
      token: recipient.token,
      version: 'signed',
    });

    const pdfData = await fetch(documentUrl).then(async (res) => await res.arrayBuffer());

    const completedDocumentData = new Uint8Array(pdfData);

    // Load the PDF and check number of pages
    const pdfDoc = await PDF.load(new Uint8Array(completedDocumentData));

    expect(pdfDoc.getPageCount()).toBe(originalPdf.getPageCount());
  });

  test('stored team override should not append signing certificate pages', async ({ page }) => {
    const { owner, team } = await seedTeam();

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: owner,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const teamSettingsId = await prisma.teamGlobalSettings.findFirstOrThrow({
      where: {
        team: {
          id: team.id,
        },
      },
    });

    await prisma.teamGlobalSettings.update({
      where: {
        id: teamSettingsId.id,
      },
      data: {
        includeSigningCertificate: true,
      },
    });

    const recipient = recipients[0];

    const documentData = await prisma.envelopeItem
      .findFirstOrThrow({
        where: {
          envelopeId: document.id,
        },
      })
      .then(async (data) => {
        const documentUrl = getEnvelopeItemPdfUrl({
          type: 'download',
          envelopeItem: data,
          token: recipient.token,
          version: 'signed',
        });
        return fetch(documentUrl).then(async (res) => await res.arrayBuffer());
      });

    const originalPdf = await PDF.load(new Uint8Array(documentData));

    // Sign the document
    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();
    await page.getByRole('button', { name: 'Sign' }).click();
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    // Get the completed document
    const completedDocument = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const firstDocumentData = completedDocument.envelopeItems[0];

    const documentUrl = getEnvelopeItemPdfUrl({
      type: 'download',
      envelopeItem: firstDocumentData,
      token: recipient.token,
      version: 'signed',
    });

    const pdfData = await fetch(documentUrl).then(async (res) => await res.arrayBuffer());

    const completedDocumentData = new Uint8Array(pdfData);

    // Load the PDF and check number of pages
    const completedPdf = await PDF.load(new Uint8Array(completedDocumentData));

    expect(completedPdf.getPageCount()).toBe(originalPdf.getPageCount());
  });

  test('team document with signing certificate disabled should not include certificate', async ({ page }) => {
    const { owner, team } = await seedTeam();

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: owner,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const teamSettingsId = await prisma.teamGlobalSettings.findFirstOrThrow({
      where: {
        team: {
          id: team.id,
        },
      },
    });

    await prisma.teamGlobalSettings.update({
      where: {
        id: teamSettingsId.id,
      },
      data: {
        includeSigningCertificate: false,
      },
    });

    const recipient = recipients[0];

    const documentData = await prisma.envelopeItem
      .findFirstOrThrow({
        where: {
          envelopeId: document.id,
        },
      })
      .then(async (data) => {
        const documentUrl = getEnvelopeItemPdfUrl({
          type: 'download',
          envelopeItem: data,
          token: recipient.token,
          version: 'signed',
        });
        return fetch(documentUrl).then(async (res) => await res.arrayBuffer());
      });

    const originalPdf = await PDF.load(new Uint8Array(documentData));

    // Sign the document
    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();
    await page.getByRole('button', { name: 'Sign' }).click();
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    // Get the completed document
    const completedDocument = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const documentUrl = getEnvelopeItemPdfUrl({
      type: 'download',
      envelopeItem: completedDocument.envelopeItems[0],
      token: recipient.token,
      version: 'signed',
    });

    const completedDocumentData = await fetch(documentUrl).then(async (res) => await res.arrayBuffer());

    // Load the PDF and check number of pages
    const completedPdf = await PDF.load(new Uint8Array(completedDocumentData));

    expect(completedPdf.getPageCount()).toBe(originalPdf.getPageCount());
  });
});
