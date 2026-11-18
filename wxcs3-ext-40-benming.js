/* 问道长生 · 本命法器（v9.0 M2）
   ============================================================
   一件法器认主，陪走一生。四阶：
     1 认主：加持翻倍（本命法器的 bonus 在 artBonus 里再算一遍）；
     2 通灵：解锁一条法技（战斗中 do;cbt:ext:bm_skill），月有温养之资；
     3 共命：战前可「本命出鞘」（do;bm_pre，替主挡一击），挡击与使用都会受损；
       受损 ≥80 反噬其主，须以修复重续；
     4 合道：与命格共鸣（剑命助剑、丹命助丹，余者助行功），且为物锚之稳。
   ------------------------------------------------------------
   约定照 wxcs3-ext-demo.js：状态 cur() 现取、动作注册 EXT_ACT、
   占旬动作（祭炼/修复）登记行动预算分档表、只做加法。
   数值口全部走注册表/缝口，不直接改 game.js 的数据。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function numOr(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  var TIER_NAMES = ['认主', '通灵', '共命', '合道'];
  var REFINE_STONES = 15;      // 祭炼一次的温养之资
  var REFINE_MIN = 20, REFINE_MAX = 30;   // 祭炼一次的熟练
  var REPAIR_STONES = 30;      // 修复一次
  var DMG_BAD = 80;            // 受损到这个数，法技失效、月月反噬

  function artOf(id) {
    var list = (G.WXCS3.D.ARTIFACT_EXT || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /* 认了主的法器必须还在身上，否则视为失落 */
  function bm() {
    var S = cur();
    if (!S || !S.benming) return null;
    if ((S.arts || []).indexOf(S.benming.artId) < 0) return null;
    return S.benming;
  }
  function bmEquipped() {
    var S = cur(), b = bm();
    if (!b) return false;
    var a = artOf(b.artId);
    return !!(a && a.slot && S.equipped && S.equipped[a.slot] === b.artId);
  }

  /* ---------- 缝口 1：认主＝本命加持翻倍 ----------
     game.js 的 artBonus 求和后调用本口；这里把本命法器自己的 bonus
     再交一遍，等价于「这一件翻倍」。须佩挂才生效。 */
  EXT.benmingArtBonus = function (kind) {
    var S = cur(), b = bm();
    if (!b || !bmEquipped()) return 0;
    var a = artOf(b.artId);
    if (!a || !a.bonus) return 0;
    return numOr(a.bonus[kind], 0);
  };

  /* ---------- 缝口 2：合道＝物锚之稳 ----------
     tickAnchors 每月问一句：物锚这期还用办吗。 */
  EXT.benmingAnchorStable = function () {
    var b = bm();
    return !!(b && (b.tier || 0) >= 4);
  };

  /* ---------- 注册表：合道与命格共鸣 ---------- */
  EXT.registerMul(function (kind, S) {
    var b = S && S.benming;
    if (!b || (b.tier || 0) < 4) return 1;
    var fid = S.fate ? S.fate.id : null;
    if (fid === 'yijian' && kind === 'sword') return 1.10;
    if (fid === 'danhuo' && kind === 'pill') return 1.10;
    if (kind === 'cult') return 1.05;
    return 1;
  });
  EXT.registerAdd(function (kind, S) {
    var b = S && S.benming;
    if (!b || (b.tier || 0) < 4) return 0;
    if (S.fate && S.fate.id === 'fuxin' && kind === 'book') return 1;
    return 0;
  });

  /* ---------- 月账：通灵起有温养之资 ---------- */
  EXT.fixedCosts2 = function () {
    var S = cur(), b = bm();
    if (!b || (b.tier || 0) < 2) return [];
    var stones = (b.tier || 0) >= 4 ? 12 : (b.tier || 0) >= 3 ? 8 : 6;
    return [{ id: 'benming_upkeep', name: '本命温养 · ' + (b.name || '本命法器'), stones: stones }];
  };

  /* ---------- 月结钩子：失落反噬 / 损伤反噬 ---------- */
  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    var S = cur(), u = ui();
    if (!S || !S.benming) return;
    /* 器已不在身上：共命以上有反噬，本命从此散了 */
    if ((S.arts || []).indexOf(S.benming.artId) < 0) {
      var lostTier = S.benming.tier || 0;
      if (lostTier >= 3) {
        S.hp = Math.max(1, Math.round(S.hp * 0.7));
        u.logLine('本命失落，心血倒涌——你喷出一口血。', 'danger');
      } else {
        u.logLine('本命已失落，这一段主契就此断了。', 'danger');
      }
      S.benming = null;
      return;
    }
    /* 受损过高：月月反噬 */
    if (numOr(S.benming.dmg, 0) >= DMG_BAD) {
      var bite = Math.max(1, Math.round(S.hpMax * 0.05));
      S.hp = Math.max(1, S.hp - bite);
      u.logLine('本命器身裂纹声声作响，气血倒流 −' + bite + '。', 'danger');
    }
  });

  /* ---------- 敌方回合钩子：本命出鞘挡击 ---------- */
  EXT.foeHooks = EXT.foeHooks || [];
  EXT.foeHooks.push(function (c, dmg) {
    if (!c || !c.bmVeil) return false;
    c.bmVeil = 0;
    var S = cur(), u = ui(), b = bm();
    if (b) {
      b.dmg = numOr(b.dmg, 0) + 18;
      u.logLine(escHtml(b.name || '本命法器') + '浮在身前，替你受了这一击（器损 +18）。', 'good');
      if (S.hp <= 0) { S.hp = 1; }
    }
    return true;   // 这一击没了
  });

  /* ---------- 我方面板：本命状态（v10.1 战斗可见性） ----------
     此前玩家看不到器损，也看不出「出鞘」是否还挂着，只好靠猜。
     与灵兽同一个钩子数组，渲染在状态行下方。 */
  EXT.fightInfoHooks = EXT.fightInfoHooks || [];
  EXT.fightInfoHooks.push(function (c) {
    var b = bm();
    if (!b) return '';
    var S = cur();
    var d = numOr(b.dmg, 0);
    var tierName = TIER_NAMES[Math.min(3, Math.max(0, (b.tier || 1) - 1))];
    var extra = '';
    if (c && c.bmVeil) extra += '　<span class="stance on">出鞘 · 待挡一击</span>';
    if (d >= DMG_BAD) extra += '　<span class="stance bad">裂纹过深 · 法技失效</span>';
    return '<div class="frow"><span class="k">本命</span><span class="v">' + escHtml(b.name || '本命法器') +
      '（' + escHtml(tierName) + '）　器损 ' + d + '/' + DMG_BAD + extra + '</span></div>';
  });

  /* ---------- 战前：共命阶「本命出鞘」（注册数组，多扩展并存） ---------- */
  EXT.preFightRowsHooks = EXT.preFightRowsHooks || [];
  EXT.preFightRowsHooks.push(function () {
    var S = cur(), b = bm();
    if (!S.combat || !b || (b.tier || 0) < 3) return '';
    if (S.combat.bmPreUsed) return '';
    return ui().optRow('器', '本命出鞘（' + escHtml(b.name || '') + '）', { name: '本命', cls: 'chance' },
      '下一击由它替你受，此后它有裂纹', false, 'do;bm_pre');
  });
  EXT_ACT.bm_pre = function () {
    var S = cur(), u = ui(), b = bm();
    if (!S.combat || !b || (b.tier || 0) < 3) return;
    S.combat.bmPreUsed = true;
    S.combat.bmVeil = 1;
    u.logLine('你把' + escHtml(b.name || '本命') + '悬在身前。它认得这个姿势。', 'good');
    u.closeModal(); u.render();
  };

  /* ---------- 战斗：通灵阶法技（注册数组） ---------- */
  EXT.fightRowsHooks = EXT.fightRowsHooks || [];
  EXT.fightRowsHooks.push(function () {
    var S = cur(), b = bm();
    if (!S.combat || !b || (b.tier || 0) < 2) return [];
    if (numOr(b.dmg, 0) >= DMG_BAD) {
      return [ui().optRow('器', '法技（器身裂纹，出不了手）', { name: '本命', cls: 'risk' },
        '先修器', true, '')];
    }
    return [ui().optRow('器', '法技 · ' + skillName(b), { name: '本命', cls: 'chance' },
      '灵力 12 · 器损 +6', S.mp < 12, 'do;cbt:ext:bm_skill')];
  });
  function skillName(b) {
    var a = artOf(b.artId);
    var slot = a ? a.slot : 'atk';
    return { atk: '器灵出鞘', body: '器灵护体', hit: '器灵照影', move: '器灵疾影' }[slot] || '器灵出鞘';
  }

  /* do_cbt 的 ext 分支（注册数组，与 beast 共用）：返回 {dmg,note} 或 'stop' */
  EXT.combatActHooks = EXT.combatActHooks || [];
  EXT.combatActHooks.push(function (arg, c) {
    var S = cur(), u = ui();
    if (arg !== 'bm_skill') return null;
    var b = bm();
    if (!b || (b.tier || 0) < 2 || numOr(b.dmg, 0) >= DMG_BAD) return null;
    if (S.mp < 12) { u.toast('灵力不足'); u.render(); return 'stop'; }
    S.mp -= 12;
    b.dmg = numOr(b.dmg, 0) + 6;
    var a = artOf(b.artId);
    var slot = a ? a.slot : 'atk';
    var dmg = 0, note = '';
    if (slot === 'atk') {
      dmg = Math.round(c.foe.hpMax * 0.16 * (0.9 + G.WXCS3.rng() * 0.2));
      note = '器灵出鞘，光如匹练';
    } else if (slot === 'body') {
      c.talShield = 0.30;
      note = '器灵护体，罩住周身';
    } else if (slot === 'hit') {
      c.observed = true;
      note = '器灵照影，破绽毕现';
    } else {
      dmg = Math.round(c.foe.hpMax * 0.10 * (0.9 + G.WXCS3.rng() * 0.2));
      c.talShield = 0.15;
      note = '器灵疾影，来去如风';
    }
    return { dmg: dmg, note: note + '（' + escHtml(b.name || '本命') + '）' };
  });

  /* ---------- 面板 ---------- */
  function panelHtml() {
    var S = cur(), u = ui(), b = bm();
    var body = '';
    if (!S.benming) {
      var cands = (S.arts || []).filter(function (id) {
        var a = artOf(id);
        return a && a.slot !== 'once';
      });
      if (!cands.length) {
        body += '<div class="small muted">身无长物——先得有一件可认主的法器。</div>';
      } else {
        body += '<div class="small">认主终身不换（器失则契断）。从这些里择一：</div>' + u.divider() + '<ul class="opts">';
        cands.slice(0, 6).forEach(function (id, i) {
          var a = artOf(id);
          body += u.optRow('ABCDEF'[i] || '·', a.name, { name: '法器', cls: 'chance' },
            (a.eff || '') + '　认主后加持翻倍', false, 'do;bm_pick:' + id);
        });
        body += '</ul>';
      }
      return { title: '本命 · 认主', body: body };
    }
    var a = artOf(b.artId);
    var tier = b.tier || 1;
    var xp = numOr(b.xp, 0), dmg = numOr(b.dmg, 0);
    body += '<div class="statline"><span class="k">本命</span><span class="v"><b>' + escHtml(b.name || (a && a.name) || '无名器') +
      '</b>（' + escHtml(a ? a.name : '失落') + '）</span></div>';
    body += '<div class="statline"><span class="k">阶位</span><span class="v">' + TIER_NAMES[tier - 1] +
      '　' + '·'.repeat(tier) + '</span></div>';
    body += '<div class="statline"><span class="k">祭炼</span><span class="v">' + Math.min(100, xp) + ' / 100' +
      (xp >= 100 ? '　<span class="good">已圆，可进阶</span>' : '') + '</span></div>';
    if (tier >= 3) {
      body += '<div class="statline"><span class="k">器损</span><span class="v ' + (dmg >= DMG_BAD ? 'danger' : '') + '">' + dmg + ' / ' + DMG_BAD +
        (dmg >= DMG_BAD ? '　反噬其主' : dmg >= 40 ? '　裂纹渐深' : '') + '</span></div>';
    }
    body += u.divider();
    var effs = ['认主：加持翻倍（须佩挂）'];
    if (tier >= 2) effs.push('通灵：法技「' + skillName(b) + '」，月温养之资');
    if (tier >= 3) effs.push('共命：战前可本命出鞘；器损过高反噬其主');
    if (tier >= 4) effs.push('合道：与命格共鸣；物锚之「物」不再误期');
    body += '<div class="small">' + effs.join('<br>') + '</div>';
    body += u.divider();
    body += '<ul class="opts">';
    var realmOk = tier === 1 ? true : tier === 2 ? S.xRealm >= 2 : S.xRealm >= 3;
    var realmTxt = tier === 2 ? '（须筑基）' : tier === 3 ? '（须紫府）' : '';
    body += u.optRow('·', '祭炼一次', { name: '温养', cls: 'peace' },
      '熟练 +' + REFINE_MIN + '~' + REFINE_MAX + ' · 一旬 · 灵石 −' + REFINE_STONES,
      S.stones < REFINE_STONES, 'do;bm_refine');
    if (tier < 4) {
      body += u.optRow('·', '进阶 → ' + TIER_NAMES[tier], { name: '进阶', cls: 'good' },
        realmOk ? '祭炼已圆即可' : '境界未至' + realmTxt,
        xp < 100 || !realmOk, 'do;bm_adv');
    }
    if (tier >= 3 && dmg > 0) {
      body += u.optRow('·', '修器', { name: '修复', cls: 'peace' },
        '器损归零 · 一旬 · 灵石 −' + REPAIR_STONES, S.stones < REPAIR_STONES, 'do;bm_repair');
    }
    body += '</ul>';
    body += '<div class="row" style="margin-top:8px"><span class="lab small muted">器名</span>' +
      '<input id="in-bm-name" value="' + escHtml(b.name || '') + '" maxlength="12" style="flex:1;min-width:120px">' +
      '<button class="btn ghost" data-act="do;bm_name">正名</button></div>';
    body += '<div class="hint">器是死的，人是活的——可它比人活得久。</div>';
    return { title: '本命法器', body: body };
  }
  EXT_ACT.bm = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var p = panelHtml();
    u.openModal(p.title, p.body);
  };

  EXT_ACT.bm_pick = function (id) {
    var S = cur(), u = ui();
    if (S.benming) { u.toast('已有本命'); return; }
    var a = artOf(id);
    if (!a || (S.arts || []).indexOf(id) < 0) { u.toast('身无此器'); return; }
    if (a.slot === 'once') { u.toast('一次性之物认不得主'); return; }
    S.benming = { artId: id, name: a.name, tier: 1, xp: 0, dmg: 0 };
    S.equipped = S.equipped || {};
    if (a.slot) S.equipped[a.slot] = id;   // 认主即佩挂
    u.logLine('你以血点睛，' + a.name + '嗡鸣一声——从今往后，它就是你。', 'good');
    u.toast('本命 · 认主');
    EXT_ACT.bm();
  };

  EXT_ACT.bm_refine = function () {
    var S = cur(), u = ui(), b = bm();
    if (!b) return;
    if (S.stones < REFINE_STONES) { u.toast('灵石不足'); return; }
    S.stones -= REFINE_STONES;
    u.advanceXun(1);
    b.xp = numOr(b.xp, 0) + REFINE_MIN + Math.round(G.WXCS3.rng() * (REFINE_MAX - REFINE_MIN));
    if (b.xp > 100) b.xp = 100;
    u.logLine('你以本命血温养' + escHtml(b.name || '本命') + '，器身渐通灵性。', 'good');
    EXT_ACT.bm();
    u.render();
  };

  EXT_ACT.bm_adv = function () {
    var S = cur(), u = ui(), b = bm();
    if (!b || (b.tier || 0) >= 4) return;
    var xp = numOr(b.xp, 0);
    if (xp < 100) { u.toast('祭炼未圆'); return; }
    var realmOk = b.tier === 1 ? true : b.tier === 2 ? S.xRealm >= 2 : S.xRealm >= 3;
    if (!realmOk) { u.toast('境界未至'); return; }
    b.tier = (b.tier || 1) + 1;
    b.xp = 0;
    u.logLine('本命进阶：' + TIER_NAMES[b.tier - 1] + '。' +
      ({ 2: '器灵初醒，可用法技。', 3: '器与命连，可替你受击——器损亦是你损。', 4: '器与你合，命格为之共鸣，物锚因它而稳。' }[b.tier] || ''), 'good');
    u.toast('本命 · ' + TIER_NAMES[b.tier - 1]);
    EXT_ACT.bm();
    u.render();
  };

  EXT_ACT.bm_repair = function () {
    var S = cur(), u = ui(), b = bm();
    if (!b) return;
    if (numOr(b.dmg, 0) <= 0) { u.toast('器身无损'); return; }
    if (S.stones < REPAIR_STONES) { u.toast('灵石不足'); return; }
    S.stones -= REPAIR_STONES;
    u.advanceXun(1);
    b.dmg = 0;
    u.logLine('你以温玉粉末填了裂纹，器身复光。', 'good');
    EXT_ACT.bm();
    u.render();
  };

  EXT_ACT.bm_name = function () {
    var S = cur(), u = ui(), b = bm();
    if (!b) return;
    var el = document.getElementById('in-bm-name');
    var v = el ? el.value.trim().slice(0, 12) : '';
    if (!v) { u.toast('总要有个名字'); return; }
    b.name = v;
    u.toast('正名 · ' + v);
    EXT_ACT.bm();
  };

  /* ---------- 坞入口：在构筑坞之后再排一个「器」 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      if (!S || !S.started) return prev ? prev() : [];
      var b = S.benming;
      var arr = prev ? prev() : [];
      /* 「器」已被 v8.1 神器坞位占用，本命用「命」 */
      arr.push({
        k: '命', t: '本命', g: '修炼',
        s: b ? ((b.name || '本命') + ' · ' + TIER_NAMES[(b.tier || 1) - 1]) : '未认主',
        act: 'do;bm'
      });
      return arr;
    };
  })();

})(window);
