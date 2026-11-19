// v10.1 第二梯队专项：功法差异 + 灵根差异
// 目的：把方案里「换了功法/灵根玩起来一样」的两条诊断，变成可回归的断言。
// 一并守住两条护栏：① effect 表与文案不打架 ② 每个承诺都有结算出口。
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

// 加载顺序与 HTML 一致：data → rules → game → ext-*
const FILES = ['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'];
fs.readdirSync(ROOT).filter(function (f) {
  return /^wxcs3-ext-.*\.js$/.test(f);
}).sort().forEach(function (f) { FILES.push(f); });
FILES.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
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

function setup(opts) {
  opts = opts || {};
  S = G.S;
  S.phase = 'play'; S.started = true;
  S.age = opts.age === undefined ? 40 : opts.age;
  S.lifeMax = opts.lifeMax === undefined ? 200 : opts.lifeMax;
  S.lifeStop = false;
  S.cultivation = opts.cultivation || 'xian';
  S.root = opts.root || 'true_';
  S.rootEls = opts.rootEls || ['jin', 'mu', 'shui'];
  S.gongfa = opts.gongfa || ['juqi'];
  S.daogong = opts.daogong || null;
  S.ownedGongfa = opts.ownedGongfa || [].concat(S.gongfa);
  S.body = opts.body || 'plain';
  S.xRealm = opts.xRealm === undefined ? 1 : opts.xRealm;
  S.xStage = 0; S.xiuwei = 0; S.shenTong = [];
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.stones = 1000; S.month = 3; S.year = 387; S.turn = 0;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.arts = []; S.disks = []; S.craftedQ = {};
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.combat = null; S.preBuff = null; S.talismans = {};
  S.pillar = 2; S.pos = 0; S.guowei = null; S.miao = 0; S.miaoUp = {};
  S.followers = 1000; S.piety = 1; S.xianghuo = 0; S.meditate = false;
  S.arrears = 0; S.templeBroken = false; S.lingqi = 1;
  return S;
}

/* ============================================================
   一、功法 effect 数据化：承诺必须有结算出口
   ============================================================ */
console.log('=== 1. 功法 effect 数据化 ===');

const audit = EXT.gongfaAudit();
ok(audit.length === D.GONGFA_EXT.length, 'effect 审计覆盖全部 ' + D.GONGFA_EXT.length + ' 本功法');

const effCount = audit.filter(function (r) { return r.hasEffect; }).length;
ok(effCount >= 30, '已有结算出口的功法 >= 30 本（实际 ' + effCount + '）',
   '只有 ' + effCount + ' 本');

/* 方案点名的空头支票，逐条验「现在有落点」 */
const MUST = [
  ['yufeng', '御风术 遁速 +5%'],
  ['guixi', '龟息延年诀 寿元 +10'],
  ['jinguang', '金光咒 减伤一成'],
  ['meihua', '梅花易 机缘 +6'],
  ['zixiao', '紫霄雷法 需雷灵根'],
  ['tianhe', '天河剑诀 伤害 +50%'],
  ['butian', '补天真经 寿元上限 +80'],
  ['xuanyuan', '玄元剑经 剑系威力 +40%']
];
const missing = [];
MUST.forEach(function (m) {
  const info = EXT.gongfaInfo(m[0]);
  if (!info || !info.hasEffect) missing.push(m[1]);
});
ok(missing.length === 0, '方案点名的 8 条空头支票全部有结算出口', missing.join('；'));

/* 文案里的数值必须能在 effect 文本里找到对应项（文账一致） */
const BAD_CLAIM = [
  { id: 'xuanyuan', kw: '40', field: '剑系' },
  { id: 'tianhe', kw: '50', field: '伤害' },
  { id: 'guixi', kw: '10', field: '寿元' },
  { id: 'butian', kw: '80', field: '寿元' },
  { id: 'meihua', kw: '6', field: '机缘' }
];
const claimMiss = [];
BAD_CLAIM.forEach(function (c) {
  const info = EXT.gongfaInfo(c.id);
  if (!info) { claimMiss.push(c.id + ' 查不到'); return; }
  if (info.eff.indexOf(c.kw) >= 0 && info.text.indexOf(c.field) < 0) {
    claimMiss.push(info.name + ' 文案写 ' + c.kw + '，effect 里没有' + c.field);
  }
});
ok(claimMiss.length === 0, '文案承诺的数值都能在结算表里找到对应项', claimMiss.join('；'));

/* ============================================================
   二、施法接功法：换功法必须换手感
   ============================================================ */
console.log('=== 2. 施法接功法 ===');

setup({ gongfa: ['juqi'] });
const pJuqi = EXT.castMulProbe(null, 'juqi');
setup({ gongfa: ['bailian'] });
const pBailian = EXT.castMulProbe(null, 'bailian');
ok(pBailian.mul > pJuqi.mul, '仙阶功法施法强于入门功法（' + pJuqi.mul.toFixed(2) + ' → ' + pBailian.mul.toFixed(2) + '）');
ok(pBailian.mul / pJuqi.mul >= 1.5, '仙阶对入门至少 1.5 倍差（实际 ' + (pBailian.mul / pJuqi.mul).toFixed(2) + '）');

/* 同为地阶，有专属 effect 的必须强于没有的 */
const pTianhe = EXT.castMulProbe(null, 'tianhe');
const pJiuhuan = EXT.castMulProbe(null, 'jiuhuan');
ok(pTianhe.mul > pJiuhuan.mul, '同阶中「伤害+50%」的天河剑诀强于无专属的九寰天书');

/* 五行匹配的两条口径必须分清楚：
   ① 用「招式」打（sub='skill'）：五行取招式自己的 kind；
   ② 用「施法」打（sub='cast'）：没有招式，五行取功法自己的 el。
   同一本功法施法，结果必须与招式无关（都是功法自己的路子）； */
const castLiehuo1 = EXT.castMulProbe(null, 'liehuo');
const castLiehuo2 = EXT.castMulProbe('冰魄诀', 'liehuo');
ok(castLiehuo1.mul >= 0, '烈火掌施法有功法乘区');
ok(Math.abs(castLiehuo1.mul - castLiehuo2.mul) < 1e-9, '施法伤害只由功法决定，与招式无关（口径正确）');

/* 而同一本火属功法，配「火系招式」要强于配「水系招式」——招式侧才看 kind */
const skillFire = EXT.castMulProbe('焚山掌', 'liehuo');
const skillWater = EXT.castMulProbe('寒水箭', 'liehuo');
ok(skillFire.skillFound && skillWater.skillFound, '测试用的招式名在 SKILLS 里真实存在');
ok(skillFire.mul > skillWater.mul, '火属功法配火系招式强于配水系招式（' + skillFire.mul.toFixed(2) + ' vs ' + skillWater.mul.toFixed(2) + '）');

/* 灵根门槛：紫霄雷法需要雷灵根 */
setup({ rootEls: ['jin', 'mu', 'shui'] });
const zxNo = EXT.castMulProbe(null, 'zixiao');
setup({ rootEls: ['thunder', 'jin', 'shui'] });
const zxYes = EXT.castMulProbe(null, 'zixiao');
ok(zxNo.gateOk === false, '无雷灵根时紫霄雷法的专属部分不生效');
ok(zxYes.gateOk === true, '有雷灵根时紫霄雷法生效');
ok(zxYes.mul > zxNo.mul, '灵根门槛满足后施法更强');

/* 来源链可读：日志要能说出为什么这么疼 */
setup({ gongfa: ['tianhe'], rootEls: ['jin', 'shui', 'mu'] });
const info = EXT.gongfaCastInfo(null);
ok(info.text.length > 0, '施法来源链非空：' + info.text);
ok(info.text.indexOf('×') >= 0, '来源链带具体倍率');

/* 施法真的改动战斗伤害（端到端，不只看函数） */
setup({ gongfa: ['juqi'] });
S.combat = { foe: { name: '石傀', hp: 5000, hpMax: 5000, power: 50, rank: 12, el: 'tu', trait: 'brute' },
  round: 1, log: [], stUsed: {} };
S.mp = 100;
G.ACT.do_cbt('cast', '');
const dmgJuqi = S.combat.foe.hpMax - S.combat.foe.hp;

setup({ gongfa: ['bailian'] });
S.combat = { foe: { name: '石傀', hp: 5000, hpMax: 5000, power: 50, rank: 12, el: 'tu', trait: 'brute' },
  round: 1, log: [], stUsed: {} };
S.mp = 100;
G.ACT.do_cbt('cast', '');
const dmgBailian = S.combat.foe.hpMax - S.combat.foe.hp;

ok(dmgBailian > dmgJuqi, '端到端：百炼成仙道法施法伤害 > 聚气诀（' + dmgJuqi + ' → ' + dmgBailian + '）');

/* ============================================================
   三、灵根：战斗出口与多系
   ============================================================ */
console.log('=== 3. 灵根差异 ===');

setup({ root: 'heaven', rootEls: ['jin'] });
const rHeaven = EXT.rootPowerMul();
setup({ root: 'pseudo', rootEls: ['jin', 'mu', 'shui', 'huo'] });
const rPseudo = EXT.rootPowerMul();
ok(rHeaven > rPseudo, '天灵根战力乘区高于伪灵根（' + rHeaven.toFixed(2) + ' vs ' + rPseudo.toFixed(2) + '）');

/* 五档香火上限不再塌陷成两档 */
setup({ root: 'heaven', rootEls: ['jin'] }); const cH = EXT.xianghuoCapMul();
setup({ root: 'earth', rootEls: ['jin', 'mu'] }); const cE = EXT.xianghuoCapMul();
setup({ root: 'true_', rootEls: ['jin', 'mu', 'shui'] }); const cT = EXT.xianghuoCapMul();
setup({ root: 'pseudo', rootEls: ['jin', 'mu', 'shui', 'huo'] }); const cP = EXT.xianghuoCapMul();
ok(new Set([cH, cE, cT, cP]).size === 4, '香火上限至少 4 档不同（旧版只有 2 档）',
   [cH, cE, cT, cP].join('/'));
ok(cH > cE && cE > cT && cT > cP, '香火上限按资质单调递减');

/* 多系：副属性真的参与克制。
   五行克制成环：metal→wood→earth→water→fire→metal。
   主选 metal 打 wood = 1.3（我克敌）；第二系 water 打 wood = 1.0（无关）。
   所以副系本身不提高「最佳克制」，它提高的是「覆盖面」——
   换个敌人（比如 foeEl=fire），metal 无关(1.0)、water 克火(1.3)，副系立刻顶上来。
   这正是「系多则宽」：不是更强，而是不挑对手。 */
const vsWood = { single: EXT.keProbe('heaven', ['metal'], 'wood'), multi: EXT.keProbe('pseudo', ['metal', 'water'], 'wood') };
ok(vsWood.single.raw === 1.3, '主系克敌时克制倍率 1.3');
ok(vsWood.multi.sub === false, '主系已是最优时不误报副系');

const vsFire1 = EXT.keProbe('heaven', ['metal'], 'fire');
const vsFireN = EXT.keProbe('pseudo', ['metal', 'water'], 'fire');
ok(vsFireN.raw > vsFire1.raw, '副系补上主系给不了的克制面（打火：' + vsFire1.raw.toFixed(2) + ' → ' + vsFireN.raw.toFixed(2) + '）');
ok(vsFireN.sub === true, '此时确实动用了副系');

/* 副系按专精度折价：系越多，单系力度越弱 */
const concMain = (function () { setup({ root: 'heaven', rootEls: ['metal'] }); return EXT.bestKe('wood').conc; })();
ok(concMain === 1, '主系不折价（专精度 1.0）');
const concSub = (function () { setup({ root: 'pseudo', rootEls: ['metal', 'water'] }); return EXT.bestKe('fire').conc; })();
ok(concSub < 1, '副系按专精度折价（' + concSub.toFixed(2) + '）');

/* 端到端：灵根进入 computePower */
setup({ root: 'heaven', rootEls: ['jin'], xRealm: 1 });
const pwHeaven = G.S ? null : null;
const powH = (function () {
  setup({ root: 'heaven', rootEls: ['jin'], xRealm: 2 }); S.xianji = '天基';
  return null;
})();

/* 用战斗伤害验灵根确实影响战力：同境界同功法，只换灵根 */
setup({ root: 'heaven', rootEls: ['jin'], gongfa: ['juqi'], xRealm: 2 });
S.xianji = '天基';
S.combat = { foe: { name: '石傀', hp: 9000, hpMax: 9000, power: 300, rank: 20, el: 'tu', trait: 'brute' },
  round: 1, log: [], stUsed: {} };
S.mp = 100;
G.ACT.do_cbt('attack', '');
const hpH = S.combat.foe.hpMax - S.combat.foe.hp;

setup({ root: 'pseudo', rootEls: ['jin', 'mu', 'shui', 'huo'], gongfa: ['juqi'], xRealm: 2 });
S.xianji = '天基';
S.combat = { foe: { name: '石傀', hp: 9000, hpMax: 9000, power: 300, rank: 20, el: 'tu', trait: 'brute' },
  round: 1, log: [], stUsed: {} };
S.mp = 100;
G.ACT.do_cbt('attack', '');
const hpP = S.combat.foe.hpMax - S.combat.foe.hp;

ok(hpH > hpP, '端到端：天灵根普攻伤害高于伪灵根（' + hpH + ' vs ' + hpP + '）');

/* ============================================================
   四、护栏：常驻修正接线
   ============================================================ */
console.log('=== 4. 常驻修正接线 ===');

setup({ gongfa: ['guixi'] });
ok(EXT.gongfaLifeBonus() === 10, '龟息延年诀寿元 +10 已接线');
setup({ gongfa: ['butian'] });
ok(EXT.gongfaLifeBonus() === 80, '补天真经寿元 +80 已接线');
setup({ gongfa: ['taiyin'] });
ok(EXT.gongfaLifeStop() === true, '太阴蜕形尸解真法「死生不再受形所囿」= 寿元无上限');
setup({ gongfa: ['jinguang'] });
ok(EXT.gongfaWard() === 0.10, '金光咒减伤一成已接线');
setup({ gongfa: ['lingbo'] });
ok(Math.abs(EXT.gongfaEscape() - 0.12) < 1e-9, '凌波仙经遁速 +12% 已接线');
setup({ gongfa: ['tunhai'] });
ok(Math.abs(EXT.gongfaMpCap() - 0.15) < 1e-9, '吞海功气海 +15% 已接线');
setup({ gongfa: ['changchun'] });
ok(Math.abs(EXT.gongfaHeal() - 0.25) < 1e-9, '长春功疗伤 +25% 已接线');
setup({ gongfa: ['meihua'] });
ok(EXT.gongfaFate() === 6, '梅花易机缘 +6 已接线');
setup({ gongfa: ['xianghuo'] });
ok(Math.abs(EXT.gongfaXianghuo() - 0.15) < 1e-9, '香火成神法香火 +15% 已接线');

/* ============================================================
   v10.4 P0：探针自检 → 真实路径断言
   ------------------------------------------------------------
   上面那一组只证明「数据表编译对了」，不证明「游戏读了它」——
   14 本功法空转多年没被发现，正是因为断言停在 EXT.gongfaXxx() === n。
   下面每条都走玩家真会走的那条路：换功法后的上限、受伤后的减伤、
   月初的香火、奇遇的掷骰。
   ============================================================ */
console.log('=== 4b. 死钩子端到端（v10.4 P0）===');

/* —— gongfaMpCap：换吞海功，灵力上限必须真的变大 —— */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi', 'tunhai'] });
S.mpMax = 100; S.mp = 100; S.mpGfMul = 1;
const mpBefore = S.mpMax;
G.dispatch('do;setgf:tunhai');
ok(S.mpMax > mpBefore, '端到端：换吞海功灵力上限真变大（' + mpBefore + ' → ' + S.mpMax + '）');
ok(Math.abs(S.mpMax - 115) <= 1, '吞海功上限恰为 +15%（实际 ' + S.mpMax + '）');
/* 换回聚气必须掉回来，否则「换功法」只是一次性白送 */
G.dispatch('do;setgf:juqi');
ok(S.mpMax <= mpBefore + 1, '换回聚气上限回落（' + S.mpMax + '），加成不是一次性的');

/* —— gongfaLifeBonus：换补天真经，寿元上限必须真的变大 —— */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi', 'butian'] });
S.lifeMax = 200; S.lifeGfBonus = 0;
G.dispatch('do;setgf:butian');
ok(S.lifeMax > 200, '端到端：换补天真经寿元上限真变大（200 → ' + S.lifeMax + '）');
ok(S.lifeMax === 280, '补天真经 +80 精确落账（实际 ' + S.lifeMax + '）');
G.dispatch('do;setgf:juqi');
ok(S.lifeMax === 200, '换回聚气寿元回落（' + S.lifeMax + '）');

/* —— gongfaWard：同一敌人同一随机种子，金光咒必须挨得更少 —— */
function hurtWith(id) {
  setup({ gongfa: [id], ownedGongfa: [id] });
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = { foe: { name: '石傀', hp: 9e9, hpMax: 9e9, power: 300, rank: 12, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {} };
  G.setSeed(12345);
  const h = S.hp;
  G.ACT.do_cbt('defend', '');
  return h - S.hp;
}
const hurtPlain = hurtWith('juqi');
const hurtWard = hurtWith('jinguang');
ok(hurtWard < hurtPlain, '端到端：金光咒真的少挨打（' + hurtPlain + ' → ' + hurtWard + '）');
ok(hurtWard / hurtPlain < 0.95, '减伤幅度可见（' + (100 - hurtWard / hurtPlain * 100).toFixed(1) + '%）');

/* —— gongfaGapUp：越阶时乾天一元统摄诸天神法必须打得动 —— */
function gapHit(id, rank) {
  setup({ gongfa: [id], ownedGongfa: [id] });
  S.xRealm = 1; S.xStage = 8; S.hp = 1e9; S.hpMax = 1e9;
  S.combat = { foe: { name: '石傀', hp: 9e9, hpMax: 9e9, power: 600, rank: rank, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {} };
  G.setSeed(999);
  G.ACT.do_cbt('attack', '');
  const line = (S.log.find(function (x) { return /造成/.test(x.txt || ''); }) || {}).txt || '';
  return parseInt((line.match(/造成 (\d+)/) || [0, 0])[1], 10);
}
const hitPlain = gapHit('juqi', 16);
const hitGapUp = gapHit('xuanrong', 16);
ok(hitGapUp > hitPlain, '端到端：乾天一元统摄诸天神法越阶伤害更高（' + hitPlain + ' → ' + hitGapUp + '）');
ok(hitGapUp / hitPlain > 1.4, '位格压制抵消 1 档的效果量级（×' + (hitGapUp / Math.max(1, hitPlain)).toFixed(2) + '）');

/* —— gongfaFate：梅花易必须真的提高奇遇概率 —— */
/* 奇遇掷骰没有对外探针，退回源码口径：判定式里必须出现 gongfaFateAdd */
const gsrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'wxcs3-game.js'), 'utf8');
ok(/encRate = 18[\s\S]{0,160}gongfaFateAdd\(\)/.test(gsrc), '梅花易机缘已进入奇遇掷骰（源码口径）');
ok(/st\('fate'\) \+ gongfaFateAdd\(\)/.test(gsrc), '梅花易机缘已进入交涉判定（源码口径）');

/* —— gongfaXianghuo：香火成神法必须真的提高月香火 —— */
const gsrc2 = require('fs').readFileSync(require('path').join(__dirname, '..', 'wxcs3-game.js'), 'utf8');
ok(/_XH2\.gongfaXianghuo\(\)/.test(gsrc2) && /if \(_xhv > 0\) v \*=/.test(gsrc2),
   '香火成神法已进入 monthXianghuo（源码口径）');

/* —— gongfaLifeStop：寿元到限时必须真的挡一次 —— */
/* 寿元判定只在「跨年」那一拍（advanceMonth 把 month 推到 1）执行，
   所以要把月份设在 12，让这次推进正好落在年初。 */
setup({ gongfa: ['taiyin'], ownedGongfa: ['taiyin'] });
S.age = 200; S.lifeMax = 200; S.lifeStopUsed = false; S.month = 12;
const ageBefore = S.age;
G.advanceMonth();
ok(S.phase === 'play', '端到端：太阴蜕形尸解真法在寿元到限时保住性命');
ok(S.lifeMax > ageBefore, '尸解后续命（寿元上限 ' + S.lifeMax + ' > 年龄 ' + S.age + '）');
ok(S.lifeStopUsed === true, '尸解只挡一次（不写成永久免死）');

/* ============================================================
   五、可达性：扩展被正确加载与挂载
   ============================================================ */
console.log('=== 5. 可达性 ===');
ok(!!EXT, 'WXCS3_EXT 存在');
ok(typeof EXT.castMulProbe === 'function', 'ext-60 功法扩展已加载');
ok(typeof EXT.rootPowerMul === 'function', 'ext-70 灵根扩展已加载');
ok(typeof EXT.rootSummary === 'function', '灵根摘要可渲染');
setup({ root: 'pseudo', rootEls: ['jin', 'mu', 'shui', 'huo'] });
const sum = EXT.rootSummary();
ok(sum.indexOf('副') >= 0, '状态栏文案能显示副系：' + sum);

/* ============================================================
   六、UI：玩家真的看得见
   ============================================================ */
console.log('=== 6. UI 可达性 ===');
setup({ gongfa: ['tianhe'], ownedGongfa: ['juqi', 'tianhe'], root: 'true_', rootEls: ['metal', 'water', 'wood'] });
G.ACT.openGongfa();
const modalHtml = (function () {
  const m = document.getElementById('modals');
  return m ? m.innerHTML : '';
})();
ok(modalHtml.indexOf('实际结算') >= 0, '功法面板显示「实际结算」一栏');
ok(modalHtml.indexOf('地阶') >= 0, '面板仍显示品阶');

/* 状态栏：副系必须可见 */
setup({ root: 'pseudo', rootEls: ['metal', 'wood', 'water', 'fire'] });
G.render();
const stageHtml = (function () {
  const s = document.getElementById('stage');
  return s ? s.innerHTML : '';
})();
ok(stageHtml.indexOf('副') >= 0, '状态栏标出副系（不再只是彩色装饰）');
ok(stageHtml.indexOf('专精度') >= 0, '状态栏说明副系折价规则');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
if (fail > 0) process.exitCode = 1;
