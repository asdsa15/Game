import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { HttpError } from './lib/errors.ts';
import type { Deps } from './routes/_shared.ts';
import { registerHealthRoutes } from './routes/health.ts';
import { registerAuthRoutes } from './routes/auth.ts';
import { registerSaveRoutes } from './routes/saves.ts';
import { registerRunRoutes } from './routes/runs.ts';
import { registerLeaderboardRoutes } from './routes/leaderboard.ts';

export async function buildApp(deps: Deps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.config.nodeEnv === 'test'
      ? false
      : { level: deps.config.nodeEnv === 'production' ? 'info' : 'debug' },
    bodyLimit: deps.config.bodyLimit,
    trustProxy: true,
  });

  // API 只回 JSON，CSP 交给前端站点管；helmet 其余头照常加
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: deps.config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match'],
    exposedHeaders: ['ETag'],
  });
  await app.register(cookie);
  // 默认不限流，登录类路由在各自 config 里单独设
  await app.register(rateLimit, { global: false });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION',
          message: '参数不合法',
          details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    // Fastify 自身抛的 4xx（body 解析失败、payload 过大等）
    const fastifyErr = err as { statusCode?: number; code?: string; message?: string };
    const status = fastifyErr.statusCode ?? 500;
    if (status >= 400 && status < 500) {
      return reply.code(status).send({
        error: { code: fastifyErr.code ?? 'BAD_REQUEST', message: fastifyErr.message ?? '请求不合法' },
      });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: '服务器开小差了，请稍后再试' } });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: { code: 'NO_ROUTE', message: `没有这个接口：${req.method} ${req.url}` } });
  });

  registerHealthRoutes(app, deps);
  registerAuthRoutes(app, deps);
  registerSaveRoutes(app, deps);
  registerRunRoutes(app, deps);
  registerLeaderboardRoutes(app, deps);

  return app;
}
