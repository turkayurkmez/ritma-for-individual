import { ApiError, request } from './client';
import type { User } from './types';

export async function login(email: string, password: string): Promise<User> {
  const result = await request<{ user: User }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipUnauthorizedHandler: true,
  });
  return result.user;
}

export async function fetchMe(): Promise<User | null> {
  try {
    const result = await request<{ user: User }>('/auth/me', { skipUnauthorizedHandler: true });
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function logout(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' });
}
