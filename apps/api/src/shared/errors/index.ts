export type AppErrorStatus = 400 | 401 | 402 | 403 | 404 | 409 | 410 | 422 | 500 | 502 | 503 | 504

export class AppError extends Error {
  constructor(
    public readonly statusCode: AppErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  get status(): AppErrorStatus {
    return this.statusCode
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message)
  }
}
