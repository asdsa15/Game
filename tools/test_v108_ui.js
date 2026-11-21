// v10.8 P0 专项：战斗页三栏 / 行动单一真源 / 战况隔离 / 外物上限 / 滚动保持
// 目的（对应方案 §4.7 与 §8 的 P0 四项）：
//   1. 结构——敌方 / 我方+战况 / 行动 三栏，行动区不再落在文档流最底部；
//   2. 同源——combatActionList 是按钮顺序与键位的唯一出处，键盘与按钮不许各说各话；
//   3. 战况——只显示本场（seq > logFrom），最多 6 条，旧档无 seq 条目不混入；
//   4. 上限——外物组最多 4 行，超出折叠成「其余 N 项」，总行数 ≤ 11；
//   5. 滚动——重绘后左导航 / 中栏 / 右栏 / 战斗栏的 scrollTop 原样保留。
// 用法：node tools/test_v108_ui.js
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
/* 扩展必须加载：外物两行（兽令 / 本命法技）来自 wxcs3-ext-40 / -50 */
const fsx = fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort();
fsx.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
const D = G.D;
const EXT = window.WXCS3_EXT || {};
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
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000, logSeq: 0,
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
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  return S;
}
/* 造一场「打不坏也打不死」的战斗，只看面板结构 */
function mkFoe(hp) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: 300, rank: 12, el: 'earth', trait: 'normal', style: 'sword' },
    round: 1, observed: false, defending: false, stUsed: {}, stanceUsed: {},
    foePoison: 0, foeShred: 0, foeStun: 0, foeCalm: 0, foeGuard: 0, foeCounter: 0,
    meGuard: 0, meGuardTurns: 0, meDodge: false, meMpSave: false, meBurst: false,
    meRegen: 0, mePoison: 0, meBurn: 0, meSlow: 0, meLock: 0,
    pillCount: 0, lastPillId: null, lastPillRound: -9,
    talCd: {}, foeCd: {}, foeCharging: null, logFrom: S.logSeq || 0,
    foeIntent: { id: 'sw_atk', name: '疾剑', type: 'attack', mul: 1.0, intent: '疾剑直刺', srcId: 'sw_atk' }
  };
}
/* 从渲染出的 HTML 里按顺序取所有行动行的 data-act（含折叠行） */
function rowActs(h) {
  const rows = [];
  const re = /<li class="opt[^"]*"[^>]*data-act="([^"]*)"/g;
  let m;
  while ((m = re.exec(h))) rows.push(m[1]);
  return rows;
}
function rowCount(h) { return (h.match(/<li class="opt/g) || []).length; }

/* ============================================================
   一、结构：三栏 + 行动区在右栏 + 战况在中栏
   ============================================================ */
console.log('=== 1. 战斗页三栏结构 ===');
setup({});
S.combat = mkFoe(9e7);
S.phase = 'combat';
let h = G.renderCombat();
ok(h.indexOf('col-foe') > 0, '存在敌方栏（col-foe）');
ok(h.indexOf('col-me') > 0, '存在我方栏（col-me）');
ok(h.indexOf('col-acts') > 0, '存在行动栏（col-acts）');
ok(h.indexOf('dockrow') < 0, '底部通栏行动区已下线');
const iFoe = h.indexOf('col-foe'), iMe = h.indexOf('col-me'), iActs = h.indexOf('col-acts');
ok(iFoe < iMe && iMe < iActs, '三栏顺序：敌 → 我 → 行动');
ok(h.indexOf('战况') > iMe && h.indexOf('战况') < iActs, '战况在我方栏内（不再借用全局日志）');
ok(h.slice(iActs).indexOf('do;cbt:attack') > 0, '行动区在右栏');
ok(h.slice(iFoe, iMe).indexOf('下回合意图') > 0, '敌方意图留在敌方卡');
ok(h.indexOf('本场全部') > iMe && h.indexOf('本场全部') < iActs, '战况有「本场全部」入口');
ok(typeof G.ACT.openFightAll === 'function', 'ACT.openFightAll 存在');
ok(typeof G.ACT.openFightExt === 'function', 'ACT.openFightExt 存在');

/* CSS 侧：三栏栅格与吸顶必须真的写在样式表里（否则 JS 结构再对也白搭） */
const css = fs.readFileSync(path.join(ROOT, '问道长生v6.html'), 'utf8');
ok(/\.stage\.stage-fight\{[^}]*320px minmax\(0,1fr\) 368px/.test(css), 'CSS：三栏 320 / 1fr / 368');
ok(/\.stage\.stage-fight\{[^}]*max-width:1480px/.test(css), 'CSS：宽度从 1020 放到 1480');
ok(/\.stage\.stage-fight>\.col-acts\{position:sticky;top:70px/.test(css), 'CSS：行动栏吸顶常驻');
ok(/\.fightlog\{[^}]*max-height:208px[^}]*overflow-y:auto/.test(css), 'CSS：战况独立滚动');
ok(/@media\(max-width:1199px\)[\s\S]{0,220}col-acts\{grid-column:1\/-1/.test(css), 'CSS：1199 以下降两栏、行动通栏');
ok(/@media\(max-width:880px\)[\s\S]{0,400}col-acts\{[\s\S]{0,120}position:fixed/.test(css), 'CSS：880 以下行动区固定底部');

/* ============================================================
   二、单一真源：combatActionList / combatKeyAction
   ============================================================ */
console.log('=== 2. 行动清单与键盘同源 ===');
setup({});
S.combat = mkFoe(9e7);
S.phase = 'combat';
const list = G.combatActionList(S.combat);
const base = list.filter(function (a) { return a.grp === 'base'; });
ok(base.length === 7, '基础七项（攻/术/御/调息/器/遁/谋）', base.length);
ok(base.map(function (a) { return a.txt; }).join('') === '攻术御调息器遁谋', '基础顺序固定', base.map(function (a) { return a.txt; }).join(''));
const keys = base.map(function (a) { return a.key; });
ok(keys.join(',') === '1,2,3,4,5,6,7', '键位 1~7 连续编号', keys.join(','));
const acts = base.map(function (a) { return a.act; });
ok(acts[0] === 'do;cbt:attack', '攻 → do;cbt:attack');
ok(acts[1] === 'act:openSkills', '术 → act:openSkills');
ok(acts[2] === 'do;cbt:defend', '御 → do;cbt:defend');
ok(acts[3] === 'do;cbt:rest', '调息 → do;cbt:rest');
ok(acts[4] === 'act:openGear', '器 → act:openGear');
ok(acts[5] === 'do;cbt:flee', '遁 → do;cbt:flee');
ok(acts[6] === 'act:openWits', '谋 → act:openWits');

/* 每个可用键都能按回同一个动作；禁用项按下去与点不动一致（什么都不发生） */
let keyMismatch = [], disCount = 0;
base.forEach(function (a) {
  if (a.dis) { disCount++; if (G.combatKeyAction(a.key) !== null) keyMismatch.push(a.key + '(禁用却可派发)'); return; }
  if (G.combatKeyAction(a.key) !== a.act) keyMismatch.push(a.key);
});
ok(disCount > 0, '灵力/物资不足时确实存在禁用项（' + disCount + ' 项）');
ok(keyMismatch.length === 0, '可用键位都能找回同一条动作，禁用键不派发', keyMismatch.join('、'));
ok(G.combatKeyAction('8') === null, '没有第八项时按 8 不产生动作');

/* 渲染顺序 == 清单顺序（这正是「改数组顺序，键盘与按钮同步」的定义） */
h = G.renderCombat();
const rendered = rowActs(h);
ok(rendered.slice(0, 7).join('|') === acts.join('|'), '按钮 data-act 顺序与清单一致',
  rendered.slice(0, 7).join('|'));
/* 按钮上的数字必须就是键位 */
const keyNums = [];
base.forEach(function (a) { keyNums.push('<span class="key">' + a.key + '</span>'); });
ok(keyNums.every(function (s) { return h.indexOf(s) >= 0; }), '按钮印的数字＝键位（1~7）');

/* 神道：没有调息，编号顺延不留空号 */
setup({});
S.cultivation = 'shen';
S.xianghuo = 50;
S.combat = mkFoe(9e7);
const shenList = G.combatActionList(S.combat).filter(function (a) { return a.grp === 'base'; });
ok(!shenList.some(function (a) { return a.txt === '调息'; }), '神道不出调息（保留香火权柄）');
ok(shenList.map(function (a) { return a.key; }).join(',') ===
  shenList.map(function (a, i) { return String(i + 1); }).join(','), '神道键位顺延，不留空号',
  shenList.map(function (a) { return a.key; }).join(','));

/* 战斗中键盘派发与点击同一条动作：以御为例，两次结果必须一致 */
function actOnce(actStr) {
  setup({}); S.combat = mkFoe(9e7); S.phase = 'combat';
  S.hp = 1000;
  G.setSeed(20261121);
  G.dispatch(actStr);
  return [Math.round(S.hp), S.log.length, S.phase].join('/');
}
const viaClick = actOnce('do;cbt:defend');
const viaKey = actOnce(G.combatKeyAction('3') || '');
ok(viaClick === viaKey, '按 3 与点「御」走同一条结算', viaClick + ' vs ' + viaKey);

/* ============================================================
   三、战况：只认本场
   ============================================================ */
console.log('=== 3. 战况只显示本场 ===');
setup({});
G.logLine('开战前：进山采药一趟。', '');
const seqBefore = S.logSeq;
G.startCombat(false);
ok(!!S.combat && S.combat.logFrom === S.logSeq, 'startCombat 把起点记在 logFrom（' + (S.combat ? S.combat.logFrom : '-') + '）');
G.logLine('你一剑斩在石傀肩头。', 'good');
S.log.push({ t: '天玄历 387 年 · 春', txt: '旧档条目：进山采药一趟。', cls: '' });  // 无 seq
G.logLine('石傀还了一记重拳。', 'danger');
h = G.renderCombat();
ok(h.indexOf('你一剑斩在石傀肩头') > 0, '本场战报进战况');
ok(h.indexOf('旧档条目') < 0, '旧档无 seq 的条目不进战况');
ok(h.indexOf('进山采药') < 0, '开战前的旧纪事不进战况');

/* 最多 6 条：第 7 条起只留在「本场全部」 */
for (let i = 1; i <= 8; i++) G.logLine('第' + i + '记战况。', '');
h = G.renderCombat();
ok(h.indexOf('第8记战况') > 0 && h.indexOf('第3记战况') > 0, '最新六条在战况里');
ok(h.indexOf('第1记战况') < 0 && h.indexOf('第2记战况') < 0, '超出六条的不再挤进战况');
ok(h.indexOf('第3记战况') < h.indexOf('第8记战况'), '战况按时间正序（新的在下）');

/* 「本场全部」给完整场次 */
G.ACT.openFightAll();
const modalAll = els['modals'].innerHTML || '';
ok(modalAll.indexOf('本场战况') > 0, '「本场全部」打开战况弹窗');
ok(modalAll.indexOf('第1记战况') > 0, '弹窗含战况区放不下的条目');
ok(modalAll.indexOf('进山采药') < 0, '弹窗也不混入开战前的纪事');

/* ============================================================
   四、外物组：硬上限 4 行 + 折叠
   ============================================================ */
console.log('=== 4. 外物组上限 ===');
const fake = [];
EXT.fightRowsHooks = EXT.fightRowsHooks || [];
function fakeHook(n) {
  return function () {
    const rows = [];
    for (let i = 1; i <= n; i++) {
      rows.push(G.optRow('兽', '外物' + i, { name: '驱使', cls: 'peace' }, '第' + i + '条', false, 'do;cbt:ext:fake' + i));
    }
    return rows;
  };
}
setup({});
S.combat = mkFoe(9e7);
EXT.fightRowsHooks.push(fakeHook(4));
ok(G.combatActionList(S.combat).filter(function (a) { return a.grp === 'ext'; }).length === 4, '四个外物全部进清单');
h = G.renderCombat();
ok(h.indexOf('其余') < 0, '四条以内不折叠');
ok(rowCount(h) === 11, '基础 7 + 外物 4 = 11 行（上限内）', rowCount(h));
EXT.fightRowsHooks.pop();

EXT.fightRowsHooks.push(fakeHook(6));
h = G.renderCombat();
ok(h.indexOf('其余 3 项') > 0, '六条外物折叠为「其余 3 项」');
ok(rowCount(h) <= 11, '折叠后总行数 ≤ 11', rowCount(h));
ok(h.indexOf('外物') > 0 && h.indexOf('fightgrp') > 0, '外物独立成组（不与基础七项混排）');
ok((h.match(/data-act="do;cbt:ext:fake/g) || []).length === 3, '折叠后只渲染前三项');
G.ACT.openFightExt();
const modalExt = els['modals'].innerHTML || '';
ok((modalExt.match(/data-act="do;cbt:ext:fake/g) || []).length === 6, '「其余 N 项」面板列全六条');
EXT.fightRowsHooks.pop();

/* 外物也吃统一编号：第 8、9 项仍有键位 */
EXT.fightRowsHooks.push(fakeHook(2));
const withExt = G.combatActionList(S.combat);
const extKeys = withExt.filter(function (a) { return a.grp === 'ext'; }).map(function (a) { return a.key; });
ok(extKeys.join(',') === '8,9', '外物接在基础后面编号 8、9', extKeys.join(','));
ok(G.combatKeyAction('8') === 'do;cbt:ext:fake1', '按 8 能打到第一个外物');
EXT.fightRowsHooks.pop();

/* 第十项起不再印假数字 */
EXT.fightRowsHooks.push(fakeHook(4));
const many = G.combatActionList(S.combat).filter(function (a) { return a.act; });
ok(many[9].key === '·' && many[10].key === '·', '第十项起键位为「·」（不印按了没反应的数字）',
  many.map(function (a) { return a.key; }).join(','));
EXT.fightRowsHooks.pop();

/* ============================================================
   五、滚动位置保持
   ============================================================ */
console.log('=== 5. 重绘保住栏内滚动 ===');
setup({});
const scrollEls = {
  '.col-nav': { scrollTop: 120 },
  '.col-main': { scrollTop: 44 },
  '.col-state': { scrollTop: 330 }
};
els['stage'].querySelector = function (sel) { return scrollEls[sel] || null; };
G.render();
ok(scrollEls['.col-nav'].scrollTop === 120, '左导航滚动位置保留', scrollEls['.col-nav'].scrollTop);
ok(scrollEls['.col-main'].scrollTop === 44, '中栏滚动位置保留', scrollEls['.col-main'].scrollTop);
ok(scrollEls['.col-state'].scrollTop === 330, '右栏滚动位置保留', scrollEls['.col-state'].scrollTop);
/* 回到顶部是 0：不该被旧值顶回去 */
scrollEls['.col-main'].scrollTop = 0;
G.render();
ok(scrollEls['.col-main'].scrollTop === 0, '滚回顶部后不会被写回旧值');
/* 战斗栏也走同一条路径 */
const fightEls = {
  '.col-foe': { scrollTop: 90 }, '.col-me': { scrollTop: 20 },
  '.col-acts': { scrollTop: 12 }, '.fightlog': { scrollTop: 66 }
};
els['stage'].querySelector = function (sel) { return fightEls[sel] || scrollEls[sel] || null; };
setup({});
S.combat = mkFoe(9e7);
S.phase = 'combat';
G.render();
ok(fightEls['.col-foe'].scrollTop === 90, '战斗页敌方栏滚动位置保留', fightEls['.col-foe'].scrollTop);
ok(fightEls['.fightlog'].scrollTop === 66, '战况区滚动位置保留', fightEls['.fightlog'].scrollTop);

/* ============================================================
   六、纪事序号
   ============================================================ */
console.log('=== 6. 纪事 seq ===');
setup({});
G.logLine('第一条', '');
G.logLine('第二条', 'good');
ok(S.log[0].seq === 2 && S.log[1].seq === 1, 'logLine 自增编号，新的在前');
ok(S.log[0].cls === 'good' && S.log[1].cls === '', 'cls 语义不变');
ok(S.logSeq === 2, 'S.logSeq 随写入前进');
/* 200 条上限没被编号改动破坏 */
for (let i = 0; i < 260; i++) G.logLine('填充' + i, '');
ok(S.log.length === 200, '纪事仍只留 200 条', S.log.length);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
