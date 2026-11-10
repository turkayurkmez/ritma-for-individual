import { AppError, unauthorized, upstreamError } from '../domain/errors.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string;
}

export interface GoogleTokenVerifier {
  verify(credential: string): Promise<GoogleIdentity>;
}

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const DEFAULT_TIMEOUT_MS = 5000;

const INVALID_MESSAGE = 'Google kimliği geçersiz ya da süresi dolmuş.';
const UNVERIFIED_MESSAGE = 'Google hesabının e-postası doğrulanmamış.';
const UNREACHABLE_MESSAGE = 'Google ile bağlantı kurulamadı, biraz sonra tekrar dene.';

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function createTokeninfoVerifier(
  clientId: string,
  options: { fetch?: typeof fetch; timeoutMs?: number; now?: () => number } = {},
): GoogleTokenVerifier {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;

  return {
    async verify(credential: string): Promise<GoogleIdentity> {
      let response: Response;
      let body: unknown;
      try {
        response = await doFetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`, {
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status >= 400 && response.status < 500) throw unauthorized(INVALID_MESSAGE);
        if (!response.ok) throw upstreamError(UNREACHABLE_MESSAGE);
        body = await response.json();
      } catch (error) {
        // Never forward the original error: it could carry the credential (e.g. in the URL).
        if (error instanceof AppError) throw error;
        throw upstreamError(UNREACHABLE_MESSAGE);
      }

      if (typeof body !== 'object' || body === null) throw unauthorized(INVALID_MESSAGE);
      const claims = body as Record<string, unknown>;

      if (claims.aud !== clientId) throw unauthorized(INVALID_MESSAGE);
      if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.includes(claims.iss)) {
        throw unauthorized(INVALID_MESSAGE);
      }
      const exp = Number(claims.exp);
      if (!Number.isFinite(exp) || exp * 1000 <= now()) throw unauthorized(INVALID_MESSAGE);
      if (claims.email_verified !== 'true') throw unauthorized(UNVERIFIED_MESSAGE);
      const sub = nonEmptyString(claims.sub);
      const email = nonEmptyString(claims.email);
      if (!sub || !email) throw unauthorized(INVALID_MESSAGE);

      return { sub, email, name: nonEmptyString(claims.name) };
    },
  };
}
