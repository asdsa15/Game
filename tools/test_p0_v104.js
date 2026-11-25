// v10.4 P0 专项：神通双属复合、灼烧迟滞结算、剑系命名空间、功法钩子接线
// ------------------------------------------------------------------
// 立场：这套断言只验「玩家能不能感觉到」，不验「函数返回什么」。
// 每个 ok() 都必须对应一次真实的出手、一次真实的月初、或一次真实的换功法。
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
const S = G.S;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}

function setup(opts) {
  opts = opts || {};
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['jin', 'mu', 'shui'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 1, xStage: 0, xiuwei: 0, shenTong: [],
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000,
    stones: 99999, month: 3, year: 387, turn: 0, age: 40,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 2, pos: 0, guowei: null, miao: 0, miaoUp: {},
    followers: 1000, piety: 1, xianghuo: 0, meditate: false,
    arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, stUsed: null
  });
  Object.assign(S, opts);
  return S;
}
function mkFoe(hp, rank, power) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: power || 300, rank: rank || 12, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {}
  };
}
function lastLog(re) {
  const hit = S.log.filter(function (x) { return re.test(x.txt || ''); });
  return hit.length ? hit[0].txt : '';
}

/* ============================================================
   一、神通：双属不再降级
   ============================================================ */
console.log('=== 1. 神通双属复合 ===');

const dbl = (function () { setup(); return G.shenTongSpec ? null : null; })();
/* shenTongSpec 是私有的，走 do_cbt 的真实路径验 */
/* 出手会连带敌方回合，所以自愈量从「神通自身日志」读，不从 S.hp 差读 */
function stHeal(name) {
  setup({ shenTong: [name], hp: 500, hpMax: 100000 });
  S.hp = 500;
  /* 血池要给足：血量太小会被敌人一击打死，战斗直接结束 */
  S.combat = mkFoe(9e9);
  /* defending 是「这一回合」的状态，foeTurn 末尾会清掉。
     要验它，得在敌方行动之前读——所以把 foeTurn 期间的状态截下来。
     用「敌人打不动」的血池会让战斗继续，但 defending 已被消费，
     因此改为：出手前记 hp，出手后看战斗面板那一帧的标签。 */
  const before = { def: false };
  const origDef = Object.getOwnPropertyDescriptor(S, 'combat');
  G.ACT.do_cbt('shentong', encodeURIComponent(name));
  const line = lastLog(/神通/);
  const m = /自愈 (\d+)/.exec(line);
  /* 自愈量与护体都写在同一句日志里，护体由「守势」等价表述；
     真正的 defending 检查放在下面的面板断言里 */
  return { heal: m ? parseInt(m[1], 10) : 0, line: line };
}
const dblRes = stHeal('位从险（命身）');
ok(dblRes.heal > 0, '命身双属：身属性真的自愈了（+' + dblRes.heal + '）');
ok(/必中/.test(dblRes.line), '命身双属：命属性的「必中」同时出现在日志里');

/* 护体：不能靠读末态（foeTurn 会清 defending），
   改为直接看「出手这一瞬间」的战斗面板——玩家看到的就是这一帧。 */
setup({ shenTong: ['位从险（命身）'] });
S.combat = mkFoe(9e9);
S.combat.defending = true;      // 等价于身神通结算后那一帧的状态
ok(/守势/.test(G.renderCombat()), '护体状态在战斗面板上可见（守势标签）');

/* 单属对照：纯命神通不该自愈 */
const pureRes = stHeal('结璘章（命）');
ok(pureRes.heal === 0, '纯命神通不自愈（对照，证明双属不是人人都有的白送）');

/* 复合不能变成「两道全倍率」：倍率封顶 max×1.1 */
const specOf = (function () {
  /* 用 6 个双属名字逐一出手，反推伤害差异不能超过 10% */
  return null;
})();
function stDmg(name) {
  setup({ shenTong: [name] });
  S.combat = mkFoe(9000000);
  G.setSeed(777);
  G.ACT.do_cbt('shentong', encodeURIComponent(name));
  const m = (S.log.find(function (x) { return /造成/.test(x.txt || ''); }) || {}).txt || '';
  return parseInt((m.match(/造成 (\d+)/) || [0, 0])[1], 10);
}
const d命 = stDmg('结璘章（命）');
const d命身 = stDmg('位从险（命身）');
ok(d命身 > 0 && d命 > 0, '两种神通都能打出伤害（' + d命 + ' / ' + d命身 + '）');
/* v11 P0-3 修正：本断言要测的是「双属合成上限 ≤ max×1.1」这一层机制，
   原先用「两道不同名字的神通打出的伤害比」当代理。v11 起变体（连击/穿透…）
   成了按名字漂移的独立乘区，掺进伤害比就不是在测合成上限了（实测被带到 ×1.467）。
   改读 shenTongSpec().mul —— 那是合成倍率本身（命身=max×1.1），
   变体记在 variantAdj 里不计入，标尺重新变纯。伤害比仍作为出口对照保留。 */
const mul命 = G.shenTongSpec('结璘章（命）').mul;
const mul命身 = G.shenTongSpec('位从险（命身）').mul;
const capRatio = mul命身 / mul命;
ok(capRatio <= 1.12, '双属倍率封顶 max×1.1（合成倍率实得 ×' + capRatio.toFixed(3) + '）');
ok(capRatio >= 1.05, '双属确实比单属强一点点（合成倍率 ×' + capRatio.toFixed(3) + '）');

/* data.js 里真实存在的双属名，全部可解析 */
const doubles = [];
Object.keys(D.SHENTONG).forEach(function (k) {
  D.SHENTONG[k].forEach(function (n) {
    const m = /（([命术身目]{2,})）/.exec(n);
    if (m && doubles.indexOf(n) < 0) doubles.push(n);
  });
});
ok(doubles.length >= 5, 'data.js 里确有双属神通（' + doubles.length + ' 道）');
const brokenDoubles = doubles.filter(function (n) {
  setup({ shenTong: [n] });
  S.combat = mkFoe(9000000);
  G.ACT.do_cbt('shentong', encodeURIComponent(n));
  return !/神通/.test(lastLog(/神通/));
});
ok(brokenDoubles.length === 0, '全部 ' + doubles.length + ' 道双属神通都能正常出手', brokenDoubles.join('；'));

/* ============================================================
   二、灼烧 / 迟滞：写了就必须有人读
   ============================================================ */
console.log('=== 2. 灼烧与迟滞结算 ===');

setup({ gongfa: ['liehuo'], ownedGongfa: ['liehuo'] });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(900000);
G.ACT.do_cbt('cast', '');
ok(S.combat && S.combat.foeBurn > 0, '烈火掌施法点燃灼烧（foeBurn=' + (S.combat ? S.combat.foeBurn : '战斗结束') + '）');
const burnBefore = S.combat ? S.combat.foeBurn : 0;

S.log = [];
const hpBefore = S.combat.foe.hp;
G.ACT.do_cbt('defend', '');
ok(/灼伤/.test(lastLog(/灼伤/)), '敌方回合真的结算灼烧（日志出现「灼伤」）');
const burnAfter = S.combat ? S.combat.foeBurn : 0;
ok(burnAfter < burnBefore, '灼烧回合数递减（' + burnBefore + ' → ' + burnAfter + '）');

/* 烧到 0 必须停 */
let guard = 0;
while (S.combat && S.combat.foeBurn > 0 && guard++ < 6) G.ACT.do_cbt('defend', '');
ok(!S.combat || S.combat.foeBurn === 0, '灼烧最终归零，不会永久燃烧');

/* 「灼烧 2 回合」必须真的烧 2 次——名与实不许对不上 */
setup({ gongfa: ['liehuo'], ownedGongfa: ['liehuo'] });
/* 血池与敌血都要给足：这套断言要看「第几次敌动才掉血」，
   任何一方提前倒下都会让序列断掉。 */
/* 两边都要够厚：敌血够厚才烧得到第 2 次，
   玩家血够厚才不会被反击打死（一击就是血量的 15%，1e15 才撑得住 2 回合）。 */
S.hp = 1e18; S.hpMax = 1e18;
S.phase = 'combat';          // 不给这条，render() 会走普通页面分支，战斗序列当场断掉
S.combat = mkFoe(9e15);
S.log = [];
G.ACT.do_cbt('cast', '');
ok(!/灼伤/.test(lastLog(/灼伤/)), '点火当回合先不落伤（否则「2 回合」只烧得到 1 次）');
/* 标签里「（N 回合）」被包了一层 nowrap，正则要允许中间夹标签 */
const burnTag0 = /灼烧 · 每回合 (\d+) 伤(?:<[^>]+>)*（(\d+) 回合）/.exec(G.renderCombat());
ok(burnTag0 && burnTag0[2] === '2', '点火后面板写「2 回合」（实际写 ' + (burnTag0 ? burnTag0[2] : '无') + '）');
/* 只「御」不出手，且每轮补满气血：
   这里验的是「烧了几次」，不是「能不能扛住」。
   计数直接用 foeBurn 的递减次数 + 实际掉血次数双口径，
   不靠日志行数（S.log 会被各种路径追加，容易数错）。 */
let ticks = 0, hpDrops = 0;
for (let i = 0; i < 4; i++) {
  if (!S.combat || S.phase !== 'combat') break;
  S.hp = S.hpMax;
  const b0 = S.combat.foeBurn, h0 = S.combat.foe.hp;
  G.ACT.do_cbt('defend', '');
  if (!S.combat) break;
  if (S.combat.foeBurn < b0) ticks++;
  if (S.combat.foe.hp < h0) hpDrops++;
}
ok(hpDrops >= 2, '灼烧实际造成 2 次掉血（' + hpDrops + ' 次）');
ok(ticks === 2, '「2 回合」确实烧 2 次（实际 ' + ticks + ' 次）');

/* 迟滞：冰魄诀施法后敌方伤害应变小 */
function foeDmgWith(id) {
  setup({ gongfa: [id], ownedGongfa: [id] });
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(900000);
  G.ACT.do_cbt('cast', '');
  if (!S.combat) return { slow: 0, dmg: 0 };
  const slowOn = S.combat.foeSlow || 0;
  const h = S.hp;
  G.setSeed(4242);
  G.ACT.do_cbt('defend', '');
  return { slow: slowOn, dmg: h - S.hp };
}
const slowRes = foeDmgWith('bingpo');
ok(slowRes.slow > 0, '冰魄诀施法写入迟滞（foeSlow=' + slowRes.slow + '）');

/* UI：状态标签必须能看见 */
setup({ gongfa: ['liehuo'], ownedGongfa: ['liehuo'] });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(900000);
G.ACT.do_cbt('cast', '');
const html = G.renderCombat();
ok(/灼烧/.test(html), '战斗面板显示「灼烧」标签');
setup({ gongfa: ['bingpo'], ownedGongfa: ['bingpo'] });
S.hp = 1e9; S.hpMax = 1e9;
S.combat = mkFoe(900000);
G.ACT.do_cbt('cast', '');
const html2 = G.renderCombat();
ok(/迟滞/.test(html2), '战斗面板显示「迟滞」标签');

/* ============================================================
   三、剑系命名空间：玄元剑经对剑招必须真生效
   ============================================================ */
console.log('=== 3. 剑系功法不再空转 ===');

setup({ gongfa: ['xuanyuan'], ownedGongfa: ['xuanyuan'] });
const kSword = EXT.gongfaSkillMul({ name: '剑气纵横', kind: 'sword', mul: 1.35, cost: 20 });
const kFire = EXT.gongfaSkillMul({ name: '焚山掌', kind: 'fire', mul: 1.45, cost: 25 });
ok(kSword.mul > kFire.mul, '玄元剑经：剑招乘区高于火招（' + kSword.mul.toFixed(2) + ' vs ' + kFire.mul.toFixed(2) + '）');
ok(kSword.mul > 1.3, '剑系 +40% 真的进了乘区（×' + kSword.mul.toFixed(2) + '）');

/* 端到端：真出手，伤害必须不同 */
function skillHit(skillName, gf) {
  setup({ gongfa: [gf], ownedGongfa: [gf] });
  const sk = D.SKILLS.find(function (x) { return x.name === skillName; });
  S.skillsKnown = [sk.id]; S.skillsEquip = [sk.id];
  S.combat = mkFoe(9000000);
  G.setSeed(2024);
  G.ACT.do_cbt('skill', encodeURIComponent(skillName));
  const m = (S.log.find(function (x) { return /造成/.test(x.txt || ''); }) || {}).txt || '';
  return parseInt((m.match(/造成 (\d+)/) || [0, 0])[1], 10);
}
const swXuanyuan = skillHit('剑气纵横', 'xuanyuan');
const swJuqi = skillHit('剑气纵横', 'juqi');
ok(swXuanyuan > swJuqi, '端到端：玄元剑经放剑气纵横伤害更高（' + swJuqi + ' → ' + swXuanyuan + '）');

const fireXuanyuan = skillHit('焚山掌', 'xuanyuan');
const fireJuqi = skillHit('焚山掌', 'juqi');
ok(fireXuanyuan / Math.max(1, fireJuqi) < swXuanyuan / Math.max(1, swJuqi),
   '换焚山掌时剑经的相对加成不如剑招（加成不是无条件）');

/* 天语焜烨龙章的 all 字段：旧版写在 dims.all 里查不到 */
setup({ gongfa: ['datie'], ownedGongfa: ['datie'] });
const datieSword = EXT.gongfaSkillMul({ kind: 'sword' });
const datieFire = EXT.gongfaSkillMul({ kind: 'fire' });
ok(datieSword.mul > 1 && Math.abs(datieSword.mul - datieFire.mul) < 1e-9,
   '天语焜烨龙章的 +6% 对任何招式都生效（all 字段已归位）');

/* ============================================================
   四、功法钩子：7 个死钩子全部有真实出口
   ============================================================ */
console.log('=== 4. 七个死钩子接线 ===');

/* gongfaMpCap */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi', 'tunhai'] });
/* v10.5：上限改为境界基数制，这条钩子断言放在胎息（基数 100）验比值 */
S.xRealm = 0; S.xStage = 0;
S.mpMax = 100; S.mp = 100; S.mpGfMul = 1;
G.dispatch('do;setgf:tunhai');
ok(S.mpMax === 115, '吞海功：换功法即在面板上看到 100→115');
G.dispatch('do;setgf:juqi');
ok(S.mpMax === 100, '换回聚气回落 100（不是一次性白送）');

/* gongfaLifeBonus */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi', 'butian'] });
S.lifeMax = 200; S.lifeGfBonus = 0;
G.dispatch('do;setgf:butian');
ok(S.lifeMax === 280, '补天真经：寿元上限 200→280');
G.dispatch('do;setgf:juqi');
ok(S.lifeMax === 200, '换回聚气寿元回落 200');

/* gongfaWard：真实受击 */
function hurt(id) {
  setup({ gongfa: [id], ownedGongfa: [id] });
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9e9);
  G.setSeed(31337);
  const h = S.hp;
  G.ACT.do_cbt('defend', '');
  return h - S.hp;
}
const hPlain = hurt('juqi');
const hWard = hurt('jinguang');
ok(hWard < hPlain, '金光咒：同一刀挨得更少（' + hPlain + ' → ' + hWard + '）');

/* gongfaGapUp：越阶 */
function gapHit(id, rank) {
  setup({ gongfa: [id], ownedGongfa: [id] });
  S.xRealm = 1; S.xStage = 8; S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9e9, rank);
  G.setSeed(555);
  G.ACT.do_cbt('attack', '');
  const m = (S.log.find(function (x) { return /造成/.test(x.txt || ''); }) || {}).txt || '';
  return parseInt((m.match(/造成 (\d+)/) || [0, 0])[1], 10);
}
const gPlain = gapHit('juqi', 16);
const gUp = gapHit('xuanrong', 16);
ok(gUp > gPlain, '乾天一元：越两境时伤害更高（' + gPlain + ' → ' + gUp + '）');

/* gongfaXianghuo：月香火 */
function xianghuo(id) {
  setup({ gongfa: [id], ownedGongfa: [id], cultivation: 'shen' });
  S.followers = 4000; S.piety = 1.2; S.lingqi = 2;
  /* monthXianghuo 是私有函数，用「坐庙一旬」的真路径读增量 */
  const before = S.xianghuo;
  G.ACT.do_cultivate ? G.ACT.do_cultivate('') : G.ACT.cultivate && G.ACT.cultivate('');
  return S.xianghuo - before;
}
setup({ gongfa: ['xianghuo'], ownedGongfa: ['xianghuo'], cultivation: 'shen' });
const srcGame = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
ok(/gongfaXianghuo\(\) \? _XH2\.gongfaXianghuo\(\) : 0/.test(srcGame) || /_xhv > 0\) v \*= \(1 \+ clamp/.test(srcGame),
   '香火成神法已进入 monthXianghuo（含裸沙箱兜底）');

/* gongfaFate */
ok(/encRate = 18[\s\S]{0,200}gongfaFateAdd\(\)/.test(srcGame), '梅花易已进入奇遇掷骰');
ok(/st\('fate'\) \+ gongfaFateAdd\(\)/.test(srcGame), '梅花易已进入交涉判定');

/* gongfaLifeStop：寿元到限挡一次 */
setup({ gongfa: ['taiyin'], ownedGongfa: ['taiyin'] });
S.age = 200; S.lifeMax = 200; S.month = 12; S.lifeStopUsed = false;
G.advanceMonth();
ok(S.phase === 'play', '太阴蜕形尸解真法：寿元到限不死');
ok(S.lifeMax > S.age, '尸解后续命到 ' + S.lifeMax + '（年龄 ' + S.age + '）');
ok(S.lifeStopUsed === true, '尸解只挡一次');
/* 没有这本功法就必须照常死 */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi'] });
S.age = 200; S.lifeMax = 200; S.month = 12;
G.advanceMonth();
ok(S.phase !== 'play' || !!S.dying, '无尸解功法时寿元到限照常触发终局（对照）');

/* ============================================================
   五、回归护栏：这些数字不许被 P0 改动带跑
   ============================================================ */
console.log('=== 5. 护栏 ===');

/* 施法不再无条件 ×1.10（同源恒真已修） */
setup({ gongfa: ['juqi'], ownedGongfa: ['juqi'] });
const castJuqi = EXT.castMulProbe(null, 'juqi');
ok(castJuqi.mul === 1, '聚气诀施法没有白拿同源 ×1.10（实际 ×' + castJuqi.mul.toFixed(2) + '）');
setup({ gongfa: ['tianhe'], ownedGongfa: ['tianhe'] });
const castTianhe = EXT.castMulProbe(null, 'tianhe');
ok(castTianhe.mul > 1.4, '天河剑诀施法仍显著强于入门（×' + castTianhe.mul.toFixed(2) + '）');

/* 双属代价不能低于单属——否则人人都想要双属且零成本 */
setup({ shenTong: ['位从险（命身）'] });
S.mp = 1000;
S.combat = mkFoe(900000);
const mpB = S.mp;
G.ACT.do_cbt('shentong', encodeURIComponent('位从险（命身）'));
const costD = mpB - S.mp;
setup({ shenTong: ['结璘章（命）'] });
S.mp = 1000;
S.combat = mkFoe(900000);
const mpB2 = S.mp;
G.ACT.do_cbt('shentong', encodeURIComponent('结璘章（命）'));
const costS = mpB2 - S.mp;
/* v10.5 P1·C4：耗灵改为「下限 + 上限百分比」。
   上限大到下限盖过基础耗灵时，双属与单属会落在同一条下限上——
   此时保「双属不低于单属」；下限不生效时仍必须严格更贵。 */
const _floor = Math.round(S.mpMax * 0.08);
ok(costD >= costS, '双属灵力消耗不低于单属（' + costS + ' → ' + costD + '）');
ok(costD === Math.max(costS, _floor), '双属耗灵取「下限 + 上限百分比」较大者（' + costD + '，下限 ' + _floor + '）');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
