import { prisma } from '@documenso/prisma';

const LEGACY_DELETED_ACCOUNT_EMAIL = 'deleted-account@documenso.com';
const DELETED_ACCOUNT_EMAIL_PREFIX = 'deleted-account@';

const deletedAccountServiceAccountSelect = {
  id: true,
  email: true,
  ownedOrganisations: {
    select: {
      id: true,
      teams: {
        select: {
          id: true,
        },
      },
    },
  },
} as const;

const hasOwnedTeam = {
  ownedOrganisations: {
    some: {
      teams: {
        some: {},
      },
    },
  },
} as const;

export const deletedServiceAccountEmail = () => {
  try {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (process.env.NEXT_PRIVATE_DELETED_SERVICE_ACCOUNT_EMAIL) {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      return process.env.NEXT_PRIVATE_DELETED_SERVICE_ACCOUNT_EMAIL;
    }

    const { hostname } = new URL(process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000');

    return `deleted-account@${hostname}`;
  } catch {
    return LEGACY_DELETED_ACCOUNT_EMAIL;
  }
};

export const deletedAccountServiceAccount = async () => {
  const currentEmail = deletedServiceAccountEmail();

  const currentServiceAccount = await prisma.user.findFirst({
    where: {
      email: currentEmail,
      ...hasOwnedTeam,
    },
    select: deletedAccountServiceAccountSelect,
  });

  if (currentServiceAccount) {
    return currentServiceAccount;
  }

  // The derived address changes when NEXT_PUBLIC_WEBAPP_URL changes. Fall
  // back to a service account created for an earlier hostname so team and
  // organisation deletion keeps working after a URL migration.
  const previousServiceAccount = await prisma.user.findFirst({
    where: {
      email: {
        startsWith: DELETED_ACCOUNT_EMAIL_PREFIX,
      },
      ...hasOwnedTeam,
    },
    orderBy: {
      id: 'asc',
    },
    select: deletedAccountServiceAccountSelect,
  });

  if (!previousServiceAccount) {
    throw new Error('Deleted account service account not found, have you ran the appropriate migrations?');
  }

  return previousServiceAccount;
};

export const migrateDeletedAccountServiceAccount = async () => {
  const currentEmail = deletedServiceAccountEmail();

  if (currentEmail === LEGACY_DELETED_ACCOUNT_EMAIL) {
    return;
  }

  const currentServiceAccount = await prisma.user.findFirst({
    where: {
      email: currentEmail,
      ...hasOwnedTeam,
    },
    select: {
      id: true,
    },
  });

  if (currentServiceAccount) {
    return;
  }

  const previousServiceAccount = await prisma.user.findFirst({
    where: {
      email: {
        startsWith: DELETED_ACCOUNT_EMAIL_PREFIX,
      },
      ...hasOwnedTeam,
    },
    orderBy: {
      id: 'asc',
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (previousServiceAccount && previousServiceAccount.email !== currentEmail) {
    console.log(`Migrating deleted account service account to new email: ${currentEmail}`);

    await prisma.user.update({
      where: {
        id: previousServiceAccount.id,
      },
      data: {
        email: currentEmail,
      },
    });
  }
};
