import type { ErrorRequestHandler } from 'express';
import { AppError } from '../domain/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'validation_error', message: 'İstek gövdesi geçerli bir JSON değil.' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: 'Beklenmeyen bir hata oluştu.' } });
};
