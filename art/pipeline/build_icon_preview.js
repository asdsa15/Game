/* 问道长生 · 图标验收页生成器
   ------------------------------------------------------------
   产出 art/preview/icon_check.html —— 纯静态页，双击即开。

   为什么要有它：
     图标画完后只看大图没有意义。24px 下图标糊掉是常态，
     只有贴进真实界面尺寸看，才知道哪张要重画。
     这一页把 81 张图标同时铺在 24/32/48 三档上，一眼看出哪张不合格。

   用法：
     1) 压缩：python art/pipeline/compress_art.py --icons
     2) 生成：node art/pipeline/build_icon_preview.js
     3) 打开：art/preview/icon_check.html
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MAPFILE = path.join(ROOT, 'art', 'pipeline', 'icon_map.json');
const SUBJFILE = path.join(ROOT, 'art', 'pipeline', 'icon_subjects.json');
const OUT = path.join(ROOT, 'art', 'preview', 'icon_check.html');

const map = JSON.parse(fs.readFileSync(MAPFILE, 'utf8'));
const subjAll = JSON.parse(fs.readFileSync(SUBJFILE, 'utf8'));
const SUBJ = subjAll.subjects;

const used = {};
map.entries.forEach(e => { used[e.icon] = (used[e.icon] || 0) + 1; });

const GROUPS = [
  ['元素', k => /^el_/.test(k)],
  ['功能', k => /^fn_/.test(k)],
  ['丹药', k => /^pill_/.test(k)],
  ['材料', k => /^mat_/.test(k)],
  ['技艺', k => /^craft_/.test(k)],
  ['阵法', k => /^array_/.test(k)],
  ['通用与氛围', k => /^(icon_scroll|amb_)/.test(k)],
  ['法相 / 真君', k => /^fx_/.test(k)],
  ['体质', k => /^body_/.test(k)],
  ['道途', k => /^path_/.test(k)],
  ['出身', k => /^org_/.test(k)],
  ['愿物 / 神器', k => /^item_/.test(k)],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cell(key) {
  const s = SUBJ[key];
  const n = used[key] || 0;
  let szs = '';
  for (const sz of [24, 32, 48]) {
    szs += `<span class="sz" style="width:${sz}px;height:${sz}px"><img src="../icons/${key}.jpg" alt="" onerror="this.parentNode.className='sz sz--miss'"></span>`;
  }
  return `<div class="cell">
  <div class="row">${szs}<span class="big"><img src="../icons/${key}.jpg" alt="" onerror="this.style.visibility='hidden'"></span></div>
  <div class="nm">${key}</div>
  <div class="ds">${s ? esc(s.subject) : '（缺主体描述）'}</div>
  <div class="ct">${n} 条目</div>
</div>`;
}

let body = '';
for (const [name, test] of GROUPS) {
  const keys = Object.keys(SUBJ).filter(test).sort();
  if (!keys.length) continue;
  body += `<h2>${name} <span class="cnt">${keys.length}</span></h2><div class="grid">`;
  body += keys.map(cell).join('');
  body += `</div>`;
}

const orphan = Object.keys(SUBJ).filter(k => !used[k]);
if (orphan.length) {
  body += `<h2 class="warn">有主体描述但无条目占用（画了没人用）</h2><div class="miss">${orphan.join('、')}</div>`;
}

const total = Object.keys(SUBJ).length;
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>图标验收页 · ${total} 张</title>
<style>
:root{--paper:#FAF6EE;--panel:#FFFEFB;--ink:#2F2B25;--muted:#7A736A;--edge:#E4DCCB;--jade:#5E9689}
*{box-sizing:border-box}
body{margin:0;padding:20px;background:var(--paper);color:var(--ink);
  font:14px/1.6 "Microsoft YaHei","PingFang SC",sans-serif}
h1{font-size:20px;margin:0 0 6px;letter-spacing:1px}
h2{font-size:15px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--edge);letter-spacing:1px}
h2 .cnt{color:var(--muted);font-weight:400;font-size:12px}
.tip{background:var(--panel);border:1px solid var(--edge);border-radius:8px;padding:12px 14px;
  color:var(--muted);font-size:13px;margin-bottom:6px}
.tip b{color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.cell{background:var(--panel);border:1px solid var(--edge);border-radius:8px;padding:10px;
  display:flex;flex-direction:column;gap:5px}
.row{display:flex;align-items:center;gap:10px}
.sz{display:inline-block;border:1px dashed var(--edge);background:var(--paper);
  overflow:hidden;flex:none;border-radius:3px}
.sz--miss{background:repeating-linear-gradient(45deg,#F3EEE2,#F3EEE2 4px,#EDE6D6 4px,#EDE6D6 8px)}
.sz img,.big img{width:100%;height:100%;object-fit:contain;display:block}
.big{width:72px;height:72px;border:1px dashed var(--edge);background:var(--paper);flex:none;
  overflow:hidden;border-radius:4px}
.nm{font-size:12px;color:var(--jade);font-weight:700;letter-spacing:.5px}
.ds{font-size:12px;color:var(--muted);line-height:1.5}
.ct{font-size:11px;color:#A09789}
.miss{background:#FBEFE9;border:1px solid #E0B9A8;color:#9A5A3C;padding:10px 12px;border-radius:6px;font-size:13px}
h2.warn{color:#9A5A3C;border-color:#E0B9A8}
/* 深底对照：图标在深底上还剩多少可读性 */
.dark{background:var(--ink);color:var(--paper);padding:14px 16px;border-radius:8px;margin-top:14px}
.dark h2{border-color:#4A443C;margin-top:0}
.dark .sz,.dark .big{background:#3A352E;border-color:#555046}
.dark .nm{color:#8FBFB2}
</style>
</head>
<body>
<h1>图标验收页 · ${total} 张</h1>
<div class="tip">
三档尺寸对应真实界面：<b>24px 列表行</b> / <b>32px 创角卡</b> / <b>48px 弹窗</b>。<br>
虚线框＝图标尚未生成。放大图只用于找问题，<b>不作为验收标准</b>。<br>
通过标准：<b>全部 ${total} 张在 24px 下轮廓可辨</b>。有一张糊掉就重画，不铺开。
</div>
${body}
<div class="dark">
<h2>深底对照（#2F2B25）</h2>
<div class="grid">
${Object.keys(SUBJ).filter(k => used[k]).sort().slice(0, 40).map(k => {
  return `<div class="cell" style="background:#3A352E;border-color:#555046">
  <div class="row"><span class="sz" style="width:24px;height:24px"><img src="../icons/${k}.jpg" alt="" onerror="this.parentNode.className='sz sz--miss'"></span>
  <span class="sz" style="width:48px;height:48px"><img src="../icons/${k}.jpg" alt="" onerror="this.parentNode.className='sz sz--miss'"></span></div>
  <div class="nm">${k}</div></div>`;
}).join('')}
</div>
</div>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('生成：' + OUT);
console.log('图标总数 ' + total + '  条目总数 ' + map.entries.length);
console.log('孤儿图标 ' + orphan.length);
