/* 问道长生 · 五类天劫增强（v9.0 M1）
   ============================================================
   v8.1 已有五劫（三问雷/倒天河/无灯焰/折骨风/故人关），克法与统一失败代价都在
   game.js。M1 在此之上补三件事，全部走扩展，不改劫的骨架：
   ① 劫类由「近期行为权重 + 境界固定池」共同决定——杀伐重的人更容易听见故人，
     灯下看旧物的人更容易遇见无灯焰；
   ② 每一类劫有专属的失败余波（旧版只有统一的掉血掉修为）；
   ③ 折骨风的重伤余波通过 registerMul 挂进修炼读数口（ fate 模块的注册表）。
   破境准备面板的「劫类预览」（劫类/克法/缺口/代价/成功率）也由本文件渲染。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }

  /* ---------- ① 行为权重 ----------
     返回 {lei,shui,huo,feng,gu} 的加值，game.js 的 rollTribulation 把它
     叠进境界固定池。全部设上限——行为引劫，不由行为定死。 */
  var BEHAVIOR_CAP = { lei: 14, shui: 12, huo: 12, feng: 14, gu: 16 };
  EXT.tribWeights = function () {
    var S = cur();
    if (!S || !S.started) return null;
    var t = S.tally || {};
    var hooksDue = 0, i;
    for (i = 0; i < (S.hooks || []).length; i++) if (!S.hooks[i].done) hooksDue++;
    var w = {
      lei: Math.min(BEHAVIOR_CAP.lei, Math.round((S.karma || 0) / 6) + (t.heartBreak || 0) * 3),
      shui: Math.min(BEHAVIOR_CAP.shui, (t.pillUsed || 0)),
      huo: Math.min(BEHAVIOR_CAP.huo, (t.auctionWin || 0) * 3 + ((S.arts || []).length >= 3 ? 6 : 0)),
      feng: Math.min(BEHAVIOR_CAP.feng, (t.warFight || 0) * 2 + ((S.quench || 0) === 0 ? 6 : 0)),
      gu: Math.min(BEHAVIOR_CAP.gu, hooksDue * 4 + (t.npcFuneral || 0) * 3)
    };
    return w;
  };

  /* ---------- ② 劫类专属失败余波 ----------
     game.js 的 tribFailPenalty 打完统一代价（掉血/掉修为/锁三旬）后调这里。 */
  var FAIL_TEXT = {
    lei: '雷声问的第三问，你答不上来。此后夜里常有人替你问。',
    shui: '天河倒灌，气海里的根又松了一分。',
    huo: '灯灭的那一刻，外物先遭了殃。',
    feng: '风削过骨，此后打坐，气行到旧伤处就绕。',
    gu: '那个人没等到答案，转身把你的事说给了旁人听。'
  };
  EXT.tribFailText = function (id) { return FAIL_TEXT[id] || ''; };

  EXT.tribFailExtra = function (id) {
    var S = cur();
    var u = ui();
    if (!S) return;
    if (id === 'lei') {
      S.stats.heart = Math.max(1, (S.stats.heart || 8) - 2);
      S.tally = S.tally || {};
      S.tally.heartBreak = (S.tally.heartBreak || 0) + 1;
      u.logLine('道心受挫：道心 −2，夜里怕是不得安寝。', 'danger');
    } else if (id === 'shui') {
      S.xiuwei = Math.round((S.xiuwei || 0) * 0.8);
      u.logLine('气海受损：修为又散了两成。', 'danger');
    } else if (id === 'huo') {
      var slot = null;
      if (S.equipped) {
        var ks = ['atk', 'body', 'move'];
        for (var i = 0; i < ks.length; i++) if (S.equipped[ks[i]]) { slot = ks[i]; break; }
      }
      if (slot) {
        delete S.equipped[slot];
        u.logLine('外物遭劫：佩着的法宝光华黯淡，暂时佩不得了。', 'danger');
      } else {
        S.stones = Math.max(0, (S.stones || 0) - 150);
        u.logLine('外物遭劫：修补的法器花了 150 灵石。', 'danger');
      }
    } else if (id === 'feng') {
      S.fengUntil = S.turn * 3 + S.xun + 3;   // 绝对旬数：此后三旬打坐折半
      var dmg = Math.round(S.hpMax * 0.15);
      S.hp = Math.max(1, S.hp - dmg);
      u.logLine('折骨之伤：气血再损 ' + dmg + '，三旬之内行功折半。', 'danger');
    } else if (id === 'gu') {
      S.pendingVengeance = 'person';
      u.logLine('故人转身而去。江湖上很快会有你的消息——不是好消息。', 'danger');
    }
  };
  /* 折骨风余伤：挂进命格模块的乘子注册表，打坐收效折半 */
  if (EXT.registerMul) {
    EXT.registerMul(function (kind, S) {
      if (kind !== 'cult') return 1;
      if (!S.fengUntil) return 1;
      return (S.turn * 3 + S.xun) < S.fengUntil ? 0.5 : 1;
    });
  }

  /* ---------- ③ 劫类预览（破境准备面板） ----------
     五件事一样不缺：劫类、已有克法、缺口、失败代价、预计成功率。 */
  var GAP_TEXT = {
    lei: '缺口：道心练到 12（问心闲事、清心丹）',
    shui: '缺口：道基属水（水系功法），或信众虔诚 ×1.5',
    huo: '缺口：神道请神器；仙道佩一件法宝',
    feng: '缺口：淬体 3 阶以上（肉身可换）',
    gu: '缺口：把欠下的恩义还清'
  };
  var FAIL_COST = {
    lei: '道心 −2，夜多心魔',
    shui: '修为再散两成',
    huo: '佩着的法宝黯淡失灵',
    feng: '气血再损一成半，三旬行功折半',
    gu: '故人成仇，寻上门来'
  };

  EXT.tribPreview = function (rate) {
    var S = cur();
    var u = ui();
    if (!S || !S.trib) return '';
    var t = S.trib;
    var info = u.tribInfo(t.id);
    var cls = rate > 0.6 ? 'var(--merit)' : 'var(--cinnabar)';
    var html = '<div class="divider"></div>';
    html += '<div class="statline"><span class="k">劫类</span><span class="v"><b>' +
      escHtml(t.name) + '</b>（验' + escHtml(t.test) + '）　' + escHtml(t.line) + '</span></div>';
    html += '<div class="statline"><span class="k">克法</span><span class="v">' + escHtml(info.text) +
      '　' + (info.bonus ? '<span class="good">+' + Math.round(info.bonus * 100) + '%</span>' : '<span class="danger">无</span>') + '</span></div>';
    if (!info.bonus) html += '<div class="statline"><span class="k">缺口</span><span class="v muted">' + escHtml(GAP_TEXT[t.id] || '无') + '</span></div>';
    html += '<div class="statline"><span class="k">成功率</span><span class="v" style="color:' + cls + '">' +
      Math.round(rate * 100) + '% → <b>' + Math.round(Math.min(0.95, Math.max(0.05, rate + info.bonus)) * 100) + '%</b></span></div>';
    html += '<div class="hint danger">此劫若败：气血落一成、修为跌三成、锁三旬；另有——' + escHtml(FAIL_COST[t.id] || '') + '</div>';
    return html;
  };

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

})(window);
