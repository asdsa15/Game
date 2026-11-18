/* 问道长生 · 灵根差异（v10.1 第二梯队·问题1）
   ============================================================
   旧状：五种灵根的 load 与 mul 逐行完全相同（复制字段），els 是死字段；
         真正的差别只有「月修为倍率」一处（1.0~2.0 连续值），
         战斗里灵根完全缺席：computePower() 不读 root，
         do_cbt 唯一的灵根贡献是 keMul(mainEl(), foe.el)，
         而 mainEl() = rootEls[0]——创角让你选 2~4 个五行，游戏只认第一个。
         香火上限 load>=1.5?2.5:2 把五种灵根压成两档。
   本文件做三件事：
     ① 资质战斗出口 rootPow()：天/地/真/伪/变异在打架时不再一模一样。
     ② 多系真多系 subEls()：rootEls[1..n] 成为副属性，参与五行克制取最优，
        并让「系越多越宽、专精度越低」成为真实取舍。
     ③ 香火上限分档 xianghuoCapMul()：把塌陷的 2 档还原成 5 档。
   全部走缝口读取，game.js 只加钩子调用。 */

(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var D = null;
  function D_() { return D || (D = G.WXCS3_DATA); }
  function cur() { return G.WXCS3 ? G.WXCS3.S : null; }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ============================================================
     ① 资质等级表
     ------------------------------------------------------------
     原文（data.js:207-213）只给了 load/mul/els/desc 四个字段，
     没有任何战斗语义。这里把「desc 里已经说出口的东西」翻译成可结算字段：
       天灵根 单系，万中无一   → 战力最高，副系为 0
       地灵根 双系，主次分明   → 战力次高，副系 1
       真灵根 三系，均衡       → 战力居中，副系 2
       伪灵根 四/五系，杂而不精 → 战力最低，副系 3，但覆盖面最广
       变异灵根 雷/风/冰/阴/阳 → 单系异种，克制面特殊，战力与地灵根同档
     rootPow 是「质」的系数，concentration 是「精」的系数：
     系多则宽（副系多）、专精低（主系伤害略降）；系少则精、但克制面窄。
     两者之积约等于 1，差别体现在「打不同五行的敌人」时的表现。 */
  var ROOT_POW = {
    heaven: { pow: 1.12, concentration: 1.10, subN: 0, name: '天灵根' },
    earth:  { pow: 1.06, concentration: 1.05, subN: 1, name: '地灵根' },
    true_:  { pow: 1.02, concentration: 1.00, subN: 2, name: '真灵根' },
    pseudo: { pow: 0.96, concentration: 0.92, subN: 3, name: '伪灵根' },
    mutate: { pow: 1.06, concentration: 1.08, subN: 0, name: '变异灵根' }
  };

  function rootDef() {
    var S = cur();
    if (!S || !S.root) return null;
    return ROOT_POW[S.root] || null;
  }

  /* 战力出口：computePower() 的灵根乘区。
     旧版战斗里灵根完全缺席，只有打坐时才有感觉。 */
  EXT.rootPowerMul = function () {
    var d = rootDef();
    if (!d) return 1;
    var S = cur();
    var m = d.pow * d.concentration;
    /* 系别齐全度：选满 needEls 才有完整加成，少选要打折
       （创角已经强制选够，这条是给旧档与异常态兜底） */
    var need = needEls(S.root);
    var got = (S.rootEls || []).length;
    if (need > 0 && got < need) m *= (0.94 + 0.06 * (got / need));
    return m;
  };

  function needEls(k) {
    var r = D_().ROOTS[k];
    if (r && typeof r.els === 'number') return r.els;   // 读数据表，不再硬编码
    return 1;
  }

  /* 专精度：主系伤害的额外系数（系少更精） */
  EXT.rootConcentration = function () {
    var d = rootDef();
    return d ? d.concentration : 1;
  };

  /* ============================================================
     ② 多系：副属性参与克制
     ------------------------------------------------------------
     mainEl() 仍是 rootEls[0]（不破坏既有语义：道统/神通池都按主系走），
     但战斗克制改为「在所有已选五行里取最优克制」，
     并用专精度折价——这样「四系伪灵根」从纯装饰变成一种 build：
     打什么都有点克制面，但每一系都不够狠。
     ============================================================ */
  var KE_MUL = function (a, b) {
    /* 复用 rules.js 的 keMul，保证与既有克制表完全一致 */
    var R = G.WXCS3_RULES;
    return (R && R.keMul) ? R.keMul(a, b) : 1;
  };

  /* 返回 { mul, el, sub } —— 在 rootEls 里挑出对 foeEl 最有效的那个属性 */
  EXT.bestKe = function (foeEl) {
    var S = cur();
    if (!S || !foeEl || !(S.rootEls || []).length) return null;
    var best = null, bestMul = -1, bestEl = null;
    for (var i = 0; i < S.rootEls.length; i++) {
      var el = S.rootEls[i];
      var m = KE_MUL(el, foeEl);
      if (m > bestMul) { bestMul = m; bestEl = el; best = i; }
    }
    if (!bestEl) return null;
    var conc = 1;
    /* 非主系要按专精度折价：伪灵根副系只有 0.92 的力度 */
    if (best > 0) {
      var d = rootDef();
      conc = d ? clamp(d.concentration, 0.85, 1.0) : 1;
    }
    return { mul: 1 + (bestMul - 1) * conc, el: bestEl, sub: best > 0, raw: bestMul, conc: conc };
  };

  /* 主系（沿用原逻辑，供道统/神通池/未配副系时使用） */
  EXT.mainEl = function () {
    var S = cur();
    return (S && S.rootEls && S.rootEls[0]) || null;
  };

  /* 副系清单（rootEls[1..n]），供状态栏/构筑面板展示 */
  EXT.subEls = function () {
    var S = cur();
    if (!S || !(S.rootEls || []).length) return [];
    return S.rootEls.slice(1);
  };

  /* ============================================================
     ③ 香火上限分档
     ------------------------------------------------------------
     旧版：load>=1.5 ? 2.5 : 2 —— 天/地/变异挤一档，真/伪挤一档，
           五种灵根只有两种表现。
     新版：按资质给五档，天 > 变异 > 地 > 真 > 伪。
     变异给到接近天：它是「异种」，香火路更野，但战力克制面特殊。 */
  var XIANGHUO_CAP = {
    heaven: 2.60, mutate: 2.45, earth: 2.20, true_: 1.90, pseudo: 1.70
  };
  EXT.xianghuoCapMul = function () {
    var S = cur();
    if (!S || !S.root) return 2;
    return numOr(XIANGHUO_CAP[S.root], 2);
  };

  /* ============================================================
     ④ 展示与探针
     ============================================================ */
  EXT.rootInfo = function () {
    var S = cur();
    if (!S || !S.root) return null;
    var d = rootDef() || {};
    var r = D_().ROOTS[S.root] || {};
    return {
      id: S.root, name: r.name || d.name || S.root,
      desc: r.desc || '',
      load: r.load, mul: r.mul, els: r.els,
      pow: d.pow, concentration: d.concentration,
      powerMul: EXT.rootPowerMul(),
      xianghuoCap: EXT.xianghuoCapMul(),
      mainEl: EXT.mainEl(), subEls: EXT.subEls(),
      needEls: needEls(S.root)
    };
  };
  /* 状态栏用的短描述：让「多系」在界面上可见，而不是彩色装饰 */
  EXT.rootSummary = function () {
    var info = EXT.rootInfo();
    if (!info) return '';
    var E = D_().ELEMENTS || {};
    var nm = function (k) { return E[k] ? E[k].name : k; };
    var s = info.name + ' · ' + nm(info.mainEl || '');
    var subs = info.subEls || [];
    if (subs.length) {
      s += '（副 ' + subs.map(nm).join('/') + '）';
    }
    return s;
  };
  /* 探针：给定灵根与敌人五行，返回克制结果，测试直接用 */
  EXT.keProbe = function (rootKey, rootEls, foeEl) {
    var S = cur();
    var old = S ? { root: S.root, re: S.rootEls } : null;
    if (S) { S.root = rootKey; S.rootEls = rootEls.slice(); }
    var r = EXT.bestKe(foeEl);
    if (S && old) { S.root = old.root; S.rootEls = old.re; }
    return r;
  };
})(window);
