/**
 * @wendao/core · 规则内核（P1b 骨架）
 *
 * 这一层只做三件事，且**永远只做这三件事**：
 *   1. 定义状态（`GameState` 外壳 + 元字段），
 *   2. 提供唯一入口（`apply`：进快照、出新快照 + 事件流），
 *   3. 把历史存档搬到当前版本（迁移链）。
 *
 * 不碰 DOM、不读系统时钟（除 `engine/clock.ts` 一处边界）、不直连 `Math.random`，
 * 由根 `eslint.config.mjs` 强制。P4b 的服务端重放校验要靠这些约束才成立。
 */
export { createGame, type CreateGameOptions } from './create.ts';
export {
  GameStateSchema,
  GameMetaSchema,
  PhaseSchema,
  PHASES,
  STATE_FORMAT,
  STATE_VERSION,
  XUN_PER_MONTH,
  isGameState,
  parseGameState,
  type GameState,
  type GameMeta,
  type Phase,
} from './state/types.ts';
export { apply, type ApplyOptions, type ApplyResult } from './engine/apply.ts';
export { makeRng, seedToInt, rndInt, type Rng } from './engine/rng.ts';
export { hashState, hashString, stableStringify } from './engine/hash.ts';
export {
  eventsOfType,
  LOG_CATEGORIES,
  type GameEvent,
  type GameEventType,
  type LogCategory,
} from './engine/events.ts';
export type { CmdCtx, Command } from './engine/ctx.ts';
export { CoreError, type CoreErrorCode } from './errors.ts';
export { cmdAdvanceXun, cmdLog, cmdSetFlag, cmdStart } from './commands/meta.ts';
export {
  MIGRATIONS,
  migrateState,
  type Migration,
  type MigrateContext,
} from './migrations/index.ts';
export {
  exportSave,
  importSave,
  parseSaveEnvelope,
  type ImportSaveOptions,
  type ImportSaveResult,
} from './state/save.ts';
