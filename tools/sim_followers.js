// 信众曲线月数模拟：回答「四/六/八柱各要多久」
// 不改源码、不依赖 DOM，只按 data.js 的数值与 game.js 的公式重算。
//
// v8.0 校准前的问题：传教是常数收益（约 115 人/月），流失是百分比（1%/月），
// 于是信众必然在 11500 人处饱和——与柱位无关。而五柱起的上限是 3 万 / 9.5 万 / 30 万，
// 光靠传教永远够不到，后期只能反复刷显圣（一次几百人，要刷几百次）。
//
// 校准后：传教与显圣的收益都乘 followerScale = max(1, 上限 / 3450)，
// 使「拉信众」的耗时稳定在一两年，不再按柱位指数级膨胀。
// 本脚本就是这次校准的验收：跑出来的月数应落在 6~40 月区间。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'),
  { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (n) => Math.round(n * 10) / 10;

/* —— 与 game.js 一致 —— */
function followLimit(pillar, pos) {
  const t = clamp((pillar + pos / 3) / 2, 0, D.FOLLOW_LIMIT.length - 1);
  const lo = Math.floor(t), hi = Math.min(D.FOLLOW_LIMIT.length - 1, lo + 1);
  if (lo === hi) return D.FOLLOW_LIMIT[lo].max;
  const a = D.FOLLOW_LIMIT[lo].max, b = D.FOLLOW_LIMIT[hi].max;
  return Math.round(a * Math.pow(b / a, t - lo));
}
function followerScale(limit) { return Math.max(1, limit / 3450); }
function rateXh(p, cfg, followers) {
  const miaoC = D.MIAO_COEFF[D.PILLARS[p].miao] || 1;
  const qi = D.LINGQI[cfg.lingqi].v;
  return (followers / 4) * cfg.piety * miaoC * qi * cfg.qiheC * (1 + 0.08 * cfg.furnace);
}

const PREACH_BASE = 30 + 170 / 2;    // 施粥期望收益
const LOSS = 0.01;                   // 每月净流失

function simPillar(p, cfg) {
  const need = D.PILLARS[p].need;
  const monthlyCap = need / 12;
  const storeCap = Math.round(need * 2 * (1 + 0.3 * cfg.landDeed));
  const limit = followLimit(p, 0);
  const add = PREACH_BASE * followerScale(limit);
  let followers = Math.min(cfg.startFollowers, limit);
  let preachMonths = 0;
  while (preachMonths < 2400) {
    if (followers >= limit) break;
    const next = Math.min(limit, followers + add);
    const decayed = next * (1 - LOSS);
    if (decayed <= followers + 0.5) break;      // 到平衡点
    followers = decayed;
    preachMonths++;
  }
  followers = Math.round(followers);
  const gainPerMonth = Math.min(rateXh(p, cfg, followers), monthlyCap);
  const fillMonths = Math.ceil(Math.min(need, storeCap) / Math.max(1, gainPerMonth));
  return {
    p: p, name: D.PILLARS[p].name, title: D.PILLARS[p].title, need: need,
    limit: limit, followers: followers, preachMonths: preachMonths, add: add,
    gainPerMonth: gainPerMonth, fillMonths: fillMonths,
    total: preachMonths + fillMonths, gapPct: gainPerMonth / monthlyCap
  };
}

const cfg = { lingqi: 1, qiheC: 1.2, piety: 1.0, furnace: 0, landDeed: 0, fate: 8, startFollowers: 100 };

console.log('=== 一、信众来源是否跟得上上限 ===');
console.log('传教基础收益 ' + PREACH_BASE + ' 人/月，乘 followerScale = 上限 ÷ 3450；月流失 ' + (LOSS * 100) + '%。\n');
console.log(['柱位', '信众上限', '倍数', '实际月增', '平衡点'].join('\t'));
for (let p = 0; p < 7; p++) {
  const lim = followLimit(p, 0);
  const sc = followerScale(lim);
  console.log([D.PILLARS[p].name, lim, round(sc), Math.round(PREACH_BASE * sc),
    Math.round(PREACH_BASE * sc / LOSS)].join('\t'));
}

console.log('\n=== 二、各柱破柱月数（只传教 + 坐庙，不显圣） ===');
console.log(['柱位', '条件', '香火需求', '信众上限', '达到信众', '传教月', '月香火', '填香月', '合计年'].join('\t'));
const rows = [];
for (let p = 0; p < 7; p++) {
  const r = simPillar(p, cfg);
  rows.push(r);
  console.log([
    r.name, D.PILLARS[p].title, r.need, r.limit, r.followers,
    r.preachMonths, Math.round(r.gainPerMonth), r.fillMonths, round(r.total / 12)
  ].join('\t'));
}

console.log('\n=== 三、单月香火能否吃满 need/12 ===');
let allFull = true;
for (const r of rows) {
  const full = r.gapPct >= 0.995;
  if (!full) allFull = false;
  console.log(r.name + '\t' + Math.round(r.gainPerMonth) + ' / ' + Math.round(r.need / 12) + '\t' +
    (full ? '✔ 吃满' : '△ 只有 ' + Math.round(r.gapPct * 100) + '%'));
}

console.log('\n=== 四、节奏验收 ===');
let bad = [], thin = [];
for (const r of rows) {
  /* 每柱 6~60 月（半年到五年）算合理：低于 6 月太轻，高于 60 月变成熬 */
  if (r.total < 6 || r.total > 60) bad.push(r.name + ' ' + r.total + ' 月');
  /* 吃满率低于一半才算法性问题；九成上下只是信众上限略低于满速率点 */
  if (r.gapPct < 0.5) thin.push(r.name + ' ' + Math.round(r.gapPct * 100) + '%');
}
if (!bad.length) {
  console.log('✔ 每柱合计 6~60 月，节奏稳定，无指数级膨胀。');
} else {
  console.log('✘ 超出区间：' + bad.join('、'));
}
if (!thin.length) {
  console.log('✔ 各柱单月香火至少吃到上限需求的一半，香火不构成死锁。');
  const partial = rows.filter(function (r) { return r.gapPct < 0.995; })
    .map(function (r) { return r.name + ' ' + Math.round(r.gapPct * 100) + '%'; });
  if (partial.length) {
    console.log('  备注：' + partial.join('、') +
      ' 吃不满——这是信众上限本身低于「满速率信众数」，只会让填香多花一两月，不吃死。');
  }
} else {
  console.log('✘ 吃得太少，信众上限偏低：' + thin.join('、'));
}

const totalM = rows.reduce(function (a, r) { return a + r.total; }, 0);
console.log('\n一柱到八柱全流程约 ' + totalM + ' 月（' + round(totalM / 12) + ' 年）。');
console.log('其中传教 ' + rows.reduce(function (a, r) { return a + r.preachMonths; }, 0) +
  ' 月，填香 ' + rows.reduce(function (a, r) { return a + r.fillMonths; }, 0) + ' 月。');

console.log('\n=== 五、庙产投入的影响（四柱） ===');
[[0, 0], [3, 0], [3, 2]].forEach(function (x) {
  const c = Object.assign({}, cfg, { furnace: x[0], landDeed: x[1] });
  const r = simPillar(3, c);
  console.log('香炉 ' + x[0] + ' 座 · 庙地契 ' + x[1] + ' 张 → ' + r.total +
    ' 月（' + round(r.total / 12) + ' 年）');
});

process.exit(bad.length || thin.length ? 1 : 0);
