/* 问道长生 · 构筑面板（v9.0 M1）
   ============================================================
   一页回答一个问题：「我现在是什么流派」。
   - 命格与代价（含进阶、重悟入口）；
   - 天劫：当前挂着的劫或五劫克法自查；
   - 功法搭配、门下与靠山、月度开销——数据全部从 game.js 的 buildInfo()
     只读探针取，本文件不做任何写操作。
   入口走常驻坞「构」（修炼组），动作 do;build。 */
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

  /* ---------- 常驻坞入口 ---------- */
  EXT.dockItems = function () {
    var S = cur();
    if (!S || !S.started) return [];
    var fi = (EXT.fateInfo && EXT.fateInfo()) || null;
    return [{
      k: '构', t: '构筑', g: '修炼',
      s: fi ? fi.name : '未择痕',
      act: 'do;build'
    }];
  };

  /* ---------- 面板 ---------- */
  function fateSection(S, b) {
    var fi = (EXT.fateInfo && EXT.fateInfo()) || null;
    b += '<div class="statline"><span class="k">命格</span><span class="v">' +
      (fi ? '<b>' + escHtml(fi.name) + '</b>' : '<span class="muted">未择痕</span>') + '</span></div>';
    if (!fi) {
      b += '<div class="hint">下一次跨大境界破境之后，可从三道道痕中择一，终身不换。</div>';
      return b;
    }
    b += '<div class="statline"><span class="k">收益</span><span class="v good">' + escHtml(fi.gain) + '</span></div>';
    b += '<div class="statline"><span class="k">代价</span><span class="v danger">' + escHtml(fi.cost) + '</span></div>';
    b += '<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">';
    if (fi.canAdv) {
      b += '<span class="chip on" data-act="do;fate_adv">进阶 · ' + escHtml(fi.advReqText) + '</span>';
    } else if (fi.tier < 2) {
      b += '<span class="chip" style="opacity:.5">进阶需：' + escHtml(fi.advReqText) + '</span>';
    } else {
      b += '<span class="chip" style="opacity:.5">此系已至顶</span>';
    }
    if (fi.canRr) {
      b += '<span class="chip" data-act="do;fate_rr">重悟（一旬 · 修为散七成 · 一生一次）</span>';
    } else {
      b += '<span class="chip" style="opacity:.5">重悟已用</span>';
    }
    b += '</div>';
    return b;
  }

  function tribSection(S, b) {
    var u = ui();
    b += '<div class="divider"></div>';
    if (S.trib) {
      b += '<div class="statline"><span class="k">天劫</span><span class="v"><b>' + escHtml(S.trib.name) + '</b> · 已至门前</span></div>';
      b += '<div class="hint">回「破境」面板可查克法与缺口。</div>';
      return b;
    }
    b += '<div class="statline"><span class="k">天劫</span><span class="v muted">跨大境界时来</span></div>';
    var ids = ['lei', 'shui', 'huo', 'feng', 'gu'];
    for (var i = 0; i < ids.length; i++) {
      var info = u.tribInfo(ids[i]);
      b += '<div class="statline"><span class="k">' + escHtml(info.name) + '</span><span class="v">' + escHtml(info.text) +
        (info.bonus ? '　<span class="good">+' + Math.round(info.bonus * 100) + '%</span>' : '　<span class="danger">无</span>') + '</span></div>';
    }
    b += '<div class="hint">劫类看你这一世的行为：杀伐重闻故人，嗑丹多动天河。五类各有活路，仙神两道各有一半。</div>';
    return b;
  }

  function loadoutSection(S, info, b) {
    b += '<div class="divider"></div>';
    b += '<div class="statline"><span class="k">功法</span><span class="v">' +
      escHtml(info.gongfa ? info.gongfa.name + '（' + (info.gongfa.tier || '') + '）' : '无') + '</span></div>';
    if (info.daogong) {
      b += '<div class="statline"><span class="k">道基</span><span class="v">' + escHtml(info.daogong.name) + '</span></div>';
    }
    if ((info.shenTong || []).length) {
      b += '<div class="statline"><span class="k">神通</span><span class="v">' + escHtml(info.shenTong.join(' · ')) + '</span></div>';
    }
    b += '<div class="statline"><span class="k">淬体</span><span class="v">' + info.quench + ' 阶　<span class="muted">法宝 ' + info.artsN + ' 件</span></span></div>';
    b += '<div class="statline"><span class="k">靠山</span><span class="v">' +
      escHtml((info.sect || '宗门未入') + ' · ' + (info.disciples ? '门下 ' + info.disciples + ' 人' : '无门下')) + '</span></div>';
    return b;
  }

  function costSection(S, info, b) {
    b += '<div class="divider"></div>';
    if (!(info.fixedCosts || []).length) {
      b += '<div class="statline"><span class="k">月账</span><span class="v muted">暂无固定开销</span></div>';
      return b;
    }
    for (var i = 0; i < info.fixedCosts.length; i++) {
      var it = info.fixedCosts[i];
      var v = it.stones ? escHtml(it.name) + ' ' + it.stones + ' 灵石' : escHtml(it.name) + ' 贡献 ' + it.contrib;
      b += '<div class="statline"><span class="k">月账</span><span class="v">' + v + '</span></div>';
    }
    return b;
  }

  EXT_ACT.build = function () {
    var S = cur();
    var u = ui();
    if (!S || !S.started) return;
    var info = u.buildInfo();
    var b = '<div class="small muted">境界 ' + escHtml(info.realm) + '　灵石 ' + info.stones +
      (S.xianghuo ? '　香火 ' + info.xianghuo : '') + '　业力 ' + (info.karma || 0) + '　功德 ' + (info.merit || 0) + '</div>';
    b += '<div class="divider"></div>';
    b = fateSection(S, b);
    b = tribSection(S, b);
    b = loadoutSection(S, info, b);
    b = costSection(S, info, b);
    b += '<div class="hint">构筑不是加法——命格的代价、天劫的缺口、每月的账，都是这条路的分量。</div>';
    u.openModal('构筑 · ' + escHtml(info.realm), b);
  };

})(window);
