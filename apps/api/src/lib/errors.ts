/** 业务错误统一形态：HTTP 状态 + 稳定错误码 + 人话消息。前端只认 code，不认消息。 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, msg: string, details?: unknown) =>
  new HttpError(400, code, msg, details);
export const unauthorized = (code = 'UNAUTHORIZED', msg = '未登录或登录已过期') =>
  new HttpError(401, code, msg);
export const forbidden = (code = 'FORBIDDEN', msg = '无权访问') => new HttpError(403, code, msg);
export const notFound = (code = 'NOT_FOUND', msg = '不存在') => new HttpError(404, code, msg);
export const conflict = (code: string, msg: string, details?: unknown) =>
  new HttpError(409, code, msg, details);
export const tooLarge = (code: string, msg: string) => new HttpError(413, code, msg);
