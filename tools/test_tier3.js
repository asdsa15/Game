// v10.1 第三梯队专项：破境瓶颈 + 死表盘活
// 核心命题：把「修为满就能突破」改成「有条件才能突破」，
// 但绝对不能变成「卡死」。所以本文件一半断言在验「解法确实可达」。
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
fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); })
  .sort().forEach(function (f) { FILES.push(f); });
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
  S.age = 40; S.lifeMax = 500; S.lifeStop = false;
  S.cultivation = opts.cultivation || 'xian';
  S.root = opts.root || 'true_';
  S.rootEls = opts.rootEls || ['metal', 'water', 'wood'];
  S.gongfa = opts.gongfa || ['juqi'];
  S.ownedGongfa = opts.ownedGongfa || [].concat(S.gongfa);
  S.body = opts.body || 'plain';
  S.xRealm = opts.xRealm === undefined ? 1 : opts.xRealm;
  S.xStage = opts.xStage === undefined ? 0 : opts.xStage;
  S.xiuwei = opts.xiuwei === undefined ? 0 : opts.xiuwei;
  S.shenTong = [];
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.stones = 1000; S.month = 3; S.year = 387;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.arts = []; S.disks = []; S.craftedQ = {};
  S.stats = opts.stats || { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.combat = null; S.preBuff = null; S.talismans = {};
  S.pillar = opts.pillar === undefined ? 0 : opts.pillar;
  S.pos = opts.pos === undefined ? 0 : opts.pos;
  S.guowei = opts.guowei || null;
  S.miao = '野祀'; S.miaoUp = {};
  S.followers = 1000; S.piety = opts.piety === undefined ? 1 : opts.piety;
  S.xianghuo = 0; S.meditate = false;
  S.arrears = 0; S.templeBroken = false; S.lingqi = 1;
  S.books = opts.books || []; S.bookRead = opts.bookRead || {}; S.insightXp = opts.insightXp || 0;
  S.faxiang = opts.faxiang || 'g1';
  S.trib = null; S.tribLock = 0;
  return S;
}

/* ============================================================
   一、门槛判定本身
   ============================================================ */
console.log('=== 1. 门槛判定 ===');
ok(typeof EXT.breakGate === 'function', 'breakGate 校验器存在');

/* 低境界不设门槛：不能一进练气就被卡 */
setup({ xRealm: 0, gongfa: ['juqi'], rootEls: ['metal'], stats: { qualify: 8, insight: 5, sense: 8, speed: 8, heart: 8, fate: 8 } });
ok(EXT.breakGate().ok === true, '胎息（xRealm 0）不设任何破境门槛——不制造新卡点');

/* 筑基起：灵根与功法相合 */
setup({ xRealm: 1, gongfa: ['juqi'], rootEls: ['metal', 'water', 'wood'] });
ok(EXT.breakGate().ok === true, '无属性功法（聚气诀）不触发五行门槛');

setup({ xRealm: 1, gongfa: ['hongmeng'], rootEls: ['metal', 'water', 'wood'] });
const gateNoEl = EXT.breakGate();
ok(gateNoEl.rows.some(function (r) { return r.id === 'roots'; }), '有属性功法时出现「灵根与功法相合」门槛');

/* 相生覆盖：水功法配 金/水/木 —— 金生水、水生木，全覆盖 */
setup({ xRealm: 1, gongfa: ['bihai'], rootEls: ['metal', 'water', 'wood'] });
const gateCover = EXT.breakGate();
const rootsRow = gateCover.rows.filter(function (r) { return r.id === 'roots'; })[0];
ok(rootsRow && rootsRow.ok === true, '水行功法覆盖金/水/木三系（相生链）→ 门槛满足');

/* 完全不搭：金功法配 火/木 混杂且半数为火 */
setup({ xRealm: 1, gongfa: ['xuanyuan'], rootEls: ['fire', 'earth', 'wood'] });
const gateBad = EXT.breakGate();
const rootsBad = gateBad.rows.filter(function (r) { return r.id === 'roots'; })[0];
ok(rootsBad && rootsBad.ok === false, '金行功法覆盖不到火/土/木 → 门槛不满足');

/* ============================================================
   二、不卡死：每条门槛都有可达解法
   ============================================================ */
console.log('=== 2. 解法可达（关键护栏） ===');
const allRows = (function () {
  var out = [];
  // 仙道各境
  [1, 2, 3].forEach(function (r) {
    setup({ xRealm: r, gongfa: ['juqi'], rootEls: ['metal'], stats: { qualify: 8, insight: 3, sense: 8, speed: 8, heart: 8, fate: 8 } });
    out = out.concat(EXT.breakGate().rows);
  });
  // 神道
  setup({ cultivation: 'shen', xRealm: 1, pillar: 3, piety: 0.5 });
  out = out.concat(EXT.breakGate().rows);
  return out;
})();
const noHint = allRows.filter(function (r) { return !r.hint || !r.hint.length; });
ok(noHint.length === 0, '每条门槛都写明「怎么补」（' + allRows.length + ' 条明细）', noHint.map(function (x) { return x.label; }).join('；'));

/* 灵根门槛真的有解：换一本与主灵根相生的功法就过。
   门槛只看「主系」，不要求覆盖全部已选五行——
   否则四系伪灵根几乎无解，等于把最需要出路的灵根锁死。 */
setup({ xRealm: 1, gongfa: ['xuanyuan'], rootEls: ['fire', 'earth', 'wood'] });
const beforeBad = EXT.breakGate().rows.filter(function (r) { return r.id === 'roots'; })[0];
setup({ xRealm: 1, gongfa: ['liuhuo'], rootEls: ['fire', 'earth', 'wood'] });
const afterFix = EXT.breakGate().rows.filter(function (r) { return r.id === 'roots'; })[0];
ok(beforeBad && beforeBad.ok === false, '金行功法配火主系 → 被挡');
ok(afterFix && afterFix.ok === true, '换成火行功法（与火主系同源）→ 门槛通过，解法真实存在');

/* 四系伪灵根必须也有解——这是最容易写死的组合 */
setup({ xRealm: 1, root: 'pseudo', gongfa: ['bihai'], rootEls: ['water', 'wood', 'fire', 'earth'] });
const pseudoRow = EXT.breakGate().rows.filter(function (r) { return r.id === 'roots'; })[0];
ok(pseudoRow && pseudoRow.ok === true, '四系伪灵根配水行功法（主系水同源）→ 可通过，不会锁死');

/* 道书门槛真的有解：读一卷书就过 */
setup({ xRealm: 2, gongfa: ['juqi'], rootEls: ['metal'], bookRead: {} });
const bookBlocked = EXT.breakGate().blocked.some(function (r) { return r.id === 'book'; });
setup({ xRealm: 2, gongfa: ['juqi'], rootEls: ['metal'], bookRead: { somebook: 1 } });
const bookOk = EXT.breakGate().rows.filter(function (r) { return r.id === 'book'; })[0];
ok(bookBlocked, '紫府起：未读道书 → 被挡');
ok(bookOk && bookOk.ok === true, '读通一层道书 → 门槛解除');

/* 悟性门槛真的有解：悟道点可折算 */
setup({ xRealm: 3, gongfa: ['juqi'], rootEls: ['metal'], stats: { qualify: 8, insight: 11, sense: 8, speed: 8, heart: 8, fate: 8 }, insightXp: 0 });
const insBlocked = EXT.breakGate().blocked.some(function (r) { return r.id === 'insight'; });
ok(insBlocked, '金丹起：悟性 11 < 12 → 被挡');
setup({ xRealm: 3, gongfa: ['juqi'], rootEls: ['metal'], stats: { qualify: 8, insight: 11, sense: 8, speed: 8, heart: 8, fate: 8 }, insightXp: 20 });
ok(EXT.insightBonus() === 1, '20 点悟道点折 1 点悟性');
ok(EXT.effectiveInsight() === 12, '有效悟性 = 11 + 1 = 12');

console.log('=== 3. insightXp 消费端 ===');
setup({ insightXp: 60 });
ok(EXT.insightBonus() === 3, '60 点 → 折悟性 +3');
ok(EXT.insightLabel().indexOf('+3') >= 0, '面板文案显示折算值：' + EXT.insightLabel());

/* ============================================================
   四、PIETY 死表盘活
   ============================================================ */
console.log('=== 4. PIETY 档位 ===');
setup({ piety: 0.5 });
ok(EXT.pietyTier().name === '半信半疑', '0.5 → 半信半疑');
setup({ piety: 1.6 });
ok(EXT.pietyTier().name === '日日供奉', '1.6 → 日日供奉');
setup({ piety: 1.6 });
ok(EXT.pietyTier().nextName === '生死相托', '下一档提示为「生死相托」');
ok(EXT.pietyLabel().indexOf('日日供奉') >= 0, '状态栏文案带档位名：' + EXT.pietyLabel());

/* 神道破柱：虔诚门槛 */
setup({ cultivation: 'shen', pillar: 3, piety: 0.5 });
const pietyGate = EXT.breakGate().blocked.some(function (r) { return r.id === 'piety'; });
ok(pietyGate, '破柱（三柱以上）虔诚不足 → 被挡');
setup({ cultivation: 'shen', pillar: 3, piety: 1.6 });
const pietyOk = EXT.breakGate().rows.filter(function (r) { return r.id === 'piety'; })[0];
ok(pietyOk && pietyOk.ok === true, '虔诚达「日日供奉」→ 破柱门槛解除');

/* ============================================================
   五、QIHE 死表盘活
   ============================================================ */
console.log('=== 5. QIHE 三态 ===');
ok(typeof EXT.qiheKind === 'function', 'qiheKind 存在');
/* 三态由「破柱所用之法」决定：自建=本命 / 借祀=客庙 / 夺祀=相冲。
   起因：原打算按「本柱真君生肖 vs 法相生肖」判相冲，查表发现
   ZHENJUN 与 FAXIANG 是同一套 id 与生肖，clash 永远不触发。 */
setup({ cultivation: 'shen', pillar: 1 }); S.lastBreakMode = 'self';
const kSelf = EXT.qiheKind();
ok(kSelf.key === 'benming', '自建 → 本命线（×' + kSelf.mul + '）');
ok(Math.abs(kSelf.mul - D.QIHE.benming.v) < 1e-9, '本命线读的是 QIHE.benming 表值');

setup({ cultivation: 'shen', pillar: 1 }); S.lastBreakMode = 'borrow';
const kBorrow = EXT.qiheKind();
ok(kBorrow.key === 'guest', '借祀 → 客庙');
ok(Math.abs(kBorrow.mul - D.QIHE.guest.v) < 1e-9, '客庙读的是 QIHE.guest 表值');

setup({ cultivation: 'shen', pillar: 1 }); S.lastBreakMode = 'seize';
const kSeize = EXT.qiheKind();
ok(kSeize.key === 'clash', '夺祀 → 相冲法相');
ok(Math.abs(kSeize.mul - 0.6) < 1e-9, 'QIHE.clash 的 0.6 第一次被真正读取（值为 ' + kSeize.mul + '）');
ok(EXT.qiheNote().indexOf('夺') >= 0 || EXT.qiheNote().length > 0, '三态各有说明文案');

/* ============================================================
   六、法相五行与显圣
   ============================================================ */
console.log('=== 6. 法相生肖五行 ===');
ok(typeof EXT.faxiangElem === 'function', 'faxiangElem 存在');
setup({ faxiang: 'g1', rootEls: ['metal'] });
ok(EXT.faxiangElem() === 'earth' || EXT.faxiangElem() === 'metal' || !!EXT.faxiangElem(),
   '法相能映射出五行：' + EXT.faxiangElem());
const fm = EXT.faxiangXianshengMul();
ok(typeof fm === 'number' && fm >= 0.95 && fm <= 1.10, '显圣相性系数在 [0.95,1.10] 内（' + fm + '）');

/* ============================================================
   七、状态栏可见性
   ============================================================ */
console.log('=== 7. UI 可达性 ===');
setup({ cultivation: 'shen', pillar: 3, piety: 1.6, insightXp: 40 });
const sx = EXT.stateExtras();
ok(sx.indexOf('日日供奉') >= 0, '状态栏显示虔诚档位名');
ok(sx.indexOf('香火气数') >= 0, '状态栏显示香火气数');
ok(sx.indexOf('悟道') >= 0, '状态栏显示悟道点');

/* 门槛面板在破境界面真的出现 */
setup({ xRealm: 2, gongfa: ['xuanyuan'], rootEls: ['fire', 'earth', 'wood'], xiuwei: 99999, bookRead: {} });
const gh = EXT.breakGateHtml();
ok(gh.indexOf('破境门槛') >= 0, '破境面板含门槛区块');
ok(gh.indexOf('解法') >= 0, '未满足项给出解法');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
if (fail > 0) process.exitCode = 1;
