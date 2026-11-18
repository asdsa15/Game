/* 问道长生 · 图标层自检
   ------------------------------------------------------------
   校验三件事，任何一条不过就退出非零：
     1) 映射表里的每个条目 id，在 wxcs3-data.js 里真实存在
        （防止数据改名后图标静默失效）
     2) game.js 里所有 iconRow/iconTag 调用用到的表名，
        在映射表里有对应条目
     3) 图标键清单（compress_art.py）与映射表占用完全一致

   用法：node art/pipeline/check_icons.js
*/
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const errors = [];

/* ---- 1. 载入真实数据 ---- */
const dataSrc = fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8');
global.window = global;
eval(dataSrc);
const D = global.WXCS3_DATA;

/* ---- 2. 载入映射 ---- */
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'pipeline', 'icon_map.json'), 'utf8'));
const MAP = new Map();
for (const e of M.entries) MAP.set(e.table + ' ' + e.id, e.icon);

/* ---- 3. 校验条目 id 真实存在 ---- */
const TABLES = ['GONGFA_EXT', 'PILL_EXT', 'MATERIAL_EXT', 'TALISMANS', 'ARTIFACT_EXT',
  'SKILLS', 'ENCOUNTERS', 'EVENTS', 'FAXIANG', 'BODIES', 'PATHS', 'ORIGINS', 'ZHENJUN',
  'CRAFT_ARTS', 'ARRAY_DISKS', 'RECIPES', 'CRAFT_BOOKS', 'VOTIVE_ITEMS', 'DIVINE_ARTIFACTS'];

for (const e of M.entries) {
  const arr = D[e.table];
  if (!arr) { errors.push('表不存在：' + e.table); continue; }
  const found = Array.isArray(arr) && arr.some(x => x && x.id === e.id);
  if (!found) errors.push('条目不存在：' + e.table + '.' + e.id + '（' + e.name + '）');
}

/* ---- 4. 校验 game.js 里用到的表名 ---- */
const gameSrc = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
const usedTables = new Set();
for (const m of gameSrc.matchAll(/iconRow\(\s*'([A-Z_]+)'/g)) usedTables.add(m[1]);
for (const m of gameSrc.matchAll(/iconTag\(\s*'([A-Z_]+)'/g)) usedTables.add(m[1]);
for (const t of usedTables) {
  if (!D[t]) { errors.push('game.js 用了不存在的表：' + t); continue; }
  const n = M.entries.filter(e => e.table === t).length;
  if (!n) errors.push('game.js 用了没有映射的表：' + t);
}

/* ---- 5. 校验图标键清单一致 ---- */
const py = fs.readFileSync(path.join(ROOT, 'art', 'pipeline', 'compress_art.py'), 'utf8');
const base = py.match(/ICON_BASE_KEYS = \[([\s\S]*?)\n\]/)[1];
const ident = py.match(/ICON_IDENTITY_KEYS = \(([\s\S]*?)\n\)/)[1];
const declared = [];
for (const m of base.matchAll(/"([^"]+)"/g)) declared.push(m[1]);
for (const m of ident.matchAll(/"([^"]+)"/g)) declared.push(m[1]);
// fx_g%d 是 python 模板串，展开成 12 个实际键
for (let i = 1; i <= 12; i++) if (!declared.includes('fx_g' + i)) declared.push('fx_g' + i);
const declaredClean = declared.filter(k => !k.includes('%d'));

const usedIcons = new Set(M.entries.map(e => e.icon));
for (const k of declaredClean) {
  if (!usedIcons.has(k)) errors.push('声明了但无条目占用：' + k);
}
for (const k of usedIcons) {
  if (!declaredClean.includes(k)) errors.push('条目用到但未声明：' + k);
}

/* ---- 6. 校验主体描述齐全 ---- */
const SUBJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'art', 'pipeline', 'icon_subjects.json'), 'utf8')).subjects;
for (const k of usedIcons) {
  if (!SUBJ[k]) errors.push('缺主体描述：' + k);
  else if (!SUBJ[k].subject || SUBJ[k].subject.length < 7) errors.push('主体描述过短：' + k);
}

/* ---- 报告 ---- */
console.log('条目总数   ', M.entries.length);
console.log('图标总数   ', usedIcons.size);
console.log('game.js 引用表', [...usedTables].join(', '));
if (errors.length) {
  console.error('\n✗ 图标层自检未过：');
  for (const e of errors) console.error('   ' + e);
  process.exit(1);
}
console.log('\n✔ 图标层自检通过：条目 id 全部存在、表名有效、图标清单一致、主体描述齐全');
