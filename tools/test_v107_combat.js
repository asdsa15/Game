// v10.7 第三阶段专项：战斗决策层（批次 C）
// 目的：
//   1. 术法结构化效果走真实 skill UI 路径兑现（灼烧/压制/中毒/破甲/守势/打断/硬控）；
//   2. 状态四入口：同名刷新不叠层、不同来源取最高、DoT 致死走胜利出口、控制日志齐全；
//   3. 敌方四路数意图：展示与执行一致、读档不重摇、蓄力跨回合可打断、定神防连控；
//   4. 调息回灵准确、敌方仍行动、灵力不超上限；
//   5. 雷火引爆余焰、破甲增伤、护体先破防再爆发。
// 用法：node tools/test_v107_combat.js
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
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort().forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
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
function lastLog(re) {
  const l = (S.log || []).find(function (x) { return re.test(x.txt); });
  return l ? l.txt : '';
}

function setup(opts) {
  opts = opts || {};
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 2, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
    hp: 1000, hpMax: 1000, mp: 500, mpMax: 1000,
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
    holdsEvent: false, pendingEnc: null, pendingVengeance: false, pendingTx: null,
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 }, dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 },
    tally: {}, flags: {}, beasts: {}, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
    prep: null, trib: null, tribLock: 0, legacy: null, bloodDebt: 0, legacyPact: null,
    sureflag: false, suiFlag: false, miaoHao: null, xianshengCount: 0, hdRate: 0,
    daoyin: [], afterBreak: [], holdEvent: false, fate: null, fateReroll: 0,
    kaiMaiXun: 0, wuXinBuff: 0,
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  els['modals'] = makeEl('modals');
  return S;
}

/* 造一场可控战斗：敌人高血（不会一击死）、指定路数、首意图固定。
   走真实 startCombat 后覆写 foe 字段，保留意图系统初始化。 */
function mkCombat(style, foeHp) {
  G.setSeed(4242);
  G.startCombat(false);
  rebind();
  const c = S.combat;
  c.foe.style = style || 'sword';
  c.foe.hp = foeHp || 5000;
  c.foe.hpMax = foeHp || 5000;
  c.foe.power = 300;
  c.foe.rank = 8;
  c.foe.trait = 'normal';
  c.foe.el = 'fire';
  c.foeIntent = G.pickFoeIntent(c);
  return c;
}
/* 装配并习得指定术法，走真实 openSkills → do;cbt:skill 路径 */
function equipSkill(id) {
  const sk = D.SKILLS.find(function (x) { return x.id === id; });
  if (S.skillsKnown.indexOf(id) < 0) S.skillsKnown.push(id);
  if (S.skillsEquip.indexOf(id) < 0) S.skillsEquip.push(id);
  return sk;
}
function castSkill(id) {
  const sk = equipSkill(id);
  G.ACT.openSkills();
  G.dispatch('do;cbt:skill:' + encodeURIComponent(sk.name));
  rebind();
}

/* ============================================================
   一、术法结构化效果（真实 skill 路径）
   ============================================================ */
console.log('=== 1. 术法结构化效果 ===');
/* 注：玩家施加状态后敌方立即行动并回合末递减一次。
   灼烧/中毒在 foeStart 结算（burnFresh/poisonFresh 保护当回合），foeBurn/foePoison 不在 roundEnd 递减；
   压制/破甲/迟滞在 roundEnd 递减，记 turns+1 → 递减后面板显示 turns。
   断言以「完整一回合后」的字段值为准。 */
setup();
let c = mkCombat('sword', 5000);
S.mp = 500;
castSkill('liehuo');   // 焚山掌：伤害 + 灼烧 2 回合
ok(c.foeBurn === 2, '焚山掌：灼烧 2 回合（foeStart 递减，burnFresh 保护当回合）', c.foeBurn);
ok(lastLog(/灼烧 2 回合/) !== '', '焚山掌：灼烧日志');
ok(c.foe.hp < 5000, '焚山掌：有直接伤害');

setup(); c = mkCombat('sword', 5000); S.mp = 500;
castSkill('mumin');    // 缠木根：压制 1 回合（记 2，回合末递减后剩 1）
ok(c.foeWeaken === 1, '缠木根：压制 1 回合（回合末递减后）', c.foeWeaken);
ok(lastLog(/压制/) !== '', '缠木根：压制日志');

setup(); c = mkCombat('sword', 5000); S.mp = 500;
castSkill('dugu');     // 毒火丝：中毒 3 回合（poisonFresh 保护当回合，foeStart 递减）
ok(c.foePoison === 3, '毒火丝：中毒 3 回合', c.foePoison);
ok(c.foePoisonPct > 0, '毒火丝：中毒伤害系数已设');
ok(lastLog(/中毒 3 回合/) !== '', '毒火丝：中毒日志');

setup(); c = mkCombat('sword', 5000); S.mp = 500;
castSkill('luoshi');   // 落石诀：破甲 2 回合（记 3，回合末递减后剩 2）
ok(c.foeShred === 2, '落石诀：破甲 2 回合（回合末递减后）', c.foeShred);
ok(Math.abs(c.foeShredV - 0.2) < 1e-9, '落石诀：破甲 +20%');

setup(); c = mkCombat('sword', 5000); S.mp = 500;
castSkill('liuJian');  // 流转剑罡：伤害 + 守势
ok(c.defending === true, '流转剑罡：附带守势');
ok(c.foe.hp < 5000, '流转剑罡：有伤害（攻守同时）');

setup(); c = mkCombat('sword', 5000); S.mp = 500;
const hpBefore = S.hp;
castSkill('baigu');    // 白骨飞剑：耗气血一成 + 器损（无本命时器损不触发）
ok(S.hp < hpBefore, '白骨飞剑：耗气血代价', S.hp + '/' + hpBefore);
ok(lastLog(/耗气血/) !== '', '白骨飞剑：代价日志');

/* 雷系必中半无视卸力 + 打断蓄力 */
setup(); c = mkCombat('sword', 5000); S.mp = 500;
c.foeIntent = { id: 'sw_charge', name: '蓄力重剑', type: 'charge', mul: 2.2, intent: '蓄力' };
c.foeCharging = { id: 'sw_charge', name: '蓄力重剑', mul: 2.2 };
castSkill('leiming');  // 惊雷引：打断蓄力（定神记 3，敌方回合末递减后剩 2）
ok(c.foeCharging === null, '惊雷引：蓄力被打断');
ok(c.foeCalm === 2, '惊雷引：打断后定神 2 回合（回合末递减后）', c.foeCalm);
ok(lastLog(/蓄力被打断/) !== '', '惊雷引：打断日志');

/* ============================================================
   二、状态生命周期：刷新不叠层 / 取最高 / DoT 致死
   ============================================================ */
console.log('=== 2. 状态生命周期 ===');
setup(); c = mkCombat('sword', 5000);
G.applyCombatEffect('foe', { type: 'burn', turns: 2, mul: 1 }, c);
G.applyCombatEffect('foe', { type: 'burn', turns: 2, mul: 1 }, c);
ok(c.foeBurn === 2, '灼烧：同名刷新不叠层（仍 2 回合）', c.foeBurn);
G.applyCombatEffect('foe', { type: 'weaken', turns: 1 }, c);
G.applyCombatEffect('foe', { type: 'weaken', turns: 3 }, c);
ok(c.foeWeaken === 4, '压制：不同来源取最高（turns=3 记 4，未经回合递减）', c.foeWeaken);

/* 硬控 → 定神 → 定神期内硬控转压制（直接调用，未经回合递减：定神记 3） */
setup(); c = mkCombat('sword', 5000);
G.applyCombatEffect('foe', { type: 'stun', turns: 1 }, c);
ok(c.foeStun === 1 && c.foeCalm === 3, '硬控：foeStun=1 且定神记 3（递减后 2 回合）');
G.applyCombatEffect('foe', { type: 'stun', turns: 1 }, c);
ok(c.foeStun === 1, '定神期内硬控不再叠硬控', c.foeStun);
ok(c.foeWeaken >= 1, '定神期内硬控转为压制', c.foeWeaken);
ok(lastLog(/定神之中/) !== '', '定神转压制日志');

/* DoT 致死走胜利出口 */
setup(); c = mkCombat('sword', 5000);
c.foe.hp = 5; c.foeBurn = 2; c.burnFresh = false; c.foeBurnMul = 1;
S.combat = c;
const stonesBefore = S.stones;
const alive = G.tickCombatEffects('foe', 'foeStart', c);
ok(alive === false, '灼烧致死：tick 返回 false（战斗结束）');
ok(S.combat === null, '灼烧致死：走 settleCombatWin（combat 清空）');
ok(S.stones > stonesBefore, '灼烧致死：正常发灵石奖励');

/* 中毒致死同样走胜利出口 */
setup(); c = mkCombat('sword', 5000);
c.foe.hp = 3; c.foePoison = 2; c.foePoisonPct = 0.05;
S.combat = c;
const alive2 = G.tickCombatEffects('foe', 'foeStart', c);
ok(alive2 === false && S.combat === null, '中毒致死：走胜利出口');

/* 净化写日志 */
setup(); c = mkCombat('sword', 5000);
c.mePoison = 3;
G.applyCombatEffect('me', { type: 'cleanse' }, c);
ok(c.mePoison === 0, '净符：清除中毒');
ok(lastLog(/净化/) !== '', '净化日志');

/* ============================================================
   三、敌方意图：展示与执行一致 / 读档不重摇 / 蓄力跨回合
   ============================================================ */
console.log('=== 3. 敌方意图与蓄力 ===');
setup(); c = mkCombat('sword', 5000);
ok(c.foeIntent && c.foeIntent.type, '开战即选定首意图');
const intentId = c.foeIntent.id;
const html = G.renderCombat();
ok(html.indexOf('下回合意图') >= 0, '敌方面板展示意图');
ok(html.indexOf(c.foeIntent.name) >= 0, '意图名称可见');

/* 读档后意图不重新随机 */
const snap = JSON.parse(JSON.stringify(S));
G.applyState(snap); rebind();
ok(S.combat.foeIntent.id === intentId, '读档后意图不变（不重摇）', S.combat.foeIntent.id + '/' + intentId);

/* 蓄力跨一回合：charge 当回合无伤，下回合 burst 释放 */
setup(); c = mkCombat('sword', 5000);
c.foeIntent = { id: 'sw_charge', name: '蓄力重剑', type: 'charge', mul: 2.2, intent: '蓄力', srcId: 'sw_charge' };
c.foeCharging = { id: 'sw_charge', name: '蓄力重剑', mul: 2.2 };
S.combat = c;
const hpBeforeCharge = S.hp;
G.ACT.do_cbt('defend'); rebind();   // 玩家守势，敌方执行 charge
ok(S.hp === hpBeforeCharge || S.combat === null, '蓄力当回合不造成伤害', S.hp + '/' + hpBeforeCharge);
if (S.combat) {
  ok(S.combat.foeIntent.type === 'burst', '蓄力后下回合意图为释放（burst）', S.combat.foeIntent.type);
}

/* 蓄力可被缚灵符打断 */
setup(); c = mkCombat('sword', 5000);
S.talismans = { fuFu: 2 };
c.foeIntent = { id: 'sw_charge', name: '蓄力重剑', type: 'charge', mul: 2.2, intent: '蓄力' };
c.foeCharging = { id: 'sw_charge', name: '蓄力重剑', mul: 2.2 };
S.combat = c;
G.ACT.do_cbt('tal', 'fuFu'); rebind();
ok(c.foeCharging === null, '缚灵符：对蓄力目标改为打断');
ok(lastLog(/打断/) !== '' || lastLog(/定神/) !== '', '缚灵符打断日志');

/* 四路数都有意图池 */
['sword', 'fa', 'body', 'gui'].forEach(function (st) {
  setup(); c = mkCombat(st, 5000);
  const style = G.foeStyleOf(c);
  ok(style && style.actions.length >= 3, '路数 ' + st + '：行动池 ≥3', style ? style.actions.length : 0);
});

/* ============================================================
   四、调息
   ============================================================ */
console.log('=== 4. 调息 ===');
setup(); c = mkCombat('sword', 5000);
S.mp = 100; S.mpMax = 1000;
const expectGain = Math.max(20, Math.round(1000 * 0.12));
const roundBefore = c.round;
G.ACT.do_cbt('rest'); rebind();
ok(S.mp === 100 + expectGain, '调息：回灵 max(20, mpMax×12%)', S.mp);
ok(S.mp <= S.mpMax, '调息：灵力不超上限');
ok(c.round > roundBefore || S.combat === null, '调息：敌方仍行动（回合推进）');
ok(c.defending === false, '调息：不附带守势');

/* 调息清一层迟滞（预设 3 层：调息清 1 剩 2，敌方回合末递减后剩 1） */
setup(); c = mkCombat('sword', 5000);
S.mp = 100; c.meSlow = 3;
G.ACT.do_cbt('rest'); rebind();
ok(c.meSlow === 1, '调息：清一层自身迟滞（3→调息2→回合末1）', c.meSlow);

/* 调息不清中毒灼烧（mePoison 在 roundEnd 递减：预设 4 → 回合末 3） */
setup(); c = mkCombat('sword', 5000);
S.mp = 100; c.mePoison = 4; c.mePoisonPct = 0.001; c.meBurn = 0;
G.ACT.do_cbt('rest'); rebind();
ok(c.mePoison === 3, '调息：不净化中毒（仅回合末自然递减）', c.mePoison);

/* 灵力已满时调息按钮禁用（菜单侧），但 do_cbt 仍安全（不超上限） */
setup(); c = mkCombat('sword', 5000);
S.mp = 1000;
G.ACT.do_cbt('rest'); rebind();
ok(S.mp === 1000, '调息：满灵不溢出');

/* ============================================================
   五、雷火引爆 / 破甲增伤 / 护体
   ============================================================ */
console.log('=== 5. 可读联动 ===');
setup(); c = mkCombat('sword', 5000);
c.foeBurn = 3; c.foeBurnMul = 1; c.burnFresh = false;
const extra = G.detonateBurn(c, 1);
ok(extra > 0, '雷火引爆：有追加伤害', extra);
ok(c.foeBurn === 2, '雷火引爆：消耗一层灼烧', c.foeBurn);
ok(lastLog(/雷火引爆余焰/) !== '', '雷火引爆日志');

/* 破甲增伤：有破甲时普攻伤害更高 */
setup(); c = mkCombat('sword', 5000);
G.setSeed(777);
c.foeShred = 0;
G.ACT.do_cbt('attack'); rebind();
const dmgNoShred = 5000 - c.foe.hp;
setup(); c = mkCombat('sword', 5000);
G.setSeed(777);
c.foeShred = 2; c.foeShredV = 0.2;
G.ACT.do_cbt('attack'); rebind();
const dmgShred = 5000 - c.foe.hp;
ok(dmgShred > dmgNoShred, '破甲：受创 +20% 实际增伤', dmgShred + '/' + dmgNoShred);

/* 敌方护体：先破防再爆发（护体减伤一次性消费） */
setup(); c = mkCombat('body', 5000);
c.foeGuard = 0.4;
G.setSeed(888);
G.ACT.do_cbt('attack'); rebind();
ok(c.foeGuard === 0, '敌方护体：受击后消费清零');

/* ============================================================
   六、战利品掉落接入四艺
   ============================================================ */
console.log('=== 6. 战利品掉落 ===');
setup(); c = mkCombat('sword', 5000);
c.isVengeance = true;   // 寻仇必掉材料
S.combat = c;
const matBefore = Object.values(S.bagMat).reduce(function (a, b) { return a + b; }, 0);
G.settleCombatWin(c); rebind();
const matAfter = Object.values(S.bagMat).reduce(function (a, b) { return a + b; }, 0);
ok(matAfter > matBefore, '寻仇：必掉一份路数材料', matAfter + '/' + matBefore);
ok(lastLog(/搜其遗物/) !== '', '掉落日志');

/* 普通胜场掉落不破坏月账（材料不进灵石收入） */
setup(); c = mkCombat('fa', 5000);
S.combat = c;
const incomeBefore = (S.ledger.income || []).length;
G.settleCombatWin(c); rebind();
const lootIncome = (S.ledger.income || []).filter(function (x) { return x.label === '斗法所得'; });
ok(lootIncome.length === 1, '胜利：灵石收入只记一笔（材料不重复进账）');

console.log('\n———— v10.7 阶段三·战斗决策层结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
if (fail) process.exit(1);
