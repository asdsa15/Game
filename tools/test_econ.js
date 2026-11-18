// 双轨经济自检：坊市/庙市分离、香火与灵石等价、无套利
// 不依赖 DOM，从源码里抠出纯函数跑。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'),
  { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;
const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
const rcode = fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8');

function grab(name) {
  /* v9.0 第2步：纯函数已移入 wxcs3-rules.js，两边都要找 */
  const gcodeAll = gcode + '\n' + rcode;
  const i = gcodeAll.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到 ' + name);
  let depth = 0, started = false, j = i;
  for (; j < gcode.length; j++) {
    const ch = gcode[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  return gcodeAll.slice(i, j);
}

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra === undefined ? '' : extra); }
}

/* ---------- 1. 数据层：两套货架不互通 ---------- */
console.log('=== 1. 货架分离 ===');
ok(Array.isArray(D.XIANG_GONG) && D.XIANG_GONG.length >= 3, '庙市有香供货架');
ok(Array.isArray(D.MIAO_UP) && D.MIAO_UP.length >= 4, '庙市有庙产货架');
ok(!!D.EXCHANGE, '等价参数存在');
ok(!(D.SHOP || []).some(x => x.type === 'xiang'), '仙道坊市不售信香');
ok((D.SHOP || []).every(x => ['pill', 'art', 'mat'].includes(x.cat)), '仙道坊市只含丹药/法器/材料');
ok(!(D.SHOP || []).some(x => (x.name || '').indexOf('香') >= 0 && x.cat === 'pill'), '仙道丹药页无香火类');

/* ---------- 2. 等价：不能左手买右手卖套利 ---------- */
console.log('=== 2. 等价与套利 ===');
const bestBuy = Math.max.apply(null, D.XIANG_GONG.map(x => x.xiang / x.price));
ok(bestBuy < D.EXCHANGE.outPerStone,
  '买香成色 ' + bestBuy.toFixed(1) + ' 香火/石 < 化出实付 ' + D.EXCHANGE.outPerStone + '，无套利');
ok(D.EXCHANGE.outPerStone > D.EXCHANGE.xiangPerStone, '兑出有抽成（实付高于官价）');
ok(D.EXCHANGE.buyCapRatio > 0 && D.EXCHANGE.buyCapRatio < 1, '买香只能补到本柱八成，不能买穿');

/* ---------- 3. 纯函数 ---------- */
console.log('=== 3. 月度数值 ===');
let S = {
  phase: 'play', cultivation: 'shen', pillar: 0, pos: 0,
  xianghuo: 0, followers: 0, piety: 1, miao: '野祀', miaoUp: {},
  hp: 100, hpMax: 100, lingqi: 1, root: null, body: null, meditate: false,
  shenwei: null, lu: null, templeBroken: false, xiangExchangeMonth: 0
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sandbox = {
  D, clamp,
  get S() { return S; },
  isShen: () => S.cultivation === 'shen',
  usesShenLine: () => S.cultivation === 'shen' || S.cultivation === 'both',
  pillar: () => D.PILLARS[S.pillar],
  curShenwei: () => ({ salary: 0 }),
  Math, Object, Array, JSON, Number, String
};
vm.runInNewContext(
  ['miaoUpCount', 'dArtRaw', 'dArtLv', 'dArtSealMul',
    'xiangBuyCap', 'xiangOutCap', 'maxXianghuo', 'monthXianghuo', 'shenStoneIncome']
    .map(grab).join('\n') +
  '\nthis.miaoUpCount=miaoUpCount;this.dArtRaw=dArtRaw;this.dArtLv=dArtLv;this.dArtSealMul=dArtSealMul;' +
  'this.xiangBuyCap=xiangBuyCap;this.xiangOutCap=xiangOutCap;' +
  'this.maxXianghuo=maxXianghuo;this.monthXianghuo=monthXianghuo;this.shenStoneIncome=shenStoneIncome;',
  sandbox);

ok(sandbox.xiangBuyCap() === 320, '一柱买香上限 = 400×0.8 = 320', sandbox.xiangBuyCap());
ok(sandbox.maxXianghuo() === 800, '一柱香火上限 = 800', sandbox.maxXianghuo());
ok(sandbox.xiangOutCap() === 2, '无信众时每月可化 2 石', sandbox.xiangOutCap());

S.followers = 400;
ok(sandbox.xiangOutCap() === 3, '400 信众 → 每月 3 石', sandbox.xiangOutCap());
S.miaoUp = { box: 2 };
ok(sandbox.xiangOutCap() === 7, '两只功德箱再加 4 石', sandbox.xiangOutCap());
S.miaoUp = {};

S.followers = 500;
ok(Math.abs(sandbox.shenStoneIncome() - 10) < 1e-9, '500 信众 = 10 石/月', sandbox.shenStoneIncome());

S.followers = 0;
ok(sandbox.monthXianghuo().capped === 0, '无信众无香火');
S.followers = 500;
const m0 = sandbox.monthXianghuo();
ok(Math.abs(m0.capped - 400 / 12) < 1e-9, '一柱月香火封顶 = need/12', m0.capped);
S.miaoUp = { lu: 3 };
const m1 = sandbox.monthXianghuo();
ok(m1.raw > m0.raw, '铜香炉抬高 raw（' + m0.raw.toFixed(1) + ' → ' + m1.raw.toFixed(1) + '）');
ok(m1.capped === m0.capped, '香炉不抬月封顶，只抬实际速率');
S.miaoUp = { di: 2 };
ok(sandbox.maxXianghuo() === Math.round(800 * 1.6), '两张庙地契把香火上限抬到 1.6 倍', sandbox.maxXianghuo());
S.miaoUp = {};

S.cultivation = 'xian';
ok(sandbox.shenStoneIncome() === 0, '仙道没有香火钱进项');
S.cultivation = 'both';
ok(sandbox.shenStoneIncome() > 0, '双修才有香火钱');

/* ---------- 4. 源码守卫 ---------- */
console.log('=== 4. 源码守卫 ===');
ok(!/S\.xianghuo\s*\/\s*100/.test(gcode), '已删除「香火每月自动兑灵石」');
ok(gcode.indexOf('function xiangOutCap') > 0, '化香火钱有月限函数');
ok(gcode.indexOf('openMiaoMarket') > 0 && gcode.indexOf('act:openMiaoMarket') > 0, '庙市有入口');
ok(/if \(isShen\(\) && !isBoth\(\)\) \{ toast\('神道只走庙市'\)/.test(gcode), '神道进不了坊市');
ok(/if \(it\.type === 'xiang' && !usesShenLine\(\)\)/.test(gcode), '仙道用不了信香');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
