// v8.1 P0 批次3/4 + 第6项：御兽、师徒、属性分档
// 与 test_v80.js 同一套 DOM 桩：真跑 ACT，验「玩家点了之后账有没有变对」
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
let S = G.S;
const D = G.D;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
const realRandom = Math.random;
function fixRandom(v) {
  if (G.setSeed) G.setSeed(null);
  Math.random = function () { return v; };
}
function restoreRandom() { Math.random = realRandom; }

function setup(opts) {
  opts = opts || {};
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = 'xian';
  S.xRealm = opts.xRealm === undefined ? 1 : opts.xRealm;
  S.xStage = 0; S.xiuwei = 0; S.place = 'qingyue';
  S.lingqi = opts.lingqi === undefined ? 2 : opts.lingqi;
  S.stones = opts.stones === undefined ? 5000 : opts.stones;
  S.month = 3; S.year = 387; S.turn = 0; S.xun = 0;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = [];
  S.craftedQ = {}; S.karma = 0; S.merit = 0; S.fame = 0;
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.npcs = {}; S.npcCall = null;
  S.barn = []; S.beastBond = 0; S.beastPower = 1; S.yaoshou = false;
  S.disciples = []; S.masterId = null; S.disciplesOut = [];
  S.cave = { facilities: {} };
  /* tallyInit 是可靠的空白账本：不重置会让「跨用例」污染计数器 */
  S.tally = (typeof G.tallyInit === 'function') ? G.tallyInit() : {};
  S.flags = {};
}

/* ==================== 1. 御兽：兽栏上限跟灵脉 ==================== */
console.log('=== 1. 御兽 · 兽栏与上限 ===');
setup({ lingqi: 0 });
ok(G.ACT !== undefined, 'ACT 可用');
// 灵脉档 0 → 上限 1
ok(D.BEAST_BARN[0] === 1, '灵脉最低档只能养 1 头', D.BEAST_BARN[0]);
setup({ lingqi: 4 });
ok(D.BEAST_BARN[4] === 3, '灵脉最高档可养 3 头', D.BEAST_BARN[4]);

/* 直接调内部行为：用 ACT 把妖物塞进兽栏 */
setup({ lingqi: 0, stones: 1000 });
S.barn = [];
// beastAdd 未导出，用奇遇路径验证：模拟「负伤妖物」救活
// 这里走公开 ACT，靠固定随机数让 hit(55) 成立
const enc = D.ENCOUNTERS.find(function (e) { return e.id === 'beast'; });
ok(!!enc, '奇遇表里有「负伤妖物」');

/* ==================== 2. 御兽：喂养与调教两条轴 ==================== */
console.log('=== 2. 御兽 · 亲密与妖力 ===');
setup({ lingqi: 4, stones: 2000 });
S.barn = [{ id: 'huyao', name: '狐妖', el: 'wood', bond: 10, power: 1 }];
S.yaoshou = true;
const bond0 = S.barn[0].bond;
const stones0 = S.stones;
G.ACT.do_beastfeed();
ok(S.barn[0].bond === bond0 + D.BEAST_CARE.feedBond, '喂养涨亲密', S.barn[0].bond);
/* 用「账本里确有一笔 120 的支出」判定，而不是比对 stones 差值：
   同一次动作里可能顺带结算「道途目标」奖励（grantGoal 会返灵石），
   那是既有机制，不该被这条断言当成扣款失败。 */
const _feedOut = (S.ledger.expense || []).filter(function (x) {
  return x.label === '喂养妖物' && x.amount === D.BEAST_CARE.feedStone;
});
ok(_feedOut.length === 1, '喂养记 120 石支出', JSON.stringify(S.ledger.expense));
ok(S.stones <= stones0 - D.BEAST_CARE.feedStone + 200, '喂养后灵石确有减少（容许道途返款）', S.stones);
ok(S.xun === 0, '喂养不占旬（顺手的事）', S.xun);

const pow0 = S.beastPower;
const bond1 = S.barn[0].bond;
G.ACT.do_beasttrain();
ok(S.beastPower > pow0, '调教涨妖力', S.beastPower);
ok(S.barn[0].bond === bond1 + D.BEAST_CARE.trainBond, '调教反跌亲密', S.barn[0].bond);
ok(S.xun === 1, '调教占一旬', S.xun);

/* 妖力封顶 */
S.beastPower = 100;
G.ACT.do_beasttrain();
ok(S.beastPower <= D.BEAST_CARE.powerCap, '妖力不超过上限', S.beastPower);

/* 空兽栏时不报错、不扣钱 */
setup({ lingqi: 4, stones: 9999 });
S.barn = [];
const st2 = S.stones;
G.ACT.do_beastfeed();
ok(S.stones === st2, '空兽栏喂养不扣钱', S.stones);

/* ==================== 3. 御兽：旧档布尔迁移 ==================== */
console.log('=== 3. 御兽 · 旧档迁移 ===');
const legacy = {
  started: true, phase: 'play', cultivation: 'xian', xRealm: 1, xStage: 0,
  yaoshou: true,            // 旧档只有一个布尔
  stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
  npcs: {}, cave: { facilities: {} }
};
const env = { format: 'wxcs3-save', version: '8.1', savedAt: Date.now(), state: legacy };
const applyFn = G.applyState;
ok(typeof applyFn === 'function', 'applyState 已导出可供测试');
if (typeof applyFn === 'function') {
  const r = applyFn(JSON.parse(JSON.stringify(legacy)));
  S = G.S;
  ok(r === true, '旧档可读入', r);
  ok(Array.isArray(S.barn) && S.barn.length === 1, '旧档的「妖物认你」被抬成一头兽', S.barn && S.barn.length);
  ok(S.barn[0] && S.barn[0].id === 'huyao', '抬成的是狐妖', S.barn[0] && S.barn[0].id);
  ok(S.yaoshou === true, '布尔与兽栏保持一致', S.yaoshou);
}

/* 没有 yaoshou 的旧档不该凭空长出一头兽 */
const noBeast = { started: true, phase: 'play', cultivation: 'xian', xRealm: 1,
  stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 }, npcs: {} };
if (typeof applyFn === 'function') {
  applyFn(JSON.parse(JSON.stringify(noBeast)));
  S = G.S;
  ok(Array.isArray(S.barn) && S.barn.length === 0, '无妖物的旧档不硬塞一头', S.barn && S.barn.length);
}

/* ==================== 4. 师徒：上限与四条出路 ==================== */
console.log('=== 4. 师徒 · 上限与出路 ===');
setup({ stones: 1000 });
ok(D.DISCIPLE_LIMIT === 2, '弟子上限固定为 2', D.DISCIPLE_LIMIT);
ok(D.FOLLOW_LIMIT[0].max === 500, '未误用信众上限', D.FOLLOW_LIMIT[0].max);
ok(D.DISCIPLE_LIMIT !== D.FOLLOW_LIMIT[0].max, '师徒上限与信众上限是两个量级');

/* 用面板入口确认渲染不崩 */
G.ACT.openDisciple();
ok(true, '师徒面板可打开（空门下）');

/* 收徒：好感不足时收不了 */
setup({});
S.npcs = { guqingxuan: { fav: 5, met: true, alive: true } };
const _before = S.disciples.length;
G.ACT.do_dpadd('guqingxuan');
ok(S.disciples.length === _before, '好感不足（<20）收不了徒', S.disciples.length);

/* 好感够则收得下 */
setup({});
S.npcs = { guqingxuan: { fav: 25, met: true, alive: true } };
G.ACT.do_dpadd('guqingxuan');
ok(S.disciples.length === 1, '好感够则收得下', S.disciples.length);
ok(S.disciples[0].name === '顾清玄', '记的是 NPC 名字', S.disciples[0] && S.disciples[0].name);

/* 上限 2：第三个收不进来 */
S.npcs.guqingxuan.fav = 25;
const other = D.NPC_POOL.find(function (x) { return x.id !== 'guqingxuan'; });
if (other) {
  S.npcs[other.id] = { fav: 30, met: true, alive: true };
  G.ACT.do_dpadd(other.id);
  ok(S.disciples.length === 2, '第二个人收得下', S.disciples.length);
  const third = D.NPC_POOL.find(function (x) { return x.id !== 'guqingxuan' && x.id !== other.id; });
  if (third) {
    S.npcs[third.id] = { fav: 30, met: true, alive: true };
    G.ACT.do_dpadd(third.id);
    ok(S.disciples.length === 2, '第三人被上限挡住', S.disciples.length);
  }
}

/* 授业涨进度、占一旬 */
setup({});
S.npcs = { guqingxuan: { fav: 25, met: true, alive: true } };
G.ACT.do_dpadd('guqingxuan');
const d0 = S.disciples[0];
const days0 = d0.days;
S.xun = 0;
G.ACT.do_dpteach(d0.id);
ok(d0.days === days0 + 30, '授业一次进度 +30', d0.days);
ok(d0.bond > 25, '授业涨亲密', d0.bond);
ok(S.xun === 1, '授业占一旬', S.xun);

/* 出师：火候不到不许走 */
S.xun = 0;
G.ACT.do_dpgrad(d0.id);
ok(S.disciples.length === 1, '火候不到不能出师', S.disciples.length);

/* 教到登堂（出师线 150）再走 */
for (let i = 0; i < 4; i++) { d0.days += 30; }
S.xun = 0; S.stones = 0;
G.ACT.do_dpgrad(d0.id);
ok(S.disciples.length === 0, '到火候可以出师', S.disciples.length);
ok(S.stones === 300, '出师给束脩 300 石', S.stones);
ok((S.disciplesOut || []).length === 1, '出师的记入仙谱', (S.disciplesOut || []).length);

/* 逐出门墙：记一笔逆徒 */
setup({});
S.npcs = { guqingxuan: { fav: 25, met: true, alive: true } };
G.ACT.do_dpadd('guqingxuan');
const tid = S.disciples[0].id;
const bad0 = (S.tally || {}).badDisciple || 0;
G.ACT.do_dpbetray(tid);
ok(S.disciples.length === 0, '逐出后门下清空', S.disciples.length);
ok(((S.tally || {}).badDisciple || 0) === bad0 + 1, '逐出记一笔逆徒', (S.tally || {}).badDisciple);

/* ==================== 5. 师徒：拜师与弑师 ==================== */
console.log('=== 5. 师徒 · 拜师与弑师 ===');
setup({});
S.npcs = { guqingxuan: { fav: 35, met: true, alive: true } };
G.ACT.do_dpmaster('guqingxuan');
ok(S.masterId === 'guqingxuan', '好感够则拜得成师', S.masterId);

/* 已有师承时不能再拜 */
const another = D.NPC_POOL.find(function (x) { return x.id !== 'guqingxuan'; });
if (another) {
  S.npcs[another.id] = { fav: 40, met: true, alive: true };
  const mid = S.masterId;
  G.ACT.do_dpmaster(another.id);
  ok(S.masterId === mid, '已有师承不能再拜', S.masterId);
}

/* 好感不足拜不成 */
setup({});
S.npcs = { guqingxuan: { fav: 10, met: true, alive: true } };
G.ACT.do_dpmaster('guqingxuan');
ok(S.masterId === null, '好感不足拜不成', S.masterId);

/* 弑师：打倒的正是授业者 */
setup({});
S.npcs = { guqingxuan: { fav: 35, met: true, alive: true } };
G.ACT.do_dpmaster('guqingxuan');
const km0 = (S.tally || {}).killMaster || 0;
const mk = G.masterKilled;
ok(typeof mk === 'function', 'masterKilled 已导出');
if (typeof mk === 'function') {
  const r1 = mk('someoneElse');
  ok(r1.ok === false, '非授业者不算弑师', r1.ok);
  const r2 = mk('guqingxuan');
  ok(r2.ok === true, '授业者倒下算弑师', r2.ok);
  ok(((S.tally || {}).killMaster || 0) === km0 + 1, '记一笔杀师', (S.tally || {}).killMaster);
  ok(S.masterId === null, '弑师后师承清空', S.masterId);
  ok(S.npcs.guqingxuan.alive === false, '此人标记为已故', S.npcs.guqingxuan.alive);
}

/* ==================== 6. 属性分档：看得见什么 ==================== */
console.log('=== 6. 属性分档 · 可见性 ===');
ok(D.STAT_TIER.length === 3, '三档：不见/可见/洞见', D.STAT_TIER.length);
setup({});
S.stats.sense = 5;
const c5 = G.clue ? G.clue('sense') : '';
S.stats.sense = 9;
const c9 = G.clue ? G.clue('sense') : '';
S.stats.sense = 14;
const c14 = G.clue ? G.clue('sense') : '';
ok(typeof G.clue === 'function', 'clue 已导出');
ok(c5 === '', '神识 5 看不到线索（空串）', JSON.stringify(c5));
ok(c9 === '', '神识 9 仍未到门槛', JSON.stringify(c9));
ok(c14 !== '', '神识 14 看得到线索', JSON.stringify(c14));
ok(c14 === D.INSIGHT_LINES.find(function (x) { return x.stat === 'sense'; }).text, '线索取自数据表');

/* 默认属性 8 线：不堆属性 = 看不见 */
setup({});
ok(S.stats.sense === 8, '默认神识 8', S.stats.sense);
ok(G.clue('sense') === '', '默认属性看不到线索——堆了才有', JSON.stringify(G.clue('sense')));

/* 三条线索分属不同属性，互不串味 */
setup({});
S.stats.insight = 14; S.stats.speed = 5;
ok(G.clue('insight') !== '', '悟性够，看到功法那条', '');
ok(G.clue('speed') === '', '遁速不够，看不到步法那条', JSON.stringify(G.clue('speed')));

/* ==================== 7. 面板不崩 ==================== */
console.log('=== 7. 面板渲染 ===');
setup({ lingqi: 4, stones: 3000 });
S.barn = [{ id: 'huyao', name: '狐妖', el: 'wood', bond: 40, power: 1.2 }];
S.yaoshou = true;
let threw = false;
try { G.ACT.openCave(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '有兽时洞府面板可渲染');

setup({});
S.npcs = { guqingxuan: { fav: 25, met: true, alive: true } };
G.ACT.do_dpadd('guqingxuan');
threw = false;
try { G.ACT.openDisciple(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '有徒时师徒面板可渲染');

threw = false;
try { G.ACT.openMap(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '舆图可渲染（含神识线索）');

threw = false;
try { G.ACT.openGongfa(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '道基面板可渲染（含悟性线索）');

/* ==================== 9. 统一随机数（v9.0 M0） ==================== */
console.log('=== 9. 统一随机数 ===');
ok(typeof G.setSeed === 'function', 'setSeed 已导出');
ok(typeof G.rng === 'function', 'rng 已导出');
ok(typeof G.getSeed === 'function', 'getSeed 已导出');

G.setSeed(20261118);
const seqA = [];
for (let i = 0; i < 8; i++) seqA.push(G.rng());
G.setSeed(20261118);
const seqB = [];
for (let i = 0; i < 8; i++) seqB.push(G.rng());
ok(JSON.stringify(seqA) === JSON.stringify(seqB), '同一 seed 序列完全一致');
ok(seqA.every(function (x) { return x >= 0 && x < 1; }), 'rng 落在 [0,1)');

G.setSeed(1); const s1 = G.rng();
G.setSeed(2); const s2 = G.rng();
ok(s1 !== s2, '不同 seed 给出不同序列');

G.setSeed(null);
ok(G.getSeed() === null, '清除后 getSeed 为 null');
const r1 = G.rng(), r2 = G.rng(), r3 = G.rng();
ok(!(r1 === r2 && r2 === r3), '清除后不再是固定序列');

if (G.applyState) {
  const legacyNoSeed = { started: true, phase: 'play', cultivation: 'xian', xRealm: 1,
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 }, npcs: {} };
  G.applyState(JSON.parse(JSON.stringify(legacyNoSeed)));
  S = G.S;
  ok(typeof S.seed === 'number' && S.seed > 0, '无 seed 的旧档会补一个', S.seed);
  ok(G.getSeed() === S.seed, '读档后随机源已按该档 seed 注入', G.getSeed());
}

/* ==================== 10. 行动预览（v9.0 M0） ==================== */
console.log('=== 10. 行动预览 ===');
const cl = G.costLine;
ok(typeof cl === 'function', 'costLine 已导出');
if (typeof cl === 'function') {
  ok(cl({ xun: 1 }) === '占 1 旬', '占一旬的写法', cl({ xun: 1 }));
  ok(cl({ xun: 0 }) === '不占旬', '顺手的写法', cl({ xun: 0 }));
  ok(cl({ xun: 1, stones: 800 }) === '占 1 旬 · 800 石', '旬与石并列', cl({ xun: 1, stones: 800 }));
  ok(cl(null) === '', '无成本返回空串', JSON.stringify(cl(null)));
  ok(cl({ xun: 1, herb: '蓝幽草 2 株' }).indexOf('蓝幽草') > 0, '材料也进预览');
}

setup({ lingqi: 4, stones: 3000 });
S.barn = [{ id: 'huyao', name: '狐妖', el: 'wood', bond: 40, power: 1.2 }];
S.yaoshou = true;
G.ACT.openCave();
const caveHtml = els['modals'] ? els['modals'].innerHTML : '';
ok(caveHtml.indexOf('占 1 旬') >= 0, '洞府面板出现「占 1 旬」预览', caveHtml.length);
ok(caveHtml.indexOf('不占旬') >= 0, '喂养标了「不占旬」');

setup({});
S.npcs = { guqingxuan: { fav: 25, met: true, alive: true } };
G.ACT.do_dpadd('guqingxuan');
G.ACT.openDisciple();
const dpHtml = els['modals'] ? els['modals'].innerHTML : '';
ok(dpHtml.indexOf('占 1 旬') >= 0, '师徒面板出现「占 1 旬」预览');

/* ==================== 11. 事件条件 when（v9.0 M0） ==================== */
console.log('=== 11. 事件条件 when ===');
ok(typeof G.eventSlot === 'function', 'eventSlot 已导出');
function poolOf() {
  const seen = {};
  for (let i = 0; i < 100; i++) {
    const r = 1 + (i * 100 / 100);
    const id = G.eventSlot(r);
    if (id) seen[id] = 1;
  }
  return seen;
}
function evBase() {
  setup({});
  S.cultivation = 'xian'; S.xRealm = 1; S.xStage = 0;
  S.place = 'qingyue'; S.sect = null; S.miaoSites = 0; S.flags = {}; S.xun = 0;
}

evBase();
let p1 = poolOf();
ok(!p1.rivalVisit, '无宗门时「同门来访」不进池');
ok(!p1.sectTourney, '无宗门时「宗门大比」不进池');

evBase(); S.sect = { rank: 0 };
p1 = poolOf();
ok(!!p1.rivalVisit, '有宗门且练气，「同门来访」进池');
ok(!p1.sectTourney, '宗门大比需更高于练气，此时仍不进池');

evBase(); S.sect = { rank: 0 }; S.xRealm = 2;
p1 = poolOf();
ok(!!p1.sectTourney, '筑基后「宗门大比」进池');

evBase(); S.xRealm = 2; S.place = 'chiyan';
p1 = poolOf();
ok(!p1.fieldBugs, '不在青岳时「灵田虫害」不进池');
evBase(); S.xRealm = 2; S.place = 'qingyue';
p1 = poolOf();
ok(!!p1.fieldBugs, '在青岳且已筑基，「灵田虫害」进池');

evBase(); S.xRealm = 4;
p1 = poolOf();
ok(!p1.oldStele, '金丹后「古碑残字」不再出现（maxRealm 限制）');
evBase(); S.xRealm = 1;
p1 = poolOf();
ok(!!p1.oldStele, '练气时「古碑残字」可见');

/* 条件字段必须被真的读取，而不是写不读的死字段 */
const D2 = G.D;
ok(D2.EVENTS.filter(function (e) { return e.when; }).length >= 4, '至少 4 条事件带 when', D2.EVENTS.filter(function (e) { return e.when; }).length);

/* ==================== 12. 成就可达性 ==================== */
console.log('=== 12. 成就计数器 ===');
setup({});
const _ti = G.tallyInit ? G.tallyInit() : null;
ok(!!_ti && Object.prototype.hasOwnProperty.call(_ti, 'badDisciple'), '逆徒计数器存在');
ok(!!_ti && Object.prototype.hasOwnProperty.call(_ti, 'killMaster'), '杀师计数器存在');

restoreRandom();
console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);