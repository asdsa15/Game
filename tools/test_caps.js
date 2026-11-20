// v10.5 P0·C1/C2/C3/S1：气血/灵力上限体系与旧档迁移
// 只验玩家看得见的结果：面板上限、伤势比值、重复读档不膨胀。
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
function rebind() { S = G.S; }

function setup(opts) {
  Object.assign(S, {
    started: true, phase: 'play', name: '试道', cultivation: 'xian',
    year: 387, month: 3, turn: 0, age: 20, xun: 0,
    xRealm: 0, xStage: 0, xiuwei: 0, quench: 0, quenchApplied: 0, body: 'plain',
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], ownedArts: [],
    hp: 100, hpMax: 100, mp: 100, mpMax: 100,
    hpFlatBonus: 0, mpFlatBonus: 0, hpLuMul: 1, mpLuMul: 1, hpPermMul: 1, mpPermMul: 1,
    capVer: 1, mpGfMul: 1, hpGfMul: 1, lifeGfBonus: 1,
    lifeMax: 200, lifeStop: false, stones: 100000, fame: 0, merit: 0, karma: 0,
    lingqi: 1, lingqiUp: 1, place: 'qingyue', bag: {}, bagMat: {}, arts: [],
    npcs: {}, sect: null, cave: { facilities: {} }, combat: null, preBuff: null,
    talismans: {}, skillsKnown: [], skillsEquip: ['zhiquan'], shenTong: [],
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },
    lu: null, luHistory: [], root: 'true_', rootEls: ['jin'], pillar: 0, pos: 0,
    followers: 0, xianghuo: 0, piety: 1, miao: '野祀', miaoUp: {},
    guild: null, gainQueue: [], relics: [], tally: G.tallyInit()
  });
  if (opts) Object.assign(S, opts);
  return S;
}

console.log('=== 1. 境界基数 ===');
setup();
G.recalcCaps(false);
ok(S.hpMax === 100 && S.mpMax === 100, '胎息：100 / 100（现 ' + S.hpMax + ' / ' + S.mpMax + '）');
const expect = [
  [1, 180, 160, '练气'], [2, 320, 260, '筑基'], [3, 600, 420, '紫府'],
  [4, 1200, 700, '金丹'], [5, 2400, 1200, '道胎']
];
expect.forEach(function (e) {
  setup({ xRealm: e[0] });
  G.recalcCaps(false);
  ok(S.hpMax === e[1] && S.mpMax === e[2],
    e[3] + '：' + e[1] + ' / ' + e[2] + '（现 ' + S.hpMax + ' / ' + S.mpMax + '）');
});
setup({ xRealm: 0, xStage: 2 });
G.recalcCaps(false);
ok(S.hpMax === 108, '小阶 +4%：胎息二阶 108（现 ' + S.hpMax + '）');

console.log('=== 2. 乘区只写字段 ===');
setup({ quench: 1, quenchApplied: 1, hpMax: 110, hp: 55 });
G.recalcCaps(true);
ok(S.hpMax === 110 && Math.abs(S.hp / S.hpMax - 0.5) < 0.01,
  '淬体 ×1.10 由字段重算，不重复乘（' + S.hpMax + '，比值 ' + (S.hp / S.hpMax).toFixed(2) + '）');
setup({ hpLuMul: 1.3 });
G.recalcCaps(false);
ok(S.hpMax === 130, '受箓「力贯千钧」×1.3 → 130（现 ' + S.hpMax + '）');
setup({ mpLuMul: 1.5 });
G.recalcCaps(false);
ok(S.mpMax === 150, '受箓「重海长鲸」×1.5 → 150（现 ' + S.mpMax + '）');
setup({ hpFlatBonus: 20 });
G.recalcCaps(false);
ok(S.hpMax === 120, '永久平加 +20 → 120（现 ' + S.hpMax + '）');

console.log('=== 3. 真实动作接线 ===');
setup({ body: 'sword', stones: 100000, bagMat: { lanyouCao: 200 }, hp: 50 });
G.ACT.do_quench();
rebind();
ok(S.hpMax === 110 && Math.abs(S.hp / S.hpMax - 0.5) < 0.01,
  '淬体动作后上限 110、伤势仍五成（' + S.hpMax + '，' + S.hp + '）');

setup({ hp: 100 });
G.ACT.do_lu(encodeURIComponent('力贯千钧'));
rebind();
ok(S.hpLuMul === 1.3 && S.hpMax === 130,
  '受箓动作写乘区字段并当场重算（' + S.hpMax + '）');

setup({ ownedGongfa: ['juqi', 'tunhai'] });
S.mpMax = 100; S.mp = 100;
G.ACT.do_setgf('tunhai');
rebind();
ok(S.mpMax === 115, '换吞海功：灵力上限 100→115（现 ' + S.mpMax + '）');
G.ACT.do_setgf('juqi');
rebind();
ok(S.mpMax === 100, '换回聚气回落 100（现 ' + S.mpMax + '）');

setup({ hpMax: 100, hp: 100 });
G.applyMemory({ id: 'm_hand', name: '手上功夫', eff: '气血上限 +20' });
rebind();
ok(S.hpFlatBonus === 20 && S.hpMax === 120, '残忆「手上功夫」入平加字段（' + S.hpMax + '）');

console.log('=== 4. 旧档迁移 ===');
function legacy(over) {
  setup({ capVer: undefined, xRealm: 2, xStage: 0, hpMax: 100, mpMax: 100, hp: 30, mp: 30 });
  S.capVer = undefined;
  if (over) Object.assign(S, over);
  return JSON.parse(JSON.stringify(S));
}
const L1 = legacy();
G.applyState(L1);
rebind();
ok(S.hpMax === 320, '筑基旧档 100 → 320（只升不降，现 ' + S.hpMax + '）');
ok(Math.abs(S.hp / S.hpMax - 0.3) < 0.01, '迁移后伤势比值不变（' + (S.hp / S.hpMax).toFixed(2) + '）');
const L2 = JSON.parse(JSON.stringify(S));
L2.capVer = undefined;
G.applyState(L2);
rebind();
ok(S.hpMax === 320, '重复读档不膨胀（仍 ' + S.hpMax + '）');
ok(S.hpFlatBonus === 0, '重复迁移不叠平加（hpFlatBonus ' + S.hpFlatBonus + '）');

const L3 = legacy({ xRealm: 0, xStage: 0, quench: 9, quenchApplied: 9, hpMax: 232, hp: 116 });
G.applyState(L3);
rebind();
ok(S.hpMax === 232, '淬体九阶旧档 232 原样保留（现 ' + S.hpMax + '）');
ok(Math.abs(S.hp / S.hpMax - 0.5) < 0.01, '淬体旧档伤势不漂移（' + (S.hp / S.hpMax).toFixed(2) + '）');

console.log('=== 5. 神道基数 ===');
setup({ cultivation: 'shen', pillar: 0, pos: 0 });
G.recalcCaps(false);
ok(S.hpMax === 100 && S.mpMax === 100, '一柱：100 / 100（现 ' + S.hpMax + ' / ' + S.mpMax + '）');
setup({ cultivation: 'shen', pillar: 3, pos: 2 });
G.recalcCaps(false);
ok(S.hpMax === Math.round(380 * 1.02), '四柱·上位：基数 380 ×1.02（现 ' + S.hpMax + '）');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);