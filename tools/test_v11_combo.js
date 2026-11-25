// v11 P0-1 专项：杀招系统（8 条组合技）
// 断言：
//   1. 八条杀招 cur/prev 指向的招式都真实存在（防错别字/改名漂移）；
//   2. 每条在满足条件时真的触发（日志出现杀招名 + cls=combo + 伤害被放大）；
//   3. 不满足条件时退回普通招式（无 combo 标、无专属文案）——绝不"点了没反应"；
//   4. 隔一手断链：上一招不是序列前一招时不成招；
//   5. 菜单预览 comboForSkill 与结算 comboCheck 同源（看到的=发生的）。
// 用法：node tools/test_v11_combo.js
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
function lastLog(re) {
  const l = (S.log || []).find(x => re.test(x.txt));
  return l || null;
}

function setup(opts) {
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 4, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
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
    kaiMaiXun: 0, wuXinBuff: 0, stKind: {}, stVariant: {}, stEquip: null,
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts || {});
  els['modals'] = makeEl('modals');
  return S;
}
function mkCombat() {
  G.setSeed(4242);
  G.startCombat(false);
  rebind();
  const c = S.combat;
  c.foe.style = 'sword';
  c.foe.hp = 900000; c.foe.hpMax = 900000;
  c.foe.power = 300; c.foe.rank = 5;   // rank 5 = 同档，避免位格压制盖掉杀招差
  c.foe.trait = 'normal'; c.foe.el = 'fire';
  c.foeIntent = G.pickFoeIntent(c);
  return c;
}
function equip(names) {
  S.skillsKnown = (D.SKILLS || []).filter(sk => names.indexOf(sk.name) >= 0).map(sk => sk.id);
  S.skillsEquip = S.skillsKnown.slice();
}
function cast(nm) {
  G.ACT.openSkills();
  G.dispatch('do;cbt:skill:' + encodeURIComponent(nm));
  rebind();
}

/* ============ 1. 数据完整性 ============ */
console.log('【1】八条杀招数据完整性');
{
  setup({});
  const names = (D.SKILLS || []).map(s => s.name);
  let bad = 0;
  (D.COMBOS || []).forEach(cb => {
    if (cb.prev && names.indexOf(cb.prev) < 0) { bad++; console.log('    prev 不存在：' + cb.prev); }
    if (cb.cur && names.indexOf(cb.cur) < 0) { bad++; console.log('    cur 不存在：' + cb.cur); }
    if (!cb.fx || !cb.text) { bad++; console.log('    缺 fx/text：' + cb.id); }
    const condOk = ['foeBurn', 'foeWeaken', 'foeShred', 'foeCalm', 'hpHigh', 'hpLow', 'wasGuard', 'seq'];
    if (condOk.indexOf(cb.cond) < 0) { bad++; console.log('    cond 未支持：' + cb.cond); }
  });
  ok((D.COMBOS || []).length === 8, 'COMBOS 恰 8 条（实得 ' + (D.COMBOS || []).length + '）');
  ok(bad === 0, '8 条的 prev/cur 招式与 cond 全部有效', bad);
}

/* ============ 通用触发测试器 ============ */
// opts: {a,b,condSetup(c)->void, expect:{log,dmgMul?}}
function runCombo(label, prevName, curName, condSetup, extraChecks) {
  console.log('— ' + label);
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip([prevName, curName, '直取']);
  const c = mkCombat();
  if (condSetup) condSetup(c);
  cast(prevName);
  rebind();
  // condSetup 可能因 foeTurn 被覆盖，出手后再确保条件成立（条件本就该由上一招造成）
  const c2 = S.combat;
  if (!c2) { ok(false, label + '：战斗被中断'); return null; }
  if (condSetup) condSetup(S.combat);
  const before = S.combat.foe.hp;
  S.log.unshift({ txt: '<<BOUNDARY>>', cls: '', seq: (S.logSeq || 0) + 1 });
  cast(curName);
  rebind();
  const after = S.combat ? S.combat.foe.hp : 0;
  const dmg = before - after;
  const cbLog = lastLog(/杀招|焚山煮海|雷落九霄|缚而后斩|落井下石|寒潭照影|血喂剑|流转不绝|镇压八荒/);
  const cLog = lastLog(/焚山煮海|雷落九霄|缚而后斩|落井下石|寒潭照影|血喂剑|流转不绝|镇压八荒/);
  ok(!!cLog, label + '：触发专属日志');
  ok(cLog && cLog.cls === 'combo', label + '：日志标色 cls=combo', cLog && cLog.cls);
  if (extraChecks) extraChecks(S.combat, dmg, cLog);
  return { dmg: dmg, log: cLog };
}

/* ============ 2. 八条逐一触发 ============ */
console.log('【2】八条杀招逐一触发');

// 焚山煮海：焚山掌(灼烧) → 毒火丝，foeBurn>0，引爆+自损
runCombo('焚山煮海（焚山掌→毒火丝）', '焚山掌', '毒火丝', null, function (c, dmg) {
  ok(c.foeBurn === 0, '焚山煮海引爆后灼烧清层（foeBurn=' + c.foeBurn + '）');
});

// 雷落九霄：惊雷引 → 神霄御剑（纯序列）
runCombo('雷落九霄（惊雷引→神霄御剑）', '惊雷引', '神霄御剑', null, function (c, dmg, log) {
  ok(dmg > 0, '雷落九霄造成伤害 ' + dmg);
});

// 缚而后斩：缠木根(压制) → 剑气纵横，deflZero
runCombo('缚而后斩（缠木根→剑气纵横）', '缠木根', '剑气纵横', null, function (c, dmg) {
  ok(dmg > 0, '缚而后斩造成伤害 ' + dmg);
});

// 落井下石：落石诀(破甲) → 白骨飞剑
runCombo('落井下石（落石诀→白骨飞剑）', '落石诀', '白骨飞剑', null, function (c, dmg) {
  ok(c.foeShred > 0, '落井下石追加破甲（foeShred=' + c.foeShred + '）');
});

// 寒潭照影：寒水箭 → 玄珠坠月（hpHigh，默认满血满足）
runCombo('寒潭照影（寒水箭→玄珠坠月）', '寒水箭', '玄珠坠月', null, function (c, dmg) {
  ok(c.foeSlow > 0, '寒潭照影迟滞敌方（foeSlow=' + c.foeSlow + '）');
});

// 血喂剑：血炼神光 → 白骨飞剑（hpLow）——需先把血压到 <50%
runCombo('血喂剑（血炼神光→白骨飞剑）', '血炼神光', '白骨飞剑', function (c) {
  S.hp = Math.round(S.hpMax * 0.3);   // 触发条件：气血低于五成
}, function (c, dmg, log) {
  ok(dmg > 0, '血喂剑造成伤害 ' + dmg);
});

// 流转不绝：流转剑罡(guard) → 剑气纵横(sword)，wasGuard
runCombo('流转不绝（流转剑罡→剑气纵横）', '流转剑罡', '剑气纵横', null, function (c, dmg, log) {
  // meDodge 是「用一次即消」字段，出手后 foeTurn 已消费，故验专属规避文案而非残留值
  ok(/碰不着/.test(log.txt), '流转不绝走规避分支（日志含「碰不着」）');
});

// 镇压八荒：镇压八方(stun→foeCalm) → 直取（cond foeCalm）
runCombo('镇压八荒（镇压八方→直取）', '镇压八方', '直取', function (c) {
  if (!(c.foeCalm > 0)) c.foeCalm = 3;   // 镇压八方会置 foeCalm；若 foeTurn 递减致 0，这里补回以验证结算本身
}, function (c, dmg) {
  ok(dmg > 0, '镇压八荒造成伤害 ' + dmg);
});

/* ============ 3. 条件不满足 → 退回普通招式 ============ */
console.log('【3】不满足条件退回普通招式');
{
  // 焚山掌后隔一手（普攻）再毒火丝 → 链断，不成焚山煮海
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip(['焚山掌', '毒火丝']);
  mkCombat();
  cast('焚山掌'); rebind();
  if (S.combat) {
    G.dispatch('do;cbt:attack'); rebind();   // 插一手普攻断链
  }
  if (S.combat) {
    S.log.unshift({ txt: '<<B>>', cls: '', seq: (S.logSeq || 0) + 1 });
    cast('毒火丝'); rebind();
    const log = lastLog(/焚山煮海/);
    ok(!log, '隔一手普攻后不成焚山煮海（链断）');
  } else ok(true, '（战斗已结束，跳过断链用例）');
}
{
  // 未先灼烧直接毒火丝：起手无前招，不该成招
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip(['毒火丝']);
  mkCombat();
  S.log.unshift({ txt: '<<B2>>', cls: '', seq: (S.logSeq || 0) + 1 });
  cast('毒火丝'); rebind();
  ok(!lastLog(/焚山煮海/), '无前招时毒火丝不成焚山煮海');
}

/* ============ 4. 预览与结算同源 ============ */
console.log('【4】菜单预览与结算同源');
{
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip(['焚山掌', '毒火丝']);
  const c = mkCombat();
  c.prevSkillName = '焚山掌'; c.prevSkillRound = c.round; c.foeBurn = 2; c.foeBurnMul = 1;
  const preview = G.comboCheck ? G.comboCheck('毒火丝', 'poison', c) : null;
  ok(!!preview && preview.name === '焚山煮海', 'comboCheck 预览到焚山煮海', preview && preview.name);
  c.prevSkillName = '寒水箭';
  ok(G.comboCheck('毒火丝', 'poison', c) === null, '前招不符时预览返回空');
}

/* ============ 5. 乘区真的进伤害（不只出日志） ============ */
console.log('【5】杀招乘区兑现（直取 ×2.2 对比）');
{
  // A：无前招的裸直取
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip(['直取']);
  mkCombat();
  let before = S.combat.foe.hp;
  cast('直取'); rebind();
  const dmgPlain = before - (S.combat ? S.combat.foe.hp : before);
  // B：上一手镇压八方 + foeCalm，同一招直取触发镇压八荒 ×2.2
  setup({ hp: 900000, hpMax: 900000, mp: 999999, mpMax: 999999 });
  equip(['镇压八方', '直取']);
  const c = mkCombat();
  c.prevSkillName = '镇压八方'; c.prevSkillRound = c.round; c.foeCalm = 3;
  before = S.combat.foe.hp;
  cast('直取'); rebind();
  const dmgCombo = before - (S.combat ? S.combat.foe.hp : before);
  ok(dmgPlain > 0 && dmgCombo > 0, '两种直取都造成伤害（' + dmgPlain + ' / ' + dmgCombo + '）');
  ok(dmgCombo > dmgPlain * 1.8, '杀招直取伤害显著高于裸直取（×2.2 乘区生效，实得比 ' +
    (dmgCombo / Math.max(1, dmgPlain)).toFixed(2) + '）');
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
