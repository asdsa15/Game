import type { FastifyInstance } from 'fastify';
import type { Deps } from './_shared.ts';

export const registerHealthRoutes = (app: FastifyInstance, deps: Deps): void => {
  app.get('/healthz', async (_req, reply) => {
    try {
      await deps.db.query('select 1 as ok');
      return {
        ok: true,
        version: process.env.npm_package_version ?? '0.1.0',
        env: deps.config.nodeEnv,
        time: new Date().toISOString(),
      };
    } catch (err) {
      reply.code(503);
      return {
        ok: false,
        reason: 'db_unreachable',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  });
};
