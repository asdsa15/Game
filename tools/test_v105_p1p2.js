// v10.5 P1/P2：机制与口径回归
// 覆盖 C4/C5/C6 的数值出口、E4 限件、E8 行情双向、M1/M2 四艺、
// A3~A6 能力三分文案、N1/N2 神通入口、E10 账本、S2 hpRatio、C7/C8 可见性。
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
    lingqi: 1, lingqiUp: 1, place: 'qingyue', bag: {}, bagMat: {}, arts: [], disks: [],
    craftedQ: {}, npcs: {}, sect: null, cave: { facilities: {} }, combat: null, preBuff: null,
    talismans: {}, skillsKnown: [], skillsEquip: ['zhiquan'], shenTong: [], stKind: {},
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    market: { mul: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 }, buy: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 }, month: 0 },
    sellMonth: { market: 0 }, sellCh: 'market',
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },
    lu: null, luHistory: [], root: 'true_', rootEls: ['jin'], pillar: 0, pos: 0,
    followers: 0, xianghuo: 0, piety: 1, miao: '野祀', miaoUp: {},
    gainQueue: [], relics: [], tally: G.tallyInit(), learnedArts: [], learnedRecipes: [],
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0 }, craftLv: { dan: 1, qi: 1, fu: 1, zhen: 1 }
  });
  if (opts) Object.assign(S, opts);
  return S;
}

console.log('=== 1. 固定值百分比化（C4） ===');
setup({ hpMax: 1200, hp: 100, mpMax: 1200, mp: 100 });
ok(G.pillHealOf({ v: 50 }, 'hp') === 96, '高境界回春丹取上限 8%（96）', G.pillHealOf({ v: 50 }, 'hp'));
ok(G.pillHealOf({ v: 50 }, 'hp') > 50, '不再被固定 50 稀释');
setup({ hpMax: 100, hp: 10, mpMax: 100 });
ok(G.pillHealOf({ v: 50 }, 'hp') === 50, '低境界仍以固定值为下限（50）');
setup({ mpMax: 1000 });
ok(G.skillCostOf({ cost: 20 }) === 50, '术法耗灵兜底到上限 5%（50）', G.skillCostOf({ cost: 20 }));
ok(G.skillCostOf({ cost: 0 }) === 0, '免消耗术法仍为 0');
setup({ mpMax: 1000 });
ok(G.shenTongCostOf({ cost: 45, costBase: 45 }) === 80, '神通耗灵兜底到上限 8%（80）', G.shenTongCostOf({ cost: 45, costBase: 45 }));
ok(G.shenTongCostOf({ cost: 55, costBase: 45 }) === 90, '道统气质加的 10 灵不被百分比抹平（90）', G.shenTongCostOf({ cost: 55, costBase: 45 }));
setup({ hpMax: 1200, hp: 0 });
G.applyPill({ id: 'pillHp', type: 'hp', v: 50 });
rebind();
ok(S.hp === 96, 'applyPill 实际回血 96，不是 50', S.hp);

console.log('=== 2. 死亡螺旋与位格表（C5/C6） ===');
const gm = G.gapMul;
ok(gm(2).out === 0.15 && gm(2).inc === 1.6, '越两档：出手 0.15 / 挨打 1.6');
ok(gm(1).out === 0.45 && gm(1).inc === 1.6, '越一档：出手 0.45 / 挨打 1.6');
ok(gm(0).out === 1 && gm(0).inc === 1, '同档 1.00 / 1.00');
ok(gm(-1).out === 1.3 && gm(-1).inc === 0.35, '被越一档：出手 1.3 / 挨打 0.35');
setup({ hpMax: 1000, hp: 100 });
const lowPow = G.hpRatio();
ok(Math.abs(lowPow - 0.1) < 1e-9, 'hpRatio 直接读当前比值', lowPow);
ok(G.ACT && typeof G.ACT.do_cbt === 'function', '战斗入口仍在');

console.log('=== 3. 坊市限件（E4） ===');
setup({ sellCh: 'market', stones: 0, bagMat: { buqiCao: 3 }, sellMonth: { market: 4 } });
G.ACT.do_sellmat('buqiCao');
rebind();
ok(S.stones > 0 && S.sellMonth.market === 5, '第 5 件卖出并计数 5/5', S.stones + '/' + S.sellMonth.market);
const stAfter = S.stones;
G.ACT.do_sellmat('buqiCao');
rebind();
ok(S.stones === stAfter && S.sellMonth.market === 5, '第 6 件被挡下，货物不被扣');
ok(G.marketLimit() === 5, '散修摊位上限 5');
setup({ sect: { rank: 2, contrib: 0 }, sellMonth: { market: 0 } });
ok(G.marketLimit() === 7, '内门摊位上限 7（5+rank）');
setup({ sellMonth: { market: 3 } });
G.advanceMonth(1);
rebind();
ok(S.sellMonth.market === 0, '跨月重置摊位计数');

console.log('=== 4. 行情双向与无套利（E8） ===');
setup({ sellCh: 'black' });
let guard = true, guardName = '';
D.SHOP.forEach(function (it) {
  const buy = G.buyPriceOf(it);
  const sell = G.sellPriceOf(it.price, 1);
  if (!(buy > sell)) { guard = false; guardName = it.name + ' ' + buy + '/' + sell; }
});
ok(guard, '全商品：最低买入价 > 黑市最高回收', guardName);
setup({ market: { mul: { dan: 1 }, buy: { dan: 1.25 }, month: 0 }, stones: 1000 });
const hp = D.SHOP.find(function (x) { return x.id === 'pillHp'; });
ok(G.buyPriceOf(hp) === 63, '买入行情 +25%：回春丹 50 → 63', G.buyPriceOf(hp));
G.ACT.do_buy('pillHp');
rebind();
ok(S.stones === 937, '扣款按显示价 63（余 937）', S.stones);
ok((S.ledger.expense || []).some(function (x) { return x.amount === 63 && x.label.indexOf('回春丹') >= 0; }),
  '买入同时进账本');
setup({ sellCh: 'market', stones: 0, bagMat: { buqiCao: 1 }, market: { mul: { mat: 1.5 }, buy: {}, month: 0 } });
G.ACT.do_sellmat('buqiCao');
rebind();
ok(S.stones === 54, '材料也吃行情：60×0.6×1.5 = 54', S.stones);

console.log('=== 5. 四艺毛利（M2） ===');
const recHui = D.RECIPES.find(function (r) { return r.id === 'dan_huichun'; });
setup();
const cCost = 200, cVal = G.craftedValueOf(recHui);
ok(cVal === Math.round(cCost * 1.55), '自制品底价取材料成本 ×1.55（310）', cVal);
setup({ stones: 0, sellCh: 'market', bag: { pillHp: 1 }, craftedQ: { pillHp: [{ q: 'zhong', n: 1 }] } });
G.ACT.do_sellitem('dan', 'pillHp', 'zhong');
rebind();
ok(S.stones === Math.round(cVal * 0.6), '自制回春丹坊市回收 186（成本 200，亏 7%）', S.stones);
setup({ stones: 0, sellCh: 'market', bag: { pillHp: 1 }, craftedQ: {} });
G.ACT.do_sellitem('dan', 'pillHp', 'zhong');
rebind();
ok(S.stones === 30, '坊市买来的回春丹仍按表价回收 30（无套利）', S.stones);
setup({ sect: { rank: 1, contrib: 0 }, bag: { pillHp: 3 } });
G.ACT.do_sectdeal('dan');
rebind();
ok(S.sect.contrib === 108, '交成品换贡献上浮两成（90→108）', S.sect.contrib);
setup({ stones: 0, sellCh: 'sect', sect: { rank: 1, contrib: 0 }, bag: { pillHp: 1 }, sellMonth: { market: 0 } });
G.ACT.do_selldan('pillHp');
rebind();
ok(S.stones === 24 && S.sect.contrib === 5, '宗门收购 0.8×：24 石 + 5 贡献', S.stones + '/' + S.sect.contrib);

console.log('=== 6. 能力三分文案与入口（A3~A6） ===');
setup({ sect: { rank: 3, contrib: 100000 }, shenTong: ['郁仪文'] });
G.ACT.openSectLib();
let html = els['modals'].innerHTML;
ok(html.indexOf('修炼功法') >= 0 && html.indexOf('术法') >= 0, '藏经阁拆成修炼功法 / 术法');
ok(html.indexOf('神通（只列来源）') >= 0, '神通只列来源');
ok(html.indexOf('杀伐神通') < 0, '藏经阁不再用「杀伐神通」混称');
setup({ stones: 10000 });
G.ACT.openShop('fa');
html = els['modals'].innerHTML;
ok(html.indexOf('术法') >= 0, '坊市有独立「术法」页');
const wai = D.SKILLS.find(function (s) { return s.lvl === 'wai' && s.id !== 'zhiquan'; });
G.ACT.do_buyfa(wai.id);
rebind();
ok(S.skillsKnown.indexOf(wai.id) >= 0, '灵石可直接买入术法');
ok(S.stones === 10000 - Math.round(D.SKILL_PRICE.wai * 1.2), '术法价 = 贡献价 ×1.2（144）', S.stones);
setup();
G.ACT.openGongfa();
html = els['modals'].innerHTML;
ok(html.indexOf('修炼功法（道基）') >= 0, '道基面板标题改为「修炼功法（道基）」');
ok(html.indexOf('术法 · 装配') >= 0, '道基面板提供「术法 · 装配」入口');
setup({
  skillsKnown: ['xuezhai'], shenTong: ['郁仪文'], stEquip: ['郁仪文'],
  combat: { foe: { name: '散修', rank: 1, power: 20, hp: 80, hpMax: 100, trait: 'normal', el: 'fire' },
    round: 1, observed: false, defending: false, stUsed: {} }
});
G.ACT.openSkills();
html = els['modals'].innerHTML;
ok(html.indexOf('术法　装配') >= 0, '交手菜单把 SKILLS 叫「术法」');
ok(html.indexOf('0.26') >= 0, '神通面板写清 0.26 的结算口径');
ok(html.indexOf('术法与神通') >= 0, '菜单标题统一为「术法与神通」');

console.log('=== 7. 神通入口配置化（N1/N2） ===');
setup({ xRealm: 2, shenTong: [], xianji: '黄基' });
ok(G.canGrantShenTong('stage') === false, '筑基期：有额度但 fromRealm=3，入口不开');
setup({ xRealm: 3, shenTong: [], xianji: '黄基' });
ok(G.canGrantShenTong('stage') === true, '紫府：入口开放');
setup({ xRealm: 3, shenTong: ['a', 'b', 'c', 'd', 'e'], xianji: '黄基' });
ok(G.canGrantShenTong('stage') === false, '额度已满时不再授予');
ok(D.SHENTONG_GRANT.xian.fromRealm === 3, '节奏配置可单点调整（当前紫府起）');

console.log('=== 8. 账本明细与 hpRatio（E10/S2） ===');
setup({ stones: 777 });
S.ledger = {
  income: [{ label: '甲', amount: 1 }, { label: '乙', amount: 2 }, { label: '丙', amount: 3 },
    { label: '丁', amount: 4 }, { label: '戊', amount: 5 }, { label: '己', amount: 6 }],
  expense: [{ label: '庚', amount: 7 }, { label: '辛', amount: 8 }]
};
G.ACT.openLedger();
html = els['modals'].innerHTML;
ok(html.indexOf('甲') >= 0 && html.indexOf('己') >= 0, '账本面板列出全部收入（6 条）');
ok(html.indexOf('庚') >= 0 && html.indexOf('辛') >= 0, '账本面板列出全部支出（2 条）');
ok(html.indexOf('21') >= 0 && html.indexOf('净入') >= 0, '账本给出收入 21 / 支出 15 / 净入 6');
setup({ hpMax: 0, hp: 10 });
ok(G.hpRatio() === 0 && !isNaN(G.hpRatio()), '上限为 0 时 hpRatio 返回 0，不出 NaN');
setup({ hpMax: 0, hp: 10 });
const kill = G.ACT.do_sellmat;
ok(typeof kill === 'function', '上限异常时机制调用链仍存在');

console.log('=== 9. 状态可见性（C7/C8） ===');
setup({
  hp: 100, hpMax: 100, mp: 100, mpMax: 100,
  combat: { foe: { name: '散修', rank: 1, power: 20, hp: 80, hpMax: 100, trait: 'normal', el: 'fire' },
    round: 1, observed: false, defending: false, foeBurn: 2, foeBurnMul: 0.5, burnFresh: true, momentum: 0 }
});
html = G.renderCombat() || '';
ok(html.indexOf('余焰将起') >= 0, '点火当回合显示「余焰将起」，不让人以为没生效');
S.combat.burnFresh = false;
html = G.renderCombat() || '';
ok(html.indexOf('灼烧 · 每回合') >= 0, '进入结算后显示「灼烧 · 每回合」');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);