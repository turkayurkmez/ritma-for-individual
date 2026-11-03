import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';

export function renderApp(ui: ReactElement, options: { route?: string } = {}): RenderResult {
  return render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

type StubResult = { status?: number; body?: unknown };
type StubHandler = (request: { url: string; body: unknown }) => StubResult | Promise<StubResult>;
export interface FetchCall {
  method: string;
  url: string;
  body: unknown;
}

// Ağ sınırında fetch taklit edilir. Anahtar "GET /api/v1/auth/me" biçimindedir;
// eşleşmeyen çağrı hata fırlatır ve test düşer.
export function stubFetch(handlers: Record<string, StubHandler>): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, url: input, body });
    const handler = handlers[`${method} ${input}`];
    if (!handler) throw new Error(`Beklenmeyen istek: ${method} ${input}`);
    const result = await handler({ url: input, body });
    const status = result.status ?? (result.body === undefined ? 204 : 200);
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), { status });
  });
  return { calls };
}
