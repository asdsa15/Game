// v10.6 叙事素材落地：NPC 台词 / 事件 / 奇遇 / 道书四读
// 素材源：docs/04_叙事与文本/文本素材/12_小说素材改编库.md
// 这里只验「写了的东西真的会发生」——数据齐全、门槛真的挡人、收益真的到账。
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
fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort()
  .forEach(function (f) { FILES.push(f); });
FILES.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
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
  S = G.S;
  Object.assign(S, {
    started: true, phase: 'play', name: '试道', cultivation: 'xian',
    year: 387, month: 3, turn: 0, age: 20, xun: 0,
    xRealm: 0, xStage: 0, xiuwei: 0, quench: 0, quenchApplied: 0, body: 'plain',
    gongfa: ['juqi'], daogong: 'juqi', ownedGongfa: ['juqi'], ownedArts: [],
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, capVer: 1,
    hpFlatBonus: 0, mpFlatBonus: 0, hpLuMul: 1, mpLuMul: 1, hpPermMul: 1, mpPermMul: 1,
    mpGfMul: 1, hpGfMul: 1, lifeGfBonus: 1, lifeMax: 200, lifeStop: false,
    stones: 100000, fame: 0, merit: 0, karma: 0, lingqi: 1, lingqiUp: 1, place: 'qingyue',
    bag: {}, bagMat: {}, arts: [], npcs: {}, sect: null, cave: { facilities: {} },
    combat: null, preBuff: null, talismans: {}, skillsKnown: [], skillsEquip: ['zhiquan'],
    shenTong: [], log: [], chronicle: [], ledger: { income: [], expense: [] },
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    anchors: { wu: 1, ren: 1, shi: 1, yi: 1 }, anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },
    lu: null, luHistory: [], root: 'true_', rootEls: ['jin'], pillar: 0, pos: 0,
    followers: 0, xianghuo: 0, piety: 1, miao: '野祀', miaoUp: {}, miaoSites: 0,
    guild: null, gainQueue: [], relics: [], tally: G.tallyInit(),
    books: [], bookRead: {}, insightXp: 0, flags: {}, breakBonus: 0,
    hooks: [], hooksGiven: [], hookPending: null, npcCall: null, pendingEnc: null
  });
  if (opts) Object.assign(S, opts);
  return S;
}

/* ==================== 1. NPC 台词：三层与四档 ==================== */
console.log('=== 1. 七位新人物 ===');
const NEW_NPC = ['laozuzhang', 'shenyanzi', 'laoshidui', 'dengshi', 'laodao', 'fengkou', 'popo'];
const badNpc = [];
NEW_NPC.forEach(function (id) {
  const n = D.NPC_POOL.find(function (x) { return x.id === id; });
  if (!n) { badNpc.push(id + ' 不在池里'); return; }
  if (!n.name || !n.role || !n.look || !n.inner) badNpc.push(id + ' 缺基本字段');
  if (!Array.isArray(n.meet) || n.meet.length < 2) badNpc.push(id + ' 初见不足两段');
  if (n.meet.some(function (t) { return !t || t.length < 8; })) badNpc.push(id + ' 初见有过短的句子');
  const mins = (n.stages || []).map(function (s) { return s.min; }).join(',');
  if (mins !== '0,20,40,70') badNpc.push(id + ' 好感档不是 0/20/40/70（' + mins + '）');
  if ((n.stages || []).some(function (s) { return !s.lines || !s.lines.length; })) badNpc.push(id + ' 有空档台词');
  if (!n.ctx || !n.ctx.break || !n.ctx.hurt) badNpc.push(id + ' 缺情境台词');
  if (!n.ask || (n.ask.opts || []).length !== 3) badNpc.push(id + ' 论道不是三选一');
});
ok(badNpc.length === 0, '七位新人物的三层台词与四档好感俱全', badNpc.slice(0, 4).join('；'));

/* 好感档真的分得开：同一人 0 与 70 说的不是一句话 */
const lz = D.NPC_POOL.find(function (x) { return x.id === 'laozuzhang'; });
ok(lz.stages[0].lines[0] !== lz.stages[3].lines[0], '老族长：陌生与熟识说的话不同');

/* ==================== 2. 事件：文与账 ==================== */
console.log('=== 2. 七则新事件 ===');
const NEW_EV = ['jisiShiQi', 'weiluShiFa', 'huotangBuRen', 'yinqinYiYi',
  'tiancaiZhiShang', 'bugaoErbie', 'zhirenYeKu'];
const badEv = [];
NEW_EV.forEach(function (id) {
  const e = D.EVENTS.find(function (x) { return x.id === id; });
  if (!e) { badEv.push(id + ' 不在表里'); return; }
  if (!e.text || e.text.length < 30) badEv.push(id + ' 正文过短');
  if (!e.after) badEv.push(id + ' 缺收束句');
  if (!e.eff || !Object.keys(e.eff).length) badEv.push(id + ' 没有 eff（写了不结算）');
});
ok(badEv.length === 0, '七则事件的 text/after/eff 俱全', badEv.slice(0, 4).join('；'));

/* 七则事件逐条单发：不抛错，且都留下一句纪事 */
const evBad2 = [];
NEW_EV.forEach(function (id) {
  setup({ cultivation: 'both', miaoSites: 1, xRealm: 1 });
  const e = D.EVENTS.find(function (x) { return x.id === id; });
  const logLen = S.log.length;
  try { G.applyEvent(e); } catch (err) { evBad2.push(id + '（' + err.message + '）'); return; }
  if (S.log.length <= logLen) evBad2.push(id + ' 没有留纪事');
});
ok(evBad2.length === 0, '七则事件逐条落地无异常', evBad2.join('、'));

/* 因果链：没落 ancestor_reject，就抽不到「阴亲之议」 */
setup({ cultivation: 'shen' });
function slotIds() {
  const out = [];
  for (let r = 1; r <= 100; r++) out.push(G.eventSlot(r));
  return out;
}
S.flags = {};
const noFlag = slotIds();
ok(noFlag.indexOf('yinqinYiYi') < 0, '未「祖宗不认」，抽不到「阴亲之议」');
ok(noFlag.indexOf('huotangBuRen') >= 0, '「火塘不认」本身抽得到');
S.flags = { ancestor_reject: 1 };
const withFlag = slotIds();
ok(withFlag.indexOf('yinqinYiYi') >= 0, '「祖宗不认」之后，「阴亲之议」进池');

/* 事件真的改账：不告而别给法宝，伪箓事发给符纸 */
setup({ cultivation: 'xian' });
G.applyEvent && G.applyEvent(D.EVENTS.find(function (x) { return x.id === 'bugaoErbie'; }));
ok((S.arts || []).indexOf('jinchuan') >= 0, '「不告而别」把旧物（传音符）放进包袱', JSON.stringify(S.arts));

/* ==================== 3. 奇遇：十五个分支的收益 ==================== */
console.log('=== 3. 五处奇遇 ===');
const NEW_ENC = ['shiyeguanji', 'sanguandanghun', 'mingdengzhiwen', 'weiluzhiwen', 'sanzhuxiang'];
const badEnc = [];
NEW_ENC.forEach(function (id) {
  const e = D.ENCOUNTERS.find(function (x) { return x.id === id; });
  if (!e) { badEnc.push(id + ' 不在表里'); return; }
  if (!e.poem || !e.text || (e.opts || []).length !== 3) badEnc.push(id + ' 结构不齐');
  e.opts.forEach(function (o) {
    if ((o.act || '').indexOf('enc:' + id + ':') !== 0) badEnc.push(id + ' 选项 act 前缀不对：' + o.act);
  });
});
ok(badEnc.length === 0, '五处奇遇各三选一，act 前缀对齐', badEnc.slice(0, 4).join('；'));

setup({ stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 } });
G.ACT.do_enc('shiyeguanji', 'cave');
ok(S.stats.fate === 10, '石液观洞府：机缘 8 → 10', S.stats.fate);
ok(Math.abs(S.breakBonus - 0.03) < 1e-9, '石液观洞府：下次破境 +3%', S.breakBonus);

setup();
G.ACT.do_enc('shiyeguanji', 'debt');
ok((S.hooks || []).some(function (h) { return h.id === 'hook_old_debt'; }), '石液观旧债：落下旧债钩子');

setup();
G.ACT.do_enc('shiyeguanji', 'seal');
ok((S.bagMat.yuhuaYu || 0) === 1, '封瓶不观：得未启之液一瓶', S.bagMat.yuhuaYu);
ok(S.stats.fate === 9, '封瓶不观：机缘 +1', S.stats.fate);

setup();
const life0 = S.lifeMax;
G.ACT.do_enc('sanguandanghun', 'river');
ok(S.lifeMax === life0 - 2, '逆流而上：寿元 −2', S.lifeMax);
ok(Math.abs(S.breakBonus - 0.03) < 1e-9, '逆流而上：留下一道逆流痕（破境 +3%）', S.breakBonus);

setup();
S.karma = 40;
G.ACT.do_enc('sanguandanghun', 'mountain');
ok(S.stats.heart === 5, '业力重的人闯荡魂山：道心 −3', S.stats.heart);
setup();
G.ACT.do_enc('sanguandanghun', 'mountain');
ok(S.stats.heart === 10, '业力轻的人闯荡魂山：道心 +2', S.stats.heart);

setup();
G.ACT.do_enc('mingdengzhiwen', 'blow');
ok((S.hooks || []).some(function (h) { return h.id === 'hook_lamp_out'; }), '吹灭将熄之灯：落下 lamp_out 钩子');

setup();
G.ACT.do_enc('weiluzhiwen', 'point');
ok(S.craft.fu === 15, '指出其伪：制符熟练 +15', S.craft.fu);

setup({ cultivation: 'shen' });
S.followers = 100;
G.ACT.do_enc('sanzhuxiang', 'yes');
ok(S.followers === 140, '三炷香允了：信众 +40', S.followers);

/* ==================== 4. 道书：四读与「或」门槛 ==================== */
console.log('=== 4. 四部道书 ===');
const NEW_BK = ['canxin', 'mingtu', 'mingdeng', 'guancai'];
const badBk = [];
NEW_BK.forEach(function (id) {
  const b = D.DAOSHU.find(function (x) { return x.id === id; });
  if (!b) { badBk.push(id + ' 不在表里'); return; }
  if ((b.layers || []).length !== 4) badBk.push(id + ' 不是四读');
  b.layers.forEach(function (l, i) {
    if (!l.text || l.text.length < 20) badBk.push(id + ' 第 ' + (i + 1) + ' 读正文过短');
    if (!l.gain) badBk.push(id + ' 第 ' + (i + 1) + ' 读没写收益');
  });
});
ok(badBk.length === 0, '四部道书都是四读、每读有正文与收益', badBk.slice(0, 4).join('；'));

/* 「悟性 ≥14 或 道心 ≥15」：两个都不够读不出，一个够就读得出 */
setup({ books: ['canxin'], bookRead: { canxin: 2 }, stats: { qualify: 8, insight: 13, sense: 8, speed: 8, heart: 9, fate: 8 } });
G.ACT.do_readbook('canxin');
ok(S.bookRead.canxin === 2, '悟性 13、道心 9：第三读读不出（不消耗次数）', S.bookRead.canxin);
setup({ books: ['canxin'], bookRead: { canxin: 2 }, stats: { qualify: 8, insight: 13, sense: 8, speed: 8, heart: 16, fate: 8 } });
G.ACT.do_readbook('canxin');
ok(S.bookRead.canxin === 3, '道心 16 单条达标：第三读读得出', S.bookRead.canxin);

/* 第四读的 fx 要真兑现：破境加成写进账 */
setup({ books: ['canxin'], bookRead: { canxin: 3 }, xRealm: 2, breakBonus: 0 });
G.ACT.do_readbook('canxin');
ok(S.bookRead.canxin === 4, '筑基后读到第四读', S.bookRead.canxin);
ok(Math.abs(S.breakBonus - 0.02) < 1e-9, '第四读的真意兑现：下次破境 +2%', S.breakBonus);

/* ==================== 5. 钩子：四条新线 ==================== */
console.log('=== 5. 四条新钩子 ===');
const NEW_HOOK = ['hook_old_debt', 'hook_lamp_out', 'hook_false_register', 'hook_grace'];
const badHook = [];
NEW_HOOK.forEach(function (id) {
  const h = D.HOOKS.find(function (x) { return x.id === id; });
  if (!h) { badHook.push(id + ' 不在表里'); return; }
  if (!h.hint) badHook.push(id + ' 没有破绽');
  if (!h.claim || !h.claim.want || !h.claim.refuse) badHook.push(id + ' 没有索与拒');
  if (!h.due || !h.due.kind) badHook.push(id + ' 没有期');
});
ok(badHook.length === 0, '四条新钩子的 hint / 索 / 拒 / 期俱全', badHook.slice(0, 4).join('；'));

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
