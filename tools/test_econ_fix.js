// v10.5 P0·E2：宗门月课只按「贡献缺口」折灵石
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { this.children.push(c); },
    removeChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; }, focus() {}, click() {},
    insertAdjacentHTML() {}, scrollIntoView() {}
  };
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
const FILES = ['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'];
fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort()
  .forEach(function (f) { FILES.push(f); });
FILES.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});
const G = window.WXCS3;
const D = G.D;
let S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function setup(opts) {
  Object.assign(S, {
    started: true, phase: 'play', name: '试道', cultivation: 'xian',
    year: 387, month: 3, turn: 0, age: 20, xun: 0,
    xRealm: 0, xStage: 0, xiuwei: 0, quench: 0, quenchApplied: 0, body: 'plain',
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], ownedArts: [],
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, capVer: 1,
    stones: 1000, fame: 0, merit: 0, karma: 0, lingqi: 1, lingqiUp: 1, place: 'qingyue',
    bag: {}, bagMat: {}, arts: [], npcs: {}, cave: { facilities: {} },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: ['zhiquan'],
    shenTong: [], log: [], chronicle: [], ledger: { income: [], expense: [] },
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },
    sect: null, sectArrears: 0, arrears: 0, clan: null, lu: null,
    root: 'true_', rootEls: ['jin'], pillar: 0, pos: 0, followers: 0, xianghuo: 0,
    piety: 1, miao: '野祀', miaoUp: {}, guowei: null,
    gainQueue: [], relics: [], tally: G.tallyInit()
  });
  if (opts) Object.assign(S, opts);
  return S;
}
function sectExpense() {
  const rows = (S.ledger.expense || []).filter(function (x) { return x.label.indexOf('宗门月课') >= 0; });
  return rows.reduce(function (a, b) { return a + b.amount; }, 0);
}

console.log('=== 1. 贡献不足：只补缺口 ===');
const due = D.SECT.ranks[3].due;          // 真传 40
const cashPer = D.FIXED_COST.sectCashPerContrib;
setup({ sect: { rank: 3, contrib: due - 10 }, stones: 1000 });
G.advanceMonth(1);
ok(S.sect.contrib === 0, '贡献扣到 0（现 ' + S.sect.contrib + '）');
ok(sectExpense() === 10 * cashPer, '只按缺口 10 折 ' + (10 * cashPer) + ' 石（实际 ' + sectExpense() + '）');
ok(S.stones === 1000 - 10 * cashPer - 15, '灵石只少缺口钱 + 洞府维护（现 ' + S.stones + '）');

console.log('=== 2. 贡献为零：全额折缴 ===');
setup({ sect: { rank: 3, contrib: 0 }, stones: 1000 });
G.advanceMonth(1);
ok(sectExpense() === due * cashPer, '零贡献折 ' + (due * cashPer) + ' 石（实际 ' + sectExpense() + '）');

console.log('=== 3. 贡献够：不花灵石 ===');
setup({ sect: { rank: 3, contrib: due + 5 }, stones: 1000 });
G.advanceMonth(1);
ok(S.sect.contrib === 5, '只扣本阶月课，余额留 5（现 ' + S.sect.contrib + '）');
ok(sectExpense() === 0, '贡献够时一分灵石不花');

console.log('=== 4. 付不出：只记欠，不删档 ===');
setup({ sect: { rank: 2, contrib: 0 }, stones: 0 });
G.advanceMonth(1);
ok(S.sectArrears === 1, '欠课记一笔（' + S.sectArrears + '）');
ok(S.sect.rank === 2 && S.started, '宗门位次保留，存档仍在');

console.log('=== 5. 连欠三月：降阶 ===');
setup({ sect: { rank: 2, contrib: 0 }, stones: 0, sectArrears: 2 });
G.advanceMonth(1);
ok(S.sect.rank === 1, '连欠三月降一阶（现 ' + S.sect.rank + '）');
ok(S.sectArrears === 0, '降阶后欠课清零');

console.log('=== 6. 坊市支出进账本、失败不入账 ===');
setup({ stones: 500 });
const mat = D.MATERIAL_EXT[0];
G.ACT.do_buy(mat.id);
ok((S.ledger.expense || []).length === 1, '买材料记一笔支出');
ok(S.ledger.expense[0].amount === mat.price, '支出数额与货价一致');
setup({ stones: 0 });
G.ACT.do_buy(mat.id);
ok((S.ledger.expense || []).length === 0, '买不起时不产生支出记录');
ok(S.stones === 0, '灵石不会变成负数');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);