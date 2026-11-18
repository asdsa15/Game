/* 问道长生 · 时限事件与属性分档（v9.0 M3）
   ============================================================
   事件不再全部随机等概率。故人生辰、宗门大比、遗迹开启、旧仇约期、疫病济世
   各有自己的月份与条件；挂起后在本月内可赴，错过只改关系与资源，不卡主线。
   属性在这里进入文本与选项：
     神识 ≥13：看见当事人来意、拍品隐藏的价；
     仙缘 ≥13：旧仇/遗迹多一条特殊路线（不保证好结果）；
     遁速 ≥13：连夜赶路，不占旬，但伤气血；
     道心 ≥13：论道时多一个「问心」选项；
     悟性 ≥13：遗迹开启的时辰看得出被人算过（劫类提示）；
     资质：仍只提高同旬修炼产出（game.js monthXiuwei 既有公式）。
   ------------------------------------------------------------ */
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
  function stat(S, k) { return numOr((S.stats || {})[k], 0); }
  function clampFav(v) { return Math.max(0, Math.min(120, v)); }
  function ledgerOut(label, amount) {
    var S = cur();
    S.ledger = S.ledger || { income: [], expense: [] };
    if (!Array.isArray(S.ledger.expense)) S.ledger.expense = [];
    S.ledger.expense.push({ label: label, amount: amount });
  }
  function addRep(n) {
    var S = cur();
    if (!S || !S.school) return;
    S.school.rep = Math.max(0, numOr(S.school.rep, 0) + n);
  }

  /* ---------- 人：故人生辰用好感最高且还活着的那位 ---------- */
  function pickSoul(S) {
    var D = ui().D;
    var best = null;
    Object.keys(S.npcs || {}).forEach(function (id) {
      var r = S.npcs[id];
      if (!r || !r.met || r.alive === false) return;
      if (numOr(r.fav, 0) < 40) return;
      var n = (D.NPC_POOL || []).filter(function (x) { return x.id === id; })[0];
      if (!n) return;
      if (!best || numOr(r.fav, 0) > numOr(best.rec.fav, 0)) best = { id: id, n: n, rec: r };
    });
    return best;
  }

  /* ---------- 事件表：月份、年周期、条件、赴约/错过 ---------- */
  var EVENTS = [
    {
      id: 'birthday', name: '故人生辰', month: 7,
      desc: '门缝里压着一张帖子：故人生辰，请你过府一叙。',
      secret: '你看出帖上的墨是今天才干的——不是忘了送，是犹豫了很久才送。',
      missNote: '不去，对方会记得。',
      cond: function (S) { return !!pickSoul(S); },
      cost: { stones: 50 },
      attend: function (S) {
        var p = pickSoul(S);
        if (!p) return '你赶到时，席已经散了。';
        p.rec.fav = clampFav(numOr(p.rec.fav, 0) + 8);
        return '你把礼物放下。' + p.n.name + '看了一眼，没说什么，给你满了一杯。';
      },
      miss: function (S) {
        var p = pickSoul(S);
        if (!p) return '故人生辰，你没有去。';
        p.rec.fav = clampFav(numOr(p.rec.fav, 0) - 3);
        return p.n.name + '的生辰过了。席上留了一个空位，后来被别人坐了。';
      }
    },
    {
      id: 'sect_meet', name: '宗门大比', month: 6,
      desc: '宗门大比开了擂台。同门都在看，长老也在看。',
      secret: '你看出台上那几位看你的眼神，不像在看一个弟子。',
      missNote: '不去，位次会被别人顶上去。',
      cond: function (S) { return !!S.sect; },
      attend: function (S) {
        S.fame = numOr(S.fame, 0) + 8;
        if (S.sect) S.sect.contrib = numOr(S.sect.contrib, 0) + 10;
        return '你在擂台上站到了最后一场。声望 +8，宗门贡献 +10。';
      },
      miss: function (S) {
        S.fame = Math.max(0, numOr(S.fame, 0) - 2);
        return '大比散了。你的名字没出现在榜上，声望 −2。';
      }
    },
    {
      id: 'ruin_open', name: '遗迹开启', month: 9,
      yearMod: 1,
      desc: '西边的山壁裂了一道门。有人说是上古洞府，三日后合上。',
      secret: '你看出山壁上的符纹是新的——这一处，才被人动过。',
      insightHint: '你看这开启的时辰，像是有人预先算过。里面未必只有机缘。',
      missNote: '错过就是错过，遗迹不等人。',
      cond: function (S) { return numOr(S.xRealm, 0) >= 2; },
      attend: function (S) {
        S.hp = Math.max(1, S.hp - 15);
        S.stones = numOr(S.stones, 0) + 300;
        addRep(5);
        return '你从塌了一半的甬道里出来，怀里多了些东西，背上多了一道口子。灵石 +300' +
          (S.school ? '，道统声望 +5' : '') + '。';
      },
      miss: function () { return '山壁合上了。后来有人在里面找到半截剑，不是你。'; },
      fate: {
        label: '循仙缘深入',
        note: '仙缘 ≥ 13',
        effect: function (S) {
          if (ui().rng() < 0.5) {
            S.stones = numOr(S.stones, 0) + 800;
            return '你没有走正路。仙缘引你穿过一道不该存在的门，里面静得像另一个人的梦。灵石 +800。';
          }
          S.hp = Math.max(1, S.hp - 40);
          S.stones = numOr(S.stones, 0) + 100;
          return '门后不是宝库。你退出来时，气血逆冲，只带出一块温热的石头。';
        }
      }
    },
    {
      id: 'old_feud', name: '旧仇约期', month: 11,
      desc: '旧仇把约期写在闹市：十一月，城西，只你一人来。',
      secret: '你看出约期故意写在人多的地方——他要的是让人看见。',
      missNote: '不去，这笔账会跟着你过冬。',
      cond: function (S) { return !!S.enemy || numOr(S.karma, 0) >= 30; },
      attend: function (S) {
        S.hp = Math.max(1, S.hp - 20);
        S.karma = Math.max(0, numOr(S.karma, 0) - 10);
        S.enemy = false;
        S.fame = numOr(S.fame, 0) + 6;
        return '城西没有旁人。你们把话说完了，也把账算了。声望 +6，业力 −10。';
      },
      miss: function () { return '你没有去。城西那盏灯亮了一夜，第二天灭了。'; },
      fate: {
        label: '以仙缘化敌',
        note: '仙缘 ≥ 13',
        cost: { stones: 200 },
        effect: function (S) {
          S.enemy = false;
          S.karma = Math.max(0, numOr(S.karma, 0) - 15);
          S.fame = numOr(S.fame, 0) + 3;
          return '你没有拔剑。你说了一个只有你们两人听得懂的名字。他走了，账也走了。';
        }
      }
    },
    {
      id: 'plague_aid', name: '疫病济世', month: 8,
      desc: '山下起了疫病。有人跪在山门外，求你出手。',
      secret: '你看出病气里有术法的手笔，不是天灾。',
      missNote: '不去，道统的名声也会跟着病。',
      cond: function (S) { return !!S.school; },
      cost: { stones: 60 },
      attend: function (S) {
        S.merit = numOr(S.merit, 0) + 8;
        S.fame = numOr(S.fame, 0) + 4;
        addRep(5);
        return '你熬了七夜的药。疫病退了，山门外多了几双肯抬头看匾的眼睛。功德 +8，声望 +4/道统 +5。';
      },
      miss: function (S) {
        addRep(-2);
        return '你没有出手。疫病过去了，山门外的议论也过去了——只是没人再提你的名字。道统声望 −2。';
      }
    }
  ];
  function defOf(id) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
    return null;
  }
  EXT.timedEvents = EVENTS;
  EXT.timedInfo = function () {
    var S = cur();
    if (!S || !S.timed) return null;
    var ev = defOf(S.timed.id);
    return ev ? { id: ev.id, name: ev.name, exp: S.timed.exp } : null;
  };

  /* ---------- 月结：先结算过期，再看本月有没有事 ---------- */
  function doMiss(pending) {
    var ev = defOf(pending.id);
    if (!ev) return;
    var txt = ev.miss ? ev.miss(cur()) : '你错过了' + pending.name + '。';
    ui().logLine(txt, 'danger');
  }
  function pruneDone(S) {
    var done = S.timedDone || {};
    var keys = Object.keys(done);
    if (keys.length <= 80) return;
    var floor = numOr(S.year, 0) - 3;
    keys.forEach(function (k) {
      var y = parseInt(String(k).split(':').pop(), 10);
      if (isFinite(y) && y < floor) delete done[k];
    });
  }
  EXT.timedMonth = function () {
    var S = cur();
    if (!S || !S.started || S.phase !== 'play') return;
    if (S.timed && numOr(S.turn, 0) > numOr(S.timed.exp, 0)) {
      doMiss(S.timed);
      S.timed = null;
    }
    if (S.timed) return;
    S.timedDone = S.timedDone || {};
    for (var i = 0; i < EVENTS.length; i++) {
      var ev = EVENTS[i];
      if (S.month !== ev.month) continue;
      if (ev.yearMod != null && ((numOr(S.year, 0) % 3) + 3) % 3 !== ev.yearMod) continue;
      var key = ev.id + ':' + S.year;
      if (S.timedDone[key]) continue;
      var ok = true;
      try { ok = !!ev.cond(S); } catch (e) { ok = false; }
      if (!ok) continue;
      S.timed = { id: ev.id, name: ev.name, exp: numOr(S.turn, 0) };
      S.timedDone[key] = 1;
      pruneDone(S);
      ui().logLine('有约在即：' + ev.name + '。本月之内可赴。', '');
      break;
    }
  };

  /* ---------- 面板 ---------- */
  function costStones(ev, kind) {
    var c = kind === 'fate' ? (ev.fate && ev.fate.cost) : ev.cost;
    return (c && numOr(c.stones, 0)) || 0;
  }
  EXT_ACT.tm = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (!S.timed) { u.toast('眼下没有等着的事'); return; }
    var ev = defOf(S.timed.id);
    if (!ev) { S.timed = null; return; }
    var b = '<div class="small">' + esc(ev.desc) + '</div>' + u.divider();
    b += '<div class="statline"><span class="k">期限</span><span class="v">本月之内</span></div>';
    if (stat(S, 'sense') >= 13 && ev.secret) {
      b += '<div class="small" style="color:var(--merit)">' + esc(ev.secret) + '</div>';
    }
    if (stat(S, 'insight') >= 13 && ev.insightHint) {
      b += '<div class="small" style="color:var(--danger)">' + esc(ev.insightHint) + '</div>';
    }
    b += u.divider() + '<ul class="opts">';
    var goCost = costStones(ev, 'go');
    b += u.optRow('A', '赴约', { name: '赴约', cls: 'chance' },
      (goCost ? goCost + ' 石 · ' : '') + '占 1 旬', S.stones < goCost, 'do;tm_go');
    if (stat(S, 'speed') >= 13) {
      b += u.optRow('B', '连夜赶路', { name: '遁速', cls: 'chance' },
        '不占旬 · 气血 −8', S.stones < goCost, 'do;tm_rush');
    }
    if (ev.fate && stat(S, 'fate') >= 13) {
      var fCost = costStones(ev, 'fate');
      b += u.optRow('C', ev.fate.label, { name: '仙缘', cls: 'chance' },
        ev.fate.note + (fCost ? ' · ' + fCost + ' 石' : '') + ' · 占 1 旬', S.stones < fCost, 'do;tm_fate');
    }
    b += u.optRow('D', '不去', { name: '错过', cls: 'risk' },
      ev.missNote || '错过会改变关系与资源', false, 'do;tm_skip');
    b += '</ul>';
    b += '<div class="hint">错过不卡主线，只是账会记在别处。</div>';
    u.openModal('时限 · ' + ev.name, b);
  };

  function pay(ev, kind) {
    var S = cur(), u = ui();
    var cost = costStones(ev, kind);
    if (cost > 0) {
      if (S.stones < cost) { u.toast('灵石不足'); return false; }
      S.stones -= cost;
      ledgerOut((kind === 'fate' ? ev.fate.label : ev.name) + '（赴约）', cost);
    }
    return true;
  }
  function settle(kind) {
    var S = cur(), u = ui();
    if (!S || !S.timed) return null;
    var ev = defOf(S.timed.id);
    if (!ev) { S.timed = null; return null; }
    if (!pay(ev, kind)) return null;
    var txt;
    if (kind === 'fate' && ev.fate) txt = ev.fate.effect(S);
    else txt = ev.attend(S);
    S.timed = null;
    u.logLine(txt, 'good');
    return true;
  }

  EXT_ACT.tm_go = function () {
    var S = cur(), u = ui();
    if (!S || !S.started || !S.timed) return;
    if (!settle('go')) return;
    u.closeModal();
    u.advanceXun(1);
    u.render();
  };

  EXT_ACT.tm_rush = function () {
    var S = cur(), u = ui();
    if (!S || !S.started || !S.timed) return;
    if (stat(S, 'speed') < 13) { u.toast('遁速不足，赶不上'); return; }
    if (!settle('go')) return;
    S.hp = Math.max(1, S.hp - 8);
    u.logLine('你连夜赶路，鞋底磨穿了。事情办完，人还在喘。', 'good');
    u.closeModal();
    u.render();
  };

  EXT_ACT.tm_fate = function () {
    var S = cur(), u = ui();
    if (!S || !S.started || !S.timed) return;
    var ev = defOf(S.timed.id);
    if (!ev || !ev.fate) { u.toast('此事没有那条路'); return; }
    if (stat(S, 'fate') < 13) { u.toast('仙缘未至'); return; }
    if (!settle('fate')) return;
    u.closeModal();
    u.advanceXun(1);
    u.render();
  };

  EXT_ACT.tm_skip = function () {
    var S = cur(), u = ui();
    if (!S || !S.started || !S.timed) return;
    var pending = S.timed;
    S.timed = null;
    doMiss(pending);
    u.closeModal();
    u.render();
  };

  /* ---------- 属性分档：神识 / 仙缘外的那几口 ---------- */
  EXT.npcIntentLine = function (n, rec) {
    var S = cur();
    if (!S || stat(S, 'sense') < 13) return '';
    var fav = numOr(rec && rec.fav, 0);
    var line = fav < 0
      ? '你看出来：袖口绷得太紧，这一趟不只是叙旧。'
      : fav < 40
        ? '你看出来：此来有事，只是还没想好怎么开口。'
        : '你看出来：无事。只是来看看你还在不在。';
    return '<div class="small" style="color:var(--merit)">' + line + '</div>';
  };

  /* 高神识：拍品之外的价 */
  EXT.auctionHint = function (lot) {
    var S = cur();
    if (!S || stat(S, 'sense') < 13 || !lot) return '';
    return '<div class="small" style="color:var(--merit)">你看出这件「' + esc(lot.name) +
      '」真正的价不在器物本身——底座那一层包浆，比台上喊的数老得多。</div>';
  };

  /* 高道心：论道多一个「问心」选项 */
  EXT.askExtraRows = function (n, id) {
    var S = cur();
    if (!S || stat(S, 'heart') < 13) return '';
    var rec = (S.npcs || {})[id];
    if (rec && rec.heartAsked) return '';
    return ui().optRow('D', '问心', { name: '道心', cls: 'peace' },
      '道心 ≥ 13 · 反过来问他一句', false, 'do;heartans:' + id);
  };
  EXT_ACT.heartans = function (id) {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var D = u.D;
    var n = (D.NPC_POOL || []).filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    var rec = (S.npcs || {})[id];
    if (!rec) { u.toast('尚未见过此人'); return; }
    rec.heartAsked = true;
    rec.fav = clampFav(numOr(rec.fav, 0) + 6);
    S.tally = S.tally || {};
    var talks = S.tally.talk = (S.tally.talk && typeof S.tally.talk === 'object') ? S.tally.talk : {};
    talks[id] = (talks[id] || 0) + 1;
    if (EXT.schoolOnTalk) EXT.schoolOnTalk(n, id);
    u.logLine('你问' + n.name + '：「那你呢？」其沉默了一会儿，说了一个你没想到的答案。好感 +6。', '');
    u.closeModal();
    u.advanceXun(1);
    u.render();
  };

  /* ---------- 月结钩子 ---------- */
  EXT.onMonthHooks = EXT.onMonthHooks || [];
  EXT.onMonthHooks.push(function () {
    EXT.timedMonth();
  });

  /* ---------- 坞入口：急事排最前 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      var arr = prev ? prev() : [];
      if (!S || !S.started) return arr;
      if (S.timed) {
        arr.unshift({ k: '急', t: S.timed.name, g: '常用', s: '本月内可赴', act: 'do;tm' });
      }
      return arr;
    };
  })();

})(window);
