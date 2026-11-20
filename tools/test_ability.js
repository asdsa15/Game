// v10.5 P0·A1/A2：能力三分（道基 / 术法）的数据边界与旧档分派
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
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, capVer: 1,
    hpFlatBonus: 0, mpFlatBonus: 0, hpLuMul: 1, mpLuMul: 1, hpPermMul: 1, mpPermMul: 1,
    mpGfMul: 1, hpGfMul: 1, lifeGfBonus: 1, lifeMax: 200, lifeStop: false,
    stones: 10000, fame: 0, merit: 0, karma: 0, lingqi: 1, lingqiUp: 1, place: 'qingyue',
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
function mkFoe(hp) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: 300, rank: 12, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {}
  };
}

console.log('=== 1. 数据边界 ===');
const dao = D.GONGFA.filter(function (g) { return g.role === 'dao'; });
const fa = D.GONGFA.filter(function (g) { return g.role === 'fa'; });
ok(D.GONGFA.every(function (g) { return g.role === 'dao' || g.role === 'fa'; }), '每本功法都有 role');
ok(dao.length === 29 && fa.length === 16, 'dao 29 / fa 16（现 ' + dao.length + ' / ' + fa.length + '）');
ok(fa.some(function (g) { return g.id === 'liehuo'; }) && dao.some(function (g) { return g.id === 'juqi'; }),
  '烈火掌归术法，聚气诀归道基');

console.log('=== 2. 道基入口拒绝术法 ===');
setup({ ownedGongfa: ['juqi', 'liehuo'], gongfa: ['juqi'], daogong: 'juqi' });
G.ACT.do_setgf('liehuo');
rebind();
ok(S.daogong === 'juqi' && S.gongfa[0] === 'juqi', '《烈火掌》设不成道基（现 ' + S.daogong + '）');

setup({ daogong: 'xuanyuan', gongfa: ['xuanyuan'], ownedGongfa: ['juqi', 'xuanyuan'] });
ok(G.getDaogong().id === 'juqi', '旧档道基指向术法时回退到 dao（现 ' + G.getDaogong().id + '）');

setup({ ownedGongfa: ['juqi', 'liehuo', 'yufeng'] });
G.ACT.openGongfa();
const gh = els['modals'].innerHTML;
ok(gh.indexOf('聚气诀') >= 0 && gh.indexOf('御风术') >= 0, '道基面板列出 dao 功法');
ok(gh.indexOf('烈火掌') < 0, '道基面板不再列术法');

console.log('=== 3. 术法池 ===');
setup();
ok(G.learnArt('fa:liehuo') === true, '习得术法《烈火掌》');
ok(G.hasArt('fa:liehuo') === true, '术法池记在 ownedArts');
ok(S.ownedGongfa.indexOf('liehuo') < 0, '术法不写进 ownedGongfa');
const spec = G.artSpecOf('fa:liehuo');
ok(spec && spec.name === '烈火掌' && spec.kind === 'fire' && spec.cost === 25,
  '术法规格可查（' + (spec ? spec.name + '/' + spec.kind + '/' + spec.cost : '无') + '）');
G.ACT.openSkillBook();
ok(els['modals'].innerHTML.indexOf('烈火掌') >= 0, '装配面板列出《烈火掌》');

S.skillsEquip = ['zhiquan'];
G.ACT.do_eqsk('fa:liehuo');
rebind();
ok(S.skillsEquip.indexOf('fa:liehuo') >= 0, '装上一格术法');
G.ACT.do_eqsk('fa:liehuo');
rebind();
ok(S.skillsEquip.indexOf('fa:liehuo') < 0, '能主动卸下');

console.log('=== 4. 术法真的能出手 ===');
setup({ mp: 100, hp: 5000, hpMax: 5000, skillsEquip: ['fa:liehuo'], phase: 'combat' });
G.learnArt('fa:liehuo');
/* 对手压低境界：这条验的是「术法能出手」，不是越境硬拼 */
S.combat = { foe: { name: '石傀', hp: 1e6, hpMax: 1e6, power: 5, rank: 0, el: 'tu', trait: 'brute' },
  round: 1, log: [], stUsed: {} };
const foeBefore = S.combat.foe.hp;
const mpBefore = S.mp;
G.ACT.do_cbt('skill', encodeURIComponent('烈火掌'));
const dealt = S.combat ? foeBefore - S.combat.foe.hp : -1;
ok(dealt > 0, '《烈火掌》打出伤害（' + dealt + '）');
ok(S.mp === mpBefore - 25, '按术法耗灵 25（现 ' + S.mp + '）');
ok(/烈火掌/.test((S.log || []).map(function (x) { return x.txt || ''; }).join('')), '战斗日志写明招式名');

console.log('=== 5. 获取入口统一路由 ===');
setup({ stones: 10000, ownedGongfa: ['juqi'], ownedArts: [] });
ok(G.addGongfa('xuanyuan') === true, '遗物/传法仍只调 addGongfa');
ok((S.ownedArts || []).indexOf('fa:xuanyuan') >= 0, '玄元剑经进术法池');
ok(S.ownedGongfa.indexOf('xuanyuan') < 0, '玄元剑经不进道基池');

console.log('=== 6. 旧档分派 ===');
setup({ ownedGongfa: ['juqi', 'liehuo'], daogong: 'liehuo', gongfa: ['liehuo'], capVer: 1 });
const legacy = JSON.parse(JSON.stringify(S));
G.applyState(legacy);
rebind();
ok(S.ownedGongfa.indexOf('liehuo') < 0, '读档后道基池不再含术法');
ok((S.ownedArts || []).indexOf('fa:liehuo') >= 0, '读档后术法不丢，转入术法池');
ok(S.daogong === 'juqi' && S.gongfa[0] === 'juqi', '道基/主修回退到第一本 dao');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);