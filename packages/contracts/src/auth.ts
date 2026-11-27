import { z } from 'zod';

/** 账号相关 DTO。字段与 `apps/api/src/routes/auth.ts` 一一对应。 */

export const EmailSchema = z.string().trim().toLowerCase().email('邮箱格式不对').max(254);
export const PasswordSchema = z.string().min(8, '密码至少 8 位').max(128);
export const NicknameSchema = z.string().trim().min(1, '昵称不能为空').max(24);

export const RegisterBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  nickname: NicknameSchema,
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const LoginBodySchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const UserRoleSchema = z.enum(['PLAYER', 'EDITOR', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/** 登录/续期返回体。access token 只放内存，refresh 走 httpOnly cookie，故不出现在响应里。 */
export const AuthResultSchema = z.object({
  access: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    email: z.string(),
    nickname: z.string(),
    role: UserRoleSchema,
  }),
});
export type AuthResult = z.infer<typeof AuthResultSchema>;
