/* 问道长生 · 本命法器（v10.7 阶段二 · 独立本命）
   ============================================================
   本轮把本命从「普通法器的认主」拆成独立的一件事：
     · 只有首次仙道筑基成功时，亲手铸一件（NATAL_FORMS 五器形）；
     · 不查炼器等级、不额外占旬、不再掷一次成功率——筑基已经掷过了；
     · 不进 S.arts、不占普通 atk/body/move 装备槽、不可出售；
     · 普通法器加成只由 artBonus() 算一遍（删除旧「认主翻倍」双向计账）。
   四阶沿用：
     1 认主：获得器形被动；
     2 通灵：解锁法技（战斗 do;cbt:ext:bm_skill），月有温养之资；
     3 共命：战前可「本命出鞘」（do;bm_pre）替你挡一击，挡击与使用都会受损；
        器损 ≥80 反噬其主；
     4 合道：与命格共鸣（剑命助剑、丹命助丹，余者助行功），且为物锚之稳。
   ------------------------------------------------------------
   状态结构 ver:2：
     {ver:2, form, el, name, tier, xp, dmg, quality, forgedRealm, skillsUsed, legacyArtId?}
   旧档迁移在 game.js 的 applyState → migrateBenming（一次性、幂等）。
   约定照 wxcs3-ext-demo.js：状态 cur() 现取、动作注册 EXT_ACT、
   占旬动作（祭炼/修复）登记行动预算分档表、只做加法。 */
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
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function forms() { return G.WXCS3.D.NATAL_FORMS || []; }
  function formOf(id) {
    var fs = forms();
    for (var i = 0; i < fs.length; i++) if (fs[i].id === id) return fs[i];
    return fs[0] || { id: 'sword', name: '本命飞剑', passive: '', skill: '器灵出鞘', skillCost: 12, skillDmg: 0.16, skillNote: '' };
  }
  function elName(el) {
    var D = G.WXCS3.D;
    var E = (D.ELEMENTS && D.ELEMENTS[el]) || (D.MUT_ELEMENTS && D.MUT_ELEMENTS[el]);
    return E ? E.name : '';
  }
  /* 五行候选：角色已有灵根优先；主修功法同属者也可选（不改灵根）。 */
  function elCandidates() {
    var S = cur();
    var out = [];
    (S.rootEls || []).forEach(function (e) {
      var D = G.WXCS3.D;
      if ((D.ELEMENTS && D.ELEMENTS[e]) || (D.MUT_ELEMENTS && D.MUT_ELEMENTS[e])) {
        if (out.indexOf(e) < 0) out.push(e);
      }
    });
    var pool = G.WXCS3.D.GONGFA || [];
    for (var i = 0; i < pool.length; i++) {
      if (S.gongfa && S.gongfa[0] === pool[i].id && pool[i].el) {
        if (out.indexOf(pool[i].el) < 0) out.push(pool[i].el);
        break;
      }
    }
    if (!out.length) out.push('metal');
    return out.slice(0, 5);
  }

  var TIER_NAMES = ['认主', '通灵', '共命', '合道'];
  var REFINE_STONES = 15;      // 祭炼一次的温养之资
  var REFINE_MIN = 20, REFINE_MAX = 30;   // 祭炼一次的熟练
  var REPAIR_STONES = 30;      // 修复一次
  var DMG_BAD = 80;            // 受损到这个数，法技失效、月月反噬

  /* 本命独立后不再依赖普通法器，只看自己的状态是否在 */
  function bm() {
    var S = cur();
    if (!S || !S.benming || typeof S.benming !== 'object') return null;
    return S.benming;
  }

  /* ---------- 器形被动（战斗缝口） ----------
     游戏侧只问三个口，本命内部按 form 分支；不把规则复制到下游动作里。 */
  EXT.natalDamageMul = function (sk, c) {
    var b = bm();
    if (!b) return 1;
    var mul = 1;
    if (b.form === 'sword' && sk && sk.kind === 'sword') mul *= 1.12;
    if (b.form === 'banner' && c && ((c.foeBurn || 0) > 0 || (c.foePoison || 0) > 0)) mul *= 1.15;
    return mul;
  };
  EXT.natalIncomingMul = function (c) {
    var b = bm();
    if (!b) return 1;
    if (b.form === 'bell') return 0.94;
    return 1;
  };
  EXT.natalOnCombatStart = function (c) {
    var b = bm();
    if (!b || !c) return;
    /* 宝镜：开战即照见破绽（下一击无视卸力并增伤） */
    if (b.form === 'mirror') c.observed = true;
  };

  /* ---------- 缝口：合道＝物锚之稳 ----------
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

  /* ---------- 月结钩子：器损反噬 ---------- */
  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    var S = cur(), u = ui(), b = bm();
    if (!b) return;
    /* 器损过高：月月反噬。本命不再「失落」——它不是从 S.arts 里捡来的一件，
       不会因为卖掉/收起某件普通法器就整段契断。 */
    if (numOr(b.dmg, 0) >= DMG_BAD) {
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

  /* ---------- 我方面板：本命状态（战斗可见性） ---------- */
  EXT.fightInfoHooks = EXT.fightInfoHooks || [];
  EXT.fightInfoHooks.push(function (c) {
    var b = bm();
    if (!b) return '';
    var d = numOr(b.dmg, 0);
    var tierName = TIER_NAMES[Math.min(3, Math.max(0, (b.tier || 1) - 1))];
    var extra = '';
    if (c && c.bmVeil) extra += '　<span class="stance on">出鞘 · 待挡一击</span>';
    if (d >= DMG_BAD) extra += '　<span class="stance bad">裂纹过深 · 法技失效</span>';
    return '<div class="frow"><span class="k">本命</span><span class="v">' + escHtml(b.name || '本命法器') +
      '（' + escHtml(tierName) + '·' + escHtml(elName(b.el)) + '）　器损 ' + d + '/' + DMG_BAD + extra + '</span></div>';
  });

  /* ---------- 战前：共命阶「本命出鞘」 ---------- */
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

  /* ---------- 战斗：通灵阶法技（按器形分支） ---------- */
  EXT.fightRowsHooks = EXT.fightRowsHooks || [];
  EXT.fightRowsHooks.push(function () {
    var S = cur(), b = bm();
    if (!S.combat || !b || (b.tier || 0) < 2) return [];
    var f = formOf(b.form);
    if (numOr(b.dmg, 0) >= DMG_BAD) {
      return [ui().optRow('器', '法技（器身裂纹，出不了手）', { name: '本命', cls: 'risk' },
        '先修器', true, '')];
    }
    return [ui().optRow('器', '法技 · ' + f.skill, { name: '本命', cls: 'chance' },
      '灵力 ' + f.skillCost + ' · 器损 +6', S.mp < f.skillCost, 'do;cbt:ext:bm_skill')];
  });

  /* do_cbt 的 ext 分支（注册数组，与 beast 共用）：返回 {dmg,note} 或 'stop' */
  EXT.combatActHooks = EXT.combatActHooks || [];
  EXT.combatActHooks.push(function (arg, c) {
    var S = cur(), u = ui();
    if (arg !== 'bm_skill') return null;
    var b = bm();
    if (!b || (b.tier || 0) < 2 || numOr(b.dmg, 0) >= DMG_BAD) return null;
    var f = formOf(b.form);
    var cost = numOr(f.skillCost, 12);
    if (S.mp < cost) { u.toast('灵力不足'); u.render(); return 'stop'; }
    S.mp -= cost;
    b.dmg = numOr(b.dmg, 0) + 6;
    b.skillsUsed = numOr(b.skillsUsed, 0) + 1;
    var dmg = 0, note = '';
    if (b.form === 'sword') {
      dmg = Math.round(c.foe.hpMax * numOr(f.skillDmg, 0.18) * (0.9 + G.WXCS3.rng() * 0.2));
      if ((c.foeMark || 0) > 0) { dmg = Math.round(dmg * 1.15); note = '剑魄斩破绽，血光更长；'; }
      note += '剑魄斩，光如匹练';
    } else if (b.form === 'seal') {
      dmg = Math.round(c.foe.hpMax * numOr(f.skillDmg, 0.10) * (0.9 + G.WXCS3.rng() * 0.2));
      /* v10.7 阶段三：法印对蓄力之敌更稳——蓄力时直接打断（进入定神），
         非蓄力时压制 2 回合（器形被动：所施加压制延长 1 回合）。走统一状态入口。 */
      if (c.foeIntent && c.foeIntent.type === 'charge') {
        G.WXCS3.applyCombatEffect('foe', { type: 'interrupt' }, c);
        note = '镇岳印打断其蓄力！';
      } else {
        G.WXCS3.applyCombatEffect('foe', { type: 'weaken', turns: 2 }, c);
        note = '镇岳印压下其势（压制 2 回合）';
      }
    } else if (b.form === 'mirror') {
      dmg = Math.round(c.foe.hpMax * numOr(f.skillDmg, 0.06) * (0.9 + G.WXCS3.rng() * 0.2));
      c.observed = true;
      c.foeMark = Math.max(c.foeMark || 0, 2);
      note = '照影——破绽毕现（下一击无视卸力）';
    } else if (b.form === 'bell') {
      G.WXCS3.applyCombatEffect('me', { type: 'shield', v: 0.30 }, c);
      note = '钟鸣护体，罩住周身（下次受击减伤 30%）';
    } else { /* banner */
      dmg = Math.round(c.foe.hpMax * numOr(f.skillDmg, 0.12) * (0.9 + G.WXCS3.rng() * 0.2));
      /* v10.7 阶段三：灼烧走统一入口，点火当回合不落伤（与术法/符箓口径一致） */
      G.WXCS3.applyCombatEffect('foe', { type: 'burn', turns: 2, mul: 1 }, c);
      note = '摄魂幡招来余焰（灼烧 2 回合）';
    }
    return { dmg: dmg, note: note + '（' + escHtml(b.name || '本命') + '）' };
  });

  /* ============================================================
     筑基锻造仪式：择器形 → 择五行 → 正名 → 预览法技 → 确认
     就地三屏，不占旬、不查炼器、不掷成功率。
     ============================================================ */
  var forgeDraft = null;   // 内存态：未完成时读档会重新从「择器形」开始

  function natalLine() {
    return '<div class="hint">本命终身一件：不占普通兵器，不可出售。器损过深会反噬其主。</div>';
  }

  function renderForgeForm() {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var b = '<div class="small">筑基既成，气海里有一团未成形的胚。你亲手铸一件本命——<b>终身只有这一件</b>。</div>';
    b += '<div class="small muted" style="margin:4px 0">不查炼器火候，也不再掷成败：你已经过了筑基这一关。器形定终身，先想清楚。</div>';
    b += u.divider() + '<ul class="opts">';
    forms().forEach(function (f, i) {
      b += u.optRow('ABCDE'[i] || '·', f.name, { name: '器形', cls: 'chance' },
        f.passive + '　法技「' + f.skill + '」', false, 'do;bm_forgeForm:' + f.id);
    });
    b += '</ul>';
    b += '<div class="hint">飞剑主杀 · 法印主控 · 宝镜主识 · 神钟主守 · 魂幡主持续。</div>';
    u.openModal('本命 · 择器形', b, true);
  }

  function renderForgeEl() {
    var S = cur(), u = ui();
    var d = forgeDraft;
    if (!d || !d.form) { renderForgeForm(); return; }
    var f = formOf(d.form);
    var b = '<div class="small">器形已定：<b>' + escHtml(f.name) + '</b>。' + escHtml(f.desc) + '</div>';
    b += '<div class="small muted" style="margin:4px 0">再定主五行。候选取自你的灵根与主修功法，仪式不会改动灵根。</div>';
    b += u.divider() + '<ul class="opts">';
    elCandidates().forEach(function (e, i) {
      b += u.optRow('ABCDE'[i] || '·', elName(e) + '属', { name: '五行', cls: 'peace' },
        '本命归' + elName(e) + '；' + elName(e) + '生克照常', false, 'do;bm_forgeEl:' + e);
    });
    b += '</ul>';
    b += '<div class="hint">五行只定这一件的底色，不改你的灵根，也不改功法。</div>';
    u.openModal('本命 · 择主五行', b, true);
  }

  function defaultNatalName(d) {
    var f = formOf(d.form);
    var bare = String(f.name || '本命').replace('本命', '');
    return bare + '·' + elName(d.el);
  }

  function renderForgeName() {
    var S = cur(), u = ui();
    var d = forgeDraft;
    if (!d || !d.form || !d.el) { renderForgeForm(); return; }
    var f = formOf(d.form);
    var nm = d.name || defaultNatalName(d);
    var b = '<div class="small">器胚已成，只差一个名字。<b>' + escHtml(f.name) + ' · ' + escHtml(elName(d.el)) + '属</b></div>';
    b += '<div class="row" style="margin:8px 0"><span class="lab small muted">器名</span>' +
      '<input id="in-natal-name" value="' + escHtml(nm) + '" maxlength="12" style="flex:1;min-width:120px"></div>';
    b += u.divider();
    b += '<div class="small"><b>认主被动</b>　' + escHtml(f.passive) + '</div>';
    b += '<div class="small"><b>通灵法技</b>　' + escHtml(f.skill) + '　' + escHtml(f.skillNote) +
      '（灵力 ' + f.skillCost + ' · 器损 +6）</div>';
    b += '<div class="small muted" style="margin-top:4px">四阶：认主 → 通灵（法技）→ 共命（出鞘挡击）→ 合道（命格共鸣、物锚之稳）。</div>';
    b += '<div style="margin-top:10px;display:flex;gap:8px">' +
      '<button class="btn" data-act="do;bm_forgeDo">就此铸成</button>' +
      '<button class="btn ghost" data-act="do;bm_forgeBack">重择器形</button></div>';
    b += natalLine();
    u.openModal('本命 · 正名与法技', b, true);
  }

  EXT_ACT.bm_forgeForm = function (id) {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (S.benming) { u.toast('本命已铸'); return; }
    var f = formOf(id);
    if (!f || f.id !== id) { u.toast('无此器形'); return; }
    forgeDraft = forgeDraft || {};
    forgeDraft.form = id;
    renderForgeEl();
  };
  EXT_ACT.bm_forgeEl = function (el) {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (!forgeDraft || !forgeDraft.form) { renderForgeForm(); return; }
    var D = G.WXCS3.D;
    if (!((D.ELEMENTS && D.ELEMENTS[el]) || (D.MUT_ELEMENTS && D.MUT_ELEMENTS[el]))) { u.toast('无此五行'); return; }
    forgeDraft.el = el;
    renderForgeName();
  };
  EXT_ACT.bm_forgeBack = function () {
    var d = forgeDraft;
    if (d) { d.el = null; d.name = ''; }
    renderForgeForm();
  };
  EXT_ACT.bm_forgeDo = function () {
    var S = cur(), u = ui(), d = forgeDraft;
    if (!S || !S.started) return;
    if (S.benming) { u.toast('本命已铸，终身不换'); return; }
    if (!d || !d.form || !d.el) { u.toast('器形与五行尚未定'); return; }
    var el = document.getElementById('in-natal-name');
    var nm = (el && el.value ? String(el.value).trim().slice(0, 12) : '') || defaultNatalName(d);
    var f = formOf(d.form);
    S.benming = {
      ver: 2,
      form: d.form,
      el: d.el,
      name: nm,
      tier: 1,
      xp: 0,
      dmg: 0,
      quality: 'normal',
      forgedRealm: clamp(parseInt(S.xRealm, 10) || 2, 1, 9),
      skillsUsed: 0
    };
    forgeDraft = null;
    u.logLine('你以血点睛，' + escHtml(nm) + '（' + escHtml(f.name) + '·' + escHtml(elName(S.benming.el)) +
      '）嗡鸣一声——从今往后，它就是你。', 'good');
    u.toast('本命 · 认主');
    u.closeModal();
    /* 回到破境队列（仙基 → 锻造 → 道印 → 神通 → 命格） */
    if (typeof G.WXCS3.afterBreakDone === 'function') { G.WXCS3.afterBreakDone('forge'); return; }
    u.render();
  };

  /* 供 game.js 的破境队列调用 */
  EXT.openNatalForge = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return false;
    if (S.benming) {
      u.toast('本命已铸，终身不换');
      if (typeof G.WXCS3.afterBreakDone === 'function') G.WXCS3.afterBreakDone('forge');
      return true;
    }
    if (S.cultivation === 'shen') {
      /* 纯神道不强制插入仙道仪式 */
      u.toast('神道自有香火权柄，不铸仙道本命');
      if (typeof G.WXCS3.afterBreakDone === 'function') G.WXCS3.afterBreakDone('forge');
      return true;
    }
    if ((parseInt(S.xRealm, 10) || 0) < 2) { u.toast('尚未筑基，铸不出本命'); return false; }
    forgeDraft = { form: null, el: null, name: '' };
    renderForgeForm();
    return true;
  };
  /* 面板上的「补铸」入口：筑基以上、从未有本命的仙道旧档 */
  EXT_ACT.bm_forge = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (S.benming) { u.toast('本命已铸'); return; }
    if (S.cultivation === 'shen') { u.toast('神道不铸仙道本命'); return; }
    if ((parseInt(S.xRealm, 10) || 0) < 2) { u.toast('筑基时可铸'); return; }
    forgeDraft = { form: null, el: null, name: '' };
    renderForgeForm();
  };

  /* ---------- 面板 ---------- */
  function panelHtml() {
    var S = cur(), u = ui(), b = bm();
    var body = '';
    if (!b) {
      if (S.cultivation === 'shen') {
        body += '<div class="small">神道自有香火权柄，不铸仙道本命。</div>';
      } else if ((parseInt(S.xRealm, 10) || 0) < 2) {
        body += '<div class="small">本命只在<b>首次筑基</b>时亲手铸一件。</div>';
        body += '<div class="muted small" style="margin-top:4px">筑基时可铸——在此之前，任何普通法器都不会认主。</div>';
      } else {
        body += '<div class="small">你已经筑基，却没有本命。可<b>补铸</b>一次（不重发破境奖励）。</div>';
        body += '<ul class="opts">' + u.optRow('·', '补铸本命', { name: '锻造', cls: 'chance' },
          '择器形 → 择五行 → 正名', false, 'do;bm_forge') + '</ul>';
      }
      body += natalLine();
      return { title: '本命法器', body: body };
    }
    var f = formOf(b.form);
    var tier = b.tier || 1;
    var xp = numOr(b.xp, 0), dmg = numOr(b.dmg, 0);
    body += '<div class="statline"><span class="k">本命</span><span class="v"><b>' + escHtml(b.name || f.name) +
      '</b>（' + escHtml(f.name) + '·' + escHtml(elName(b.el)) + '）</span></div>';
    body += '<div class="statline"><span class="k">阶位</span><span class="v">' + TIER_NAMES[tier - 1] +
      '　' + '·'.repeat(tier) + '</span></div>';
    body += '<div class="statline"><span class="k">祭炼</span><span class="v">' + Math.min(100, xp) + ' / 100' +
      (xp >= 100 ? '　<span class="good">已圆，可进阶</span>' : '') + '</span></div>';
    if (tier >= 2) {
      body += '<div class="statline"><span class="k">器损</span><span class="v ' + (dmg >= DMG_BAD ? 'danger' : '') + '">' + dmg + ' / ' + DMG_BAD +
        (dmg >= DMG_BAD ? '　反噬其主' : dmg >= 40 ? '　裂纹渐深' : '') + '</span></div>';
    }
    body += u.divider();
    var effs = ['认主：' + f.passive];
    if (tier >= 2) effs.push('通灵：法技「' + f.skill + '」——' + f.skillNote + '；月温养之资');
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
    body += natalLine();
    return { title: '本命法器', body: body };
  }
  EXT_ACT.bm = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var p = panelHtml();
    u.openModal(p.title, p.body);
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
        s: b ? ((b.name || '本命') + ' · ' + TIER_NAMES[Math.min(3, Math.max(0, (b.tier || 1) - 1))])
          : ((parseInt(S.xRealm, 10) || 0) >= 2 && S.cultivation !== 'shen' ? '待补铸' : '筑基时可铸'),
        act: 'do;bm'
      });
      return arr;
    };
  })();

})(window);