import { z } from 'zod';

/**
 * 配置只有这一处是真源。
 * 启动即校验，缺变量直接退出——不要"运行时才发现没配 DATABASE_URL"。
 */
const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65535).default(8787),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL 必填'),

  // access token 用 HS256 签；密钥至少 32 字节，短于这个等于没签
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少 32 字符'),
  ACCESS_TTL: z.coerce.number().int().positive().default(900),          // 秒，15 分钟
  REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),   // 秒，30 天

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  BODY_LIMIT: z.coerce.number().int().positive().default(2 * 1024 * 1024),
  SAVE_BYTES_MAX: z.coerce.number().int().positive().default(512 * 1024),
});

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  accessTtl: number;
  refreshTtl: number;
  corsOrigins: string[];
  cookieSecure: boolean;
  bodyLimit: number;
  saveBytesMax: number;
}

export function loadConfig(src: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Schema.safeParse(src);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(i => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error('配置校验失败：\n' + lines.join('\n'));
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    accessTtl: e.ACCESS_TTL,
    refreshTtl: e.REFRESH_TTL,
    corsOrigins: e.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    cookieSecure: e.COOKIE_SECURE === 'true',
    bodyLimit: e.BODY_LIMIT,
    saveBytesMax: e.SAVE_BYTES_MAX,
  };
}
