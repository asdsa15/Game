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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
const G = window.WXCS3;
const S = G.S;

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

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
