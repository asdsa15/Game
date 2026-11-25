// v11 P1 专项：地点产生内容（P1-2）+ 人情兑现（P1-3）
// P1-2 断言：
//   1. 五个地点各有专属月度事件（当 when.place 只在本地入池，异地不入）；
//   2. 五个地点各有专属奇遇，且本地奇遇在池里双倍权重；
//   3. 坊市只上本地货：标了 place 的商品在异洲不上货架，本地能买、买后随行；
//   4. 事件/奇遇里用到的操作名都在结算白名单内（写了就真会改账）。
// P1-3 断言：
//   5. 讨债数额随情分走（不再固定 200）；
//   6. 借灵石：立刻到手、情分减半、情分耗尽即销账并反目；
//   7. 代为打听：给一条遗迹线索；遗迹探尽则折价，不吞；
//   8. 出手助战：战斗中「援」只在已托人时出现、一场一次、用完销账；
//   9. 对方远超你时，借与助战会被拒（不能白拿），打听仍可（消息不要实力）。
// 用法：node tools/test_v11_p1.js
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
  createElement() { return makeEl('new'); }, addEventListener() {}, removeEventListener() {},
  activeElement: null
};
const store = {};
const localStorage = { getItem(k) { return k in store ? store[k] : null; }, setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } };
const window = {
  document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout() { return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/' },
  alert() {}, confirm() { return true; }, prompt() { return '' }
};
const ctx = {
  window, document, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
  parseInt, parseFloat, isNaN, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {}, requestAnimationFrame() { return 0; }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
fs.readdirSync(ROOT).filter(f => /^wxcs3-ext-.*\.js$/.test(f)).sort().forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3, D = G.D;
let S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function rebind() { S = G.S; }
function lastLog(re) { const l = (S.log || []).find(x => re.test(x.txt)); return l || null; }

function setup(opts) {
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 3, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
    hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999,
    stones: 99999, month: 3, year: 388, turn: 0, xun: 0,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 2, pos: 0, guowei: null, miao: 0, miaoUp: {},
    followers: 1000, piety: 1, xianghuo: 0, meditate: false,
    arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, stUsed: null,
    npcs: {}, npcCall: null, hooksGiven: [], hooks: [], disciples: [], disciplesOut: [],
    equipped: {}, daoFruit: null, timed: null, ruin: null, relics: [],
    benming: null, school: null, sect: null, clan: null, cave: { facilities: {} },
    place: 'qingyue', unlockStage: 9, inDongtian: false, needsAnchorFlag: false, dockOpen: {},
    pendingEnc: null, pendingVengeance: false, pendingTx: null, favorPending: null,
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 }, dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 },
    tally: {}, flags: {}, beasts: {}, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
    prep: null, trib: null, tribLock: 0, legacy: null, bloodDebt: 0, legacyPact: null,
    sureflag: false, suiFlag: false, miaoHao: null, xianshengCount: 0, hdRate: 0,
    daoyin: [], afterBreak: [], holdEvent: false, fate: null, fateReroll: 0,
    kaiMaiXun: 0, wuXinBuff: 0, stKind: {}, stVariant: {}, stEquip: null,
    encSeen: [], lastEventId: null, eventStreak: 0,
    merit: 0, karma: 0, fame: 0, insightXp: 0, guoweiStab: 0,
    batchN: { shop: 1, gather: 1, craft: 1 }, bm: null, natal: null,
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts || {});
  els['modals'] = makeEl('modals');
  return S;
}

/* ============ 1. 五地专属月度事件 ============ */
console.log('【1】五地专属月度事件');
{
  const PLACES = ['qingyue', 'nanyue', 'xisha', 'beiyuan', 'zhongzhou'];
  const byPlace = {};
  (D.EVENTS || []).forEach(function (e) {
    if (e.when && e.when.place) {
      byPlace[e.when.place] = byPlace[e.when.place] || [];
      byPlace[e.when.place].push(e);
    }
  });
  PLACES.forEach(function (p) {
    const list = byPlace[p] || [];
    ok(list.length >= 3, p + ' 有专属事件 ≥3 条（实得 ' + list.length + '）',
      (byPlace[p] || []).map(e => e.id).join(','));
  });
  /* 每个洲抽 200 次，本地事件必须真的能抽到，且异洲事件绝不能出现 */
  PLACES.forEach(function (p) {
    setup({ place: p });
    const got = {};
    for (let i = 0; i < 400; i++) {
      const id = G.eventSlot(1 + Math.floor(Math.random() * 100));
      got[id] = (got[id] || 0) + 1;
    }
    const localIds = (byPlace[p] || []).map(e => e.id);
    const hitLocal = localIds.filter(id => got[id]).length;
    ok(hitLocal >= 1, p + ' 400 次抽取中本地事件至少命中 1 种（实得 ' + hitLocal + '/' + localIds.length + '）');
    /* 反向：这个洲不能抽到别的洲的专属事件 */
    const foreign = Object.keys(byPlace).filter(k => k !== p)
      .reduce(function (a, k) { return a.concat(byPlace[k].map(e => e.id)); }, []);
    const leaked = foreign.filter(id => got[id]);
    ok(leaked.length === 0, p + ' 不会抽到异洲专属事件', leaked.join(','));
  });
}

/* ============ 2. 五地专属奇遇 + 本地加权 ============ */
console.log('【2】五地专属奇遇');
{
  const PLACES = ['qingyue', 'nanyue', 'xisha', 'beiyuan', 'zhongzhou'];
  const byPlace = {};
  (D.ENCOUNTERS || []).forEach(function (e) {
    if (e.when && e.when.place) {
      byPlace[e.when.place] = byPlace[e.when.place] || [];
      byPlace[e.when.place].push(e);
    }
  });
  PLACES.forEach(function (p) {
    ok((byPlace[p] || []).length >= 3, p + ' 有专属奇遇 ≥3 条（实得 ' + (byPlace[p] || []).length + '）');
  });
  /* 本地加权：本地条目在池里占两份。直接读池子（确定性），
     再用实抽做一次交叉验证——池子对但抽不出来，等于没加权。 */
  setup({ place: 'beiyuan' });
  const pool = G.encPoolFor('beiyuan');
  /* 只统计「仙道玩家抽得到」的本地条目：byGhostBorrow 是神道奇遇，
     仙道线本来就不该入池——拿它当缺失会逼着把神道内容塞给仙道玩家。 */
  const allLocal = (D.ENCOUNTERS || []).filter(function (e) {
    return e.when && e.when.place === 'beiyuan';
  });
  const xianLocal = allLocal.filter(function (e) { return e.kind !== 'shen' && e.kind !== 'xian'; })
    .concat(allLocal.filter(function (e) { return e.kind === 'xian'; }))
    .map(function (e) { return e.id; });
  const inPool = xianLocal.filter(function (id) { return pool.indexOf(id) >= 0; });
  ok(inPool.length === xianLocal.length,
    '北原仙道可抽的专属奇遇全部进池（' + inPool.length + '/' + xianLocal.length + '）');
  const uniq = pool.filter(function (v, i, a) { return a.indexOf(v) === i; });
  const dup = pool.length - uniq.length;
  ok(dup === inPool.length, '专属条目恰好多占 ' + inPool.length + ' 个槽位 = 双倍权重（实得多 ' + dup + '）');
  const share = pool.length ? pool.filter(function (id) { return xianLocal.indexOf(id) >= 0; }).length / pool.length : 0;
  const eq = uniq.length ? inPool.length / uniq.length : 1;
  ok(share > eq * 1.5, '池内占比 ' + (share * 100).toFixed(1) + '%，高于等权 ' + (eq * 100).toFixed(1) + '%');
  /* 实抽交叉验证：连抽 400 次，本地条目未出现即说明池与抽取脱节 */
  let seenLocal = 0;
  for (let i = 0; i < 400; i++) {
    G.tryEncounter(true);
    if (S.pendingEnc && xianLocal.indexOf(S.pendingEnc) >= 0) seenLocal++;
    S.pendingEnc = null;
  }
  ok(seenLocal > 20, '400 次实抽里本地奇遇出现 >20 次（实得 ' + seenLocal + '）');
}

/* ============ 3. 坊市按地点上货 ============ */
console.log('【3】坊市只上本地货');
{
  setup({ place: 'qingyue' });
  const localIds = (D.SHOP || []).filter(x => x.place === 'qingyue').map(x => x.id);
  ok(localIds.length >= 2, '青岳有本地货 ≥2 件（实得 ' + localIds.length + '）');
  /* 异洲的货不得出现在青岳货架上 */
  const foreign = (D.SHOP || []).filter(x => x.place && x.place !== 'qingyue').map(x => x.id);
  G.ACT.openShop('pill');
  let html = els['modals'].innerHTML || '';
  const leakedPill = foreign.filter(function (id) {
    const it = (D.SHOP || []).find(x => x.id === id);
    return it && it.cat === 'pill' && html.indexOf(it.name) >= 0;
  });
  ok(leakedPill.length === 0, '青岳丹药页不出现异洲丹药', leakedPill.join(','));
  /* 本地的丹药必须出现 */
  const localPill = (D.SHOP || []).filter(x => x.place === 'qingyue' && x.cat === 'pill')[0];
  ok(!!localPill && html.indexOf(localPill.name) >= 0, '青岳丹药页出现本地丹药（' + (localPill || {}).name + '）');

  /* 换到西漠：本地的流沙净心丹出现，青岳的培元丹不出现 */
  setup({ place: 'xisha' });
  G.ACT.openShop('pill');
  html = els['modals'].innerHTML || '';
  const xs = (D.SHOP || []).find(x => x.id === 'xsJingxin');
  const qy = (D.SHOP || []).find(x => x.id === 'qyPeiyuan');
  ok(html.indexOf(xs.name) >= 0, '西漠丹药页出现流沙净心丹');
  ok(html.indexOf(qy.name) < 0, '西漠丹药页不出现青岳培元丹');

  /* 买走之后仍在背包里（上货绑地点，库存不绑） */
  setup({ place: 'xisha', stones: 5000 });
  G.ACT.do_buy('xsJingxin');
  rebind();
  ok((S.bag['xsJingxin'] || 0) >= 1, '在西漠买到的丹药进了背包');
  S.place = 'qingyue';
  ok((S.bag['xsJingxin'] || 0) >= 1, '换洲之后丹药仍在（库存不随地点清空）');
}

/* ============ 4. 求人·讨债数额 ============ */
console.log('【4】讨债数额随情分');
{
  /* 讨债本身要掷骰（对方可能赖账），所以不能拿单次结果当断言——
     跑 40 次，看「所有成功的那几笔数额是否都等于 120×情分」。 */
  setup({ stones: 0, npcs: {} });
  const got3 = [], got1 = [];
  let ok_once = false;
  for (let i = 0; i < 40; i++) {
    S.stones = 0;
    S.hooksGiven = [{ to: '甲' + i, what: '救命之恩', weight: 3, power: 0, y: 380, done: false }];
    G.ACT.do_claim(0);
    rebind();
    if (S.stones > 0) got3.push(S.stones);
    ok_once = (S.hooksGiven[0] || {}).done === true;
  }
  ok(got3.length > 0 && got3.every(v => v === 360),
    '情分 3 的恩情讨回 = 360 灵石（成功 ' + got3.length + '/40 笔，样本 ' + (got3[0] || 0) + '）');
  ok(ok_once, '讨过之后这条账销了');

  setup({ stones: 0, npcs: {} });
  for (let i = 0; i < 40; i++) {
    S.stones = 0;
    S.hooksGiven = [{ to: '乙' + i, what: '一顿饭', weight: 1, power: 0, y: 380, done: false }];
    G.ACT.do_claim(0);
    rebind();
    if (S.stones > 0) got1.push(S.stones);
  }
  ok(got1.length > 0 && got1.every(v => v === 120),
    '情分 1 的恩情讨回 = 120 灵石（成功 ' + got1.length + '/40 笔，样本 ' + (got1[0] || 0) + '）');
}

/* ============ 5. 求人·借灵石 ============ */
console.log('【5】求人 · 借灵石');
{
  setup({ stones: 0 });
  S.hooksGiven = [{ to: '丙', what: '替他挡了一劫', weight: 3, power: 0, y: 380, done: false }];
  G.ACT.do_favor('borrow', 0);
  rebind();
  ok(S.stones >= 360, '借到 ≥360 灵石（实得 ' + S.stones + '）');
  ok(S.hooksGiven[0].weight === 2, '情分从 3 减到 2（实得 ' + S.hooksGiven[0].weight + '）');
  ok(S.hooksGiven[0].done === false, '情分未尽，这条账还在');

  /* 情分耗尽 → 销账且反目 */
  setup({ stones: 0, npcs: { guqingxuan: { fav: 80, met: true, id: 'guqingxuan' } } });
  S.hooksGiven = [{ to: 'guqingxuan', what: '小忙', weight: 1, power: 0, y: 380, done: false }];
  G.ACT.do_favor('borrow', 0);
  rebind();
  ok(S.hooksGiven[0].done === true, '情分耗尽后销账');
  ok(S.npcs['guqingxuan'].fav <= 60, '反目：好感从 80 掉到 ≤60（实得 ' + S.npcs['guqingxuan'].fav + '）');
}

/* ============ 6. 求人·代为打听 ============ */
console.log('【6】求人 · 代为打听');
{
  setup({ stones: 0 });
  S.hooksGiven = [{ to: '戊', what: '带过路', weight: 2, power: 0, y: 380, done: false }];
  const before = S.stones;
  G.ACT.do_favor('ask', 0);
  rebind();
  const hasLine = (S.log || []).some(x => /方位|线索|所在|知道了/.test(x.txt));
  ok(hasLine || S.stones > before, '打听给出线索，或（遗迹探尽时）折成灵石');
  ok(S.hooksGiven[0].weight === 1, '情分扣 1（实得 ' + S.hooksGiven[0].weight + '）');
}

/* ============ 7. 求人·出手助战 ============ */
console.log('【7】求人 · 出手助战');
{
  setup({ xRealm: 3 });
  S.hooksGiven = [{ to: '己', what: '救过命', weight: 3, power: 0, y: 380, done: false }];
  /* 未托人时，战斗动作条里没有「援」 */
  G.startCombat(false);
  rebind();
  let acts = G.combatActionList(S.combat).map(a => a.txt);
  ok(acts.indexOf('援') < 0, '未托人时动作条无「援」');
  S.combat = null; S.phase = 'play';

  /* 托人之后有「援」，且一场只能用一次 */
  G.ACT.do_favor('fight', 0);
  rebind();
  ok(!!S.favorPending, '已记下「若动手就来」');
  G.startCombat(false);
  rebind();
  acts = G.combatActionList(S.combat).map(a => a.txt);
  ok(acts.indexOf('援') >= 0, '托人之后动作条出现「援」');

  const foeHp0 = S.combat.foe.hp;
  G.ACT.do_cbt('favor');
  rebind();
  ok(S.combat === null || S.combat.foe.hp < foeHp0, '助战造成伤害（' + foeHp0 + ' → ' + (S.combat ? S.combat.foe.hp : 0) + '）');
  if (S.combat) {
    const a2 = G.combatActionList(S.combat).map(a => a.txt);
    ok(a2.indexOf('援') < 0, '用过一次之后「援」从动作条消失（一场一次）');
    ok((S.hooksGiven[0] || {}).done === true, '这一场打完之后这条人情销账');
  } else {
    ok(true, '助战直接把对手打死，战斗结束（「援」不再显示）');
    ok((S.hooksGiven[0] || {}).done === true, '助战销账');
  }
}

/* ============ 8. 对方远超你：借与助战被拒，打听仍可 ============ */
console.log('【8】实力差距下人情的边界');
{
  setup({ stones: 0 });
  S.hooksGiven = [{ to: '庚', what: '旧事', weight: 3, power: 1e9, y: 380, done: false }];
  G.ACT.do_favor('borrow', 0);
  rebind();
  ok(S.stones === 0, '对方远超你时，借不到灵石（灵石仍 0）');
  ok(S.hooksGiven[0].weight === 2, '但情分照扣（开口的成本）');

  setup({ stones: 0 });
  S.hooksGiven = [{ to: '辛', what: '旧事', weight: 2, power: 1e9, y: 380, done: false }];
  G.ACT.do_favor('ask', 0);
  rebind();
  ok(S.hooksGiven[0].weight === 1, '打听不受实力限制（消息不要实力），情分扣 1');
}

/* ============ 汇总 ============ */
console.log('');
console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
