import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { User } from '../domain/types.js';
import type { Credentials, IdentityProvider } from './identity-provider.js';

interface DemoAccount {
  user: User;
  salt: Buffer;
  hash: Buffer;
}

const KEY_LENGTH = 64;

const DEMO_USERS: ReadonlyArray<{ user: User; password: string }> = [
  { user: { id: 'demo-user-ayse', email: 'ayse@ritma.demo', displayName: 'Ayşe Demir' }, password: 'demo-ayse-123' },
  { user: { id: 'demo-user-mehmet', email: 'mehmet@ritma.demo', displayName: 'Mehmet Kaya' }, password: 'demo-mehmet-123' },
];

function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

export class DemoIdentityProvider implements IdentityProvider {
  private readonly accounts: DemoAccount[] = DEMO_USERS.map(({ user, password }) => {
    const salt = randomBytes(16);
    return { user, salt, hash: hashPassword(password, salt) };
  });

  async authenticate({ email, password }: Credentials): Promise<User | undefined> {
    const account = this.accounts.find((a) => a.user.email === email.trim().toLowerCase());
    if (!account) return undefined;
    const candidate = hashPassword(password, account.salt);
    return timingSafeEqual(candidate, account.hash) ? account.user : undefined;
  }

  async findUser(id: string): Promise<User | undefined> {
    return this.accounts.find((a) => a.user.id === id)?.user;
  }
}
