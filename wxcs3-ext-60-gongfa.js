/* 问道长生 · 功法个体差异（v10.1 第二梯队·问题2）
   ============================================================
   旧状：45 本功法在代码里只剩 id/name/tier/el/eff 五个字段，
         eff 是纯展示文本（"剑系威力 +40%"），43 本一句都没落地；
         施法分支 sub==='cast' 里 getGongfa() 只用于 note 字符串，
         花 75000 灵石买的《百炼成仙道法》与入门《聚气诀》伤害完全相同。
   本文件做三件事，全部走缝口，不改 game.js 的公式：
     ① EFFECT：把 GONGFA_EXT 的 eff 文案编译成结构化 effect 表（唯一真源），
        补上数据表里没写、但文案已经承诺的数值；缺省不给字段＝无特殊。
     ② castPower：施法伤害的功法乘区。读 tier/el/effect，让「换功法」在
        最常用的输出手段上立刻有手感；附带修好 resonResult 的 el/kind
        命名空间错位（sword 招式对不上 metal 功法，同源共鸣永不触发）。
     ③ lifeBonus / castCost 等常驻修正由 game.js 通过钩子读取。
   ------------------------------------------------------------
   数值口径（全部来自 data.js 原文文案，不新编）：
     玄元剑经 剑系威力 +40%  → sword:1.40
     天河剑诀 伤害 +50%      → all:1.50（原文"剑势如天河倒泻，伤害 +50%"）
     烈火掌   火系小威力法术 → fire:1.25
     流火剑诀 火系剑法，可灼烧 → sword:1.15 + 灼烧
     冰魄诀   冰系，减速      → ice:1.20 + 迟滞
     震雷诀   雷系起手，破防  → thunder:1.20 + 破防
     紫霄雷法 雷系大威力，需雷灵根 → thunder:1.45 + 灵根门槛
     龟息延年诀 寿元 +10      → life:+10
     补天真经  寿元上限 +80   → life:+80
     梅花易    机缘 +6        → fate:+6
     金光咒    减伤一成       → ward:0.10
     御风术    遁速 +5%       → escape:+0.05
     凌波仙经  身法：遁速 +12% → escape:+0.12
     天遁剑诀  遁走成功率 +15  → escape:+0.15
     吞海功    气海容量 +15%   → mpCap:0.15
     续脉决    疗伤效率 +30%   → heal:0.30（已有实现，收归此处统一）
     长春功    气血回复        → heal:0.25（已有实现，收归此处统一）
     九变化龙诀 攻守俱佳       → all:1.10 + ward:0.08
     太虚剑典  剑系大成       → sword:1.30
     月阙剑典  剑出无影       → sword:1.20
     玄水剑诀  水凝为剑       → sword:1.10 + water:1.10
     玄光赶山经 御土如驱畜     → earth:1.20
     剑君谈玄执金秘章 执金执剑 → sword:1.25 + metal:1.15
     香火成神法 以香火铸神     → xianghuo:1.15
     乾天一元统摄诸天神法 位格压制+1档 → gapUp:1
     万灵归墟道经 可借众物之气 → all:1.08
     太阴蜕形尸解真法 死生不再受形所囿 → lifeStop:1
     百炼成仙道法 百炼凡骨     → all:1.12
     鸿蒙紫气诀 万法归宗       → all:1.35
   其余功法（聚气诀/敛气诀/蹈海诀/碧海功/朝霞采露诀/月湖映秋诀/江河一气诀/
   紫雷秘元功/金殿煌元诀/明华煌元经/太虚斗转诀/太阴吐纳养轮经/白首叩庭经/
   造化丹经/天语焜烨龙章/九寰天书）文案本身没写具体数值，按 "no field = 无特殊"
   处理，只在 tier 层拿基础乘区——这也符合原文，不再编造。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var D = null;
  function D_() { return D || (D = G.WXCS3_DATA); }
  function cur() { return G.WXCS3 ? G.WXCS3.S : null; }
  function u() { return G.WXCS3; }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ============================================================
     ① 结构化 effect 表：功法 id → 结算字段
     ------------------------------------------------------------
     dims   : 按招式五行/类别的伤害乘区（fire/ice/thunder/sword/...）
     all    : 无条件伤害乘区
     ward   : 我方减伤（累加，上限 0.5）
     escape : 遁走成功率加成
     life   : 寿元上限加成（年）
     fate   : 机缘加成
     mpCap  : 灵力上限倍率加成
     heal   : 疗伤效率加成
     xianghuo: 香火产出加成
     gapUp  : 位格压制抵消档数
     lifeStop: 寿元无上限（尸解）
     needEl : 需要该灵根（rootEls 或主修五行）才能生效
     burn/slow/pierce : 附带状态
     ============================================================ */
  var EFFECT = {
    /* —— 仙道主修 —— */
    juqi:     { note: '入门内功，无特殊' },
    liehuo:   { dims: { fire: 1.25 }, burn: 0.5 },
    yufeng:   { escape: 0.05 },
    lianqi:   { note: '收敛气机，不易被窥探' },
    daoahai:  { dims: { water: 1.08 }, escape: 0.04 },
    guixi:    { life: 10 },
    jinguang: { ward: 0.10 },

    changchun: { heal: 0.25 },
    liuhuo:    { dims: { sword: 1.15, fire: 1.10 }, burn: 0.5 },
    bingpo:    { dims: { ice: 1.20 }, slow: 1 },
    tunhai:    { mpCap: 0.15 },
    bihai:     { dims: { water: 1.12 } },
    zhenlei:   { dims: { thunder: 1.20 }, pierce: 0.15 },
    lingbo:    { escape: 0.12 },
    meihua:    { fate: 6 },
    xumai:     { heal: 0.30 },

    zixiao:    { dims: { thunder: 1.45 }, needEl: 'thunder' },
    xuanyuan:  { dims: { sword: 1.40 } },
    tianhe:    { all: 1.50, dims: { sword: 1.10 } },
    tianli:    { escape: 0.15, dims: { sword: 1.10 } },
    jiuhuan:   { all: 1.05 },
    jujing:    { all: 1.10, ward: 0.08 },
    jixing:    { dims: { sword: 1.25, metal: 1.15 } },
    wuling:    { all: 1.08 },

    taixu:     { dims: { sword: 1.30 } },
    zaohua:    { note: '炼丹大宗师之路', craft: 0.25 },
    butian:    { life: 80 },
    xuanrong:  { gapUp: 1 },
    xianghuo:  { xianghuo: 0.15 },
    /* v10.4 P0·3.4：旧写 dims:{all:1.06}，把顶层字段塞进了五行键位，
       dims['all'] 永远查不到 —— 天语焜烨龙章的威压从未生效。 */
    datie:     { all: 1.06, pressure: 1 },

    jianghe:   { dims: { water: 1.10 } },
    zilei:     { dims: { thunder: 1.15 }, breakGuard: 1 },
    jindian:   { ward: 0.12 },
    minghua:   { ward: 0.06, all: 1.05 },
    yingyue:   { dims: { sword: 1.20 } },
    xuanShui:  { dims: { sword: 1.10, water: 1.10 } },
    chaoXia:   { dims: { wood: 1.08 } },
    yueHu:     { heal: 0.10 },
    taixuDou:  { escape: 0.10 },
    taiyinTuna:{ life: 60 },
    baishou:   { ward: 0.05 },
    xuanguang: { dims: { earth: 1.20 } },

    hongmeng:  { all: 1.35 },
    taiyin:    { lifeStop: 1 },
    bailian:   { all: 1.12 }
  };

  /* 招式 kind → 五行 el 的补表。
     修 resonResult 的命名空间错位：data.js:502 起招式用 kind:'sword'，
     而功法 el 用 'metal'，全 SKILLS 没有 kind:'metal'，于是
     「剑系功法 × 剑系招式」永远触发不了 ×1.20 同源共鸣。 */
  var KIND_TO_EL = {
    sword: 'metal', blade: 'metal', fist: 'earth', palm: 'fire',
    wood: 'wood', water: 'water', fire: 'fire', earth: 'earth',
    thunder: 'thunder', ice: 'ice', wind: 'wind',
    blood: null, poison: null, control: null, normal: null
  };
  function kindAsEl(kind) { return KIND_TO_EL[kind] || null; }

  function effectOf(id) { return EFFECT[id] || null; }
  function curGongfa() {
    var S = cur();
    if (!S) return null;
    var list = D_().GONGFA_EXT || [];
    var id = (S.gongfa && S.gongfa[0]) || 'juqi';
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;
  }

  /* 灵根是否满足功法的 needEl 门槛。
     旧版紫霄雷法文案写「需雷灵根」，代码零 gating，任意灵根都能用。 */
  function elOk(S, needEl) {
    if (!needEl) return true;
    var els = (S.rootEls || []);
    for (var i = 0; i < els.length; i++) if (els[i] === needEl) return true;
    return false;
  }

  /* 元素名：ELEMENTS 只有五行，雷/风/冰/阴/阳在 MUT_ELEMENTS 里 */
  function elName(k) {
    var E = D_().ELEMENTS || {}, M = D_().MUT_ELEMENTS || {};
    if (E[k]) return E[k].name;
    if (M[k]) return M[k].name;
    return k === 'sword' ? '剑系' : k;
  }

  /* 招式五行：优先取招式自身 el，没有就把 kind 映射成 el。
     施法（sub==='cast'）没有招式对象，此时「打出去的是什么五行」
     应该由功法自己决定——否则 dims 永远拿不到 sel，专属五行加成永不生效。 */
  function skillElOf(sk) {
    if (sk) {
      if (sk.el) return sk.el;
      return kindAsEl(sk.kind);
    }
    var g = curGongfa();
    return g && g.el ? g.el : null;
  }

  /* v10.4 P0·3.4：dims 键位归一。
     ------------------------------------------------------------
     数据表里 dims 混用两套键：五行（metal/fire/water…）与招式类别（sword）。
     而 skillElOf 解析出的是五行（sword → metal），
     于是 { sword: 1.40 } 这类条目永远命中不了——
     玄元剑经/太虚剑典/月阙剑典/天河剑诀/天遁剑诀的剑系加成全部空转，
     花 2600 灵石买的地阶剑经与入门《聚气诀》伤害相同。
     修法：编译期给类别键补一份五行别名，只补「原本没有」的键，
     不覆盖数据里已分别写明的两条（如执金秘章 sword 1.25 与 metal 1.15 各自保留）。 */
  function aliasDims(ef) {
    if (!ef || !ef.dims) return ef;
    var out = {}, k;
    for (k in ef.dims) if (ef.dims.hasOwnProperty(k)) out[k] = ef.dims[k];
    for (k in ef.dims) {
      if (!ef.dims.hasOwnProperty(k)) continue;
      var e = kindAsEl(k);
      if (e && out[e] === undefined) out[e] = ef.dims[k];
    }
    ef.dims = out;
    return ef;
  }
  (function () {
    for (var id in EFFECT) if (EFFECT.hasOwnProperty(id)) aliasDims(EFFECT[id]);
  })();

  /* ============================================================
     ② 施法乘区：sub==='cast' 的功法伤害
     ------------------------------------------------------------
     手感设计：施法 = 「按当前主修功法的路子打出去」。
       · tier 给底子（黄 1.0 / 玄 1.3 / 地 1.7 / 天 2.2 / 仙 3.0 的差距太陡，
         压成 1.0/1.10/1.22/1.36/1.55，避免一本天阶功法顶掉整个战斗系统）
       · 功法五行与招式五行同源/相生再乘一道
       · effect.all / effect.dims 只在该法有承诺时才有
     返回值同时给出可读的来源串，供战斗日志拆解。 */
  var TIER_CAST = { huang: 1.00, xuan: 1.10, di: 1.22, tian: 1.36, xian: 1.55 };

  function castMul(sk) {
    var S = cur();
    if (!S) return { mul: 1, parts: [] };
    var g = curGongfa();
    if (!g) return { mul: 1, parts: [] };
    var ef = effectOf(g.id) || {};
    var parts = [];
    var mul = 1;

    var tm = TIER_CAST[g.tier] || 1;
    if (tm !== 1) { mul *= tm; parts.push(tierName(g.tier) + ' ×' + tm.toFixed(2)); }

    /* 灵根门槛：不满足则功法特殊部分不生效（不是完全不能用） */
    var gateOk = elOk(S, ef.needEl);

    if (gateOk) {
      if (ef.all) { mul *= ef.all; parts.push('功法 ×' + ef.all.toFixed(2)); }
      var sel = skillElOf(sk);
      if (sel && ef.dims) {
        var dm = ef.dims[sel];
        if (dm) { mul *= dm; parts.push('同属 ×' + dm.toFixed(2)); }
      }
      /* 功法 el 与招式五行同源：借 resonResult 的同一套相生关系，
         但只在这里补「功法 vs 招式」，不改 resonResult 的原语义。
         v10.4 P0·3.4：旧条件 `g.el === sel` 在施法（sk=null）时恒真——
         skillElOf(null) 返回的正是 g.el，于是每次施法无条件 ×1.10。
         同源判定只该在「招式自己有五行」时成立。 */
      if (g.el && sel && sk) {
        if (g.el === sel) { mul *= 1.10; parts.push('功法同源 ×1.10'); }
        else if (D_().SHENG[g.el] === sel) { mul *= 1.05; parts.push('功法相生 ×1.05'); }
      }
    } else {
      parts.push('灵根不合（需' + elName(ef.needEl) + '）未生效');
    }

    return { mul: mul, parts: parts, gateOk: gateOk, gongfa: g, effect: ef };
  }

  function tierName(t) {
    var tt = D_().GONGFA_TIERS[t];
    return tt ? tt.name : '';
  }

  /* 供 game.js 的 renderCombat / 战斗日志取来源链 */
  EXT.gongfaCastInfo = function (sk) {
    var r = castMul(sk);
    return {
      mul: r.mul,
      text: r.parts.join('、'),
      gateOk: r.gateOk,
      name: r.gongfa ? r.gongfa.name : '',
      desc: r.gongfa ? r.gongfa.name + '（' + tierName(r.gongfa.tier) + '）' + (r.parts.length ? '　' + r.parts.join('、') : '') : ''
    };
  };
  /* v10.4 P0·3.4：招式侧的功法乘区。
     ------------------------------------------------------------
     旧版只有「施法」（sub==='cast'）吃功法，「招式」（sub==='skill'）
     完全不吃——于是玄元剑经的「剑系威力 +40%」在玩家真正常用的
     招式上毫无作用，只在那记 30 灵力的普攻式施法里有感。
     这里给出同一套乘区的纯函数版：只算 effect（品阶 + 五行 + 专属），
     不重复乘 resonResult 的共鸣（招式侧已有那道）。 */
  EXT.gongfaSkillMul = function (sk) {
    var S = cur();
    if (!S) return { mul: 1, text: '' };
    var g = curGongfa();
    if (!g) return { mul: 1, text: '' };
    var ef = effectOf(g.id) || {};
    var gateOk = elOk(S, ef.needEl);
    if (!gateOk) return { mul: 1, text: '灵根不合未生效', gateOk: false };
    var mul = 1, parts = [];
    var tm = TIER_CAST[g.tier] || 1;
    /* 品阶只给一半权重：招式本身已有 mul 与共鸣，
       再叠满品阶会让「换一本天阶」直接盖掉招式之间的取舍。 */
    var th = 1 + (tm - 1) * 0.5;
    if (th !== 1) { mul *= th; parts.push(tierName(g.tier) + ' ×' + th.toFixed(2)); }
    if (ef.all) { mul *= ef.all; parts.push('功法 ×' + ef.all.toFixed(2)); }
    var sel = skillElOf(sk);
    if (sel && ef.dims) {
      var dm = ef.dims[sel];
      if (dm) { mul *= dm; parts.push('同属 ×' + dm.toFixed(2)); }
    }
    return { mul: mul, text: parts.join('、'), gateOk: true, name: g.name };
  };

  /* 内部探针：测试直接验数值，不靠 HTML 猜 */
  EXT.castMulProbe = function (skillName, gongfaId, rootEls) {
    var S = cur();
    var old = S ? { gf: S.gongfa, re: S.rootEls } : null;
    if (S && gongfaId) S.gongfa = [gongfaId];
    if (S && rootEls) S.rootEls = rootEls;
    var sk = null;
    var list = D_().SKILLS || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === skillName) sk = list[i];
    var found = !!sk || !skillName;   // 传了名字却查不到 = 调用方写错了
    var r = castMul(sk);
    if (S && old) { S.gongfa = old.gf; S.rootEls = old.re; }
    return { mul: r.mul, parts: r.parts, gateOk: r.gateOk, skillFound: found };
  };

  /* ============================================================
     ③ 常驻修正：由 game.js 通过钩子读取
     ============================================================ */
  /* 寿元上限：只算当前主修功法的 life，外加同门功法不叠加（避免背一背包就长生） */
  EXT.gongfaLifeBonus = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.life, 0);
  };
  EXT.gongfaLifeStop = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return !!ef.lifeStop;
  };
  /* 减伤：金光咒/金殿煌元诀/九变化龙诀/白首叩庭经 */
  EXT.gongfaWard = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return clamp(numOr(ef.ward, 0), 0, 0.5);
  };
  /* 遁走加成 */
  EXT.gongfaEscape = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.escape, 0);
  };
  /* 灵力上限倍率 */
  EXT.gongfaMpCap = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.mpCap, 0);
  };
  /* 疗伤效率：长春功/续脉决/月湖映秋诀，收归一处 */
  EXT.gongfaHeal = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.heal, 0);
  };
  /* 机缘加成 */
  EXT.gongfaFate = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.fate, 0);
  };
  /* 香火加成 */
  EXT.gongfaXianghuo = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.xianghuo, 0);
  };
  /* 位格压制抵消档数（乾天一元统摄诸天神法） */
  EXT.gongfaGapUp = function () {
    var g = curGongfa();
    var ef = g ? (effectOf(g.id) || {}) : {};
    return numOr(ef.gapUp, 0);
  };

  /* 招式附带的持续状态：灼烧/迟滞/破防
     返回 { burn, slow, pierce }，由 game.js 在命中时写入战斗态 */
  EXT.gongfaSpellStatus = function (sk) {
    var g = curGongfa();
    if (!g) return null;
    var ef = effectOf(g.id) || {};
    var sel = skillElOf(sk);
    var out = {};
    if (ef.burn && (sel === 'fire')) out.burn = ef.burn;
    if (ef.slow && (sel === 'ice')) out.slow = ef.slow;
    if (ef.pierce && (sel === 'thunder')) out.pierce = ef.pierce;
    for (var k in out) { if (out.hasOwnProperty(k)) return out; }
    return null;
  };

  /* ============================================================
     ④ 展示层：功法详情面板补「实际结算」一栏
     ------------------------------------------------------------
     文案与账要对得上：把 effect 翻译成人话显示，玩家能核对
     「这本功法到底给了我什么」。 */
  function effectText(id) {
    var ef = EFFECT[id];
    if (!ef) return '';
    var out = [];
    if (ef.all) out.push('伤害 ×' + ef.all.toFixed(2));
    if (ef.dims) {
      for (var k in ef.dims) {
        if (!ef.dims.hasOwnProperty(k)) continue;
        out.push(elName(k) + ' ×' + ef.dims[k].toFixed(2));
      }
    }
    if (ef.ward) out.push('减伤 ' + Math.round(ef.ward * 100) + '%');
    if (ef.escape) out.push('遁走 +' + Math.round(ef.escape * 100) + '%');
    if (ef.life) out.push('寿元上限 +' + ef.life);
    if (ef.lifeStop) out.push('寿元无上限');
    if (ef.heal) out.push('疗伤 +' + Math.round(ef.heal * 100) + '%');
    if (ef.fate) out.push('机缘 +' + ef.fate);
    if (ef.mpCap) out.push('灵力上限 +' + Math.round(ef.mpCap * 100) + '%');
    if (ef.xianghuo) out.push('香火 +' + Math.round(ef.xianghuo * 100) + '%');
    if (ef.gapUp) out.push('位格压制抵消 ' + ef.gapUp + ' 档');
    if (ef.craft) out.push('炼丹 +' + Math.round(ef.craft * 100) + '%');
    if (ef.needEl) out.push('需' + elName(ef.needEl) + '灵根');
    return out.join('、');
  }
  EXT.gongfaEffectText = effectText;

  /* 探针：给测试与构筑面板用 */
  EXT.gongfaInfo = function (id) {
    var g = null, list = D_().GONGFA_EXT || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) g = list[i];
    if (!g) return null;
    var ef = EFFECT[id] || {};
    return {
      id: id, name: g.name, tier: g.tier, el: g.el,
      eff: g.eff, effect: ef, hasEffect: !!(ef.dims || ef.all || ef.ward || ef.escape ||
        ef.life || ef.lifeStop || ef.heal || ef.fate || ef.mpCap || ef.xianghuo || ef.gapUp || ef.craft || ef.needEl),
      text: effectText(id)
    };
  };
  /* 全表体检：清单里每本功法都能查到，且文案承诺与 effect 不打架时导出结果 */
  EXT.gongfaAudit = function () {
    var list = D_().GONGFA_EXT || [];
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      var ef = EFFECT[g.id] || {};
      rows.push({
        id: g.id, name: g.name, tier: g.tier,
        eff: g.eff,
        hasEffect: !!(ef.dims || ef.all || ef.ward || ef.escape || ef.life ||
          ef.lifeStop || ef.heal || ef.fate || ef.mpCap || ef.xianghuo || ef.gapUp || ef.craft || ef.needEl),
        text: effectText(g.id)
      });
    }
    return rows;
  };

  /* ============================================================
     ⑤ 坞入口：功法详情面板（展示不新增状态）
     ------------------------------------------------------------
     本来功法面板已经存在，这里只把「实际结算」补到它的详情里。
     走 dockItems 追加一条会让坞变长，所以不改坞，改为给
     game.js 的功法列表提供一段可插入的 HTML。 */
  EXT.gongfaDetailHtml = function (id) {
    var info = EXT.gongfaInfo(id);
    if (!info) return '';
    var et = effectText(id);
    if (!et) {
      return '<div class="hint">这本功法只有品阶与五行，没有额外承诺。</div>';
    }
    return '<div class="hint"><b>实际结算</b>：' + et + '</div>';
  };
})(window);
