/* 问道长生 · 破境瓶颈（v10.1 第三梯队·问题7）
   ============================================================
   旧状：「瓶颈」只有一条——修为数值满。
         breakReady() 唯一门槛是 xiuwei >= need（仙道）或 xianghuo >= need（神道），
         满了就进四颗成功率骰子。整个游戏没有任何"条件型门槛"：
         修为够了、钱够买功法、灵根随便选，突破总能试。
         悟性从 8 练到 20 破境率只 +7.2%。
   本文件做两件事：
     ① breakGate()：表驱动的破境条件校验器。复用 bookLayerOk 的 need 结构思路，
        但独立成通用函数，不绑死在道书上。
     ② 把前面盘活的字段真正接进门槛——多系灵根、道书层数、虔诚分档。
   不变式（必须守住，否则就是倒退成「卡死」）：
     · 只在大境界（跨 realm）设门槛，小台阶不设；
     · 每一道门槛都必须存在可执行的解法，且校验器自身能回答「怎么解」；
     · 修为未满仍然是最基础的前置，不改变原有语义。 */

(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var D = null;
  function D_() { return D || (D = G.WXCS3_DATA); }
  function cur() { return G.WXCS3 ? G.WXCS3.S : null; }
  function u() { return G.WXCS3; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function isShen() { var S = cur(); return S && S.cultivation === 'shen'; }
  function st(k) { var S = cur(); return (S && S.stats && S.stats[k]) || 8; }
  /* 悟道点折算（与 ext-90 同口径：20 点 = +1 悟性）。
     写在这里而不是跨文件调 ext-90，是为了让 ext-80 不依赖加载顺序。 */
  function insightBonus() {
    var S = cur();
    var xp = (S && typeof S.insightXp === 'number') ? S.insightXp : 0;
    return Math.floor(xp / 20);
  }
  function effInsight() { return st('insight') + insightBonus(); }

  /* ============================================================
     门槛定义表
     ------------------------------------------------------------
     每条：id / 适用境界 from→to / 判定 fn / 文案 text / 解法 hint
     fromRealm 用闭区间，toRealm 用下标（XIAN_REALMS 的 idx）。
     只在大境用；小台阶（xStage 内）不设。
     ============================================================ */
  /* 主系与全部已选五行相生 —— 源自问题7可联动清单第一条：
     「高境要求主修功法五行与 rootEls 全系相生——系越多越容易满足，
      解释为何要凑多系灵根」。
     判定：主修功法的 el，是否与 rootEls[0] 相同或相生，
     并且 rootEls 里每一系都能被这个功法五行覆盖（同源或相生）。 */
  /* 判定口径（关键：必须人人有解，否则就是死档）：
     只要求「主系」与主修功法五行同源或相生。
     最初写成「覆盖 rootEls 过半」，但四系伪灵根几乎不可能满足——
     那会把最需要出路的伪灵根直接锁死，与看病的是同一类错误。
     多系在这里不是负担也不是门槛，它继续在战斗克制（ext-70 bestKe）里发挥作用。 */
  function gongfaElCoversRoots() {
    var S = cur();
    if (!S || !(S.rootEls || []).length) return true;
    var gid = (S.gongfa && S.gongfa[0]) || 'juqi';
    var list = D_().GONGFA_EXT || [];
    var g = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === gid) g = list[i];
    if (!g || !g.el) return true;          // 无属性功法不设此限（聚气诀这类）
    var SH = D_().SHENG || {};
    var main = S.rootEls[0];
    return main === g.el || SH[g.el] === main || SH[main] === g.el;
  }

  /* 道书层数 —— 把「读书涨数值」变成「读书解锁突破」。
     复用 bookRead / bookLayerOk 的既有数据结构，不新建系统。 */
  function maxBookLayer() {
    var S = cur();
    var br = (S && S.bookRead) || {};
    var m = 0;
    for (var k in br) { if (br.hasOwnProperty(k)) m = Math.max(m, numOr(br[k], 0)); }
    return m;
  }

  /* 神道：虔诚分档 —— 盘活 PIETY 表（原来只在公式里当连续值用） */
  function pietyTierIdx() {
    var S = cur();
    var p = numOr(S && S.piety, 1);
    var t = D_().PIETY || [];
    var idx = 0;
    for (var i = 0; i < t.length; i++) if (p >= t[i].v) idx = i;
    return idx;
  }

  /* ============================================================
     门槛表：每条都是「某个大境之前必须满足的东西」
     ============================================================ */
  var GATES = [
    {
      id: 'roots',
      label: '灵根与功法相合',
      /* 筑基（xRealm 1→2）起要求：主修功法五行覆盖已选灵根的过半 */
      minRealm: 1,
      check: gongfaElCoversRoots,
      text: function () {
        var S = cur();
        var gid = (S.gongfa && S.gongfa[0]) || 'juqi';
        var list = D_().GONGFA_EXT || [], g = null;
        for (var i = 0; i < list.length; i++) if (list[i].id === gid) g = list[i];
        return '主修《' + (g ? g.name : gid) + '》属' + elName(g && g.el) +
          '，须与主灵根「' + elName(S.rootEls[0]) + '」同源或相生';
      },
      hint: '换一本与主灵根同源/相生的功法设为主修；聚气诀这类无属性功法不受此限。'
    },
    {
      id: 'book',
      label: '道书已读',
      /* 紫府（xRealm 2→3）起要求：读过至少 1 层道书 */
      minRealm: 2,
      check: function () { return maxBookLayer() >= 1; },
      text: function () { return '须曾读通一卷道书（当前最深 ' + maxBookLayer() + ' 层）'; },
      hint: '在「道书」里读一卷能读懂的书，读通一层即可。'
    },
    {
      id: 'insight',
      label: '悟性门槛',
      /* 金丹（xRealm 3→4）起：悟性 >= 12 */
      minRealm: 3,
      /* 用「有效悟性」= 面板悟性 + 悟道点折算（20 点折 1）。
         这是 insightXp 唯一的消费端——读书攒下的阅历在此兑现，
         「读书解锁突破」这句话才成立。 */
      check: function () { return effInsight() >= 12; },
      text: function () {
        var S = cur();
        var base = st('insight');
        var b = insightBonus();
        return '悟性须 >= 12（当前 ' + base + (b ? ' + 悟道 ' + b : '') + ' = ' + effInsight() + '）';
      },
      hint: '机缘、读书（每 20 点悟道折 1 点悟性）、突破失败都会涨悟性。'
    },
    {
      id: 'piety',
      label: '香火虔诚',
      /* 神道专用：自二柱起（pillar>=1，即已立庙）要求虔诚达到「日日供奉」档。
         原写 pillar>=3（四柱），门槛太靠后，等于前三次破柱照旧没条件。 */
      shenOnly: true,
      minPillar: 1,
      check: function () { return pietyTierIdx() >= 2; },
      text: function () {
        var t = D_().PIETY || [], i = pietyTierIdx();
        return '虔诚须达「' + ((t[2] || {}).name || '日日供奉') + '」（当前「' + ((t[i] || {}).name || '半信半疑') + '」）';
      },
      hint: '显圣、庙会、施香都能抬虔诚，别让它跌回半信半疑。'
    }
  ];

  function elName(k) {
    var E = D_().ELEMENTS || {}, M = D_().MUT_ELEMENTS || {};
    if (!k) return '';
    if (E[k]) return E[k].name;
    if (M[k]) return M[k].name;
    return k;
  }

  /* ============================================================
     ① 校验器：返回 { ok, blocked[], rows[] }
     ------------------------------------------------------------
     rows 是全部门槛的明细（满足/未满足 + 文案 + 解法），
     供破境面板直接渲染——玩家必须能看见「差在哪、怎么补」。 */
  EXT.breakGate = function (opts) {
    opts = opts || {};
    var S = cur();
    if (!S) return { ok: true, blocked: [], rows: [] };
    var shen = isShen();
    var realm = numOr(S.xRealm, 0);
    var pillar = numOr(S.pillar, 0);
    var rows = [], blocked = [];
    for (var i = 0; i < GATES.length; i++) {
      var g = GATES[i];
      /* 是否适用 */
      var apply = false;
      if (g.shenOnly) apply = shen && pillar >= numOr(g.minPillar, 0);
      else apply = !shen && realm >= numOr(g.minRealm, 999);
      if (!apply) continue;
      var ok = false;
      try { ok = !!g.check(); } catch (e) { ok = true; }   // 判定异常不阻塞玩家
      var row = { id: g.id, label: g.label, ok: ok, text: g.text(), hint: g.hint };
      rows.push(row);
      if (!ok) blocked.push(row);
    }
    /* opts.onlyAll=false 时，只返回未满足项（面板摘要用） */
    if (opts.onlyBlocked) return { ok: blocked.length === 0, blocked: blocked, rows: blocked };
    return { ok: blocked.length === 0, blocked: blocked, rows: rows };
  };

  /* 是否允许继续突破（game.js 在这之后才走成功率骰子） */
  EXT.breakGateOk = function () {
    var r = EXT.breakGate();
    return r.ok;
  };

  /* 面板用的 HTML 片段：一条一行，未满足标红并给出解法 */
  EXT.breakGateHtml = function () {
    var r = EXT.breakGate();
    if (!r.rows.length) return '';
    var esc = (u() && u().esc) ? u().esc : function (x) { return String(x == null ? '' : x); };
    var b = '<div class="statline"><span class="k">破境门槛</span><span class="v">' +
      (r.ok ? '<span class="good">皆已满足</span>' : '<span class="danger">' + r.blocked.length + ' 项未满足</span>') +
      '</span></div>';
    for (var i = 0; i < r.rows.length; i++) {
      var w = r.rows[i];
      b += '<div class="small" style="margin:2px 0">' +
        (w.ok ? '<span class="good">✔</span>' : '<span class="danger">✘</span>') +
        ' <b>' + esc(w.label) + '</b>　' + esc(w.text) +
        (w.ok ? '' : '<div class="muted" style="margin-left:1.4em">解法：' + esc(w.hint) + '</div>') +
        '</div>';
    }
    return b;
  };

  /* 探针：测试直接验判定，不靠 HTML 猜 */
  EXT.breakGateProbe = function (patch) {
    var S = cur();
    if (!S || !patch) return null;
    var old = {};
    for (var k in patch) { if (patch.hasOwnProperty(k)) { old[k] = S[k]; S[k] = patch[k]; } }
    var r = EXT.breakGate();
    for (var k2 in old) { if (old.hasOwnProperty(k2)) S[k2] = old[k2]; }
    return r;
  };

  /* ============================================================
     ② 给面板用的「离下一次门槛有多远」摘要
     ============================================================ */
  EXT.breakGateSummary = function () {
    var r = EXT.breakGate({ onlyBlocked: true });
    if (!r.blocked.length) return '';
    return r.blocked.map(function (x) { return x.label; }).join('、');
  };
})(window);
