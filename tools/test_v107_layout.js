// v10.7 第一阶段专项：左导航迁移 + 战斗口径修复
// 目的：
//   1. 入口零丢失——dockItems() 的每个入口都必须出现在左导航里，且动作能派发；
//   2. 口径一致——增益符/金刚符/五雷符/传音符/拘仙符的文案与结算必须对得上；
//   3. 敌我状态归位——破绽/灼烧/迟滞/压制必须在敌方卡上。
// 用法：node tools/test_v107_layout.js
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
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
/* 扩展也要加载：导航入口有一半来自 wxcs3-ext-*.js */
const fsx = fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort();
fsx.forEach(function (f) {
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
function html() { return (els['stage'] && els['stage'].innerHTML) || ''; }

function setup(opts) {
  opts = opts || {};
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['jin', 'mu', 'shui'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 1, xStage: 0, xiuwei: 0, shenTong: [],
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000,
    stones: 99999, month: 3, year: 388, turn: 0,
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
    /* 新手引导默认已走完（否则「引」条目会一直挂在要务里，遮住其他断言） */
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  return S;
}
/* 造一场「打不坏也打不死」的战斗，用来观察单回合结算。
   v10.7 阶段三：补全状态生命周期字段，意图固定为普通攻击（避免蓄力/护体干扰减伤对照）。 */
function mkFoe(hp) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: 300, rank: 12, el: 'earth', trait: 'normal', style: 'sword' },
    round: 1, observed: false, defending: false, stUsed: {}, stanceUsed: {},
    foePoison: 0, foeShred: 0, foeStun: 0, foeCalm: 0, foeGuard: 0, foeCounter: 0,
    meGuard: 0, meGuardTurns: 0, meDodge: false, meMpSave: false, meBurst: false,
    meRegen: 0, mePoison: 0, meBurn: 0, meSlow: 0, meLock: 0,
    pillCount: 0, lastPillId: null, lastPillRound: -9,
    talCd: {}, foeCd: {}, foeCharging: null,
    foeIntent: { id: 'sw_atk', name: '疾剑', type: 'attack', mul: 1.0, intent: '疾剑直刺', srcId: 'sw_atk' }
  };
}
function lastLog(re) {
  const hit = S.log.filter(function (x) { return re.test(x.txt || ''); });
  return hit.length ? hit[hit.length - 1].txt : '';
}
function dmgOf() {
  const m = /造成 (\d+)/.exec(lastLog(/造成/));
  return m ? parseInt(m[1], 10) : 0;
}

/* ============================================================
   一、布局：左导航替代底部功能坞
   ============================================================ */
console.log('=== 1. 左导航与入口零丢失 ===');
setup();
G.render();
let h = html();

ok(h.indexOf('col-nav') > 0, '存在左导航栏（col-nav）');
ok(h.indexOf('col-main') > 0, '存在中栏（col-main）');
ok(h.indexOf('col-state') > 0, '存在右栏（col-state）');
ok(h.indexOf('navitem') > 0, '导航条目已渲染');
ok(h.indexOf('dockrow') < 0, '底部通栏功能坞已下线');
ok(h.indexOf('dockbtn') < 0, '旧坞按钮样式已下线');

/* 纪事移到中栏：面板标题在 nav 之后、state 之前 */
const iNav = h.indexOf('col-nav'), iMain = h.indexOf('col-main'), iState = h.indexOf('col-state');
ok(iNav >= 0 && iNav < iMain && iMain < iState, '三栏顺序：左导航 → 中栏 → 右栏');
ok(h.indexOf('纪事 · 月账') > iMain && h.indexOf('纪事 · 月账') < iState, '纪事已移到中栏');

/* 入口零丢失：dockItems() 的每一条都要在左导航里出现，且动作可派发 */
const items = G.dockItems();
const navHtml = h.slice(iNav, iMain);
const lost = items.filter(function (it) { return navHtml.indexOf('data-act="' + it.act + '"') < 0; });
ok(lost.length === 0, 'dockItems 的 ' + items.length + ' 个入口全部出现在左导航',
  lost.map(function (x) { return x.k + '/' + x.t + '(' + x.act + ')'; }).join('；'));

/* 每个入口的动作都必须能被 dispatch 解析（不点得动＝死按钮）。
   扩展入口登记在 G.WXCS3_EXT_ACT 上，dispatch 先查它再回退到 ACT。 */
const EXT_ACT = window.WXCS3_EXT_ACT || {};
const dead = items.filter(function (it) {
  /* 动作串的读法与 dispatch 一致：先切前缀，再按冒号分段 */
  if (it.act.startsWith('act:')) {
    const k = it.act.slice(4).split(':')[0];
    return typeof G.ACT[k] !== 'function';
  }
  if (it.act.startsWith('do;')) {
    const k = it.act.slice(3).split(':')[0];
    return !(EXT_ACT[k] || EXT_ACT['do_' + k] || G.ACT['do_' + k] || G.ACT[k]);
  }
  return false;
});
ok(dead.length === 0, '左导航里没有死按钮', dead.map(function (x) { return x.act; }).join('；'));

/* 分组不重不漏 */
const groups = G.navGroups();
const seen = {};
let dup = [];
groups.forEach(function (g) {
  g.items.forEach(function (it) {
    if (seen[it.k]) dup.push(it.k); else seen[it.k] = 1;
  });
});
ok(dup.length === 0, '同一入口不会出现在两组里', dup.join('、'));
const navTotal = groups.reduce(function (a, g) { return a + g.items.length; }, 0);
ok(navTotal === items.length + 3, '导航条目数 = dockItems + 记录组三项（年谱/功过格/账本）',
  navTotal + ' vs ' + (items.length + 3));

/* 记录组三项 */
ok(groups.some(function (g) { return g.id === 'rec'; }), '存在「记录」分组');
const rec = groups.filter(function (g) { return g.id === 'rec'; })[0];
ok(rec.items.length === 3, '记录组三项（年谱 / 功过格 / 账本）', rec.items.length);
ok(rec.items.some(function (x) { return x.act === 'act:openChronicle'; }), '年谱入口在');
ok(rec.items.some(function (x) { return x.act === 'act:openAch'; }), '功过格入口在');
ok(rec.items.some(function (x) { return x.act === 'act:openLedger'; }), '账本入口在');

/* 要务置顶：来访 / 急事 / 拍卖 / 人情 / 锚定 */
setup({ npcCall: { id: (D.NPC_POOL[0] || {}).id, kind: 'visit' } });
G.render();
h = html();
const iUrgent = h.indexOf('navgrp--urgent');
const iFirst = h.indexOf('class="navgrp"');
ok(iUrgent > 0, '要务分组出现');
ok(iUrgent > 0 && (iFirst < 0 || iUrgent < iFirst), '要务排在最前');
ok(h.slice(0, iUrgent).indexOf('navitem') < 0, '要务之前没有别的入口');
ok(h.indexOf('有人来访') > 0, '来访入口可见');

/* 紧急项消失后不保留空位 */
setup();
G.render();
h = html();
ok(h.indexOf('navgrp--urgent') < 0, '无要务时不留空组');

/* 新手引导未走完时，它也属于「要办的事」，放在最上面 */
setup({ tutStep: 0 });
G.render();
h = html();
ok(h.indexOf('navgrp--urgent') > 0 && h.indexOf('新手引导') > 0, '新手引导未完时置于要务');

/* 移动端五项底栏 */
ok(h.indexOf('navmob') > 0, '移动端五项底栏已渲染');
['xiu', 'wai', 'chu', 'ren'].forEach(function (gid) {
  ok(h.indexOf('do;navgrp:' + gid) > 0, '底栏含分组 ' + gid);
});
ok(h.indexOf('do;navmore') > 0, '底栏含「更多」');
ok(typeof G.ACT.do_navgrp === 'function', 'do_navgrp 存在');
ok(typeof G.ACT.do_navgo === 'function', 'do_navgo 存在');
ok(typeof G.ACT.do_navmore === 'function', 'do_navmore 存在');

/* 底栏弹窗里的每一条都能真的派发出去 */
setup();
G.ACT.do_navgrp('xiu');
const modalHtml = els['modals'] ? els['modals'].innerHTML : '';
ok(modalHtml.indexOf('do;navgo:') > 0, '分组弹窗用 do;navgo 转发');
const enc = (modalHtml.match(/do;navgo:([^"]+)"/) || [])[1];
ok(!!enc, '取得到转发的目标动作');
if (enc) {
  const target = decodeURIComponent(enc);
  const okOpen = (function () {
    try { G.dispatch('do;navgo:' + enc); return true; } catch (e) { return false; }
  })();
  ok(okOpen, 'do;navgo 能把目标动作派发出去（' + target + '）');
}

/* ============================================================
   二、战斗口径：符箓的文案必须兑现
   ============================================================ */
console.log('=== 2. 符箓口径 ===');

/* —— 增益符：三回合、直接伤害、刷新不叠层 —— */
setup({ talismans: { fuZeng: 3 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
G.setSeed(4242);
G.ACT.do_cbt('tal', 'fuZeng');
ok(S.combat && S.combat.talBuff === 0.3, '增益符：直接伤害 +30%（talBuff=' + (S.combat ? S.combat.talBuff : '战斗结束') + '）');
ok(S.combat && S.combat.talBuffTurns === 3, '增益符：带 3 回合期限', S.combat ? S.combat.talBuffTurns : '-');

/* 再贴一张不叠层 */
S.talismans.fuZeng = 2;
G.ACT.do_cbt('tal', 'fuZeng');
ok(S.combat.talBuff === 0.3, '增益符：刷新而非累加（talBuff=' + S.combat.talBuff + '）');
ok(S.combat.talBuffTurns === 3, '增益符：刷新回 3 回合');

/* 普攻吃增益 */
function atkDmg(withBuff) {
  setup({});
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9000000);
  if (withBuff) { S.combat.talBuff = 0.3; S.combat.talBuffTurns = 3; }
  G.setSeed(4242);
  G.ACT.do_cbt('attack', '');
  return dmgOf();
}
const atkYes = atkDmg(true), atkNo = atkDmg(false);
ok(atkYes > atkNo, '普攻吃增益：贴符后伤害更高（' + atkYes + ' > ' + atkNo + '）');

/* 术法也吃增益（口径统一，不能只增幅普攻） */
function skillDmg(withBuff) {
  setup({ talismans: {}, skillsKnown: ['huoshan'], skillsEquip: ['huoshan'] });
  S.hp = 1e9; S.hpMax = 1e9; S.mp = 1e6; S.mpMax = 1e6;
  S.combat = mkFoe(9000000);
  if (withBuff) { S.combat.talBuff = 0.3; S.combat.talBuffTurns = 3; }
  G.setSeed(99);
  G.ACT.do_cbt('skill', encodeURIComponent('焚山掌'));
  return dmgOf();
}
const skYes = skillDmg(true), skNo = skillDmg(false);
ok(skYes > skNo, '术法也吃增益（' + skYes + ' > ' + skNo + '）');

/* 增益符三回合后失效 */
setup({ talismans: { fuZeng: 1 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
G.ACT.do_cbt('tal', 'fuZeng');
for (let i = 0; i < 3 && S.combat; i++) G.ACT.do_cbt('defend', '');
ok(!S.combat || (S.combat.talBuffTurns === 0 && !S.combat.talBuff), '增益符：3 回合后自动失效',
  S.combat ? (S.combat.talBuffTurns + '/' + S.combat.talBuff) : '战斗结束');

/* —— 金刚符：与守势取强，不叠乘 —— */
setup({ talismans: { fuJin: 1 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
G.ACT.do_cbt('tal', 'fuJin');
/* 护体在敌方这一击就消耗掉了（语义是「下一次受击」），
   所以验它的正确方式是看挨打后的减伤幅度，不是读末态字段。 */

/* 三档对照：无守无符 / 只有守势 / 守势+金刚符 */
function hurtWith(mode) {
  setup({});
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9000000);
  if (mode !== 'none') S.combat.defending = true;
  if (mode === 'both') S.combat.talShield = 0.6;
  G.setSeed(31337);
  const before = S.hp;
  G.ACT.do_cbt('attack', '');     // 出手一次，敌方回合随之结算
  return before - S.hp;
}
const hurtNone = hurtWith('none');
const hurtGuard = hurtWith('guard');
const hurtBoth = hurtWith('both');
const rGuard = hurtNone > 0 ? hurtGuard / hurtNone : 1;
const rBoth = hurtNone > 0 ? hurtBoth / hurtNone : 1;
const rVsGuard = hurtGuard > 0 ? hurtBoth / hurtGuard : 1;
ok(rGuard > 0.46 && rGuard < 0.54, '守势单独：减伤 50%（×' + rGuard.toFixed(3) + '）');
ok(rBoth > 0.36 && rBoth < 0.44, '守势+金刚符：总减伤 60%（×' + rBoth.toFixed(3) + '）');
/* 旧写法 red = 0.5 − 0.6 → 落到 0.05 下限，这里会是 ×0.1 左右 */
ok(rVsGuard > 0.7, '护体与守势不叠乘（相对守势 ×' + rVsGuard.toFixed(3) + '）');

/* —— 五雷符：+80% 必须兑现（v10.7 阶段三：从符箓库存消耗） —— */
setup({ talismans: { wuyun: 1 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
S.preBuff = {};
G.ACT.do_cbtpre('wuyun');
ok(S.preBuff && S.preBuff.boost === 0.8, '五雷符：战前写下 +80%（' + (S.preBuff ? S.preBuff.boost : '-') + '）');
ok((S.talismans.wuyun || 0) === 0, '五雷符：用掉即消耗');

function atkDmgWithBoost() {
  setup({});
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9000000);
  S.preBuff = { boost: 0.8, sureHit: true };
  G.setSeed(555);
  G.ACT.do_cbt('attack', '');
  return dmgOf();
}
const boostDmg = atkDmgWithBoost();
setup({});
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
G.setSeed(555);
G.ACT.do_cbt('attack', '');
const plainDmg = dmgOf();
ok(boostDmg > plainDmg * 1.6, '五雷符：首击伤害 +80%（' + boostDmg + ' vs ' + plainDmg + '）');

/* —— 拘仙敕神符：作用于当前这一场（v10.7 阶段三：从符箓库存消耗） —— */
setup({ talismans: { juxian: 1 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
S.preBuff = {};
G.ACT.do_cbtpre('juxian');
ok(S.combat.rankUp === true, '拘仙敕神符：当场位格压制生效');
ok(!(S.preBuff && S.preBuff.rankUp), '拘仙敕神符：不再残留给下一场');

/* —— 传音符：平时可用，好感 +5（v10.7 阶段三：从符箓库存消耗） —— */
setup({ talismans: { jinchuan: 1 }, npcs: {} });
const npc0 = D.NPC_POOL[0];
S.npcs[npc0.id] = { fav: 10, met: true };
const favBefore = S.npcs[npc0.id].fav;
G.ACT.do_useart('jinchuan');
ok((S.talismans.jinchuan || 0) === 0, '传音符：用掉即消耗');
ok(S.npcs[npc0.id].fav === favBefore + 5, '传音符：好感 +5（' + favBefore + ' → ' + S.npcs[npc0.id].fav + '）');

/* 传音符不该出现在战前菜单里（非战斗物不该被无效消耗） */
setup({ talismans: { jinchuan: 1, wuyun: 1 } });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(9000000);
G.ACT.openPreFight();
const preHtml = els['modals'] ? els['modals'].innerHTML : '';
ok(preHtml.indexOf('传音符') < 0, '传音符不在战前菜单里');
ok(preHtml.indexOf('五雷符') > 0, '五雷符仍在战前菜单里');

/* ============================================================
   三、敌我状态归位
   ============================================================ */
console.log('=== 3. 敌我状态归位 ===');
setup();
S.combat = {
  foe: { name: '散修', rank: 1, power: 20, hp: 80, hpMax: 100, trait: 'normal', el: 'fire' },
  round: 2, observed: true, defending: true,
  foeMark: 2, foeWeaken: 1, foeBurn: 2, foeSlow: 1,
  talBuff: 0.3, talBuffTurns: 3, talShield: 0.6, noFoeFlee: true, momentum: 2
};
const cb = G.renderCombat() || '';
const iFoe = cb.indexOf('敌方'), iMe = cb.indexOf('我方');
/* 我方卡只取到行动栏之前——行动区的调息按钮含「清一层迟滞」文案，
   那是操作说明不是状态标签，不该算进「我方状态」断言。
   v10.8 P0：行动区从底部通栏（dockrow）挪进右栏（col-acts），
   边界跟着改；这里验的是「状态归属哪张卡」，与行动区在哪儿无关。 */
const iAct = cb.indexOf('col-acts', iMe);
const foeTxt = cb.slice(iFoe, iMe), myTxt = cb.slice(iMe, iAct > iMe ? iAct : undefined);
ok(foeTxt.indexOf('破绽') >= 0, '破绽在敌方卡');
ok(foeTxt.indexOf('压制') >= 0, '压制在敌方卡');
ok(foeTxt.indexOf('灼烧') >= 0, '灼烧在敌方卡');
ok(foeTxt.indexOf('迟滞') >= 0, '迟滞在敌方卡');
ok(myTxt.indexOf('破绽') < 0, '破绽不在我方卡');
ok(myTxt.indexOf('压制') < 0, '压制不在我方卡');
ok(myTxt.indexOf('灼烧') < 0, '灼烧不在我方卡');
ok(myTxt.indexOf('迟滞') < 0, '迟滞不在我方卡');
ok(myTxt.indexOf('守势') >= 0, '守势仍在我方卡');
ok(myTxt.indexOf('增益') >= 0, '增益仍在我方卡');
ok(myTxt.indexOf('护体') >= 0, '护体仍在我方卡');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
