// v9.0 M4 专项：上古遗迹 5~7 节点 / 撤退 / 三选一 / 道果改来世
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
['wxcs3-ext-10-fate.js', 'wxcs3-ext-20-trib.js', 'wxcs3-ext-30-build.js',
 'wxcs3-ext-40-benming.js', 'wxcs3-ext-50-beast.js', 'wxcs3-ext-60-gongfa.js',
 'wxcs3-ext-70-root.js', 'wxcs3-ext-80-gate.js', 'wxcs3-ext-90-revive.js',
 'wxcs3-ext-91-disciple.js', 'wxcs3-ext-92-school.js', 'wxcs3-ext-93-timed.js',
 'wxcs3-ext-94-ruin.js', 'wxcs3-ext-95-fruit.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
const EXT = window.WXCS3_EXT;
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
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = opts.cultivation || 'xian';
  S.xRealm = opts.xRealm === undefined ? 2 : opts.xRealm; S.xStage = 0; S.xiuwei = 0; S.xiuAcc = 0;
  S.stones = opts.stones === undefined ? 5000 : opts.stones;
  S.xianghuo = 0; S.month = opts.month === undefined ? 1 : opts.month;
  S.year = opts.year === undefined ? 387 : opts.year; S.turn = 10; S.xun = 1;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = [];
  S.equipped = {}; S.craft = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.craftLv = { dan: 1, qi: 1, fu: 1, zhen: 1 };
  S.learnedArts = []; S.learnedRecipes = []; S.books = []; S.bookRead = {};
  S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.karma = 0; S.merit = 0; S.fame = 0; S.followers = 0; S.bloodDebt = 0;
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.tally = G.tallyInit();
  S.fate = null; S.fateReroll = 0; S.fengUntil = 0;
  S.npcs = {}; S.npcCall = null; S.disciples = []; S.disciplesOut = []; S.masterId = null;
  S.school = null; S.timed = null; S.timedDone = {};
  S.place = opts.place || 'qingyue'; S.lingqi = 1;
  S.gongfa = ['juqi']; S.ownedGongfa = ['juqi']; S.daogong = 'juqi';
  S.skillsKnown = []; S.skillsEquip = ['zhiquan']; S.shenTong = [];
  S.afterBreak = []; S.holdEvent = false; S.enemy = false; S.enemySect = false;
  S.pendingVengeance = false; S.hookPending = null; S.hooks = [];
  S.goals = ['x1'];
  S.barn = []; S.beastBond = 0; S.beastPower = 1; S.yaoshou = false;
  S.benming = null; S.warBeast = 0; S.beastOfficer = false; S.beastFedMonth = 0;
  S.prep = null; S.trib = null; S.tribLock = 0; S.combat = null;
  S.arrears = 0; S.sectArrears = 0;
  S.unlockStage = 0; S.inDongtian = false; S.dockOpen = {};
  S.ruin = null; S.ruinsKnown = {}; S.ruinsCleared = {}; S.relics = [];
  S.daoFruit = null; S.bookRuinClue = 0; S.oldLetter = null; S.oldTemple = null;
}
function rebind() { S = G.S; }
function hasModal(txt) { return (els['modals'] ? els['modals'].innerHTML : '').indexOf(txt) >= 0; }

/* ==================== 1. 发现入口 ==================== */
console.log('=== 1. 遗迹 · 发现入口 ===');
setup();
const t0 = S.turn * 3 + S.xun;
G.dispatch('do;ruin_search'); rebind();
ok(EXT.ruinKnown().length === 1, '循残图访古找到第一处遗迹', EXT.ruinKnown().map(function (x) { return x.id; }));
ok(S.turn * 3 + S.xun === t0 + 1, '寻访占一旬');
ok(S.ruin === null, '找线索不等于已经进去');
const first = EXT.ruinKnown()[0];
ok(first && first.id === 'yaowang_gu', '初见优先给门槛最低的药王谷', first && first.id);
ok(EXT.mapRows().indexOf('药王谷遗址') >= 0, '舆图挂出遗迹');
ok(EXT.exploreRows().indexOf('访古') >= 0, '历练面板有访古入口');

/* ==================== 2. 进出与撤退 ==================== */
console.log('=== 2. 遗迹 · 进出与撤退 ===');
setup();
EXT.revealRuin('yaowang_gu');
S.xun = 1;
G.dispatch('do;ruin_go:yaowang_gu'); rebind();
ok(S.ruin && S.ruin.site === 'yaowang_gu', '进入遗迹');
ok(S.ruin.seq.length >= 5 && S.ruin.seq.length <= 7, '路线 5~7 节点', S.ruin.seq.join('>'));
ok(S.ruin.seq[0] === 'entry' && S.ruin.seq[S.ruin.seq.length - 1] === 'relic', '入口起、遗物终');
ok(hasModal('药王谷遗址'), '入口节点已展示');
S.xun = 0;
const x1 = S.turn * 3 + S.xun;
G.dispatch('do;ruin_leave'); rebind();
ok(S.ruin === null, '入口处可退出');
ok(S.turn * 3 + S.xun === x1, '入口处退出不耗时', [x1, S.turn * 3 + S.xun]);
S.xun = 1;
G.dispatch('do;ruin_go:yaowang_gu'); rebind();
G.dispatch('do;ruin_step'); rebind();
ok(S.ruin && S.ruin.i === 1, '往里走一个节点');
ok(S.ruin.seq[1] === 'trap', '第二节点是机关', S.ruin.seq.join('>'));
S.xun = 1;
const x2 = S.turn * 3 + S.xun;
G.dispatch('do;ruin_leave'); rebind();
ok(S.ruin === null, '深处可撤退');
ok(S.turn * 3 + S.xun === x2 + 1, '深处退出占一旬');

/* ==================== 3. 机关：本命 / 灵兽 ==================== */
console.log('=== 3. 遗迹 · 机关联动 ===');
setup({ xRealm: 2 });
EXT.revealRuin('yaowang_gu');
S.benming = { artId: 'jiuzhuan', name: '九转飞剑', tier: 2, xp: 0, dmg: 0 };
S.arts = ['jiuzhuan'];
S.ruin = { site: 'yaowang_gu', seq: ['entry', 'trap', 'relic'], i: 1, tail: false };
S.xun = 1;
G.dispatch('do;ruin_opt:trap:benming'); rebind();
ok(S.ruin && S.ruin.i === 2, '本命护身直接过机关');
ok(S.benming.dmg === 8, '机关由本命受下（器损 +8）', S.benming && S.benming.dmg);
setup({ xRealm: 2 });
EXT.revealRuin('yaowang_gu');
S.barn = [{ id: 'huyao', name: '狐妖', bond: 20, power: 1 }];
S.ruin = { site: 'yaowang_gu', seq: ['entry', 'trap', 'relic'], i: 1, tail: false };
S.xun = 1;
G.dispatch('do;ruin_opt:trap:beast'); rebind();
ok(S.barn[0].bond === 18, '灵兽探路，亲密 −2', S.barn[0].bond);

/* ==================== 4. 守关：买路 / 斗 ==================== */
console.log('=== 4. 遗迹 · 守关 ===');
setup({ xRealm: 2, stones: 5000 });
EXT.revealRuin('yaowang_gu');
S.ruin = { site: 'yaowang_gu', seq: ['entry', 'guard', 'relic'], i: 1, tail: false };
S.xun = 1;
G.dispatch('do;ruin_opt:guard:pay'); rebind();
ok(S.stones === 5000 - 120, '买路钱按遗址门槛扣', S.stones);
ok(S.ruin && S.ruin.i === 2, '买路后进入终点');
setup({ xRealm: 2 });
EXT.revealRuin('yaowang_gu');
S.ruin = { site: 'yaowang_gu', seq: ['entry', 'guard', 'relic'], i: 1, tail: false };
S.xun = 1;
G.setSeed(7);   // 首掷约 0.0117，正面斗必定成功
G.dispatch('do;ruin_opt:guard:fight'); rebind();
ok(S.stones > 0, '斗胜有灵石入账', S.stones);
ok(S.ruin && S.ruin.i === 2, '斗胜后进入终点');
G.setSeed(null);

/* ==================== 5. 终点三选一 ==================== */
console.log('=== 5. 遗迹 · 三选一 ===');
setup({ xRealm: 2 });
S.ruinsKnown.yaowang_gu = true;
S.ruin = { site: 'yaowang_gu', seq: ['relic'], i: 0, tail: false };
G.dispatch('do;ruin_take:relic'); rebind();
ok(S.relics.indexOf('yaowang_lu') >= 0, '取走遗物');
ok(S.tally.relic === 1, '首次得遗物计入 tally.relic');
ok(S.ruinsCleared.yaowang_gu === true, '遗址记为已探尽');
ok(S.ruin === null, '取宝后退出探索');
ok(Math.abs(EXT.fateMul('pill') - 1.06) < 1e-9, '遗物被动生效（丹药 +6%）', EXT.fateMul('pill'));

setup({ xRealm: 3, place: 'beiyuan' });
S.ruinsKnown.jianzhong = true;
S.ruin = { site: 'jianzhong', seq: ['relic'], i: 0, tail: false };
G.dispatch('do;ruin_take:gongfa'); rebind();
ok((S.ownedArts || []).indexOf('fa:xuanyuan') >= 0, '取走功法断篇（玄元剑经入术法池）');
ok(S.ruinsCleared.jianzhong === true, '功法路线也能探尽');

setup({ xRealm: 3, place: 'xisha' });
S.ruinsKnown.guixu = true;
S.ruin = { site: 'guixu', seq: ['relic'], i: 0, tail: false };
G.dispatch('do;ruin_take:clue'); rebind();
ok(S.books.indexOf('jiuhuan') >= 0, '取走道书');
ok(S.ruinsCleared.guixu === true, '道书路线也能探尽');

setup({ xRealm: 2 });
EXT.revealRuin('yaowang_gu');
S.ruinsCleared.yaowang_gu = true;
G.dispatch('do;ruin_go:yaowang_gu'); rebind();
ok(S.ruin === null, '已探尽的遗址不再进');

/* ==================== 6. 线索钩子 ==================== */
console.log('=== 6. 遗迹 · 线索钩子 ===');
setup();
EXT.onBookRead({ name: '《玄景残卷》' }, 1);
ok(EXT.ruinKnown().length === 1, '道书二读给一条方位');
EXT.onBookRead({ name: '《人祖传》' }, 1);
ok(EXT.ruinKnown().length === 1, '整局只从书里出一次');
EXT.onAuctionWin({ id: 'lot_map' });
ok(EXT.ruinKnown().length === 2, '拍卖残图再给一条');
setup();
const nrec = { fav: 60, met: true };
EXT.onNpcTalk({ name: '某故人' }, 'x', nrec);
ok(EXT.ruinKnown().length === 1, '高好感故人说出方位');
ok(nrec.ruinClue === 1, '每人只提一次');
EXT.onNpcTalk({ name: '某故人' }, 'x', nrec);
ok(EXT.ruinKnown().length === 1, '提过就不再提');

/* ==================== 7. 旧仇尾随 ==================== */
console.log('=== 7. 遗迹 · 旧仇尾随 ===');
setup();
S.ruinsKnown.yaowang_gu = true;
S.stones = 1000; S.hp = 100; S.hpMax = 100;
S.ruin = { site: 'yaowang_gu', seq: ['relic'], i: 0, tail: true };
G.setSeed(7);
G.dispatch('do;ruin_take:relic'); rebind();
ok(S.stones < 1300, '尾随旧仇拿走一部分灵石', S.stones);
ok(S.hp < 100, '尾随旧仇伤一点气血', S.hp);
G.setSeed(null);

/* ==================== 8. 道果计分 ==================== */
console.log('=== 8. 道果 · 六类计分 ===');
setup();
S.tally.craft = 20; S.learnedRecipes = ['dan_shengji'];
ok(EXT.fruitSnapshot().kind === 'craft', '四艺突出 → 丹火余温', EXT.fruitSnapshot());
setup();
S.school = { name: '青庐', rep: 40 };
S.disciples = [{ id: 1, name: '甲', npcId: D.NPC_POOL[0].id, alive: true, bond: 50 }];
const sf = EXT.fruitSnapshot();
ok(sf.kind === 'school', '道统师徒突出 → 门墙旧信', sf);
ok(sf.npcId === D.NPC_POOL[0].id, '道果记下旧部身份', sf.npcId);
setup();
S.merit = 50; S.followers = 3000; S.cultivation = 'shen';
ok(EXT.fruitSnapshot().kind === 'shen', '神道功德突出 → 残香旧庙');
setup();
S.tally.kill = 12; S.karma = 80;
ok(EXT.fruitSnapshot().kind === 'blood', '魔道血债突出 → 血途旧怨');
setup();
S.relics = ['yaowang_lu']; S.tally.relic = 1; S.books = ['xuanjing']; S.bookRead = { xuanjing: 3 };
ok(EXT.fruitSnapshot().kind === 'relic', '遗迹道书突出 → 古径残图');
setup();
ok(EXT.fruitSnapshot().kind === 'free', '无为而过 → 无牵无挂');

/* ==================== 9. 道果兑现 ==================== */
console.log('=== 9. 道果 · 来世兑现 ===');
setup();
S.learnedRecipes = [];
S.daoFruit = { kind: 'craft', label: '丹火余温', note: '', recipe: 'dan_huichun', applied: false };
EXT.applyFruit();
ok(S.learnedRecipes.indexOf('dan_huichun') >= 0, '四艺道果给一张配方');
ok(S.daoFruit.applied === true, '道果只兑现一次');
const rc0 = S.learnedRecipes.length;
EXT.applyFruit();
ok(S.learnedRecipes.length === rc0, '重复调用不再发');

setup();
S.npcs = {};
S.daoFruit = { kind: 'school', label: '门墙旧信', npcId: D.NPC_POOL[1].id, npcName: D.NPC_POOL[1].name, schoolName: '青庐', applied: false };
EXT.applyFruit();
ok(S.npcs[D.NPC_POOL[1].id] && S.npcs[D.NPC_POOL[1].id].fav === 35, '旧部关系以 35 好感开局');
ok(S.oldLetter && S.oldLetter.id === D.NPC_POOL[1].id, '留下一封旧部来信');

setup({ cultivation: 'shen' });
S.followers = 100; S.xianghuo = 0;
S.daoFruit = { kind: 'shen', label: '残香旧庙', templeName: '山神庙', merit: 2, applied: false };
EXT.applyFruit();
ok(S.followers === 160, '旧庙带来信众 +60', S.followers);
ok(S.xianghuo === 60, '旧庙带来残香 +60', S.xianghuo);
ok(S.daoFruit.temple === true, '旧庙月账已挂');
ok(EXT.fixedCosts2().some(function (x) { return x.id === 'old_temple' && x.xianghuo === 15; }), '每月香火 −15');

setup({ cultivation: 'xian' });
S.followers = 0;
S.daoFruit = { kind: 'shen', label: '残香旧庙', templeName: '山神庙', merit: 2, applied: false };
EXT.applyFruit();
ok(S.daoFruit.temple === false, '仙道不带旧庙月账');
ok(!EXT.fixedCosts2().some(function (x) { return x.id === 'old_temple'; }), '仙道无旧庙香火支出');

setup();
const enemy = D.NPC_POOL[1].id;
S.daoFruit = { kind: 'blood', label: '血途旧怨', enemyId: enemy, enemyName: D.NPC_POOL[1].name, karma: 8, applied: false };
EXT.applyFruit();
ok(S.npcs[enemy] && S.npcs[enemy].fav === -45, '早期仇家以 −45 好感开局', S.npcs[enemy]);
ok(S.karma === 8, '旧怨带来业力', S.karma);

setup();
S.ruinsKnown = {};
S.daoFruit = { kind: 'relic', label: '古径残图', mode: 'site', applied: false };
EXT.applyFruit();
ok(EXT.ruinKnown().length === 1, '古径道果给一处遗迹方位');

setup();
S.books = [];
S.daoFruit = { kind: 'relic', label: '古径残图', mode: 'book', book: 'xuanjing', applied: false };
EXT.applyFruit();
ok(S.books.indexOf('xuanjing') >= 0, '古径道果的另一种形态给道书');

setup();
S.daoFruit = { kind: 'free', label: '无牵无挂', applied: false };
EXT.applyFruit();
ok(S.daoFruit.applied === true, '逍遥道果无负担地兑现');

/* ==================== 10. 命格候选 ==================== */
console.log('=== 10. 道果 · 命格候选 ===');
setup();
S.daoFruit = { kind: 'free', label: '无牵无挂', applied: true };
ok(EXT.fateCandidates().length === 4, '逍遥道果多一道命格候选', EXT.fateCandidates());
setup();
S.daoFruit = { kind: 'blood', label: '血途旧怨', applied: true };
ok(EXT.fateCandidates().indexOf('xuezhai') >= 0, '血债道果必出血债命格', EXT.fateCandidates());
setup();
S.daoFruit = null;
ok(EXT.fateCandidates().length === 3, '无道果仍是三选一');

/* ==================== 11. 百世书接入 ==================== */
console.log('=== 11. 百世书 · 道果快照与创角兑现 ===');
setup();
S.pages = 3;
S.tally.craft = 20; S.craft.dan = 20; S.learnedRecipes = ['dan_shengji'];
G.dispatch('do;legacy:treasure'); rebind();
ok(S.daoFruit && S.daoFruit.kind === 'craft', '烧页时取下本世道果', S.daoFruit);
ok(S.daoFruit && S.daoFruit.recipe === 'dan_huichun', '道果按主修四艺选起步配方', S.daoFruit && S.daoFruit.recipe);
ok(S.started === false, '进入创角');
S.draft = {
  name: '复生', gender: '男', age: 16, look: '', cultivation: 'xian', faxiang: null,
  origin: D.ORIGINS[0].id, path: D.PATHS[0].id, root: 'pseudo', rootEls: [],
  body: null, talents: [], stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 }
};
G.dispatch('create-start'); rebind();
ok(S.started === true, '创角完成');
ok(S.daoFruit && S.daoFruit.applied === true, '创角时兑现道果');
ok(S.learnedRecipes.indexOf('dan_huichun') >= 0, '道果配方已落袋', S.learnedRecipes);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
