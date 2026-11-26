import { z } from 'zod';

/**
 * 配置只有这一处是真源。启动即校验，缺变量直接退出。
 *
 * 本项目按**本地单机**定位：默认用 PGlite（Postgres 编成 WASM，数据落本地目录），
 * 不用装 Postgres、不用 Docker。要接真实 Postgres 时把 DB_DRIVER 改成 postgres。
 */
const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().max(65535).default(8787),

  DB_DRIVER: z.enum(['pglite', 'postgres']).default('pglite'),
  /** PGlite 数据目录；填 'memory' 则每次启动清空（演示用） */
  PGLITE_DIR: z.string().default('./data/pg'),
  DATABASE_URL: z.string().optional(),

  /* 本地项目：给一个开发默认值，开箱即跑；生产环境若仍是这个默认值，启动直接拒。
     密钥至少 32 字节——短于这个等于没签。 */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少 32 字符')
    .default('wendao-local-dev-secret-0123456789abcdef'),
  ACCESS_TTL: z.coerce.number().int().positive().default(900),          // 秒，15 分钟
  REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),   // 秒，30 天

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  BODY_LIMIT: z.coerce.number().int().positive().default(2 * 1024 * 1024),
  SAVE_BYTES_MAX: z.coerce.number().int().positive().default(512 * 1024),
}).superRefine((v, ctx) => {
  if (v.NODE_ENV === 'production' && v.JWT_SECRET === 'wendao-local-dev-secret-0123456789abcdef') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: '生产环境必须换成自己的密钥' });
  }
  if (v.DB_DRIVER === 'postgres' && !v.DATABASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'DB_DRIVER=postgres 时必填',
    });
  }
});

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  dbDriver: 'pglite' | 'postgres';
  pgliteDir: string;
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
    dbDriver: e.DB_DRIVER,
    pgliteDir: e.PGLITE_DIR,
    databaseUrl: e.DATABASE_URL ?? '',
    jwtSecret: e.JWT_SECRET,
    accessTtl: e.ACCESS_TTL,
    refreshTtl: e.REFRESH_TTL,
    corsOrigins: e.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    cookieSecure: e.COOKIE_SECURE === 'true',
    bodyLimit: e.BODY_LIMIT,
    saveBytesMax: e.SAVE_BYTES_MAX,
  };
}
