/* 问道长生 · 图标映射生成器
   ------------------------------------------------------------
   把 wxcs3-data.js 里 ~285 个条目，按语义类别映射到 89 个图标键。

   产出两份文件：
     1) art/pipeline/icon_map.json    —— 人可读的映射表（id → 图标键 + 归并依据）
     2) wxcs3-icons.js                —— 运行时映射（游戏直接读这张表）

   为什么要有这张表：
     图标只画 89 张，但界面上的条目有 285 个。缺了这张表，
     "哪个条目用哪张图标"就只能靠人记，返工时无从查证。

   归并原则（与《图形体系规格_20261118.md》§3 一致）：
     · 纵向轴（等级/品阶）→ 色板，不画图标
     · 横向类目（元素/物件/动作）→ 图标
     · 同一分类字段的条目共用一张图标，个体差异交给文字 chip

   用法：node art/pipeline/build_icon_map.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TABLES = path.join(ROOT, '.tmp', 'tables.json');
const OUT_JSON = path.join(ROOT, 'art', 'pipeline', 'icon_map.json');
const OUT_JS = path.join(ROOT, 'wxcs3-icons.js');

const T = JSON.parse(fs.readFileSync(TABLES, 'utf8'));

/* ============================================================
   一、基础图标（41）—— 键名与《图形体系规格》§3.2 完全一致
   ============================================================ */

// 元素：功法 el 字段 → 图标
const EL_MAP = {
  metal: 'el_metal', jin: 'el_metal', gold: 'el_metal',
  wood: 'el_wood', mu: 'el_wood',
  water: 'el_water', shui: 'el_water', ice: 'el_ice', bing: 'el_ice',
  fire: 'el_fire', huo: 'el_fire',
  earth: 'el_earth', tu: 'el_earth',
  thunder: 'el_thunder', lei: 'el_thunder',
  wind: 'el_wind', feng: 'el_wind',
};

// 符/法宝/技能功能
const FN_MAP = {
  atk: 'fn_atk', attack: 'fn_atk', gong: 'fn_atk',
  def: 'fn_def', body: 'fn_def', defense: 'fn_def', dun: 'fn_def',
  escape: 'fn_escape', move: 'fn_escape', dunzou: 'fn_escape',
  buff: 'fn_buff', boost: 'fn_buff',
  // 法宝 slot=once：一次性消耗品（破宝锥/火云符/传音符/五雷符/祈雨符箓/拘仙敕神符）
  once: 'fn_talisman',
};

// 丹 type → 图标（PILL_EXT.type 12 种收敛为 8）
const PILL_MAP = {
  hp: 'pill_hp', hpPct: 'pill_hp_big', hpFull: 'pill_hp_big',
  cure: 'pill_cure', heal: 'pill_cure',
  life: 'pill_life',
  mp: 'pill_mp', mpPct: 'pill_mp', mpFull: 'pill_mp',
  heart: 'pill_heart', xin: 'pill_heart',
  break: 'pill_break', pojing: 'pill_break',
  cult: 'pill_cult', xiang: 'pill_cult', xiuxian: 'pill_cult',
};

// 丹 type 未列出的兜底：按名称关键字
const PILL_FALLBACK = [
  [/血|气|元/, 'pill_hp'],
  [/灵|真元/, 'pill_mp'],
  [/伤|疗|愈/, 'pill_cure'],
  [/寿|命|延年/, 'pill_life'],
  [/心|悟|念/, 'pill_heart'],
  [/突破|破境|壁/, 'pill_break'],
  [/修|行|静|定/, 'pill_cult'],
];

/* 材料 eff → 图标（19 条收敛为 7）。
   按 id 精确归类，不靠正则顺序：MATERIAL_EXT 里多条 eff 同时含
   「炼丹」「内丹」「器胚」等词，正则先后顺序会误判（例：妖丹的
   eff 是「妖兽内丹，炼器炼丹通用」，按正则必被炼丹类抢走）。 */
const MAT_BY_ID = {
  buqiCao: 'mat_alchemy',      // 炼丹主材：回灵类
  heshenHua: 'mat_alchemy',    // 炼丹主材：宁神类
  yuhuaYu: 'mat_alchemy',      // 炼丹主材：玉华灵水
  tianying: 'mat_alchemy',     // 凝婴丹主材
  gulingHua: 'mat_herb',       // 疗伤类丹药引子
  lanyouCao: 'mat_herb',       // 最常见的疗伤草药
  starSand: 'mat_artifact',    // 炼器主材：法器品阶 +1
  tieMu: 'mat_artifact',       // 器胚主材
  longYan: 'mat_artifact',     // 地阶器胚主材
  jinLing: 'mat_artifact',     // 炼器刻阵用，导灵
  fuZhi: 'mat_talisman',       // 制符承载之物
  zhuSha: 'mat_talisman',      // 制符定属性
  zhenQi: 'mat_array',         // 布阵必须
  huanShi: 'mat_array',        // 迷踪阵主材
  mudanYao: 'mat_beast',       // 妖兽内丹
  wuxingling: 'mat_spirit',    // 五行俱全
  wulianXue: 'mat_spirit',     // 魔门血炼主材
  jidaoGuo: 'mat_spirit',      // 剑修大成之果
  qunfangSui: 'mat_spirit',    // 双修与容颜之物
};
// 未列入的兜底：按 eff 关键字
const MAT_FALLBACK = [
  [/妖兽|内丹/, 'mat_beast'],
  [/制符|符纸|朱砂/, 'mat_talisman'],
  [/布阵|阵旗|阵主材/, 'mat_array'],
  [/炼器|器胚/, 'mat_artifact'],
  [/疗伤|草药|引子/, 'mat_herb'],
  [/炼丹|丹主材/, 'mat_alchemy'],
  [/五行|血炼|魔门/, 'mat_spirit'],
];

// 事件 kind → 氛围图标
const EV_MAP = {
  good: 'amb_ev_good',
  risk: 'amb_ev_risk',
  bad: 'amb_ev_risk',
  neutral: 'amb_enc_common',
};

// 机缘 kind → 氛围图标
const ENC_MAP = {
  common: 'amb_enc_common',
  xian: 'amb_enc_xian',
  shen: 'amb_enc_shen',
};

// 技能 kind → 图标（14 条）
// 实测 SKILLS.kind 取值：normal/sword/fire/water/wood/earth/
//   poison/control/thunder/blood —— 是「招式属性」而非攻守类别，
//   所以按属性归到元素意象，少数非元素招式归到功能类。
const SKILL_MAP = {
  normal: 'fn_atk',      // 朴实一击
  sword: 'el_metal',     // 剑气纵横 / 流转剑罡 / 白骨飞剑
  fire: 'el_fire',
  water: 'el_water',
  wood: 'el_wood',
  earth: 'el_earth',
  thunder: 'el_thunder',
  poison: 'fn_poison',   // 毒火丝：持续真伤
  control: 'fn_control', // 镇压八方：压制
  blood: 'fn_blood',     // 血炼神光：魔门血炼
};

/* ============================================================
   二、映射主逻辑
   ============================================================ */

const map = {};          // 图标键 → 条目数组
const entries = [];      // 逐条明细

function put(iconKey, table, id, name, reason) {
  if (!iconKey) return false;
  if (!map[iconKey]) map[iconKey] = [];
  map[iconKey].push({ table, id, name });
  entries.push({ table, id, name, icon: iconKey, reason });
  return true;
}

/* --- 功法 45 --- */
for (const g of T.GONGFA_EXT) {
  const key = EL_MAP[g.el] || 'icon_scroll';
  const reason = g.el ? ('元素属性 el=' + g.el) : '无属性功法';
  put(key, 'GONGFA_EXT', g.id, g.name, reason);
}

/* --- 丹药 19 --- */
for (const p of T.PILL_EXT) {
  let key = PILL_MAP[p.type];
  let reason = '丹药类型 type=' + p.type;
  if (!key) {
    for (const [re, k] of PILL_FALLBACK) {
      if (re.test(p.name) || re.test(p.desc || '')) { key = k; reason = '类型未列，按名称/说明归类'; break; }
    }
  }
  if (!key) { key = 'pill_hp'; reason = '类型未列，兜底归入恢复类'; }
  put(key, 'PILL_EXT', p.id, p.name, reason);
}

/* --- 材料 19 --- */
for (const m of T.MATERIAL_EXT) {
  let key = MAT_BY_ID[m.id];
  let reason = '材料用途 eff=' + m.eff;
  if (!key) {
    for (const [re, k] of MAT_FALLBACK) {
      if (re.test(m.eff || '')) { key = k; reason = '用途未列入 id 表，按 eff 关键字归类'; break; }
    }
  }
  if (!key) { key = 'mat_spirit'; reason = '用途未列，兜底归入通用材料'; }
  put(key, 'MATERIAL_EXT', m.id, m.name, reason);
}

/* --- 符 5 --- */
for (const t of T.TALISMANS) {
  const key = FN_MAP[t.kind] || 'fn_atk';
  put(key, 'TALISMANS', t.id, t.name, '符箓类型 kind=' + t.kind);
}

/* --- 法宝 12 --- */
for (const a of T.ARTIFACT_EXT) {
  const key = FN_MAP[a.slot] || 'fn_buff';
  put(key, 'ARTIFACT_EXT', a.id, a.name, '法宝部位 slot=' + a.slot);
}

/* --- 杀伐技能 14 --- */
for (const s of T.SKILLS) {
  const key = SKILL_MAP[s.kind] || 'icon_scroll';
  put(key, 'SKILLS', s.id, s.name, '技能类型 kind=' + s.kind);
}

/* --- 机缘 25 --- */
for (const e of T.ENCOUNTERS) {
  const key = ENC_MAP[e.kind] || 'amb_enc_common';
  put(key, 'ENCOUNTERS', e.id, e.name, '机缘类别 kind=' + e.kind);
}

/* --- 奇遇事件 38 --- */
for (const e of T.EVENTS) {
  const key = EV_MAP[e.kind] || 'amb_enc_common';
  put(key, 'EVENTS', e.id, e.name, '事件类别 kind=' + e.kind);
}

/* --- 技艺 4 --- */
const CRAFT_ICON = { dan: 'craft_dan', qi: 'craft_qi', fu: 'craft_fu', zhen: 'craft_zhen' };
for (const c of T.CRAFT_ARTS) {
  put(CRAFT_ICON[c.id] || 'craft_dan', 'CRAFT_ARTS', c.id, c.name, '技艺一门一图');
}

/* --- 阵法 4 --- */
for (const a of T.ARRAY_DISKS) {
  put('array_' + a.id, 'ARRAY_DISKS', a.id, a.name, '阵盘一件一图');
}

/* --- 配方 17：按「产出物」归并 ---
   配方的 out 字段指向产出物（丹/符/法宝/阵盘），
   配方图标应与它产出的东西一致 —— 玩家看到丹方就知道能炼什么丹。 */
const OUT_ICON = {};
for (const it of entries) OUT_ICON[it.table + ' ' + it.id] = it.icon;

const OUT_TABLE = { PILL_EXT: 'PILL_EXT', TALISMANS: 'TALISMANS', ARTIFACT_EXT: 'ARTIFACT_EXT', ARRAY_DISKS: 'ARRAY_DISKS' };
for (const r of T.RECIPES) {
  const out = String(r.out || '');
  let key = null, reason = '';
  // 产出物 id 归属哪张表，就取那张表的图标
  for (const tbl of ['PILL_EXT', 'TALISMANS', 'ARTIFACT_EXT', 'ARRAY_DISKS']) {
    if (OUT_ICON[tbl + ' ' + out]) { key = OUT_ICON[tbl + ' ' + out]; reason = '按产出物 ' + out + ' 归并'; break; }
  }
  if (!key) {
    // 产出物不在扩展表里（如 pillHp 属基础丹表）→ 按配方类别兜底
    const k = String(r.kind || '');
    key = CRAFT_ICON[k] || 'craft_dan';
    reason = '产出物不在扩展表，按配方类别 kind=' + k + ' 归并';
  }
  put(key, 'RECIPES', r.id, r.name, reason);
}

/* --- 工艺书 12：按所属技艺归并 --- */
for (const b of T.CRAFT_BOOKS) {
  const key = CRAFT_ICON[b.art] || 'icon_scroll';
  put(key, 'CRAFT_BOOKS', b.id, b.name, '工艺书按技艺归并 art=' + b.art);
}

/* --- 愿物 3 / 显圣神器 3 --- */
/* 这两类条目少、身份独立，各给一张图标，不与材料/法宝混用。
   愿物是「做出来卖���香客的成品」，与材料（原料）不同；
   显圣神器是神道庙产法器，与坊市法宝（装备）不同。 */
for (const v of T.VOTIVE_ITEMS) put('item_votive', 'VOTIVE_ITEMS', v.id, v.name, '愿物一类一图');
for (const d of T.DIVINE_ARTIFACTS) put('item_divine', 'DIVINE_ARTIFACTS', d.id, d.name, '显圣神器一类一图');

/* --- 身份类：一项一图，不归并 ---
   法相 12 + 体质 8 + 道途 6 + 出身 10 + 真君 12 = 48 张。

   注意：法相与真君是「同一批 12 个实体」——game.js:3116 用
   D.ZHENJUN.find(z => z.id === fx) 取真君，id 与 FAXIANG 完全同源。
   所以 fx_* 与 zhenjun_* 指向同一张图，图标总数由 89 降为 77。 */
for (const f of T.FAXIANG) put('fx_' + f.id, 'FAXIANG', f.id, f.name, '法相一相一图');
for (const b of T.BODIES) put('body_' + b.id, 'BODIES', b.id, b.name, '体质一体一图');
for (const p of T.PATHS) put('path_' + p.id, 'PATHS', p.id, p.name, '道途一途一图');
for (const o of T.ORIGINS) put('org_' + o.id, 'ORIGINS', o.id, o.name, '出身一出一图');
for (const z of T.ZHENJUN) put('fx_' + z.id, 'ZHENJUN', z.id, z.name, '真君与法相同一实体，共用 fx_* 图');

/* ============================================================
   三、输出
   ============================================================ */

// 覆盖统计
const covered = entries.length;
const usedIcons = Object.keys(map).length;

const jsonOut = {
  _note: '条目 → 图标键映射。由 art/pipeline/build_icon_map.js 生成，勿手改。',
  _stats: {
    totalEntries: covered,
    usedIcons,
    byTable: Object.entries(entries.reduce((a, e) => {
      a[e.table] = (a[e.table] || 0) + 1; return a;
    }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ table: k, count: v })),
  },
  icons: Object.fromEntries(Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v])),
  entries: entries.sort((a, b) =>
    a.table.localeCompare(b.table) || a.id.localeCompare(b.id)),
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(jsonOut, null, 1), 'utf8');

/* 运行时 JS：给游戏用的「查图标」API */
const js = `/* 问道长生 · 图标映射（由 art/pipeline/build_icon_map.js 生成，勿手改）
   ------------------------------------------------------------
   表结构：表名 + 条目 id → 图标键。
   渲染层只认图标键，不认条目 id；条目 id 到图标的归并逻辑
   全部落在生成器里，改规则请改生成器后重跑。

   用法：
     WXCS3_ICONS.icon('GONGFA_EXT', 'gongfa_xxx')  → 'el_fire'
     WXCS3_ICONS.src('el_fire')                    → 'art/icons/el_fire.jpg'
     WXCS3_ICONS.has('el_fire')                     → true
   缺图或缺映射：返回 null，调用方静默跳过（与场景插画同一套兜底）。 */
(function (window) {
  'use strict';

  var MAP = ${JSON.stringify(Object.fromEntries(
    entries.map(e => [e.table + ' ' + e.id, e.icon])
  ))};

  var ICON_KEYS = ${JSON.stringify(Object.keys(map).sort())};

  function icon(table, id) {
    var k = table + ' ' + id;
    return MAP[k] || null;
  }

  function src(key) {
    if (!key) return null;
    if (window.ART_ICONS && window.ART_ICONS[key]) return window.ART_ICONS[key];
    return 'art/icons/' + key + '.jpg';
  }

  function has(key) {
    return !!key && (!!(window.ART_ICONS && window.ART_ICONS[key]) ||
      ICON_KEYS.indexOf(key) >= 0);
  }

  window.WXCS3_ICONS = {
    icon: icon, src: src, has: has, keys: ICON_KEYS,
    map: function (table) {
      var out = {};
      for (var k in MAP) {
        var sp = k.indexOf(' ');
        if (sp < 0) continue;
        if (k.slice(0, sp) === table) out[k.slice(sp + 1)] = MAP[k];
      }
      return out;
    }
  };
})(typeof window !== 'undefined' ? window : this);
`;
fs.writeFileSync(OUT_JS, js, 'utf8');

/* ---- 控制台报告 ---- */
console.log('=== 条目 → 图标 映射完成 ===');
console.log('条目总数   ', covered);
console.log('占用图标数 ', usedIcons, '/ 89');
console.log('\n按表统计：');
for (const r of jsonOut._stats.byTable) {
  console.log('  ' + r.table.padEnd(16), String(r.count).padStart(3));
}
console.log('\n按图标统计（条目数降序）：');
const byIcon = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
for (const [k, v] of byIcon) {
  console.log('  ' + k.padEnd(18), String(v.length).padStart(3));
}
console.log('\n写出：');
console.log('  ' + OUT_JSON);
console.log('  ' + OUT_JS);
