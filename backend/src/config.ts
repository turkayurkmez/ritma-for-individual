export interface Config {
  port: number;
  production: boolean;
  demoAccountsEnabled: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === 'production';
  const demo = env.DEMO_ACCOUNTS_ENABLED;
  return {
    port: Number(env.PORT) || 3000,
    production,
    demoAccountsEnabled: demo === 'true' ? true : demo === 'false' ? false : !production,
  };
}
