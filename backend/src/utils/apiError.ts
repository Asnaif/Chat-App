export class ApiError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string>;

  constructor(statusCode: number, message: string, code = 'INTERNAL_ERROR', fields?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
