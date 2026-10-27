export type ErrorCode = 'validation_error' | 'unauthorized' | 'not_found' | 'conflict';

export class AppError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const validationError = (message: string) => new AppError(400, 'validation_error', message);
export const unauthorized = (message: string) => new AppError(401, 'unauthorized', message);
export const notFound = (message: string) => new AppError(404, 'not_found', message);
export const conflict = (message: string) => new AppError(409, 'conflict', message);
