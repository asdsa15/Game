/* 问道长生 · 纯规则层（v9.0 第2步）
   ============================================================
   这里只放「不碰 DOM、不写 S、不产 HTML」的函数。
   判据是三条，缺一即不该进来：
     1) 不读不写 S（读也不行——那是状态，不是规则）；
     2) 不碰 document / localStorage / render / openModal；
     3) 只依赖参数与数据表 D。

   为什么值得单独一层
   ------------------------------------------------------------
   ① 这一层可以脱离浏览器直接跑，测试不需要 30 行 DOM 桩；
   ② 将来若把核心逻辑搬到后端（见《后端化改造方案》S0），
      搬的就是这个文件，而不是 10500 行的 game.js；
   ③ 改数值平衡时不用再读渲染代码。

   使用方式
   ------------------------------------------------------------
   game.js 在本层之后加载，开头把需要的名字绑成局部常量：
       const fmtNum = RULES.fmtNum;
   这样 game.js 内 400 多处调用点一行都不用改。

   注意：不要在这里放任何依赖 S 的函数。
   看起来很纯、其实读 S 的（如 currentGoal、deflectOf）一律留在 game.js。
   ============================================================ */
(function (G) {
  'use strict';
  var D = G.WXCS3_DATA;
  var RULES = {};

  /* 本层自带的两个数值工具。
     必须自己有一份：本文件先于 game.js 加载，
     不能指望从 game.js 里借——那会造成循环依赖。 */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }


  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }

  function fmtNum(n) {
    n = Math.round(Number(n) || 0);
    const a = Math.abs(n);
    if (a >= 100000000) return (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + ' 亿';
    if (a >= 10000) return (n / 10000).toFixed(2).replace(/\.?0+$/, '') + ' 万';
    if (a >= 1000) return n.toLocaleString('en-US');
    return String(n);
  }

  function fmtTime(ms) {
    const d = new Date(ms || Date.now());
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ms) {
    const d = new Date(ms || Date.now());
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function stampName() {
    const d = new Date();
    return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  function realmNameOf(st) {
    if (!st) return '—';
    if (st.cultivation === 'shen') {
      const p = D.PILLARS[clamp(parseInt(st.pillar, 10) || 0, 0, 7)];
      const pos = D.POSITIONS[clamp(parseInt(st.pos, 10) || 0, 0, 3)] || '';
      return (p ? p.name : '—') + '·' + pos;
    }
    const r = D.XIAN_REALMS[clamp(parseInt(st.xRealm, 10) || 0, 0, 5)];
    if (!r) return '—';
    const s = r.stages[clamp(parseInt(st.xStage, 10) || 0, 0, 4)] || '';
    return r.name + (s ? '·' + s : '');
  }

  function buildMeta(st) {
    if (!st) return null;
    return {
      name: st.name || '无名',
      dao: st.dao || st.name || '无名',
      realm: realmNameOf(st),
      age: st.age,
      year: Math.floor((st.turn || 0) / 12),
      when: fmtTime(Date.now()),
      phase: st.phase || ''
    };
  }

  /* 存档格式版本号归规则层所有。
     v10.3 P0：此前 VER 只定义在 game.js 的 IIFE 里，而 envelope /
     checkSaveVersion 在 v9.0 重构时搬到了本文件——两个 IIFE 作用域互不可见，
     于是每次存槽位都抛 ReferenceError: VER is not defined，
     被 catch 吞成一句「存档失败」，槽位与元数据从来没写进去过。
     存档协议是纯规则的一部分，因此常量放在这里，game.js 反过来引用它。 */
  var SAVE_VER = '10.2';

  function envelope(st) {
    return { format: 'wxcs3-save', version: SAVE_VER, savedAt: Date.now(), state: st };
  }

  function checkSaveVersion(o) {
    if (!o || typeof o !== 'object') return { ok: false, why: '不是对象' };
    const v = String(o.version || o.format || '');
    if (o.format === 'wxcs3-all') return { ok: true, why: '备份包' };
    if (o.format === 'wxcs3-save' && v !== SAVE_VER) return { ok: true, why: '存自 v' + v + '（字段已兜底）' };
    if (!o.format && !o.state && o.started === undefined) return { ok: false, why: '无法识别的存档' };
    return { ok: true, why: 'ok' };
  }

  function keMul(myEl, foeEl) {
    if (!myEl || !foeEl) return 1;
    const me = D.ELEMENTS[myEl];
    if (!me) return 1;
    if (me.ke === foeEl) return 1.3;                  // 我克敌
    const fo = D.ELEMENTS[foeEl];
    if (fo && fo.ke === myEl) return 0.85;            // 敌克我
    return 1;
  }

  function qualityDef(id) {
    return D.QUALITY.find(function (q) { return q.id === id; }) || D.QUALITY.find(function (q) { return q.id === 'zhong'; });
  }

  function costLine(c) {
    if (!c) return '';
    const p = [];
    if (c.xun) p.push('占 ' + c.xun + ' 旬');
    else if (c.xun === 0) p.push('不占旬');
    if (c.stones) p.push(c.stones + ' 石');
    if (c.contrib) p.push(c.contrib + ' 贡献');
    if (c.xianghuo) p.push(c.xianghuo + ' 香火');
    if (c.herb) p.push(c.herb);
    return p.join(' · ');
  }

  function mainlineFor(p) {
    const m = {
      ascend: '自创功法、参悟天机，寻飞升之路——但要先补回断掉的那四境。',
      long: '你要护住的人尚在，可百年千年，总有人先走。',
      revenge: '血亲旧怨未雪。仇家已在青岳附近露过面。',
      guard: '某位挚友身负隐疾，寿元将尽，你在寻药。',
      rule: '从外门弟子爬到一宗之主，第一步先要筑基。',
      free: '无根无绊——机缘自会找上门，也可能找上门的是刀。'
    };
    return m[p] || m.free;
  }

  function placeVerse(id) {
    const v = (D.VERSES && D.VERSES.places) || {};
    return v[id] || '';
  }

  function tribDetail(id) {
    return D.TRIBULATION.filter(function (x) { return x.id === id; })[0] || D.TRIBULATION[0];
  }

  function discipleStageOf(d) {
    let st = D.DISCIPLE_STAGE[0];
    D.DISCIPLE_STAGE.forEach(function (x) { if (numOr(d.days, 0) >= x.need) st = x; });
    return st;
  }

  function insightAt(statKey, minV) {
    const row = D.INSIGHT_LINES.find(function (x) { return x.stat === statKey && x.min === minV; });
    return row ? row.text : '';
  }

  function unlockRow(line, stage) {
    const t = unlockTable(line);
    for (const r of t) if (r.stage === stage) return r;
    return null;
  }

  function unlockTable(line) { return line === 'shen' ? D.UNLOCK_SHEN : D.UNLOCK_XIAN; }
  function unlockRow(line, stage) {
    const t = unlockTable(line);
    for (const r of t) if (r.stage === stage) return r;
    return null;
  }

  function rankBaseXian() {
    const out = [0];
    const rs = D.XIAN_REALMS || [];
    for (let i = 0; i < rs.length; i++) {
      out.push(out[i] + Math.max(1, (rs[i].stages || []).length || 1));
    }
    return out;
  }

  function daotongClassOf(name) {
    const k = D.DAOTONG_CLASS || {};
    for (const key in D.DAOTONG) {
      if ((D.DAOTONG[key] || []).indexOf(name) >= 0) return k[key] || '';
    }
    return '';
  }

  function shenTongKindMarked(name) {
    const m = /（([命术身目]+)）/.exec(name || '');
    return m ? m[1] : '';
  }

  function stShort(n) { return String(n || '').replace(/（[^）]*）/g, ''); }
  function shenTongKindMarked(name) {
    const m = /（([命术身目]+)）/.exec(name || '');
    return m ? m[1] : '';
  }

  function artName(id) {
    const a = D.CRAFT_ARTS.find(function (x) { return x.id === id; });
    return a ? a.name : id;
  }

  function outNameOf(recipe) {
    const t = D.TALISMANS.find(function (x) { return x.id === recipe.out; });
    if (t) return t.name;
    const p = D.PILL_EXT.find(function (x) { return x.id === recipe.out; });
    if (p) return p.name;
    const a = D.ARTIFACT_EXT.find(function (x) { return x.id === recipe.out; });
    if (a) return a.name;
    const dk = D.ARRAY_DISKS.find(function (x) { return x.id === recipe.out; });
    if (dk) return dk.name;
    return recipe.name;
  }

  function matUsedBy(id) {
    return D.RECIPES.filter(function (r) { return (r.mats || {})[id]; })
      .map(function (r) { return outNameOf(r); });
  }

  function hookDef(id) {
    return (D.HOOKS || []).find(function (h) { return h.id === id; }) || null;
  }

  function tallyInit() {
    return {
      craft: 0, qZhong: 0, qShang: 0, qJi: 0,
      warFight: 0, warWin: 0, warOver: 0, warOne: 0, warHold: 0,
      kingKill: 0, seizeWin: 0, takeXianji: 0, killMaster: 0, godKill: 0, overNoPill: 0,
      escapeDesperate: 0, reverseWin: 0, oldGrudge: 0,
      sell: 0, sellMax: 0, bestMonthNet: 0, auctionWin: 0, blackSell: 0,
      enc: 0, encIds: {}, gate: 0, places: { qingyue: 1 }, relic: 0,
      talk: {},
      kill: 0,
      deaths: 0, deathBySame: 0, deathCrush: 0, deathSit: 0, deathDaohua: 0,
      deathLonely: 0, deathEmpty: 0,
      stones0: 0, templeBroken: 0, pillStreak: 0, pillUsed: 0, heartBreak: 0,
      zifuFail: 0, killMortals: 0, bloodRite: 0, quanbingLost: 0,
      collapseSurvive: 0, edgeBreak: 0, buyAtZero: 0, badDisciple: 0,
      saveAndKill: 0, dongtianMonth: 0, nameBorrow: 0,
      npcFuneral: 0, npcFuneralSameRealm: 0, enemyToFriend: 0,
      foundedSect: 0, leftSect: 0, gfChanged: 0, cheated: 0, aloneCert: 0
    };
  }

  function placeBaseLingqi(id) {
    const pl = (typeof PLACES !== 'undefined' ? PLACES : []).find(function (p) { return p.id === id; });
    return pl ? pl.lingqi : 1;
  }

  function goalRewardText(g) {
    const r = g.reward || {}, p = [];
    if (r.stones) p.push('灵石 +' + fmtNum(r.stones));
    if (r.xianghuo) p.push('香火 +' + fmtNum(r.xianghuo));
    if (r.pill) {
      const it = D.PILL_EXT.find(function (x) { return x.id === r.pill; });
      if (it) p.push(it.name + ' ×1');
    }
    return p.join(' · ') || '无';
  }


  /* ---------- 导出：只暴露这一个对象 ---------- */
  RULES.clamp = clamp;
  RULES.numOr = numOr;
  RULES.mulberry32 = mulberry32;
  RULES.hashStr = hashStr;
  RULES.fmtNum = fmtNum;
  RULES.fmtTime = fmtTime;
  RULES.pad2 = pad2;
  RULES.stampName = stampName;
  RULES.realmNameOf = realmNameOf;
  RULES.buildMeta = buildMeta;
  RULES.SAVE_VER = SAVE_VER;
  RULES.envelope = envelope;
  RULES.checkSaveVersion = checkSaveVersion;
  RULES.keMul = keMul;
  RULES.qualityDef = qualityDef;
  RULES.costLine = costLine;
  RULES.mainlineFor = mainlineFor;
  RULES.placeVerse = placeVerse;
  RULES.tribDetail = tribDetail;
  RULES.discipleStageOf = discipleStageOf;
  RULES.insightAt = insightAt;
  RULES.unlockRow = unlockRow;
  RULES.unlockTable = unlockTable;
  RULES.rankBaseXian = rankBaseXian;
  RULES.daotongClassOf = daotongClassOf;
  RULES.shenTongKindMarked = shenTongKindMarked;
  RULES.stShort = stShort;
  RULES.artName = artName;
  RULES.outNameOf = outNameOf;
  RULES.matUsedBy = matUsedBy;
  RULES.hookDef = hookDef;
  RULES.tallyInit = tallyInit;
  RULES.placeBaseLingqi = placeBaseLingqi;
  RULES.goalRewardText = goalRewardText;

  G.WXCS3_RULES = RULES;
})(window);
