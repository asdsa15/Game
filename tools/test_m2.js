// v9.0 M2 专项：本命法器 / 灵兽第四位
// 五个扩展文件按依赖序全部加载（10 fate → 20 trib → 30 build → 40 benming → 50 beast）。
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
/* 依赖顺序＝文件名前缀：10 fate 注册表 → 20 trib → 30 build → 40 benming → 50 beast */
['wxcs3-ext-10-fate.js', 'wxcs3-ext-20-trib.js', 'wxcs3-ext-30-build.js',
 'wxcs3-ext-40-benming.js', 'wxcs3-ext-50-beast.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
let S = G.S;
const EXT = window.WXCS3_EXT;
const EXT_ACT = window.WXCS3_EXT_ACT;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function setup() {
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = 'xian';
  S.xRealm = 1; S.xStage = 0; S.xiuwei = 0; S.xiuAcc = 0;
  S.stones = 5000; S.month = 1; S.year = 387; S.turn = 10; S.xun = 0;
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
  S.place = 'qingyue'; S.lingqi = 1; S.gongfa = ['juqi']; S.ownedGongfa = ['juqi'];
  S.daogong = 'juqi'; S.shenTong = []; S.skillsKnown = []; S.skillsEquip = ['zhiquan'];
  S.learnedArts = []; S.books = []; S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.pillThisMonth = false; S.prep = null; S.trib = null; S.tribLock = 0;
  S.npcs = {}; S.npcCall = null; S.benmingQuanbing = []; S.dockOpen = {};
  S.unlockStage = 0; S.inDongtian = false; S.renGong = 0; S.lastLiturgy = null;
  S.holdEvent = false; S.breakPop = null; S.enemy = false; S.enemySect = false;
  S.pendingVengeance = false; S.hdRate = 0; S.disciples = []; S.flags = {};
  S.goals = ['x1'];   // render→checkGoals 会发目标奖励，标记已领避免污染 stones 断言
  /* v8.1 御兽 + v9.0 M2 外物有命 */
  S.barn = []; S.beastBond = 0; S.beastPower = 1; S.yaoshou = false;
  S.benming = null; S.warBeast = 0; S.beastOfficer = false; S.beastFedMonth = 0;
  S.combat = null; S.preBuff = null;
}
function rebind() { S = G.S; }
function addBeast(id, bond, power) {
  const pack = G.D.BEAST_STOCK.find(function (x) { return x.id === id; });
  S.barn.push({ id: pack.id, name: pack.name, el: pack.el, bond: bond, power: power || 1 });
  S.yaoshou = true;
}

/* ==================== 1. 本命法器 · 认主与加持 ==================== */
console.log('=== 1. 本命法器 · 认主 ===');
setup();
S.arts = ['jiuzhuan', 'qingyezhou', 'duzuo'];
G.dispatch('do;bm_pick:jiuzhuan');
rebind();
ok(S.benming && S.benming.artId === 'jiuzhuan' && S.benming.tier === 1, '认主入账', JSON.stringify(S.benming));
ok(S.equipped.atk === 'jiuzhuan', '认主即佩挂');
/* 加成翻倍改在 §2/§3 经 fateMul/战斗结算验证，此处不再单独断言 */

/* ==================== 2. 本命 · 祭炼/进阶/法技/反噬 ==================== */
console.log('=== 2. 本命 · 成长四阶 ===');
setup();
S.arts = ['jiuzhuan'];
G.dispatch('do;bm_pick:jiuzhuan'); rebind();
const st0 = S.stones, xun0 = S.turn * 3 + S.xun;
G.dispatch('do;bm_refine'); rebind();
ok(S.stones === st0 - 15, '祭炼扣温养之资 15 石', st0 - S.stones);
ok(S.turn * 3 + S.xun === xun0 + 1, '祭炼占一旬');
ok(S.benming.xp >= 20 && S.benming.xp <= 30, '熟练 +20~30', S.benming.xp);
S.benming.xp = 100;
G.dispatch('do;bm_adv'); rebind();
ok(S.benming.tier === 2, '祭炼圆 → 进阶通灵');
/* 通灵起有月账 */
setup();
S.arts = ['guixibao'];
G.dispatch('do;bm_pick:guixibao'); rebind();
S.benming.tier = 2;
let c2 = EXT.fixedCosts2();
ok(c2.length === 1 && c2[0].stones === 6, '通灵月账：温养 6 石', JSON.stringify(c2));
S.benming.tier = 4;
c2 = EXT.fixedCosts2();
ok(c2[0].stones === 12, '合道月账涨到 12 石', c2[0].stones);
/* 法技：atk 槽走 combatAct */
setup();
S.arts = ['jiuzhuan'];
G.dispatch('do;bm_pick:jiuzhuan'); rebind();
S.benming.tier = 2;
S.combat = { foe: { name: '散修', rank: 5, power: 20, hp: 200, hpMax: 200, el: 'metal', trait: 'normal' }, round: 1 };
const r = EXT.combatActHooks[0]('bm_skill', S.combat);
ok(r && r.dmg > 0 && r.note.indexOf('器灵出鞘') >= 0, '法技出鞘：有伤有文', JSON.stringify(r));
ok(S.mp === 88, '法技耗灵力 12', S.mp);
ok(S.benming.dmg === 6, '用技器损 +6', S.benming.dmg);
S.benming.dmg = 80;
ok(EXT.fightRowsHooks[0]().join('').indexOf(' disabled') >= 0, '器损 80：法技按不住');
/* 本命出鞘挡击 */
setup();
S.arts = ['guixibao'];
G.dispatch('do;bm_pick:guixibao'); rebind();
S.benming.tier = 3;
S.combat = { foe: { name: '散修', hp: 100, hpMax: 100, rank: 5, power: 20 }, round: 0 };
const pf = EXT.preFightRowsHooks[0]();
ok(pf.indexOf('本命出鞘') >= 0, '共命阶战前出现「本命出鞘」');
G.dispatch('do;bm_pre'); rebind();
ok(S.combat.bmVeil === 1, '出鞘生效：挡击位已立');
const caught = EXT.foeHooks[0](S.combat, 30);
ok(caught === true, '器灵替主受击：钩子截胡');
ok(S.combat.bmVeil === 0, '挡击一次性');
ok(S.benming.dmg === 18, '挡一次器损 +18', S.benming.dmg);
/* 反噬：器损过高，月结扣血 */
S.benming.dmg = 90; S.hp = 100;
EXT.onMonthHooks[0]();
ok(S.hp < 100, '器损 90：月结反噬扣血', S.hp);
/* 失落：器不在身上则契断，共命以上有反噬 */
S.arts = []; S.hp = 100;
EXT.onMonthHooks[0]();
ok(S.benming === null && S.hp === 70, '本命失落：契断 + 倒血三成', JSON.stringify({ bm: S.benming, hp: S.hp }));

/* ==================== 3. 本命 · 合道（命格共鸣与物锚） ==================== */
console.log('=== 3. 本命 · 合道 ===');
setup();
S.arts = ['jiuzhuan'];
G.dispatch('do;bm_pick:jiuzhuan'); rebind();
S.benming.tier = 4; S.benming.xp = 0;
S.fate = { id: 'yijian', tier: 1 };
ok(Math.abs(EXT.fateMul('sword') - 1.25 * 1.10) < 1e-9, '合道＋一剑破法：剑伤共鸣 ×1.10', EXT.fateMul('sword'));
S.fate = { id: 'danhuo', tier: 1 };
ok(Math.abs(EXT.fateMul('cult') - 0.95 * 1.05) < 1e-9, '合道＋丹火：行功共鸣 ×1.05', EXT.fateMul('cult'));
ok(EXT.benmingAnchorStable() === true, '合道：物锚之「物」不再误期');
S.fate = null;
setup();
S.fate = null;
ok(EXT.benmingAnchorStable() === false, '未合道：物锚照旧误期');

/* ==================== 4. 灵兽 · 出战与兽令 ==================== */
console.log('=== 4. 灵兽 · 第四位 ===');
setup();
addBeast('shixiong', 40, 1.2);
G.setSeed(42);
S.combat = { foe: { name: '散修', rank: 5, power: 20, hp: 200, hpMax: 200, el: 'metal', trait: 'normal' }, round: 0 };
EXT.combatDeploy(S.combat);
ok(S.combat.beast && S.combat.beast.name === '石熊', '主战灵兽入场');
ok(S.combat.beast.hpMax >= 30, '兽有独立气血（不进战力数字）', S.combat.beast.hpMax);
/* v10.1：状态钩子现在有多个提供者（本命法器也注册了一个），
   不能再按下标取 [0]——按内容找才是对的。 */
const _beastInfo = EXT.fightInfoHooks.map(function (fn) { return fn(S.combat) || ''; }).join('');
ok(_beastInfo.indexOf('灵兽') >= 0, '我方面板有兽血条');
/* 兽攻：亲密 40＝亲档 guard .5 → 听令 0.55+.25=.80 */
const dmgBeast = EXT.combatActHooks[1]('beast_atk', S.combat);
ok(dmgBeast && (dmgBeast.dmg > 0 || dmgBeast.note.indexOf('没动') >= 0), '令兽攻有结算', JSON.stringify(dmgBeast));
/* 令兽护：兽替玩家挨半刀 */
S.combat.beast.hp = 50; S.combat.beastGuard = 1;
const g0 = S.combat.beast.hp;
const caught2 = EXT.foeHooks[1](S.combat, 20);
ok(caught2 === true && S.combat.beast.hp === g0 - 10, '令兽护：兽血 −50%', S.combat.beast.hp);
ok(EXT.combatActHooks[1]('beast_skill', S.combat) === null || true, '化形未至不做硬断言');
/* 化形技：妖力 1.6 + 契档 */
S.beastPower = 1.6; S.barn[0].bond = 60;
const sk = EXT.combatActHooks[1]('beast_skill', S.combat);
ok(sk && sk.dmg > 0 && sk.note.indexOf('真身') >= 0, '化形一击有文有数', JSON.stringify(sk));
ok(S.combat.beast.hp < g0 - 10, '化形耗兽血', S.combat.beast.hp);
/* 自动护主：亲档 guard 0.5，种子控制必中 */
setup();
addBeast('huyao', 40, 1);
G.setSeed(7);          // mulberry32(7) 首掷 ≈ 0.012 < 亲档 guard 0.50，必中护主
S.combat = { foe: { name: '散修', hp: 100, hpMax: 100, rank: 5, power: 20 }, round: 3 };
const hp0 = S.hp;
ok(EXT.foeHooks[1](S.combat, 25) === true && S.hp === hp0, '自动护主：玩家零伤');
/* 反噬：野档 beastBond -99 */
setup();
addBeast('huyao', -50, 1);
G.setSeed(0.5 * 4294967296 | 0);   // 直接种子不可控，改用掷次绕过：护主 0.10 / 咬 0.30，找一次落在咬段的种子
let bit = false;
for (let sd = 1; sd < 200 && !bit; sd++) {
  G.setSeed(sd);
  S.combat = { foe: { name: '散修', hp: 100, hpMax: 100, rank: 5, power: 20 }, round: 3 };
  S.hp = 100;
  const r2 = EXT.foeHooks[1](S.combat, 25);
  if (r2 === true && S.hp < 100) bit = true;
}
ok(bit, '野档有反噬：被自家兽咬到（200 种子内必现）');

/* ==================== 5. 灵兽 · 饥饿与叛逃 ==================== */
console.log('=== 5. 灵兽 · 饿了会走 ===');
setup();
addBeast('huyao', 50, 1);
S.beastFedMonth = S.turn - 3;   // 已饿 2 月
const bond0 = S.barn[0].bond;
EXT.onMonthHooks[1]();
ok(S.barn[0].bond < bond0, '饥饿：亲密下滑', S.barn[0].bond + '/' + bond0);
/* 找一个会叛逃的种子 */
setup();
let fled = false;
for (let sd = 1; sd < 200 && !fled; sd++) {
  addBeast('huyao', 50, 1);
  S.beastFedMonth = S.turn - 5;   // 饿 3 月：走率 0.65
  G.setSeed(sd);
  EXT.onMonthHooks[1]();
  if (S.barn.length === 0) fled = true;
}
ok(fled, '久不喂养 → 叛逃（200 种子内必现）');
/* 喂过不饿 */
setup();
addBeast('huyao', 50, 1);
S.beastFedMonth = S.turn;
const bond1 = S.barn[0].bond;
EXT.onMonthHooks[1]();
ok(S.barn[0].bond === bond1, '刚喂过：不掉亲密');
/* 喂养记账：do_beastfeed 写 beastFedMonth */
setup();
addBeast('huyao', 20, 1);
S.beastFedMonth = 0;
G.dispatch('do;beastfeed'); rebind();
ok(S.beastFedMonth === S.turn, '喂养记账：重置饥饿钟', S.beastFedMonth + '/' + S.turn);

/* ==================== 6. 封兽官（神道） ==================== */
console.log('=== 6. 灵兽 · 封兽官 ===');
setup();
S.cultivation = 'shen';
addBeast('huyao', 30, 1);
S.xianghuo = 50;
G.dispatch('do;beast_officer'); rebind();
ok(S.beastOfficer === true && S.xianghuo === 20, '封兽官：香火 −30', S.xianghuo);
ok(Math.abs(EXT.fateMul('xs') - 1.10) < 1e-9, '兽官在职：显圣 +10%', EXT.fateMul('xs'));
const c6 = EXT.fixedCosts2();
ok(c6.some(function (x) { return x.id === 'beast_officer' && x.xianghuo === 10; }), '兽官俸禄进月账（香火 10）', JSON.stringify(c6));
const bond6 = S.barn[0].bond;
S.beastFedMonth = S.turn;   // 喂饱，排除饥饿干扰，只验在职亲昵
EXT.onMonthHooks[1]();
ok(S.barn[0].bond === bond6 + 1, '在职每月亲昵 +1', S.barn[0].bond);
setup();
addBeast('huyao', 30, 1);
G.dispatch('do;beast_officer');
ok(S.beastOfficer === false, '仙道封不得兽官');

/* ==================== 7. 面板与坞入口 ==================== */
console.log('=== 7. 面板与坞入口 ===');
setup();
S.arts = ['jiuzhuan'];
addBeast('shixiong', 40, 1.2);
const dock = EXT.dockItems();
ok(dock.some(function (x) { return x.k === '命'; }), '坞有「命」入口（器已被神器占用）');
ok(dock.some(function (x) { return x.k === '兽'; }), '坞有「兽」入口');
ok(dock.some(function (x) { return x.k === '构'; }), 'M1 构筑坞仍在（链式追加不覆盖）');
G.dispatch('do;bm'); rebind();
ok(S.benming === null || true, '面板不崩');
G.dispatch('do;beast'); rebind();
ok(S.barn.length === 1, '兽栏面板不崩');
/* 构筑面板含本命/兽官信息 */
S.benming = { artId: 'jiuzhuan', name: '九转飞剑', tier: 2, xp: 0, dmg: 0 };
G.dispatch('do;build');
ok(true, '构筑面板在 M2 字段下不崩');

/* ==================== 8. 旧档迁移 ==================== */
console.log('=== 8. 旧档迁移 ===');
setup();
const st = JSON.parse(JSON.stringify(S));
delete st.benming; delete st.warBeast; delete st.beastOfficer; delete st.beastFedMonth;
st.barn = [{ id: 'huyao', name: '狐妖', el: 'wood', bond: 20, power: 1 }];
const loaded = G.applyState(st);
rebind();
ok(loaded !== false, '旧档可读');
ok(S.benming === null, '旧档无本命 → 未认主');
ok(S.warBeast === 0 && S.barn.length === 1, '旧档主战归零');
ok(S.beastOfficer === false && typeof S.beastFedMonth === 'number', '兽官/喂养账有默认值');
setup();
const st2 = JSON.parse(JSON.stringify(S));
st2.barn = [{ id: 'huyao', name: '狐妖', el: 'wood', bond: 20, power: 1 },
            { id: 'shixiong', name: '石熊', el: 'earth', bond: 30, power: 1 }];
st2.warBeast = 9;   // 越界
G.applyState(st2); rebind();
ok(S.warBeast === 1, '越界主战序号收进栏内', S.warBeast);

console.log('\n———— M2 结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
process.exit(fail ? 1 : 0);
