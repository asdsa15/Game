// v10.1 第一梯队专项：可达性回归
// 目的：填上「已到达的功能算得对，定义的功能能不能到达」这个验证盲区。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, removeChild() {}, setAttribute() {},
    getAttribute() { return null; }, querySelector() { return makeEl('q'); },
    querySelectorAll() { return []; }, closest() { return null; },
    contains() { return false; }, focus() {}, click() {},
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
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
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

function setup(opts) {
  opts = opts || {};
  S = G.S;
  S.phase = opts.phase || 'play';
  S.started = true; S.age = opts.age === undefined ? 40 : opts.age;
  S.lifeMax = opts.lifeMax === undefined ? 200 : opts.lifeMax;
  S.cultivation = opts.cultivation || 'xian';
  S.xRealm = opts.xRealm === undefined ? 1 : opts.xRealm;
  S.xStage = 0; S.xiuwei = 0;
  S.pillar = opts.pillar === undefined ? 0 : opts.pillar;
  S.pos = 0; S.guowei = opts.guowei || null;
  S.anchors = opts.anchors || { wu: 1, ren: 1, shi: 1, yi: 1 };
  S.anchorMiss = { wu: 0, ren: 0, shi: 0, yi: 0 };
  S.merit = opts.merit === undefined ? 0 : opts.merit;
  S.karma = opts.karma === undefined ? 0 : opts.karma;
  S.fame = opts.fame === undefined ? 0 : opts.fame;
  S.pages = opts.pages === undefined ? 3 : opts.pages;
  S.deathReason = opts.deathReason || null;
  S.endingId = opts.endingId || null;
  S.reincShown = opts.reincShown || false;
  S.legacyPact = null; S.bloodDebt = 0;
  S.stones = 1000; S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.month = 3; S.year = 387; S.turn = 0; S.xun = 0;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.arts = []; S.disks = []; S.craftedQ = {};
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.npcs = {}; S.cave = { facilities: {} }; S.draft = null;
  S.combat = null; S.dying = null; S.dyingUsed = false;
  S.tally = (typeof G.tallyInit === 'function') ? G.tallyInit() : {};
  S.flags = {};
}

/* ============ 1. 软死档：pages 耗尽仍有出口 ============ */
console.log('=== 1. 软死档 ===');
setup({ phase: 'over', pages: 0, deathReason: '寿元尽。' });
G.render();
let html = els['stage'] ? els['stage'].innerHTML : '';
ok(html.indexOf('空手投胎') >= 0, 'pages=0 时结局界面给出「空手投胎」入口');
ok(html.indexOf('do;rebor') >= 0, '该入口绑定 do;rebor 动作');
ok(html.indexOf('do;burn') < 0, 'pages=0 时不再显示「烧一页」（那个按钮点了会失效）');

setup({ phase: 'over', pages: 2, deathReason: '寿元尽。' });
G.render();
html = els['stage'] ? els['stage'].innerHTML : '';
ok(html.indexOf('烧一页重来') >= 0, 'pages>0 时仍走原来的烧页入口');
ok(html.indexOf('空手投胎') < 0, '有页时不显示空手投胎');

/* do_rebor 真的能把局面推到可玩 */
setup({ phase: 'over', pages: 0, deathReason: '寿元尽。' });
G.ACT.do_rebor();
S = G.S;
ok(S.phase !== 'over', '空手投胎后离开结局界面（phase=' + S.phase + '）');
ok(S.pages === 0, '空手投胎不凭空补页', S.pages);
ok(!S.legacy, '空手投胎不带任何传承', JSON.stringify(S.legacy));
ok((S.bloodDebt || 0) > 0, '空手投胎仍加血债', S.bloodDebt);

/* 有页时不允许空手投胎（防止绕过烧页） */
setup({ phase: 'over', pages: 2 });
const beforePhase = S.phase;
G.ACT.do_rebor();
S = G.S;
ok(S.phase === 'over', 'pages>0 时空手投胎被拒绝');

/* ============ 2. 12 个结局全部可达 ============ */
console.log('=== 2. 结局可达性 ===');
ok(D.ENDINGS.length === 12, 'ENDINGS 共 12 个', D.ENDINGS.length);

function endingOf(opts) { setup(opts); const e = G.resolveEnding(); return e ? e.id : null; }

const cases = [
  ['sit',      { deathReason: '寿元尽。', karma: 200 }],
  ['xiaoyao',  { deathReason: '寿元尽。', merit: 150, karma: 0 }],
  ['daohua',   { deathReason: '失锚，意识散成山雾。' }],
  ['fall',     { deathReason: '被散修当场击杀。' }],
  ['guowei',   { guowei: { n: '某果位' }, xRealm: 4 }],
  ['zhenjun',  { pillar: 7, merit: 0 }],
  ['shizun',   { pillar: 7, merit: 300 }],
  ['daotai',   { xRealm: 5, anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, merit: 0 }],
  ['ascend',   { xRealm: 5, anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, merit: 150, karma: 0 }],
  ['xianzun',  { fame: 500 }],
  ['modao',    { karma: 300 }],
  ['reinc',    { endingId: 'reinc' }],
];
const got = {};
cases.forEach(function (pair) {
  const id = pair[0], opts = pair[1];
  const r = endingOf(opts);
  got[id] = r;
  ok(r === id, '可达：' + id, '实得 ' + r);
});

const missing = D.ENDINGS.filter(function (e) { return !got[e.id]; }).map(function (e) { return e.id; });
ok(missing.length === 0, '12 个结局无一遗漏', missing.join(','));

/* ascend 需要真的"补回四境"：四锚不齐就不该给 */
setup({ xRealm: 5, anchors: { wu: 1, ren: 0, shi: 1, yi: 1 }, merit: 150, karma: 0 });
ok(G.resolveEnding().id === 'daotai', '四锚不齐时不判登仙，落回道胎');

/* ============ 2b. 真实死亡流程（v10.3 P0） ============
   旧测试用 setup({deathReason:null}) 调 resolveEnding，验证的是
   一个游戏永远不会产生的状态：真实路径必定先写 deathReason，
   而旧顺序里 `if (deathReason) return 'fall'` 抢在前头，
   于是道胎/果位/登仙/名望/魔道五个结局永不出现。
   下面这条用例走完整链路：气血归零 → 临终 → 闭眼 → 结局。 */
console.log('=== 2b. 真实死亡流程 ===');
setup({ xRealm: 4, merit: 0, karma: 0 });
S.hp = 0;
G.render();
ok(S.phase === 'dying', '气血归零先进临终，不直接进结局', S.phase);
G.ACT.do_die('close');
S = G.S;
ok(S.phase === 'over', '临终闭眼后进入结局屏（phase=' + S.phase + '）');
ok(!!S.deathReason, '真实死亡一定带死亡原因', S.deathReason);
ok(G.resolveEnding().id === 'fall', '寻常横死仍是「陨落」', G.resolveEnding() && G.resolveEnding().id);

/* 死在金丹果位上：应当是果位收束，而不是被死因判成陨落 */
setup({ xRealm: 4, guowei: { n: '玄天果位' }, merit: 0, karma: 0 });
S.hp = 0; G.render(); G.ACT.do_die('close'); S = G.S;
ok(G.resolveEnding().id === 'guowei', '金丹果位横死按「果位」收束',
  G.resolveEnding() && G.resolveEnding().id);

/* 道胎横死：四锚全固但功德不足，落道胎而非登仙 */
setup({ xRealm: 5, merit: 0, karma: 0 });
S.hp = 0; G.render(); G.ACT.do_die('close'); S = G.S;
ok(G.resolveEnding().id === 'daotai', '道胎横死按「道胎」收束',
  G.resolveEnding() && G.resolveEnding().id);

/* 神道失锚写的是「枯朽」，不能按横死处理 */
setup({ cultivation: 'shen', pillar: 5, deathReason: '枯朽：像犹在，不复应汝。' });
ok(G.resolveEnding().id === 'daohua', '神道「枯朽」归入道化，不再算陨落',
  G.resolveEnding() && G.resolveEnding().id);

/* 寿元死只可能发生在有寿元的境界，前置高光判定不能把它抢走 */
setup({ xRealm: 2, age: 60, lifeMax: 60, karma: 0 });
S.hp = 0;
/* 寿元死来自 advanceMonth 的 age>=lifeMax 判定，这里直接走同一入口 */
S.deathReason = '寿元耗尽。你在蒲团上坐着，直到风把道袍吹干。';
ok(G.resolveEnding().id === 'sit', '低境寿元死仍按「坐化」收束',
  G.resolveEnding() && G.resolveEnding().id);

/* ============ 3. oldGrudge 计数器已接 ============ */
console.log('=== 3. 旧怨上门 ===');
setup({});
const t0 = (S.tally || {}).oldGrudge || 0;
S.enemy = true; S.enemyName = '血奉执事';
/* 直接走战斗记账入口：构造一场「寻仇胜利」 */
S.combat = { foe: { name: '血奉执事', rank: 1, power: 10, hp: 0, hpMax: 100, trait: 'normal', el: 'fire' },
  round: 3, isVengeance: 'person' };
G.noteCombatWin(S.combat);
ok(((S.tally || {}).oldGrudge || 0) === t0 + 1, '击杀旧仇计入 oldGrudge', (S.tally || {}).oldGrudge);
ok(S.enemy === false, '旧仇已了，S.enemy 复位', S.enemy);

/* ============ 4. reinc 文本在烧页面板可见 ============ */
console.log('=== 4. 百世书结局可见 ===');
setup({ phase: 'over', pages: 2 });
G.ACT.do_burn();
const burnHtml = els['modals'] ? els['modals'].innerHTML : '';
const reinc = D.ENDINGS.find(function (e) { return e.id === 'reinc'; });
ok(burnHtml.indexOf(reinc.name) >= 0, '烧页面板出现「' + reinc.name + '」结局名');
ok(burnHtml.indexOf(reinc.text.slice(0, 8)) >= 0, '烧页面板出现该结局正文');
/* v10.3 P0：烧页即这一世的收束，结局判定要认这个标记 */
ok(S.reincShown === true, '烧页打上 reincShown 标记');
ok(G.resolveEnding() && G.resolveEnding().id === 'reinc',
  '烧页后结局判为「' + reinc.name + '」', G.resolveEnding() && G.resolveEnding().id);

/* ============ 5. 战斗状态可见 ============ */
console.log('=== 5. 战斗状态可见 ===');
setup({});
S.combat = {
  foe: { name: '散修', rank: 1, power: 20, hp: 80, hpMax: 100, trait: 'normal', el: 'fire' },
  round: 2, observed: true, defending: true,
  foeMark: 2, foeWeaken: 1, talBuff: 0.3, talBuffTurns: 3, talShield: 0.6, noFoeFlee: true, momentum: 2
};
/* renderCombat 返回 HTML 字符串（不落 DOM），直接取返回值 */
const cbHtml = G.renderCombat() || '';
ok(cbHtml.indexOf('破绽') >= 0, '显示「破绽」（foeMark）');
ok(cbHtml.indexOf('压制') >= 0, '显示「压制」（foeWeaken）');
ok(cbHtml.indexOf('增益') >= 0, '显示「增益」（talBuff）');
ok(cbHtml.indexOf('护体') >= 0, '显示「护体」（talShield）');
ok(cbHtml.indexOf('锁灵') >= 0, '显示「锁灵」（noFoeFlee）');
ok(cbHtml.indexOf('敌方气势') >= 0, '显示「敌方气势」增伤');
/* 剩余回合应来自字段本身，而不是写死 */
ok(cbHtml.indexOf('2 回合') >= 0, '破绽显示剩余 2 回合（读自 foeMark）');
ok(cbHtml.indexOf('1 回合') >= 0, '压制显示剩余 1 回合（读自 foeWeaken）');
/* v10.7 P1：破绽/压制/灼烧/迟滞是打在他身上的，标签必须落在敌方卡，
   我方卡只留守势/看破/增益/护体这类作用在自己身上的状态。 */
const foePart = cbHtml.slice(cbHtml.indexOf('敌方'), cbHtml.indexOf('我方'));
const myPart = cbHtml.slice(cbHtml.indexOf('我方'));
ok(foePart.indexOf('破绽') >= 0, '「破绽」在敌方卡上');
ok(foePart.indexOf('压制') >= 0, '「压制」在敌方卡上');
ok(myPart.indexOf('破绽') < 0, '「破绽」不再出现在我方卡');
ok(myPart.indexOf('压制') < 0, '「压制」不再出现在我方卡');
ok(myPart.indexOf('守势') >= 0, '「守势」仍在我方卡');
ok(myPart.indexOf('增益') >= 0, '「增益」仍在我方卡');

/* 干净状态不该堆 chip */
setup({});
S.combat = { foe: { name: '散修', rank: 1, power: 20, hp: 80, hpMax: 100, trait: 'normal', el: 'fire' },
  round: 1, observed: false, defending: false };
const clean = G.renderCombat() || '';
ok(clean.indexOf('破绽') < 0, '无 foeMark 时不显示破绽');
ok(clean.indexOf('压制') < 0, '无 foeWeaken 时不显示压制');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
