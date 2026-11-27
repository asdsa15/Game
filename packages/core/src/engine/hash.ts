import type { GameState } from '../state/types.ts';

/**
 * 状态指纹。
 *
 * 用途只有一个：**判断两份状态是不是同一份**。
 * 黄金样本（方案 §8.1）、同 seed 复现、重放校验都靠它。
 *
 * 两个细节决定它靠不靠得住：
 *   1. 序列化必须稳定：对象键排序，否则"同样的数据、不同的插入顺序"会得到不同指纹。
 *   2. 不能用 crypto：core 要能在浏览器里跑（ESLint 禁 node:*），
 *      所以自己写 FNV-1a 64 位（BigInt），跨平台一致。
 *
 * 它不是密码学哈希——不需要抗碰撞攻击，只需要"改了任何一个字节就会变"。
 */

/** 键排序后的 JSON。数组保持原序（顺序是有意义的：第 1 条和第 2 条日志不一样） */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

export function hashString(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let hash = FNV_OFFSET;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}

export function hashState(state: GameState): string {
  return hashString(stableStringify(state));
}
