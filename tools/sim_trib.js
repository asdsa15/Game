// 天劫五类：先看失败率、修为损失与耗时分布，再谈手感。
// 模型口径：一次破境成功率 = clamp(基础 + 克法)；失败按「修为再跌三成 + 三旬锁」结算。
// 只读游戏里的克法读数（G.tribInfo），不复制规则，避免脚本与实现各说一套。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return { id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {},
    setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; }, focus() {}, click() {},
    insertAdjacentHTML() {}, scrollIntoView() {} };
}
const els = {};
const document = { readyState: 'complete', visibilityState: 'visible',
  body: makeEl('body'), documentElement: makeEl('html'),
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
  createElement() { return makeEl('n'); }, addEventListener() {}, removeEventListener() {} };
const store = {};
const localStorage = { getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } };
const window = { document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout() { return 0; }, clearTimeout() {}, matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; }, URL: { createObjectURL() { return 'b'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/' },
  alert() {}, confirm() { return true; }, prompt() { return ''; } };
const ctx = { window, document, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
  parseInt, parseFloat, isNaN, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {}, requestAnimationFrame() { return 0; } };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
const G = window.WXCS3, S = G.S, D = G.D;

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* 仙道基准态：筑基圆满，道心 8、道基非水、淬体 0、无欠账 */
S.phase = 'play'; S.started = true; S.cultivation = 'xian';
S.xRealm = 3; S.xStage = 2; S.body = 'sword'; S.quench = 0; S.quenchApplied = 0;
S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
S.daogong = 'juqi'; S.gongfa = ['juqi']; S.dArt = { staff: 0, mirror: 0, seal: 0 };
S.hooks = []; S.piety = 1; S.hpMax = 400; S.hp = 400; S.xiuwei = 1000;

const BASE = 0.35;          // 破境基准率（评审时的中位值）
const RUNS = 2000;

function sim(bonus) {
  let attempts = 0, fail = 0, xun = 0, xiuwei = 1000;
  for (let i = 0; i < RUNS; i++) {
    let a = 0, f = 0, t = 0, xw = 1000;
    const rate = clamp(BASE + bonus, 0.05, 0.95);
    while (true) {
      a++; t += 3;                       // 一次破境占一旬；失败后锁三旬
      if (Math.random() < rate) break;
      f++; xw = Math.round(xw * 0.7);
      if (xw < 1) { xw = 0; break; }
    }
    attempts += a; fail += f; xun += t; xiuwei += xw;
  }
  return {
    n: RUNS,
    rate: clamp(BASE + bonus, 0.05, 0.95),
    avgAttempts: attempts / RUNS,
    avgFails: fail / RUNS,
    avgXun: xun / RUNS,
    avgXiuwei: xiuwei / RUNS
  };
}

const lines = [];
lines.push('天劫五类模拟｜基准率 ' + BASE + '｜每组 ' + RUNS + ' 次');
lines.push('');
lines.push('| 劫 | 克法读数 | 加成 | 成功率 | 均尝试 | 均失败 | 均耗旬 | 余修为 |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const t of D.TRIBULATION) {
  const info = G.tribInfo(t.id);
  const r = sim(info.bonus);
  lines.push('| ' + info.name + ' | ' + info.text + ' | +' + Math.round(info.bonus * 100) + '% | ' +
    Math.round(r.rate * 100) + '% | ' + r.avgAttempts.toFixed(2) + ' | ' + r.avgFails.toFixed(2) + ' | ' +
    r.avgXun.toFixed(1) + ' | ' + Math.round(r.avgXiuwei) + ' |');
}
console.log(lines.join('\n'));

/* 顺带核一下权重：抽一万次看分布是否贴着配置 */
const cnt = {};
for (let i = 0; i < 10000; i++) { const id = G.tribRoll(); cnt[id] = (cnt[id] || 0) + 1; }
console.log('\n抽类分布（万次）：' + Object.keys(D.TRIB_WEIGHT).map(k => k + ' ' + (((cnt[k] || 0) / 100) | 0) + '%').join(' · '));
