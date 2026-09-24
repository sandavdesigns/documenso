import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({
  prisma: {
    user: prismaMocks,
  },
}));

import { deletedAccountServiceAccount, migrateDeletedAccountServiceAccount } from './deleted-account';

const previousWebappUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;

const staleServiceAccount = {
  id: 42,
  email: 'deleted-account@10.10.151.193',
  ownedOrganisations: [{ id: 'internal', teams: [{ id: 7 }] }],
};

describe('deleted account service account', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WEBAPP_URL = 'https://documenso.swgth.de';
    prismaMocks.findFirst.mockReset();
    prismaMocks.update.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_WEBAPP_URL = previousWebappUrl;
  });

  it('falls back to a service account created for a previous hostname', async () => {
    prismaMocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(staleServiceAccount);

    await expect(deletedAccountServiceAccount()).resolves.toEqual(staleServiceAccount);

    expect(prismaMocks.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          email: { startsWith: 'deleted-account@' },
        }),
      }),
    );
  });

  it('migrates a service account from the previous hostname', async () => {
    prismaMocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(staleServiceAccount);
    prismaMocks.update.mockResolvedValue({ ...staleServiceAccount, email: 'deleted-account@documenso.swgth.de' });

    await migrateDeletedAccountServiceAccount();

    expect(prismaMocks.update).toHaveBeenCalledWith({
      where: { id: staleServiceAccount.id },
      data: { email: 'deleted-account@documenso.swgth.de' },
    });
  });
});
