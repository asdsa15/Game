import {
  LegacySaveEnvelopeSchema,
  SAVE_FORMAT_V2,
  SAVE_VERSION_V2,
  SaveEnvelopeV2Schema,
  pickSaveMeta,
  type SaveEnvelopeV2,
} from '@wendao/contracts';
import { CoreError } from '../errors.ts';
import { migrateState } from '../migrations/index.ts';
import type { GameState } from './types.ts';

/**
 * 存档的进与出。
 *
 * 入：三种历史形态（v2 信封 / 旧 `wxcs3-save` 信封 / 裸 state）一律规整成
 *     `SaveEnvelopeV2`，其中 `state` 必定是当前版本的 `GameState`。
 * 出：只产 v2 信封，`meta` 用摘要，不重复存一份状态。
 *
 * 关键取舍：**信封与状态分两层校验**。
 * 信封（format / version / seed / savedAt）由 `@wendao/contracts` 管，
 * 服务端只需要它；状态由内核迁移链管，只有真正要跑游戏的一端才需要。
 * 这样"账号服务不解析 210 个字段"和"读档必须字段级可信"两件事并不矛盾。
 */

export interface ImportSaveOptions {
  /** 没有 savedAt 的极老存档用这个时间兜底（测试传固定值） */
  now?: number;
}

export interface ImportSaveResult {
  state: GameState;
  envelope: SaveEnvelopeV2;
  /** 来源：'v2' / 'legacy/10.2' / 'legacy/bare' */
  from: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** 旧版 state 长什么样：有几个只有游戏才有的字段。认不出就明确报错，不做兜底。 */
function looksLikeLegacyState(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  return 'seed' in value || 'xRealm' in value || 'pillar' in value || 'started' in value;
}

export function importSave(raw: unknown, options: ImportSaveOptions = {}): ImportSaveResult {
  const now = options.now ?? 0;

  // 1) 已经是 v2 信封
  const asV2 = SaveEnvelopeV2Schema.safeParse(raw);
  if (asV2.success) {
    const envelope = asV2.data;
    const state = migrateState(envelope.state, {
      contentVersion: envelope.contentVersion,
      savedAt: envelope.savedAt,
      from: 'v2',
      seed: envelope.seed,
    });
    return {
      state,
      from: 'v2',
      envelope: {
        ...envelope,
        seed: state.meta.seed,
        state,
        meta: envelope.meta ?? summaryOf(envelope.state),
      },
    };
  }

  // 2) 旧版 wxcs3-save 信封
  const asLegacy = LegacySaveEnvelopeSchema.safeParse(raw);
  if (asLegacy.success) {
    const legacy = asLegacy.data;
    const version = String(legacy.version);
    const from = `legacy/${version}`;
    const state = migrateState(legacy.state, {
      contentVersion: from,
      savedAt: legacy.savedAt ?? now,
      from,
      seed:
        typeof legacy.state.seed === 'string' || typeof legacy.state.seed === 'number'
          ? String(legacy.state.seed)
          : `legacy:${version}`,
    });
    return { state, from, envelope: wrap(state, legacy.savedAt ?? now, summaryOf(legacy.state)) };
  }

  // 3) 裸 state（早期手工导出过这种）
  if (looksLikeLegacyState(raw)) {
    const from = 'legacy/bare';
    const state = migrateState(raw, {
      contentVersion: from,
      savedAt: now,
      from,
      seed: raw.seed === undefined ? 'legacy:bare' : String(raw.seed),
    });
    return { state, from, envelope: wrap(state, now, summaryOf(raw)) };
  }

  throw new CoreError(
    'SAVE_UNRECOGNIZED',
    '存档格式无法识别：需要 wendao-save v2、旧版 wxcs3-save 信封，或旧版裸 state',
  );
}

/** 出档：只产 v2 信封。`state` 就是内核快照，`meta` 供列表页免解包。 */
export function exportSave(state: GameState, options: { savedAt?: number } = {}): SaveEnvelopeV2 {
  const savedAt = options.savedAt ?? state.meta.createdAt;
  return wrap(state, savedAt, summaryOf((state.domains.legacy as Record<string, unknown>) ?? {}));
}

/** 严格读档：不合 schema 直接抛，不做"补默认值"式容错 */
export function parseSaveEnvelope(raw: unknown): { envelope: SaveEnvelopeV2; state: GameState } {
  const envelope = SaveEnvelopeV2Schema.parse(raw);
  const state = migrateState(envelope.state, {
    contentVersion: envelope.contentVersion,
    savedAt: envelope.savedAt,
    from: 'v2',
    seed: envelope.seed,
  });
  return { envelope, state };
}

function wrap(state: GameState, savedAt: number, meta: Record<string, unknown>): SaveEnvelopeV2 {
  return {
    format: SAVE_FORMAT_V2,
    version: SAVE_VERSION_V2,
    contentVersion: state.meta.contentVersion,
    savedAt,
    seed: state.meta.seed,
    state,
    meta,
  };
}

function summaryOf(state: unknown): Record<string, unknown> {
  return isObject(state) ? pickSaveMeta(state) : {};
}
