// v9.0 M3 专项：师徒四出路 / 轻量道统 / 时限事件 / 属性分档
// 扩展按文件名序加载（10 fate → … → 90 revive → 91 disciple → 92 school → 93 timed）。
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
 'wxcs3-ext-91-disciple.js', 'wxcs3-ext-92-school.js', 'wxcs3-ext-93-timed.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
let S = G.S;
const EXT = window.WXCS3_EXT;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function setup(opts) {
  opts = opts || {};
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 16; S.lifeMax = 200;
  S.cultivation = 'xian';
  S.xRealm = opts.xRealm === undefined ? 1 : opts.xRealm; S.xStage = 0; S.xiuwei = 0; S.xiuAcc = 0;
  S.stones = opts.stones === undefined ? 5000 : opts.stones;
  S.xianghuo = 0; S.month = opts.month === undefined ? 1 : opts.month;
  S.year = opts.year === undefined ? 387 : opts.year; S.turn = 10; S.xun = 0;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = [];
  S.equipped = {}; S.craft = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.learnedArts = []; S.books = []; S.bookRead = {}; S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
  S.karma = 0; S.merit = 0; S.fame = 0;
  S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.tally = G.tallyInit();
  S.fate = null; S.fateReroll = 0; S.fengUntil = 0;
  S.npcs = {}; S.npcCall = null;
  S.sect = null; S.clan = null; S.place = 'qingyue'; S.lingqi = 1;
  S.gongfa = ['juqi']; S.ownedGongfa = ['juqi']; S.daogong = 'juqi';
  S.skillsKnown = []; S.skillsEquip = ['zhiquan']; S.shenTong = [];
  S.afterBreak = []; S.holdEvent = false; S.enemy = false; S.enemySect = false;
  S.pendingVengeance = false; S.hookPending = null; S.hooks = []; S.flags = {};
  S.goals = ['x1'];
  S.barn = []; S.beastBond = 0; S.beastPower = 1; S.yaoshou = false;
  S.benming = null; S.warBeast = 0; S.beastOfficer = false; S.beastFedMonth = 0;
  S.disciples = []; S.disciplesOut = []; S.masterId = null;
  S.school = null; S.timed = null; S.timedDone = {};
  S.prep = null; S.trib = null; S.tribLock = 0; S.combat = null;
  S.arrears = 0; S.sectArrears = 0;
  S.unlockStage = 0; S.inDongtian = false; S.dockOpen = {};
}
function rebind() { S = G.S; }
function addDisciple(npcId, fav) {
  S.npcs[npcId] = { fav: fav === undefined ? 25 : fav, met: true, alive: true };
  G.dispatch('do;dpadd:' + npcId);
  rebind();
  return S.disciples[S.disciples.length - 1];
}
function dOf(id) { return S.disciples.filter(function (d) { return d.id === id; })[0]; }
function hasModal(txt) { return (els['modals'] ? els['modals'].innerHTML : '').indexOf(txt) >= 0; }

/* ==================== 1. 收徒身份与成就 ==================== */
console.log('=== 1. 收徒 · 身份与归档 ===');
setup();
const d1 = addDisciple('guqingxuan', 25);
ok(S.disciples.length === 1, '收徒入账', S.disciples.length);
ok(d1 && d1.npcId === 'guqingxuan', '弟子记下人物身份 npcId', d1 && d1.npcId);
ok(S.npcs.guqingxuan.disciple === true, '师徒关系另记在 npc.disciple', S.npcs.guqingxuan.disciple);
G.advanceMonth(1); rebind();
ok(!!S.ach.ren_tu, '「收徒」成就可解除', S.ach && Object.keys(S.ach));

/* ==================== 2. 留山：岗位与供奉 ==================== */
console.log('=== 2. 留山 · 岗位与供奉 ===');
setup();
/* v10.4 P2：这一节测的是「留山供奉口径」，不该被叛逃判定搅动。
   此前没有钉种子，advanceXun 跨月时可能掷到叛逃、弟子被移出 S.disciples，
   断言偶发失败（实测 1/5）。钉死种子让这一节只测它该测的东西。 */
G.setSeed(20261119);
let d = addDisciple('guqingxuan', 25);
d.days = 45;
ok(EXT.discipleRows(d).indexOf('留山任执事') >= 0, '面板有留山入口');
const x0 = S.turn * 3 + S.xun;
G.dispatch('do;dpstay:' + d.id); rebind();
d = S.disciples[0];
ok(d.stay === true, '留山执事已安置', d.stay);
ok(S.turn * 3 + S.xun === x0 + 1, '安置岗位占一旬');
ok(EXT.discipleRows(d).indexOf('免去执事') >= 0, '已留山后入口改成免职');
let fc = EXT.fixedCosts2();
ok(fc.some(function (x) { return /弟子供奉/.test(x.name) && x.stones === 10; }), '留山每月供奉 10 石', JSON.stringify(fc));
const days0 = d.days;
EXT.discipleMonth();
ok(d.days === days0 + 5, '留山仍会自己慢进 +5', d.days);
const bond0 = d.bond;
S.arrears = 1;
EXT.discipleMonth();
ok(d.bond === bond0 - 3, '供奉欠缴：执事离心 −3', d.bond);
S.arrears = 0;
S.school = { name: '青庐', rule: 'yan', site: 'qingyue', rep: 0 };
fc = EXT.fixedCosts2();
ok(fc.some(function (x) { return /弟子供奉/.test(x.name) && x.stones === 15; }), '门规严：供奉 ×1.5', JSON.stringify(fc));

/* ==================== 3. 叛师：门规、待遇与亲密 ==================== */
console.log('=== 3. 叛师 · 有来由的离心 ===');
setup();
d = addDisciple('guqingxuan', 25);
S.school = { name: '青庐', rule: 'zhong', site: 'qingyue', rep: 10 };
d.bond = -25;
ok(EXT.discipleBetrayChance(d) > 0, '亲密太低：出现叛师概率', EXT.discipleBetrayChance(d));
const rep0 = S.school.rep;
EXT.discipleSelfBetray(d.id);
ok(S.disciples.length === 0, '叛师后门下清空', S.disciples.length);
ok((S.disciplesOut || [])[0].kind === 'betray', '仙谱记为叛去', JSON.stringify(S.disciplesOut[0]));
ok(S.school.rep === rep0 - 4, '叛师折道统声望', S.school.rep);
ok((S.tally.dpBetray || 0) === 1, '记一笔弟子夜遁', S.tally.dpBetray);

/* 月结自动路径：结构条件成立才掷骰 */
setup();
d = addDisciple('guqingxuan', 25);
d.bond = -45;
G.setSeed(7);   // 首掷 ≈ 0.012 < 0.27
EXT.discipleMonth();
ok(S.disciples.length === 0, '月结可触发弟子自己走', S.disciples.length);
G.setSeed(null);

/* ==================== 4. 先亡：历练折损、葬礼与送终 ==================== */
console.log('=== 4. 先亡 · 折损与葬礼 ===');
setup();
d = addDisciple('guqingxuan', 70);
d.days = 45;
const stones0 = S.stones;
G.setSeed(7);   // 首掷 < 12%
G.dispatch('do;dpsend:' + d.id); rebind();
ok(S.disciples.length === 0, '历练折损：弟子未归', S.disciples.length);
ok((S.disciplesOut || [])[0].kind === 'died', '仙谱记为亡故', JSON.stringify(S.disciplesOut[0]));
ok(S.npcs.guqingxuan.alive === false, '人物状态标记为已故');
ok(S.stones === stones0 - 30, '葬礼花 30 石', stones0 - S.stones);
ok((S.tally.dpFuneral || 0) === 1, '记一笔弟子葬礼', S.tally.dpFuneral);
ok((S.tally.npcFuneral || 0) === 1, '好感 ≥60：同时记送终', S.tally.npcFuneral);
G.advanceMonth(1); rebind();
ok(!!S.ach.ren_song, '「送终」成就可经先亡解除', S.ach && Object.keys(S.ach));
G.setSeed(null);

/* 活着的路径 */
setup();
d = addDisciple('guqingxuan', 70);
d.days = 45;
G.setSeed(42);   // 首掷 ≈ 0.601 > 折损率
G.dispatch('do;dpsend:' + d.id); rebind();
ok(S.disciples.length === 1, '历练平安归来', S.disciples.length);
ok(S.disciples[0].days === 90, '进度 +45', S.disciples[0].days);
G.setSeed(null);

/* ==================== 5. 道统：立门、门规与声望 ==================== */
console.log('=== 5. 道统 · 立门与门规 ===');
setup({ stones: 500 });
addDisciple('guqingxuan', 25);
G.dispatch('do;sch_found:kuan'); rebind();
ok(!S.school, '灵石不足立不起门户', S.school);
S.stones = 2000;
els['in-sch-name'] = els['in-sch-name'] || makeEl('in-sch-name');
els['in-sch-name'].value = '青庐';
G.dispatch('do;sch_found:kuan'); rebind();
ok(S.school && S.school.name === '青庐' && S.school.rule === 'kuan', '立道号、选门规', JSON.stringify(S.school));
ok(S.stones === 1200, '开宗花 800 石', S.stones);
ok((S.tally.foundedSect || 0) === 1, '开宗计数器已写', S.tally.foundedSect);
ok(EXT.schoolAdmitFav() === 15, '宽门规：收徒门槛 15', EXT.schoolAdmitFav());
S.school.rule = 'zhong'; ok(EXT.schoolAdmitFav() === 20, '中门规：收徒门槛 20');
S.school.rule = 'yan'; ok(EXT.schoolAdmitFav() === 25, '严门规：收徒门槛 25');
S.school.rule = 'kuan';

/* 收徒门槛真的被动作读取 */
S.stones = 5000;
S.npcs.yunqi = { fav: 17, met: true, alive: true };
const dn = S.disciples.length;
G.dispatch('do;dpadd:yunqi'); rebind();
ok(S.disciples.length === dn + 1, '宽门规下 17 好感收得进');
S.school.rule = 'zhong';
S.npcs.xiewujiu = { fav: 17, met: true, alive: true };
const dn2 = S.disciples.length;
G.dispatch('do;dpadd:xiewujiu'); rebind();
ok(S.disciples.length === dn2, '中门规下 17 好感收不进');
S.school.rule = 'kuan';
S.disciples = S.disciples.slice(0, 1);   // 后文只留一人

/* 开宗成就 */
G.advanceMonth(1); rebind();
ok(!!S.ach.shi_found, '「开宗」成就解除', S.ach && Object.keys(S.ach));

/* 月账与声望折扣 */
S.school.rep = 0;
fc = EXT.fixedCosts2();
ok(fc.some(function (x) { return x.id === 'school_upkeep' && x.stones === 15; }), '山门维护 15 石', JSON.stringify(fc));
S.school.rep = 40;
fc = EXT.fixedCosts2();
ok(fc.some(function (x) { return x.id === 'school_upkeep' && x.stones === 11; }), '声望 40：维护减到 11', JSON.stringify(fc));

/* 讲道：进度、亲密、声望 */
setup({ stones: 2000 });
d = addDisciple('guqingxuan', 25);
d.days = 45;
S.school = { name: '青庐', rule: 'kuan', site: 'qingyue', rep: 0, founded: { y: 387, m: 1 } };
S.stats.insight = 13;
const dday = d.days, dbond = d.bond;
G.dispatch('do;sch_lecture'); rebind();
d = S.disciples[0];
ok(d.days === dday + 10, '讲道：门下进度 +10', d.days);
ok(d.bond === dbond + 2, '讲道：亲密 +2', d.bond);
ok(S.school.rep === 4, '讲道：声望 +2（门规）×1 + 悟性高 +2', S.school.rep);

/* 出师声望 */
S.school.rep = 0;
d.days = 150;
S.stones = 0;
S.xun = 1;   // 出师占一旬，停在月中，避免跨月被固定开销吃掉束脩
G.dispatch('do;dpgrad:' + d.id); rebind();
ok(S.disciples.length === 0, '出师离开门下', S.disciples.length);
ok((S.disciplesOut || [])[0].kind === 'graduate', '仙谱记为出师', JSON.stringify(S.disciplesOut[0]));
ok(S.school.rep === 6, '出师声望 +6（宽 ×0.8）', S.school.rep);
ok(S.stones === 300, '出师束脩 300 石', S.stones);

/* 论道声望：每人每月一次 */
S.school.rep = 0;
S.npcs.guqingxuan = S.npcs.guqingxuan || { fav: 50, met: true };
const nObj = G.D.NPC_POOL.find(function (x) { return x.id === 'guqingxuan'; });
EXT.schoolOnTalk(nObj, 'guqingxuan');
EXT.schoolOnTalk(nObj, 'guqingxuan');
ok(S.school.rep === 1, '论道声望每月每人只记一次', S.school.rep);

/* 改门规 / 迁山门 */
S.stones = 2000; S.school.rep = 10; S.place = 'chiyan';
G.setSeed(null);
S.xun = 1;   // 停在月中，避免跨月被固定开销吃掉改规费
G.dispatch('do;sch_rule:yan'); rebind();
ok(S.school.rule === 'yan', '门规可改', S.school.rule);
ok(S.stones === 1950, '改门规花 50 石', S.stones);
ok(S.school.rep === 8, '改门规声望 −2', S.school.rep);
S.xun = 1;
G.dispatch('do;sch_move'); rebind();
ok(S.school.site === 'chiyan', '山门可迁', S.school.site);
ok(S.stones === 1750, '迁山门花 200 石', S.stones);

/* 欠缴：先预警，再离心 */
setup({ stones: 0 });
addDisciple('guqingxuan', 25);
S.school = { name: '青庐', rule: 'zhong', site: 'qingyue', rep: 10 };
S.month = 2;
G.setSeed(42);   // 首掷 ≈0.601 > 欠缴离心率，钉住这段只测声望
G.advanceMonth(1); rebind();
ok(S.arrears >= 1, '山门维护付不出：记欠缴', S.arrears);
ok(S.log.some(function (x) { return /香烛/.test(x.txt); }), '欠得起之前有预警');
const repBefore = S.school.rep;
G.advanceMonth(1); rebind();
ok(S.school.rep === Math.max(0, repBefore - 2), '欠缴满月：道统声望 −2', S.school.rep);
G.setSeed(null);

/* ==================== 6. 时限事件 ==================== */
console.log('=== 6. 时限事件 · 赴约与错过 ===');
setup({ month: 7 });
S.npcs.guqingxuan = { fav: 60, met: true, alive: true };
EXT.timedMonth();
rebind();
ok(S.timed && S.timed.id === 'birthday', '故人生辰按月挂起', JSON.stringify(S.timed));
ok(EXT.dockItems().some(function (x) { return x.k === '急'; }), '坞里出现「急」');
const favB = S.npcs.guqingxuan.fav;
G.dispatch('do;tm_go'); rebind();
ok(!S.timed, '赴约后挂起清除', S.timed);
ok(S.npcs.guqingxuan.fav === favB + 8, '赴约：好感 +8', S.npcs.guqingxuan.fav);

/* 错过：过期一次，关系扣分 */
S.month = 7; S.year = 388;
EXT.timedMonth(); rebind();
ok(S.timed && S.timed.id === 'birthday', '次年再挂一次', JSON.stringify(S.timed));
const favC = S.npcs.guqingxuan.fav;
S.turn += 2;
EXT.timedMonth(); rebind();
ok(!S.timed, '过期后自动清挂', S.timed);
ok(S.npcs.guqingxuan.fav === Math.max(0, favC - 3), '错过：好感 −3', S.npcs.guqingxuan.fav);

/* 遁速：连夜赶路不占旬 */
setup({ month: 7 });
S.npcs.guqingxuan = { fav: 60, met: true, alive: true };
S.stats.speed = 13;
EXT.timedMonth();
const xRush = S.turn * 3 + S.xun;
G.dispatch('do;tm_rush'); rebind();
ok(S.turn * 3 + S.xun === xRush, '连夜赶路不占旬');
ok(S.hp === 92, '赶路伤气血 −8', S.hp);
ok(S.npcs.guqingxuan.fav === 68, '赶路也把事办了', S.npcs.guqingxuan.fav);

/* 仙缘：旧仇化敌 */
setup({ month: 11 });
S.enemy = true; S.karma = 40; S.stats.fate = 13;
EXT.timedMonth(); rebind();
ok(S.timed && S.timed.id === 'old_feud', '旧仇约期挂起', JSON.stringify(S.timed));
const stonesF = S.stones;
G.dispatch('do;tm_fate'); rebind();
ok(S.enemy === false, '仙缘路线：化敌', S.enemy);
ok(S.karma === 25, '化敌：业力 −15', S.karma);
ok(S.stones === stonesF - 200, '化敌花 200 石', S.stones);

/* 悟性：劫类提示；神识：来意 */
setup({ month: 9, year: 388, xRealm: 2 });
S.stats.insight = 13; S.stats.sense = 13;
EXT.timedMonth();
ok(S.timed && S.timed.id === 'ruin_open', '遗迹开启挂起', JSON.stringify(S.timed));
EXT_ACT_tm();
ok(hasModal('预先算过'), '悟性高：看见劫类提示');
ok(hasModal('符纹是新的'), '神识高：看见遗迹来意');

/* 济世：道统声望 */
setup({ month: 8, stones: 1000 });
addDisciple('guqingxuan', 25);
S.school = { name: '青庐', rule: 'zhong', site: 'qingyue', rep: 0 };
EXT.timedMonth();
ok(S.timed && S.timed.id === 'plague_aid', '疫病济世挂起', JSON.stringify(S.timed));
G.dispatch('do;tm_go'); rebind();
ok(S.merit === 8, '济世：功德 +8', S.merit);
ok(S.school.rep === 5, '济世：道统声望 +5', S.school.rep);

/* 时限事件不压其他面板：挂起只写日志 */
setup({ month: 7 });
S.npcs.guqingxuan = { fav: 60, met: true, alive: true };
EXT.timedMonth();
ok(S.log.some(function (x) { return /有约在即/.test(x.txt); }), '挂起只记一条日志');

/* ==================== 7. 属性分档 ==================== */
console.log('=== 7. 属性分档 · 文本与选项 ===');
setup();
S.npcs.guqingxuan = { fav: 50, met: true, alive: true };
S.stats.sense = 8;
G.ACT.do_talk('guqingxuan');
ok(!hasModal('看看你还在不在'), '神识 8：看不出对方来意');
S.stats.sense = 13;
G.ACT.do_talk('guqingxuan');
ok(hasModal('看看你还在不在'), '神识 13：看得出来意');
ok(EXT.auctionHint({ name: '残玉' }).indexOf('包浆') >= 0, '神识 13：看出隐藏拍品的价');
S.stats.sense = 8;
ok(EXT.auctionHint({ name: '残玉' }) === '', '神识 8：看不出隐藏拍品');

S.stats.heart = 8;
G.dispatch('do;ask:guqingxuan');
ok(!hasModal('问心'), '道心 8：没有额外问心选项');
S.stats.heart = 13;
G.dispatch('do;ask:guqingxuan');
ok(hasModal('问心'), '道心 13：出现问心选项');
const favH = S.npcs.guqingxuan.fav;
G.dispatch('do;heartans:guqingxuan'); rebind();
ok(S.npcs.guqingxuan.fav === favH + 6, '问心：好感 +6', S.npcs.guqingxuan.fav);
ok(S.npcs.guqingxuan.heartAsked === true, '问心每人只给一次');
G.dispatch('do;ask:guqingxuan');
ok(!hasModal('问心'), '问过之后不再出现');

/* ==================== 8. 存档迁移 ==================== */
console.log('=== 8. 存档迁移 ===');
const legacy = {
  started: true, phase: 'play', cultivation: 'xian', xRealm: 1, xStage: 0,
  stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
  npcs: { guqingxuan: { fav: 30, met: true, alive: true } },
  disciples: [{ id: 'dp_old', name: '顾清玄', days: 0, bond: 30, alive: true, stage: 'ru' }],
  disciplesOut: [{ name: '旧人', bond: 40, at: '386年' }],
  school: { name: '旧庐', rule: 'zhong', site: 'qingyue', rep: 12, founded: { y: 386, m: 3 } },
  timed: { id: 'birthday', name: '故人生辰', exp: 99 },
  timedDone: { 'birthday:386': 1 }
};
ok(G.applyState(JSON.parse(JSON.stringify(legacy))) === true, '旧档可读入');
rebind();
ok(S.disciples[0].npcId === 'guqingxuan', '旧弟子按名字回填 npcId', S.disciples[0].npcId);
ok(S.npcs.guqingxuan.disciple === true, '迁移补上「收徒」身份标记');
ok(S.disciples[0].stay === false, '旧弟子默认不留山');
ok(S.disciplesOut[0].kind === 'graduate', '旧仙谱记录补 kind');
ok(S.school && S.school.name === '旧庐', '道统存档保留', S.school && S.school.name);
ok(S.timed === null, '时限事件读档不继承', S.timed);
ok(S.timedDone['birthday:386'] === 1, '已完成记录保留');

/* ==================== 9. 面板不崩 ==================== */
console.log('=== 9. 面板渲染 ===');
setup();
d = addDisciple('guqingxuan', 25);
d.days = 45;
S.disciplesOut = [{ name: '先亡者', bond: 70, at: '387年3月', kind: 'died', cause: '历练折损' }];
S.school = { name: '青庐', rule: 'kuan', site: 'qingyue', rep: 5, founded: { y: 387, m: 1 } };
S.month = 7;
S.npcs.guqingxuan.fav = 60;
EXT.timedMonth();
let threw = false;
try { G.ACT.openDisciple(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '门下/仙谱面板可渲染');
threw = false;
try { G.dispatch('do;sch'); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '道统面板可渲染');
threw = false;
try { G.dispatch('do;tm'); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '时限事件面板可渲染');
threw = false;
try { G.ACT.openMap(); } catch (e) { threw = true; console.log('   ', e.message); }
ok(!threw, '舆图仍可渲染');

function EXT_ACT_tm() { G.dispatch('do;tm'); }

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
