import type { User } from '../domain/types.js';

export interface Credentials {
  email: string;
  password: string;
}

/** Giriş yöntemi bu arayüzün arkasındadır; Google sonradan yeni bir gerçekleme olarak eklenir. */
export interface IdentityProvider {
  authenticate(credentials: Credentials): Promise<User | undefined>;
  findUser(id: string): Promise<User | undefined>;
}
