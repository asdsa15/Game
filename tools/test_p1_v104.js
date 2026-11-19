// v10.4 P1 专项：道统气质 / 功法进修炼 / 四艺按门类 / 入场态势
// ------------------------------------------------------------------
// 立场与 P0 那套一致：每条 ok() 都要对应玩家真能感知的一次变化。
// 「函数返回了配置里的常数」不算证据 —— 那样测的是数据表，不是游戏。
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
    xRealm: 2, xStage: 0, xiuwei: 0, xianji: '玄基', daotong: null,
    shenTong: [], stKind: {},
    hp: 1000, hpMax: 1000, mp: 1000, mpMax: 1000,
    stones: 9999, month: 3, year: 387, turn: 0,
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: [],
    pillar: 0, pos: 0, miao: 0, miaoUp: {}, followers: 0, piety: 1,
    xianghuo: 0, meditate: false, arrears: 0, templeBroken: false, lingqi: 1,
    lifeStopUsed: false, mpGfMul: 1, lifeGfBonus: 0, craftLv: {}, cave: { facilities: {} }
  });
  Object.assign(S, opts);
  return S;
}
function mkFoe(hp, rank, power) {
  return {
    foe: { name: '石傀', hp: hp, hpMax: hp, power: power || 300, rank: rank || 12, el: 'tu', trait: 'brute' },
    round: 1, log: [], stUsed: {}, stanceUsed: {}
  };
}
/* 一次真实出手，返回 {cost, line, dmg} */
function cast(name) {
  S.phase = 'combat';
  const mp0 = S.mp;
  G.ACT.do_cbt('shentong', encodeURIComponent(name));
  const line = (S.log.find(function (x) { return /神通/.test(x.txt || ''); }) || {}).txt || '';
  const d = /造成 (\d+)/.exec(line);
  return { cost: mp0 - S.mp, line: line, dmg: d ? parseInt(d[1], 10) : 0 };
}
function powerNow() {
  S.phase = 'combat';
  S.combat = mkFoe(1e9, 12, 1000);
  const h = G.renderCombat();
  const m = /战力 ([\d.]+)/.exec(h);
  S.combat = null; S.phase = 'play';
  return m ? Number(m[1]) : 0;
}

/* ============================================================
   一、道统气质（S2）
   ============================================================ */
console.log('=== 1. 道统气质 ===');

/* 覆盖完整性：49 个道统必须全部有归属 */
const allDt = [];
Object.keys(D.DAOTONG).forEach(function (k) { D.DAOTONG[k].forEach(function (n) { allDt.push(n); }); });
const covered = {};
Object.keys(D.DAOTONG_TEMPER).forEach(function (k) {
  (D.DAOTONG_TEMPER[k].daotong || []).forEach(function (n) { covered[n] = k; });
});
const missDt = allDt.filter(function (n) { return !covered[n]; });
ok(allDt.length === 49, '道统总数 49（实际 ' + allDt.length + '）');
ok(missDt.length === 0, '49 个道统全部归入气质族，无遗漏', missDt.join('、'));
ok(Object.keys(D.DAOTONG_TEMPER).length === 7, '气质恰好 7 族');

/* 同是术类、不同道统 → 消耗或伤害必须不同。
   注意：比伤害必须用**同一道**神通，否则比的是神通而不是道统。 */
function castWith(dt, st) {
  setup({ daotong: dt, shenTong: [st] });
  S.stKind[st] = '术';
  S.combat = mkFoe(9e15);
  return cast(st);
}
const same = '位从罗';                       // 固定的术类神通，只换道统
const rGang = castWith('太阳', same);        // 刚烈 +0.10
const rYou = castWith('太阴', same);         // 幽微 −0.05
const rRun = castWith('坎水', same);         // 润下 ±0
ok(rGang.cost > rRun.cost, '刚烈耗灵高于润下（' + rRun.cost + ' → ' + rGang.cost + '）');
ok(rGang.cost > rYou.cost, '刚烈耗灵高于幽微（' + rYou.cost + ' → ' + rGang.cost + '）');
ok(rGang.dmg > rRun.dmg, '刚烈伤害高于润下（' + rRun.dmg + ' vs ' + rGang.dmg + '）');
ok(rGang.dmg > rYou.dmg, '刚烈伤害高于幽微（' + rYou.dmg + ' vs ' + rGang.dmg + '）');
ok(rGang.line !== rYou.line, '同神通、不同道统 → 战报也不同');

/* 无道统时退回原值，行为与本轮之前一致 */
setup({ daotong: null, shenTong: ['郁仪文'] });
S.stKind['郁仪文'] = '术';
S.combat = mkFoe(9e15);
const rNone = cast('郁仪文');
ok(rNone.cost === 40, '无道统时术神通耗灵仍为 40（旧存档零迁移）');

/* 七支气质的附加效果各有一条可观察痕迹 */
function temperMark(dt, st, pick) {
  setup({ daotong: dt, shenTong: [st] });
  S.stKind[st] = '术';
  S.combat = mkFoe(9e15);
  S.combat.momentum = 2;
  const r = cast(st);
  return { r: r, c: S.combat };
}
const tZhuan = temperMark('兑金', '位从孚');   // 转换：回流
ok(/回流/.test(tZhuan.r.line), '转换（兑金）出手后回流灵力：' + (tZhuan.r.line.match(/（[^）]*）/) || [''])[0]);
const tSheng = temperMark('正木', '见查语');    // 生养：养生
ok(/养生/.test(tSheng.r.line), '生养（正木）额外回血：' + (tSheng.r.line.match(/（[^）]*）/) || [''])[0]);
const tRun = temperMark('坎水', '溪上翁');      // 润下：夺势
ok(/夺势/.test(tRun.r.line), '润下（坎水）削敌气势');
ok(tRun.c.momentum < 2, '润下真的把气势从 2 压到 ' + tRun.c.momentum);
const tYan = temperMark('离火', '位从罗');      // 炎上：余焰
ok(/余焰/.test(tYan.r.line), '炎上（离火）点燃余焰');
ok(tYan.c.foeBurn > 0, '炎上真的写入 foeBurn=' + tYan.c.foeBurn);
const tYou = temperMark('太阴', '湖月秋');      // 幽微：阴噬（破绽+1）
ok(/阴噬/.test(tYou.r.line), '幽微（太阴）延长破绽');
const tXu = temperMark('清炁', '分阳钗');       // 虚空：凌位
ok(/凌位/.test(tXu.r.line), '虚空（清炁）无视部分位格压制');
ok(tXu.c.temperPierce === 1, '虚空真的置上 temperPierce');

/* ============================================================
   二、功法进修炼公式（3.2）
   ============================================================ */
console.log('=== 2. 功法倾向进修炼 ===');

function monthGain(gf, hpPct, med) {
  setup({ gongfa: [gf], daogong: gf, ownedGongfa: [gf], meditate: !!med });
  S.hp = Math.round(1000 * hpPct);
  G.advanceMonth(1);
  return S.lastGain;   // 满月速率（界面显示用），与 monthXiuwei 同源
}
const gFull = monthGain('juqi', 1, false);
const gHurt = monthGain('juqi', 0.3, false);
ok(gHurt < gFull, '伤势拖慢修炼（' + gFull + ' → ' + gHurt + '）');

const gChunchun = monthGain('changchun', 0.3, false);
const gXumai = monthGain('xumai', 0.3, false);
ok(gChunchun > gHurt, '长春功带伤修炼快于聚气（' + gHurt + ' → ' + gChunchun + '）');
ok(gXumai > gChunchun, '续脉决（疗伤 30%）又快于长春功（25%）（' + gChunchun + ' vs ' + gXumai + '）');
/* 满血时疗伤功法不该白送修为——否则「带伤」这条设计就废了 */
/* 满血对照必须同品阶：长春功是玄阶（×1.3），与黄阶聚气比会把品阶差
   误读成「heal 白送修为」。用同为玄阶、无 heal 的碧海功作基准。 */
const gBihaiFull = monthGain('bihai', 1, false);
const gChunchunFull = monthGain('changchun', 1, false);
ok(Math.abs(gChunchunFull - gBihaiFull) < 0.05,
   '满血时长春功不比同阶无 heal 功法多（碧海 ' + gBihaiFull + ' vs 长春 ' + gChunchunFull + '）');
const gBihaiHurt = monthGain('bihai', 0.3, false);
ok(gChunchunFull > gBihaiHurt, '同阶对照下，伤时才是 heal 生效的地方');

const gMed = monthGain('juqi', 1, true);
const gMedWard = monthGain('jinguang', 1, true);
ok(gMedWard > gMed, '闭关时守成功法（金光咒）收获更实（' + gMed + ' → ' + gMedWard + '）');
const gWardNormal = monthGain('jinguang', 1, false);
ok(Math.abs(gWardNormal - gFull) < 0.05, 'ward 加成只在闭关生效，平时不加（' + gFull + ' vs ' + gWardNormal + '）');

/* ============================================================
   三、四艺按功法门类（3.3）
   ============================================================ */
console.log('=== 3. 四艺按门类分派 ===');

setup({ gongfa: ['juqi'], daogong: 'juqi' });
ok(EXT.gongfaCraftBonus('dan') === 0, '聚气诀对四艺无加成');

const arts = [
  ['zaohua', 'dan', '造化丹经 → 炼丹'],
  ['jixing', 'qi', '剑君谈玄执金秘章 → 炼器'],
  ['xuanyuan', 'qi', '玄元剑经 → 炼器'],
  ['meihua', 'fu', '梅花易 → 制符'],
  ['xuanguang', 'zhen', '玄光赶山经 → 阵法'],
  ['baishou', 'zhen', '白首叩庭经 → 阵法']
];
const artMiss = [];
arts.forEach(function (a) {
  setup({ gongfa: [a[0]], daogong: a[0] });
  if (!(EXT.gongfaCraftBonus(a[1]) > 0)) artMiss.push(a[2]);
});
ok(artMiss.length === 0, '六本专精功法各自加对了门类', artMiss.join('；'));

/* 串门类不许串加成 */
setup({ gongfa: ['zaohua'], daogong: 'zaohua' });
ok(EXT.gongfaCraftBonus('qi') === 0, '造化丹经不炼器');
ok(EXT.gongfaCraftBonus('fu') === 0, '造化丹经不制符');
ok(EXT.gongfaCraftBonus('zhen') === 0, '造化丹经不布阵');
setup({ gongfa: ['meihua'], daogong: 'meihua' });
ok(EXT.gongfaCraftBonus('dan') === 0, '梅花易不炼丹');

/* 面板文案与结算同源 */
setup({ gongfa: ['zaohua'], daogong: 'zaohua' });
const info = EXT.gongfaInfo('zaohua');
ok(info.text.indexOf('炼丹') >= 0, '功法面板写明「炼丹 +25%」：' + info.text);
ok(info.text.indexOf('炼器') < 0, '功法面板不谎报炼器');

/* onActionHooks 注册表存在且能跑不炸 */
ok(Array.isArray(EXT.onActionHooks) || EXT.onActionHooks === undefined,
   'onActionHooks 注册位已就位（未注册时不报错）');

/* ============================================================
   四、神通入场态势（S4）
   ============================================================ */
console.log('=== 4. 入场态势 ===');

/* 4.1 战力：多样性胜过堆数量 */
const kf4 = { '结璘章（命）': '命', '溪上翁': '术', '仪对影（身）': '身', '目骋怀（目）': '目' };
const kf5 = { '结璘章（命）': '命', '分阳钗（命）': '命', '天下明（命）': '命', '君蹈危（身）': '命', '目骋怀（目）': '命' };
const four = Object.keys(kf4);
const five = Object.keys(kf5);
setup({ shenTong: four, stKind: kf4 });
const pFour = powerNow();
setup({ shenTong: five, stKind: kf5 });
const pFive = powerNow();
ok(pFour > pFive, '四道四类战力高于五道同类（' + pFive + ' → ' + pFour + '）');

/* 4.2 四象归元：首次神通免灵 */
setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
S.combat = mkFoe(9e15);
S.combat.stance = 'sixiang';
S.phase = 'combat';
S.mp = 1000;
const rFour = cast('溪上翁');
ok(rFour.cost === 0, '四象归元：本场首次神通不耗灵力（耗 ' + rFour.cost + '）');
ok(/免灵/.test(rFour.line), '战报写明「免灵」');
/* 第二道就该收钱了 */
const rFour2 = cast('仪对影（身）');
ok(rFour2.cost > 0, '第二道神通恢复收费（' + rFour2.cost + ' 灵）');

/* 4.3 先声夺人：首回合破绽 */
setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
S.combat = mkFoe(9e15);
S.combat.stance = 'xiansheng';
S.phase = 'combat';
const rXs = cast('溪上翁');
ok(/先声/.test(rXs.line), '先声夺人：首次出手带「先声」');
/* foeMark 在出手后的 foeTurn 里已经递减过一次，所以读末态会少 1。
   这里验的是「先声确实额外给了一档」，用同场景下有无先声对比。 */
function markWithStance(st) {
  setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
  S.combat = mkFoe(9e15);
  S.combat.stance = st;
  S.phase = 'combat';
  cast('溪上翁');
  return S.combat ? (S.combat.foeMark || 0) : 0;
}
const markXs = markWithStance('xiansheng');
const markNone = markWithStance(null);
ok(markXs > markNone, '先声夺人：破绽比无态势多一档（' + markNone + ' → ' + markXs + '）');

/* 4.4 守中带攻：首次受击减伤 */
function hurtWithStance(stance) {
  setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
  S.hp = 1e9; S.hpMax = 1e9;
  S.combat = mkFoe(9e9);
  S.combat.stance = stance;
  S.phase = 'combat';
  G.setSeed(8888);
  const h = S.hp;
  G.ACT.do_cbt('defend', '');
  return h - S.hp;
}
const hGuard = hurtWithStance('shouzhong');
const hNone = hurtWithStance(null);
ok(hGuard < hNone, '守中带攻：首次受击减伤（' + hNone + ' → ' + hGuard + '）');
ok(hGuard / hNone < 0.8, '减伤幅度接近三成（' + ((1 - hGuard / hNone) * 100).toFixed(0) + '%）');

/* 4.5 偏执：单类 +20%，其他类禁用
   注意：不能用「结璘章（命）」那种自带标注的名字——stParts 会按标注分类，
   与我强行写进 stKind 的值打架。用无标注名 + 显式 stKind 最稳。 */
setup({ daotong: '离火', shenTong: ['溪上翁', '入坎窞', '浩瀚海', '甲'], stKind: {} });
S.stKind = { '溪上翁': '术', '入坎窞': '术', '浩瀚海': '术', '甲': '身' };
S.combat = mkFoe(9e15);
S.combat.stance = 'pianzhi';
S.phase = 'combat';
const rFocus = cast('溪上翁');
ok(/偏执/.test(rFocus.line), '偏执：专精类出手带 ×1.2 标记');
/* 上一击可能把敌人打死/打退，或被位格差反噬——重新起一场再验禁用 */
setup({ daotong: '离火', shenTong: ['溪上翁', '入坎窞', '浩瀚海', '甲'], stKind: {} });
S.stKind = { '溪上翁': '术', '入坎窞': '术', '浩瀚海': '术', '甲': '身' };
S.combat = mkFoe(9e15);
S.combat.stance = 'pianzhi';
S.phase = 'combat';
S.mp = 1000;
S.log = [];
const mpB = S.mp;
const rBan = cast('甲');
ok(rBan.line === '', '偏执：非专精类被禁用（无战报）');
ok(mpB - S.mp === 0, '偏执：被禁用的神通不扣灵力');
ok(S.combat && S.combat.stUsed['甲'] !== true, '偏执：被禁用的神通不被记为已出');
/* 菜单必须写明为什么点不动，否则玩家以为界面坏了 */
G.ACT.openSkills();
ok(/偏执之势：本场禁用/.test(els['modals'].innerHTML), '偏执：菜单标出「本场禁用」而非静默失败');

/* 4.6 战前可切换，且只能切到已达成的 */
setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
S.combat = mkFoe(9e9);
S.combat.stance = 'four_none';
S.phase = 'combat';
G.ACT.do_cbtpre('stance_sixiang');
ok(S.combat.stance === 'sixiang', '战前可切到已达成态势');
G.ACT.do_cbtpre('stance_pianzhi');
ok(S.combat.stance === 'sixiang', '未达成的态势切不过去（仍是 ' + S.combat.stance + '）');

/* 4.7 面板可见 */
setup({ daotong: '坎水', shenTong: four, stKind: kf4 });
S.combat = mkFoe(9e9);
S.combat.stance = 'sixiang';
S.phase = 'combat';
const html = G.renderCombat();
ok(/势 · 四象归元/.test(html), '战斗面板显示「势 · 四象归元」');

/* 4.8 无神通时不生成态势，行为不变 */
setup({ shenTong: [] });
S.combat = mkFoe(9e9);
S.combat.stance = null;
S.phase = 'combat';
ok(!/势 ·/.test(G.renderCombat()), '不带神通时不显示态势（不打扰普通战斗）');

/* ============================================================
   五、护栏
   ============================================================ */
console.log('=== 5. 护栏 ===');

/* 气质幅度不许越界（方案第六章：mul ±0.1、cost ±5） */
const badTemper = [];
Object.keys(D.DAOTONG_TEMPER).forEach(function (k) {
  const t = D.DAOTONG_TEMPER[k];
  if (Math.abs(t.mul || 0) > 0.10 + 1e-9) badTemper.push(k + ' mul=' + t.mul);
  if (Math.abs(t.cost || 0) > 5 + 1e-9) badTemper.push(k + ' cost=' + t.cost);
});
ok(badTemper.length === 0, '气质幅度全部在 ±0.10 / ±5 护栏内', badTemper.join('；'));

/* 双属封顶仍在（P0 的护栏不能被 P1 悄悄打穿）。
   这里读「倍率」而不是「两次独立结算的伤害比」：
   伤害公式末端有 Math.round + 0.94~1.06 随机，两条路径各舍一次，
/* ---- 倍率读取：靠 data-act 精确定位到这一行 ---- */
function specMulOf(st, dt) {
  setup({ daotong: dt || null, shenTong: [st] });
  /* 不强行写 stKind：带标注的名字（位从险（命身））要靠标注识别双属，
     写成 '术' 会把它压成单属，测出来的就不是双属倍率了。 */
  S.combat = mkFoe(9e15);
  S.phase = 'combat';
  S.mp = 1e6;
  G.ACT.openSkills();
  const html = els['modals'].innerHTML;
  const enc = encodeURIComponent(st);
  const segs = html.split('<li');
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].indexOf('do;cbt:shentong:' + enc + '"') < 0) continue;
    const m = /×(\d+(?:\.\d+)?)/.exec(segs[i]);
    if (m) return Number(m[1]);
  }
  return 0;
}
const mulDbl = specMulOf('位从险（命身）');
const mulSgl = specMulOf('结璘章（命）');
ok(mulDbl > 0 && mulSgl > 0, '两道神通的倍率都能从面板读回（' + mulSgl + ' / ' + mulDbl + '）');
ok(mulDbl / mulSgl <= 1.11,
   '双属封顶 ≤ ×1.10（实际 ×' + (mulDbl / mulSgl).toFixed(4) + '，面板值 ' + mulSgl + '/' + mulDbl + '）');

/* 气质是加法不是叠乘：刚烈的 +0.10 应当加在同一道神通上 */
const mulGang = specMulOf('位从罗', '太阳');
const mulPlain = specMulOf('位从罗', null);
ok(mulGang > mulPlain, '刚烈让同一道神通的倍率变大（' + mulPlain + ' → ' + mulGang + '）');
ok(Math.abs(mulGang - mulPlain - 0.10) < 0.005,
   '刚烈是 +0.10 加法而非 ×1.10（' + mulPlain + ' + 0.10 = ' + mulGang +
   '；若叠乘会是 ' + (mulPlain * 1.1).toFixed(2) + '）');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
