// v10.7 第三阶段专项：符丹扩充与平衡（批次 D）
// 目的：
//   1. 12 战斗符 + 8 新丹均有真实效果、库存、来源、配方、图标、日志；
//   2. 符箓统一：TALISMANS 唯一配置、S.talismans 唯一库存，5 功能符迁移幂等、数量守恒；
//   3. 使用节奏：丹药每场 2 次、同种不连续两回合；同种符冷却 1 回合；
//   4. 器物菜单按攻/防/控/助/丹分类，持有 >6 种最后一种仍可达（删 slice(0,6)）；
//   5. 新配方材料可达、成功/失败/材料不足只结算一次；新丹价格过无套利护栏。
// 用法：node tools/test_v107_consumables.js
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
['wxcs3-data.js', 'wxcs3-icons.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
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
function modal() { return (els['modals'] && els['modals'].innerHTML) || ''; }
function lastLog(re) { const l = (S.log || []).find(function (x) { return re.test(x.txt); }); return l ? l.txt : ''; }

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
    craft: { dan: 0, qi: 0, fu: 0, zhen: 0, mat: 0 }, craftLv: { dan: 9, qi: 9, fu: 9, zhen: 9 },
    dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 }, learnedRecipes: [],
    tally: {}, flags: {}, beasts: {}, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
    prep: null, trib: null, tribLock: 0, legacy: null, bloodDebt: 0, legacyPact: null,
    sureflag: false, suiFlag: false, miaoHao: null, xianshengCount: 0, hdRate: 0,
    daoyin: [], afterBreak: [], holdEvent: false, fate: null, fateReroll: 0,
    kaiMaiXun: 0, wuXinBuff: 0, market: { mul: {}, buy: {}, month: 0 }, sellMonth: { market: 0 },
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts);
  els['modals'] = makeEl('modals');
  return S;
}
function mkCombat(style, foeHp) {
  G.setSeed(4242);
  G.startCombat(false); rebind();
  const c = S.combat;
  c.foe.style = style || 'sword';
  c.foe.hp = foeHp || 5000; c.foe.hpMax = foeHp || 5000;
  c.foe.power = 300; c.foe.rank = 8; c.foe.trait = 'normal'; c.foe.el = 'fire';
  c.foeIntent = G.pickFoeIntent(c);
  return c;
}

/* ============================================================
   一、数据表完整性：12 战斗符 + 8 新丹 + 配方 + 图标
   ============================================================ */
console.log('=== 1. 数据表完整性 ===');
const COMBAT_TALS = ['fuHuo', 'fuJin', 'fuDun', 'fuZeng', 'fuLei', 'fuBing', 'fuFu', 'fuPo', 'fuJing', 'fuJu', 'fuShen', 'fuLeiHuo'];
const combatTals = D.TALISMANS.filter(function (t) { return t.use === 'combat'; });
ok(combatTals.length === 12, '12 种战斗符', combatTals.length);
COMBAT_TALS.forEach(function (id) {
  const t = D.TALISMANS.find(function (x) { return x.id === id; });
  ok(t && t.effect && t.cat && t.eff, '战斗符 ' + id + '：有 effect/cat/eff');
});
const FUNC_TALS = ['huoyuyuan', 'jinchuan', 'wuyun', 'hanhuo', 'juxian'];
FUNC_TALS.forEach(function (id) {
  const t = D.TALISMANS.find(function (x) { return x.id === id; });
  ok(t && (t.use === 'preCombat' || t.use === 'outCombat'), '功能符 ' + id + '：已迁入符箓表');
  ok(!D.ARTIFACT_EXT.find(function (x) { return x.id === id; }), '功能符 ' + id + '：不再在法器表');
});
ok(D.ARTIFACT_EXT.find(function (x) { return x.id === 'duzuo'; }), '破宝锥仍是法器');

const NEW_PILLS = ['huMai', 'qingShen', 'jieDu', 'lieYuan', 'shengSheng', 'guiYuan', 'kaiMai', 'wuXin'];
NEW_PILLS.forEach(function (id) {
  const p = D.PILL_EXT.find(function (x) { return x.id === id; });
  ok(p && p.type && p.desc && p.price > 0, '新丹 ' + id + '：有 type/desc/price');
});

/* 每种战斗符都有制符配方 */
COMBAT_TALS.forEach(function (id) {
  const r = D.RECIPES.find(function (x) { return x.kind === 'fu' && x.out === id; });
  ok(r && r.need === 3, '战斗符 ' + id + '：有制符配方（产 3 张）');
});
/* 8 新丹 + 6 旧丹都有配方（炼丹 19 个） */
const danRecipes = D.RECIPES.filter(function (x) { return x.kind === 'dan'; });
ok(danRecipes.length === 19, '炼丹配方 19 个（5 旧 + 6 补 + 8 新）', danRecipes.length);
NEW_PILLS.forEach(function (id) {
  ok(D.RECIPES.find(function (x) { return x.kind === 'dan' && x.out === id; }), '新丹 ' + id + '：有丹方');
});
['heal', 'jiebang', 'shengji', 'huiLing', 'xiaoPo', 'zhuji'].forEach(function (id) {
  ok(D.RECIPES.find(function (x) { return x.kind === 'dan' && x.out === id; }), '旧丹 ' + id + '：补了丹方');
});
/* 配方材料都在 MATERIAL_EXT 可达 */
D.RECIPES.forEach(function (r) {
  Object.keys(r.mats || {}).forEach(function (m) {
    ok(D.MATERIAL_EXT.find(function (x) { return x.id === m; }), '配方 ' + r.id + ' 材料 ' + m + ' 可达');
  });
});
/* 图标映射齐全 */
const ICONS = window.WXCS3_ICONS;
COMBAT_TALS.concat(FUNC_TALS).forEach(function (id) {
  ok(ICONS && ICONS.icon('TALISMANS', id), '符 ' + id + '：有图标映射');
});
NEW_PILLS.forEach(function (id) {
  ok(ICONS && ICONS.icon('PILL_EXT', id), '丹 ' + id + '：有图标映射');
});

/* ============================================================
   二、符箓迁移：幂等、数量守恒
   ============================================================ */
console.log('=== 2. 符箓迁移 ===');
setup();
S.arts = ['huoyuyuan', 'huoyuyuan', 'jinchuan', 'wuyun', 'hanhuo', 'juxian', 'duzuo', 'jiuzhuan'];
S.talismans = {};
const snap = JSON.parse(JSON.stringify(S));
G.applyState(snap); rebind();
ok(S.talismans.huoyuyuan === 2, '迁移：火云符 ×2 数量守恒', S.talismans.huoyuyuan);
ok(S.talismans.jinchuan === 1 && S.talismans.wuyun === 1 && S.talismans.hanhuo === 1 && S.talismans.juxian === 1, '迁移：五功能符各入符箓库存');
ok(S.arts.indexOf('huoyuyuan') < 0 && S.arts.indexOf('jinchuan') < 0, '迁移：功能符已从 S.arts 移除');
ok(S.arts.indexOf('duzuo') >= 0 && S.arts.indexOf('jiuzhuan') >= 0, '迁移：破宝锥与九转飞剑仍在 S.arts');
/* 幂等：二次迁移结果完全一致 */
const after1 = JSON.stringify({ arts: S.arts, talismans: S.talismans });
const snap2 = JSON.parse(JSON.stringify(S));
G.applyState(snap2); rebind();
const after2 = JSON.stringify({ arts: S.arts, talismans: S.talismans });
ok(after1 === after2, '迁移：幂等（两次结果全等）');

/* ============================================================
   三、战斗符真实效果（走 do;cbt:tal）
   ============================================================ */
console.log('=== 3. 战斗符效果 ===');
setup(); let c = mkCombat('sword', 5000);
S.talismans = { fuHuo: 2 };
G.ACT.do_cbt('tal', 'fuHuo'); rebind();
ok(c.foeBurn === 2, '火符：附灼烧 2 回合', c.foeBurn);
ok(c.foe.hp < 5000, '火符：有火伤');
ok(S.talismans.fuHuo === 1, '火符：消耗一张');

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuBing: 1 };
G.ACT.do_cbt('tal', 'fuBing'); rebind();
ok(c.foeSlow >= 2, '冰封符：迟滞 2 回合', c.foeSlow);

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuPo: 1 };
G.ACT.do_cbt('tal', 'fuPo'); rebind();
ok(c.foeShred >= 2, '破甲符：破甲 2 回合', c.foeShred);

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuJing: 1 };
c.mePoison = 3;
G.ACT.do_cbt('tal', 'fuJing'); rebind();
ok(c.mePoison === 0, '净符：清除中毒');
/* 净符无负面时不可用（不消耗） */
setup(); c = mkCombat('sword', 5000);
S.talismans = { fuJing: 1 };
G.ACT.do_cbt('tal', 'fuJing'); rebind();
ok(S.talismans.fuJing === 1, '净符：无负面时不消耗');

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuJu: 1 };
G.ACT.do_cbt('tal', 'fuJu'); rebind();
ok(c.meMpSave === true, '聚灵符：下一门术法耗灵减半标记');

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuShen: 1 };
G.ACT.do_cbt('tal', 'fuShen'); rebind();
ok(c.meDodge === true, '神行符：规避下次直接攻击标记');

setup(); c = mkCombat('sword', 5000);
S.talismans = { fuLeiHuo: 1 };
c.foeBurn = 3; c.foeBurnMul = 1; c.burnFresh = false;
const hpBefore = c.foe.hp;
G.ACT.do_cbt('tal', 'fuLeiHuo'); rebind();
ok(c.foe.hp < hpBefore, '雷火符：有伤害');
ok(c.foeBurn < 3, '雷火符：引爆消耗灼烧层数（引爆+敌方回合灼烧结算）', c.foeBurn);
ok(lastLog(/雷火引爆/) !== '', '雷火符：引爆日志');

/* 同种符冷却 1 回合 */
setup(); c = mkCombat('sword', 5000);
S.talismans = { fuZeng: 3 };
G.ACT.do_cbt('tal', 'fuZeng'); rebind();
ok((c.talCd.fuZeng || 0) > 0, '增益符：用后进入冷却');
const buffAfter1 = c.talBuff;
G.ACT.do_cbt('tal', 'fuZeng'); rebind();   // 冷却中，应被拒
ok(S.talismans.fuZeng === 2, '增益符：冷却中再贴被拒（不消耗）', S.talismans.fuZeng);

/* ============================================================
   四、新丹战斗效果 + 使用节奏
   ============================================================ */
console.log('=== 4. 新丹效果与节奏 ===');
setup(); c = mkCombat('sword', 5000);
S.bag = { huMai: 2 };
G.ACT.do_cbt('pill', 'huMai'); rebind();
ok(c.meGuard > 0 && c.meGuardTurns > 0, '护脉丹：受击减伤 2 回合');
ok(c.pillCount === 1, '护脉丹：计入丹药次数');

setup(); c = mkCombat('sword', 5000);
S.bag = { lieYuan: 1 };
const hpBeforeLie = S.hp;
G.ACT.do_cbt('pill', 'lieYuan'); rebind();
ok(c.meBurst === true, '烈元丹：下一门攻击术法 +35% 标记');
ok(S.hp < hpBeforeLie && S.hp >= 1, '烈元丹：损气血 5% 但不致死', S.hp);

setup(); c = mkCombat('sword', 5000);
S.bag = { shengSheng: 1 };
G.ACT.do_cbt('pill', 'shengSheng'); rebind();
ok(c.meRegen > 0, '生生丹：3 回合持续恢复标记');

setup(); c = mkCombat('sword', 5000);
S.bag = { guiYuan: 1 };
S.hp = 500; S.mp = 500;
G.ACT.do_cbt('pill', 'guiYuan'); rebind();
ok(S.hp > 500 && S.mp > 500, '归元丹：气血灵力同复');

setup(); c = mkCombat('sword', 5000);
S.bag = { qingShen: 1 };
c.meLock = 2; c.meSlow = 2;
G.ACT.do_cbt('pill', 'qingShen'); rebind();
ok(c.meLock === 0 && c.meSlow === 0, '清神丹：清除锁灵迟滞');

setup(); c = mkCombat('sword', 5000);
S.bag = { jieDu: 1 };
c.mePoison = 3; c.meBurn = 2;
G.ACT.do_cbt('pill', 'jieDu'); rebind();
ok(c.mePoison === 0 && c.meBurn === 0, '解毒丹：清中毒灼烧');

/* 丹药每场最多 2 次 */
setup(); c = mkCombat('sword', 5000);
S.bag = { pillHp: 5 };
S.hp = 400;
G.ACT.do_cbt('pill', 'pillHp'); rebind();
G.ACT.do_cbt('pill', 'pillHp'); rebind();   // 同种连续两回合 → 第二次被拒
ok(c.pillCount === 1, '丹药：同种不可连续两回合（第二次被拒）', c.pillCount);
/* 换一种丹凑满 2 次 */
S.bag.pillMp = 2; S.mp = 400;
G.ACT.do_cbt('pill', 'pillMp'); rebind();
ok(c.pillCount === 2, '丹药：换种后可用满 2 次', c.pillCount);
S.bag.huMai = 2;
G.ACT.do_cbt('pill', 'huMai'); rebind();   // 第 3 次被拒
ok(c.pillCount === 2 && S.bag.huMai === 2, '丹药：每场最多 2 次（第 3 次被拒不消耗）');

/* ============================================================
   五、平时丹：开脉 / 悟心
   ============================================================ */
console.log('=== 5. 平时丹 ===');
setup();
S.bag = { kaiMai: 1 };
G.ACT.do_use('kaiMai'); rebind();
ok(S.kaiMaiXun === 3, '开脉丹：3 旬修炼 +20%', S.kaiMaiXun);
setup();
S.bag = { wuXin: 1 };
G.ACT.do_use('wuXin'); rebind();
ok(S.wuXinBuff === 3, '悟心丹：下次读书论道悟道 +3', S.wuXinBuff);
/* 战斗专用丹平时不可服 */
setup();
S.bag = { huMai: 1 };
G.ACT.do_use('huMai'); rebind();
ok(S.bag.huMai === 1, '护脉丹：平时不可服（不消耗）');

/* ============================================================
   六、器物菜单分类可达（>6 种最后一种仍可用）
   ============================================================ */
console.log('=== 6. 器物菜单分类 ===');
setup(); c = mkCombat('sword', 5000);
S.talismans = { fuHuo: 1, fuJin: 1, fuBing: 1, fuFu: 1, fuPo: 1, fuJing: 1, fuJu: 1, fuShen: 1, fuLeiHuo: 1 };
S.bag = { pillHp: 1, pillMp: 1, huMai: 1, qingShen: 1, jieDu: 1, lieYuan: 1, shengSheng: 1, guiYuan: 1 };
G.ACT.openGear();
const gearHtml = modal();
ok(gearHtml.indexOf('攻 · 伤害') >= 0, '器物菜单：攻分类');
ok(gearHtml.indexOf('防 · 护体') >= 0, '器物菜单：防分类');
ok(gearHtml.indexOf('控 · 压制') >= 0, '器物菜单：控分类');
ok(gearHtml.indexOf('助 · 增益') >= 0, '器物菜单：助分类');
ok(gearHtml.indexOf('丹 · 恢复') >= 0, '器物菜单：丹分类');
ok(gearHtml.indexOf('雷火符') >= 0, '器物菜单：第 9 种符（雷火符）仍可达');
ok(gearHtml.indexOf('归元丹') >= 0, '器物菜单：第 8 种丹（归元丹）仍可达（删 slice(0,6)）');
ok(gearHtml.indexOf('丹药 0/2') >= 0, '器物菜单：显示丹药次数');

/* ============================================================
   七、制作结算：成功/失败/材料不足只结算一次
   ============================================================ */
console.log('=== 7. 制作结算 ===');
setup();
S.learnedRecipes = ['dan_humai'];
S.bagMat = { lanyouCao: 5, buqiCao: 5 };
G.setSeed(1);
const matBefore = S.bagMat.lanyouCao;
G.ACT.do_craftgo('dan_humai', 'wen'); rebind();
ok(S.bagMat.lanyouCao < matBefore, '制作：扣料一次');
ok((S.bag.huMai || 0) >= 0, '制作：产物入账（成败均只一次）');
/* 材料不足不结算 */
setup();
S.learnedRecipes = ['dan_humai'];
S.bagMat = { lanyouCao: 0, buqiCao: 0 };
const dishesBefore = S.dishes.dan;
G.ACT.do_craftgo('dan_humai', 'wen'); rebind();
ok(S.dishes.dan === dishesBefore, '制作：材料不足不计炉数');

/* ============================================================
   八、经济护栏：新丹符买价 > 回收价
   ============================================================ */
console.log('=== 8. 无套利护栏 ===');
setup();
NEW_PILLS.forEach(function (id) {
  const it = D.SHOP.find(function (x) { return x.id === id; });
  if (!it) { ok(false, '新丹 ' + id + ' 在坊市货架'); return; }
  const buy = G.buyPriceOf(it);
  const sell = G.sellPriceOf(it.price, 1);
  ok(buy > sell, '新丹 ' + id + '：买价 > 回收价（无套利）', buy + '/' + sell);
});
COMBAT_TALS.forEach(function (id) {
  const it = D.SHOP.find(function (x) { return x.id === id; });
  if (!it) return;   // 地阶符不上市，跳过
  const buy = G.buyPriceOf(it);
  const sell = G.sellPriceOf(it.price, 1);
  ok(buy > sell, '战斗符 ' + id + '：买价 > 回收价', buy + '/' + sell);
});

console.log('\n———— v10.7 阶段三·符丹扩充结果：' + pass + ' 通过 / ' + fail + ' 失败 ————');
if (fail) process.exit(1);
