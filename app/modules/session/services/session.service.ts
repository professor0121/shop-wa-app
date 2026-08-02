import type { Session } from '@prisma/client';
import { sessionRepository, SessionRepository } from '../repositories/session.repository';

export class SessionService {
  private repository: SessionRepository;

  constructor(repository: SessionRepository = sessionRepository) {
    this.repository = repository;
  }

  async getOfflineSession(shop: string): Promise<Session | null> {
    if (!shop) {
      throw new Error('Shop domain is required to find session');
    }
    return this.repository.findOfflineSessionByShop(shop);
  }

  async registerSession(session: Session): Promise<Session> {
    if (!session || !session.id || !session.shop) {
      throw new Error('Invalid session parameters');
    }
    return this.repository.saveSession(session);
  }

  async removeSessions(shop: string): Promise<void> {
    if (!shop) {
      throw new Error('Shop domain is required to delete session');
    }
    await this.repository.deleteSessionsByShop(shop);
  }
}

export const sessionService = new SessionService();
