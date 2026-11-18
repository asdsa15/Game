/* 问道长生 · 盘活死表（v10.1 第三梯队·问题6）
   ============================================================
   方案盘点出的真实死表/死字段（本轮逐个处理）：

   | 字段 | 原状 | 本轮 |
   |---|---|---|
   | PIETY（4 档名） | 只在公式里当连续值乘，档位名从未显示 | 状态栏/破柱面板显示档位名；破柱门槛用档位 |
   | QIHE（benming/guest/clash） | 零引用，game.js:284 硬编码 1.2/0.8 | qiheC() 改读 QIHE，并启用 clash 0.6 |
   | FAXIANG.zodiac | 只在创角展示生肖字 | 法相与主修五行的相性，接进显圣 |
   | insightXp（阅历） | 6 处产出、零消费 | 破境悟性门槛 + 面板可见「悟道点」 |
   | ZODIAC_CLASH | —— | 经查已在 NPC 系统消费，非死表，不动 |

   原则同前：盘活＝把它接进已有结算，不新建资源、不发明新系统。 */

(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var D = null;
  function D_() { return D || (D = G.WXCS3_DATA); }
  function cur() { return G.WXCS3 ? G.WXCS3.S : null; }
  function u() { return G.WXCS3; }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function isShen() { var S = cur(); return S && S.cultivation === 'shen'; }

  /* ============================================================
     ① PIETY：从「连续数值」变成「有名字的档位」
     ------------------------------------------------------------
     原状：D.PIETY 是 [{v:0.5,name:'半信半疑'},...] 四档，
           但代码里只有 S.piety 一个 0.5~2.0 的浮点数在算，
           四档名字一次都没显示过——玩家只看到一个「虔诚 1.3」。
     ============================================================ */
  EXT.pietyTier = function () {
    var S = cur();
    var p = numOr(S && S.piety, 1);
    var t = D_().PIETY || [];
    var idx = 0;
    for (var i = 0; i < t.length; i++) if (p >= t[i].v) idx = i;
    var row = t[idx] || { v: 1, name: '常来上香' };
    var next = t[idx + 1] || null;
    return {
      idx: idx, name: row.name, v: row.v,
      nextName: next ? next.name : null,
      nextAt: next ? next.v : null,
      gap: next ? Math.max(0, Math.round((next.v - p) * 100) / 100) : 0
    };
  };
  /* 状态栏短文案：「日日供奉 1.6」不再只是一个数字 */
  EXT.pietyLabel = function () {
    var t = EXT.pietyTier();
    var S = cur();
    return t.name + ' ' + numOr(S && S.piety, 1).toFixed(1);
  };

  /* ============================================================
     ② QIHE：读表，并启用 clash
     ------------------------------------------------------------
     原状：qiheC = isShen() ? 1.2 : 0.8 —— 两个魔法数，
           QIHE.benming.v=1.2 / guest.v=0.8 一模一样，但代码没读它，
           而 QIHE.clash.v=0.6 从未被任何地方用过。
     本命法相（当前 S.faxiang）与所主之柱相合 → benming；
     相冲（ZODIAC_CLASH）→ clash；其余 → guest。
     ============================================================ */
  function faxiangOf() {
    var S = cur();
    var fx = (S && S.faxiang) || 'g1';
    var list = D_().FAXIANG || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === fx) return list[i];
    return list[0] || null;
  }
  function curZhenjun() {
    var S = cur();
    var fx = (S && S.faxiang) || 'g1';
    var list = D_().ZHENJUN || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === fx) return list[i];
    return list[0] || null;
  }

  /* 三态的判定口径。
     ------------------------------------------------------------
     一开始想按「本柱真君生肖 vs 法相生肖」判相冲——查表后发现
     D.ZHENJUN 与 D.FAXIANG 是同一套（id 都 g1~g12、生肖一一对应），
     本柱真君恒等于自己的法相，clash 永远不会触发。那是写了个死分支。
     真正的语义来源在「破柱三法」（openPillarBreak）：
       自建 = 自己立起来的庙，香火直通本命      → benming
       借祀 = 依附宗门/朝廷的客庙               → guest
       夺祀 = 砸来的庙，气机本就相冲、业力缠身   → clash
     这样三态各有出处，且与神道主线强相关。 */
  function breakMode() {
    var S = cur();
    return (S && S.lastBreakMode) || 'self';
  }

  EXT.qiheKind = function () {
    var Q = D_().QIHE || {};
    var m = breakMode();
    if (m === 'seize') {
      return { key: 'clash', mul: numOr((Q.clash || {}).v, 0.6), name: (Q.clash || {}).name || '相冲法相' };
    }
    if (m === 'borrow') {
      return { key: 'guest', mul: numOr((Q.guest || {}).v, 0.8), name: (Q.guest || {}).name || '客庙' };
    }
    return { key: 'benming', mul: numOr((Q.benming || {}).v, 1.2), name: (Q.benming || {}).name || '本命法相线' };
  };
  /* 三态说明，供面板解释「为什么是这个系数」 */
  EXT.qiheNote = function () {
    var k = EXT.qiheKind();
    if (k.key === 'clash') return '庙是夺来的，气机相冲，香火只得六成。';
    if (k.key === 'guest') return '客庙依附他人，香火要分出去两成。';
    return '庙是自己立的，香火直通本命。';
  };

  /* 供 monthXianghuo 使用的系数；缺表时退回旧的两个数 */
  EXT.xianghuoQiheMul = function () {
    var k = EXT.qiheKind();
    return numOr(k.mul, isShen() ? 1.2 : 0.8);
  };

  /* ============================================================
     ③ 法相与五行的相性（FAXIANG.zodiac 的落点）
     ------------------------------------------------------------
     原状：FADXANG 12 法相的 zodiac 只在创角界面显示一个生肖字。
     这里让它与「主修五行」发生关系：按生肖对应的地支五行给显圣一点加成。
     地支五行：子亥水 / 寅卯木 / 巳午火 / 申酉金 / 辰戌丑未土。
     ============================================================ */
  var ZODIAC_ELEM = {
    '鼠': 'water', '猪': 'water', '牛': 'earth', '龙': 'earth',
    '羊': 'earth', '狗': 'earth', '虎': 'wood', '兔': 'wood',
    '蛇': 'fire', '马': 'fire', '猴': 'metal', '鸡': 'metal'
  };
  EXT.faxiangElem = function () {
    var fj = faxiangOf();
    return fj ? (ZODIAC_ELEM[fj.zodiac] || null) : null;
  };
  /* 显圣加成：法相五行 = 主修五行 → 1.10；相生 → 1.05；相克 → 0.95 */
  EXT.faxiangXianshengMul = function () {
    var S = cur();
    var fe = EXT.faxiangElem();
    var me = (S && S.rootEls && S.rootEls[0]) || null;
    if (!fe || !me) return 1;
    var SH = D_().SHENG || {};
    var E = D_().ELEMENTS || {};
    if (fe === me) return 1.10;
    if (SH[fe] === me || SH[me] === fe) return 1.05;
    if (E[me] && E[me].ke === fe) return 0.95;   // 我克它 → 略有妨害
    return 1;
  };
  EXT.faxiangLine = function () {
    var fj = faxiangOf(), S = cur();
    if (!fj) return '';
    var fe = EXT.faxiangElem();
    var E = D_().ELEMENTS || {};
    return '法相生肖「' + fj.zodiac + '」属' + (E[fe] ? E[fe].name : '？');
  };

  /* ============================================================
     ④ insightXp：从「只产不消」变成「悟道点」
     ------------------------------------------------------------
     原状：6 处产出（读书/奇遇/负薪问道…），全局零消费。
     落点（不新建资源，直接吃已有产出）：
       · 破境悟性门槛可折算：悟道点 20 点 = 悟性 +1（见 ext-80 的 insight 门槛）
       · 面板显示「悟道点」及其可折算的悟性
     ============================================================ */
  EXT.INSIGHT_PER_POINT = 20;      // 20 阅历折 1 点悟性
  EXT.insightXp = function () { var S = cur(); return numOr(S && S.insightXp, 0); };
  EXT.insightBonus = function () {
    return Math.floor(EXT.insightXp() / EXT.INSIGHT_PER_POINT);
  };
  /* 有效悟性 = 面板悟性 + 悟道点折算 */
  EXT.effectiveInsight = function () {
    var S = cur();
    var base = (S && S.stats && S.stats.insight) || 8;
    return base + EXT.insightBonus();
  };
  EXT.insightLabel = function () {
    var xp = EXT.insightXp(), b = EXT.insightBonus();
    if (!xp) return '0';
    return xp + (b > 0 ? '（折悟性 +' + b + '）' : '');
  };

  /* ============================================================
     ⑤ 面板片段
     ============================================================ */
  EXT.stateExtras = function () {
    var S = cur();
    if (!S || !S.started) return '';
    var esc = (u() && u().esc) ? u().esc : function (x) { return String(x == null ? '' : x); };
    var b = '';
    if (isShen()) {
      var q = EXT.qiheKind();
      b += '<div class="sl"><span class="k">香火气数</span><span class="v">' +
        esc(q.name) + ' ×' + q.mul.toFixed(1) + '</span></div>';
      b += '<div class="sl"><span class="k">虔诚</span><span class="v">' +
        esc(EXT.pietyLabel()) + '</span></div>';
      var fj = EXT.faxiangLine();
      if (fj) b += '<div class="small muted" style="margin-top:2px">' + esc(fj) +
        (EXT.faxiangXianshengMul() !== 1 ? ' · 显圣 ×' + EXT.faxiangXianshengMul().toFixed(2) : '') + '</div>';
    }
    if (EXT.insightXp() > 0) {
      b += '<div class="sl"><span class="k">悟道</span><span class="v">' + esc(EXT.insightLabel()) + '</span></div>';
    }
    return b;
  };
})(window);
