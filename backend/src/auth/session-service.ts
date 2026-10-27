import { unauthorized } from '../domain/errors.js';
import type { User } from '../domain/types.js';
import type { SessionStore } from '../repositories/types.js';
import type { Credentials, IdentityProvider } from './identity-provider.js';

export class SessionService {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly store: SessionStore,
  ) {}

  async login(credentials: Credentials): Promise<{ token: string; user: User }> {
    const user = await this.provider.authenticate(credentials);
    if (!user) throw unauthorized('E-posta veya parola hatalı.');
    const session = await this.store.create(user.id);
    return { token: session.token, user };
  }

  async authenticateToken(token: string | undefined): Promise<User> {
    const session = token ? await this.store.find(token) : undefined;
    const user = session ? await this.provider.findUser(session.userId) : undefined;
    if (!user) throw unauthorized('Oturum açmanız gerekiyor.');
    return user;
  }

  logout(token: string): Promise<void> {
    return this.store.delete(token);
  }
}
