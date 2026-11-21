// v10.7 第二阶段专项：破境 FIFO + 筑基锻造本命 + 普通法器解除认主 + 旧档迁移
// 目的：
//   1. 破境手续是可靠 FIFO——每一步完成才摘、读档能续、重复点不重复发；
//   2. 本命独立——练气期买普通法器不能认主；筑基仪式五器形行为确有差异；
//   3. 普通法器加成不再翻倍；旧本命按物映射器形迁移，幂等；
//   4. 筑基以上无本命可补铸；纯神道不被强制转仙道。
// 用法：node tools/test_v107_natal.js
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
const fsx = fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort();
fsx.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
const D = G.D;
const EXT = window.WXCS3_EXT;
let S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function modal() { return (els['modals'] && els['modals'].innerHTML) || ''; }
function rebind() { S = G.S; }

function setup(opts) {
  opts = opts || {};
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 2, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
    hp: 1000, hpMax: 1000, mp: 100, mpMax: 1000,
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
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  els['modals'] = makeEl('modals');
  return S;
}
/* 走玩家路径铸一件本命：开仪式 → 择器形 → 择五行 → 铸成 */
function forge(form, el) {
  EXT.openNatalForge();
  G.dispatch('do;bm_forgeForm:' + (form || 'sword'));
  G.dispatch('do;bm_forgeEl:' + (el || 'metal'));
  G.dispatch('do;bm_forgeDo');
  rebind();
}

/* ============================================================
   一、破境手续：可靠 FIFO
   ============================================================ */
console.log('=== 1. 破境手续 FIFO ===');
setup();
S.xianji = null; S.xRealm = 2;
S.afterBreak = ['xianji', 'forge', 'daoyin', 'shentong', 'fate'];
G.dispatch('do;afterbreak'); rebind();
ok(modal().indexOf('筑基 · 仙基与道统') >= 0, '第一步：仙基面板打开');
ok(S.afterBreak.length === 5 && S.afterBreak[0] === 'xianji', '未完成不摘队头（读档可续）');

G.dispatch('do;afterbreak_done:xianji'); rebind();
ok(S.afterBreak[0] === 'forge' && S.afterBreak.length === 4, '仙基完成 → 队头变锻造');
ok(modal().indexOf('本命 · 择器形') >= 0, '锻造面板自动打开');

G.dispatch('do;bm_forgeForm:sword'); rebind();
ok(modal().indexOf('本命 · 择主五行') >= 0, '择器形 → 择五行');
G.dispatch('do;bm_forgeEl:metal'); rebind();
ok(modal().indexOf('本命 · 正名与法技') >= 0, '择五行 → 正名与预览');
G.dispatch('do;bm_forgeDo'); rebind();
ok(S.benming && S.benming.form === 'sword', '铸成：本命入账');
ok(S.afterBreak[0] === 'daoyin' && S.afterBreak.length === 3, '锻造完成 → 道印');
ok(modal().indexOf('道途四印') >= 0, '道印面板自动打开');

G.dispatch('do;yin:gan:0'); rebind();
ok(S.daoyin.length === 1, '得一枚干印');
ok(S.afterBreak[0] === 'shentong' && S.afterBreak.length === 2, '道印完成 → 神通（旧版断链已修）');

G.dispatch('do;st:' + encodeURIComponent('惊雷引')); rebind();
ok(S.shenTong.indexOf('惊雷引') >= 0, '得神通');
ok(S.afterBreak.length === 1 && S.afterBreak[0] === 'fate', '神通完成 → 命格');

/* 读档续接：中途存档再读，队列仍在，能继续办 */
setup();
S.xRealm = 2; S.afterBreak = ['daoyin', 'shentong'];
const snap = JSON.parse(JSON.stringify(S));
G.applyState(snap); rebind();
ok(S.afterBreak[0] === 'daoyin' && S.afterBreak.length === 2, '读档后破境队列仍在');
G.dispatch('do;afterbreak'); rebind();
ok(modal().indexOf('道途四印') >= 0, '读档后能从断点继续');

/* 重复点击：不生成第二件本命 */
setup();
S.xRealm = 2;
forge('seal');
const bmOne = JSON.stringify(S.benming);
G.dispatch('do;bm_forgeDo'); rebind();
ok(JSON.stringify(S.benming) === bmOne, '重复点「铸成」不生成第二件本命');

/* ============================================================
   二、普通法器解除认主
   ============================================================ */
console.log('=== 2. 普通法器解除认主 ===');
setup();
S.xRealm = 1; S.arts = ['jiuzhuan']; S.equipped = { atk: 'jiuzhuan' };
G.dispatch('do;bm'); rebind();
ok(S.benming === null, '练气期买九转飞剑只有普通法器');
ok(modal().indexOf('筑基时可铸') >= 0, '面板只写「筑基时可铸」，不列普通法器候选');
ok(typeof G.ACT.bm_pick === 'undefined', '认主动作 bm_pick 已下线');
ok(EXT.benmingArtBonus === undefined, '旧「认主翻倍」缝口已删除');
const jz = D.ARTIFACT_EXT.find(function (x) { return x.id === 'jiuzhuan'; });
ok(jz && jz.bonus.atk === 0.25, '普通法器加成仍是 0.25（不翻倍）');
ok(jz.eff.indexOf('可为本命') < 0, '九转飞剑文案删除「可为本命」');

/* ============================================================
   三、筑基锻造：五器形
   ============================================================ */
console.log('=== 3. 筑基锻造 · 五器形 ===');
setup();
S.xRealm = 1;
ok(EXT.openNatalForge() === false && S.benming === null, '未筑基不能铸');

setup();
S.xRealm = 2; S.craft = { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 };
EXT.openNatalForge();
ok(modal().indexOf('本命 · 择器形') >= 0, '筑基后进入强制锻造仪式');
ok(S.craft.qi === 0 && S.xun === 0, '仪式不额外占旬、不查炼器');
G.dispatch('do;bm_forgeForm:mirror');
G.dispatch('do;bm_forgeEl:water');
G.dispatch('do;bm_forgeDo'); rebind();
ok(S.benming.form === 'mirror' && S.benming.el === 'water', '器形与五行按玩家选择落账');
ok(S.benming.name === '宝镜·水', '默认可正名：器形 + 五行', S.benming.name);
ok(S.benming.tier === 1 && S.benming.xp === 0 && S.benming.dmg === 0 && S.benming.ver === 2, '初始为 ver:2 一阶本命');
ok((S.arts || []).indexOf('mirror') < 0, '本命不进 S.arts');
ok(!S.equipped || Object.keys(S.equipped).length === 0, '本命不占普通装备槽');

/* 五器形法技与被动确有差异 */
setup(); S.xRealm = 2; forge('sword');
S.benming.tier = 2;
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400, rank: 5, power: 20 }, round: 1 };
const rSw = EXT.combatActHooks[0]('bm_skill', S.combat);
ok(rSw && rSw.dmg > 0 && rSw.note.indexOf('剑魄斩') >= 0, '飞剑法技：剑魄斩有伤');
ok(Math.abs(EXT.natalDamageMul({ kind: 'sword' }, S.combat) - 1.12) < 1e-9, '飞剑被动：剑系术法 ×1.12');
ok(Math.abs(EXT.natalDamageMul({ kind: 'fire' }, S.combat) - 1) < 1e-9, '飞剑被动不惠及非剑系');

setup(); S.xRealm = 2; forge('seal'); S.benming.tier = 2;
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400, rank: 5, power: 20 }, round: 1 };
EXT.combatActHooks[0]('bm_skill', S.combat);
ok((S.combat.foeWeaken || 0) >= 2, '法印法技：压制 2 回合（被动延长）');

setup(); S.xRealm = 2; forge('mirror'); S.benming.tier = 2;
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400, rank: 5, power: 20 }, round: 1 };
ok(EXT.natalOnCombatStart(S.combat) === undefined && S.combat.observed === true, '宝镜被动：开战即照见破绽');
EXT.combatActHooks[0]('bm_skill', S.combat);
ok(S.combat.observed === true && (S.combat.foeMark || 0) >= 2, '宝镜法技：看破 + 破绽');

setup(); S.xRealm = 2; forge('bell'); S.benming.tier = 2;
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400, rank: 5, power: 20 }, round: 1 };
ok(Math.abs(EXT.natalIncomingMul(S.combat) - 0.94) < 1e-9, '神钟被动：常驻减伤 6%');
EXT.combatActHooks[0]('bm_skill', S.combat);
ok((S.combat.talShield || 0) >= 0.30, '神钟法技：获得护体');

setup(); S.xRealm = 2; forge('banner'); S.benming.tier = 2;
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400, rank: 5, power: 20, foeBurn: 0 }, round: 1 };
EXT.combatActHooks[0]('bm_skill', S.combat);
ok((S.combat.foeBurn || 0) >= 2, '魂幡法技：施加灼烧');
ok(Math.abs(EXT.natalDamageMul(null, S.combat) - 1.15) < 1e-9, '魂幡被动：对灼烧之敌 +15%');

/* 通灵前没有法技入口；器损过高不能出手 */
setup(); S.xRealm = 2; forge('sword');
S.combat = { foe: { name: '散修', hp: 400, hpMax: 400 }, round: 1 };
ok(EXT.fightRowsHooks[0]().length === 0, '一阶（未通灵）没有法技入口');
S.benming.tier = 2; S.benming.dmg = 80;
ok(EXT.fightRowsHooks[0]().join('').indexOf(' disabled') >= 0, '器损 80：法技按钮不可用');
ok(EXT.combatActHooks[0]('bm_skill', S.combat) === null, '器损 80：法技不出手');

/* ============================================================
   四、旧档迁移
   ============================================================ */
console.log('=== 4. 旧档迁移 ===');
function migrateOnce(oldBm, arts) {
  setup();
  S.arts = arts || ['jiuzhuan'];
  const st = JSON.parse(JSON.stringify(S));
  st.benming = oldBm;
  G.applyState(st); rebind();
  return JSON.parse(JSON.stringify(S.benming));
}
const m1 = migrateOnce({ artId: 'jiuzhuan', name: '青锋', tier: 3, xp: 55, dmg: 12 });
ok(m1 && m1.ver === 2 && m1.form === 'sword', '九转飞剑 → 飞剑器形');
ok(m1.name === '青锋' && m1.tier === 3 && m1.xp === 55 && m1.dmg === 12, '保留自定义名、四阶、祭炼与器损');
ok(m1.legacyArtId === 'jiuzhuan', '记录旧物来源（便于追溯）');
ok(S.arts.indexOf('jiuzhuan') >= 0, '原普通法器仍在 S.arts');
const m1b = migrateOnce(m1, ['jiuzhuan']);
ok(JSON.stringify(m1b) === JSON.stringify(m1), '迁移执行两次结果完全一致（幂等）');
ok(migrateOnce({ artId: 'wanlingfan', tier: 1 }).form === 'banner', '万灵幡 → 魂幡');
ok(migrateOnce({ artId: 'taiyinBao', tier: 1 }).form === 'mirror', '太阴宝鉴 → 宝镜');
ok(migrateOnce({ artId: 'guixibao', tier: 1 }).form === 'bell', '护身玉符 → 神钟');
ok(migrateOnce({ artId: 'qingyezhou', tier: 1 }).form === 'mirror', '青叶舟（移行器）→ 宝镜');
const bad = migrateOnce({ artId: 'nope', tier: 99, xp: 'x', dmg: -3 });
ok(bad.form === 'sword' && bad.tier === 4 && bad.xp === 0 && bad.dmg === 0, '残缺旧档按安全默认值修复');

/* ============================================================
   五、补铸与神道
   ============================================================ */
console.log('=== 5. 补铸与神道 ===');
setup();
S.xRealm = 3; S.xianji = '天基'; S.daoyin = [{ kind: 'gan', g: 0, z: null, name: '甲' }];
S.shenTong = ['惊雷引']; S.fate = { id: 'yijian', tier: 1 };
G.dispatch('do;bm'); rebind();
ok(modal().indexOf('补铸本命') >= 0, '筑基以上无本命：面板提供补铸');
G.dispatch('do;bm_forge'); rebind();
ok(modal().indexOf('本命 · 择器形') >= 0, '补铸走同一器形选择');
G.dispatch('do;bm_forgeForm:bell'); G.dispatch('do;bm_forgeEl:earth'); G.dispatch('do;bm_forgeDo'); rebind();
ok(S.benming && S.benming.forgedRealm === 3, '补铸本命入账（记录铸造境界）');
ok(S.daoyin.length === 1 && S.shenTong.length === 1 && S.fate && S.fate.id === 'yijian', '补铸不伪造破境、不重发其他奖励');

setup();
S.cultivation = 'shen'; S.xRealm = 2; S.pillar = 2;
ok(EXT.openNatalForge() === true, '纯神道：仪式不进入（视为已处理）');
ok(S.benming === null, '纯神道不被强制转仙道本命');
G.dispatch('do;bm'); rebind();
ok(modal().indexOf('神道自有香火权柄') >= 0, '神道本命面板写明不铸仙道本命');

/* ============================================================
   六、数据表
   ============================================================ */
console.log('=== 6. 数据表 ===');
ok((D.NATAL_FORMS || []).length === 5, 'NATAL_FORMS 五器形');
const ids = D.NATAL_FORMS.map(function (f) { return f.id; }).sort().join(',');
ok(ids === 'banner,bell,mirror,seal,sword', '器形集合正确', ids);
ok(D.NATAL_FORMS.every(function (f) { return f.passive && f.skill && f.desc; }), '每种器形都有被动、法技、描述');
const passives = D.NATAL_FORMS.map(function (f) { return f.passive; });
ok(new Set(passives).size === 5, '五种被动互不相同');

console.log('\n———— v10.7 阶段二结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
if (fail) process.exit(1);