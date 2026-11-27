import { describe, expect, it } from 'vitest';
import {
  CoreError,
  apply,
  cmdStart,
  createGame,
  exportSave,
  hashState,
  importSave,
  migrateState,
  type GameState,
} from '../src/index.ts';

const NOW = 1_700_000_000_000;

/** 一份"像真的"旧档：字段名与旧版 S 一致 */
const legacyState = {
  seed: 123456789,
  started: true,
  phase: 'play',
  dao: '沈砚',
  xRealm: 3,
  pillar: 0,
  year: 390,
  month: 5,
  xun: 1,
  turn: 36,
  age: 42,
  hp: 90,
  hpMax: 320,
  stones: 1200,
  cultivation: 'xian',
};

describe('迁移链：旧档 → 新外壳', () => {
  it('只搬外壳，旧字段整包留在 domains.legacy（一个字节都不丢）', () => {
    const { state } = importSave(
      { format: 'wxcs3-save', version: '10.2', savedAt: NOW, state: legacyState },
      { now: NOW },
    );
    expect(state.meta.year).toBe(390);
    expect(state.meta.month).toBe(5);
    expect(state.meta.xun).toBe(1);
    expect(state.meta.turn).toBe(36);
    expect(state.meta.phase).toBe('play');
    expect(state.meta.started).toBe(true);
    expect(state.meta.importedFrom).toBe('legacy/10.2');
    expect(state.domains.legacy).toEqual(legacyState);
  });

  it('随机数游标与旧版同源：整数 seed 直接当 mulberry32 状态', () => {
    const { state } = importSave({ format: 'wxcs3-save', version: '10.2', state: legacyState });
    expect(state.meta.seed).toBe('123456789');
    expect(state.meta.rngState).toBe(123456789);
  });

  it('没有 seed 的极老档：用版本号派生的种子，明确标 importedFrom', () => {
    const bare = { started: true, xRealm: 1, year: 388, month: 3 };
    const { state, from } = importSave({ format: 'wxcs3-save', version: '6.2', state: bare });
    expect(from).toBe('legacy/6.2');
    expect(state.meta.seed).toContain('legacy');
    expect(state.meta.importedFrom).toBe('legacy/6.2');
  });

  it('v2 信封里裹着旧 state（api 现在真实存的形态）也能读', () => {
    const { state, envelope } = importSave({
      format: 'wendao-save',
      version: 2,
      contentVersion: 'legacy/10.2',
      savedAt: NOW,
      seed: 'envelope-seed',
      state: legacyState,
    });
    expect(state.meta.seed).toBe('123456789'); // 状态里的种子更可信
    expect(envelope.seed).toBe('123456789');
    expect(state.domains.legacy).toEqual(legacyState);
  });

  it('裸 state（早期手工导出）也认', () => {
    const { state, from } = importSave(legacyState);
    expect(from).toBe('legacy/bare');
    expect(state.domains.legacy).toEqual(legacyState);
  });

  it('认不出来就明确报错，不静默兜底', () => {
    try {
      importSave({ hello: 'world' });
      throw new Error('本该抛错');
    } catch (error) {
      expect(error).toBeInstanceOf(CoreError);
      expect((error as CoreError).code).toBe('SAVE_UNRECOGNIZED');
    }
  });

  it('存档版本高于程序：明确拒绝，而不是"当成最新硬读"', () => {
    try {
      // 走到迁移链才会读到 stateVersion；信封层只认 format/version，
      // 所以这里直接验迁移链的"未来版本"分支（真实场景：新版本存档被旧程序打开）
      migrateState(
        { meta: { stateVersion: 99 }, domains: {} },
        {
          contentVersion: '9.9.9',
          savedAt: NOW,
          from: 'v2',
        },
      );
      throw new Error('本该抛错');
    } catch (error) {
      expect((error as CoreError).code).toBe('SAVE_VERSION_UNSUPPORTED');
    }
  });

  it('迁移是幂等的：已经是当前版本的档原样返回', () => {
    const { state } = importSave({ format: 'wxcs3-save', version: '10.2', state: legacyState });
    const again = migrateState(state, {
      contentVersion: state.meta.contentVersion,
      savedAt: NOW,
      from: 'v2',
    });
    expect(hashState(again)).toBe(hashState(state));
  });
});

describe('出档 / 读档闭环', () => {
  it('导出的 v2 信封再导入，状态指纹不变', () => {
    const created = createGame({ seed: '20261121', contentVersion: '0.1.0', now: NOW });
    const started: GameState = apply(created, cmdStart).state;
    const envelope = exportSave(started, { savedAt: NOW });

    expect(envelope.format).toBe('wendao-save');
    expect(envelope.version).toBe(2);
    expect(envelope.state).toEqual(started);

    const { state } = importSave(envelope);
    expect(hashState(state)).toBe(hashState(started));
  });

  it('信封里的摘要来自旧 state（列表页不解包也能显示道号/境界/年龄）', () => {
    const { envelope } = importSave({ format: 'wxcs3-save', version: '10.2', state: legacyState });
    expect(envelope.meta).toMatchObject({ dao: '沈砚', realm: 3, age: 42, turn: 36 });
  });
});
