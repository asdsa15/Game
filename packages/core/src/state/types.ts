import { z } from 'zod';

/**
 * 状态外壳。
 *
 * P1b 的铁律：**只定外壳与元字段**，各域字段随 P2 分批加。
 * 现在就把 210 个字段一次定死，等于把旧 `S` 的形状抄一遍——
 * 那样迁移链会立刻长出十个版本，而玩家存档天天变。
 *
 * 所以：
 *   · `meta` 是"任何一局都必须有"的东西：版本、内容版本、种子、随机数游标、时间、阶段。
 *   · `domains` 是未来 12 个域的落脚处。P1b 阶段它只放 `legacy`（旧档整包），
 *     P2 起每搬完一个域就多一个键，并补一条迁移。
 */

export const STATE_FORMAT = 'wendao-state';
export const STATE_VERSION = 1;

export const PHASES = ['create', 'play', 'combat', 'dying', 'over'] as const;
export const PhaseSchema = z.enum(PHASES);
export type Phase = z.infer<typeof PhaseSchema>;

/** 一旬三旬，一月三旬（与旧版 XUN_PER_MONTH 一致；改这个数就是改玩法节奏） */
export const XUN_PER_MONTH = 3;

export const GameMetaSchema = z
  .object({
    format: z.literal(STATE_FORMAT),
    /** 状态结构版本：迁移链的锚点，每搬完一批域 +1 */
    stateVersion: z.number().int().positive(),
    /** 这一局是在哪一版内容下打出来的（内容包 digest 或语义版本） */
    contentVersion: z.string().min(1),
    /** 玩家可见的种子（字符串），可由它重建整局 */
    seed: z.string().min(1),
    /** 随机数游标：mulberry32 的 32 位状态，**存档必须带上它**，否则读档就不可复现 */
    rngState: z.number().int().nonnegative(),
    /** 已掷随机数的次数。诊断用：对不上就说明有人绕过 ctx.rng */
    rngDraws: z.number().int().nonnegative(),
    /** 第几回合（旧版 turn：每过一月 +1） */
    turn: z.number().int().nonnegative(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    /** 本月已过几旬：0 上旬 / 1 中旬 / 2 下旬 */
    xun: z
      .number()
      .int()
      .min(0)
      .max(XUN_PER_MONTH - 1),
    phase: PhaseSchema,
    started: z.boolean(),
    createdAt: z.number().int().nonnegative(),
    /** 最后一版迁移的来源标记（'v2' / 'legacy/10.2' / 'legacy/bare'），排查"这个档为什么怪"用 */
    importedFrom: z.string().optional(),
  })
  .strict();

export type GameMeta = z.infer<typeof GameMetaSchema>;

export const GameStateSchema = z
  .object({
    meta: GameMetaSchema,
    /**
     * 各域数据。P1b 只有 `legacy`（旧档整包，原样保存、不丢字段）；
     * P2 起逐域搬出，`legacy` 随之缩小，P6 删除。
     */
    domains: z.record(z.unknown()),
  })
  .strict();

export type GameState = z.infer<typeof GameStateSchema>;

export function isGameState(value: unknown): value is GameState {
  return GameStateSchema.safeParse(value).success;
}

export function parseGameState(value: unknown): GameState {
  return GameStateSchema.parse(value);
}
