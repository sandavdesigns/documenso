import { describe, expect, it } from 'vitest';

import { resolveDocumentOwnerNotificationRecipient } from './resolve-document-owner-notification-recipient';

describe('resolveDocumentOwnerNotificationRecipient', () => {
  it('uses the document reply-to address for owner notifications', () => {
    expect(
      resolveDocumentOwnerNotificationRecipient({
        owner: {
          name: 'Max Mustermann',
          email: 'max@example.com',
        },
        replyToEmail: 'signatures@example.com',
      }),
    ).toEqual({
      name: '',
      address: 'signatures@example.com',
    });
  });

  it('falls back to the personal owner address', () => {
    expect(
      resolveDocumentOwnerNotificationRecipient({
        owner: {
          name: 'Max Mustermann',
          email: 'max@example.com',
        },
      }),
    ).toEqual({
      name: 'Max Mustermann',
      address: 'max@example.com',
    });
  });
});
