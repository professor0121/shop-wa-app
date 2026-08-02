import prisma from '../../../db.server';
import type { Session } from '@prisma/client';

export class SessionRepository {
  async findOfflineSessionByShop(shop: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        shop,
        isOnline: false,
      },
    });
  }

  async saveSession(session: Session): Promise<Session> {
    return prisma.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        expires: session.expires,
        accessToken: session.accessToken,
        userId: session.userId,
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        accountOwner: session.accountOwner,
        locale: session.locale,
        collaborator: session.collaborator,
        emailVerified: session.emailVerified,
        refreshToken: session.refreshToken,
        refreshTokenExpires: session.refreshTokenExpires,
      },
      create: {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        expires: session.expires,
        accessToken: session.accessToken,
        userId: session.userId,
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        accountOwner: session.accountOwner,
        locale: session.locale,
        collaborator: session.collaborator,
        emailVerified: session.emailVerified,
        refreshToken: session.refreshToken,
        refreshTokenExpires: session.refreshTokenExpires,
      },
    });
  }

  async deleteSessionsByShop(shop: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { shop },
    });
  }
}
export const sessionRepository = new SessionRepository();
