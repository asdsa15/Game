/* 问道长生 · 图标批次生成器
   ------------------------------------------------------------
   从 icon_subjects.json（主体描述）+ icon_map.json（条目映射）
   批量产出 connector__matrix__generate_image 的入参文件。

   为什么不手写 8 份 JSON：
     prompt 骨架是铁律（墨线/设色/宣纸底/无文字…），81 张必须逐字一致，
     手工复制必然漂。骨架写死在一处，主体描述进 subjects，批次自动切。

   用法：
     node art/pipeline/build_icon_batches.js                 # 生成全部批次
     node art/pipeline/build_icon_batches.js --out-dir <dir>
     node art/pipeline/build_icon_batches.js --ref <temp_url>  # 覆盖参考图
     node art/pipeline/build_icon_batches.js --probe           # 只出 1 张试水

   批次切分：connector__matrix__generate_image 的 requests 数组单次最多 10 条，
   故 81 张切成 9 批（9×9 + 剩余）。试点批单独出（batch0），供画风验收。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SUBJECTS = path.join(ROOT, 'art', 'pipeline', 'icon_subjects.json');
const MAPFILE = path.join(ROOT, 'art', 'pipeline', 'icon_map.json');
const PIPE = path.join(ROOT, 'art', 'pipeline', 'compress_art.py');

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const hasFlag = k => argv.includes(k);

const OUT_DIR = arg('--out-dir', path.join(ROOT, 'art', 'pipeline'));
const REF_URL = arg('--ref', null);
const REF_MIME = arg('--ref-mime', 'image/jpeg');
const BATCH_SIZE = 10;

/* ============================================================
   一、prompt 骨架（铁律，不可改）
   ============================================================ */

/* 参考图说明：图1 = 器物画法基准，图2 = 山水笔墨基准。
   两张都取自已落地的真实场景图（不是概念样张），
   这样图标与现有 33 张插画天然同源，不靠文字描述去"猜"风格。 */
const REF_LEAD = [
  '以图1为器物画法基准、以图2为山水笔墨基准：只沿用两图的墨线笔法、矿物设色与宣纸底调，',
  '不沿用两图的具体画面内容、构图与人物形象。',
].join('');

/* 图标专用骨架。与场景骨架的差异：
   画种从"写意山水"改"器物白描"、画幅 1:1、禁人脸、设色面积减半、墨线略细。 */
const STYLE = [
  '中国水墨淡彩器物图标，青绿山水设色风格：',
  '厚重墨线勾勒轮廓（线条略细于山水画，提按不明显），',
  '石青石绿为主调、赭石点染、墨色压边，',
  '设色面积不超过画面一半，米白宣纸底色，',
  '主体居中占画面约四分之三，正方形构图，',
  '无人物面部，无文字、无印章、无水印、无背景场景、无投影、无 UI 元素。',
].join('');

function buildPrompt(subject) {
  return REF_LEAD + '\n主体：' + subject + '。\n' + STYLE;
}

/* ============================================================
   二、读入数据
   ============================================================ */

const subjects = JSON.parse(fs.readFileSync(SUBJECTS, 'utf8')).subjects;
const map = JSON.parse(fs.readFileSync(MAPFILE, 'utf8'));

/* 图标键清单：与 compress_art.py 的 ICON_KEYS 保持一致，
   以那边为权威（压缩管线按它找源图）。 */
function declaredKeys() {
  const py = fs.readFileSync(PIPE, 'utf8');
  const base = py.match(/ICON_BASE_KEYS = \[([\s\S]*?)\n\]/);
  const ident = py.match(/ICON_IDENTITY_KEYS = \(([\s\S]*?)\n\)/);
  const out = [];
  for (const m of base[1].matchAll(/"([^"]+)"/g)) out.push(m[1]);
  const identTxt = ident[1];
  for (const m of identTxt.matchAll(/"([^"]+)"/g)) out.push(m[1]);
  // fx_g%d 是 python 模板，展开
  const fx = [];
  for (let i = 1; i <= 12; i++) fx.push('fx_g' + i);
  return out.filter(k => !k.includes('%d')).concat(fx.filter(k => !out.includes(k)));
}

const KEYS = declaredKeys();
const used = new Set(map.entries.map(e => e.icon));

/* ---- 一致性校验：先报错，别产出错的批次 ---- */
const errs = [];
for (const k of KEYS) {
  if (!subjects[k]) errs.push('缺主体描述：' + k);
  if (!used.has(k)) errs.push('无条目占用（该图标画了没人用）：' + k);
}
for (const k of Object.keys(subjects)) {
  if (!KEYS.includes(k)) errs.push('主体描述里有未声明的键：' + k);
}
if (errs.length) {
  console.error('图标集与映射表不一致，未生成批次：');
  for (const e of errs) console.error('  ! ' + e);
  process.exit(1);
}

/* ============================================================
   三、参考图
   ============================================================ */

/* 无 --ref 时，沿用批次文件里已有的参考图（写死在旧 JSON 里）。
   旧链接会过期，所以正常路径应显式传 --ref。 */
function readExistingRef() {
  const f = path.join(OUT_DIR, 'icon_batch0.json');
  if (!fs.existsSync(f)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = j.requests && j.requests[0] && j.requests[0].reference_images;
    return r && r[0] ? r[0] : null;
  } catch (e) { return null; }
}

let refs = [];
if (REF_URL) {
  refs = [{ url: REF_URL, mime_type: REF_MIME }];
} else {
  const ex = readExistingRef();
  if (ex) refs = [ex];
}

/* ============================================================
   四、切批输出
   ============================================================ */

function makeReq(key) {
  const s = subjects[key];
  const r = {
    prompt: buildPrompt(s.subject),
    aspect_ratio: '1:1',
    area: '1K',
    n: 1,
    output_format: 'png',
    output_file: key,
  };
  if (refs.length) r.reference_images = refs;
  return r;
}

/* 试点批单独出：batch0 = 画风验收用（10 张，覆盖全部形态） */
const PROBE_KEYS = [
  'el_metal', 'el_wood', 'el_water', 'el_fire', 'el_earth',
  'fn_atk', 'fn_def', 'fn_escape', 'icon_scroll', 'pill_hp',
];

const written = [];

if (hasFlag('--probe')) {
  const out = { requests: [makeReq(PROBE_KEYS[0])] };
  const f = path.join(OUT_DIR, 'icon_probe.json');
  fs.writeFileSync(f, JSON.stringify(out, null, 2), 'utf8');
  written.push([f, 1]);
  console.log('试水批次：' + f + '（1 张）');
} else {
  // batch0 = 试点（10 张）
  const probe = { requests: PROBE_KEYS.map(makeReq) };
  const f0 = path.join(OUT_DIR, 'icon_batch0.json');
  fs.writeFileSync(f0, JSON.stringify(probe, null, 2), 'utf8');
  written.push([f0, probe.requests.length]);

  // batch1.. = 铺开（剩余 71 张，每批 ≤10）
  const rest = KEYS.filter(k => !PROBE_KEYS.includes(k));
  for (let i = 0, b = 1; i < rest.length; i += BATCH_SIZE, b++) {
    const slice = rest.slice(i, i + BATCH_SIZE);
    const f = path.join(OUT_DIR, 'icon_batch' + b + '.json');
    fs.writeFileSync(f, JSON.stringify({ requests: slice.map(makeReq) }, null, 2), 'utf8');
    written.push([f, slice.length]);
  }
}

console.log('=== 图标批次已生成 ===');
console.log('图标总数   ', KEYS.length);
console.log('试点批     ', PROBE_KEYS.length, '张（画风验收）');
console.log('铺开批     ', KEYS.length - PROBE_KEYS.length, '张');
console.log('参考图     ', refs.length ? refs[0].url.slice(0, 60) + '…' : '无');
console.log('\n文件：');
for (const [f, n] of written) {
  console.log('  ' + path.basename(f).padEnd(20) + n + ' 张  ' + (fs.statSync(f).size / 1024).toFixed(1) + ' KB');
}
console.log('\n生成命令（额度到位后逐批跑）：');
for (const [f, n] of written) {
  console.log('  mcode-tools connector call connector__matrix__generate_image --args-file ' +
    path.relative(ROOT, f).replace(/\\/g, '/'));
}
