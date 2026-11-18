// v9.0 M1 专项：道痕命格 / 五类天劫增强 / 构筑面板
// 三个扩展文件全部加载，验「玩家点了之后账有没有变对」。
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
/* 依赖顺序：fate 提供效果注册表 → trib 注册折骨余伤 → build 只读聚合 */
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-ext-10-fate.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-ext-20-trib.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-ext-30-build.js'), 'utf8'), ctx);
const G = window.WXCS3;
let S = G.S;
const EXT = window.WXCS3_EXT;
const D = G.D;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function setup() {
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = 'xian';
  S.xRealm = 0; S.xStage = 0; S.xiuwei = 0; S.xiuAcc = 0;
  S.stones = 5000; S.month = 1; S.year = 387; S.turn = 0; S.xun = 0;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = [];
  S.karma = 0; S.merit = 0; S.fame = 0;
  S.equipped = {};
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.tally = G.tallyInit();
  S.fate = null; S.fateReroll = 0; S.fengUntil = 0;
  S.hooks = []; S.bookRead = {}; S.insightXp = 0;
  S.afterBreak = [];
  S.sect = null; S.clan = null;
  /* render 需要的其余字段 */
  S.place = 'qingyue'; S.lingqi = 1; S.gongfa = ['juqi']; S.ownedGongfa = ['juqi'];
  S.daogong = 'juqi'; S.shenTong = []; S.skillsKnown = []; S.skillsEquip = ['zhiquan'];
  S.learnedArts = []; S.books = []; S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.pillThisMonth = false; S.prep = null; S.trib = null; S.tribLock = 0;
  S.npcs = {}; S.npcCall = null; S.benmingQuanbing = []; S.dockOpen = {};
  S.unlockStage = 0; S.inDongtian = false; S.renGong = 0; S.lastLiturgy = null;
  S.holdEvent = false; S.breakPop = null; S.enemy = false; S.enemySect = false;
  S.pendingVengeance = false; S.hdRate = 0; S.disciples = []; S.flags = {};
}
function rebind() { S = G.S; }

/* ==================== 1. 命格候选 ==================== */
console.log('=== 1. 道痕命格 · 候选 ===');
setup();
ok(typeof EXT.fateCandidates === 'function', '扩展已接通：fateCandidates 存在');
ok(EXT.fateWanted() === true, '未择痕时 fateWanted 为真');
let c0 = EXT.fateCandidates();
ok(Array.isArray(c0) && c0.length === 3, '默认给三道候选', c0.join(','));
ok(EXT.fateCandidates().join(',') === c0.join(','), '候选可复现（无随机）');
/* 行为计分：杀人多者见血途，炼丹多者见丹道 */
S.tally.kill = 20; S.tally.warWin = 6;
let c1 = EXT.fateCandidates();
ok(c1[0] === 'xuezhai', '杀伐重 → 血债偿心排第一', c1.join(','));
setup();
S.tally.pillUsed = 12;
ok(EXT.fateCandidates()[0] === 'danhuo', '炼丹多 → 丹火养命排第一', EXT.fateCandidates().join(','));
setup();
S.merit = 50;
ok(EXT.fateCandidates()[0] === 'wanxiang', '功德高 → 万家香火排第一', EXT.fateCandidates().join(','));

/* ==================== 2. 命格选择与效果 ==================== */
console.log('=== 2. 道痕命格 · 选择与效果 ===');
setup();
G.dispatch('do;fate_pick:danhuo');
rebind();
ok(S.fate && S.fate.id === 'danhuo' && S.fate.tier === 1, '择痕入账', JSON.stringify(S.fate));
ok(Math.abs(EXT.fateMul('pill') - 1.25) < 1e-9, '丹火养命：丹药效果 ×1.25', EXT.fateMul('pill'));
ok(Math.abs(EXT.fateMul('cult') - 0.95) < 1e-9, '丹火养命：行功折损 ×0.95', EXT.fateMul('cult'));
ok(EXT.fateMul('dmg') === 1, '不相关读数口不受影响', EXT.fateMul('dmg'));
ok(EXT.fateWanted() === false, '已择痕后不再排进破境手续');
G.dispatch('do;fate_pick:yijian');
rebind();
ok(S.fate.id === 'danhuo', '命格已定，二择无效', S.fate.id);
/* 修炼折损走 gainXiuwei 缝：丹火命格下每旬所得 ×0.95 */
setup();
S.xRealm = 1; S.xiuwei = 0;
G.dispatch('do;fate_pick:danhuo'); rebind();
const need1 = D.XIAN_REALMS[1].need;
const v0 = Math.round(need1 / 3);
S.xiuwei = 0;
G.gainXiuwei(v0);
rebind();
ok(S.xiuwei > 0 && S.xiuwei < v0, '命格折损经 gainXiuwei 生效（所得 < 名义值）', S.xiuwei + '/' + v0);
/* 负薪问道：读书加悟 + 月账加钱 */
setup();
G.dispatch('do;fate_pick:fuxin'); rebind();
const fc = EXT.fixedCosts();
ok(fc.length === 1 && fc[0].stones === 15, '负薪问道：月费 +15', JSON.stringify(fc));
const xi0 = S.insightXp;
/* 读书缝在道书面板函数里，这里直接走 fateAdd 读数口 */
ok(EXT.fateAdd('book') === 1, '负薪问道：读一层额外悟道 +1', EXT.fateAdd('book'));

/* ==================== 3. 进阶替换 ==================== */
console.log('=== 3. 道痕命格 · 进阶 ===');
setup();
S.fate = { id: 'danhuo', tier: 1 };
let fi = EXT.fateInfo();
ok(fi.canAdv === false, '行为不够时不可进阶', JSON.stringify(fi.canAdv));
S.tally.pillUsed = 10; S.xRealm = 2;
fi = EXT.fateInfo();
ok(fi.canAdv === true, '服丹 8 次 + 筑基 → 可进阶');
G.dispatch('do;fate_adv');
rebind();
ok(S.fate.tier === 2, '进阶替换：tier 2');
ok(Math.abs(EXT.fateMul('pill') - 1.40) < 1e-9, '进阶后丹药效果 ×1.40', EXT.fateMul('pill'));

/* ==================== 4. 重悟 ==================== */
console.log('=== 4. 道痕命格 · 重悟 ===');
setup();
S.fate = { id: 'yijian', tier: 1 };
S.xRealm = 2; S.xiuwei = 100; S.xun = 0;
G.dispatch('do;fate_rr');
rebind();
ok(S.fateReroll === 1, '重悟已用');
const need2 = D.XIAN_REALMS[2].need;
ok(S.xiuwei === Math.round(need2 * 0.3), '修为散到本境三成', S.xiuwei + '/' + Math.round(need2 * 0.3));
ok(!EXT.fateCandidates().includes('yijian'), '重悟候选不含旧痕', EXT.fateCandidates().join(','));
S.fate = { id: 'yijian', tier: 1 };
S.fateReroll = 0;
setup();
S.fate = { id: 'yijian', tier: 1 }; S.fateReroll = 1;
G.dispatch('do;fate_rr');
rebind();
ok(S.fateReroll === 1 && S.fate && S.fate.id === 'yijian', '第二次重悟被拒（一生一次）');

/* ==================== 5. 五劫 · 行为权重 ==================== */
console.log('=== 5. 五类天劫 · 行为权重 ===');
setup();
let w0 = EXT.tribWeights();
ok(w0 && typeof w0.lei === 'number', '行为权重表存在', JSON.stringify(w0));
setup();
S.karma = 60; S.tally.heartBreak = 3;
let w1 = EXT.tribWeights();
ok(w1.lei > w0.lei, '业力重 → 三问雷更近', w1.lei + '/' + w0.lei);
setup();
S.tally.kill = 10; S.hooks = [{ done: false }, { done: false }, { done: false }, { done: false }, { done: false }];
w1 = EXT.tribWeights();
ok(w1.gu > w0.gu, '恩义未清 → 故人关更近', w1.gu + '/' + w0.gu);
ok(w1.gu <= 16, '行为权重设上限，不由行为定死', w1.gu);
/* 同 seed 可复现 */
setup();
G.setSeed(12345);
const rollA = G.tribRoll();
G.setSeed(12345);
const rollB = G.tribRoll();
ok(rollA === rollB, '同 seed 同劫类', rollA + '/' + rollB);
/* 行为权重改变分布：业力极重时三问雷应显著压过固定池占比（22%） */
setup();
S.karma = 90;
let leiN = 0, N = 300;
G.setSeed(777);
for (let i = 0; i < N; i++) { if (G.tribRoll() === 'lei') leiN++; }
ok(leiN > N * 0.25, '业力极重 → 三问雷占比明显抬升', leiN + '/' + N);
/* 无灯焰：仙道法宝参与（方案红线） */
setup();
S.cultivation = 'xian';
S.arts = ['a1', 'a2'];
const huoInfo = G.tribInfo('huo');
ok(huoInfo.bonus === 0.10, '仙道有法宝 → 无灯焰有克法', huoInfo.bonus);
setup();
S.cultivation = 'xian';
ok(G.tribInfo('huo').bonus === 0, '仙道无法宝 → 无灯焰无克法');

/* ==================== 6. 五劫 · 劫类专属失败余波 ==================== */
console.log('=== 6. 五类天劫 · 失败余波 ===');
setup();
S.trib = { id: 'lei', name: '三问雷' };
S.stats.heart = 10; S.tally.heartBreak = 0;
EXT.tribFailExtra('lei');
rebind();
ok(S.stats.heart === 8, '三问雷败：道心 −2', S.stats.heart);
ok(S.tally.heartBreak === 1, '三问雷败：心魔记账 +1');
setup();
S.trib = { id: 'feng', name: '折骨风' };
S.hp = 100; S.hpMax = 100; S.turn = 5; S.xun = 0;
S.xiuwei = 50;
EXT.tribFailExtra('feng');
rebind();
ok(S.hp === 85, '折骨风败：气血再损 15', S.hp);
ok(S.fengUntil === 5 * 3 + 0 + 3, '折骨风余伤记到绝对旬', S.fengUntil);
ok(EXT.fateMul('cult') === 0.5, '余伤期内打坐折半', EXT.fateMul('cult'));
S.turn = 9; S.xun = 0;
ok(EXT.fateMul('cult') === 1, '三旬后余伤消退', EXT.fateMul('cult'));
setup();
S.trib = { id: 'gu', name: '故人关' };
EXT.tribFailExtra('gu');
rebind();
ok(S.pendingVengeance === 'person', '故人关败：旧仇上门', S.pendingVengeance);
setup();
S.trib = { id: 'huo', name: '无灯焰' };
S.equipped = { atk: 'faBao1', body: 'faBao2' };
EXT.tribFailExtra('huo');
rebind();
ok(!S.equipped.atk && S.equipped.body === 'faBao2', '无灯焰败：佩着的法宝黯淡失灵', JSON.stringify(S.equipped));
/* 预览面板四要素齐全 */
setup();
S.trib = { id: 'feng', name: '折骨风', test: '肉身', line: '风过如刀。' };
const pv = EXT.tribPreview(0.4);
ok(/劫类/.test(pv) && /克法/.test(pv) && /缺口/.test(pv) && /成功率/.test(pv), '破境预览含劫类/克法/缺口/成功率');
ok(/此劫若败/.test(pv), '预览写明失败代价');
setup();
ok(!EXT.tribPreview(0.4), '无劫在身时预览为空');

/* ==================== 7. 构筑面板 ==================== */
console.log('=== 7. 构筑面板 ===');
setup();
const dk = EXT.dockItems();
ok(dk.length === 1 && dk[0].k === '构' && dk[0].act === 'do;build', '常驻坞有「构筑」入口', JSON.stringify(dk));
let threw = null;
try { G.dispatch('do;build'); } catch (e) { threw = e; }
ok(threw === null, '构筑面板可开', threw && threw.message);
G.dispatch('do;fate_pick:shouzhuo');
rebind();
const dk2 = EXT.dockItems();
ok(dk2[0].s === '守拙藏锋', '坞位副标随命格更新', dk2[0].s);
/* 破境手续队列：afterbreak 接得住 fate */
setup();
S.afterBreak = ['fate'];
let threw2 = null;
try { G.dispatch('do;afterbreak'); } catch (e) { threw2 = e; }
ok(threw2 === null && S.afterBreak.length === 0, 'afterbreak 弹出择痕并清空队列', threw2 && threw2.message);

/* ==================== 8. 旧档迁移 ==================== */
console.log('=== 8. 旧档迁移 ===');
setup();
const out = {};
G.applyState(Object.assign({}, S, { fate: undefined, fateReroll: undefined }));
rebind();
S = G.S;
ok(S.fate === null && S.fateReroll === 0, '旧档无命格字段 → 未择痕', JSON.stringify({ fate: S.fate, rr: S.fateReroll }));

console.log('-----------------------------');
console.log(`M1: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
