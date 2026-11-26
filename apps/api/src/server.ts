import { loadConfig } from './env.ts';
import { openDatabase } from './open-db.ts';
import { makeTokens } from './lib/tokens.ts';
import { buildApp } from './app.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const opened = await openDatabase(config);
  const tokens = makeTokens(config.jwtSecret, config.accessTtl);
  const app = await buildApp({ config, db: opened.db, tokens });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, '准备关闭');
    await app.close();
    await opened.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  app.log.info(`问道长生服务端已启动 http://${config.host}:${config.port}　库：${opened.driver} @ ${opened.location}`);
}

main().catch(err => {
  console.error('启动失败：', err instanceof Error ? err.message : err);
  process.exit(1);
});
