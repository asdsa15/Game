/**
 * 结局计分：**服务端算，客户端说了不算**。
 *
 * 现在没有规则内核，做不到完整重放校验，所以用一个"结构分"：
 * 境界 > 寿元 > 结局档次。它对玩家是透明的（规则可查），对篡改是无利的
 * （改 score 字段没用，服务端不读）。等 packages/core 落地，这里换成
 * 「用 seed + commands 重放一遍，取重放结果」——那时 verified 才会置 true。
 *
 * 结局 id 与 data.js 的 ENDINGS 保持一致，新增结局必须在这里登记档次，
 * 否则会落到 0 分（有测试盯着这件事）。
 */
export const ENDING_BONUS: Record<string, number> = {
  ascend: 2000,   // 登仙
  daotai: 1800,   // 道胎
  guowei: 1500,   // 证得果位
  zhenjun: 1500,  // 法相归位
  shizun: 1200,   // 世尊
  xianzun: 1000,  // 一代仙尊
  modao: 800,     // 魔道至尊
  xiaoyao: 600,   // 逍遥
  reinc: 200,     // 百世书
  sit: 100,       // 坐化
  daohua: 50,     // 道化
  fall: 0,        // 陨落
};

export interface RunInput {
  realm: number;
  age: number;
  ending: string;
}

export function computeScore(input: RunInput): number {
  const realm = Math.max(0, Math.trunc(input.realm));
  const age = Math.max(0, Math.trunc(input.age));
  const bonus = ENDING_BONUS[input.ending] ?? 0;
  return realm * 1000 + age * 10 + bonus;
}

export const KNOWN_ENDINGS = Object.keys(ENDING_BONUS);
