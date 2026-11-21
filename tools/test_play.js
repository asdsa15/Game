// 长跑冒烟：用 DOM 桩真跑 300 个月的随机操作，专抓 NaN / 负值 / 抛错
// 覆盖仙道与神道两条线，包括庙市、化香火钱、卖出渠道、四艺面板。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { this.children.push(c); },
    removeChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; }, focus() {}, click() {},
    insertAdjacentHTML() {}, scrollIntoView() {}
  };
  return el;
}
const els = {};
const document = {
  readyState: 'complete', visibilityState: 'visible',
  body: makeEl('body'), documentElement: makeEl('html'),
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
  createElement() { return makeEl('new'); }, addEventListener() {}, removeEventListener() {}
};
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const window = {
  document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout() { return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/' },
  alert() {}, confirm() { return true; }, prompt() { return ''; }
};
const ctx = {
  window, document, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
  parseInt, parseFloat, isNaN, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {},
  requestAnimationFrame() { return 0; }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
const G = window.WXCS3;
let S = G.S;   // 读档会替换内部引用（applyState 里 S = out），故用 let 并重取

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function finite(name) {
  ['hp', 'mp', 'stones', 'xianghuo', 'xiuwei', 'followers', 'karma', 'fame', 'merit'].forEach(function (k) {
    const v = S[k];
    if (typeof v === 'number' && !isFinite(v)) { fail++; console.log('  ✘ NaN/Infinity:', k, v); }
  });
  if (S.xianghuo < 0) { fail++; console.log('  ✘ 香火为负', S.xianghuo); }
  if (S.stones < 0) { fail++; console.log('  ✘ 灵石为负', S.stones); }
  if (S.hp < 0) { fail++; console.log('  ✘ 气血为负', S.hp); }
}

function setup(cult) {
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 120;
  S.cultivation = cult; S.xRealm = 0; S.xStage = 0; S.xiuwei = 0;
  S.pillar = 0; S.pos = 0; S.xianghuo = cult === 'shen' ? 0 : 0; S.followers = 0;
  S.miao = '野祀'; S.miaoUp = {}; S.stones = 500; S.month = 1; S.year = 387; S.turn = 0;
  S.hp = S.hpMax; S.mp = S.mpMax; S.log = []; S.chronicle = [];
  S.ledger = { income: [], expense: [] }; S.sellCh = 'market';
  S.bag = { pillHp: 2 }; S.talismans = {}; S.bagMat = {};
}

function run(cult, steps) {
  setup(cult);
  const acts = cult === 'xian'
    ? ['cultivate', 'rest', 'shop', 'sell', 'map', 'craft', 'bag', 'gongfa']
    : ['cultivate', 'rest', 'miao', 'exch', 'preach', 'temple', 'xs'];
  let errors = 0;
  for (let i = 0; i < steps; i++) {
    const a = acts[Math.floor(Math.random() * acts.length)];
    try {
      if (a === 'cultivate') G.ACT.cultivate();
      else if (a === 'rest') { G.ACT.openRest(); G.ACT.do_rest(1); }
      else if (a === 'shop') { G.ACT.openShop('pill'); }
      else if (a === 'sell') { G.ACT.openSell(); }
      else if (a === 'map') { G.ACT.openMap(); }
      else if (a === 'craft') { G.ACT.openCraft(); }
      else if (a === 'bag') { G.ACT.openBag(); }
      else if (a === 'gongfa') { G.ACT.openGongfa(); }
      else if (a === 'miao') { G.ACT.openMiaoMarket(['xiang', 'pill', 'chan', 'sell'][i % 4]); }
      else if (a === 'exch') { G.ACT.openExchange(); G.ACT.do_exch('max'); }
      else if (a === 'preach') { G.ACT.preach(); }
      else if (a === 'temple') { G.ACT.openTemple(); }
      else if (a === 'xs') { G.ACT.openXiansheng(); }
    } catch (e) {
      errors++;
      console.log('  ✘ 第 ' + i + ' 步 ' + a + ' 抛错：' + e.message);
      break;
    }
    finite();
    // v8.0：死前会先进「临终」，测试里直接选闭眼，再重开继续跑
    if (S.phase === 'dying') { try { G.ACT.do_die('close'); } catch (e) { } }
    if (S.phase === 'over') { setup(cult); }   // 死了重开，继续测
  }
  ok(errors === 0, cult + ' 线 ' + steps + ' 步无异常');
  ok(isFinite(S.turn) && S.turn > 0, cult + ' 时间推进正常（' + S.turn + ' 月）');
  if (cult === 'xian') ok(S.xianghuo === 0, '仙道长跑后香火仍为 0', S.xianghuo);
  if (cult === 'shen') ok(S.xianghuo >= 0 && isFinite(S.xianghuo), '神道香火非负有限', S.xianghuo);
}

console.log('=== 仙道 300 步 ===');
run('xian', 300);
console.log('=== 神道 300 步 ===');
run('shen', 300);

console.log('=== 道途目标 ===');
setup('xian');
S.goals = []; S.stones = 0; S.xiuwei = 0;
G.render();
ok(S.goals.length === 0, '新局尚无已完成目标');
S.xRealm = 1; G.render();
ok(S.goals.indexOf('x1') >= 0, '练气 → 完成「六轮圆满」');
ok(S.stones >= 50, '奖励入账：灵石 +50（现 ' + S.stones + '）');
S.xRealm = 2; G.render();
ok(S.goals.indexOf('x2') >= 0, '筑基 → 完成「筑仙基」');
ok((S.bag.pillMp || 0) >= 1, '奖励发到背包：聚气丹');

setup('shen');
S.goals = []; S.followers = 100;
G.render();
ok(S.goals.indexOf('s1') >= 0, '信众 100 → 完成「聚信百人」');
S.pillar = 1; G.render();
ok(S.goals.indexOf('s2') >= 0, '立庙 → 完成「立庙受祀」');

// 全部完成后不再有当前目标
setup('xian'); S.goals = G.D.GOALS.xian.map(g => g.id); S.xRealm = 5;
G.render();
ok(S.goals.length === G.D.GOALS.xian.length, '全目标完成后保持完成态');


/* ==================== v10.7 P1 · 左侧常驻导航 ==================== */
console.log('=== v10.7 · 左侧常驻导航 ===');
setup('xian');
G.render();
let h = els['stage'].innerHTML;
ok(h.indexOf('navgrp') > 0, '左栏出现导航分组');
ok(h.indexOf('navitem') > 0, '导航条目直接可见');
ok(h.indexOf('dockgrp') < 0, '旧折叠组已下线');
ok(h.indexOf('常驻指令') < 0, '旧「常驻指令」标题已下线');
ok(h.indexOf('修行') > 0, '分组名可见');
ok(h.indexOf('功法') > 0, '「功法」入口直接出现在左栏（不必先展开分组）');
/* v10.7：移动端五项底栏在 DOM 里常驻（桌面由 CSS 隐藏），
   保证窄屏下每个一级入口都有一个可达的入口点。 */
ok(h.indexOf('navmob') > 0, '移动端五项底栏已渲染');
ok(h.indexOf('do;navgrp:xiu') > 0, '底栏「修行」指向 do;navgrp:xiu');
ok(h.indexOf('do;navmore') > 0, '底栏「更多」指向 do;navmore');
/* 旧坞的折叠动作不再存在——它是死指令，留着只会让人以为还能折叠 */
ok(typeof G.ACT.do_dockGrp !== 'function', '旧 do_dockGrp 已下线');

console.log('=== v8.1 · 功能门 ===');
setup('xian'); S.unlockStage = 1; S.karma = 0; S.xRealm = 0; S.xStage = 5; S.xiuwei = 0;
let realRnd = Math.random; Math.random = function () { return 0; };
try { G.ACT.do_xbreak(); if (S.trib) G.ACT.do_tribGo(); } catch (e) { }
Math.random = realRnd;
ok(S.xRealm === 1, '胎息六轮圆满 → 晋练气（xRealm ' + S.xRealm + '）');
ok(S.unlockStage >= 2, '练气档已解锁（unlockStage ' + S.unlockStage + '）');
ok((S.log || []).some(function (x) { return String(x.txt || '').indexOf('你采的这口气') >= 0; }),
  '练气境界词写进了纪事');
setup('xian'); G.render();
G.ACT.openHelp();
const helpHtml = els['modals'].innerHTML;
ok(helpHtml.indexOf('你如今能做什么') > 0, '帮助面板按档列出能做什么');
ok(helpHtml.indexOf('还未显于你面前之事') > 0, '帮助面板列出尚未显之事');

console.log('=== v8.1 · 淬体 ===');
setup('xian'); S.body = 'sword'; S.quench = 0; S.quenchApplied = 0; S.xun = 0;
S.stones = 100000; S.bagMat = { lanyouCao: 200 }; S.hpMax = 100; S.hp = 50;
G.ACT.do_quench();
ok(S.quench === 1, '淬体进 1 阶（' + S.quench + '）');
ok(S.hpMax === 110, '气血上限 ×1.10 → 110（现 ' + S.hpMax + '）');
ok(Math.abs(S.hp / S.hpMax - 0.5) < 0.01, '气血比值不变，伤势不漂移（' + (S.hp / S.hpMax).toFixed(3) + '）');
ok(S.stones === 99600, '灵石扣 400（现 ' + S.stones + '）');
ok((S.bagMat.lanyouCao || 0) === 198, '药材扣 2 株（现 ' + S.bagMat.lanyouCao + '）');
ok(S.quenchApplied === 1, '已兑现阶数写入存档字段');

setup('xian'); S.body = 'plain'; S.quench = 0; S.quenchApplied = 0; S.xun = 0;
S.stones = 100000; S.bagMat = { lanyouCao: 200 };
G.ACT.do_quench();
ok(S.stones === 98800, '凡体淬皮花 1200（三倍，现 ' + S.stones + '）');
ok((S.bagMat.lanyouCao || 0) === 194, '凡体药材也三倍：6 株（现 ' + S.bagMat.lanyouCao + '）');

setup('xian'); S.body = 'dao'; S.quench = 0; S.quenchApplied = 0; S.xun = 0;
S.stones = 1000000; S.bagMat = { lanyouCao: 9999 }; S.hpMax = 100; S.hp = 100;
realRnd = Math.random; Math.random = function () { return 0.999; };
for (let i = 0; i < 12; i++) { try { G.ACT.do_quench(); } catch (e) { } }
Math.random = realRnd;
ok(S.quench === 9, '可一路淬到第九阶（' + S.quench + '）');
ok(Math.round(S.hpMax) === 232, '九阶气血 ×2.32 → 232（现 ' + S.hpMax + '）');
const stBefore = S.stones;
try { G.ACT.do_quench(); } catch (e) { }
ok(S.stones === stBefore, '淬满后再淬不再扣钱');

console.log('=== v8.1 · 体质加成 ===');
function powOf() {
  const m = els['stage'].innerHTML.match(/战力<\/span><span class="v">(\d+)/);
  return m ? Number(m[1]) : NaN;
}
setup('xian'); S.xRealm = 2; S.xianji = '黄基'; S.body = 'plain';
S.daoyin = []; S.shenTong = []; S.combat = null;
G.render();
const powPlain = powOf();
S.body = 'sword'; G.render();
const powSword = powOf();
ok(isFinite(powPlain) && isFinite(powSword), '战力可读（' + powPlain + ' / ' + powSword + '）');
ok(Math.abs(powSword / powPlain - 1.10) < 0.02, '剑灵体战力 +10%');

setup('xian'); S.body = 'dao'; S.quench = 0; S.quenchApplied = 0; S.xRealm = 2; S.xStage = 0; S.xun = 0;
const x0 = S.xiuwei; G.ACT.cultivate(); const gainDao = S.xiuwei - x0;
setup('xian'); S.body = 'plain'; S.quench = 0; S.quenchApplied = 0; S.xRealm = 2; S.xStage = 0; S.xun = 0;
const x1 = S.xiuwei; G.ACT.cultivate(); const gainPlain2 = S.xiuwei - x1;
ok(gainDao > gainPlain2, '先天道体比凡体修得快（' + Math.round(gainDao) + ' > ' + Math.round(gainPlain2) + '）');

ok(G.D.BODIES.filter(function (b) { return b.id === 'chaos'; })[0].keFloor === 1.15, '混沌体带五行反克地板');
ok(G.D.BODIES.filter(function (b) { return b.id === 'nine'; })[0].fire === 1.3, '九阳圣体带火法加成');
ok(G.D.BODIES.filter(function (b) { return b.id === 'plain'; })[0].quenchMul === 3, '凡体淬体三倍');


/* 16 条境界词必须条条有文案、条条有档位（stage 连续，才能被写入点命中） */
['xian', 'shen'].forEach(function (line) {
  const t = line === 'xian' ? G.D.UNLOCK_XIAN : G.D.UNLOCK_SHEN;
  const gaps = t.filter(function (r, i) { return r.stage !== i; });
  ok(gaps.length === 0, line + ' 境界档位连续（' + t.length + ' 档）');
  ok(t.every(function (r) { return r.phrase && r.phrase.length > 3; }), line + ' 每档都有境界词');
  ok(t.every(function (r) { return Array.isArray(r.show) && Array.isArray(r.hide); }), line + ' 每档都有 show/hide');
});
ok(G.D.UNLOCK_XIAN.length + G.D.UNLOCK_SHEN.length === 16, '两表合计 16 条');


console.log('=== v8.1 · 淬体存档迁移 ===');
setup('xian'); S.body = 'plain';
const legacy = JSON.parse(JSON.stringify(S));
legacy.quench = 2; legacy.quenchApplied = 0; legacy.hpMax = 100; legacy.hp = 30;
localStorage.setItem('wxcs3_save', JSON.stringify({ state: legacy, when: 'test' }));
G.ACT.do_load();
S = G.S;   // 读档后重取引用
ok(S.quench === 2, '读档保留淬体阶数（' + S.quench + '）');
ok(S.quenchApplied === 2, '未兑现阶数已补记（' + S.quenchApplied + '）');
ok(Math.round(S.hpMax) === 120, '气血上限按增量倍率补到 120（现 ' + S.hpMax + '）');
ok(Math.abs(S.hp / S.hpMax - 0.3) < 0.01, '气血比值仍是 0.3，伤势不漂移（' + (S.hp / S.hpMax).toFixed(3) + '）');
localStorage.setItem('wxcs3_save', JSON.stringify({ state: legacy, when: 'test2' }));
G.ACT.do_load();
S = G.S;
ok(S.quenchApplied === S.quench, '再读一次不重复复利（quenchApplied ' + S.quenchApplied + '）');
ok(Math.round(S.hpMax) === 120, '重复读档上限仍是 120（现 ' + S.hpMax + '）');

console.log('=== v8.1 · 洞府入口 ===');
setup('xian'); S.body = 'sword'; S.stones = 100000; S.bagMat = { lanyouCao: 10 };
G.ACT.openCave();
const caveHtml = els['modals'].innerHTML;
ok(caveHtml.indexOf('淬体') > 0 && caveHtml.indexOf('按方淬体') > 0, '洞府面板挂出淬体入口');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
