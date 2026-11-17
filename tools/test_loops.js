// 闭环自检：验证「业力 → 心魔」「业力 → 仇家 → 寻仇 → 清账」「叛门 → 追杀 → 清账」
// 这三条以前都是断的：业力只值 −6% 破境率，S.enemy / S.enemySect 写了就再没人读。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(c) {}, removeChild() {},
    setAttribute() {}, getAttribute() { return null; },
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
  createElement() { return makeEl('n'); }, addEventListener() {}, removeEventListener() {}
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
  URL: { createObjectURL() { return 'b'; }, revokeObjectURL() {} },
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
let S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
const realRandom = Math.random;
function fix(v) { Math.random = function () { return v; }; }
function restore() { Math.random = realRandom; }

function setup() {
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 24; S.lifeMax = 400;
  S.cultivation = 'xian'; S.xRealm = 2; S.xStage = 0; S.xiuwei = 300;
  S.pillar = 0; S.pos = 0; S.xianghuo = 0; S.followers = 0; S.piety = 1;
  S.stones = 2000; S.fame = 0; S.karma = 0; S.merit = 0;
  S.hp = S.hpMax = 400; S.mp = S.mpMax = 200;
  S.month = 5; S.year = 395; S.turn = 90;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = []; S.craftedQ = {};
  S.equipped = {}; S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.gongfa = ['juqi']; S.daogong = 'juqi'; S.shenTong = []; S.npcs = {};
  S.anchors = { wu: 1, ren: 1, shi: 1, yi: 1 }; S.anchorMiss = { wu: 0, ren: 0, shi: 0, yi: 0 };
  S.enemy = false; S.enemyName = null; S.enemySect = false;
  S.pendingVengeance = false; S.hdRate = 0; S.vengeanceSrc = null;
  S.dyingUsed = false; S.dying = null; S.combat = null;
  S.miaoUp = {}; S.clan = null; S.sect = null;
}

/* ==================== 1. 业力 → 心魔劫 ==================== */
console.log('=== 1. 业力 → 心魔 ===');
setup();
S.karma = 0;
fix(0);
G.ACT.do_xbreak();
restore();
ok(!S.hdRate, '无业力时不触发心魔', S.hdRate);

setup();
S.karma = 100;
fix(0);                       // 掷骰子压到 0，必触发
G.ACT.do_xbreak();
restore();
ok(S.hdRate > 0, '业力 100 时破境先问心魔', S.hdRate);
const baseRate = S.hdRate;

setup();
S.karma = 100;
fix(0);
G.ACT.do_xbreak();
restore();
const kBefore = S.karma;
G.ACT.do_hd('borrow');
ok(S.karma === kBefore + 15, '「借」加业力 15', S.karma - kBefore);
ok(S.merit >= 0, '功德不为负', S.merit);

setup();
S.karma = 100;
fix(0);
G.ACT.do_xbreak();
restore();
const hBefore = S.stats.heart;
G.ACT.do_hd('fight');
ok(S.stats.heart === hBefore + 2, '「抗」加道心 2', S.stats.heart);

/* ==================== 2. 业力 → 仇家 ==================== */
console.log('=== 2. 业力 → 仇家 ===');
setup();
S.karma = 120;
let gotEnemy = false;
for (let i = 0; i < 200 && !gotEnemy; i++) {
  fix(0);                      // 随机全压 0，判定必中
  if (S.phase !== 'play') { setup(); S.karma = 120; }
  document.getElementById('in-free').value = '打坐';   // 自由输入要先有字
  G.ACT.do_free();
  restore();
  if (S.enemy) gotEnemy = true;
}
ok(gotEnemy, '业力累积会招来仇家', gotEnemy);

/* ==================== 3. 仇家 → 寻仇 → 清账 ==================== */
console.log('=== 3. 仇家 → 寻仇 ===');
setup();
S.enemy = true; S.enemyName = '苦主之子'; S.karma = 80;
fix(0);
G.ACT.cultivate();
restore();
/* 标记可能已被 maybeEvent 立刻消费掉（面板当场弹出），所以两种状态都算触发成功 */
ok(S.pendingVengeance === 'person' || S.vengeanceSrc === 'person',
  '仇家会按月堵门（标记或面板）', S.pendingVengeance + '/' + S.vengeanceSrc);

/* 面板能开出来，迎战进战斗并打上标记 */
setup();
S.pendingVengeance = 'person';
S.enemy = true; S.enemyName = '苦主之子';
G.ACT.openVengeance ? G.ACT.openVengeance('person') : null;
ok(true, '寻仇面板不抛错');

setup();
S.enemy = true; S.enemyName = '苦主之子';
S.vengeanceSrc = 'person';
G.ACT.do_veng('fight');
ok(S.phase === 'combat', '迎战进入战斗', S.phase);
ok(S.combat && S.combat.isVengeance === 'person', '战斗标记为寻仇', S.combat && S.combat.isVengeance);
ok(S.combat && S.combat.foe.name === '苦主之子', '敌人名字用仇家的', S.combat && S.combat.foe.name);

/* 打赢就清账 */
setup();
S.enemy = true; S.enemyName = '苦主之子';
S.combat = { foe: { name: '苦主之子', rank: 8, power: 100, hp: 1, hpMax: 100, trait: 'normal', el: 'metal' }, round: 1, isVengeance: 'person' };
fix(0);
G.ACT.do_cbt('attack');
restore();
ok(!S.enemy, '打赢后仇家清账', S.enemy);

/* ==================== 4. 叛门 → 追杀 → 清账 ==================== */
console.log('=== 4. 叛门 → 追杀 ===');
setup();
S.enemySect = true;
S.karma = 40;
let chased = false;
for (let i = 0; i < 120 && !chased; i++) {
  fix(0);
  if (S.phase !== 'play' || S.pendingVengeance) { setup(); S.enemySect = true; S.karma = 40; }
  G.ACT.cultivate();
  restore();
  if (S.pendingVengeance === 'sect' || S.vengeanceSrc === 'sect') chased = true;
}
ok(chased, '叛门后宗门会派人来', chased);

setup();
S.enemySect = true;
S.combat = { foe: { name: '宗门执法', rank: 9, power: 120, hp: 1, hpMax: 100, trait: 'normal', el: 'metal' }, round: 1, isVengeance: 'sect' };
fix(0);
G.ACT.do_cbt('attack');
restore();
ok(!S.enemySect, '打赢执法后不再追杀', S.enemySect);

/* ==================== 5. 道印 / 金性 / 证位 ==================== */
console.log('=== 5. 道印 · 金性 · 证位 ===');
function breakRateShown() {
  document.getElementById('modals').innerHTML = '';
  G.ACT.openBreak();
  const html = document.getElementById('modals').innerHTML || '';
  const m = html.match(/(\d+)%/);
  return m ? Number(m[1]) : -1;
}
setup();
S.xRealm = 2; S.xStage = 1; S.xiuwei = 300;
S.daoyin = [
  { kind: 'gan', g: 0, name: '甲' }, { kind: 'gan', g: 2, name: '丙' },
  { kind: 'zhi', z: 0, name: '子' }, { kind: 'zhi', z: 2, name: '寅' }
];
const pairedRate = breakRateShown();
setup();
S.xRealm = 2; S.xStage = 1; S.xiuwei = 300;
S.daoyin = [
  { kind: 'gan', g: 0, name: '甲' }, { kind: 'gan', g: 2, name: '丙' },
  { kind: 'zhi', z: 1, name: '丑' }, { kind: 'zhi', z: 3, name: '卯' }
];
const looseRate = breakRateShown();
ok(pairedRate > looseRate, '四印成对提高破境率', pairedRate + '% vs ' + looseRate + '%');

setup();
S.xRealm = 4; S.xStage = 0; S.xiuwei = 1000; S.jinxing = false;
fix(0.999);
G.ACT.do_xbreak();
restore();
const lostNoJin = S.xiuwei;
setup();
S.xRealm = 4; S.xStage = 0; S.xiuwei = 1000; S.jinxing = true;
fix(0.999);
G.ACT.do_xbreak();
restore();
ok(S.xiuwei > lostNoJin, '金性让破境失败少散修为', S.xiuwei + ' vs ' + lostNoJin);

setup();
S.xRealm = 3; S.xStage = 2; S.xiuwei = 1000;
const g = window.WXCS3.D.GUOWEI.find(function (x) { return x.rank === '闰位'; }) || window.WXCS3.D.GUOWEI[0];
fix(0.999);
G.ACT.do_jindan(encodeURIComponent(g.n));
restore();
ok(!S.guowei && S.xRealm === 3, '证位失败不成果位', S.guowei ? S.guowei.n : '无');

setup();
S.xRealm = 3; S.xStage = 2; S.xiuwei = 1000;
fix(0);
G.ACT.do_jindan(encodeURIComponent(g.n));
restore();
ok(!!S.guowei && S.xRealm === 4, '证位成功得果位', S.guowei ? S.guowei.n : '无');
ok(S.jinxing === true, '结丹得金性', S.jinxing);

/* ==================== 6. 源码守卫 ==================== */
console.log('=== 6. 接线守卫 ===');
const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
ok(/S\.enemySect/.test(gcode) && (gcode.match(/S\.enemySect/g) || []).length >= 3,
  'enemySect 有写入也有读取（不再是一句死话）', (gcode.match(/S\.enemySect/g) || []).length);
ok(/function openHeartDemon/.test(gcode), '心魔劫有面板');
ok(/function openVengeance/.test(gcode), '寻仇有面板');
ok(/isVengeance/.test(gcode), '战斗能识别这是不是寻仇');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
