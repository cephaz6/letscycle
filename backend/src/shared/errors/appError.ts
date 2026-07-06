export interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  cause?: unknown;
}

// isOperational separates expected failures (validation, not-found, ...)
// from bugs: operational errors return their message to clients; anything
// else is logged and masked as a 500.
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? 'internalError';
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
  }
}
