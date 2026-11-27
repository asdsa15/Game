#!/usr/bin/env node
/**
 * 内容抽取器（一次性，可重跑）
 *
 * 做四件事，全部可重复执行且结果稳定（同样的 wxcs3-data.js 一定产出同样的文件）：
 *
 *   1. 在 vm 里执行旧 `wxcs3-data.js`，拿到 `window.WXCS3_DATA`（116 张表）。
 *      不手抄、不正则抠字面量——数据文件里有一堆转义与换行，手抄必丢东西。
 *   2. 按 10 个域切成 `packages/content/tables/<domain>.json`。
 *   3. 从**真实数据**推断一份类型快照 `tables.schema.json`（每表一份 shape）。
 *      这份快照是**签入仓库的契约**：CI 拿它校验 JSON，数据改坏了类型当场红。
 *      注意它不是"运行时再推断一遍"——那样等于自己验自己，永远通过。
 *   4. 生成 `src/tables.generated.ts`（静态 import 所有域文件）与 `tables/meta.json`（计数、文本量、指纹）。
 *
 * 用法：
 *   node tools/extract-content.mjs           # 写入
 *   node tools/extract-content.mjs --check   # 只比对，不写（CI 用）
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'wxcs3-data.js');
const OUT = path.join(ROOT, 'packages', 'content');
const TABLES_DIR = path.join(OUT, 'tables');
const CHECK = process.argv.includes('--check');

/** 表 → 域。域的名字与方案 §2 的 commands 分组对齐，方便 P2 按域搬命令。 */
const DOMAINS = {
  meta: [
    'STATS',
    'CULTIVATION',
    'LOG_CATS',
    'TUTORIAL_STEPS',
    'ACH_TIERS',
    'ACHIEVEMENTS',
    'ACH_MEMORY',
    'VERSES',
    'PATHS',
    'GOALS',
    'ENDINGS',
    'UNLOCK_XIAN',
    'UNLOCK_SHEN',
  ],
  realm: [
    'XIAN_REALMS',
    'XIANJI',
    'LINGQI',
    'BREAK_BASE',
    'QUENCH',
    'CAP_BASE',
    'CAP_STAGE_STEP',
    'GUOWEI',
    'GUOWEI_RANK',
    'ANCHOR_TYPES',
    'ANCHOR_STATES',
    'ANCHOR_STATUS',
    'DAOGONG_CAP',
    'SHENTONG_GRANT',
    'STAT_TIER',
    'INSIGHT_LINES',
    'RENCAI',
  ],
  char: [
    'ROOTS',
    'ELEMENTS',
    'MUT_ELEMENTS',
    'BODIES',
    'TALENTS',
    'ORIGINS',
    'FAXIANG',
    'ZODIAC_CLASH',
    'QI_TO_DAOTONG',
  ],
  gongfa: [
    'GONGFA',
    'GONGFA_TIERS',
    'GONGFA_EXT',
    'DAOTONG',
    'DAOTONG_CLASS',
    'DAOTONG_TEMPER',
    'SANXUAN',
    'SHENTONG',
    'SKILLS',
    'SKILL_PRICE',
    'COMBOS',
    'SHIXIU',
  ],
  combat: [
    'INTENTS',
    'COMBAT_TEXT',
    'FOE_STYLES',
    'FOE_LOOT',
    'TRIBULATION',
    'TRIB_WEIGHT',
    'TIANJIANG',
    'DIZHA',
  ],
  craft: [
    'RECIPES',
    'MATERIAL_EXT',
    'PILL_EXT',
    'TALISMANS',
    'ARTIFACT_EXT',
    'ARRAY_DISKS',
    'NATAL_FORMS',
    'DIVINE_ARTIFACTS',
    'VOTIVE_ITEMS',
    'CRAFT_LEVELS',
    'CRAFT_REALM_GATE',
    'CRAFT_BOOKS',
    'CRAFT_ARTS',
    'QUALITY',
  ],
  economy: [
    'SHOP',
    'SHOP_GONGFA',
    'SHOP_CATS',
    'SELL_CHANNELS',
    'FIXED_COST',
    'EXCHANGE',
    'MIAO_UP',
    'XIANG_GONG',
    'CLAN_INDUSTRIES',
  ],
  social: [
    'NPC_POOL',
    'FAVOR_TIERS',
    'SECT',
    'CLAN',
    'GATE',
    'HOOKS',
    'HOOK_DEBUFF',
    'LITURGY',
    'TRANSMISSIONS',
    'DISCIPLE_LIMIT',
    'DISCIPLE_TEACH',
    'DISCIPLE_STAGE',
    'BEAST_STOCK',
    'BEAST_BARN',
    'BEAST_BOND',
    'BEAST_CARE',
  ],
  world: ['REGIONS', 'SCENES', 'SCENES_SPECIAL', 'DAOSHU', 'ENCOUNTERS', 'EVENTS', 'SCRIPTS'],
  shinto: [
    'PIETY',
    'PILLARS',
    'POSITIONS',
    'MIAO_COEFF',
    'QIHE',
    'LU',
    'SHENWEI',
    'ZHENJUN',
    'RITUALS',
    'SHENG',
    'FOLLOW_LIMIT',
  ],
};

/* ---------- 1. 载入旧数据 ---------- */
function loadLegacyData() {
  const code = fs.readFileSync(SRC, 'utf8');
  const sandbox = {
    window: {},
    console,
    Math,
    Object,
    Array,
    JSON,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const started = Date.now();
  vm.runInContext(code, sandbox, { filename: 'wxcs3-data.js', timeout: 20_000 });
  const data = sandbox.window.WXCS3_DATA;
  if (!data || typeof data !== 'object') throw new Error('wxcs3-data.js 没有导出 WXCS3_DATA');
  return { data, ms: Date.now() - started };
}

/* ---------- 2. 类型快照 ---------- */
const kindOf = (v) => {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'object') return typeof v;
  return 'any';
};

/** 合并多个样本 → 一个 shape 节点。数组/对象逐层下钻，键的"可选"由出现次数决定。 */
function infer(samples) {
  const present = samples.filter((v) => v !== null && v !== undefined);
  const nullable = present.length !== samples.length || undefined;
  if (!present.length) return nullable ? { t: 'any', nullable } : { t: 'any' };

  const kinds = new Set(present.map(kindOf));
  // 整数与小数混排按 number 处理
  if (kinds.has('number') && kinds.has('integer')) kinds.delete('integer');
  if (kinds.size > 1) return nullable ? { t: 'any', nullable } : { t: 'any' };

  const kind = [...kinds][0];
  if (kind === 'array') {
    const items = present.flat();
    const node = { t: 'array', of: infer(items) };
    return nullable ? { ...node, nullable } : node;
  }
  if (kind === 'object') {
    const keys = new Map();
    for (const obj of present) {
      for (const k of Object.keys(obj)) {
        keys.set(k, (keys.get(k) || 0) + 1);
      }
      // 显式 undefined 也当作"这个键出现过"
      for (const k of Object.keys(obj)) if (obj[k] === undefined) keys.set(k, keys.get(k) || 1);
    }
    const fields = {};
    const optional = [];
    for (const [k, count] of keys) {
      const vals = present.map((o) => o[k]);
      fields[k] = infer(vals.filter((v) => v !== undefined));
      // 只要有一个样本缺这个键，就当成可选（旧代码里有大量条件字段）
      if (count < present.length || present.some((o) => !(k in o))) optional.push(k);
    }
    const node = optional.length ? { t: 'object', fields, optional } : { t: 'object', fields };
    return nullable ? { ...node, nullable } : node;
  }
  const node = { t: kind };
  return nullable ? { ...node, nullable } : node;
}

/* ---------- 3. 文本量与指纹 ---------- */
function walk(value, visit) {
  visit(value);
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walk(v, visit));
}
function textChars(value) {
  let n = 0;
  walk(value, (v) => {
    if (typeof v === 'string') n += v.length;
  });
  return n;
}
function digestOf(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

/* ---------- 4. 输出 ---------- */
const write = (file, content) => {
  const abs = path.join(OUT, file);
  const next = typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n';
  const prev = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (prev === next) return { file, changed: false };
  if (CHECK) return { file, changed: true };
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, next, 'utf8');
  return { file, changed: true };
};

function main() {
  const { data, ms } = loadLegacyData();
  const all = Object.keys(data);

  // 域覆盖必须严丝合缝：漏一张表 = 某条玩法在新架构里凭空消失，且没人会发现
  const mapped = Object.values(DOMAINS).flat();
  const dup = mapped.filter((t, i) => mapped.indexOf(t) !== i);
  const missing = all.filter((t) => !mapped.includes(t));
  const extra = mapped.filter((t) => !all.includes(t));
  if (dup.length || missing.length || extra.length) {
    throw new Error(
      `域映射不完整：\n  未归类：${missing.join(', ') || '无'}\n  表里没有：${extra.join(', ') || '无'}\n  重复：${dup.join(', ') || '无'}`,
    );
  }

  const results = [];
  const schema = {};
  let records = 0;
  let chars = 0;

  for (const [domain, tables] of Object.entries(DOMAINS)) {
    const bucket = {};
    for (const t of tables) {
      bucket[t] = data[t];
      schema[t] = infer([data[t]]);
      records += Array.isArray(data[t]) ? data[t].length : 1;
      chars += textChars(data[t]);
    }
    results.push(write(path.join('tables', `${domain}.json`), bucket));
  }

  results.push(write('tables.schema.json', schema));

  const digest = digestOf(data);
  const tableNames = all.slice().sort();
  const generated = [
    '// AUTO-GENERATED by tools/extract-content.mjs — 不要手改，改脚本后重跑。',
    '// 每个 JSON 都是旧 wxcs3-data.js 的逐表搬运；校验见 src/validate.ts。',
    `import manifest from '../tables/manifest.json' with { type: 'json' };`,
    ...Object.keys(DOMAINS).map(
      (d) => `import ${d} from '../tables/${d}.json' with { type: 'json' };`,
    ),
    '',
    'export const CONTENT_MANIFEST = manifest;',
    '',
    'export const TABLE_GROUPS = {',
    ...Object.keys(DOMAINS).map((d) => `  ${d},`),
    '} as const;',
    '',
    `export const TABLE_NAMES = ${JSON.stringify(tableNames, null, 2)} as const;`,
    '',
    'export type TableName = (typeof TABLE_NAMES)[number];',
    '',
  ].join('\n');
  results.push(write(path.join('src', 'tables.generated.ts'), generated));

  const meta = {
    contentVersion: '0.1.0',
    digest,
    tables: all.length,
    records,
    textChars: chars,
    domains: Object.fromEntries(Object.entries(DOMAINS).map(([d, t]) => [d, t.length])),
  };
  results.push(write(path.join('tables', 'manifest.json'), meta));

  const changed = results.filter((r) => r.changed);
  console.log(
    `${CHECK ? '校验' : '抽取'}完成：${all.length} 表 / ${records} 条 / 文本 ${chars} 字 / 指纹 ${digest}（${ms}ms）`,
  );
  if (CHECK) {
    if (changed.length) {
      console.error('以下产物与旧数据不一致，请重跑 node tools/extract-content.mjs：');
      changed.forEach((c) => console.error('  · ' + c.file));
      process.exit(1);
    }
    console.log('内容产物与 wxcs3-data.js 一致。');
    return;
  }
  console.log(changed.length ? `写入 ${changed.length} 个文件。` : '产物无变化。');
  for (const c of changed) console.log('  · ' + c.file);
}

main();
