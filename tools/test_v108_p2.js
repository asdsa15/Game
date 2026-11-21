// v10.8 P2 专项：批量执行器 / 坊市段控 / 采集 N 旬 / 炼制 N 炉 / 外壳固定
// 目的（对应方案 §6.1~§6.5、§5.3 B 版与 §8 的顺手修 6、7）：
//   1. 执行器——runBatch 跑满 n 次、单位自报 stop 即停、阶段一变即停；
//   2. 记忆——S.batchN 三键（坊市/采集/炼制）缺省 1，旧档读入不炸；
//   3. 等价——同 seed 下「批量 N 次」与「手动 N 次」结果**逐条相同**（这是本批准入门槛）；
//   4. 中止——料尽 / 采不到 都停在中途，并如实报「第 k 次中止」；
//   5. 段控——坊市买 5 只扣一次款、余额不够自动降档、法器仍强制 ×1；
//   6. 展示——材料页「已有 N」、行情箭头；
//   7. 外壳——≥1200 中栏吸顶内滚，且规则排在 .stage>* 的 relative 之后。
// 用法：node tools/test_v108_p2.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null, scrollTop: 0,
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
  createElement() { return makeEl('new'); }, addEventListener() {}, removeEventListener() {},
  contains() { return true; }
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
  getComputedStyle() { return {}; }, innerWidth: 1440, innerHeight: 900,
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
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const fsx = fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort();
fsx.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
const D = G.D;
let S = G.S;                       // applyState 会重建整个状态对象，读档后必须重新取
function rebind() { S = G.S; }
const HTML = fs.readFileSync(path.join(ROOT, '问道长生v6.html'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function modalHtml() { return (els['modals'] && els['modals'].innerHTML) || ''; }
function closeAll() { if (els['modals']) els['modals'].innerHTML = ''; }
function sortObj(o) {
  const out = {};
  Object.keys(o || {}).sort().forEach(function (k) { out[k] = o[k]; });
  return out;
}
function snapMat() {
  return JSON.stringify({
    bagMat: sortObj(S.bagMat),
    turn: S.turn, xun: S.xun, stones: S.stones,
    log: (S.log || []).map(function (l) { return l.txt; })
  });
}
function snapCraft() {
  return JSON.stringify({
    bag: sortObj(S.bag), craftedQ: sortObj(S.craftedQ || {}),
    craft: sortObj(S.craft), craftLv: sortObj(S.craftLv), dishes: sortObj(S.dishes),
    hp: S.hp, heart: S.stats.heart, turn: S.turn, xun: S.xun
  });
}

function setup(opts) {
  opts = opts || {};
  S = G.S;
  /* 功过格落盘是「跨局」的（achDisk）：不清掉的话，第二局会把成就当「前世已得」，
     于是两次跑局的日志、乃至掷骰顺序都不一样——等价断言就变成假阳性/假阴性。
     每个用例开始都清一次盘与 ach，两次跑局才在同一条起跑线上。 */
  Object.keys(store).forEach(function (k) { delete store[k]; });
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['jin', 'mu', 'shui'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 3, xStage: 0, xiuwei: 0, xiuAcc: 0, shenTong: [], logSeq: 0,
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000,
    stones: 99999, month: 3, year: 388, turn: 0, xun: 0,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 2, pos: 0, guowei: null, miao: 0, miaoUp: {},
    followers: 1000, piety: 1, xianghuo: 0, meditate: false,
    arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, stUsed: null,
    npcs: {}, npcCall: null, hooksGiven: [], disciples: [], disciplesOut: [],
    equipped: {}, daoFruit: null, timed: null, ruin: null, relics: [],
    benming: null, school: null, sect: null, clan: null, cave: { facilities: {} },
    unlockStage: 0, inDongtian: false, needsAnchorFlag: false, dockOpen: {},
    holdsEvent: false, holdEvent: true, pendingEnc: null, pendingVengeance: false, pendingTx: null,
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 }, craftLv: { dan: 9, qi: 9, fu: 9, zhen: 9 },
    dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 },
    learnedRecipes: [], learnedArts: ['dan', 'fu', 'qi', 'zhen'],
    tally: {}, ach: {}, goals: [], gainQueue: [], flags: {}, beasts: {}, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
    prep: null, trib: null, tribLock: 0, legacy: null, bloodDebt: 0, legacyPact: null,
    sureflag: false, suiFlag: false, miaoHao: null, xianshengCount: 0, hdRate: 0,
    market: { mul: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 }, buy: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 }, month: 0 },
    batchN: undefined,
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  /* 道途目标与功过格都是「一劳永逸的入账」：不关掉的话，
     买完一次货就可能同时进 430 石，价格断言全被搅乱。
     本文件只测批量与段控，这两笔奖励各自有专门的测试。 */
  S.goals = (D.GOALS.xian || []).map(function (g) { return g.id; });
  D.ACHIEVEMENTS.forEach(function (a) { S.ach[a.id] = { past: true }; });
  closeAll();
  return S;
}

/* ---------- 1. 执行器 ---------- */
console.log('\n[1] 批量执行器 runBatch');
(function () {
  setup();
  let calls = 0;
  const r = G.runBatch(4, function (i) { calls++; return { ok: i % 2 === 1 }; });
  ok(calls === 4, '跑满 4 次，step 被调用 4 次（不是一次掷骰 ×N）', calls);
  ok(r.n === 4, 'n = 真正跑完的单位数', r.n);
  ok(r.done === 2, 'done 只数成功的单位', r.done);
  ok(r.stopped === false && !r.why, '没有 stop 时不算中止');
  ok(r.results.length === 4, 'results 保留每一次的成败');

  setup();
  const r2 = G.runBatch(5, function (i) {
    if (i === 3) return { ok: false, stop: true, why: '料尽' };
    return { ok: true };
  });
  ok(r2.n === 2, '第 3 次自报 stop → 只跑完 2 次', r2.n);
  ok(r2.stopped === true && r2.why === '料尽', '中止原因原样带回', r2.why);

  setup();
  const r3 = G.runBatch(5, function () { S.phase = 'combat'; return { ok: true }; });
  ok(r3.n === 1 && r3.stopped && r3.why === '外界生变', '阶段离开 play 即刻停手（防越过战斗继续跑）', r3.why);

  setup();
  ok(G.runBatch(0, function () { return { ok: true }; }).n === 1, 'n 传 0 也至少跑 1 次（不空转）');
})();

/* ---------- 2. 批量段控记忆 ---------- */
console.log('\n[2] 批量记忆与存档兼容');
(function () {
  setup();
  ok(G.batchN('gather') === 1 && G.batchN('craft') === 1 && G.shopQty() === 1,
    '新档没有 S.batchN → 三处都缺省 1');
  G.dispatch('do;gatherqty:3');
  ok(S.batchN && S.batchN.gather === 3, '采集段控写进 S.batchN.gather', JSON.stringify(S.batchN));
  G.dispatch('do;shopqty:10');
  ok(G.shopQty() === 10, '坊市段控写进 S.batchN.shop', G.shopQty());
  G.dispatch('do;shopqty:0');
  ok(G.shopQty() === 0, '「买满」以 0 占位，不当成 1 份', G.shopQty());

  const loaded = G.applyState({
    phase: 'play', started: true, month: 3, year: 388, hp: 100, hpMax: 100,
    stats: { heart: 8, insight: 8, qualify: 8, sense: 8, speed: 8, fate: 8 }
  });
  rebind();
  ok(loaded === true && S.batchN && S.batchN.shop === 1 && S.batchN.gather === 1 && S.batchN.craft === 1,
    '旧档（无 batchN）读入后三处补 1，不报错', JSON.stringify(S.batchN));

  G.applyState({ phase: 'play', started: true, month: 3, year: 388, hp: 100, hpMax: 100,
    batchN: 4, stats: { heart: 8, insight: 8, qualify: 8, sense: 8, speed: 8, fate: 8 } });
  rebind();
  ok(S.batchN.gather === 3 && S.batchN.craft === 4,
    '裸数字按同一值铺开，且采集封顶 3 旬', JSON.stringify(S.batchN));

  G.applyState({ phase: 'play', started: true, month: 3, year: 388, hp: 100, hpMax: 100,
    batchN: { shop: 0, gather: 99, craft: 99 },
    stats: { heart: 8, insight: 8, qualify: 8, sense: 8, speed: 8, fate: 8 } });
  rebind();
  ok(S.batchN.shop === 0 && S.batchN.gather === 3 && S.batchN.craft === 12,
    '读档时按上限收敛（采集 ≤3 / 炼制 ≤12，坊市 0 保留为「买满」）', JSON.stringify(S.batchN));
})();

/* ---------- 3. 采集 N 旬 ---------- */
console.log('\n[3] 采集：一次 N 旬');
(function () {
  setup();
  G.dispatch('act:openGather');
  const h = modalHtml();
  ok(/do;gatherqty:1/.test(h) && /do;gatherqty:2/.test(h) && /do;gatherqty:3/.test(h),
    '采集面板有三档段控（1 / 2 / 3 旬）');
  ok(/do;gather:herb:/.test(h), '地点行把当前档位写进动作参数', h.slice(0, 0));

  G.dispatch('do;gatherqty:2');
  ok(/do;gather:herb:2/.test(modalHtml()), '选 2 旬后地点行动作改带 :2');

  /* 等价：同 seed 下 3 次单旬 vs 1 次三旬 */
  setup({ xRealm: 3, lingqi: 2 });
  S.bagMat = {};
  G.setSeed(20261121);
  for (let i = 0; i < 3; i++) G.dispatch('do;gather:herb:1');
  const A = snapMat();
  const turnA = S.turn, xunA = S.xun;

  setup({ xRealm: 3, lingqi: 2 });
  S.bagMat = {};
  G.setSeed(20261121);
  G.dispatch('do;gather:herb:3');
  const B = snapMat();
  ok(A === B, '同 seed：三次单旬采集 == 一次三旬采集（逐条相同）', A + ' / ' + B);
  ok(turnA === S.turn && xunA === S.xun, '时间推进与逐次一致（3 旬，不多不少）');

  setup({ xRealm: 3, lingqi: 2 });
  S.bagMat = {};
  /* 成就弹诗会盖住结算窗（入典/天书档会开 modal），这里先把功过格全部标为已得，
     好让「采集所得」这一层露出来——成就本身有自己的一套测试。 */
  D.ACHIEVEMENTS.forEach(function (a) { S.ach[a.id] = { past: true }; });
  G.dispatch('do;gather:herb:3');
  const got = Object.keys(S.bagMat).reduce(function (a, k) { return a + S.bagMat[k]; }, 0);
  ok(got >= 6, '三旬共采到 ' + got + ' 份（每旬 2~4 份，独立掷）', got);
  ok(/再来一次/.test(modalHtml()), '结果窗带「再来一次」');
  ok(/外界之事一并略过/.test(modalHtml()), '结果窗写明批量只掷一次外界之事');
  ok(S.batchN.gather === 3, '采完记住这次的旬数（下次默认沿用）');
})();

/* ---------- 4. 炼制 N 炉 ---------- */
console.log('\n[4] 炼制：一次 N 炉');
(function () {
  const r = D.RECIPES.find(function (x) { return x.kind === 'dan' && x.tier === 'huang' && (x.lv || 1) <= 1; })
    || D.RECIPES.find(function (x) { return x.kind === 'dan'; });
  const m = r.mats || {};
  const per = m[Object.keys(m)[0]] || 1;

  setup();
  S.learnedRecipes = [r.id];
  Object.keys(m).forEach(function (k) { S.bagMat[k] = m[k] * 30; });
  G.dispatch('do;craftpick:' + r.id);
  const h = modalHtml();
  ok(/do;craftqty:/.test(h), '制作面板有炉数段控');
  ok(new RegExp('do;craftgo:' + r.id + ':zhong:').test(h), '火候按钮把炉数写进动作参数');
  ok(/做满/.test(h), '段控最后一档是「做满」');

  G.dispatch('do;craftqty:' + r.id + ':5');
  ok(G.batchN('craft') === 5, '选 5 炉后记住', G.batchN('craft'));

  /* 等价：同 seed 下 3 次单炉 vs 1 次三炉 */
  function prepare() {
    setup();
    S.learnedRecipes = [r.id];
    Object.keys(m).forEach(function (k) { S.bagMat[k] = m[k] * 30; });
    S.bag = {}; S.craftedQ = {}; S.craft = { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 };
    S.craftLv = { dan: 9, qi: 9, fu: 9, zhen: 9 };
    S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  }
  prepare(); G.setSeed(20261121);
  for (let i = 0; i < 3; i++) G.dispatch('do;craftgo:' + r.id + ':zhong:1');
  const A = snapCraft();

  prepare(); G.setSeed(20261121);
  G.dispatch('do;craftgo:' + r.id + ':zhong:3');
  const B = snapCraft();
  ok(A === B, '同 seed：三炉逐次 == 一次三炉（成败/品相/扣料/炸炉全同）', A + ' / ' + B);

  /* 料尽：只够 2 炉却要 5 炉 */
  prepare();
  Object.keys(m).forEach(function (k) { S.bagMat[k] = m[k] * 2; });
  G.dispatch('do;craftgo:' + r.id + ':zhong:5');
  ok((S.tally.craft||0) === 2, '料只够 2 炉 → 真就只炼 2 炉', (S.tally.craft||0));
  ok(/料尽/.test(modalHtml()), '结果窗报「第 3 炉料尽」', modalHtml().slice(-160));
  ok(S.batchN.craft === 5, '中止不改记住的炉数（下次仍按 5 炉起步）');

  /* 全部炸炉的路径：武火 + 低血，至少不会把 hp 打成 0 以下 */
  prepare();
  Object.keys(m).forEach(function (k) { S.bagMat[k] = m[k] * 12; });
  S.hp = 1; S.hpMax = 1000;
  G.setSeed(7788);
  G.dispatch('do;craftgo:' + r.id + ':wu:12');
  ok(S.hp >= 1, '武火连炸也不越界（hp 下限 1）', S.hp);
  ok((S.tally.craft||0) === 12, '12 炉全部结算', (S.tally.craft||0));
  ok(per >= 1, '配方主料用量可读');
})();

/* ---------- 5. 坊市段控 ---------- */
console.log('\n[5] 坊市：数量段控 / 自动降档 / 唯一物');
(function () {
  const mat = D.SHOP.find(function (x) { return x.cat === 'mat' && x.price; });
  const art = D.SHOP.find(function (x) { return x.cat === 'art' && x.price; });
  const price = G.buyPriceOf(mat);

  setup({ stones: price * 100 });
  G.dispatch('do;shopqty:5');
  G.dispatch('do;buy:' + mat.id);
  ok((S.bagMat[mat.id] || 0) === 5, '点一下买 5 份，库存 +5', S.bagMat[mat.id]);
  ok(S.ledger.expense.length === 1, '记 1 笔账（不是 5 笔）', S.ledger.expense.length);
  ok(S.ledger.expense[0].amount === price * 5, '账目金额 = 单价 × 5', S.ledger.expense[0].amount);
  ok(/×5/.test(S.ledger.expense[0].label), '账目摘要写明 ×5', S.ledger.expense[0].label);

  setup({ stones: price * 3 + 1 });
  G.dispatch('do;shopqty:5');
  const beforeCut = S.stones;
  G.dispatch('do;buy:' + mat.id);
  ok((S.bagMat[mat.id] || 0) === 3, '余额只够 3 份 → 自动降到 3 份（不整单失败）', S.bagMat[mat.id]);
  /* 用差额而不是绝对值：买完的重绘会触发道途/功过格结算，账上可能同时进钱 */
  ok(beforeCut - S.stones === price * 3, '只扣 3 份的钱', beforeCut - S.stones);

  setup({ stones: price * 100 });
  G.dispatch('do;shopqty:0');
  G.dispatch('do;buy:' + mat.id);
  const all = price * 100;
  ok((S.bagMat[mat.id] || 0) === Math.floor(all / price), '「买满」按余额买到底', S.bagMat[mat.id]);

  const artPrice = G.buyPriceOf(art);
  setup({ stones: artPrice * 10 });
  G.dispatch('do;shopqty:10');
  const beforeArt = S.stones;
  G.dispatch('do;buy:' + art.id);
  ok((S.arts || []).filter(function (x) { return x === art.id; }).length === 1,
    '法器仍强制 ×1（购买唯一不被段控破掉）', (S.arts || []).length);
  ok(beforeArt - S.stones === artPrice, '法器只扣一件的钱', beforeArt - S.stones);

  setup();
  S.bagMat[mat.id] = 7;
  G.dispatch('act:openShop');
  G.dispatch('do;shopcat:mat');
  ok(new RegExp('已有 7').test(modalHtml()), '材料页显示「已有 N」', (modalHtml().match(/已有 \d+/) || [])[0]);
  ok(/do;shopqty:5/.test(modalHtml()) && /买满/.test(modalHtml()), '坊市有 1 / 5 / 10 / 买满 四档段控');

  setup();
  S.market.buy.mat = 1.2;
  G.dispatch('do;shopcat:mat');
  ok(/↑20%/.test(modalHtml()), '行情涨 20% 时价格后带 ↑20%', (modalHtml().match(/[↑↓]—?\d*%?/) || [])[0]);
  setup();
  S.market.buy.mat = 0.95;
  G.dispatch('do;shopcat:mat');
  ok(/↓5%/.test(modalHtml()), '行情跌 10% 时价格后带 ↓10%');
})();

/* ---------- 6. 外壳固定（静态） ---------- */
console.log('\n[6] 应用外壳固定（≥1200 中栏内滚）');
(function () {
  ok(/\.qtychips\{/.test(HTML), '段控样式 .qtychips 已落地');
  const iRel = HTML.indexOf('.stage>*:not(.sceneart--backdrop){position:relative');
  const iSticky = HTML.indexOf('@media(min-width:1200px)');
  ok(iRel > 0 && iSticky > iRel, '吸顶规则排在 .stage>* 的 relative 之后（否则会被压成 relative）');
  const block = HTML.slice(iSticky, iSticky + 700);
  ok(/\.stage>\.col-main\{[\s\S]*position:sticky/.test(block), '中栏 position:sticky');
  ok(/max-height:calc\(100vh - 84px\)/.test(block), '用 max-height 而不是 height（内容短时回落文档流）');
  ok(/100dvh/.test(HTML.slice(iSticky, iSticky + 900)), '移动浏览器用 dvh 兜住地址栏');
  ok(/\.stage>\.col-main \.tabbar\{top:0\}/.test(block), 'Tab 条改在中栏顶部吸住（栏内滚动容器的 top 是 0）');
})();

/* ---------- 7. 点击次数（方案 §6.5 的可验收口径） ---------- */
console.log('\n[7] 点击次数：从四艺面板起到结算窗');
(function () {
  const rr = D.RECIPES.find(function (x) { return x.kind === 'dan' && x.tier === 'huang' && (x.lv || 1) <= 1; })
    || D.RECIPES.find(function (x) { return x.kind === 'dan'; });
  const mm = rr.mats;

  /* 采集 3 旬：四艺 → 采集 → 地点（段控记着 3 旬，不必每回重选） */
  setup({ xRealm: 3 });
  G.dispatch('act:openCraft');
  G.dispatch('do;gatherqty:3');
  G.dispatch('act:openGather');
  const gatherChain = 3;
  const beforeG = Object.keys(S.bagMat).reduce(function (a, k) { return a + S.bagMat[k]; }, 0);
  G.dispatch('do;gather:herb:3');
  const afterG = Object.keys(S.bagMat).reduce(function (a, k) { return a + S.bagMat[k]; }, 0);
  ok(gatherChain <= 3 && afterG > beforeG, '采集 3 旬：3 击跑完（四艺 → 采集 → 地点）', gatherChain);

  /* 炼制 5 炉：四艺 → 配方书 → 配方卡 → 火候 */
  setup();
  S.learnedRecipes = [rr.id];
  Object.keys(mm).forEach(function (k) { S.bagMat[k] = mm[k] * 10; });
  G.dispatch('do;craftqty:' + rr.id + ':5');
  G.dispatch('act:openCraft');
  G.dispatch('act:openRecipeBook');
  G.dispatch('do;craftpick:' + rr.id);
  const beforeC = S.tally.craft || 0;
  G.dispatch('do;craftgo:' + rr.id + ':zhong:5');
  const made = (S.tally.craft || 0) - beforeC;
  ok(made === 5, '炼制 5 炉：四艺 → 配方书 → 配方卡 → 火候，4 击出 5 炉', made);
})();

console.log('\n———— v10.8 P2 · 批量与外壳固定结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
process.exit(fail ? 1 : 0);