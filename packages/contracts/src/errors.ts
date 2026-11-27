import { z } from 'zod';

/**
 * 统一错误体。全站只有这一种错误形状：
 * `{ error: { code, message, details? } }`
 *
 * 为什么单独定义：前端要按 `code` 分支（比如 409 冲突时弹"保留哪一份"），
 * 而不是去解析人话 message。message 是给玩家看的，code 是给代码看的。
 */
export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'SAVE_TOO_LARGE',
  'SAVE_UNRECOGNIZED',
  'SAVE_VERSION_CONFLICT',
  'UNKNOWN_ENDING',
  'DB_UNREACHABLE',
  'INTERNAL',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
