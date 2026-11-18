/* 问道长生 · 百世道果（v9.0 M4）
   ============================================================
   一世结束时，按「这一世主要做了什么」结一枚道果，带到下一世创角。
   原则：只改信息、候选与初始关系；唯一带月账的是旧庙残香。
     · 四艺突出 → 一张起步配方
     · 道统/师徒 → 一封旧部来信（初始关系，不送满级弟子）
     · 神道功德 → 一处旧庙还有残香（少量信众/香火 + 每月香火责任）
     · 魔道血债 → 一个早期仇家 + 血债命格候选
     · 遗迹道书 → 一处遗迹方位或一页道书
     · 逍遥无功 → 命格候选多一道，不附带组织负担
   ------------------------------------------------------------
   道果在 do_legacy / do_rebor 里取快照（fruitSnapshot），
   在 finishCreate 里兑现（applyFruit）。空手投胎也带得走——
   它不是遗产，是「世界记得你」。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }
  function esc(s) { return ui().esc(String(s == null ? '' : s)); }

  var KINDS = {
    craft: { label: '丹火余温', note: '开局多一张四艺配方' },
    school: { label: '门墙旧信', note: '开局收到一封旧部来信，多一个故人' },
    shen: { label: '残香旧庙', note: '一处旧庙仍有信众，但每月要出一份香火' },
    blood: { label: '血途旧怨', note: '开局多一个仇家，破境时多见一道血债命格' },
    relic: { label: '古径残图', note: '开局得到一处遗迹方位或一页道书' },
    free: { label: '无牵无挂', note: '命格候选多一道，不带组织与旧债' }
  };

  function bookReadTotal(S) {
    var n = 0, k;
    for (k in (S.bookRead || {})) n += S.bookRead[k] || 0;
    return n;
  }
  function craftSum(S) {
    var c = S.craft || {};
    return (c.dan || 0) + (c.qi || 0) + (c.fu || 0) + (c.zhen || 0);
  }
  function bestFollower(S) {
    var cand = [];
    (S.disciples || []).forEach(function (d) {
      if (!d || d.alive === false) return;
      var id = d.npcId;
      if (!id) {
        var nn = (G.WXCS3.D.NPC_POOL || []).find(function (x) { return x.name === d.name; });
        if (nn) id = nn.id;
      }
      if (id) cand.push({ id: id, name: d.name || id, fav: ((S.npcs || {})[id] || {}).fav || 0, d: 1 });
    });
    (S.disciplesOut || []).forEach(function (d) {
      if (d && d.npcId) cand.push({ id: d.npcId, name: d.name || d.npcId, fav: 30, d: 1 });
    });
    var np = S.npcs || {};
    for (var id in np) {
      if (!np[id] || (np[id].fav || 0) < 40) continue;
      cand.push({ id: id, name: np[id].name || id, fav: np[id].fav || 0, d: 0 });
    }
    cand.sort(function (a, b) { return (b.fav + b.d * 20) - (a.fav + a.d * 20); });
    var best = cand[0];
    if (best) return { npcId: best.id, npcName: best.name };
    var pool = G.WXCS3.D.NPC_POOL || [];
    if (pool.length) return { npcId: pool[0].id, npcName: pool[0].name };
    return null;
  }
  function starterRecipe(S) {
    var recipes = S.learnedRecipes || [];
    for (var i = 0; i < recipes.length; i++) {
      var r = (G.WXCS3.D.RECIPES || []).find(function (x) { return x.id === recipes[i]; });
      if (r && r.tier === 'huang' && (r.lv || 1) <= 1) return r.id;
    }
    var c = S.craft || {};
    if ((c.fu || 0) >= (c.dan || 0) && (c.fu || 0) >= (c.qi || 0) && (c.fu || 0) >= (c.zhen || 0)) return 'fu_huo';
    if ((c.qi || 0) >= (c.dan || 0) && (c.qi || 0) >= (c.zhen || 0)) return 'qi_qingye';
    if ((c.zhen || 0) >= (c.dan || 0)) return 'zhen_juling';
    return 'dan_huichun';
  }

  /* ---------- 取快照 ---------- */
  EXT.fruitSnapshot = function () {
    var S = cur();
    if (!S || !S.started) return null;
    var t = S.tally || {};
    var sc = {};
    sc.craft = (t.craft || 0) * 3 + (S.learnedRecipes || []).length * 2 +
      (S.learnedArts || []).length * 5 + Math.round(craftSum(S) / 30);
    sc.school = S.school
      ? (25 + Math.round((S.school.rep || 0) * 0.5) + (S.disciplesOut || []).length * 3)
      : ((S.disciples || []).length * 5 + (S.disciplesOut || []).length * 4);
    sc.shen = (S.merit || 0) + Math.round((S.followers || 0) / 50) +
      (S.cultivation === 'shen' || S.cultivation === 'both' ? 8 : 0);
    sc.blood = Math.round((S.karma || 0) * 0.6 + (t.kill || 0) * 4 +
      (t.bloodRite || 0) * 5 + (S.bloodDebt || 0) * 25);
    sc.relic = (S.relics || []).length * 18 + (t.relic || 0) * 4 +
      (S.books || []).length * 4 + bookReadTotal(S) * 3 + (t.enc || 0) * 0.5;

    var best = null, bestScore = -1;
    ['craft', 'school', 'shen', 'blood', 'relic'].forEach(function (k) {
      if (sc[k] > bestScore) { bestScore = sc[k]; best = k; }
    });
    /* 什么都不突出就是逍遥。门槛刻意低：不必玩成完人才能得道果。 */
    var kind = bestScore >= 18 ? best : 'free';
    if (kind === 'free') bestScore = Math.max(0, Math.round(bestScore));
    var f = {
      kind: kind,
      label: KINDS[kind].label,
      note: KINDS[kind].note,
      score: Math.round(bestScore),
      applied: false
    };
    if (kind === 'craft') f.recipe = starterRecipe(S);
    if (kind === 'school') {
      var fol = bestFollower(S);
      if (fol) { f.npcId = fol.npcId; f.npcName = fol.npcName; }
      f.schoolName = S.school ? S.school.name : null;
    }
    if (kind === 'shen') {
      f.templeName = S.miaoHao || S.miao || '旧庙';
      f.merit = Math.min(20, Math.round((S.merit || 0) / 10));
    }
    if (kind === 'blood') {
      f.karma = Math.min(20, Math.round((S.karma || 0) / 10));
      var pool = (G.WXCS3.D.NPC_POOL || []).filter(function (n) { return !(S.npcs && S.npcs[n.id]); });
      if (!pool.length) pool = G.WXCS3.D.NPC_POOL || [];
      if (pool.length) { f.enemyId = pool[0].id; f.enemyName = pool[0].name; }
    }
    if (kind === 'relic') {
      /* 上一世若已收过偶数件遗物，这一世改送一页道书；否则送一条遗迹方位。 */
      f.mode = ((S.relics || []).length % 2 === 1) ? 'book' : 'site';
      f.book = 'xuanjing';
    }
    return f;
  };

  /* ---------- 兑现 ---------- */
  EXT.applyFruit = function () {
    var S = cur(), u = ui();
    if (!S) return;
    var f = S.daoFruit;
    if (!f || f.applied) return;
    f.applied = true;

    if (f.kind === 'craft') {
      S.learnedRecipes = S.learnedRecipes || [];
      var r = f.recipe ? (G.WXCS3.D.RECIPES || []).find(function (x) { return x.id === f.recipe; }) : null;
      if (r && S.learnedRecipes.indexOf(r.id) < 0) {
        S.learnedRecipes.push(r.id);
        u.logLine('前世的火候还在指尖：你无师自通，开局记得「' + r.name + '」的配法。', 'good');
      } else {
        S.insightXp = (S.insightXp || 0) + 4;
        u.logLine('前世的四艺只剩一点手感：悟性经验 +4。', '');
      }
      return;
    }

    if (f.kind === 'school') {
      S.npcs = S.npcs || {};
      var nid = f.npcId;
      if (!nid) {
        var nn = (G.WXCS3.D.NPC_POOL || [])[0];
        if (nn) { nid = nn.id; f.npcId = nid; f.npcName = f.npcName || nn.name; }
      }
      if (nid) {
        var old = S.npcs[nid] || { fav: 0, met: true };
        old.fav = Math.max(old.fav || 0, 35);
        old.met = true;
        old.oldBond = true;
        S.npcs[nid] = old;
        S.oldLetter = { id: nid, name: f.npcName || nid, from: f.schoolName || '旧部' };
        u.logLine('清早门缝里塞进一封信，落款是' + (f.schoolName || '旧山门') + '的旧人' +
          '（' + (f.npcName || nid) + '）。信上说：山还在，人还剩几个。', 'good');
      }
      return;
    }

    if (f.kind === 'shen') {
      S.merit = (S.merit || 0) + Math.max(1, f.merit || 1);
      S.oldTemple = f.templeName || '旧庙';
      if (S.cultivation === 'shen' || S.cultivation === 'both') {
        S.followers = (S.followers || 0) + 60;
        S.xianghuo = (S.xianghuo || 0) + 60;
        f.temple = true;
        u.logLine('山那头的旧庙还有人上香，香案上压着你的旧名。信众 +60，香火 +60；每月得供一份香火。', 'good');
      } else {
        f.temple = false;
        u.logLine('山那头的旧庙还有一点残香，但你此生不坐庙。功德 +' + Math.max(1, f.merit || 1) + '。', '');
      }
      return;
    }

    if (f.kind === 'blood') {
      S.karma = (S.karma || 0) + Math.max(4, f.karma || 4);
      S.npcs = S.npcs || {};
      var eid = f.enemyId;
      if (eid) {
        var en = S.npcs[eid] || { met: true };
        en.fav = Math.min(en.fav || 0, -45);
        en.met = true;
        en.grudge = true;
        S.npcs[eid] = en;
        u.logLine('你还没下山，就听说有人在打听你的名字——' + (f.enemyName || eid) +
          '。前世的血债跟过来了。', 'danger');
      } else {
        u.logLine('前世的血债化成一团旧怨，缠在你影子里。业力 +' + Math.max(4, f.karma || 4) + '。', 'danger');
      }
      return;
    }

    if (f.kind === 'relic') {
      var got = '';
      if (f.mode === 'site' && EXT.revealRuin) {
        var site = EXT.revealRuin();
        if (site) got = '你记得一处地方：' + site.name + '。舆图上已经画出来了。';
      }
      if (!got) {
        S.books = S.books || [];
        var bk = (G.WXCS3.D.DAOSHU || []).find(function (x) { return x.id === f.book; }) || (G.WXCS3.D.DAOSHU || [])[0];
        if (bk && S.books.indexOf(bk.id) < 0) {
          S.books.push(bk.id);
          got = '你枕下多了一卷' + bk.name + '，不知是谁放的。';
        } else {
          S.insightXp = (S.insightXp || 0) + 6;
          got = '你记得几段旧路，却暂时用不上：悟性经验 +6。';
        }
      }
      u.logLine(got, 'good');
      return;
    }

    /* free：什么都不发，只把命格候选放得更宽。 */
    u.logLine('前世没有留下什么，也没有追来什么。这一世轻装上路。', '');
  };

  /* ---------- 面板 / 创角提示 ---------- */
  EXT.fruitBanner = function () {
    var S = cur();
    var f = S && S.daoFruit;
    if (!f) return '';
    return '<div class="small" style="margin-bottom:8px;padding:8px;border:1px solid var(--line);border-radius:6px">' +
      '<b>前世道果 · ' + esc(f.label || '无名') + '</b><br>' +
      '<span class="muted">' + esc(f.note || '') + '（上世分量 ' + (f.score || 0) + '）</span></div>';
  };

  function panelHtml() {
    var S = cur(), u = ui();
    var f = S && S.daoFruit;
    var b = '';
    if (!f) {
      b += '<div class="small muted">这一世还没结果。走到头、烧页或空手投胎时，会按你做过的事结一枚。</div>';
    } else {
      b += '<div class="statline"><span class="k">道果</span><span class="v"><b>' + esc(f.label || '无名') +
        '</b>　上世分量 ' + (f.score || 0) + '</span></div>';
      b += '<div class="small">' + esc(f.note || '') + '</div>';
      if (f.kind === 'school') {
        b += '<div class="small muted" style="margin-top:6px">旧部：' + esc(f.npcName || '无名') +
          (f.schoolName ? ('　出自 ' + esc(f.schoolName)) : '') + '</div>';
      } else if (f.kind === 'shen') {
        b += '<div class="small muted" style="margin-top:6px">旧庙：' + esc(f.templeName || '旧庙') +
          (f.temple ? '　每月香火 −15' : '　此生不坐庙，只余功德') + '</div>';
      } else if (f.kind === 'blood') {
        b += '<div class="small muted" style="margin-top:6px">旧怨：' + esc(f.enemyName || '未具名') + '</div>';
      } else if (f.kind === 'relic') {
        b += '<div class="small muted" style="margin-top:6px">' + esc(f.mode === 'book' ? '带走的是一页道书' : '带回的是一处方位') + '</div>';
      } else if (f.kind === 'free') {
        b += '<div class="small muted" style="margin-top:6px">命格候选多一道，不附带组织与旧债。</div>';
      }
      b += u.divider();
      b += '<div class="small muted">道果只改信息和起点关系，不直接加战力。</div>';
    }
    b += '<div class="hint">人死了，事还在别处接着长。</div>';
    return b;
  }
  EXT_ACT.dfruit = function () {
    var S = cur();
    if (!S || !S.started) return;
    ui().openModal('百世道果', panelHtml());
  };

  /* ---------- 旧庙月账 ---------- */
  (function () {
    var prev = EXT.fixedCosts2;
    EXT.fixedCosts2 = function () {
      var arr = prev ? prev() : [];
      var S = cur();
      var f = S && S.daoFruit;
      if (f && f.applied && f.temple) {
        arr.push({ id: 'old_temple', name: '旧庙残香 · 香火', xianghuo: 15 });
      }
      return arr;
    };
  })();

  /* ---------- 坞入口 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      if (!S || !S.started) return prev ? prev() : [];
      var arr = prev ? prev() : [];
      if (S.daoFruit) {
        arr.push({
          k: '果', t: '道果', g: '修炼',
          s: S.daoFruit.label || '已结',
          act: 'do;dfruit'
        });
      }
      return arr;
    };
  })();

})(window);
