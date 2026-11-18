/* 问道长生 · 轻量道统（v9.0 M3）
   ============================================================
   不是完整组织 AI。只做三件事：
     立道号 / 选一条门规 / 设一处山门；
     门规影响收徒门槛、供奉、叛徒率与声望；
     每月一笔山门维护费，声望来自做出来的事（出师/讲道/论道/济世/遗迹）。
   ------------------------------------------------------------
   名字避让：S.daotong 是「金行/木行」那种五行道统字符串，
   这里另起 S.school，别把组织塞进一个字符串里。
   约定照 wxcs3-ext-demo.js：cur() 现取、EXT_ACT 注册、只做加法。 */
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

  var FOUND_STONE = 800;
  var RULE_STONE = 50;
  var MOVE_STONE = 200;

  var RULES = [
    { id: 'kuan', name: '宽', admit: 15, upkeep: 15, stipendMul: 1.0, betrayMul: 0.5, repMul: 0.8,
      note: '宽以待下：易收徒，叛者少，声望积得慢。' },
    { id: 'zhong', name: '中', admit: 20, upkeep: 20, stipendMul: 1.0, betrayMul: 1.0, repMul: 1.0,
      note: '不宽不严：门规如常。' },
    { id: 'yan', name: '严', admit: 25, upkeep: 30, stipendMul: 1.5, betrayMul: 1.6, repMul: 1.25,
      note: '严刑峻法：声望积得快，离心也快。' }
  ];
  function ruleById(id) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
    return RULES[1];
  }
  EXT.schoolRules = RULES;
  EXT.schoolRuleOf = function () {
    var S = cur();
    if (!S || !S.school) return null;
    return ruleById(S.school.rule);
  };
  /* 收徒门槛：game.js 的候选筛选与动作校验都问这一口。 */
  EXT.schoolAdmitFav = function () {
    var r = EXT.schoolRuleOf();
    return r ? r.admit : 20;
  };
  EXT.schoolStipendMul = function () {
    var r = EXT.schoolRuleOf();
    return r ? r.stipendMul : 1;
  };
  function rep(S) { return Math.max(0, Math.round(numOr((S.school || {}).rep, 0))); }
  /* 声望不是货币，是别人愿不愿意来。每 20 点，山门维护减 2（最低 5）。 */
  function upkeep(S) {
    var r = EXT.schoolRuleOf();
    if (!r) return 0;
    var off = Math.min(6, Math.floor(rep(S) / 20) * 2);
    return Math.max(5, r.upkeep - off);
  }
  EXT.schoolUpkeep = function () {
    var S = cur();
    return S ? upkeep(S) : 0;
  };
  function addRep(n) {
    var S = cur();
    if (!S || !S.school) return;
    S.school.rep = Math.max(0, numOr(S.school.rep, 0) + n);
  }

  /* ---------- 声望来源（game.js 薄缝） ---------- */
  EXT.schoolOnGraduate = function (d) {
    var S = cur();
    if (!S || !S.school) return 0;
    var r = EXT.schoolRuleOf();
    var gain = Math.round(8 * (r ? r.repMul : 1));
    addRep(gain);
    ui().logLine('弟子出师，道统声望 +' + gain + '。山门外开始有人抬头看这块匾。', 'good');
    return gain;
  };
  EXT.schoolOnTalk = function (n, id) {
    var S = cur();
    if (!S || !S.school || !n) return;
    var rec = (S.npcs || {})[id];
    if (!rec) return;
    var mk = (S.year || 0) * 12 + (S.month || 0);
    if (rec.talkRep === mk) return;   // 同一人每月只记一次
    rec.talkRep = mk;
    addRep(1);
  };

  /* ---------- 安置与讲道 ---------- */
  EXT_ACT.sch_lecture = function () {
    var S = cur(), u = ui();
    if (!S || !S.school) { u.toast('尚未立道统'); return; }
    var list = Array.isArray(S.disciples) ? S.disciples : [];
    if (!list.length) { u.toast('堂下无人，讲给谁听'); return; }
    var r = EXT.schoolRuleOf();
    var gain = Math.round(3 * (r ? r.repMul : 1));
    var extra = 0;
    if (numOr(S.stats && S.stats.insight, 0) >= 13) { extra = 2; gain += extra; }
    list.forEach(function (d) {
      if (!d || d.alive === false) return;
      d.days = numOr(d.days, 0) + 10;
      d.bond = numOr(d.bond, 0) + 2;
      try { d.stage = u.discipleStageOf(d).key; } catch (e) { }
    });
    addRep(gain);
    u.logLine('你在堂上讲了一旬。' + (extra ? '有些话不必点透，聪慧的人自己会接下去。' : '底下有人打盹，有人记了半页。') +
      '声望 +' + gain + '。', 'good');
    u.closeModal();
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    EXT_ACT.sch();
    u.render();
  };

  EXT_ACT.sch_rule = function (id) {
    var S = cur(), u = ui();
    if (!S || !S.school) { u.toast('尚未立道统'); return; }
    var r = ruleById(id);
    if (!r || r.id === S.school.rule) return;
    if (S.stones < RULE_STONE) { u.toast('灵石不足'); return; }
    S.stones -= RULE_STONE;
    S.ledger = S.ledger || { income: [], expense: [] };
    S.ledger.expense.push({ label: '改门规', amount: RULE_STONE });
    S.school.rule = r.id;
    addRep(-2);   // 改弦更张，总有人不适应
    u.logLine('你把门规改成「' + r.name + '」。' + r.note, '');
    u.closeModal();
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    EXT_ACT.sch();
    u.render();
  };

  EXT_ACT.sch_move = function () {
    var S = cur(), u = ui();
    if (!S || !S.school) { u.toast('尚未立道统'); return; }
    if (S.school.site === S.place) { u.toast('山门已在此处'); return; }
    if (S.stones < MOVE_STONE) { u.toast('灵石不足'); return; }
    S.stones -= MOVE_STONE;
    S.ledger = S.ledger || { income: [], expense: [] };
    S.ledger.expense.push({ label: '迁山门', amount: MOVE_STONE });
    S.school.site = S.place;
    addRep(-2);
    u.logLine('你把山门迁到了此地。旧匾卸下来时，木屑落了一地。', '');
    u.closeModal();
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    EXT_ACT.sch();
    u.render();
  };

  /* ---------- 立道统 ---------- */
  function canFound(S) {
    var d = Array.isArray(S.disciples) ? S.disciples.length : 0;
    var o = Array.isArray(S.disciplesOut) ? S.disciplesOut.length : 0;
    return d + o > 0;
  }
  EXT_ACT.sch_found = function (ruleId) {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (S.school) { u.toast('已有道统'); return; }
    if (S.stones < FOUND_STONE) { u.toast('灵石不足（需 ' + FOUND_STONE + '）'); return; }
    if (!canFound(S)) { u.toast('门下无人，立不起门户'); return; }
    var r = ruleById(ruleId);
    var el = document.getElementById('in-sch-name');
    var name = el ? String(el.value || '').trim().slice(0, 8) : '';
    if (!name) name = '青庐';
    S.stones -= FOUND_STONE;
    S.ledger = S.ledger || { income: [], expense: [] };
    S.ledger.expense.push({ label: '立道统', amount: FOUND_STONE });
    S.school = { name: name, rule: r.id, site: S.place, rep: 0, founded: { y: S.year, m: S.month } };
    /* 「开宗」成就等的是这个计数器——旧版从没人写过，于是它一直搁着。 */
    S.tally = S.tally || {};
    S.tally.foundedSect = (S.tally.foundedSect || 0) + 1;
    u.logLine('你在山门上刻下「' + esc(name) + '」二字，门规取「' + r.name + '」。刻得很深，怕后人磨去。', 'good');
    u.toast('开宗 · ' + name);
    u.closeModal();
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    EXT_ACT.sch();
    u.render();
  };

  /* ---------- 面板 ---------- */
  EXT_ACT.sch = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var b = '';
    if (!S.school) {
      var ok = canFound(S);
      b += '<div class="small">开宗不是修行，是把名字刻在一个地方，然后等人来。</div>' + u.divider();
      b += '<div class="statline"><span class="k">门槛</span><span class="v">灵石 ' + FOUND_STONE +
        ' · 门下有人</span></div>';
      if (!ok) b += '<div class="small danger">门下还没有人。先收一个弟子，再谈门户。</div>';
      if (S.stones < FOUND_STONE) b += '<div class="small danger">灵石不足。山门、匾额、头一年的香火，都要现钱。</div>';
      b += '<div class="row" style="margin-top:8px"><span class="lab small muted">道号</span>' +
        '<input id="in-sch-name" value="" maxlength="8" placeholder="青庐" style="flex:1;min-width:120px"></div>';
      b += u.divider() + '<div class="small muted">择一条门规（终身可改，但改一次要重新立规矩）</div><ul class="opts">';
      RULES.forEach(function (r) {
        b += u.optRow('·', '门规 · ' + r.name, { name: '门规', cls: 'chance' },
          r.note + '　收徒 ' + r.admit + ' · 月支 ' + r.upkeep + ' 石',
          !ok || S.stones < FOUND_STONE, 'do;sch_found:' + r.id);
      });
      b += '</ul>';
      b += '<div class="hint">声望不靠买。弟子出师、讲道、论道、济世、遗迹，才有人替你传名。</div>';
      u.openModal('道统 · 立门', b);
      return;
    }
    var r = EXT.schoolRuleOf();
    b += '<div class="statline"><span class="k">道号</span><span class="v"><b>' + esc(S.school.name) + '</b></span></div>';
    b += '<div class="statline"><span class="k">门规</span><span class="v">' + r.name + '　<span class="muted">' + esc(r.note) + '</span></span></div>';
    b += '<div class="statline"><span class="k">山门</span><span class="v">' +
      (S.school.site === S.place ? '立于此地' : '立在别处') + '</span></div>';
    b += '<div class="statline"><span class="k">声望</span><span class="v">' + rep(S) + '</span></div>';
    b += '<div class="statline"><span class="k">月支</span><span class="v">山门维护 ' + upkeep(S) + ' 石' +
      (S.arrears > 0 ? '　<span class="danger">上月欠缴</span>' : '') + '</span></div>';
    b += u.divider();
    b += '<div class="small">门规落在四处：收徒门槛 ' + r.admit + ' ｜ 弟子供奉 ×' + r.stipendMul.toFixed(1) +
      ' ｜ 叛徒率 ×' + r.betrayMul.toFixed(1) + ' ｜ 声望 ×' + r.repMul.toFixed(1) + '</div>';
    b += '<div class="small muted">声望来源：弟子出师、讲道、论道（每人每月一次）、济世、遗迹。</div>';
    b += u.divider() + '<ul class="opts">';
    b += u.optRow('·', '讲道一旬', { name: '讲道', cls: 'peace' },
      '门下进度 +10 · 亲密 +2 · 声望 +' + Math.round(3 * r.repMul) + '~' + Math.round(5 * r.repMul) + '　占 1 旬',
      !(S.disciples && S.disciples.length), 'do;sch_lecture');
    if (S.school.site !== S.place) {
      b += u.optRow('·', '迁山门至此', { name: '迁门', cls: 'chance' },
        MOVE_STONE + ' 石 · 占 1 旬 · 声望 −2', S.stones < MOVE_STONE, 'do;sch_move');
    }
    b += '</ul>';
    b += u.divider() + '<div class="small muted">改门规（' + RULE_STONE + ' 石 · 占 1 旬 · 声望 −2）</div><ul class="opts">';
    RULES.forEach(function (x) {
      if (x.id === r.id) return;
      b += u.optRow('·', '改行「' + x.name + '」', { name: '门规', cls: 'peace' },
        x.note, S.stones < RULE_STONE, 'do;sch_rule:' + x.id);
    });
    b += '</ul>';
    b += '<div class="hint">轻量道统不做组织 AI——它只回答一件事：别人愿不愿意把孩子送到你门下。</div>';
    u.openModal('道统 · ' + S.school.name, b);
  };

  /* ---------- 月账与月结 ---------- */
  (function () {
    var prev = EXT.fixedCosts2;
    EXT.fixedCosts2 = function () {
      var S = cur();
      var arr = prev ? prev() : [];
      if (S && S.school) arr.push({ id: 'school_upkeep', name: '山门维护 · ' + (S.school.name || ''), stones: upkeep(S) });
      return arr;
    };
  })();

  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    var S = cur();
    if (!S || !S.school) return;
    /* 至少一个月预警：钱不够下月的维护，先说，不突然降级。 */
    if (numOr(S.stones, 0) < upkeep(S)) {
      ui().logLine('山门这个月的香烛还没着落。' + (S.school.name || '') + '的门人开始互相看。', 'danger');
    }
    if (numOr(S.arrears, 0) > 0) {
      addRep(-2);
      ui().logLine('上月开销没缴清，山门外来打听的人少了一些。声望 −2。', 'danger');
    }
  });

  /* ---------- 坞入口 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      if (!S || !S.started) return prev ? prev() : [];
      var arr = prev ? prev() : [];
      arr.push({
        k: '统', t: '道统', g: '人事',
        s: S.school ? ((S.school.name || '道统') + ' · 声望 ' + rep(S)) : '未立',
        act: 'do;sch'
      });
      return arr;
    };
  })();

})(window);
