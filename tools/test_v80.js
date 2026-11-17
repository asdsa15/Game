// v8.0 专项：神器维护、愿物上限、拍卖会成交/流拍、品相库存一致性
// 用 DOM 桩真跑 ACT，验的是「玩家点了之后账有没有变对」，不是纯函数。
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
const G = window.WXCS3;
/* 读档会把模块内的 S 换成新对象，所以这里不能一次性捕获引用 */
let S = G.S;
const D = G.D;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
const realRandom = Math.random;
function fixRandom(v) { Math.random = function () { return v; }; }
function restoreRandom() { Math.random = realRandom; }

function setup(cult, opts) {
  opts = opts || {};
  S = G.S;   // 重新绑定：读档后模块内的 S 已是另一个对象
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = cult || 'shen';
  S.xRealm = 0; S.xStage = 0; S.xiuwei = 0;
  S.pillar = 0; S.pos = 0; S.xianghuo = opts.xianghuo || 0; S.followers = opts.followers || 0;
  S.piety = 1.0; S.miao = '野祀'; S.miaoUp = {}; S.miaoSites = 0;
  S.stones = opts.stones === undefined ? 5000 : opts.stones;
  S.month = 1; S.year = opts.year || 387; S.turn = 0;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = [];
  S.craftedQ = {}; S.karma = 0; S.merit = 0; S.fame = 0; S.sellCh = 'market';
  S.dArt = { staff: 0, mirror: 0, seal: 0 }; S.dArtIdle = 0;
  S.votive = {}; S.votMade = 0; S.votSold = 0;
  S.aucSell = []; S.aucYear = 0; S.aucFloor = 'mid'; S.aucLot = null; S.aucLotWon = null;
  S.equipped = {}; S.anchors = { wu: 1, ren: 1, shi: 1, yi: 1 };
  S.anchorMiss = { wu: 0, ren: 0, shi: 0, yi: 0 };
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.npcs = {}; S.npcCall = null; S.dying = null; S.dyingUsed = false; S.legacyPact = null;
  S.flags = {};
}

/* ==================== 1. 神器：买、升级、维护、停供 ==================== */
console.log('=== 1. 神器 ===');
setup('shen', { stones: 6000 });
G.ACT.do_dart('staff');
ok(S.dArt.staff === 1, '请回摄心神杖 1 级', S.dArt.staff);
ok(S.stones === 4800, '扣 1200 灵石', S.stones);
G.ACT.do_dart('staff');
ok(S.dArt.staff === 2, '升到 2 级', S.dArt.staff);
ok(S.stones === 6000 - 1200 - 1920, '二级价 1200×1.6', S.stones);
G.ACT.do_dart('staff');
ok(S.dArt.staff === 2, '灵石不足时升不上去', S.dArt.staff);
S.stones = 20000;
G.ACT.do_dart('staff');
ok(S.dArt.staff === 3, '补足灵石升到 3 级', S.dArt.staff);
G.ACT.do_dart('staff');
ok(S.dArt.staff === 3, '三级为顶，不能超', S.dArt.staff);

S.year = 388; S.month = 1; S.turn = 12;
const st0 = S.stones;
G.ACT.cultivate();
ok(S.stones === st0 - 180, '每月维护 60×3 = 180 灵石', st0 - S.stones);
S.stones = 0;
G.ACT.cultivate();
ok(S.dArtIdle === 1, '付不起维护 → 停供', S.dArtIdle);
S.xianghuo = 300;
G.ACT.cultivate();
ok(S.dArtIdle === 2, '继续欠费则停供月数累加', S.dArtIdle);
S.stones = 1000;
G.ACT.cultivate();
ok(S.dArtIdle === 0, '补上灵石 → 神器恢复', S.dArtIdle);
ok(S.dArt.staff === 3, '停供不掉级', S.dArt.staff);

/* ==================== 2. 神器效果：走数值而不是走文案 ==================== */
console.log('=== 2. 神器效果 ===');
// 香火存储上限：一柱 base 800；神印 3 级应为 800×1.45=1160
setup('shen');
S.miaoUp = {};
S.dArt.seal = 0;
S.xianghuo = 100000;
G.ACT.cultivate();
const capNoSeal = S.xianghuo;
setup('shen');
S.dArt.seal = 3; S.xianghuo = 100000;
G.ACT.cultivate();
const capSeal = S.xianghuo;
ok(capNoSeal === 800, '一柱香火存储上限 800', capNoSeal);
ok(capSeal === 1160, '牧土神印 3 级把上限抬到 1160', capSeal);

// 显圣耗香：取中档并在上限内比较，避免被 800 的存储上限吃掉差值
setup('shen', { xianghuo: 700 });
S.dArt.mirror = 0;
G.ACT.do_xs('mid');
const leftNoMirror = S.xianghuo;
setup('shen', { xianghuo: 700 });
S.dArt.mirror = 3;
G.ACT.do_xs('mid');
const leftMirror = S.xianghuo;
ok(leftMirror > leftNoMirror, '照愿法镜降了显圣耗香', leftNoMirror + ' → ' + leftMirror);

/* ==================== 3. 愿物：制作、上限、出售 ==================== */
console.log('=== 3. 愿物 ===');
setup('shen', { xianghuo: 100, stones: 500, followers: 0 });
G.ACT.do_votc('xiangHui');
ok((S.votive.xiangHui || 0) === 3, '净香灰一次出 3 件', S.votive.xiangHui);
ok(S.xianghuo === 80, '扣 20 香火', S.xianghuo);
ok(S.stones === 495, '扣 5 灵石', S.stones);
ok(S.votMade === 1, '本月制作次数 +1', S.votMade);
G.ACT.do_votc('xiangHui');
ok((S.votive.xiangHui || 0) === 3, '无信众时每月只能开炉 1 次', S.votive.xiangHui);
G.ACT.do_vots('xiangHui');
ok((S.votive.xiangHui || 0) === 2, '卖出一件', S.votive.xiangHui);
ok(S.stones === 503, '得 8 灵石', S.stones);
G.ACT.do_vots('xiangHui');
ok((S.votive.xiangHui || 0) === 2, '无信众时每月只能卖 1 件', S.votive.xiangHui);

S.followers = 1600;
ok(S.votMade === 1, '前置：已制 1 次');
S.xianghuo = 400; S.stones = 1000;
G.ACT.do_votc('pingAn');
ok((S.votive.pingAn || 0) === 2, '1600 信众后开炉上限放宽，平安符出 2 件', S.votive.pingAn);
ok((S.votive.xiangHui || 0) === 1, '平安符吃掉 1 份净香灰', S.votive.xiangHui);

/* ==================== 4. 拍卖会 ==================== */
console.log('=== 4. 拍卖会 ===');
setup('xian', { stones: 100 });
S.year = 387;
S.bag = { fuYuan: 1 };
G.ACT.do_aucadd('dan', 'fuYuan', 'zhong');
ok(S.aucSell.length === 1, '寄存 1 件', S.aucSell.length);
G.ACT.do_aucadd('dan', 'fuYuan', 'zhong');
ok(S.aucSell.length === 1, '同一件不能重复寄存', S.aucSell.length);
G.ACT.do_aucdel(0);
ok(S.aucSell.length === 0, '可以撤下', S.aucSell.length);
G.ACT.do_aucadd('dan', 'fuYuan', 'zhong');
G.ACT.do_aucadd('dan', 'fuYuan', 'zhong');

// 成交路径：随机数压低 → 三位买家都举牌，低底价必成交
S.aucFloor = 'low';
fixRandom(0.1);
const bagBefore = S.bag.fuYuan;
const stoneBefore = S.stones;
G.ACT.do_aucgo();
restoreRandom();
ok(S.aucYear === S.year, '本场已记入场，一年只能一次', S.aucYear);
ok(S.aucSell.length === 0, '寄售清单已清空', S.aucSell.length);
ok(S.bag.fuYuan === bagBefore - 1, '成交才扣货', S.bag.fuYuan);
ok(S.stones > stoneBefore, '成交后灵石入账', S.stones - stoneBefore);
const afterWin = S.stones;
G.ACT.do_aucgo();
ok(S.stones === afterWin, '同一年再开拍无效（防刷）', S.stones);

// 流拍路径：随机数压低举牌率 → 无人举牌，货原样带回
setup('xian', { stones: 100 });
S.year = 387;
S.bag = { fuYuan: 1 };
S.aucFloor = 'high';
G.ACT.do_aucadd('dan', 'fuYuan', 'zhong');
fixRandom(0.999);
const stoneB2 = S.stones;
G.ACT.do_aucgo();
restoreRandom();
ok(S.bag.fuYuan === 1, '流拍不扣货', S.bag.fuYuan);
ok(S.stones === stoneB2, '流拍不入账', S.stones);
ok(S.aucYear === S.year, '流拍也算进过场', S.aucYear);

/* ==================== 5. 品相库存一致性 ==================== */
console.log('=== 5. 品相库存 ===');
setup('xian', { stones: 500 });
S.year = 388;   // 非拍卖年，避免卖出渠道干扰
S.bag = { fuYuan: 3 };
S.craftedQ = { fuYuan: [{ q: 'ji', n: 2 }] };
S.sellCh = 'market';
G.ACT.do_sellitem('dan', 'fuYuan', 'ji');
ok(S.bag.fuYuan === 2, '卖出一枚后总数 2', S.bag.fuYuan);
const jiRow = (S.craftedQ.fuYuan || []).find(function (x) { return x.q === 'ji'; });
ok(jiRow && jiRow.n === 1, '极品牌相同步扣到 1（余 1 件按中品兜底）', JSON.stringify(S.craftedQ.fuYuan));
G.ACT.do_sellitem('dan', 'fuYuan', 'ji');
ok(S.bag.fuYuan === 1, '再卖一枚后总数 1', S.bag.fuYuan);
const jiLeft = (S.craftedQ.fuYuan || []).filter(function (x) { return x.q === 'ji' && x.n > 0; }).length;
ok(jiLeft === 0, '极品牌相已售罄', JSON.stringify(S.craftedQ.fuYuan));
G.ACT.do_sellitem('dan', 'fuYuan', 'ji');
ok(S.bag.fuYuan === 1, '售罄的品相不能再卖', S.bag.fuYuan);
G.ACT.do_sellitem('dan', 'fuYuan', 'zhong');
ok(S.bag.fuYuan === 0, '剩余按中品结算卖出', S.bag.fuYuan);

/* ==================== 6. 旧档迁移 ==================== */
console.log('=== 6. 旧档迁移 ===');
setup('shen');
// 模拟一个没有 v8.0 字段的旧档
const old = JSON.parse(JSON.stringify({
  phase: 'play', started: true, cultivation: 'shen', name: '旧档', dao: '无名',
  year: 400, month: 5, turn: 130, age: 30, pillar: 2, pos: 1, xianghuo: 100, followers: 800,
  stones: 900, hp: 100, hpMax: 100, mp: 100, mpMax: 100, stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
  bag: {}, bagMat: {}, talismans: {}, arts: [], disks: [], craftedQ: {}, log: [], chronicle: [],
  miaoUp: {}, anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorMiss: { wu: 0, ren: 0, shi: 0, yi: 0 },
  ledger: { income: [], expense: [] }
}));
localStorage.setItem('wxcs3_save', JSON.stringify(old));
let migrated = true;
try {
  G.ACT.do_load();
  G.render();
} catch (e) {
  migrated = false;
  console.log('  ✘ 旧档读入抛错：' + e.message);
}
ok(migrated, '缺 v8.0 字段的旧档能正常读入并渲染');
ok(S.dArt && typeof S.dArt.staff === 'number', '读档后 dArt 已补齐', JSON.stringify(S.dArt));
ok(Array.isArray(S.aucSell), '读档后 aucSell 已补齐');
ok(S.votive && typeof S.votive === 'object', '读档后 votive 已补齐');

/* ==================== 7. NPC 主动事件 ==================== */
console.log('=== 7. NPC 主动事件 ===');
const NPC0 = D.NPC_POOL[0];

setup('shen', { stones: 2000 });
S.npcs = {}; S.npcs[NPC0.id] = { fav: 50, met: true, alive: true, since: 0 };
S.bag = { heal: 1 };

S.npcCall = { id: NPC0.id, kind: 'hurt' };
G.ACT.openNpcCall();
G.ACT.do_npc('heal');
ok(S.npcs[NPC0.id].fav === 64, '重伤施救 → 好感 +14', S.npcs[NPC0.id].fav);
ok(S.merit >= 12, '重伤施救 → 功德 +12', S.merit);
ok(!S.bag.heal || S.bag.heal === 0, '用掉一枚疗伤药', S.bag.heal);
ok(S.npcCall === null, '处理后事件已清空', S.npcCall);

S.npcCall = { id: NPC0.id, kind: 'hurt' };
G.ACT.do_npc('leave');
ok(S.npcs[NPC0.id].fav === 52, '见死不救 → 好感 −12', S.npcs[NPC0.id].fav);
ok(S.karma === 6, '见死不救 → 业力 +6', S.karma);
ok(S.npcs[NPC0.id].injured === true, '伤被拖下去 → 标记 injured', S.npcs[NPC0.id].injured);

S.npcCall = { id: NPC0.id, kind: 'break' };
G.ACT.do_npc('guard');
ok(S.npcs[NPC0.id].fav >= 70, '护法 → 好感 +18', S.npcs[NPC0.id].fav);

S.npcCall = { id: NPC0.id, kind: 'clash' };
const st5 = S.stones;
G.ACT.do_npc('resolve');
ok(S.stones === st5 - 500, '禳解花 500 灵石', st5 - S.stones);

S.npcCall = { id: NPC0.id, kind: 'marry' };
S.npcs[NPC0.id].fav = 70;
G.ACT.do_npc('marry');
ok(S.npcs[NPC0.id].mate === true, '应下婚约 → 结为道侣', S.npcs[NPC0.id].mate);
ok(S.npcs[NPC0.id].fav === 120, '道侣好感封顶 120', S.npcs[NPC0.id].fav);

S.npcs[NPC0.id].alive = false;
S.npcCall = { id: NPC0.id, kind: 'funeral' };
const m0 = S.merit;
G.ACT.do_npc('mourn');
ok(S.merit === m0 + 30, '送葬 → 功德 +30', S.merit - m0);
ok((S.tally || {}).npcFuneral >= 1, '记入功过格 npcFuneral（ren_song 可达）', (S.tally || {}).npcFuneral);

// 触发：随机数压零 → 必定发生一次主动来访
setup('shen', { stones: 2000 });
S.npcs = {}; S.npcs[NPC0.id] = { fav: 80, met: true, alive: true, since: 0, lastCall: -99 };
S.turn = 20; S.month = 12;
fixRandom(0);
G.ACT.cultivate();
restoreRandom();
ok(!!S.npcCall, '好感高的 NPC 会主动上门', JSON.stringify(S.npcCall));
ok(S.npcCall && S.npcCall.kind === 'marry', '好感 ≥60 且无道侣时优先婚约', S.npcCall && S.npcCall.kind);

// 伤重不治 → 葬礼
setup('shen', { stones: 2000 });
S.npcs = {}; S.npcs[NPC0.id] = { fav: 80, met: true, alive: true, since: 0, injured: true, lastCall: 99 };
S.turn = 100; S.month = 12;
fixRandom(0);
G.ACT.cultivate();
restoreRandom();
ok(S.npcs[NPC0.id].alive === false, '伤重不治会死', S.npcs[NPC0.id].alive);
ok(S.npcCall && S.npcCall.kind === 'funeral', '死亡转为丧讯', S.npcCall && S.npcCall.kind);

/* ==================== 8. 临终三选 ==================== */
console.log('=== 8. 临终 ===');
setup('xian', { stones: 500 });
S.age = 120; S.lifeMax = 120; S.month = 12; S.turn = 100;
G.ACT.cultivate();
ok(S.phase === 'dying', '寿元耗尽先进临终，不直接结束', S.phase);
ok(S.dying && /寿元/.test(S.dying.reason), '临终原因已记录', S.dying && S.dying.reason);
G.ACT.do_die('close');
ok(S.phase === 'over', '闭眼 → 正常结局', S.phase);

// 最后一搏成功：随机压零必过
setup('xian', { stones: 500 });
S.phase = 'dying'; S.dying = { reason: '气血耗尽。' }; S.dyingUsed = true;
S.hp = 0; S.lifeMax = 120;
fixRandom(0);
G.ACT.do_die('stand');
restoreRandom();
ok(S.phase === 'play', '最后一搏成功 → 回到游戏', S.phase);
ok(S.hp === 1, '只剩一线气血', S.hp);
ok(S.lifeMax === 110, '寿元上限 −10', S.lifeMax);

// 最后一搏失败
setup('xian', { stones: 500 });
S.phase = 'dying'; S.dying = { reason: '气血耗尽。' }; S.dyingUsed = true;
fixRandom(0.99);
G.ACT.do_die('stand');
restoreRandom();
ok(S.phase === 'over', '最后一搏失败 → 真死', S.phase);
ok(/最后一搏未成/.test(S.deathReason || ''), '结局写明搏没搏回来', S.deathReason);

// 传功后人：留下 legacyPact
setup('xian', { stones: 500 });
S.npcs = {}; S.npcs[NPC0.id] = { fav: 60, met: true, alive: true, since: 0 };
S.phase = 'dying'; S.dying = { reason: '气血耗尽。' }; S.dyingUsed = true;
G.ACT.do_die('pass');
ok(S.legacyPact === 'pass', '传功后人 → 记下来世加成', S.legacyPact);
ok(S.phase === 'over', '传功后仍会死', S.phase);

// 一局只给一次临终
setup('xian', { stones: 500 });
S.dyingUsed = true;
S.age = 120; S.lifeMax = 120; S.month = 12;
G.ACT.cultivate();
ok(S.phase === 'over', '用过一次后直接死，不再进临终', S.phase);

/* ==================== 9. 渲染冒烟 ==================== */
console.log('=== 9. 渲染冒烟 ===');
function noThrow(fn, name) {
  try { fn(); ok(true, name); } catch (e) { ok(false, name, e.message); }
}

setup('shen', { stones: 5000, xianghuo: 300, followers: 900 });
noThrow(function () { G.render(); }, '常规神道局面渲染');
noThrow(function () { G.ACT.openDivineArts(); }, '神器面板渲染');
noThrow(function () { G.ACT.openVotive(); }, '愿物面板渲染');
noThrow(function () { G.ACT.openTut(); }, '新手引导面板渲染');

S.npcCall = { id: NPC0.id, kind: 'hurt' };
noThrow(function () { G.render(); }, '有客来访时渲染（常驻区多一项）');
noThrow(function () { G.ACT.openNpcCall(); }, '来访面板渲染');

S.phase = 'dying'; S.dying = { reason: '气血耗尽。' };
noThrow(function () { G.render(); }, '临终页渲染');
S.phase = 'play'; S.dying = null;

setup('xian', { stones: 5000 });
S.year = 387;
noThrow(function () { G.ACT.openAuction(); }, '拍卖会面板渲染');
S.tutStep = 0;
noThrow(function () { G.ACT.do_tut('next'); }, '引导推进不抛错');
ok(S.tutStep === 1, '引导推进到第二条', S.tutStep);

setup('xian', { stones: 20000 });
S.clan = { name: 'TEST', lv: 1, pop: 120, luck: 60, ident: 'di', rules: [], founded: 0,
  ind: { farm: 0, work: 0, trade: 0, study: 0 }, elder: 'jin' };
noThrow(function () { G.ACT.openClanInd(); }, '家族产业面板渲染');
G.ACT.do_ind('work', 'plus');
ok(S.clan.ind.work > 0, '派人帮工后人数增加', S.clan.ind.work);
const stBefore = S.stones;
const xhMonths = S.turn;
G.ACT.cultivate();
ok(S.stones > stBefore || S.stones === stBefore, '家族营生结算不产生负数', S.stones);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
