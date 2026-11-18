/* 问道长生 · 水墨插画层（纯渲染增强，不动逻辑与存档）
   ------------------------------------------------------------
   资源两级：
     1) window.ART_DATA —— mobile/build.py 将 art/scenes/*.jpg
        转 base64 注入，dist 单文件双击即玩用；
     2) art/scenes/<key>.jpg —— 开发态独立文件。
        <img> 直读，file:// 协议无 CORS 问题。
   缺图或加载失败：容器由 onerror 静默隐藏，界面回退纯文字。
   本文件缺失时 game.js 各挂载点静默跳过（typeof 守卫）。

   图标层（2026-11-18 新增）：
     window.ART_ICONS —— mobile/build.py 将 art/icons/*.jpg
        转 base64 注入；开发态走 art/icons/<key>.jpg 独立文件。
     图标保留宣纸底，不抠图；靠 CSS mix-blend-mode:multiply
        融进面板底色（--panel:#FFFEFB）。
     条目 → 图标的归并规则见 wxcs3-icons.js（由
        art/pipeline/build_icon_map.js 生成）。 */
(function (window) {
  'use strict';

  var KEYS = [
    'cave', 'wild', 'sect', 'market', 'temple', 'dongtian',
    'break', 'combat', 'create', 'dying',
    'over', 'hurt', 'visitor', 'closed',
    'drought',
    'zhou_qingyue', 'zhou_nanyue', 'zhou_xisha', 'zhou_beiyuan', 'zhou_zhongzhou',
    'map',
    'end_sit', 'end_fall', 'end_daohua', 'end_reinc', 'end_guowei', 'end_zhenjun',
    'end_daotai', 'end_ascend', 'end_xiaoyao', 'end_xianzun', 'end_modao', 'end_shizun'
  ];

  function has(key) {
    return !!(window.ART_DATA && window.ART_DATA[key]) || KEYS.indexOf(key) >= 0;
  }

  function src(key) {
    if (window.ART_DATA && window.ART_DATA[key]) return window.ART_DATA[key];
    return 'art/scenes/' + key + '.jpg';
  }

  /* ---------- 图标层 ---------- */
  /* 图标与场景图是两条独立通道：键名空间不重叠，
     图标一律走 art/icons/ 目录，不与 art/scenes/ 混用。
     缺图时 src() 返回 null —— 调用方应据此静默跳过，
     不要回退到场景图（尺寸与画幅都不匹配）。 */
  function iconSrc(key) {
    if (!key) return null;
    if (window.ART_ICONS && window.ART_ICONS[key]) return window.ART_ICONS[key];
    return 'art/icons/' + key + '.jpg';
  }

  function iconHas(key) {
    return !!key;
  }

  window.WXCS3_ART = {
    has: has, src: src, keys: KEYS,
    iconSrc: iconSrc, iconHas: iconHas
  };
})(typeof window !== 'undefined' ? window : this);
