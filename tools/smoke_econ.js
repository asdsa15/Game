// 双轨经济运行时冒烟测试：用极简 DOM 桩跑真实 wxcs3-game.js
// 目的：确保神道打坐/庙市/化香火钱/仙道打坐都能真跑一遍，不只看语法。
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
  readyState: 'complete',
  visibilityState: 'visible',
  body: makeEl('body'),
  documentElement: makeEl('html'),
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  querySelector() { return makeEl('q'); },
  querySelectorAll() { return []; },
  createElement() { return makeEl('new'); },
  addEventListener() {}, removeEventListener() {}
};
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const window = {
  document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout(fn) { return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  alert() {}, confirm() { return true; }, prompt() { return ''; }
};

const ctx = {
  window, document, localStorage, navigator: window.navigator, location: window.location,
  console, Math, Object, Array, JSON, String, Number, Date, parseInt, parseFloat, isNaN,
  setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {},
  requestAnimationFrame(fn) { return 0; }, alert: window.alert, confirm: window.confirm
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);

const G = window.WXCS3;
if (!G) { console.error('WXCS3 未导出'); process.exit(1); }

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}

const S = G.S;
// 从创角态切到一局神道
S.phase = 'play'; S.started = true; S.age = 20; S.lifeMax = 120;
S.cultivation = 'shen'; S.pillar = 0; S.pos = 0;
S.followers = 500; S.piety = 1; S.miao = '野祀'; S.miaoUp = {};
S.stones = 500; S.xianghuo = 200; S.month = 3; S.turn = 36; S.year = 390;
S.hp = S.hpMax; S.ledger = { income: [], expense: [] };
G.render();
ok(true, '神道 render 不抛错');

/* 1. 神道打坐：只涨香火，不涨修为 */
console.log('=== 1. 神道打坐 ===');
const x0 = S.xiuwei, h0 = S.xianghuo;
G.ACT.cultivate();
ok(S.xiuwei === x0, '坐庙不动修为（' + x0 + ' → ' + S.xiuwei + '）');
ok(S.xianghuo > h0, '坐庙涨香火（' + h0 + ' → ' + Math.round(S.xianghuo) + '）');
ok(S.stones >= 500, '香火钱按月入账（灵石 ' + S.stones + '）');

/* 2. 庙市三页 */
console.log('=== 2. 庙市 ===');
G.ACT.openMiaoMarket('xiang');
let html = els['modals'].innerHTML;
ok(html.indexOf('香供') > 0 && html.indexOf('庙产') > 0 && html.indexOf('寄卖') > 0, '庙市三页签都在');
ok(html.indexOf('线香') > 0, '香供列货');
G.ACT.openMiaoMarket('chan');
html = els['modals'].innerHTML;
ok(html.indexOf('铜香炉') > 0 && html.indexOf('功德箱') > 0, '庙产列货');

G.ACT.openMiaoMarket('pill');
html = els['modals'].innerHTML;
ok(html.indexOf('回春丹') > 0 && html.indexOf('加价两成') > 0, '丹药页：香客代购');
const sb = S.stones, nb = S.bag.pillHp || 0;
G.ACT.do_miaobuy('pillHp');
ok(S.stones === sb - 60 && (S.bag.pillHp || 0) === nb + 1, '代购回春丹：50×1.2 = 60 石');

const s1 = S.stones, h1 = S.xianghuo;
G.ACT.do_buyxiang('xianXiang');
ok(S.stones < s1 && S.xianghuo > h1, '买香：灵石 −' + (s1 - S.stones) + '，香火 +' + Math.round(S.xianghuo - h1));

const s2 = S.stones;
G.ACT.do_miaochan('lu');
ok(S.stones === s2 - 120 && S.miaoUp.lu === 1, '置铜香炉：扣 120 石，庙产 +1');

/* 3. 化香火钱：有抽成、有月限 */
console.log('=== 3. 化香火钱 ===');
G.ACT.openExchange();
html = els['modals'].innerHTML;
ok(html.indexOf('110 香火') > 0, '写明实付 110 香火 = 1 石');
const s3 = S.stones, h3 = S.xianghuo, m3 = S.xiangExchangeMonth;
G.ACT.do_exch(1);
ok(S.stones === s3 + 1 && S.xianghuo === h3 - 110, '化 1 石：灵石 +1，香火 −110');
ok(S.xiangExchangeMonth === m3 + 1, '记入本月额度');
ok((S.ledger.income || []).some(x => x.label === '化香火钱'), '账本记「化香火钱」');

/* 4. 兑换月限：把额度用光后化不出 */
const cap = S.miaoUp.box ? 0 : 0; // 占位，真实值由游戏算
S.xiangExchangeMonth = 999;
const s4 = S.stones;
G.ACT.do_exch(1);
ok(S.stones === s4, '钱箱满了就化不出（灵石不变）');
S.xiangExchangeMonth = 0;

/* 5. 仙道打坐：一分香火都不涨 */
console.log('=== 5. 仙道打坐 ===');
S.cultivation = 'xian'; S.xianghuo = 0; S.xiuwei = 0; S.stones = 500;
G.render();
ok(true, '仙道 render 不抛错');
G.ACT.cultivate();
ok(S.xianghuo === 0, '仙道打坐香火恒为 0');
ok(S.xiuwei > 0, '仙道打坐涨修为（+' + Math.round(S.xiuwei) + '）');

/* 6. 仙道进不了庙市，神道进不了坊市 */
console.log('=== 6. 门禁 ===');
G.ACT.openMiaoMarket();
ok(els['modals'].innerHTML.indexOf('庙市') < 0, '仙道打不开庙市');
S.cultivation = 'shen';
G.ACT.openShop();
html = els['modals'].innerHTML;
ok(html.indexOf('庙市') > 0, '神道点坊市被引到庙市');

/* 7. 香火当钱：仙道信香不生效 */
console.log('=== 7. 信香 ===');
S.cultivation = 'xian'; S.bag.xiang = 1; S.xianghuo = 0;
G.ACT.do_use('xiang');
ok(S.xianghuo === 0 && S.bag.xiang === 1, '仙道用不了信香，物品不被吞');

/* 8. 卖出渠道 */
console.log('=== 8. 卖出渠道 ===');
S.cultivation = 'xian'; S.stones = 0; S.karma = 0;
S.bag = { pillHp: 1 }; S.sect = { rank: 1, contrib: 0 }; S.sellCh = 'market';
G.ACT.openSell();
html = els['modals'].innerHTML;
ok(html.indexOf('交宗门') > 0 && html.indexOf('坊市摆摊') > 0 && html.indexOf('黑市') > 0, '三个渠道都在');
G.ACT.do_selldan('pillHp');
ok(S.stones === 50, '坊市价：回春丹 50 石', S.stones);
S.stones = 0; S.bag.pillHp = 1; S.sellCh = 'black'; S.sect.contrib = 0;
G.ACT.openSell(); G.ACT.do_selldan('pillHp');
ok(S.stones === 73 && S.karma === 3, '黑市：73 石 + 业力 3', S.stones + '/' + S.karma);
S.stones = 0; S.bag.pillHp = 1; S.sellCh = 'sect'; S.sect.contrib = 0;
G.ACT.openSell(); G.ACT.do_selldan('pillHp');
ok(S.stones === 35 && S.sect.contrib === 7, '交宗门：35 石 + 贡献 7', S.stones + '/' + S.sect.contrib);
S.sellCh = 'market';

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
