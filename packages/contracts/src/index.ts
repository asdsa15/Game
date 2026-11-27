/**
 * @wendao/contracts · 双端契约
 *
 * 只放 schema 与类型，不放实现。任何一端要"验一下这个请求/存档长什么样"，
 * 都从这里取，不再各写一份 zod —— 两份 schema 迟早会漂，而漂出来的
 * 是"前端能提交、后端 500"这种最难查的 bug。
 */
export * from './save.ts';
export * from './auth.ts';
export * from './runs.ts';
export * from './leaderboard.ts';
export * from './content.ts';
export * from './errors.ts';
