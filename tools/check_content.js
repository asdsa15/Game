/* tools/check_content.js — v11 P0-2 内容检查
   断言两件事：
   1) 奇遇分境界不空心：仙道/神道玩家在每个境界能抽到的奇遇 ≥ 8 条
      （防止某一档条件写窄了，tryEncounter 的池子退化到兜底甚至空）。
   2) 新奇遇的数据完整性：act 与条目 id 对得上、res 里的操作名
      都在 game.js 的 encOp 白名单里、文案字段不缺。
   仿 check_ach.js：vm 装载 data.js，game.js 用文本扫描取白名单。 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'), sandbox, { filename: 'wxcs3-data.js' });
const D = sandbox.WXCS3_DATA || sandbox.window.WXCS3_DATA;
if (!D) { console.log('✗ check_content：装不上 wxcs3-data.js'); process.exit(1); }

const gameSrc = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
/* encOp 白名单：扫 case 'xxx': */
const opSet = new Set();
const opRe = /case '([a-zA-Z]+)':/g;
const opBlock = gameSrc.slice(gameSrc.indexOf('function encOp('), gameSrc.indexOf('function applyEncRes('));
let m;
while ((m = opRe.exec(opBlock))) opSet.add(m[1]);

const problems = [];

/* ---- 1. 分境界可抽数 ---- */
const REALM_NAMES = ['胎息', '练气', '筑基', '紫府', '金丹', '道胎'];
function realmOk(w, idx) {
  if (!w) return true;
  if (w.minRealm != null && idx < w.minRealm) return false;
  if (w.maxRealm != null && idx > w.maxRealm) return false;
  // 静态检查不看 month/place/flag/needSect/needTemple —— 那是运行时条件，
  // 只要求它们不把整档锁死：带这些附加条件的条目按「可能可抽」计入。
  return true;
}
function kindOk(e, line) {
  if (e.kind === 'xian') return line === 'xian' || line === 'both';
  if (e.kind === 'shen') return line === 'shen' || line === 'both';
  return true;
}
const lines = ['xian', 'shen', 'both'];
for (let idx = 0; idx < 6; idx++) {
  for (const line of lines) {
    const n = D.ENCOUNTERS.filter(e => kindOk(e, line) && realmOk(e.when, idx)).length;
    if (n < 8) problems.push(`境界「${REALM_NAMES[idx]}」道途「${line}」可抽奇遇仅 ${n} 条（<8）`);
  }
}

/* ---- 2. 数据完整性 ---- */
const seenIds = new Set();
D.ENCOUNTERS.forEach(function (e) {
  if (seenIds.has(e.id)) problems.push(`奇遇 id 重复：${e.id}`);
  seenIds.add(e.id);
  if (!e.name || !e.text || !e.poem) problems.push(`奇遇 ${e.id} 缺 name/text/poem`);
  if (!Array.isArray(e.opts) || e.opts.length !== 3) problems.push(`奇遇 ${e.id} 选项不是 3 个`);
  (e.opts || []).forEach(function (o) {
    const parts = (o.act || '').split(':');
    if (parts[0] !== 'enc' || parts[1] !== e.id) problems.push(`奇遇 ${e.id} 的 act 与 id 不符：${o.act}`);
    if (!o.t || !o.eff) problems.push(`奇遇 ${e.id}:${parts[2]} 缺 t/eff`);
    if (o.res) {
      ['ok', 'miss'].forEach(function (k) {
        (o.res[k] || []).forEach(function (op) {
          if (!Array.isArray(op) || !opSet.has(op[0])) problems.push(`奇遇 ${e.id}:${parts[2]} 未知操作：${JSON.stringify(op)}`);
        });
      });
      if (o.res.hit != null && (o.res.hit < 0 || o.res.hit > 100)) problems.push(`奇遇 ${e.id}:${parts[2]} hit 越界：${o.res.hit}`);
      if (o.res.hit != null && !(o.res.ok || []).length && !(o.res.miss || []).length) problems.push(`奇遇 ${e.id}:${parts[2]} 掷骰但两边都空账`);
      if (!o.res.m) problems.push(`奇遇 ${e.id}:${parts[2]} 缺结果文本`);
    }
  });
  if (e.when) {
    if (e.when.minRealm != null && (e.when.minRealm < 0 || e.when.minRealm > 5)) problems.push(`奇遇 ${e.id} minRealm 越界`);
    if (e.when.maxRealm != null && (e.when.maxRealm < 0 || e.when.maxRealm > 5)) problems.push(`奇遇 ${e.id} maxRealm 越界`);
  }
});

/* ---- 3. 分档覆盖：三档各 ≥10 条带条件 ---- */
const tierCount = { dust: 0, xiu: 0, tianji: 0 };
D.ENCOUNTERS.forEach(function (e) {
  const w = e.when;
  if (!w) return;
  if (w.maxRealm === 1 && w.minRealm == null) tierCount.dust++;
  else if (w.minRealm === 2 && w.maxRealm === 3) tierCount.xiu++;
  else if (w.minRealm === 4) tierCount.tianji++;
});
['dust', 'xiu', 'tianji'].forEach(function (k) {
  if (tierCount[k] < 10) problems.push(`档位 ${k} 带条件奇遇仅 ${tierCount[k]} 条（<10）`);
});

/* ---- 4. 地点产生内容（v11 P1-2） ----
   五个洲各要有专属月度事件与专属奇遇，且 place 必须指向真实洲名。
   写错一个地名（如 'nanyue' 写成 'nanyuee'）不会报错，只会让那一洲静默空掉——
   这正是「管道造好了没人接水」的老毛病，所以用静态检查钉住。 */
const PLACE_IDS = (D.REGIONS || []).map(function (r) { return r.id; });
if (!PLACE_IDS.length) problems.push('REGIONS 为空，无法校验地点');
const evByPlace = {}, encByPlace = {};
(D.EVENTS || []).forEach(function (e) {
  const p = e.when && e.when.place;
  if (!p) return;
  if (PLACE_IDS.indexOf(p) < 0) problems.push(`事件 ${e.id} 的 when.place 不是已知地点：${p}`);
  evByPlace[p] = (evByPlace[p] || 0) + 1;
});
(D.ENCOUNTERS || []).forEach(function (e) {
  const p = e.when && e.when.place;
  if (!p) return;
  if (PLACE_IDS.indexOf(p) < 0) problems.push(`奇遇 ${e.id} 的 when.place 不是已知地点：${p}`);
  encByPlace[p] = (encByPlace[p] || 0) + 1;
});
PLACE_IDS.forEach(function (p) {
  if ((evByPlace[p] || 0) < 3) problems.push(`地点 ${p} 专属月度事件仅 ${evByPlace[p] || 0} 条（<3）`);
  if ((encByPlace[p] || 0) < 3) problems.push(`地点 ${p} 专属奇遇仅 ${encByPlace[p] || 0} 条（<3）`);
});

/* ---- 5. 产地货（v11 P1-2）：标了 place 的货必须指向真实地点 ---- */
(D.SHOP || []).forEach(function (x) {
  if (x.place && PLACE_IDS.indexOf(x.place) < 0) problems.push(`商品 ${x.id} 的 place 不是已知地点：${x.place}`);
});

const total = D.ENCOUNTERS.length;
if (problems.length) {
  console.log('✗ check_content：' + problems.length + ' 个问题（奇遇共 ' + total + ' 条）');
  problems.forEach(p => console.log('  - ' + p));
  process.exit(1);
} else {
  console.log('✓ check_content：奇遇 ' + total + ' 条 · 三档 ' + tierCount.dust + '/' + tierCount.xiu + '/' + tierCount.tianji + ' · 每境界每道途可抽 ≥8 · 结算操作全部在白名单内');
  console.log('  地点内容：事件 ' + PLACE_IDS.map(function (p) { return p + '=' + (evByPlace[p] || 0); }).join(' ') +
    ' · 奇遇 ' + PLACE_IDS.map(function (p) { return p + '=' + (encByPlace[p] || 0); }).join(' '));
}
