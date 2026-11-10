export interface Config {
  port: number;
  production: boolean;
  demoAccountsEnabled: boolean;
  /** PostgreSQL bağlantı adresi; boşsa veriler bellekte tutulur. */
  databaseUrl: string | undefined;
  /** Google OAuth istemci kimliği; boşsa Google ile giriş kapalıdır. */
  googleClientId: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === 'production';
  const demo = env.DEMO_ACCOUNTS_ENABLED;
  return {
    port: Number(env.PORT) || 3000,
    production,
    demoAccountsEnabled: demo === 'true' ? true : demo === 'false' ? false : !production,
    databaseUrl: env.DATABASE_URL || undefined,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || undefined,
  };
}
