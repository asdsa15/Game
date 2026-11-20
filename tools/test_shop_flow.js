// v10.5 P0·E1/E3/E5/E6/E7：坊市记账、连续购买、法器唯一、灵脉契
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
    hpFlatBonus: 0, mpFlatBonus: 0, hpLuMul: 1, mpLuMul: 1, hpPermMul: 1, mpPermMul: 1,
    mpGfMul: 1, hpGfMul: 1, lifeGfBonus: 1, lifeMax: 200, lifeStop: false,
    stones: 100000, fame: 0, merit: 0, karma: 0, lingqi: 1, lingqiUp: 1, place: 'qingyue',
    bag: {}, bagMat: {}, arts: [], npcs: {}, sect: null, cave: { facilities: {} },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: ['zhiquan'],
    shenTong: [], log: [], chronicle: [], ledger: { income: [], expense: [] },
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },
    lu: null, luHistory: [], root: 'true_', rootEls: ['jin'], pillar: 0, pos: 0,
    followers: 0, xianghuo: 0, piety: 1, miao: '野祀', miaoUp: {},
    guild: null, gainQueue: [], relics: [], tally: G.tallyInit()
  });
  if (opts) Object.assign(S, opts);
  return S;
}
function expensesOf(label) {
  return (S.ledger.expense || []).filter(function (x) { return x.label.indexOf(label) >= 0; });
}

console.log('=== 1. 法器：买一次就够 ===');
setup();
const art = D.ARTIFACT_EXT[0];
S.arts = []; S.stones = 10000;
G.ACT.openShop('art');
G.ACT.do_buy(art.id);
ok(S.stones === 10000 - art.price, '买法器扣款（' + S.stones + '）');
ok(S.arts.indexOf(art.id) >= 0, '法器入包');
ok(expensesOf(art.name).length === 1, '买法器记账一笔');
const afterFirst = S.stones;
G.ACT.do_buy(art.id);
ok(S.stones === afterFirst, '再买同一件不再扣款（' + S.stones + '）');
ok(S.arts.filter(function (x) { return x === art.id; }).length === 1, '包里仍只有一件');
ok(els['modals'].innerHTML.indexOf('坊市') >= 0, '买完窗口还开着，可接着买');

console.log('=== 2. 连续购买与余额刷新 ===');
const mat = D.MATERIAL_EXT[0];
const beforeMat = S.stones;
G.ACT.openShop('mat');
G.ACT.do_buy(mat.id);
G.ACT.do_buy(mat.id);
ok(S.bagMat[mat.id] === 2, '连买两份材料都入 bagMat（现 ' + (S.bagMat[mat.id] || 0) + '）');
ok(S.stones === beforeMat - mat.price * 2, '两笔都扣款（' + S.stones + '）');
ok(expensesOf(mat.name).length === 2, '两笔各记一笔账');
ok((els['shop-stone'] || {}).textContent === String(S.stones) ||
  (els['shop-stone'] || {}).textContent === String(S.stones).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  '余额行同步到最新（' + (els['shop-stone'] || {}).textContent + '）');

console.log('=== 3. 买不起：扣款为零、窗口不关 ===');
setup({ stones: 0 });
const pill = D.SHOP.find(function (x) { return x.cat === 'pill'; });
G.ACT.openShop('pill');
G.ACT.do_buy(pill.id);
ok(S.stones === 0, '灵石不足不扣成负数');
ok((S.ledger.expense || []).length === 0, '失败不记账');
ok(els['modals'].innerHTML.indexOf('坊市') >= 0, '失败也不关窗');

console.log('=== 4. 灵脉契：地产不是法器 ===');
setup({ stones: 5000, lingqiUp: 1, arts: [] });
G.ACT.do_buy('fudi');
ok(S.lingqiUp === 2, '灵脉契升一档（' + S.lingqiUp + '）');
ok(S.arts.indexOf('fudi') < 0, '灵脉契不进法宝栏');
ok(expensesOf('灵脉契').length === 1, '灵脉契记账');
S.lingqiUp = D.LINGQI.length - 1;
const maxStones = S.stones;
G.ACT.do_buy('fudi');
ok(S.lingqiUp === D.LINGQI.length - 1 && S.stones === maxStones, '灵气已至洞天时不再收钱也不再升档');

console.log('=== 5. 功法货架：道基与术法分行 ===');
setup({ stones: 10000, ownedGongfa: ['juqi'], ownedArts: [] });
G.ACT.openShop('gongfa');
G.ACT.do_buyg('liehuo');
ok((S.ownedArts || []).indexOf('fa:liehuo') >= 0, '烈火掌进术法池');
ok(S.ownedGongfa.indexOf('liehuo') < 0, '烈火掌不再混进道基池');
ok(S.stones === 10000 - 160, '术法扣款 160（现 ' + S.stones + '）');
const beforeFa = S.stones;
G.ACT.do_buyg('liehuo');
ok(S.stones === beforeFa, '已习术法不再卖第二次');

G.ACT.do_buyg('yufeng');
ok(S.ownedGongfa.indexOf('yufeng') >= 0, '御风术进道基池');

console.log('=== 6. 斗法收入进账 ===');
setup();
const c = {
  foe: { name: '石傀', rank: 1, power: 10, hp: 1, hpMax: 1 },
  round: 3, usedPill: false, stUsed: {}
};
S.phase = 'combat'; S.combat = c; S.tally = G.tallyInit();
const stonesBefore = S.stones;
G.settleCombatWin(c);
ok(S.combat === null && S.phase === 'play', '斗法结算收尾');
ok(S.stones > stonesBefore, '斗法得灵石（+' + (S.stones - stonesBefore) + '）');
const lootRow = (S.ledger.income || []).filter(function (x) { return x.label === '斗法所得'; });
ok(lootRow.length === 1 && lootRow[0].amount === S.stones - stonesBefore,
  '斗法所得入月账且数额一致');

console.log('=== 7. 月账重置 ===');
G.advanceMonth(1);
ok((S.ledger.income || []).length === 0, '新月开始，上月收入清零');
ok(!(S.ledger.expense || []).some(function (x) { return x.label === '斗法所得' || x.label.indexOf('购 ') === 0; }),
  '上月买入记录不跨月（只留本月固定开销）');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);