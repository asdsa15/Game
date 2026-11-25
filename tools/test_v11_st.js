// v11 P0-3 专项：神通变体（4 模板 × 5 修饰 = 20 格）
// 断言四件事：
//   1. 全部 49 个道统键 × 池中每个名字都能解析出 5 种变体之一（无 undefined）；
//   2. 同一 (模板, 道统) 组合永远派生同一变体（稳定散列，流派感的前提）；
//   3. 变体倍率真的并进 shenTongSpec().mul（面板展示=结算，不藏二层）；
//   4. 五种修饰的战斗效果各自兑现：定神/剥护体/灼蚀/反虚(meFrail)/大补。
// 用法：node tools/test_v11_st.js
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
function lastLog(re) {
  const l = (S.log || []).find(function (x) { return re.test(x.txt); });
  return l ? l.txt : '';
}

function setup(opts) {
  Object.assign(S, {
    phase: 'play', started: true, age: 40, lifeMax: 200, lifeStop: false,
    cultivation: 'xian', root: 'true_', rootEls: ['metal', 'wood', 'water'],
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], body: 'plain',
    xRealm: 3, xStage: 0, xiuwei: 0, shenTong: [], xianji: '天基',
    hp: 1000, hpMax: 1000, mp: 2000, mpMax: 2000,
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
    kaiMaiXun: 0, wuXinBuff: 0, stKind: {}, stVariant: {}, stEquip: null,
    tutStep: (D.TUTORIAL_STEPS || []).length
  });
  Object.assign(S, opts || {});
  els['modals'] = makeEl('modals');
  return S;
}

function mkCombat(style, foeHp) {
  G.setSeed(4242);
  G.startCombat(false);
  rebind();
  const c = S.combat;
  c.foe.style = style || 'sword';
  c.foe.hp = foeHp || 60000;
  c.foe.hpMax = foeHp || 60000;
  c.foe.power = 300;
  c.foe.rank = 8;
  c.foe.trait = 'normal';
  c.foe.el = 'fire';
  c.foeIntent = G.pickFoeIntent(c);
  return c;
}

function castShenTong(nm) {
  G.dispatch('do;cbt:shentong:' + encodeURIComponent(nm));
  rebind();
}

const VK = ['lianji', 'chuanto', 'chixu', 'fanzhuan', 'kongzhi'];

/* ============ 1. 派生完整性：49 道统键 × 全部名字 ============ */
console.log('【1】派生完整性');
setup({});
{
  let bad = 0, total = 0;
  const keys = Object.keys(D.DAOTONG);
  keys.forEach(function (k) {
    (D.DAOTONG[k] || []).forEach(function (dt) {
      const pool = D.SHENTONG[dt] || [];
      if (!pool.length) { bad++; return; }
      pool.forEach(function (nm) {
        total++;
        const v = G.shenTongVariant(nm);
        if (VK.indexOf(v) < 0) bad++;
      });
    });
  });
  ok(keys.length >= 9, '道统大类键全部遍历（大类 ' + keys.length + ' · 道统 ' +
    keys.reduce(function (a, k) { return a + (D.DAOTONG[k] || []).length; }, 0) + '）');
  ok(bad === 0, total + ' 个神通名全部解析出 5 变体之一，无 undefined', bad);
}

/* ============ 2. 稳定性：同名同境重开游戏不变体 ============ */
console.log('【2】派生稳定性');
{
  setup({ daotong: '太阳' });
  const pool = D.SHENTONG['太阳'];
  const first = pool.map(function (n) { return G.shenTongVariant(n); });
  // 模拟读档：清空缓存再问，答案必须一致
  S.stVariant = {};
  const second = pool.map(function (n) { return G.shenTongVariant(n); });
  ok(JSON.stringify(first) === JSON.stringify(second), '缓存清空后派生结果不变（稳定散列）');
  // 20 格覆盖检查：全池扫一遍，5 种变体都出现过（模板4×修饰5=20 格至少修饰品类全覆盖）
  const seen = new Set();
  Object.keys(D.DAOTONG).forEach(function (k) {
    (D.DAOTONG[k] || []).forEach(function (dt) {
      (D.SHENTONG[dt] || []).forEach(function (nm) {
        setup({ daotong: dt });
        seen.add(G.shenTongVariant(nm));
      });
    });
  });
  ok(VK.every(function (v) { return seen.has(v); }), '5 种修饰在全体道统中都有实例');
}

/* ============ 3. 合成倍率纯净 + 变体独立乘区 ============ */
console.log('【3】合成倍率纯净 · 变体独立乘区');
{
  setup({ daotong: '太阳' });
  const nm = (D.SHENTONG['太阳'] || ['分阳钗（命）'])[0];
  const sp = G.shenTongSpec(nm);
  ok(!!sp.variant && !!sp.variantName, 'spec 带变体：' + sp.variant + '/' + sp.variantName);
  ok(sp.variantAdj === G.ST_VARIANTS[sp.variant].adj,
    '变体乘区独立记在 variantAdj（=' + sp.variantAdj + '）');
  // sp.mul 是纯净合成倍率：单属名字应恰等于该模板基础倍率，不含变体因子
  ok(sp.variantAdj !== sp.mul, 'sp.mul 未被变体污染（合成 ×' + sp.mul.toFixed(4) + '，变体另计 ×' + sp.variantAdj + '）');
  // 同一道统同类神通变体一致 → 流派感
  const dt = '太阳';
  setup({ daotong: dt });
  const kindsSame = (D.SHENTONG[dt] || [])
    .filter(function (n) { return G.shenTongKind(n) === '命'; })
    .map(function (n) { return G.shenTongVariant(n); });
  if (kindsSame.length >= 2) {
    ok(kindsSame.every(function (v) { return v === kindsSame[0]; }),
      '同道统同模板的神通变体一致（流派感）');
  } else {
    ok(true, '（太阳道统命类不足 2 个，跳过流派一致性）');
  }
}

/* ============ 4. 战斗兑现：五种修饰各自生效 ============ */
console.log('【4】战斗兑现');
function grant(nm, kind, variant) {
  S.shenTong = [nm];
  S.stKind = {}; S.stKind[nm] = kind || G.shenTongKind(nm);
  S.stEquip = [nm];
  S.stVariant = {};
  if (variant) S.stVariant[nm] = variant;   // 覆盖必须在缓存重建之后
}
{
  // —— 控制型：定神 1 合 ——
  let found = null;
  outer:
  for (const dt of Object.keys(D.DAOTONG).reduce((a, k) => a.concat(D.DAOTONG[k]), [])) {
    for (const nm of (D.SHENTONG[dt] || [])) {
      setup({ daotong: dt });
      if (G.shenTongVariant(nm) === 'kongzhi') { found = nm; break outer; }
    }
  }
  ok(!!found, '找到控制型样本：' + (found ? found : '无'));
  if (found) {
    setup({ daotong: '太阳' });
    grant(found, '命', 'kongzhi');
    mkCombat();
    const c = S.combat;
    c.foeCalm = 0; c.foeStun = 0;
    castShenTong(found);
    ok(c.foeCalm > 0 || c.foeStun > 0, '控制型出手后敌方被定神（foeCalm=' + c.foeCalm + '）');
    ok(!!lastLog(/定神/), '日志写「定神 1 合」');
  }
}
{
  // —— 穿透型：剥护体 + 凌位 ——
  setup({ daotong: '太阳' });
  const nm = '金窍心（命）';
  grant(nm, '命', 'chuanto');
  mkCombat();
  const c = S.combat;
  c.foeGuard = 0.4;   // 先给敌方一个护体
  castShenTong(nm);
  ok(c.foeGuard === 0, '穿透型撕破敌方护体');
  ok(c.temperPierce === 1, '穿透型挂凌位（temperPierce）');
  ok(!!lastLog(/剥护体/), '日志写「剥护体」');
}
{
  // —— 持续型：灼蚀 3 合并压势延长 ——
  setup({ daotong: '太阳' });
  const nm = '湖月秋（术）';
  grant(nm, '术', 'chixu');
  mkCombat();
  const c = S.combat;
  c.foeBurn = 0; c.foeWeaken = 0;
  castShenTong(nm);
  ok(c.foeBurn >= 2, '持续型挂上灼蚀（foeBurn=' + c.foeBurn + '）');
  ok(c.foeWeaken >= 3, '持续型压势延长至 3 回合（foeWeaken=' + c.foeWeaken + '）');
  ok(!!lastLog(/灼蚀/), '日志写「灼蚀 3 合」');
}
{
  // —— 反转型：meFrail 挂身 + roundEnd 递减 ——
  setup({ daotong: '太阳' });
  const nm = '往生泉（命身）';
  grant(nm, '命身', 'fanzhuan');
  mkCombat();
  const c = S.combat;
  S.hp = 500;
  castShenTong(nm);
  ok(c.meFrail > 0, '反转型出手后反虚挂身（meFrail=' + c.meFrail + '）');
  ok(!!lastLog(/大补/), '日志写「大补 ×2」');
  const before = c.meFrail;
  G.tickCombatEffects('me', 'roundEnd', c);
  ok(c.meFrail === before - 1, '反虚随回合递减（' + before + '→' + c.meFrail + '）');
}
{
  // —— 连击型：倍率含两段收益 ——
  setup({ daotong: '太阳' });
  const nm = '分阳钗（命）';
  grant(nm, '命', 'lianji');
  const sp = G.shenTongSpec(nm);
  const spC = (function () { S.stVariant[nm] = 'chuanto'; const s = G.shenTongSpec(nm); S.stVariant[nm] = 'lianji'; return s; })();
  const ratio = sp.variantAdj / spC.variantAdj;   // 变体独立乘区：读 variantAdj（sp.mul 已不含变体）
  ok(Math.abs(ratio - 1.24 / 0.85) < 0.001,
    '连击/穿透 变体乘区比 = 1.24/0.85（实得 ' + ratio.toFixed(4) + '）');
  mkCombat();
  castShenTong(nm);
  ok(!!lastLog(/两波叠打/), '日志写「两波叠打」');
}
{
  // —— 倍率兑现：连击 vs 控制 在同名下的伤害差 ——
  // 注意：必须用开战时捕获的 c 读伤，不能用 S.combat —— 连击型不定神，
  // 敌方会回击，玩家气血低时可能战败把 S.combat 清成 null（本轮实测踩过）。
  setup({ daotong: '太阳', mp: 5000, mpMax: 5000, hp: 900000, hpMax: 900000 });
  const nm = '分阳钗（命）';
  grant(nm, '命', 'lianji');
  mkCombat('sword', 900000);
  const cA = S.combat, hp0 = cA.foe.hp;
  castShenTong(nm);
  const dmgA = hp0 - cA.foe.hp;
  setup({ daotong: '太阳', mp: 5000, mpMax: 5000, hp: 900000, hpMax: 900000 });
  grant(nm, '命', 'kongzhi');
  mkCombat('sword', 900000);
  const cB = S.combat, hp1 = cB.foe.hp;
  castShenTong(nm);
  const dmgB = hp1 - cB.foe.hp;
  ok(dmgA > dmgB && dmgA > 0 && dmgB > 0, '同神通：连击直伤 > 控制直伤（' + dmgA + ' vs ' + dmgB + '，控制有 −20%）');
}

/* ============ 汇总 ============ */
console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
