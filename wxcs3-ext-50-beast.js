/* 问道长生 · 灵兽第四位（v9.0 M2）
   ============================================================
   在 v8.1 御兽（兽栏/亲密/妖力）之上，把「第四位」做实：
   - 主战灵兽：S.warBeast 指向兽栏第几头；出战有独立气血与行动，
     不直接加进玩家战力数字；
   - 兽令三式：攻 / 护 / 显化（化形技）——听不听令看亲密；
   - 敌方回合：兽护挡刀（掉兽血）、自动护主与反噬（原 game.js 的
     第四位逻辑整体搬入，并修掉「先扣血再挡刀」的次序问题）；
   - 饿了会走：久不喂养，亲密下滑、甚至叛逃；喂一次（do_beastfeed）记月；
   - 神道封兽官：香火俸禄，换显圣灵验与每月亲昵。
   ------------------------------------------------------------
   约定照 wxcs3-ext-demo.js：cur() 现取、EXT_ACT 注册、月结钩子走
   EXT.onMonthHooks、敌回合钩子走 EXT.foeHooks（game.js 只留缝）。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }
  function D() { return G.WXCS3.D; }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function packOf(id) {
    var list = D().BEAST_STOCK || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function bondTier(bond) {
    var b = numOr(bond, 0), t = (D().BEAST_BOND || [])[0];
    (D().BEAST_BOND || []).forEach(function (x) { if (b >= x.min) t = x; });
    return t || { guard: 0, bite: 0, name: '野' };
  }
  function powerMul(S) {
    return clamp(numOr(S.beastPower, 1), 0.5, numOr((D().BEAST_CARE || {}).powerCap, 1.8));
  }
  /* 主战的那一头：S.warBeast 是兽栏下标，越界归零 */
  function war(S) {
    S = S || cur();
    var list = Array.isArray(S.barn) ? S.barn : [];
    if (!list.length) return null;
    var i = clamp(numOr(S.warBeast, 0), 0, list.length - 1);
    return list[i];
  }
  function warIdx(S) {
    var list = Array.isArray(S.barn) ? S.barn : [];
    if (!list.length) return -1;
    return clamp(numOr(S.warBeast, 0), 0, list.length - 1);
  }
  function canHuaXing(S, b) {
    return numOr(S.beastPower, 1) >= 1.5 && numOr(b && b.bond, 0) >= 60;
  }

  /* ---------- 出战：独立气血，不进战力数字 ---------- */
  EXT.combatDeploy = function (c) {
    var S = cur(), u = ui();
    if (!c) return;
    var b = war(S);
    if (!b || numOr(b.bond, 0) < 0) return;   // 野性未驯的不上桌
    var pack = packOf(b.id);
    var hpMax = Math.max(20, Math.round(30 + numOr(pack ? pack.hp : 1, 1) * 25 * powerMul(S)));
    c.beast = { name: b.name, el: b.el, hp: hpMax, hpMax: hpMax };
    u.logLine(escHtml(b.name) + '绕到你身侧，压低了身子。', '');
  };

  /* ---------- 我方面板：兽的血条（注册数组） ---------- */
  EXT.fightInfoHooks = EXT.fightInfoHooks || [];
  EXT.fightInfoHooks.push(function (c) {
    if (!c || !c.beast) return '';
    var pct = Math.round(numOr(c.beast.hp, 0) / Math.max(1, c.beast.hpMax) * 100);
    return '<div class="frow"><span class="k">灵兽</span><span class="v">' + escHtml(c.beast.name) +
      '　' + Math.max(0, numOr(c.beast.hp, 0)) + '/' + c.beast.hpMax +
      '（' + pct + '%）</span></div>';
  });

  /* ---------- 回合按钮：兽令三式（注册数组） ---------- */
  EXT.fightRowsHooks = EXT.fightRowsHooks || [];
  EXT.fightRowsHooks.push(function () {
    var S = cur(), u = ui();
    if (!S.combat || !S.combat.beast || numOr(S.combat.beast.hp, 0) <= 0) return [];
    var b = war(S), tier = bondTier(b && b.bond);
    var rows = [
      u.optRow('兽', '令兽攻', { name: '驱使', cls: 'risk' },
        '听令看亲密（' + tier.name + '）', false, 'do;cbt:ext:beast_atk'),
      u.optRow('兽', '令兽护', { name: '驱使', cls: 'peace' },
        '它替你挨半刀，兽血 −50%', false, 'do;cbt:ext:beast_guard')
    ];
    if (canHuaXing(S, b)) {
      rows.push(u.optRow('兽', '令兽显化', { name: '化形', cls: 'chance' },
        '化形一击 ×1.5 · 兽血 −10%', S.combat.beast.hp <= S.combat.beast.hpMax * 0.15, 'do;cbt:ext:beast_skill'));
    }
    return rows;
  });

  /* do_cbt 的 ext 分支（注册数组，与 benming 共用）：返回 {dmg,note} 或 'stop' */
  EXT.combatActHooks = EXT.combatActHooks || [];
  EXT.combatActHooks.push(function (arg, c) {
    var S = cur(), u = ui();
    if (arg !== 'beast_atk' && arg !== 'beast_guard' && arg !== 'beast_skill') return null;
    if (!c.beast || numOr(c.beast.hp, 0) <= 0) { u.toast('兽不在场'); u.render(); return 'stop'; }
    var b = war(S);
    var pack = packOf(b ? b.id : null) || {};
    var tier = bondTier(b && b.bond);
    if (arg === 'beast_guard') {
      c.beastGuard = 1;
      return { dmg: 0, note: escHtml(c.beast.name) + '压低身子，盯住对方的手腕' };
    }
    var obey = G.WXCS3.rng() < 0.55 + tier.guard * 0.5;
    if (!obey) {
      return { dmg: 0, note: escHtml(c.beast.name) + '看了你一眼，没动——它还没那么认你' };
    }
    var base = c.foe.hpMax * 0.14 * numOr(pack.atk, 1) * powerMul(S) * (0.9 + G.WXCS3.rng() * 0.2);
    if (arg === 'beast_skill') {
      if (!canHuaXing(S, b)) { u.toast('妖力未至化形'); u.render(); return 'stop'; }
      c.beast.hp = Math.max(0, c.beast.hp - Math.round(c.beast.hpMax * 0.10));
      base *= 1.5;
      return { dmg: Math.round(base), note: escHtml(c.beast.name) + '显出半截真身，一击如山倾（兽 −' + Math.round(c.beast.hpMax * 0.10) + '）' };
    }
    return { dmg: Math.round(base), note: escHtml(c.beast.name) + '扑咬其面门' };
  });

  /* ---------- 敌方回合钩子 ----------
     顺序在 game.js 里已修到「扣玩家血之前」：挡刀是真的挡刀。 */
  EXT.foeHooks = EXT.foeHooks || [];
  EXT.foeHooks.push(function (c, dmg) {
    var S = cur(), u = ui();
    if (!c) return false;
    /* 玩家令兽护：兽替玩家挨半刀 */
    if (c.beastGuard && c.beast && numOr(c.beast.hp, 0) > 0) {
      c.beastGuard = 0;
      var taken = Math.max(1, Math.round(dmg * 0.5));
      c.beast.hp = Math.max(0, c.beast.hp - taken);
      u.logLine(escHtml(c.beast.name) + '替你挡下这一击（兽 −' + taken + '）。', 'good');
      if (c.beast.hp <= 0) u.logLine(escHtml(c.beast.name) + '呜咽一声，退到阵后——这场它起不来了。', 'danger');
      return true;
    }
    /* 自动护主 / 反噬：每场一次（原 v8.1 逻辑，概率读 D.BEAST_BOND） */
    if (!c.beastDone) {
      var b = war(S);
      if (!b) return false;
      c.beastDone = true;
      var tier = bondTier(b.bond);
      var roll = G.WXCS3.rng();
      if (roll < tier.guard) {
        if (c.beast && numOr(c.beast.hp, 0) > 0) {
          c.beast.hp = Math.max(0, c.beast.hp - Math.max(1, Math.round(dmg * 0.5)));
          u.logLine(escHtml(b.name) + '从斜里扑出来，替你挡了这一下。', 'good');
          if (c.beast.hp <= 0) u.logLine(escHtml(b.name) + '受了这一下，退到阵后。', 'danger');
        } else {
          u.logLine(escHtml(b.name) + '从斜里扑出来，替你挡了这一下。', 'good');
        }
        return true;
      }
      if (roll < tier.guard + tier.bite) {
        var bite = Math.max(1, Math.round(S.hpMax * 0.06 * powerMul(S)));
        S.hp = Math.max(0, S.hp - bite);
        u.logLine(escHtml(b.name) + '忽然回头咬了你一口——它还没认你。气血 −' + bite, 'danger');
        if (S.hp <= 0) {
          S.combat = null; S.phase = 'play'; S.hp = 1;
          u.logLine('你被自家兽咬倒在半途。它蹲在一边看你，没有靠近。', 'danger');
          u.toast('被反噬');
          u.advanceXun(1);
        }
        return true;
      }
    }
    return false;
  });

  /* ---------- 月结钩子：饿则生怨，怨久则走 ---------- */
  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    var S = cur(), u = ui();
    if (!S || !Array.isArray(S.barn) || !S.barn.length) return;
    var i = warIdx(S), b = S.barn[i];
    if (!b) return;
    /* 封兽官：每月亲昵 +1 */
    if (S.beastOfficer) b.bond = clamp(numOr(b.bond, 0) + 1, -99, 100);
    /* 喂养记账：S.beastFedMonth 是最后一次喂养的月份（S.turn）。
       超过一个月没喂＝饿；亲密随饥饿下滑；饿过两月，它可能自己走。 */
    var hungry = Math.max(0, numOr(S.turn, 0) - numOr(S.beastFedMonth, 0) - 1);
    if (hungry >= 1) {
      b.bond = clamp(numOr(b.bond, 0) - hungry, -99, 100);
      if (hungry === 1) u.logLine(escHtml(b.name) + '两天没吃到东西了。', '');
    }
    if (hungry >= 2 && G.WXCS3.rng() < 0.20 + 0.15 * hungry) {
      S.barn.splice(i, 1);
      S.warBeast = 0;
      S.yaoshou = S.barn.length > 0;
      u.logLine(escHtml(b.name) + '走了。没有回头，也没有留话。', 'danger');
      u.toast('灵兽叛逃');
      return;
    }
    /* 饿过两月的提醒 */
    if (hungry >= 2) u.logLine(escHtml(b.name) + '瘦了一圈，眼神里有别的东西。', 'danger');
  });

  /* ---------- 神道：封兽官 ---------- */
  EXT.registerMul(function (kind, S) {
    if (kind === 'xs' && S && S.beastOfficer) return 1.10;
    return 1;
  });
  EXT.fixedCosts2 = EXT.fixedCosts2 || function () { return []; };
  (function () {
    var prev = EXT.fixedCosts2;
    EXT.fixedCosts2 = function () {
      var S = cur();
      var arr = prev ? prev() : [];
      if (S && S.beastOfficer) arr.push({ id: 'beast_officer', name: '兽官俸禄', xianghuo: 10 });
      return arr;
    };
  })();

  EXT_ACT.beast_officer = function () {
    var S = cur(), u = ui();
    if (!S || S.cultivation !== 'shen') { u.toast('仙道无此职'); return; }
    if (S.beastOfficer) { u.toast('已有兽官'); return; }
    if (!war(S)) { u.toast('兽栏里得先有一头'); return; }
    if (S.xianghuo < 30) { u.toast('香火不足 30'); return; }
    S.xianghuo -= 30;
    S.beastOfficer = true;
    u.logLine('你奏请一道兽官敕牒，' + escHtml((war(S) || {}).name || '') + '受了香烟，从此有俸有职。', 'good');
    u.toast('封兽官');
    EXT_ACT.beast();
    u.render();
  };

  /* ---------- 面板：兽栏与主战 ---------- */
  EXT_ACT.beast = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var list = Array.isArray(S.barn) ? S.barn : [];
    var b = body(S, list);
    u.openModal('兽栏', b);
  };
  function body(S, list) {
    var u = ui();
    var b = '';
    if (!list.length) {
      return '<div class="small muted">兽栏空着。负伤的妖物认了你，才会自己走进来（洞府面板可喂养与调教）。</div>';
    }
    list.forEach(function (bt, i) {
      var tier = bondTier(bt.bond);
      var pack = packOf(bt.id) || {};
      var isWar = i === warIdx(S);
      b += '<div class="statline"><span class="k">' + escHtml(bt.name) + (isWar ? '　<b>主战</b>' : '') +
        '</span><span class="v">' + escHtml(tier.name) + '（' + Math.round(numOr(bt.bond, 0)) + '）· 妖力 ×' +
        powerMul(S).toFixed(2) + ' · ' + escHtml((D().ELEMENTS[pack.el] || {}).name || '') +
        (canHuaXing(S, bt) ? ' · 可化形' : '') + '</span></div>';
      if (!isWar) {
        b += '<div class="row" style="margin:2px 0 6px"><span class="chip" data-act="do;beast_war:' + i + '">设为主战</span></div>';
      }
    });
    b += u.divider();
    var w = war(S);
    if (w) {
      var tier = bondTier(w.bond);
      b += '<div class="statline"><span class="k">听令</span><span class="v">' +
        Math.round((0.55 + tier.guard * 0.5) * 100) + '%（护主 ' + Math.round(tier.guard * 100) + '% · 反噬 ' + Math.round(tier.bite * 100) + '%）</span></div>';
      var fed = numOr(S.beastFedMonth, 0);
      var hungry = Math.max(0, numOr(S.turn, 0) - fed - 1);
      b += '<div class="statline"><span class="k">温饱</span><span class="v ' + (hungry >= 1 ? 'danger' : '') + '">' +
        (hungry <= 0 ? '喂过了' : '已饿 ' + hungry + ' 月（再不喂，它会走）') + '</span></div>';
    }
    b += '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">' +
      '<span class="chip" data-act="do;beastfeed">喂养（灵石 120 · 亲密 +6）</span>' +
      '<span class="chip" data-act="do;beasttrain">调教（一旬 · 妖力 +6%）</span></div>';
    b += '<div class="hint">喂养在洞府面板也行；调教涨妖力却跌亲密——两轴换着养。</div>';
    if (S.cultivation === 'shen') {
      b += u.divider();
      b += S.beastOfficer
        ? '<div class="statline"><span class="k">兽官</span><span class="v good">已在职（俸禄香火 10/月 · 显圣 +10%）</span></div>'
        : '<div class="row" style="margin-top:4px"><span class="chip on" data-act="do;beast_officer">封兽官（香火 30 · 俸禄 10/月）</span></div>';
    }
    return b;
  }
  EXT_ACT.beast_war = function (i) {
    var S = cur(), u = ui();
    var list = Array.isArray(S.barn) ? S.barn : [];
    i = parseInt(i, 10) || 0;
    if (i < 0 || i >= list.length) return;
    S.warBeast = i;
    u.toast('主战 · ' + list[i].name);
    EXT_ACT.beast();
    u.render();
  };

  /* ---------- 坞入口 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      if (!S || !S.started) return prev ? prev() : [];
      var w = war(S);
      var arr = prev ? prev() : [];
      arr.push({
        k: '兽', t: '兽栏', g: '修炼',
        s: w ? w.name + ' · ' + bondTier(w.bond).name : '空',
        act: 'do;beast'
      });
      return arr;
    };
  })();

})(window);
