/* 问道长生 · 扩展骨架（v9.0 第1步）
   ============================================================
   为什么有这个文件
   ------------------------------------------------------------
   game.js 已经 10500 行。新的玩法不该再往里面堆，
   否则每加一个系统，那个文件的「改动半径」就再大一圈。

   本文件是模板，不是功能。新玩法照抄一份，改名即可：
       wxcs3-ext-<玩法>.js        （如 wxcs3-ext-relic.js）

   构建时由 mobile/build.py 自动收集 wxcs3-ext-*.js 并内联，
   HTML 里不需要出现 <script> 标签。

   ------------------------------------------------------------
   四条约定（照做就不会踩坑）
   ------------------------------------------------------------
   1) 依赖一律从 G 上取，不要在文件顶层缓存 S。
      G.S 是 getter：读档时 game.js 内部会 `S = out` 换成新对象。
      若你在顶层写 `const S = G.WXCS3.S`，读档后你操作的是旧对象，
      且不会报错 —— 这是本项目最容易出的静默 bug。
      正确写法：函数内部每次 `const S = G.WXCS3.S`。

   2) 动作注册到 G.WXCS3_EXT_ACT，不要写进 ACT。
      dispatch 会先查扩展表，再回退到 ACT，所以用法完全一样：
         面板里写 data-act="do;relic:enter"
         → dispatch 解析出 name = 'relic'
         → 调 EXT_ACT['relic'] 或 EXT_ACT['do_relic']

   3) 占不占旬必须自己负责，并在 docs/03_玩法设计/行动预算_分档表.md 登记。
      tools/check_time.py 会把「既没推进时间、也没登记」的动作标成待分类。

   4) 只做加法。要改老玩法，回 game.js 改，不要在扩展里猴补丁改老行为。
   ============================================================ */
(function (G) {
  'use strict';

  var D = G.WXCS3_DATA;
  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  /* ---------- 取当前状态：每次现取，别缓存 ---------- */
  function cur() { return G.WXCS3.S; }

  /* ---------- 一个可运行的最小示例 ----------
     演示三件事：注册动作、读状态、推进时间。
     真正写玩法时把这一段整块删掉。 */
  EXT.hello = {
    /* 只读探针，方便测试与排查 */
    info: function () {
      var S = cur();
      return { turn: S ? S.turn : null, xun: S ? S.xun : null };
    }
  };

  /* do;hello —— 示例动作：不占旬，只回一句提示。
     注册到 EXT_ACT 后，面板里写 data-act="do;hello" 即可调用。 */
  EXT_ACT.hello = function () {
    var S = cur();
    if (!S) return;
    /* toast 是 game.js 内部函数，未导出。
       扩展里要提示，走 dispatch 的现成出口或直接改日志：
       这里用 G.WXCS3 暴露的 dispatch 无法弹 toast，
       所以扩展的反馈优先用「写进纪事」，由 game.js 的 render 负责显示。 */
    if (typeof G.WXCS3.logLine === 'function') {
      G.WXCS3.logLine('扩展已接通。', '');
    }
  };

})(window);
