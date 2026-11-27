/**
 * 唯一随机源。
 *
 * 旧版的病根在这一行：`rng()` 在没设种子时回落 `Math.random()`（wxcs3-game.js:60）。
 * 一旦回落，同 seed 也不可复现——玩家报"我明明打过了"，你永远复现不出来。
 *
 * 现在：**随机数状态住在存档里**（`meta.rngState`），每次 `apply` 读出、跑、写回。
 * core 里 `Math.random` 被 ESLint 禁用（见根 eslint.config.mjs），想绕也绕不过去。
 *
 * 算法用 mulberry32：32 位状态、无依赖、分布够用，且**实现只有十行**——
 * 重构期最怕的就是"随机源换了个实现但没人发现序列变了"，
 * 十行代码谁都能逐行对着旧版核对。
 */

export interface Rng {
  /** [0, 1) 的浮点。与旧版 `rng()` 的取值域一致 */
  next(): number;
  /** 当前状态（写回存档用） */
  state(): number;
  /** 已掷次数（与进入时相比） */
  draws(): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  let draws = 0;
  return {
    next(): number {
      draws += 1;
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => a,
    draws: () => draws,
  };
}

/** 字符串种子 → 32 位整数（FNV-1a）。同一串永远同一值，跨平台一致。 */
export function seedToInt(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 掷 [0, n) 的整数——旧版 `rnd(n)` 的等价物，供 P2 搬命令时直接用 */
export function rndInt(rng: Rng, n: number): number {
  if (!(n > 0)) return 0;
  return Math.floor(rng.next() * n);
}
