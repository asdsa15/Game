// 成就可达性静态检查
// 目标：找出「测试函数读了某个计数器，但游戏里从来没有人写过它」的成就——
// 这类成就在代码里永远为假，玩家一辈子也拿不到，而且没有任何报错。
//
// 做法（静态，不跑游戏）：
//   1. 扫 game.js，收集所有被写入的 tally 键：bump('x') / t.x = / t.x +=
//   2. 从每条成就的 test 源码里抽出它读取的 tally 键与 S 字段
//   3. 读取了却没被写过的，就是死条件
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'),
  { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;
const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');

/* ---------- 1. 被写入过的 tally 键 ---------- */
const written = new Set();
const writePatterns = [
  /bump\(\s*['"]([a-zA-Z_][\w]*)['"]/g,
  /\bt\.([a-zA-Z_][\w]*)\s*(?:\+\+|[-+*/]?=|\+=\s*1)/g,
  /\btly\(\)\.[a-zA-Z_][\w]*\s*=/g,
  /\btally\.([a-zA-Z_][\w]*)\s*(?:\+\+|[-+*/]?=)/g
];
for (const re of writePatterns) {
  let m;
  while ((m = re.exec(gcode))) { if (m[1]) written.add(m[1]); }
}
/* 显式 += 1 的写法也算 */
const incPat = /\bt\.([a-zA-Z_][\w]*)\s*\+=/g;
let mi;
while ((mi = incPat.exec(gcode))) written.add(mi[1]);
/* 映射型计数（见过的奇遇、走过的地点）：markIn('places', id) / bumpIn('encIds', id) */
const mapPat = /\b(?:markIn|bumpIn)\(\s*['"]([a-zA-Z_][\w]*)['"]/g;
while ((mi = mapPat.exec(gcode))) written.add(mi[1]);

/* ---------- 2. 每条成就读了什么 ---------- */
function readKeysOf(src) {
  const keys = new Set();
  /* (s.tally || {}).xxx  与  s.tally.xxx */
  let m;
  const re1 = /\(\s*s\.tally\s*\|\|\s*\{\}\s*\)\s*\.\s*([a-zA-Z_][\w]*)/g;
  while ((m = re1.exec(src))) keys.add(m[1]);
  const re2 = /s\.tally\s*\.\s*([a-zA-Z_][\w]*)/g;
  while ((m = re2.exec(src))) keys.add(m[1]);
  /* ((s.tally||{}).a||0) 这类比较也算读 */
  const re3 = /tally\s*\|\|\s*\{\}\s*\)\s*\.\s*([a-zA-Z_][\w]*)/g;
  while ((m = re3.exec(src))) keys.add(m[1]);
  return keys;
}

/* ---------- 3. 逐条核对 ---------- */
/* 明确归档：这些成就依赖的玩法本身还不存在，不是「漏写计数器」，
   而是「没有那个动作可以写」。列在这里是为了让检查器保持可当回归守卫用：
   一旦有人真的做出了对应玩法，请把这一条从这里删掉、把 bump 接上。 */
const ARCHIVED = {
  takeXianji: '需要「夺仙基」玩法（击败他人后夺取其仙基）',

  foundedSect: '需要「开宗立派」玩法（自立门户、立规矩、收弟子）',
  relic: '需要「上古遗迹发现」玩法（舆图浮现遗迹、入内探查）',
  killMortals: '需要「凡人杀戮」场景（现无凡人战斗单位）',
  bloodRite: '需要「血祭」玩法（献 99 绝材的祭祀流程）',
  quanbingLost: '需要「权柄被夺」事件（本命权柄可被外力剥夺）',

  nameBorrow: '需要「自定庙号」玩法（现庙号由系统随机生成，撞不上真君名）',
  oldGrudge: '需要「旧仇寻仇与击杀」流程（S.enemy 只置位，无击杀路径）'
};

const problems = [], archived = [];
for (const a of D.ACHIEVEMENTS) {
  let src = '';
  try { src = a.test.toString(); } catch (e) { src = ''; }
  if (!src) { problems.push({ id: a.id, name: a.name, why: '没有 test 函数' }); continue; }
  const keys = readKeysOf(src);
  /* 「从未发生过」型条件（gfChanged === 0）本就要求这个键永远不被写，
     不能当成死条件——它恰恰是靠「不写」来达成的。 */
  const missing = [...keys].filter(function (k) {
    if (written.has(k)) return false;
    const neverPat = new RegExp('\\b' + k + '\\b[^;]{0,40}===\\s*0');
    return !neverPat.test(src);
  });
  if (!missing.length) continue;
  const unarchived = missing.filter(function (k) { return !ARCHIVED[k]; });
  if (unarchived.length) {
    problems.push({ id: a.id, name: a.name, why: '计数器从未被写入：' + unarchived.join('、') });
  } else {
    archived.push({ id: a.id, name: a.name, keys: missing });
  }
}

console.log('=== 成就可达性静态检查 ===');
console.log('成就总数：' + D.ACHIEVEMENTS.length);
console.log('游戏内被写入过的 tally 键：' + [...written].sort().join(' '));
console.log('');

if (!problems.length) {
  console.log('✔ 没有未归档的死条件。');
} else {
  console.log('✘ 发现 ' + problems.length + ' 条未归档的死条件（应修）：');
  problems.forEach(function (p) {
    console.log('  · [' + p.id + '] ' + p.name + ' —— ' + p.why);
  });
}

if (archived.length) {
  console.log('\n--- 已归档：' + archived.length + ' 条，依赖尚未建立的玩法（不算缺陷） ---');
  archived.forEach(function (p) {
    const why = p.keys.map(function (k) { return ARCHIVED[k]; })[0];
    console.log('  · [' + p.id + '] ' + p.name + ' —— ' + why);
  });
}
console.log('\n可达统计：' + (D.ACHIEVEMENTS.length - archived.length - problems.length) +
  ' 可达 / ' + archived.length + ' 归档 / ' + problems.length + ' 待修，共 ' + D.ACHIEVEMENTS.length + ' 条。');

/* ---------- 4. 额外的结构检查：条件里写死的数值是否可能达成 ---------- */
console.log('\n=== 附加检查：依赖具体数值的条件 ===');
const numeric = [];
for (const a of D.ACHIEVEMENTS) {
  const src = a.test.toString();
  /* xx >= N 形式，N 大于 1e6 时提醒人工确认上限是否够 */
  const re = />=\s*(\d{7,})/g;
  let m;
  while ((m = re.exec(src))) {
    numeric.push({ id: a.id, name: a.name, n: Number(m[1]) });
  }
}
if (!numeric.length) console.log('✔ 没有超过七位数的硬阈值。');
else {
  numeric.forEach(function (x) {
    console.log('  · [' + x.id + '] ' + x.name + ' 需要 ≥ ' + x.n.toLocaleString('en-US'));
  });
  console.log('  以上请对照上限表人工确认（信众上限最高 300 万）。');
}

process.exit(problems.length ? 1 : 0);
