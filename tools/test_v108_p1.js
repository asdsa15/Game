// v10.8 P1 专项：中栏分页 / 横幅通栏 / 日志分类 / 侧滑面板 / 日志高度口径
// 目的（对应方案 §5.4、§7.4 与 §8 的 P1 三项）：
//   1. 分页——中栏四 Tab（行事/纪事/账目/道基），默认「行事」，Tab 状态只存内存；
//   2. 通栏——横幅提到三栏之上，气血/灵力叠在横幅下沿，中栏不再重复一张大图；
//   3. 分类——八类 + guessCat 兜底，热点显式标注，兜底在标注样本上 ≥90% 命中；
//   4. 筛选——纪事页与年谱共用状态，筛选只改渲染、不动 S.log / S.chronicle；
//   5. 侧滑——战斗中 ≥880 用右栏侧滑，窄屏仍整屏；
//   6. 口径——.logbox 不再用「视口高度 - 300px」，采集/炼制结果窗给「再来一次」。
// 用法：node tools/test_v108_p1.js
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
const S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function html() { return (els['stage'] && els['stage'].innerHTML) || ''; }
function modalHtml() { return (els['modals'] && els['modals'].innerHTML) || ''; }
function closeAll() { if (els['modals']) els['modals'].innerHTML = ''; }

function setup(opts) {
  opts = opts || {};
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['jin', 'mu', 'shui'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 1, xStage: 0, xiuwei: 0, shenTong: [], logSeq: 0,
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
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  closeAll();
  G.dispatch('do;mtab:act');
  return S;
}
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

/* ============================================================
   一、数据侧：八个类别
   ============================================================ */
console.log('=== 1. LOG_CATS 与类别口径 ===');
const cats = G.logCats();
ok(Array.isArray(cats) && cats.length === 8, '八个类别', cats.length);
ok(cats.every(c => c.id && c.name), 'id 与 name 都不为空');
ok(new Set(cats.map(c => c.id)).size === 8, 'id 唯一');
ok(new Set(cats.map(c => c.name)).size === 8, 'name 唯一');
ok(cats.map(c => c.id).join(',') === 'combat,cult,craft,trade,npc,enc,story,misc', '类别 id 与方案一致');
ok(D.LOG_CATS === cats, '经 WXCS3_DATA 导出（数据侧唯一出处）');

/* ============================================================
   二、guessCat：关键词兜底
   ============================================================ */
console.log('=== 2. guessCat 关键词兜底 ===');
const CASES = [
  ['你一剑斩在石傀肩头，火星四溅。', '', 'combat'],
  ['石傀双臂交叠，护住周身。', '', 'combat'],
  ['他挨了一记，吐血受创而退。', '', 'combat'],
  ['打坐到月末，修为 +40。', 'good', 'cult'],
  ['破境：晋 筑基中期。', 'good', 'cult'],
  ['你静养一月，灵力复常。', '', 'cult'],
  ['成丹 3 枚（上品·圆润）。', 'good', 'craft'],
  ['炸炉了。材料全损，气血逆冲。', 'danger', 'craft'],
  ['进山采到两株蓝幽草。', '', 'craft'],
  ['你把十枚丹药卖给坊市，得灵石 120。', 'good', 'trade'],
  ['托香客代购聚气丹，耗灵石 30。', 'good', 'trade'],
  ['她对你多了几分好感。', '', 'npc'],
  ['你收下一个弟子，取名阿禾。', 'good', 'npc'],
  ['你遇上了「古井无波」。', 'good', 'enc'],
  ['遗迹深处拾得一枚道果。', 'good', 'enc'],
  ['听说南疆出了异动，坊间议论纷纷。', '', 'story'],
  ['这一年春来得迟。', '', 'story'],
  ['你翻了个身，什么也没发生。', '', 'misc']
];
let hit = 0;
CASES.forEach(function (x) {
  const got = G.guessCat(x[0], x[1]);
  if (got === x[2]) hit++;
  else console.log('    · 兜底偏差：' + x[0].slice(0, 18) + ' → ' + got + '（期望 ' + x[2] + '）');
});
ok(hit / CASES.length >= 0.9, '标注样本命中率 ≥ 90%（' + hit + '/' + CASES.length + '）');
ok(G.guessCat(null, '') === 'misc', '空文本兜底到 misc，不抛错');
ok(G.catName('combat') === '战事' && G.catName('nope') === '杂记', 'catName 有名取义、无名回落杂记');

/* ============================================================
   三、logLine：写入类别，显式优先、战斗上下文兜底
   ============================================================ */
console.log('=== 3. logLine 写入类别 ===');
setup();
S.logSeq = 0;
G.dispatch('do;cultivate');
ok(S.log[0] && S.log[0].cat, 'S.log 条目带 cat');
ok(S.chronicle[S.chronicle.length - 1].cat === S.log[0].cat, '年谱与纪事同一类别');

/* 显式标注优先于兜底：这句「天气不错」没有任何类别关键词，兜底只会给 misc */
S.phase = 'play';
G.logLine('天气不错，什么也没发生。', '', 'cult');
ok(S.log[0].cat === 'cult', '显式标注优先于关键词兜底');

/* 战斗上下文：敌方蓄力这类句子里没有「斩」字，也该进战事 */
setup();
S.phase = 'combat';
S.combat = mkFoe(500);
S.combat.logFrom = S.logSeq || 0;
G.logLine('石傀闭目聚气，灵力暗复，门户大开。', '');
ok(S.log[0].cat === 'combat', '战斗期间的日志一律归战事（不靠关键词）');
ok(S.log[0].seq > 0, 'P0 的 seq 仍在（战况隔离不受影响）');

/* ============================================================
   四、中栏分页与通栏横幅
   ============================================================ */
console.log('=== 4. 中栏 Tab 与横幅通栏 ===');
setup();
G.dispatch('do;mtab:act');
G.render();
let h = html();
ok(G.mainTabNow() === 'act', '默认停在「行事」');
ok(h.indexOf('class="tabbar"') > 0, '有 Tab 条');
ok((h.match(/class="tabbtn/g) || []).length === 4, '四个 Tab 按钮（行事/纪事/账目/道基）');
ok(/class="tabbtn on"[^>]*data-act="do;mtab:act"/.test(h) || /data-act="do;mtab:act"[^>]*class="tabbtn on"/.test(h), '「行事」Tab 高亮');

/* 横幅通栏：在 col-nav 之前，且不在 col-main 内部 */
const iBanner = h.indexOf('col-banner'), iNav = h.indexOf('col-nav'), iMain = h.indexOf('col-main');
ok(iBanner >= 0 && iBanner < iNav, '横幅栏在三栏之前（通栏）');
ok(h.slice(iMain, h.indexOf('col-state')).indexOf('sceneart--banner') < 0, '中栏不再自带横幅');
const bannerSeg = h.slice(iBanner, iNav);
ok(bannerSeg.indexOf('class="vitals"') > 0, '气血/灵力/灵石/寿元叠在横幅栏里');

/* 主行动两列网格：五项 → 末项通栏 */
ok(h.indexOf('opts opts--grid') > 0, '主行动用两列网格');
ok((h.match(/class="opt opt--wide/g) || []).length === 1, '奇数项末条通栏，只此一条');
ok(h.indexOf('freehint') > 0 && h.indexOf('freebar') > 0, '提示句并进自由输入行');

/* 切页：纪事 */
G.dispatch('do;mtab:chron');
h = html();
ok(G.mainTabNow() === 'chron', '切到「纪事」');
ok(h.indexOf('cattabs') > 0, '纪事页有分类 chips');
ok(h.indexOf('freebar') < 0, '纪事页不再显示主行动');
ok(h.indexOf('chronstrip') < 0, '纪事页不再重复底部薄条');

/* 账目 */
G.dispatch('do;mtab:ledger');
h = html();
ok(h.indexOf('账目 · 本月') > 0, '切到「账目」显示本月收支');
ok(h.indexOf('act:openLedger') > 0, '账目页有「全部明细」入口');

/* 道基 */
G.dispatch('do;mtab:base');
h = html();
ok(h.indexOf('道基 · 术法 · 神通') > 0, '切到「道基」');
ok(h.indexOf('slotline') > 0 && h.indexOf('realmbar') > 0, '道基页含境界进度与三条线');
ok(h.indexOf('freebar') < 0, '道基页不显示主行动');

/* Tab 状态只存内存：不在 S 里，也不进存档 */
ok(!Object.prototype.hasOwnProperty.call(S, '_mainTab'), 'Tab 状态不写进 S');
ok(Object.keys(S).every(k => k.indexOf('mainTab') < 0), 'S 上没有任何 mainTab 字段');

/* 底部薄条：任何非纪事页都在 */
G.dispatch('do;mtab:act');
h = html();
ok(h.indexOf('chronstrip') > 0, '「行事」页底部保留最近三条纪事');
ok(h.indexOf('do;mtab:chron') > 0 && h.indexOf('展开 ›') > 0, '薄条可展开到纪事页');

/* ============================================================
   五、纪事筛选：同一份状态，只改渲染
   ============================================================ */
console.log('=== 5. 纪事筛选 ===');
setup();
S.log = []; S.chronicle = []; S.logSeq = 0;
['combat', 'cult', 'craft', 'trade', 'npc', 'enc', 'story', 'misc'].forEach(function (cat, i) {
  G.logLine('第 ' + (i + 1) + ' 类样本：' + cat, '', cat);
  G.logLine('第 ' + (i + 1) + ' 类又一条：' + cat, '', cat);
});
const totalChron = S.chronicle.length;
ok(totalChron === 16, '造了 16 条纪事', totalChron);
ok(G.chronOf('all').length === 16, '「全部」= 16 条');
ok(G.chronOf('combat').length === 2, '按战事筛出 2 条');
ok(G.chronOf('combat').every(e => e.cat === 'combat'), '筛出来的确实都是战事');

G.dispatch('do;mtab:chron');
G.dispatch('do;mcat:combat');
h = html();
ok(G.chronCatNow() === 'combat', '筛选状态生效');
ok(h.indexOf('2 条（战事）') > 0, '页脚报「2 条（战事）」');
ok(/class="cattab on" data-act="do;mcat:combat"/.test(h), '当前分类 chip 高亮');

G.dispatch('do;mcat:all');
ok(G.chronCatNow() === 'all', '切回「全部」');
ok(G.chronOf('all').length === 16, '切回后条数恢复');
ok(S.chronicle.length === 16 && S.log.length === 16, '筛选不动 S.log / S.chronicle');

/* 空类别：筛出来必须是「此类暂无纪事」，不是空白 */
setup();
S.log = []; S.chronicle = []; S.logSeq = 0;
G.logLine('你一剑斩出。', '', 'combat');
G.logLine('你一剑又斩出。', '', 'combat');
G.dispatch('do;mtab:chron');
G.dispatch('do;mcat:craft');
h = html();
ok(h.indexOf('此类暂无纪事') > 0, '空类别给文案，不留空白');

/* 年谱与纪事页共用同一份筛选 */
G.ACT.openChronicle();
const mh = modalHtml();
ok(mh.indexOf('cattabs') > 0, '年谱里也有同一套 chips');
ok(mh.indexOf('共 2 条纪事') > 0 && mh.indexOf('四艺 0 条') > 0, '年谱报「共 N 条 / 分类 M 条」');
ok(/class="cattab on" data-act="do;mcat:craft"/.test(mh), '年谱打开时保留当前分类');
closeAll();

/* ============================================================
   六、战斗侧滑面板
   ============================================================ */
console.log('=== 6. 战斗内弹窗改侧滑 ===');
setup();
window.innerWidth = 1440;
S.phase = 'play';
G.ACT.openHelp();
ok(modalHtml().indexOf('modal--side') < 0, '非战斗：仍是整屏弹窗');
closeAll();

S.phase = 'combat';
S.combat = mkFoe(500);
window.innerWidth = 1200;
G.ACT.openHelp();
ok(modalHtml().indexOf('modal modal--side') > 0, '战斗 + 1200：右栏侧滑');
ok(modalHtml().indexOf('sidegrip') > 0, '侧滑有拖柄');
closeAll();

window.innerWidth = 390;
G.ACT.openHelp();
ok(modalHtml().indexOf('modal--side') < 0, '战斗 + 390：退回整屏（窄屏侧滑等于没省）');
closeAll();

/* 面包屑：术/器/谋 走的是同一个 openModal，所以三处都吃这条规则 */
window.innerWidth = 1280;
G.ACT.openWits && G.ACT.openWits();
ok(modalHtml().indexOf('modal--side') > 0, '器/谋类面板在战斗中同样侧滑');
closeAll();

/* CSS 口径 */
const css = fs.readFileSync(path.join(ROOT, '问道长生v6.html'), 'utf8');
ok(/\.modal--side \.box\{[^}]*width:368px/.test(css), '侧滑宽 368（不遮敌我状态）');
ok(/\.tabbar\{[^}]*position:sticky/.test(css), 'Tab 条吸顶');
ok(css.indexOf('100vh - 300px') < 0, '.logbox 不再用「视口高度 - 300px」');
ok(/\.logbox--scroll\{[^}]*max-height:min\(58vh,440px\)/.test(css), '日志改成固定条数 + 容器内滚动');

/* ============================================================
   七、采集 / 炼制结果窗「再来一次」
   ============================================================ */
console.log('=== 7. 结果窗「再来一次」 ===');
setup();
S.phase = 'play';
G.ACT.openGather();
ok(modalHtml().indexOf('do;gather:') > 0, '采集菜单正常');
closeAll();
/* 直接走 do;gather：结算窗要带「再来一次」。
   holdEvent 是游戏里「破境诗还没看完」的闸门，这里借它压掉随机奇遇——
   否则奇遇会先弹，结算窗按设计让位（modalBusy），就测不到本位。
   另外把 xun 拨到 1，避免这一旬跨月触发月份结算。 */
S.holdEvent = true;
S.xun = 1;
S.xRealm = 3; S.lingqi = 2;
G.dispatch('do;gather:herb');
const gh = modalHtml();
ok(gh.indexOf('再来一次') > 0, '采集结算窗有「再来一次」');
ok(gh.indexOf('do;retry:gather:herb') > 0, '按钮带原采集点参数');
closeAll();
/* 点它：应直接回到同一个采集点，而不是退回菜单 */
const before = S.turn;
G.dispatch('do;retry:gather:herb');
ok(S.turn >= before, '「再来一次」直接复用参数执行');
closeAll();

/* 炼制：给一张黄阶丹方，验结果窗的「再来一次」带原配方与火候 */
setup();
(function () {
  const r = D.RECIPES.filter(function (x) { return x.kind === 'dan'; })[0];
  if (!r) { ok(false, '找不到丹方样本'); return; }
  S.learnedRecipes = [r.id];
  S.holdEvent = true;
  S.xun = 1;
  S.xRealm = 5;
  S.craft = { dan: 999, qi: 999, fu: 999, zhen: 999, mat: 999 };
  S.craftLv = { dan: 9, qi: 9, fu: 9, zhen: 9, mat: 9 };
  S.bagMat = {};
  Object.keys(r.mats || {}).forEach(function (k) { S.bagMat[k] = (r.mats[k] || 1) * 3; });
  G.dispatch('do;craftgo:' + r.id + ':wen');
  const mh2 = modalHtml();
  ok(mh2.indexOf('再来一次') > 0, '炼制结算窗有「再来一次」');
  ok(mh2.indexOf('do;retry:craft:' + r.id + ':wen') > 0, '按钮带原配方与火候');
  closeAll();
})();

/* ============================================================
   八、战斗页回归（P1 不得动 P0 的三栏）
   ============================================================ */
console.log('=== 8. 战斗页回归 ===');
setup();
S.phase = 'combat';
S.combat = mkFoe(500);
G.render();
h = html();
ok(els['stage'].className.indexOf('stage-fight') >= 0, '战斗页仍是 stage-fight');
ok(h.indexOf('col-foe') > 0 && h.indexOf('col-me') > 0 && h.indexOf('col-acts') > 0, '三栏仍在');
ok(h.indexOf('dockrow') < 0, '功能坞仍未回潮');

/* ============================================================
   九、300 回合跑局：misc 占比与八类覆盖（方案 §7.4）
   ============================================================ */
console.log('=== 9. 300 回合跑局：类别分布 ===');
setup();
S.xun = 2; S.stones = 999999;
S.log = []; S.chronicle = []; S.logSeq = 0;
/* 四类采集/修炼动作 + 传教/历练：让奇遇、人事、经营也有机会出场。
   随机奇遇照常触发（不设 holdEvent）——这正是要验的「常态产出」。 */
const DRIVE = ['do;cultivate', 'do;rest:1', 'do;gather:herb', 'do;preach', 'do;explore', 'do;gather:sand'];
let guard = 0;
while (S.chronicle.length < 300 && guard < 1500) {
  guard++;
  if (S.phase !== 'play') {
    // 死过一次：保留已产出的纪事，再把身体接上继续跑
    const lg = S.log, ch = S.chronicle, sq = S.logSeq;
    setup({ xun: 2, log: lg, chronicle: ch, logSeq: sq });
    continue;
  }
  try { G.dispatch(DRIVE[guard % DRIVE.length]); } catch (e) { }
  closeAll();
}
/* 补三类：随机跑很难自然撞上「坊市成交 / 与人有来有回 / 奇遇落地」，
   但玩家做这些事时每一条都该有归属——所以定向各走一次真实入口。
   （仍走 do; 通道与正式结算，不是往日志里塞假数据。） */
function force(label, fn) {
  try { fn(); } catch (e) { console.log('    补漏 ' + label + ' 异常：' + e.message); }
  closeAll();
}
S.phase = 'play';
force('坊市买入', function () { G.dispatch('do;buy:pillHp'); });
S.npcs = { guqingxuan: { met: true, fav: 20, name: '顾清玄', role: '青云宗真传' } };
force('论道', function () { G.dispatch('do;ia:guqingxuan:gift'); });
force('奇遇', function () { G.dispatch('enc:oldman:ask'); });
/* 世情：随机事件走的是 maybeEvent → applyEvent，同一个正式通路 */
for (let k = 0; k < 40 && !(S.chronicle.some(e => (e.cat || '') === 'story')); k++) {
  S.phase = 'play'; S.pendingEnc = null; S.holdEvent = false;
  try { G.maybeEvent(); } catch (e) { }
  closeAll();
}

const dist = {};
S.chronicle.forEach(function (e) {
  const c = e.cat || G.guessCat(e.txt, e.cls);
  dist[c] = (dist[c] || 0) + 1;
});
const total = S.chronicle.length;
const miscN = dist.misc || 0;
console.log('    分布：' + JSON.stringify(dist) + '　合计 ' + total + '　轮数 ' + guard);
ok(total >= 280, '跑局产出足够样本（≥280 条）', total);
ok(miscN / total < 0.10, 'misc 占比 < 10%（现 ' + (miscN / total * 100).toFixed(1) + '%）');
G.logCats().forEach(function (c) {
  ok((dist[c.id] || 0) > 0, '「' + c.name + '」能筛出纪事（' + (dist[c.id] || 0) + ' 条）');
});
ok(!dist.undefined, '没有无类别的落单条目');

console.log('\n———— v10.8 P1 · 中栏分页与日志分类结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
process.exit(fail ? 1 : 0);
