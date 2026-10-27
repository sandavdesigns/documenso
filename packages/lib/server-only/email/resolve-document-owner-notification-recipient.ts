export type DocumentOwnerNotificationRecipient = {
  owner: {
    email: string;
    name?: string | null;
  };
  replyToEmail?: string;
};

/**
 * Document status notifications follow the document's configured reply-to
 * address. The owner's personal address remains the fallback.
 */
export const resolveDocumentOwnerNotificationRecipient = ({
  owner,
  replyToEmail,
}: DocumentOwnerNotificationRecipient) => {
  const address = replyToEmail?.trim() || owner.email;

  return {
    name: address === owner.email ? owner.name || '' : '',
    address,
  };
};
