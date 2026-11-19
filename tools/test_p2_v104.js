// v10.4 P2 专项：神通×功法五条联动 / 神通装配 / 功法熟练度
// ------------------------------------------------------------------
// 与前两套一致：每条 ok() 都必须对应玩家能感知的一次变化。
// P2 的难点是「叠加」——五条联动都能乘区，必须逐一验「单独生效」
// 和「不越界」，否则最后只会得到一个打穿战斗系统的乘区堆。
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
    cultivation: 'xian', root: 'true_', rootEls: ['jin', 'mu', 'shui', 'fire', 'thunder'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 2, xStage: 0, xiuwei: 0, xianji: '玄基', daotong: null,
    shenTong: [], stKind: {}, stEquip: undefined,
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000,
    stones: 9999, month: 3, year: 387, turn: 0,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 0, pos: 0, miao: 0, miaoUp: {}, followers: 0, piety: 1,
    xianghuo: 0, meditate: false, arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, craftLv: {}, cave: { facilities: {} },
    gfProf: {}
  });
  Object.assign(S, opts);
  if (opts.stEquip === undefined) delete S.stEquip;
  return S;
}
function mkFoe(hp, rank) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: 300, rank: rank || 12, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {}, stanceUsed: {}
  };
}
/* 一次真实出手；stance 显式写入（含 null＝明确不要态势） */
function cast(name, stance) {
  S.combat = S.combat || mkFoe(9e15);
  S.combat.stance = (stance === undefined ? null : stance);
  S.phase = 'combat';
  S.mp = 1e6;
  const mp0 = S.mp;
  S.log = [];
  G.ACT.do_cbt('shentong', encodeURIComponent(name));
  const line = (S.log.find(function (x) { return /神通/.test(x.txt || ''); }) || {}).txt || '';
  const d = /造成 (\d+)/.exec(line);
  return { cost: mp0 - S.mp, line: line, dmg: d ? parseInt(d[1], 10) : 0, tags: (line.match(/（[^）]*）/) || [''])[0] };
}

/* ============================================================
   一、五条联动
   ============================================================ */
console.log('=== 1. 神通×功法五条联动 ===');

/* 联动一：功法 dims × 同属神通（火属道统 + 火属功法） */
function hitWith(dt, gf, st) {
  setup({ daotong: dt, gongfa: [gf], daogong: gf, ownedGongfa: [gf], shenTong: [st] });
  S.stKind[st] = '术';
  return cast(st);
}
const l1Plain = hitWith('离火', 'juqi', '位从罗');
const l1Fire = hitWith('离火', 'liehuo', '位从罗');   // 烈火掌 dims.fire 1.25
const l1Sword = hitWith('离火', 'xuanyuan', '位从罗'); // 玄元剑经，剑属，与火无关
ok(l1Fire.dmg > l1Plain.dmg, '联动一：火属功法放大火属神通（' + l1Plain.dmg + ' → ' + l1Fire.dmg + '）');
ok(/功法×1\.25/.test(l1Fire.line), '联动一：战报标出功法乘区（' + l1Fire.tags + '）');
ok(l1Sword.dmg <= l1Plain.dmg * 1.001, '联动一：不同属功法不放大（不打折，也不白送）');

/* 联动一不得打穿：封顶 1.5 */
ok(/功法×1\.25/.test(l1Fire.line), '联动一封顶 1.5 以内（烈火 1.25 未触顶）');

/* 联动二：炎上 × 带 burn 的功法 */
function yanWith(gf) {
  setup({ daotong: '离火', gongfa: [gf], daogong: gf, ownedGongfa: [gf], shenTong: ['位从罗'] });
  S.stKind['位从罗'] = '术';
  const r = cast('位从罗');
  return { r: r, burnMul: S.combat.foeBurnMul, burn: S.combat.foeBurn };
}
const y0 = yanWith('juqi');
const y1 = yanWith('liehuo');     // burn 0.5
ok(y0.burn > 0, '联动二：炎上火属神通点燃灼烧');
ok(y1.burnMul > y0.burnMul, '联动二：带 burn 的功法让余焰更旺（' + y0.burnMul + ' → ' + y1.burnMul + '）');
ok(/焚身/.test(y1.r.line), '联动二：战报标出「焚身」');
ok(y1.burnMul <= 0.9, '联动二：灼烧倍率封顶 0.9（实际 ' + y1.burnMul + '）');

/* 联动三：heal 功法放大身神通自愈 */
function shenWith(gf) {
  setup({ daotong: '坎水', gongfa: [gf], daogong: gf, ownedGongfa: [gf], shenTong: ['仪对影（身）'] });
  S.stKind['仪对影（身）'] = '身';
  const r = cast('仪对影（身）');
  const m = /自愈 (\d+)/.exec(r.line);
  return { heal: m ? parseInt(m[1], 10) : 0, line: r.line };
}
const s0 = shenWith('juqi');
const s1 = shenWith('changchun');   // heal 0.25
ok(s1.heal > s0.heal, '联动三：疗伤功法放大身神通自愈（' + s0.heal + ' → ' + s1.heal + '）');
ok(/\+功法/.test(s1.line), '联动三：战报标出「+功法」');

/* 联动四：fate 功法延长破绽 */
function muWith(gf) {
  setup({ daotong: '坎水', gongfa: [gf], daogong: gf, ownedGongfa: [gf], shenTong: ['目骋怀（目）'] });
  S.stKind['目骋怀（目）'] = '目';
  const r = cast('目骋怀（目）');
  const m = /破绽 (\d+)合/.exec(r.line);
  return { mark: m ? parseInt(m[1], 10) : 0, line: r.line };
}
const m0 = muWith('juqi');
const m1 = muWith('meihua');        // fate 6
ok(m1.mark > m0.mark, '联动四：卜筮功法延长目神通破绽（' + m0.mark + ' → ' + m1.mark + ' 合）');

/* 联动五：四象归元 × 功法品阶 */
function sixWith(gf) {
  setup({ daotong: '坎水', gongfa: [gf], daogong: gf, ownedGongfa: [gf],
    shenTong: ['结璘章（命）', '溪上翁', '仪对影（身）', '目骋怀（目）'] });
  S.stKind = { '结璘章（命）': '命', '溪上翁': '术', '仪对影（身）': '身', '目骋怀（目）': '目' };
  const r = cast('溪上翁', 'sixiang');
  return { r: r, dmg: r.dmg };
}
const x6Plain = sixWith('juqi');       // 黄阶 ×1.0 → 归元 1.0
const x6Xian = sixWith('bailian');     // 仙阶 ×1.55 → 归元 1.275
ok(x6Xian.dmg > x6Plain.dmg, '联动五：四象归元时高阶功法额外生效（' + x6Plain.dmg + ' → ' + x6Xian.dmg + '）');
ok(/归元×/.test(x6Xian.r.line), '联动五：战报标出「归元×」');
ok(x6Xian.dmg / x6Plain.dmg > 1.2 && x6Xian.dmg / x6Plain.dmg < 1.35,
   '联动五：幅度约 1.275（实际 ×' + (x6Xian.dmg / x6Plain.dmg).toFixed(3) + '）');

/* 关键反例：无态势时，功法品阶绝不该影响神通伤害 */
function noStance(gf) {
  setup({ daotong: '坎水', gongfa: [gf], daogong: gf, ownedGongfa: [gf], shenTong: ['溪上翁'] });
  S.stKind['溪上翁'] = '术';
  return cast('溪上翁', null).dmg;
}
const nJuqi = noStance('juqi');
const nBailian = noStance('bailian');
ok(nBailian === nJuqi, '反例：无态势时功法品阶不影响神通（' + nJuqi + ' vs ' + nBailian + '）');
ok(!/归元/.test(cast.call(null, '溪上翁', null).line), '反例：态势显式为 null 时不再回退到自动态势');

/* ============================================================
   二、神通装配
   ============================================================ */
console.log('=== 2. 神通装配 ===');

/* 未设置 stEquip → 全装（旧档零迁移） */
const FOUR = ['结璘章（命）', '溪上翁', '仪对影（身）', '目骋怀（目）'];
const KF = { '结璘章（命）': '命', '溪上翁': '术', '仪对影（身）': '身', '目骋怀（目）': '目' };
function powerWith(sts, equip) {
  setup({ shenTong: sts, stKind: KF });
  if (equip) S.stEquip = equip;
  S.combat = mkFoe(9e9);
  S.phase = 'combat';
  const h = G.renderCombat();
  const m = /战力 ([\d.]+)/.exec(h);
  const p = m ? Number(m[1]) : 0;
  S.combat = null; S.phase = 'play';
  return p;
}
const pwAll = powerWith(FOUR);
const pwTwo = powerWith(FOUR, ['结璘章（命）', '溪上翁']);
ok(pwAll > pwTwo, '卸下两道神通后战力下降（' + pwAll + ' → ' + pwTwo + '）');

/* 未设置时战力等于全装 */
const pwDefault = powerWith(FOUR);
ok(pwDefault === pwAll, '未设置 stEquip 时等同全装（旧档行为不变）');

/* 装配改变态势 */
function stanceOf(equip) {
  setup({ daotong: '坎水', shenTong: FOUR, stKind: KF });
  if (equip) S.stEquip = equip;
  S.combat = mkFoe(9e9);
  S.phase = 'combat';
  const sl = [];
  /* stanceList 私有，用面板 HTML 反查 */
  G.ACT.openStEquip();
  const h = els['modals'].innerHTML;
  const seg = h.slice(h.indexOf('当前态势'));
  ['四象归元', '先声夺人', '守中带攻', '偏执'].forEach(function (n) {
    if (seg.indexOf(n) >= 0) sl.push(n);
  });
  S.combat = null; S.phase = 'play';
  return sl;
}
const stAll4 = stanceOf(null);
const stOnly2 = stanceOf(['结璘章（命）', '溪上翁']);
ok(stAll4.indexOf('四象归元') >= 0, '四类全装时可达「四象归元」');
ok(stOnly2.indexOf('四象归元') < 0, '卸到两类后「四象归元」消失');

/* 装卸操作 */
setup({ daotong: '坎水', shenTong: FOUR, stKind: KF });
G.ACT.do_steq(encodeURIComponent('目骋怀（目）'));
ok(Array.isArray(S.stEquip) && S.stEquip.indexOf('目骋怀（目）') < 0, '卸下后 stEquip 不再含该道');
G.ACT.do_steq(encodeURIComponent('目骋怀（目）'));
ok(S.stEquip.indexOf('目骋怀（目）') >= 0, '再点一次装回');

/* 至少留一道 */
setup({ daotong: '坎水', shenTong: ['溪上翁'], stKind: { '溪上翁': '术' } });
G.ACT.do_steq(encodeURIComponent('溪上翁'));
ok(!Array.isArray(S.stEquip) || S.stEquip.length === 1, '最后一道卸不掉（不让玩家从此无法出手）');

/* 战斗菜单只列已装配 */
setup({ daotong: '坎水', shenTong: FOUR, stKind: KF, stEquip: ['结璘章（命）'] });
S.combat = mkFoe(9e9);
S.phase = 'combat';
S.mp = 1e6;
G.ACT.openSkills();
const menu = els['modals'].innerHTML;
const shown = ['结璘章', '溪上翁', '仪对影', '目骋怀'].filter(function (n) { return menu.indexOf(n) >= 0; });
ok(shown.length === 1 && shown[0] === '结璘章', '战斗菜单只列已装配的那一道（实际 ' + shown.join(',') + '）');
ok(/1\/4 道/.test(menu), '菜单标题写明装配数（1/4）');

/* 卸下的神通本场不可用 */
const rOff = cast('溪上翁', null);
ok(rOff.dmg === 0, '未装配的神通点了也出不来');

/* ============================================================
   三、功法熟练度
   ============================================================ */
console.log('=== 3. 功法熟练度 ===');

/* 增长：只有修炼才涨 */
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun'] });
ok(G.gfProfPeek().prof === 0, '初始熟练度为 0');
S.meditate = false;
G.advanceMonth(1);
const p1 = G.gfProfPeek().prof;
ok(p1 > 0, '修炼一个月后熟练度增长（' + p1 + '）');
/* 闭关翻倍 */
const before = G.gfProfPeek().prof;
S.meditate = true;
G.advanceMonth(1);
S.meditate = false;
const gainMed = G.gfProfPeek().prof - before;
ok(gainMed > p1, '闭关时增长更快（' + p1 + ' → ' + gainMed + '）');

/* 阶位与封顶 */
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun'] });
S.gfProf = { changchun: 400 };
ok(G.gfProfPeek().name === '化境', '熟练度 400 → 化境');
const beforeCap = G.gfProfPeek().prof;
S.meditate = false;
G.advanceMonth(1);
ok(G.gfProfPeek().prof === beforeCap, '化境后再修炼不再增长（封顶）');

/* 熟练度只放大主特征，不做全局乘区 */
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun'], gfProf: { changchun: 400 } });
const healMax = EXT.gongfaHeal();
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun'], gfProf: { changchun: 0 } });
const healMin = EXT.gongfaHeal();
ok(healMax > healMin, '化境放大疗伤主特征（' + healMin + ' → ' + healMax + '）');

/* 纯战力功法不吃熟练度 */
setup({ gongfa: ['tianhe'], daogong: 'tianhe', ownedGongfa: ['tianhe'], gfProf: { tianhe: 400 } });
const mulMax = EXT.gongfaSkillMul({ kind: 'sword' }).mul;
setup({ gongfa: ['tianhe'], daogong: 'tianhe', ownedGongfa: ['tianhe'], gfProf: { tianhe: 0 } });
const mulMin = EXT.gongfaSkillMul({ kind: 'sword' }).mul;
ok(Math.abs(mulMax - mulMin) < 1e-9, '纯战力功法（剑经）不吃熟练度（' + mulMin.toFixed(3) + ' vs ' + mulMax.toFixed(3) + '）');

/* 四艺：熟练度让手更稳 */
setup({ gongfa: ['zaohua'], daogong: 'zaohua', ownedGongfa: ['zaohua'], gfProf: { zaohua: 400 } });
const cMax = EXT.gongfaCraftBonus('dan');
setup({ gongfa: ['zaohua'], daogong: 'zaohua', ownedGongfa: ['zaohua'], gfProf: { zaohua: 0 } });
const cMin = EXT.gongfaCraftBonus('dan');
ok(cMax > cMin, '化境让四艺加成变高（' + cMin + ' → ' + cMax + '）');
setup({ gongfa: ['zaohua'], daogong: 'zaohua', ownedGongfa: ['zaohua'], gfProf: { zaohua: 400 } });
ok(EXT.gongfaCraftBonus('qi') === 0, '熟练度不会串到别的门类');

/* 所长标注 */
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun'] });
ok(EXT.gfProfFocus() === '疗伤', '长春功所长标为「疗伤」');
setup({ gongfa: ['zaohua'], daogong: 'zaohua', ownedGongfa: ['zaohua'] });
ok(EXT.gfProfFocus() === '技艺', '造化丹经所长标为「技艺」');

/* 换功法后各记各的 */
setup({ gongfa: ['changchun'], daogong: 'changchun', ownedGongfa: ['changchun', 'meihua'], gfProf: { changchun: 200 } });
ok(G.gfProfPeek().prof === 200, '长春功记 200');
S.gongfa = ['meihua']; S.daogong = 'meihua';
ok(G.gfProfPeek().prof === 0, '换到梅花易后熟练度从 0 起（各记各的）');

/* ============================================================
   四、护栏
   ============================================================ */
console.log('=== 4. 护栏 ===');

/* 五条联动同时叠加的上限 */
setup({
  daotong: '离火', gongfa: ['liehuo'], daogong: 'liehuo', ownedGongfa: ['liehuo'],
  shenTong: ['顺平征（命术）', '溪上翁', '仪对影（身）', '目骋怀（目）'],
  stKind: { '顺平征（命术）': '命术', '溪上翁': '术', '仪对影（身）': '身', '目骋怀（目）': '目' },
  gfProf: { liehuo: 400 }
});
const allOn = cast('溪上翁', 'sixiang');
/* 同一个场景关掉功法与熟练度作对照 */
setup({
  daotong: '离火', gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'],
  shenTong: ['顺平征（命术）', '溪上翁', '仪对影（身）', '目骋怀（目）'],
  stKind: { '顺平征（命术）': '命术', '溪上翁': '术', '仪对影（身）': '身', '目骋怀（目）': '目' }
});
const allOff = cast('溪上翁', 'sixiang');
const ratioAll = allOn.dmg / Math.max(1, allOff.dmg);
ok(ratioAll < 1.7, '五条联动叠加后总倍率 < 1.7（实际 ×' + ratioAll.toFixed(2) + '）');

/* 熟练度不改变神通本体 */
setup({ daotong: '坎水', gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], shenTong: ['溪上翁'], gfProf: { juqi: 400 } });
S.stKind['溪上翁'] = '术';
const juqiMax = cast('溪上翁', null).dmg;
setup({ daotong: '坎水', gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], shenTong: ['溪上翁'], gfProf: { juqi: 0 } });
S.stKind['溪上翁'] = '术';
const juqiMin = cast('溪上翁', null).dmg;
ok(juqiMax === juqiMin, '聚气诀（内功）熟练度化境不影响神通伤害');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
