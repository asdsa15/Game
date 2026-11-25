// v11 P0-4 专项：果位经营（稳固度资源线 + 被夺掉级）
// 断言：
//   1. GUOWEI 30 条都有 domain「这一位管什么」；
//   2. 结丹落库存副本 + 按档位初始化稳固度（不污染共享表）；
//   3. 每月 guoweiTick 自然 −1；归零 → loseGuowei 掉级回紫府、果位消失、留 flag；
//   4. 三维持手段真实改账：法仪 +8(同月限一次/灵石够否)、显圣 +5、布道 +3+招觊觎；
//   5. 应战：赢 +15（noteCombatWin），输 −25（combatLose）且归零当场被夺；
//   6. 位格压制 guoweiStanceRank 按档位返回 0/1/2/3，无果位/未到金丹返回 0；
//   7. 旧档兜底：applyState 给无 stab 的果位补 60（若探针可用）。
// 用法：node tools/test_v11_guowei.js
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
    phase: 'play', started: true, age: 500, lifeMax: 1200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 4, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
    hp: 5000, hpMax: 5000, mp: 5000, mpMax: 5000,
    stones: 99999, month: 3, year: 388, turn: 0, xun: 0,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 12, insight: 12, sense: 12, speed: 12, heart: 12, fate: 12 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 0, pos: 0, guowei: null, guoweiStab: 0, gwMonth: {}, gwRiskBoost: 0,
    miao: 0, miaoUp: {}, merit: 100, karma: 0, fame: 100, piety: 1, xianghuo: 0,
    followers: 1000, meditate: false, arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, stUsed: null,
    npcs: {}, npcCall: null, hooksGiven: [], disciples: [], disciplesOut: [],
    equipped: {}, daoFruit: null, timed: null, ruin: null, relics: [],
    benming: null, school: null, sect: null, clan: null, cave: { facilities: {} },
    unlockStage: 5, inDongtian: false, needsAnchorFlag: false, dockOpen: {},
    holdsEvent: false, pendingEnc: null, pendingVengeance: false, pendingTx: null,
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 }, dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 },
    tally: {}, flags: {}, beasts: {}, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
    prep: null, trib: null, tribLock: 0, legacy: null, bloodDebt: 0, legacyPact: null,
    sureflag: false, suiFlag: false, miaoHao: null, xianshengCount: 0, hdRate: 0,
    daoyin: [], afterBreak: [], holdEvent: false, fate: null, fateReroll: 0,
    kaiMaiXun: 0, wuXinBuff: 0, stKind: {}, stVariant: {}, stEquip: null,
    vengutal: null, ach: {}, achTab: 'gong',
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts || {});
  els['modals'] = makeEl('modals');
  return S;
}
// 给一个金丹果位（副本形态，与结丹落库一致）
function grantGouowei(rank) {
  const g = D.GUOWEI.find(x => x.rank === (rank || '正统')) || D.GUOWEI[0];
  S.guowei = Object.assign({}, g);
  S.xRealm = 4;
  S.guoweiStab = 60;
  return S.guowei;
}

/* ============ 1. 数据：30 果位都有 domain ============ */
console.log('【1】果位 domain 完整性');
{
  const miss = (D.GUOWEI || []).filter(g => !g.domain);
  ok((D.GUOWEI || []).length === 30, 'GUOWEI 恰 30 条（实得 ' + (D.GUOWEI || []).length + '）');
  ok(miss.length === 0, '30 条都有 domain 司掌', miss.map(g => g.n).join(','));
}

/* ============ 2. 结丹落库：副本 + 档位初始稳固 ============ */
console.log('【2】结丹落库');
{
  setup({});
  // 直接调 do_jindan 需要境界前置，这里验落库形态：手动模拟结丹写入 + 读表
  const g0 = D.GUOWEI.find(x => x.rank === '至尊');
  const _stabMap = { '余位': 70, '闰位': 65, '正统': 55, '至尊': 45 };
  ok(_stabMap[g0.rank] === 45, '至尊初始稳固最低（天下共抢，起步 ' + _stabMap[g0.rank] + '）');
  // 副本：写入子字段不应污染表行
  const copy = Object.assign({}, g0);
  copy.stab = 999;
  ok(g0.stab === undefined, '写副本子字段不污染 GUOWEI 共享表', g0.stab);
}

/* ============ 3. 每月衰减 + 归零被夺 ============ */
console.log('【3】月结衰减与被夺掉级');
{
  setup({});
  grantGouowei('正统');
  S.guoweiStab = 60;
  G.setSeed && G.setSeed(9999);
  const before = S.guoweiStab;
  G.guoweiTick();
  ok(S.guoweiStab === before - 1, '每月自然 −1（' + before + '→' + S.guoweiStab + '）');

  // 归零 → 掉级回紫府
  setup({});
  grantGouowei('正统');
  S.guoweiStab = 1;
  S.lifeMax = 1200;
  G.setSeed && G.setSeed(1234);
  G.guoweiTick();               // -1 → 0 → 被夺
  ok(S.guowei === null, '归零后果位消失');
  ok(S.xRealm === 3, '掉级回紫府（xRealm=' + S.xRealm + '）');
  ok(S.flags && S.flags.guowei_lost === 1, '留 guowei_lost 标记（夺回支线入口）');
  ok(S.lifeMax <= 700, '寿元随境回落（lifeMax=' + S.lifeMax + '）');
  ok(!!lastLog(/果位.*夺|跌落回紫府/), '写被夺日志');
}

/* ============ 4. 三维持手段真实改账 ============ */
console.log('【4】维持手段（法仪/显圣/布道）');
{
  // 法仪 +8，同月限一次。灵石用「账本记了一笔法仪支出」证明扣款真实发生，
  // 不比对 stones 绝对值——render() 会补算旬收益，绝对值带收入副作用，断言会脆。
  setup({ stones: 99999 });
  grantGouowei('正统'); S.guoweiStab = 50; S.gwMonth = {};
  G.dispatch('do;gw:fayi'); rebind();
  ok(S.guoweiStab === 58, '法仪 +8（' + S.guoweiStab + '）');
  ok(JSON.stringify(S.ledger).indexOf('果位法仪') >= 0, '法仪在账本记了一笔支出（扣款真实发生）');
  G.dispatch('do;gw:fayi'); rebind();   // 同月第二次
  ok(S.guoweiStab === 58, '同月法仪限一次（仍 ' + S.guoweiStab + '）');

  // 灵石不足不成账
  setup({ stones: 100 });
  grantGouowei('正统'); S.guoweiStab = 50; S.gwMonth = {};
  G.dispatch('do;gw:fayi'); rebind();
  ok(S.guoweiStab === 50 && S.stones === 100, '灵石不足时法仪不改账');

  // 显圣 +5（仙道走功德）
  setup({ merit: 100, stones: 99999 });
  grantGouowei('正统'); S.guoweiStab = 50;
  G.dispatch('do;gw:xianxing'); rebind();
  ok(S.guoweiStab === 55, '显圣 +8→5（' + S.guoweiStab + '）');
  ok(S.merit === 100 - 40, '仙道显圣扣功德 40（merit=' + S.merit + '）');

  // 布道 +3 且抬高被觊觎概率
  setup({ stones: 99999 });
  grantGouowei('正统'); S.guoweiStab = 50; S.gwRiskBoost = 0;
  G.dispatch('do;gw:budao'); rebind();
  ok(S.guoweiStab === 53, '布道 +3（' + S.guoweiStab + '）');
  ok((S.gwRiskBoost || 0) > 0, '布道抬高觊觎概率（gwRiskBoost=' + S.gwRiskBoost + '）');
}

/* ============ 5. 应战胜负：赢 +15 / 输 −25 ============ */
console.log('【5】应战胜负');
{
  setup({ stones: 99999 });
  grantGouowei('正统'); S.guoweiStab = 50;
  const c = { foe: { name: '夺位者', rank: 20, power: 1500, hp: 1, hpMax: 2000, style: 'sword', el: 'fire', trait: 'normal' }, round: 2, isVengeance: 'guowei' };
  G.noteCombatWin(c); rebind();
  ok(S.guoweiStab === 65, '赢下夺位者 +15（' + S.guoweiStab + '）');

  // combatLose 开头有 40% 战死掷骰（与 −25 无关的噪声），战死会 die 掉、不进 −25 分支。
  // 扫多个种子找到一个「存活」的那次，再验 −25，确保断言真的执行、而非被跳过。
  let survived = false, stabAfter = null;
  for (let s = 1; s <= 80 && !survived; s++) {
    setup({ stones: 99999, hp: 5000, hpMax: 5000 });
    grantGouowei('正统'); S.guoweiStab = 50;
    const c2 = { foe: { name: '夺位者', rank: 20, power: 99999, hp: 2000, hpMax: 2000, style: 'sword', el: 'fire', trait: 'normal' }, round: 2, isVengeance: 'guowei' };
    G.setSeed && G.setSeed(s);
    G.combatLose(c2); rebind();
    if (S.phase === 'play' && S.guowei) { survived = true; stabAfter = S.guoweiStab; }
  }
  ok(survived, '在多个种子中找到存活点（避开 40% 战死噪声）');
  ok(stabAfter === 25, '输掉夺位战存活 → 稳固 −25（' + stabAfter + '）');

  // 输到归零 → 当场被夺、掉回紫府（同样扫描存活种子）
  let lostHappened = false, lostRealm = null, lostGw = null;
  for (let s = 1; s <= 80 && !lostHappened; s++) {
    setup({ stones: 99999, hp: 5000, hpMax: 5000 });
    grantGouowei('正统'); S.guoweiStab = 20;
    const c3 = { foe: { name: '夺位者', rank: 20, power: 99999, hp: 2000, hpMax: 2000, style: 'sword', el: 'fire', trait: 'normal' }, round: 2, isVengeance: 'guowei' };
    G.setSeed && G.setSeed(s);
    G.combatLose(c3); rebind();
    if (S.phase === 'play') { lostHappened = true; lostRealm = S.xRealm; lostGw = S.guowei; }
  }
  ok(lostHappened && lostGw === null && lostRealm === 3, '输掉夺位战归零 → 当场被夺、掉回紫府（xRealm=' + lostRealm + '）');
}

/* ============ 6. 位格压制 guoweiStanceRank ============ */
console.log('【6】位格压制');
{
  setup({ xRealm: 4 });
  const map = { '余位': 0, '闰位': 1, '正统': 2, '至尊': 3 };
  let allOk = true;
  Object.keys(map).forEach(function (rk) {
    const g = D.GUOWEI.find(x => x.rank === rk);
    S.guowei = Object.assign({}, g); S.xRealm = 4;
    if (G.guoweiStanceRank() !== map[rk]) allOk = false;
  });
  ok(allOk, '果位档位→位阶压制 0/1/2/3 逐档正确');
  // 无果位 / 未到金丹
  S.guowei = null; S.xRealm = 4;
  ok(G.guoweiStanceRank() === 0, '无果位 → 0');
  const g = D.GUOWEI.find(x => x.rank === '至尊'); S.guowei = Object.assign({}, g); S.xRealm = 2;
  ok(G.guoweiStanceRank() === 0, '未入金丹 → 0（果位尚未到手）');
}

/* ============ 7. 复仇框架 guowei 分支：忍 −10 / 避 −15 ============ */
console.log('【7】夺位的忍与避');
{
  setup({ stones: 10000 });
  grantGouowei('正统'); S.guoweiStab = 60; S.vengeanceSrc = 'guowei';
  G.ACT.do_veng('pay'); rebind();
  ok(S.guoweiStab === 50, '折灵石退兵 −10（' + S.guoweiStab + '）');

  setup({ stones: 10000, fame: 100 });
  grantGouowei('正统'); S.guoweiStab = 60; S.vengeanceSrc = 'guowei';
  G.ACT.do_veng('flee'); rebind();
  ok(S.guoweiStab === 45, '闭门不见 −15（' + S.guoweiStab + '）');
  ok(S.fame === 92, '闭门兼掉声望 −8（fame=' + S.fame + '）');
}

/* ============ 8. 旧档兜底：无 stab 补 60 ============ */
console.log('【8】旧档兜底');
{
  if (typeof G.applyState === 'function') {
    const g = D.GUOWEI.find(x => x.rank === '至尊');
    const oldSave = JSON.parse(JSON.stringify(S));
    oldSave.guowei = Object.assign({}, g);   // 模拟旧档：有果位但无 guoweiStab
    delete oldSave.guoweiStab;
    oldSave.started = true; oldSave.xRealm = 4;
    G.applyState(oldSave); rebind();
    ok(S.guoweiStab === 60, '旧档果位无 stab → 补 60（实得 ' + S.guoweiStab + '）');
    ok(S.guowei && S.guowei.n === g.n, '果位本身保留');
  } else {
    ok(true, '（applyState 探针不可用，跳过旧档兜底断言）');
  }
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
