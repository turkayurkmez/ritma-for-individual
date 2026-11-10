import { conflict, notFound, unauthorized } from '../domain/errors.js';
import type { User } from '../domain/types.js';
import type { SessionStore, UserRepository } from '../repositories/types.js';
import type { GoogleTokenVerifier } from './google-token-verifier.js';
import type { Credentials, IdentityProvider } from './identity-provider.js';

export class SessionService {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly store: SessionStore,
    private readonly users: UserRepository,
    private readonly google?: GoogleTokenVerifier,
  ) {}

  async login(credentials: Credentials): Promise<{ token: string; user: User }> {
    const user = await this.provider.authenticate(credentials);
    if (!user) throw unauthorized('E-posta veya parola hatalı.');
    const session = await this.store.create(user.id);
    return { token: session.token, user };
  }

  async loginWithGoogle(credential: string): Promise<{ token: string; user: User }> {
    if (!this.google) throw notFound('Google ile giriş açık değil.');
    const identity = await this.google.verify(credential);
    const displayName = identity.name?.trim() || identity.email.split('@')[0];
    const user = await this.users.findOrCreateByGoogle({ googleSub: identity.sub, email: identity.email, displayName });
    if (!user) throw conflict('Bu e-posta adresi başka bir hesapta kayıtlı.');
    const session = await this.store.create(user.id);
    return { token: session.token, user };
  }

  async authenticateToken(token: string | undefined): Promise<User> {
    const session = token ? await this.store.find(token) : undefined;
    const user = session ? await this.users.findById(session.userId) : undefined;
    if (!user) throw unauthorized('Oturum açmanız gerekiyor.');
    return user;
  }

  logout(token: string): Promise<void> {
    return this.store.delete(token);
  }
}
