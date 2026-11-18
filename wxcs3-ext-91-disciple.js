/* 问道长生 · 师徒四出路（v9.0 M3）
   ============================================================
   v8.1 的师徒只做到「授业 → 出师 / 逐出」。本文件把四个长期出路补齐：
     出师（game.js 原有，记入仙谱）
     留山（任执事：月有供奉，慢进，占一个岗位）
     叛师（弟子自己走：与门规、待遇、亲密有关，不是纯随机）
     先亡（遣出门历练的折损：葬礼、年谱、送终）
   ------------------------------------------------------------
   约定照 wxcs3-ext-demo.js：状态 cur() 现取、动作注册 EXT_ACT、
   占旬动作登记行动预算分档表、只做加法。
   供奉走 fixedCosts2 第二缝；月结走 onMonthHooks；
   面板由 game.js openDisciple 的弟子循环调用 EXT.discipleRows 薄缝。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  var STAY_STONE = 10;      // 留山执事每月供奉（门规再乘）
  var STAY_DAYS = 5;        // 留山仍会自己练，只是慢
  var SEND_DAYS = 45;       // 遣出历练一次进度
  var SEND_BOND = -3;       // 出门在外，离你远了一点
  var SEND_RISK = 0.12;     // 折损底率
  var BURY_STONE = 30;      // 葬礼开销

  function list() {
    var S = cur();
    if (!S) return [];
    if (!Array.isArray(S.disciples)) S.disciples = [];
    return S.disciples;
  }
  function find(id) {
    return list().filter(function (d) { return d && d.id === id; })[0] || null;
  }
  function stageOf(d) {
    try { return ui().discipleStageOf(d) || { key: 'ru', name: '入门' }; }
    catch (e) { return { key: 'ru', name: '入门' }; }
  }
  function rule() {
    return (EXT.schoolRuleOf ? EXT.schoolRuleOf() : null);
  }
  function stipend() {
    var r = rule();
    var mul = (r && typeof r.stipendMul === 'number') ? r.stipendMul : 1;
    return Math.max(1, Math.round(STAY_STONE * mul));
  }
  function outList(S) {
    if (!Array.isArray(S.disciplesOut)) S.disciplesOut = [];
    return S.disciplesOut;
  }
  function stamp() {
    var S = cur();
    return (S.year || 0) + '年' + (S.month || 0) + '月';
  }
  function ledgerOut(label, amount) {
    var S = cur();
    S.ledger = S.ledger || { income: [], expense: [] };
    if (!Array.isArray(S.ledger.expense)) S.ledger.expense = [];
    S.ledger.expense.push({ label: label, amount: amount });
  }

  /* 折损率：基础 + 离心 + 门规。全部写在面板上，不给暗骰。 */
  function sendRisk(d) {
    var p = SEND_RISK;
    if (numOr(d.bond, 0) < 0) p += 0.10;
    var r = rule();
    if (r) {
      if (r.id === 'yan') p += 0.06;
      if (r.id === 'kuan') p -= 0.04;
    }
    var S = cur();
    if (S && S.arrears > 0) p += 0.05;
    return Math.max(0.04, Math.min(0.50, p));
  }
  EXT.discipleSendRisk = function (id) {
    var d = find(id);
    return d ? sendRisk(d) : SEND_RISK;
  };

  /* 离去记谱：出师 / 亡故 / 叛去共用一张仙谱，靠 kind 区分。 */
  function recordOut(d, kind, cause) {
    var S = cur();
    outList(S).push({
      name: d.name, bond: d.bond, at: stamp(),
      kind: kind, cause: cause || '', npcId: d.npcId || null
    });
  }
  function dropDisciple(d) {
    var arr = list();
    var i = arr.indexOf(d);
    if (i >= 0) arr.splice(i, 1);
  }
  function markNpcGone(d, alive) {
    var S = cur();
    if (!d || !d.npcId || !S.npcs || !S.npcs[d.npcId]) return;
    S.npcs[d.npcId].alive = !!alive;
  }
  function bumpTally(k, n) {
    var S = cur();
    S.tally = S.tally || {};
    S.tally[k] = (S.tally[k] || 0) + (n == null ? 1 : n);
  }
  function schoolRep(n) {
    var S = cur();
    if (!S.school) return;
    S.school.rep = Math.max(0, numOr(S.school.rep, 0) + n);
  }

  /* ---------- 先亡 ---------- */
  EXT.disciplePerish = function (id, cause) {
    var S = cur();
    var d = find(id);
    if (!d) return { ok: false, why: '没有这个弟子' };
    dropDisciple(d);
    recordOut(d, 'died', cause || '历练未归');
    markNpcGone(d, false);
    bumpTally('dpFuneral');
    /* 送终：一位好感 ≥ 60 的人老死——弟子也是人，账照记。 */
    if (numOr(d.bond, 0) >= 60) bumpTally('npcFuneral');
    var cost = 0;
    if (S.stones >= BURY_STONE) {
      S.stones -= BURY_STONE;
      ledgerOut('弟子葬礼', BURY_STONE);
      cost = BURY_STONE;
    }
    ui().logLine(esc(d.name) + '没能回来。你替其收了尸骨，葬在山后。' +
      (cost ? '（葬礼 −' + cost + ' 石）' : '（连一口薄棺也是赊的）'), 'danger');
    if (numOr(d.bond, 0) >= 60) ui().logLine('你记得' + esc(d.name) + '磕头那天的样子。年谱替你记着。', 'danger');
    return { ok: true, name: d.name };
  };

  /* ---------- 叛师（弟子自己走） ---------- */
  EXT.discipleBetrayChance = function (d) {
    if (!d) return 0;
    var bond = numOr(d.bond, 0);
    var p = 0;
    if (bond <= -40) p += 0.27;
    else if (bond <= -20) p += 0.12;
    if (bond < 10) {
      var r = rule();
      if (r && r.id === 'yan') p += 0.06;
    }
    var S = cur();
    if (S && S.arrears > 0) p += 0.05;
    var r2 = rule();
    if (r2 && typeof r2.betrayMul === 'number') p *= r2.betrayMul;
    return Math.max(0, Math.min(0.60, p));
  };
  EXT.discipleSelfBetray = function (id) {
    var S = cur();
    var d = find(id);
    if (!d) return { ok: false, why: '没有这个弟子' };
    dropDisciple(d);
    recordOut(d, 'betray', '夜遁');
    markNpcGone(d, true);
    schoolRep(-4);
    S.fame = Math.max(0, numOr(S.fame, 0) - 2);
    bumpTally('dpBetray');
    ui().logLine(esc(d.name) + '夜里卷了自己的东西下山。山门没拦——门规里没写这一条。', 'danger');
    return { ok: true, name: d.name };
  };

  /* ---------- 月结：留山慢进、欠供离心、弟子夜遁 ---------- */
  EXT.discipleMonth = function () {
    var S = cur();
    if (!S || !S.started) return;
    var arr = list().slice();
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i];
      if (!d || d.alive === false) continue;
      if (d.stay) {
        d.days = numOr(d.days, 0) + STAY_DAYS;
        d.stage = stageOf(d).key;
        /* 供奉发不出：不是立刻走，是先离心。 */
        if (numOr(S.arrears, 0) > 0) {
          d.bond = numOr(d.bond, 0) - 3;
          ui().logLine('弟子的供奉又拖了一月，' + esc(d.name) + '当面没说，转身时门带得很重。', 'danger');
        }
      }
      var p = EXT.discipleBetrayChance(d);
      if (p > 0 && ui().rng() < p) {
        EXT.discipleSelfBetray(d.id);
      } else if (numOr(d.bond, 0) <= -20) {
        ui().logLine(esc(d.name) + '近来不与你照面。门里有人在传，说他要走。', 'danger');
      }
    }
  };

  /* ---------- 面板行（game.js openDisciple 的薄缝） ---------- */
  EXT.discipleRows = function (d) {
    var u = ui();
    if (!d) return '';
    var st = stageOf(d);
    var out = '';
    var cost = u.costLine ? '　' + u.costLine({ xun: 1 }) : '　占 1 旬';
    if (d.stay) {
      out += u.optRow('·', '免去执事', { name: '离山', cls: 'peace' },
        '此后不再占供奉', false, 'do;dpunstay:' + d.id);
    } else {
      var canStay = st.key !== 'ru';
      out += u.optRow('·', '留山任执事', { name: '留山', cls: 'peace' },
        canStay ? ('月供 ' + stipend() + ' 石 · 慢进' + cost) : '火候未到（先授业到承教）',
        !canStay, 'do;dpstay:' + d.id);
    }
    var canGo = st.key !== 'ru';
    out += u.optRow('·', '遣出门历练', { name: '历练', cls: 'risk' },
      canGo ? ('进度 +' + SEND_DAYS + ' · 折损 ' + Math.round(sendRisk(d) * 100) + '%' + cost) : '火候未到',
      !canGo, 'do;dpsend:' + d.id);
    return out;
  };

  /* ---------- 动作 ---------- */
  function reopen() {
    ui().ACT.openDisciple();
    ui().render();
  }

  EXT_ACT.dpstay = function (id) {
    var S = cur(), u = ui();
    var d = find(id);
    if (!d || !S || !S.started) return;
    if (d.stay) { u.toast('已在山中任事'); return; }
    if (stageOf(d).key === 'ru') { u.toast('火候未到，先授业到承教'); return; }
    d.stay = true;
    u.logLine(esc(d.name) + '留在山中任执事，替你收帖、记账、看门。', 'good');
    u.closeModal();
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    reopen();
  };

  EXT_ACT.dpunstay = function (id) {
    var S = cur(), u = ui();
    var d = find(id);
    if (!d || !S || !S.started) return;
    if (!d.stay) return;
    d.stay = false;
    u.logLine(esc(d.name) + '卸了执事的差事，回自己屋里去了。', '');
    u.closeModal();
    reopen();
  };

  EXT_ACT.dpsend = function (id) {
    var S = cur(), u = ui();
    var d = find(id);
    if (!d || !S || !S.started) return;
    if (stageOf(d).key === 'ru') { u.toast('火候未到，出门也是白走'); return; }
    /* 先掷折损，再推进时间：结果与「路上发生了什么」同一旬。 */
    var dies = ui().rng() < sendRisk(d);
    u.closeModal();
    if (dies) {
      EXT.disciplePerish(d.id, '历练折损');
      u.advanceXun(1);
      if (S.phase !== 'play') return u.render();
      reopen();
      return;
    }
    d.days = numOr(d.days, 0) + SEND_DAYS;
    d.bond = numOr(d.bond, 0) + SEND_BOND;
    d.stage = stageOf(d).key;
    u.logLine(esc(d.name) + '出门历练归来，带回一身风尘和一封没写完的信。', 'good');
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    reopen();
  };

  /* ---------- 月账：留山供奉 ---------- */
  (function () {
    var prev = EXT.fixedCosts2;
    EXT.fixedCosts2 = function () {
      var S = cur();
      var arr = prev ? prev() : [];
      if (!S) return arr;
      var amp = stipend();
      list().forEach(function (d) {
        if (d && d.stay) arr.push({ id: 'dp_stipend_' + d.id, name: '弟子供奉 · ' + (d.name || '门人'), stones: amp });
      });
      return arr;
    };
  })();

  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    EXT.discipleMonth();
  });

})(window);
