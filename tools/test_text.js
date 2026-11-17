// 文本系统自检：意图覆盖、结果数量、效果键合法性、场景组合完整性
// 这是「文字修仙」的护栏——文本不是装饰，是玩法本体，错了要能被发现。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'),
  { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;
const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}

/* ---------- 1. 意图表结构 ---------- */
console.log('=== 1. 意图表结构 ===');
const I = D.INTENTS || [];
ok(Array.isArray(I) && I.length >= 25, '意图类不少于 25 类（现 ' + I.length + '）', I.length);

let totalOut = 0, totalChars = 0, bad = [];
const ALLOWED_EFF = ['xiuweiMul', 'stones', 'hp', 'hpPct', 'xh', 'followers', 'piety',
  'merit', 'karma', 'fame', 'insightXp', 'heart', 'insight', 'qualify', 'fate',
  'sense', 'speed', 'mat', 'fav'];

I.forEach(function (it) {
  totalOut += it.outs.length;
  if (!it.id || !it.name) bad.push('缺 id/name');
  if (!Array.isArray(it.keys) || !it.keys.length) bad.push(it.id + ' 没有 keys');
  if (it.outs.length < 3) bad.push(it.id + ' 结果不足 3 条');
  it.outs.forEach(function (o, i) {
    totalChars += o.text.length;
    if (!o.text || o.text.length < 15) bad.push(it.id + ' 第 ' + (i + 1) + ' 条正文过短');
    if (o.w != null && !(o.w > 0)) bad.push(it.id + ' 第 ' + (i + 1) + ' 条权重非正');
    if (o.minT != null && (o.minT < 0 || o.minT > 7)) bad.push(it.id + ' minT 越界');
    if (o.eff) {
      Object.keys(o.eff).forEach(function (k) {
        if (ALLOWED_EFF.indexOf(k) < 0) bad.push(it.id + ' 出现未知效果键 ' + k);
      });
      if (o.eff.mat) {
        const m = D.MATERIAL_EXT.find(function (x) { return x.id === o.eff.mat[0]; });
        if (!m) bad.push(it.id + ' 材料 id 不存在：' + o.eff.mat[0]);
      }
    }
  });
});
ok(bad.length === 0, '每条意图/结果结构合法', bad.slice(0, 5).join('；'));
ok(totalOut >= 120, '结果总数不少于 120 条（现 ' + totalOut + '）', totalOut);
console.log('    意图正文合计 ' + totalChars + ' 字，平均每条约 ' + Math.round(totalChars / totalOut) + ' 字');

/* ---------- 2. 常见说法必须认得出来 ---------- */
console.log('=== 2. 意图识别覆盖 ===');
function match(t) {
  let best = null, bs = 0;
  for (const it of I) {
    for (const k of it.keys) {
      const at = t.indexOf(k);
      if (at < 0) continue;
      const sc = k.length * 10 + (at === 0 ? 6 : 0);
      if (sc > bs) { bs = sc; best = it; }
    }
    for (const k of (it.soft || [])) {
      if (t.indexOf(k) < 0) continue;
      const sc = 5 + (t.indexOf(k) === 0 ? 1 : 0);
      if (sc > bs) { bs = sc; best = it; }
    }
  }
  return best;
}
const CASES = [
  ['打坐', 'meditate'], ['采气', 'meditate'], ['闭关', 'seclusion'],
  ['练剑', 'practice'], ['去后山采药', 'gatherHerb'], ['挖矿', 'gatherOre'],
  ['打猎', 'hunt'], ['下山走走', 'travel'], ['去拜访师父', 'visit'],
  ['找师父论道', 'discuss'], ['喝点酒', 'drink'], ['温书', 'read'],
  ['钓鱼', 'fish'], ['对弈', 'chess'], ['看雪', 'scenery'],
  ['煮壶茶', 'tea'], ['抄经', 'scripture'], ['问心', 'vow'],
  ['摆摊', 'trade'], ['打听消息', 'inquire'], ['行窃', 'steal'],
  ['杀人夺宝', 'rob'], ['救个人', 'charity'], ['求雨', 'divine'],
  ['传教', 'preach'], ['炼丹', 'craft'], ['打铁', 'forge'],
  ['睡觉', 'rest'], ['发个呆', 'idle'], ['写首诗', 'compose'],
  ['给娘上坟', 'mourn']
];
const miss = [];
CASES.forEach(function (c) {
  const m = match(c[0]);
  if (!m || m.id !== c[1]) miss.push(c[0] + ' → ' + (m ? m.id : '认不出') + '（应 ' + c[1] + '）');
});
ok(miss.length === 0, '全部 ' + CASES.length + ' 条常见说法都落到正确意图', miss.slice(0, 6).join('；'));

/* ---------- 3. 文与账不能打架 ---------- */
console.log('=== 3. 文账一致 ===');
/* 让数值由文本解释，而不是背着文本偷偷改：
   ① 说「什么也没得到」就不许给材料/灵石
   ② 掉一大截气血，正文得写出伤是从哪来的 */
const WOUND = ['伤', '血', '撕', '砸', '撞', '挨', '跌', '摔', '咬', '刺', '烧',
  '疼', '裂', '折', '呛', '滚', '磕', '钝', '刀', '剑', '掌', '棍'];
const EMPTY = ['什么也没得到', '什么也没偷到', '一无所获', '空手而归'];
const mismatch = [];
I.forEach(function (it) {
  it.outs.forEach(function (o, i) {
    const t = o.text || '';
    const eff = o.eff || {};
    const emptyPhrase = EMPTY.some(function (k) { return t.indexOf(k) >= 0; });
    const gained = (eff.mat && (eff.mat[1] || 1) > 0) || (eff.stones || 0) > 0;
    if (emptyPhrase && gained) {
      mismatch.push(it.id + ' 第 ' + (i + 1) + ' 条：写着没得到，却给了东西');
    }
    const bigHurt = (eff.hpPct || 0) <= -0.25 || (eff.hp || 0) <= -20;
    if (bigHurt && !WOUND.some(function (k) { return t.indexOf(k) >= 0; })) {
      mismatch.push(it.id + ' 第 ' + (i + 1) + ' 条：掉了大截气血，正文里却没说伤从哪来');
    }
  });
});
ok(mismatch.length === 0, '没有「文说一套、账记一套」的结果', mismatch.slice(0, 4).join('；'));

/* ---------- 4. 引擎确实接在自由输入上 ---------- */
console.log('=== 4. 引擎接线 ===');
ok(/function matchIntent/.test(gcode), 'matchIntent 存在');
ok(/D\.INTENTS/.test(gcode), '引擎读取的正是 D.INTENTS');
/* 只看代码里的实际赋值，不看注释里的说明文字 */
ok(!/msg\s*=\s*['"]做了一月，没落下什么/.test(gcode), '旧的「没落下什么」兜底已移除');
ok(/FREE_FALLBACK/.test(gcode), '认不出的输入有专门的回话池');
ok(/applyIntentEff/.test(gcode), '效果落地函数存在');

/* ---------- 4. 场景文本组合 ---------- */
console.log('=== 5. 场景文本 ===');
const SC = D.SCENES || {};
const places = Object.keys(SC);
ok(places.length >= 5, '地点不少于 5 处（现 ' + places.length + '）', places.length);
let combos = 0, shortScene = [];
places.forEach(function (p) {
  ['spring', 'summer', 'autumn', 'winter'].forEach(function (s) {
    const pool = SC[p][s] || [];
    combos += pool.length;
    pool.forEach(function (t) { if (t.length < 12) shortScene.push(p + '.' + s + '：' + t); });
  });
});
ok(combos >= 120, '地点×季节文本不少于 120 条（现 ' + combos + '）', combos);
ok(shortScene.length === 0, '场景文本都不少于 12 字', shortScene.slice(0, 3).join('；'));

/* ---------- 5. 随机事件 ---------- */
console.log('=== 6. 随机事件 ===');
const EV = D.EVENTS || [];
ok(EV.length >= 20, '事件不少于 20 条（现 ' + EV.length + '）', EV.length);
const evBad = [];
EV.forEach(function (e) {
  if (!e.id || !e.name || !e.text) evBad.push((e.id || '?') + ' 缺字段');
  if ((e.text || '').length < 30) evBad.push(e.id + ' 正文过短');
  if (!e.after) evBad.push(e.id + ' 缺 after（收束句）');
});
ok(evBad.length === 0, '事件正文与收束句俱全', evBad.slice(0, 3).join('；'));
/* 每个事件都必须抽得到：旧版 slot 表写死十二条，新加的永远抽不到 */
const slotSrc = gcode.match(/function eventSlot[\s\S]*?\n  \}/);
ok(!!slotSrc && !/max:\s*\d+/.test(slotSrc[0]), '事件抽取不再依赖写死的区间表');
const effN = EV.filter(function (e) { return e.eff; }).length;
ok(effN >= 10, '至少 10 条事件用数据驱动效果（现 ' + effN + '）', effN);

/* ---------- 6. 文本总量 ---------- */
console.log('=== 7. 文本总量 ===');
function countChars(v) {
  let n = 0;
  (function walk(x) {
    if (typeof x === 'string') n += x.length;
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  })(v);
  return n;
}
const dataText = countChars(D);
ok(dataText >= 44000, '数据层文本不少于 4.4 万字（现 ' + dataText + '）', dataText);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
