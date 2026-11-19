// v10.3 P0 专项：存档链路回归
// 背景：v9.0 把 envelope / checkSaveVersion 搬进 rules.js 时漏搬 VER 常量，
// 每个 IIFE 各自封闭，于是「存入槽位 / 导出 / 导入」全端抛 ReferenceError，
// 被 catch 吞成一句 toast。而当时 841 条断言里没有任何一条调用过 envelope，
// 所以全绿通过。这个文件就是补那条缺口。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, children: [], files: [],
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
  createElement() { return makeEl('new'); },
  addEventListener() {}, removeEventListener() {}
};
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
/* toast 是队列 + 定时器的：这里让 setTimeout 同步执行，
   这样一次动作之后就能读到最终的那条提示，不用等真实计时器。 */
const window = {
  document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/', protocol: 'http:' },
  alert() {}, confirm() { return true; }, prompt() { return ''; }
};
const ctx = {
  window, document, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
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
const RULES = window.WXCS3_RULES;
const G = window.WXCS3;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}
function toastText() { return (els['toast'] && els['toast'].textContent) || ''; }

/* ============ 1. 规则层：版本常量与信封 ============ */
console.log('=== 1. 规则层契约 ===');
ok(!!RULES, 'wxcs3-rules.js 已导出 WXCS3_RULES');
ok(typeof RULES.SAVE_VER === 'string' && RULES.SAVE_VER.length > 0,
  '规则层自带 SAVE_VER（' + RULES.SAVE_VER + '）');
ok((function () {
  try { return RULES.envelope({}) && true; } catch (e) { console.log('    →', e.message); return false; }
})(), 'RULES.envelope({}) 不抛错');
ok((function () {
  try { return RULES.checkSaveVersion({ format: 'wxcs3-save', version: '10.2' }).ok; }
  catch (e) { console.log('    →', e.message); return false; }
})(), 'RULES.checkSaveVersion() 不抛错');

const env = RULES.envelope({ started: true });
ok(env.format === 'wxcs3-save', '信封 format 正确');
ok(env.version === RULES.SAVE_VER, '信封 version 取自 SAVE_VER', env.version);
ok(typeof env.savedAt === 'number' && env.state && env.state.started === true, '信封带 savedAt 与 state');

ok(RULES.checkSaveVersion(env).ok === true, '自己写的信封自检通过');
ok(RULES.checkSaveVersion({ format: 'wxcs3-save', version: '8.1' }).ok === true,
  '旧版本存档仍可读（字段兜底）');
ok(RULES.checkSaveVersion({ format: 'wxcs3-save', version: '8.1' }).why.indexOf('8.1') > 0,
  '旧版本提示里带原版本号');
ok(RULES.checkSaveVersion({ foo: 1 }).ok === false, '无法识别的文件被拒');
ok(RULES.checkSaveVersion({ format: 'wxcs3-all' }).ok === true, '全槽位备份包被认作合法');

/* ============ 2. 存入槽位：键必须真的落盘 ============ */
console.log('=== 2. 槽位写入 ===');
const S = G.S;
S.started = true; S.phase = 'play';
S.name = '测试道友'; S.dao = '清微'; S.cultivation = 'xian';
S.xRealm = 1; S.xStage = 0; S.age = 20; S.turn = 6;
store['wxcs3_slot_1'] = undefined; delete store['wxcs3_slot_1'];
delete store['wxcs3_slots'];

G.ACT.do_save(1);
ok(!!store['wxcs3_slot_1'], '槽位键 wxcs3_slot_1 已写入');
let slotObj = null;
try { slotObj = JSON.parse(store['wxcs3_slot_1']); } catch (e) { slotObj = null; }
ok(!!slotObj, '槽位内容是合法 JSON');
ok(!!slotObj && slotObj.version === RULES.SAVE_VER, '槽位 version = ' + RULES.SAVE_VER,
  slotObj && slotObj.version);
ok(!!slotObj && slotObj.state && slotObj.state.started === true, '槽位内层 state 完整');
ok(toastText().indexOf('存档失败') < 0, '没有出现「存档失败」提示', toastText());

ok(!!store['wxcs3_slots'], '槽位元数据 wxcs3_slots 已写入');
let metaObj = {};
try { metaObj = JSON.parse(store['wxcs3_slots'] || '{}'); } catch (e) { metaObj = {}; }
ok(!!metaObj['1'], '元数据里有槽位 1');
ok(!!metaObj['1'] && metaObj['1'].dao === '清微', '元数据记下道号', metaObj['1'] && metaObj['1'].dao);
ok(!!store['wxcs3_save'], '自动存档同时更新（wxcs3_save）');

/* 未开局不该写槽位 */
setupBlank();
delete store['wxcs3_slot_2'];
G.ACT.do_save(2);
ok(!store['wxcs3_slot_2'], '未开局不写槽位');

function setupBlank() {
  const s = G.S;
  s.started = false; s.phase = 'create';
}

/* ============ 3. 导出：file:// 无桥时必须明说，不许假报 ============ */
console.log('=== 3. 导出闸门 ===');
S.started = true; S.phase = 'play';
window.location.protocol = 'file:';
toastText();
G.ACT.do_exp(1);
ok(toastText().indexOf('已导出') < 0, 'file:// 无桥时不报「已导出」', toastText());
ok(toastText().indexOf('不可用') > 0 || toastText().indexOf('导出失败') > 0,
  'file:// 无桥时给出明确失败提示', toastText());

toastText();
G.ACT.do_expall();
ok(toastText().indexOf('已备份') < 0, 'file:// 下「备份全部槽位」也不假报', toastText());

/* ============ 4. 读取与导入回环 ============ */
console.log('=== 4. 读档回环 ===');
window.location.protocol = 'http:';
setupBlank();
G.ACT.do_load(1);
const after = G.S;
ok(after.started === true, '从槽位读回后已开局');
ok(after.dao === '清微', '读回的道号一致', after.dao);
ok(typeof after.started === 'boolean' && !!after.tally, 'applyState 兜底字段齐备');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
