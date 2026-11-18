/* 问道长生 · 道痕命格（v9.0 M1）
   ============================================================
   破大境界之后，从三道「道痕」里选一道，永久生效。
   - 六系命格各有收益与代价，不许只选倍率；
   - 候选由本世行为计分决定（炼丹多见丹道、杀人多见魔途）；
   - 同系列可进阶替换，不无限叠加；
   - 一生一次重悟，耗一旬与本境三成修为。
   ------------------------------------------------------------
   本文件不含 game.js 的内部状态引用；取状态一律 cur() 现取。
   效果不直接改其他系统的数据，只暴露 fateMul / fateAdd 两个读数口，
   由 game.js 的薄缝在修炼、斗法、显圣、缴获等处取用。
   天劫扩展（wxcs3-ext-trib.js）通过 registerMul 叠加「折骨风余伤」。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }

  /* ---------- 效果注册表 ----------
     game.js 只调 fateMul(kind)/fateAdd(kind)，各扩展都能往里注册
     自己的乘子/加值，互相不认识也能叠加。 */
  var MULS = [];
  var ADDS = [];
  EXT.registerMul = function (fn) { MULS.push(fn); };
  EXT.registerAdd = function (fn) { ADDS.push(fn); };

  /* 命格自身的数值口径：乘子按「读数口 kind × 命格 × 阶」查表 */
  function fateMuls(kind, S) {
    if (!S.fate) return 1;
    var t = S.fate.tier || 1;
    switch (S.fate.id) {
      case 'danhuo':
        if (kind === 'pill') return t >= 2 ? 1.40 : 1.25;
        if (kind === 'cult') return t >= 2 ? 0.97 : 0.95;
        return 1;
      case 'yijian':
        if (kind === 'sword') return t >= 2 ? 1.45 : 1.25;
        if (kind === 'tal') return t >= 2 ? 0.85 : 0.70;
        return 1;
      case 'wanxiang':
        if (kind === 'xs') return t >= 2 ? 1.5 : 1.3;
        if (kind === 'dmg') return 0.92;
        return 1;
      case 'xuezhai':
        if (kind === 'loot') return t >= 2 ? 1.5 : 1.3;
        if (kind === 'venv') return 1.5;
        return 1;
      case 'shouzhuo':
        if (kind === 'dmg') return t >= 2 ? 0.85 : 0.90;
        return 1;
    }
    return 1;
  }
  function fateAdds(kind, S) {
    if (!S.fate) return 0;
    var t = S.fate.tier || 1;
    if (S.fate.id === 'fuxin' && kind === 'book') return t >= 2 ? 2 : 1;
    if (S.fate.id === 'shouzhuo') {
      if (kind === 'flee') return t >= 2 ? 0.15 : 0.10;
      if (kind === 'defl') return t >= 2 ? 0.12 : 0.08;
    }
    return 0;
  }
  MULS.push(fateMuls);
  ADDS.push(fateAdds);
  EXT.fateMul = function (kind) {
    var S = cur();
    if (!S || !S.started) return 1;
    var m = 1;
    for (var i = 0; i < MULS.length; i++) {
      var r = MULS[i](kind, S);
      if (typeof r === 'number' && r !== 1) m *= r;
    }
    return m;
  };
  EXT.fateAdd = function (kind) {
    var S = cur();
    if (!S || !S.started) return 0;
    var a = 0;
    for (var i = 0; i < ADDS.length; i++) {
      var r = ADDS[i](kind, S);
      if (typeof r === 'number') a += r;
    }
    return a;
  };

  /* ---------- 六系命格 ----------
     score(S)：本世行为计分——只作候选排序，不进数值。
     t1 一阶；t2 进阶（替换一阶，不叠加）。 */
  var FATE_LINES = [
    {
      id: 'danhuo', name: '丹火养命', tag: '丹',
      t1: { gain: '自服丹药，药力更醇（丹药效果 +25%）', cost: '不涉四艺的行功收效略薄（打坐修为 −5%）' },
      t2: { name: '丹炉共鸣', gain: '丹药效果 +40%，行功折损减半（修为 −3%）', cost: '药性入骨，离了丹房坐不安稳', reqText: '服丹满 8 次 · 境界筑基以上', req: function (S) { return (S.tally.pillUsed || 0) >= 8 && S.xRealm >= 2; } },
      score: function (S) { return (S.tally.pillUsed || 0) * 3 + (S.tally.pillStreak || 0) * 2; }
    },
    {
      id: 'fuxin', name: '负薪问道', tag: '读',
      t1: { gain: '负薪之余读书更入心（道书每层额外悟道 +1）', cost: '负薪之资：每月固定开销 +15 灵石' },
      t2: { name: '凡尘问道', gain: '道书每层额外悟道 +2', cost: '固定开销 +15 灵石', reqText: '读道书满 4 层', req: function (S) { var n = 0, k; for (k in (S.bookRead || {})) n += S.bookRead[k]; return n >= 4; } },
      score: function (S) { var n = 0, k; for (k in (S.bookRead || {})) n += S.bookRead[k]; return n * 3 + Math.round((S.insightXp || 0) / 10); }
    },
    {
      id: 'yijian', name: '一剑破法', tag: '剑',
      t1: { gain: '剑系招式伤害 +25%', cost: '符箓之力驳杂不驯（斗法符箓效果 −30%）' },
      t2: { name: '剑心通明', gain: '剑系招式伤害 +45%', cost: '同前', reqText: '斗法胜满 5 场 · 境界筑基以上', req: function (S) { return (S.tally.warWin || 0) >= 5 && S.xRealm >= 2; } },
      score: function (S) { return (S.tally.warFight || 0) * 2 + (S.tally.warWin || 0) * 3; }
    },
    {
      id: 'wanxiang', name: '万家香火', tag: '神',
      t1: { gain: '显圣灵验，信众来得更多（显圣所得 +30%）', cost: '一人之力薄（斗法伤害 −8%）' },
      t2: { name: '众生愿力', gain: '显圣所得 +50%', cost: '同前', reqText: '功德满 40', req: function (S) { return (S.merit || 0) >= 40; } },
      score: function (S) { return (S.merit || 0) * 2 + Math.round((S.followers || 0) / 50); }
    },
    {
      id: 'xuezhai', name: '血债偿心', tag: '杀',
      t1: { gain: '胜者的规矩（斗法缴获 +30%）', cost: '血腥气招仇家（寻仇更快）' },
      t2: { name: '血祭通幽', gain: '缴获 +50%', cost: '同前', reqText: '杀伐满 10 次', req: function (S) { return (S.tally.kill || 0) >= 10; } },
      score: function (S) { return (S.tally.kill || 0) * 3 + (S.tally.killMortals || 0) * 2 + (S.tally.bloodRite || 0) * 3 + Math.round((S.karma || 0) / 10); }
    },
    {
      id: 'shouzhuo', name: '守拙藏锋', tag: '守',
      t1: { gain: '遁走成功率 +10%，自身卸力 +8%', cost: '出手收敛（斗法伤害 −10%）' },
      t2: { name: '苟道长生', gain: '遁走 +15%，卸力 +12%', cost: '同前', reqText: '死地脱身 2 次 · 境界筑基以上', req: function (S) { return (S.tally.escapeDesperate || 0) >= 2 && S.xRealm >= 2; } },
      score: function (S) { return (S.tally.escapeDesperate || 0) * 5 + (S.tally.collapseSurvive || 0) * 3; }
    }
  ];

  function lineOf(id) {
    for (var i = 0; i < FATE_LINES.length; i++) if (FATE_LINES[i].id === id) return FATE_LINES[i];
    return null;
  }
  function tierName(line, tier) {
    if (tier >= 2) return line.t2.name || line.name;
    return line.name;
  }

  /* ---------- 候选：行为计分取前三，同分按表序 ----------
     刻意不用随机——候选必须可复现、可测试，且玩家能看懂「为什么给我看这三道」。 */
  EXT.fateCandidates = function () {
    var S = cur();
    if (!S) return [];
    var exclude = S.fate ? S.fate.id : null;
    var out = [];
    for (var i = 0; i < FATE_LINES.length; i++) {
      if (FATE_LINES[i].id === exclude) continue;
      out.push({ id: FATE_LINES[i].id, score: FATE_LINES[i].score(S) });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 3).map(function (x) { return x.id; });
  };
  /* 破境结算处（game.js 缝）问一句：要不要把「择痕」排进破境后的手续 */
  EXT.fateWanted = function () {
    var S = cur();
    return !!(S && S.started && !S.fate);
  };

  function fateInfo() {
    var S = cur();
    if (!S || !S.fate) return null;
    var line = lineOf(S.fate.id);
    if (!line) return null;
    var tier = S.fate.tier || 1;
    var def = tier >= 2 ? line.t2 : line.t1;
    return {
      id: line.id, name: tierName(line, tier), tag: line.tag, tier: tier,
      gain: def.gain, cost: def.cost,
      canAdv: tier < 2 && !!line.t2.req(S),
      advReqText: line.t2.reqText,
      canRr: !S.fateReroll
    };
  }
  EXT.fateInfo = fateInfo;

  /* 负薪问道的固定代价：挂进 game.js 的月度账本（fixedCostList 缝） */
  EXT.fixedCosts = function () {
    var S = cur();
    if (!S || !S.fate || S.fate.id !== 'fuxin') return [];
    return [{ id: 'fate_fuxin', name: '负薪问道 · 负薪之资', stones: 15 }];
  };

  /* ---------- 面板：择痕（破境后的手续之一） ---------- */
  function optRowsFor(cands) {
    var rows = '';
    var keys = ['A', 'B', 'C'];
    for (var i = 0; i < cands.length; i++) {
      var line = lineOf(cands[i]);
      if (!line) continue;
      rows += ui().optRow(keys[i] || '·', line.name, { name: line.tag, cls: 'chance' },
        line.t1.gain + '。' + line.t1.cost, false, 'do;fate_pick:' + line.id);
    }
    return rows;
  }

  function openFateChoice() {
    var S = cur();
    var cands = EXT.fateCandidates();
    var u = ui();
    if (!S || !cands.length) { u.dispatch('do;afterbreak'); return; }
    var b = '<div class="small">大境已破，气海里多出一道旧痕。天下人道痕不同，你这一道，落在何处？</div>';
    if (S.fateReroll) b += '<div class="small muted" style="margin-top:4px">重悟一场，旧痕已散，此刻可选的只剩这三道。</div>';
    b += '<div class="small muted" style="margin-top:4px">此选终身不换（一生可重悟一次）。同系后续可进阶，不必急着看远处。</div>';
    b += u.divider();
    b += '<ul class="opts">' + optRowsFor(cands) + '</ul>';
    b += '<div class="hint">候选看你这一世做过什么——炼丹多见丹道，杀伐多见血途。</div>';
    u.openModal('道痕 · 择一而终', b, true);
  }
  EXT.openFateChoice = openFateChoice;

  EXT_ACT.fate_pick = function (id) {
    var S = cur();
    var u = ui();
    var line = lineOf(id);
    if (!S || !line) return;
    if (S.fate) { u.toast('命格已定'); return; }
    S.fate = { id: id, tier: 1 };
    u.closeModal();
    u.logLine('道痕入骨：' + line.name + '。' + line.t1.cost, 'good');
    u.toast('道痕 · ' + line.name);
    u.dispatch('do;afterbreak');
  };

  /* ---------- 进阶：替换不叠加 ---------- */
  EXT_ACT.fate_adv = function () {
    var S = cur();
    var u = ui();
    var info = fateInfo();
    if (!S || !info || !info.canAdv) return;
    var line = lineOf(info.id);
    S.fate.tier = 2;
    u.logLine('命格进阶：' + line.t2.name + '。' + line.t2.gain, 'good');
    u.toast('命格进阶');
    EXT_ACT.build();
  };

  /* ---------- 重悟：一生一次，耗一旬与本境三成修为 ---------- */
  EXT_ACT.fate_rr = function () {
    var S = cur();
    var u = ui();
    if (!S || !S.fate) return;
    if (S.fateReroll) { u.toast('此生只有一次重悟'); return; }
    S.fateReroll = 1;
    var need = (G.WXCS3.D.XIAN_REALMS[S.xRealm] || {}).need || 100;
    S.xiuwei = Math.round(need * 0.3);
    u.logLine('你把旧痕从骨里刮了出去。修为散了大半，这一旬用在了静室里。', 'danger');
    u.advanceXun(1);
    u.closeModal();
    openFateChoice();
  };

})(window);
