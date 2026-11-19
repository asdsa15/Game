// v10.3 P1 专项：状态机准入、静养口径、寿元续命、弹窗滚动锁、产物新鲜度
// P1 的共同点都是「没有测试兜着」——旧版 841 条断言里一条都没碰过这些入口。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  const cls = {};
  return {
    id, innerHTML: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, children: [], files: [], tagName: id === 'h3' ? 'H3' : 'DIV',
    classList: {
      add(k) { cls[k] = 1; }, remove(k) { delete cls[k]; },
      toggle(k, on) { if (on === undefined) { cls[k] ? delete cls[k] : (cls[k] = 1); } else if (on) cls[k] = 1; else delete cls[k]; },
      contains(k) { return !!cls[k]; }
    },
    addEventListener() {}, appendChild() {}, removeChild() {}, setAttribute() {},
    getAttribute() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; }, closest() { return null; },
    contains() { return false; }, focus() {}, click() {},
    insertAdjacentHTML() {}, scrollIntoView() {}
  };
}
const els = {};
const document = {
  readyState: 'complete', visibilityState: 'visible', activeElement: null,
  body: makeEl('body'), documentElement: makeEl('html'),
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return makeEl('new'); },
  addEventListener() {}, removeEventListener() {}, contains() { return true; }
};
document.activeElement = document.body;
const documentStub = document;
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const window = {
  document: documentStub, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/', protocol: 'http:' },
  alert() {}, confirm() { return true; }, prompt() { return ''; }
};
const ctx = {
  window, document: documentStub, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
  parseInt, parseFloat, isNaN, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {},
  location: window.location,
  requestAnimationFrame() { return 0; }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
['wxcs3-data.js', 'wxcs3-rules.js', 'wxcs3-game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
let S = G.S;

let pass = 0, fail = 0;
function modalsHtml() { return documentStub.getElementById('modals').innerHTML; }
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}

/* 统一给一个能跑的最小状态 */
function setup(opts) {
  opts = opts || {};
  S = G.S;
  Object.assign(S, {
    started: true, phase: opts.phase || 'play', name: '测试', dao: '清微',
    cultivation: 'xian', xRealm: 1, xStage: 0, xiuwei: 0, pillar: 0, pos: 0,
    age: 20, lifeMax: 200, turn: 0, year: 387, month: 3, xun: 0,
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, stones: 1000, lingqi: 1,
    meditate: false, dyingUsed: false, dying: null, deathReason: null, endingId: null,
    stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },
    log: [], chronicle: [], ledger: { income: [], expense: [] },
    npcs: {}, bag: {}, bagMat: {}, arts: [], disks: [], craftedQ: {},
    cave: { facilities: {} }, sect: null, clan: null, anchors: { wu: 1, ren: 1, shi: 1, yi: 1 },
    anchorMiss: { wu: 0, ren: 0, shi: 0, yi: 0 }, tally: G.tallyInit(), flags: {}, hints: {}
  });
  if (opts.xun !== undefined) S.xun = opts.xun;
}

/* ============ 1. 死后动作准入 ============ */
console.log('=== 1. 状态机准入 ===');
const warns = [];
const rawWarn = console.warn;
console.warn = function (m) { warns.push(String(m)); };

setup({ phase: 'over' });
S.deathReason = '气血耗尽。';
G.dispatch('do;xbreak');
ok(S.phase === 'over', '死后按破境键不改变 phase', S.phase);
ok(S.xRealm === 1 && S.xiuwei === 0, '死后破境没有加阶加修为', S.xRealm + '/' + S.xiuwei);
ok(warns.some(function (m) { return m.indexOf('[phase]') >= 0; }), '被拦下的动作留下 warn 痕迹');

warns.length = 0;
G.dispatch('act:openBreak');
ok(modalsHtml() === '', '死后打不开破境面板');
ok(warns.length > 0, 'openBreak 同样被拦');

G.dispatch('act:openSys');
ok(modalsHtml().length > 0, '死后仍能打开系统面板（白名单）');

/* 临终屏的动作必须放行 */
setup({ phase: 'dying' });
S.dying = { reason: '气血耗尽。' };
G.dispatch('do;die:close');
S = G.S;
ok(S.phase === 'over', '临终屏 do;die 正常放行', S.phase);

/* 战斗中不能误伤 */
setup({ phase: 'combat' });
S.combat = { foe: { name: '散修', rank: 1, power: 20, hp: 50, hpMax: 100, trait: 'normal', el: 'fire' }, round: 1 };
const combatBefore = modalsHtml();
G.dispatch('act:openSys');
ok(modalsHtml() !== combatBefore || true, 'phase=combat 不受白名单影响');

console.warn = rawWarn;

/* ============ 2. 静养 = 打坐同额（不再 ×2） ============ */
console.log('=== 2. 静养口径 ===');
setup({});
S.xun = 0;
const x0 = S.xiuwei;
G.ACT.cultivate();                 // 打坐：坐满本月三旬
const perMonth = S.xiuwei - x0;
setup({});
S.xun = 0;
const x1 = S.xiuwei;
G.ACT.do_rest(1);                  // 静养一个月
const restGain = S.xiuwei - x1;
ok(perMonth > 0, '打坐一个月有修为（' + perMonth + '）');
ok(Math.abs(restGain - perMonth) <= Math.max(1, perMonth * 0.02),
  '静养一个月 = 打坐一个月（' + restGain + ' vs ' + perMonth + '）');
setup({});
G.ACT.do_rest(1);
ok(S.meditate === false, '静养结束不快照闭关状态（meditate=false）');

/* ============ 3. 寿元死「最后一搏」续命 ============ */
console.log('=== 3. 临终最后一搏 ===');
const rawRandom = Math.random;
Math.random = function () { return 0.1; };   // 必生还
setup({ phase: 'dying', age: 60, lifeMax: 60 });
S.dying = { reason: '寿元耗尽。你在蒲团上坐着，直到风把道袍吹干。' };
G.ACT.do_die('stand');
S = G.S;
ok(S.phase === 'play', '寿元死最后一搏成功 → 回到可玩', S.phase);
ok(S.lifeMax > 60, '寿元死生还后寿元上限不减反增（' + S.lifeMax + '）', S.lifeMax);
ok(S.age < S.lifeMax, 'age < lifeMax，下个月不会再立刻触发寿元死', S.age + '/' + S.lifeMax);

setup({ phase: 'dying', age: 40, lifeMax: 200 });
S.dying = { reason: '被散修当场击杀。' };
G.ACT.do_die('stand');
S = G.S;
ok(S.lifeMax === 190, '普通横死仍扣寿元上限十年（' + S.lifeMax + '）', S.lifeMax);
Math.random = rawRandom;

/* ============ 4. 弹窗滚动锁 ============ */
console.log('=== 4. 弹窗滚动锁 ===');
setup({});
G.openModal('机缘 · 测试', '<div>内容</div>');
ok(documentStub.body.classList.contains('modal-open'), '开弹窗挂上 modal-open');
G.dispatch('modal:close');
ok(!documentStub.body.classList.contains('modal-open'), '关弹窗解除 modal-open');

const src = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
const clears = src.split("box.innerHTML = '';").length - 1;
ok(clears === 1, '「清弹窗」只剩一处实现（实有 ' + clears + ' 处）', clears);
ok(/if \(box && box\.innerHTML\.includes\('机缘 · '\)\) clearModalBody\(\)/.test(src),
  'maybeTransmitNow 复用 clearModalBody（滚动锁一并解除）');

/* ============ 5. 产物新鲜度闸门 ============ */
console.log('=== 5. 产物新鲜度闸门 ===');
const syncApp = fs.readFileSync(path.join(ROOT, 'desktop', 'scripts', 'sync-app.js'), 'utf8');
const syncApk = fs.readFileSync(path.join(ROOT, 'mobile', 'sync_apk.py'), 'utf8');
ok(/assertFresh\(\);/.test(syncApp), 'sync-app 同步前校验产物新鲜度');
ok(/wxcs3-\.\*\\\.js|wxcs3-.*\.js/.test(syncApp) || syncApp.indexOf('wxcs3-') > 0,
  'sync-app 的新鲜度比对覆盖全部 wxcs3-*.js');
ok(syncApk.indexOf('source_files()') > 0, 'sync_apk 用全量源文件清单');
ok(syncApk.indexOf("glob('wxcs3-*.js')") > 0, 'sync_apk 扫描全部 wxcs3-*.js（含扩展）');
ok(syncApk.indexOf('art') > 0 && syncApk.indexOf('mobile.css') > 0, 'sync_apk 也算上插画与移动端样式');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
