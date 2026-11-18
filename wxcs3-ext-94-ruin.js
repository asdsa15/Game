/* 问道长生 · 上古遗迹（v9.0 M4）
   ============================================================
   5~7 个节点的短程探索：入口 → 机关 → 叙事 → 岔路 → 交易 → 守关 → 遗物。
   - 每走一个节点占一旬；多数节点可退；
   - 风险判定用属性/本命/灵兽/弟子，不另开战斗；
   - 终点三选一：遗物 / 功法断篇 / 道书或舆图线索；
   - 入口来自：道书二读、NPC 高好感、拍卖残图、历练中循残图寻访。
   ------------------------------------------------------------
   状态全部在 S 上（ruin / ruinsKnown / ruinsCleared / relics），
   读档可续；数值只读 S 与 D，不缓存。 */
(function (G) {
  'use strict';

  var EXT = (G.WXCS3_EXT = G.WXCS3_EXT || {});
  var EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  function cur() { return G.WXCS3.S; }
  function ui() { return G.WXCS3; }
  function esc(s) { return ui().esc(String(s == null ? '' : s)); }
  function clamp(v, a, b) { return ui().clamp(v, a, b); }

  /* ---------- 遗物 ----------
     七件遗物各自只加一处；不叠加、不再出现在坊市。
     效果走命格同一套 fateMul/fateAdd 读数口，别的扩展也能看见。 */
  var RELICS = [
    { id: 'yaowang_lu', name: '药王残炉', eff: '丹药效果 +6%', kind: 'pill', mul: 1.06 },
    { id: 'jianzhong_feng', name: '剑冢残锋', eff: '剑系招式伤害 +6%', kind: 'sword', mul: 1.06 },
    { id: 'guixu_jing', name: '归墟水镜', eff: '显圣所得 +5%', kind: 'xs', mul: 1.05 },
    { id: 'tianji_pan', name: '天机残盘', eff: '打坐修为 +3%（定息）', kind: 'cult', mul: 1.03 },
    { id: 'leiyuan_ding', name: '雷渊骨钉', eff: '斗法伤害 +5%', kind: 'dmg', mul: 1.05 },
    { id: 'xuehe_deng', name: '血河孤灯', eff: '斗法缴获 +8%', kind: 'loot', mul: 1.08 },
    { id: 'taixu_yin', name: '太虚残印', eff: '符箓之力 +8%', kind: 'tal', mul: 1.08 }
  ];
  function relicOf(id) {
    for (var i = 0; i < RELICS.length; i++) if (RELICS[i].id === id) return RELICS[i];
    return null;
  }
  function hasRelic(id) { return (cur().relics || []).indexOf(id) >= 0; }
  EXT.registerMul(function (kind, S) {
    var got = (S && S.relics) || [];
    var m = 1;
    for (var i = 0; i < got.length; i++) {
      var r = relicOf(got[i]);
      if (r && r.kind === kind && r.mul) m *= r.mul;
    }
    return m;
  });

  /* ---------- 七处遗址 ----------
     region 与舆图的 PLACES 对齐；minRealm 是 xRealm（0 起）。
     每处只探尽一次；遗物/功法/道书各自固定，玩家三选一。 */
  var SITES = [
    {
      id: 'yaowang_gu', name: '药王谷遗址', region: 'qingyue', minRealm: 0,
      relic: 'yaowang_lu', gongfa: 'changchun', book: 'xuanjing',
      desc: '药庐塌了半边，灶膛里还有一层冷灰。墙上挂着一排空药囊，绳结都朝着同一个方向。',
      guard: '一具抱着药箱的枯骨，指节还扣在箱扣上。',
      chamber: '石台上摆着一只小炉，炉底有一圈早干了的药痕。'
    },
    {
      id: 'jianzhong', name: '北原剑冢', region: 'beiyuan', minRealm: 1,
      relic: 'jianzhong_feng', gongfa: 'xuanyuan', book: 'renzu',
      desc: '雪地里斜插着数不清的断剑，剑柄一律朝南。风过时，铁片互相碰出很轻的声。',
      guard: '一个披着旧甲的影子坐在剑丘顶，膝上横着一柄没有鞘的剑。',
      chamber: '剑丘中央留着一道石缝，缝里横着一截断锋。'
    },
    {
      id: 'guixu', name: '归墟水眼', region: 'xisha', minRealm: 2,
      relic: 'guixu_jing', gongfa: 'tunhai', book: 'jiuhuan',
      desc: '沙丘背面有一口井，井水比井口还高，却一滴也不溢出来。',
      guard: '水里立着一个人形，通体透明，只有心口一点浑浊。',
      chamber: '井底石室里悬着一面水镜，镜面朝下，映着天。'
    },
    {
      id: 'tianji_ta', name: '天机残塔', region: 'zhongzhou', minRealm: 2,
      relic: 'tianji_pan', gongfa: 'meihua', book: 'meihua',
      desc: '塔身裂成三截，却还站着。每一层的窗都朝着不同的时辰。',
      guard: '一个没有五官的铜人守着塔门，手里托着一枚活着的罗盘。',
      chamber: '顶层只剩一张石案，案上刻着半局没下完的棋。'
    },
    {
      id: 'leiyuan', name: '雷渊古台', region: 'nanyue', minRealm: 3,
      relic: 'leiyuan_ding', gongfa: 'zixiao', book: 'jiuhuan',
      desc: '焦黑的台基一层层往下，像被雷从天上劈出来的台阶。空气里有铁被烧过的味道。',
      guard: '台心立着一具石俑，石缝里还在冒细小的电弧。',
      chamber: '古台最深处钉着一枚骨钉，钉下的地面裂成蛛网。'
    },
    {
      id: 'xuehe', name: '血河古渡', region: 'nanyue', minRealm: 4,
      relic: 'xuehe_deng', gongfa: 'jujing', book: 'renzu',
      desc: '河是红的，却没有血腥味。渡口停着一条空船，船头挂着一盏不亮的灯。',
      guard: '船夫的斗笠压得很低，手里那根篙比船还长。',
      chamber: '河心沙洲上有一盏孤灯，灯油是暗红色的。'
    },
    {
      id: 'taixu_gong', name: '太虚残宫', region: 'zhongzhou', minRealm: 5,
      relic: 'taixu_yin', gongfa: 'taixu', book: 'jiuhuan',
      desc: '宫门只剩两根柱子，柱上刻的却不是文字，是一层压着一层的剑痕。',
      guard: '宫门里站着一位穿旧朝服的人，见了你，只抬手做了一个「请」的姿势。',
      chamber: '正殿中央悬着一枚残印，印面缺了一角，仍有极淡的光。'
    }
  ];
  function siteOf(id) {
    for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i];
    return null;
  }
  function regionName(id) {
    var list = (G.WXCS3.D.REGIONS || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id;
  }
  function bookOf(id) {
    var list = (G.WXCS3.D.DAOSHU || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function gongfaOf(id) {
    var list = (G.WXCS3.D.GONGFA || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- 发现与线索 ---------- */
  function unknownSites(S) {
    S.ruinsKnown = S.ruinsKnown || {};
    S.ruinsCleared = S.ruinsCleared || {};
    return SITES.filter(function (s) { return !S.ruinsKnown[s.id]; });
  }
  function pickUnknown(S, fitOnly) {
    var list = unknownSites(S);
    if (fitOnly) {
      var fit = list.filter(function (s) { return s.minRealm <= ((S.xRealm || 0) + 1); });
      if (fit.length) list = fit;
    }
    if (!list.length) return null;
    list.sort(function (a, b) { return a.minRealm - b.minRealm; });
    return list[0];
  }
  EXT.revealRuin = function (id) {
    var S = cur();
    if (!S) return null;
    var site = id ? siteOf(id) : pickUnknown(S, true);
    if (!site) return null;
    S.ruinsKnown = S.ruinsKnown || {};
    S.ruinsKnown[site.id] = true;
    return site;
  };
  EXT.ruinKnown = function () {
    var S = cur();
    if (!S) return [];
    S.ruinsKnown = S.ruinsKnown || {};
    return SITES.filter(function (s) { return !!S.ruinsKnown[s.id]; });
  };
  EXT.ruinInfo = function () {
    var S = cur();
    return {
      sites: SITES.map(function (s) {
        return { id: s.id, name: s.name, minRealm: s.minRealm,
          known: !!(S && S.ruinsKnown && S.ruinsKnown[s.id]),
          cleared: !!(S && S.ruinsCleared && S.ruinsCleared[s.id]) };
      }),
      relics: RELICS.map(function (r) { return r.id; }),
      current: S && S.ruin ? { site: S.ruin.site, i: S.ruin.i, seq: (S.ruin.seq || []).slice() } : null
    };
  };

  /* 道书读到第二层起，书页里可能夹一条方位。整局只出一次，免得刷书。 */
  EXT.onBookRead = function (bk, layerIdx) {
    var S = cur(), u = ui();
    if (!S || !S.started || layerIdx < 1 || S.bookRuinClue) return;
    var site = EXT.revealRuin();
    if (!site) return;
    S.bookRuinClue = 1;
    u.logLine('你在' + (bk ? ('《' + bk.name.replace(/[《》]/g, '') + '》') : '书页') +
      '的夹缝里读出一条路：' + site.name + '。', 'good');
  };
  /* 拍卖「半卷残图」：拍下即得一处方位。 */
  EXT.onAuctionWin = function (lot) {
    var S = cur(), u = ui();
    if (!S || !lot || lot.id !== 'lot_map') return;
    var site = EXT.revealRuin();
    if (site) u.logLine('残图与舆图对上了：' + site.name + '。', 'good');
    else { S.stones += 150; u.logLine('残图上的地方你已去过，转手换了一百五十石。', ''); }
  };
  /* 高好感 NPC 主动提一句；每人只提一次。 */
  EXT.onNpcTalk = function (n, id, rec) {
    var S = cur(), u = ui();
    if (!S || !n || !rec || rec.ruinClue) return;
    if ((rec.fav || 0) < 60) return;
    var site = EXT.revealRuin();
    if (!site) return;
    rec.ruinClue = 1;
    u.logLine(n.name + '压低声音：「' + site.name + '……我年轻时到过外头，没敢进去。」', 'good');
  };

  /* ---------- 路线：5~7 节点 ---------- */
  function makeSeq() {
    var r = G.WXCS3.rng;
    var depth = 5 + Math.floor(r() * 3);   // 5 / 6 / 7
    if (depth === 5) return ['entry', 'trap', 'fork', 'guard', 'relic'];
    if (depth === 6) return ['entry', 'trap', 'lore', 'fork', 'guard', 'relic'];
    return ['entry', 'trap', 'lore', 'fork', 'trade', 'guard', 'relic'];
  }

  /* ---------- 面板 ---------- */
  function header(S, site) {
    var run = S.ruin;
    var depth = run.seq.length;
    var at = Math.min(depth, (run.i || 0) + 1);
    return '<div class="statline"><span class="k">遗迹</span><span class="v"><b>' + esc(site.name) +
      '</b>　' + esc(regionName(site.region)) + '</span></div>' +
      '<div class="statline"><span class="k">进度</span><span class="v">第 ' + at + ' / ' + depth +
      ' 个节点　气血 ' + Math.round(S.hp) + '/' + Math.round(S.hpMax) +
      '　灵力 ' + Math.round(S.mp) + '/' + Math.round(S.mpMax) + '</span></div>';
  }
  function nodeText(site, type) {
    if (type === 'entry') return site.desc + ' 断碑上有一行认不全的字。风从里面出来，带着铁锈和旧香。';
    if (type === 'trap') return '甬道比外面窄了一掌，两壁嵌着看不出用途的铜片。走到一半，身后「嗒」地响了一声。';
    if (type === 'lore') return '墙上有一幅没画完的壁画：一群人围着一口井，井里伸出一只手。颜料早已发黑，那只手却还像在动。';
    if (type === 'fork') return '前面分成两条道。左边低矮，风从里面直吹出来；右边绕远，石阶上积着厚灰，很久没人走过。';
    if (type === 'trade') return '一个没有脸的陶俑坐在路中，面前摆着两件旧物。它不抬头，只在你说完话后，把一只陶手翻了过来。';
    if (type === 'guard') return site.guard + ' 它没有立刻动，只是把路让出一半——另一半，得你自己挣。';
    if (type === 'relic') return site.chamber + ' 你走到近前，才看清这里还有三样东西可以带走，但只拿得动一样。';
    return '';
  }
  function leaveRow(S) {
    var free = (S.ruin.i || 0) === 0;
    return ui().optRow('退', '退出遗迹', { name: free ? '不耗时' : '一旬', cls: 'peace' },
      free ? '还在入口，转身就走' : '沿原路退出去，这一旬就花在路上了', false, 'do;ruin_leave');
  }
  function show() {
    var S = cur(), u = ui();
    if (!S || !S.ruin) return openPanel();
    var site = siteOf(S.ruin.site);
    if (!site || !Array.isArray(S.ruin.seq) || S.ruin.i >= S.ruin.seq.length) {
      S.ruin = null;
      return openPanel();
    }
    var type = S.ruin.seq[S.ruin.i];
    var b = header(S, site) + u.divider();
    b += '<div class="npcline">' + esc(nodeText(site, type)) + '</div>' + u.divider();
    b += '<ul class="opts">';
    var row, cost;
    if (type === 'entry') {
      row = u.optRow('A', '往里走', { name: '一旬', cls: 'chance' }, '已经把命押在门槛上了', false, 'do;ruin_step');
      b += row;
    } else if (type === 'fork') {
      b += u.optRow('A', '走左边低道', { name: '近', cls: 'risk' },
        '少走一个节点，但通道低窄，过时伤气（气血 −5%）', false, 'do;ruin_opt:fork:left');
      b += u.optRow('B', '走右边旧道', { name: '稳', cls: 'peace' },
        '多走一段，得一点阅历（悟性经验 +2）', false, 'do;ruin_opt:fork:right');
    } else if (type === 'trap') {
      var sp = clamp(0.42 + (S.stats.speed || 8) * 0.025 - site.minRealm * 0.02 +
        (S.benming && (S.benming.tier || 0) >= 2 ? 0.05 : 0) +
        (S.barn && S.barn.length ? 0.04 : 0), 0.20, 0.92);
      var ins = clamp(0.30 + (S.stats.insight || 8) * 0.03 - site.minRealm * 0.02, 0.15, 0.90);
      b += u.optRow('A', '以步法避开', { name: '遁', cls: 'chance' },
        '约 ' + Math.round(sp * 100) + '% · 失败气血 −15%', false, 'do;ruin_opt:trap:speed');
      b += u.optRow('B', '以神识看破', { name: '察', cls: 'chance' },
        '约 ' + Math.round(ins * 100) + '% · 失败灵力 −30%', false, 'do;ruin_opt:trap:insight');
      if (S.benming && (S.benming.tier || 0) >= 2) {
        b += u.optRow('C', '本命护身', { name: '器', cls: 'good' },
          '必过 · 器损 +8', false, 'do;ruin_opt:trap:benming');
      } else if (S.barn && S.barn.length) {
        b += u.optRow('C', '放灵兽探路', { name: '兽', cls: 'good' },
          '必过 · 灵兽亲密 −2', false, 'do;ruin_opt:trap:beast');
      }
    } else if (type === 'lore') {
      b += u.optRow('A', '细读壁画', { name: '悟', cls: 'peace' }, '悟性 +1（上限内）· 悟性经验 +2', false, 'do;ruin_opt:lore:read');
      b += u.optRow('B', '拓下纹样', { name: '财', cls: 'chance' }, '灵石 +80~200', false, 'do;ruin_opt:lore:rub');
      b += u.optRow('C', '只歇一歇', { name: '稳', cls: 'peace' }, '灵力回复 20%', false, 'do;ruin_opt:lore:rest');
    } else if (type === 'trade') {
      cost = tradeCost(site);
      b += u.optRow('A', '以灵石换古修遗泽', { name: '交易', cls: 'chance' },
        '灵石 −' + cost + ' · 气血与灵力各回 35%', S.stones < cost, 'do;ruin_opt:trade:buy');
      b += u.optRow('B', '不理陶俑', { name: '省', cls: 'peace' }, '从它身边绕过去', false, 'do;ruin_opt:trade:no');
    } else if (type === 'guard') {
      var base = clamp(0.36 + ((S.xRealm || 0) - site.minRealm) * 0.14 +
        (S.stats.heart || 8) * 0.012 +
        (S.benming && (S.benming.tier || 0) >= 2 ? 0.04 : 0) +
        (S.barn && S.barn.length ? 0.04 : 0), 0.20, 0.92);
      b += u.optRow('A', '正面斗一场', { name: '斗', cls: 'risk' },
        '约 ' + Math.round(base * 100) + '% · 胜则得灵石，败则重伤', false, 'do;ruin_opt:guard:fight');
      if ((S.disciples || []).length) {
        b += u.optRow('B', '让弟子掠阵', { name: '徒', cls: 'chance' },
          '约 ' + Math.round(clamp(base + 0.10, 0.20, 0.94) * 100) + '% · 弟子亲密 −2，败则 −8', false, 'do;ruin_opt:guard:disciple');
      }
      var intel = clamp(0.32 + (S.stats.insight || 8) * 0.03, 0.15, 0.88);
      b += u.optRow('C', '以言智取', { name: '智', cls: 'chance' },
        '约 ' + Math.round(intel * 100) + '% · 败则气血 −12%', false, 'do;ruin_opt:guard:talk');
      b += u.optRow('D', '留下买路财', { name: '财', cls: 'peace' },
        '灵石 −' + tradeCost(site) + ' · 必过', S.stones < tradeCost(site), 'do;ruin_opt:guard:pay');
      b += u.optRow('E', '绕远路', { name: '慢', cls: 'peace' }, '多花一旬，不伤不损', false, 'do;ruin_opt:guard:detour');
    } else if (type === 'relic') {
      var rel = relicOf(site.relic);
      var gf = gongfaOf(site.gongfa);
      var bk = bookOf(site.book);
      b += u.optRow('A', '取遗物 · ' + (rel ? rel.name : '旧物'), { name: '遗物', cls: 'chance' },
        rel ? rel.eff : '一件旧物', false, 'do;ruin_take:relic');
      b += u.optRow('B', '取功法断篇 · ' + (gf ? gf.name : '残篇'), { name: '功法', cls: 'good' },
        gf ? (gf.eff || '一门旧功法') : '一门旧功法', false, 'do;ruin_take:gongfa');
      b += u.optRow('C', bk ? ('取《' + bk.name.replace(/[《》]/g, '') + '》') : '取舆图线索',
        { name: '道书', cls: 'peace' },
        bk ? '道书一卷（已有则改换别的线索）' : '一处新的遗迹方位', false, 'do;ruin_take:clue');
    }
    b += leaveRow(S);
    b += '</ul>';
    b += '<div class="hint">每走一个节点占一旬。入口处退出不耗时；进了里面再退，路上还要一旬。</div>';
    u.openModal('上古遗迹 · ' + site.name, b);
  }

  function tradeCost(site) { return 120 + (site.minRealm || 0) * 80; }

  function openPanel() {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    var b = '';
    S.ruinsKnown = S.ruinsKnown || {};
    S.ruinsCleared = S.ruinsCleared || {};
    if (S.ruin) {
      var site0 = siteOf(S.ruin.site);
      b += '<div class="small">你还在' + esc(site0 ? site0.name : '遗迹') + '里。继续，或者退出去。</div>' + u.divider();
      b += '<ul class="opts">' + u.optRow('A', '继续探索', { name: '续', cls: 'chance' }, '', false, 'do;ruin_resume') + '</ul>';
      return u.openModal('上古遗迹', b);
    }
    var known = EXT.ruinKnown();
    if (!known.length) {
      b += '<div class="small">你手上还没有完整的遗迹方位。</div>';
      b += '<div class="small muted" style="margin-top:4px">道书读到第二层、与故人深谈、拍下半卷残图，都可能得到一条线索。</div>';
      b += u.divider();
      b += '<ul class="opts">' + u.optRow('A', '循残图访古', { name: '一旬', cls: 'chance' },
        '没有线索时，只能按旧图一处一处碰运气', false, 'do;ruin_search') + '</ul>';
      return u.openModal('上古遗迹', b);
    }
    b += '<div class="small">已知 <b>' + known.length + '</b> 处。遗迹与地点同图，得先到那一域。</div>';
    b += '<ul class="opts">';
    for (var i = 0; i < known.length; i++) {
      var s = known[i];
      var cleared = !!S.ruinsCleared[s.id];
      var here = (S.place || 'qingyue') === s.region;
      var realmOk = (S.xRealm || 0) >= s.minRealm;
      var desc = cleared ? '已探尽' : (!here ? '须至' + regionName(s.region)
        : (!realmOk ? '境界未至' : '可去 · 5~7 节点'));
      b += u.optRow('·', s.name, { name: cleared ? '尽' : (here ? '可去' : '远'), cls: cleared ? 'peace' : (here ? 'chance' : 'risk') },
        desc, cleared || !here || !realmOk, 'do;ruin_go:' + s.id);
    }
    b += u.optRow('·', '循残图再访', { name: '一旬', cls: 'peace' }, '再找一处没去过的', false, 'do;ruin_search');
    b += '</ul>';
    b += u.divider();
    b += '<div class="small">遗物 ' + (S.relics || []).length + ' / ' + RELICS.length + '</div>';
    if ((S.relics || []).length) {
      b += '<div class="small muted">' + (S.relics || []).map(function (id) {
        var r = relicOf(id); return r ? r.name : id;
      }).join(' · ') + '</div>';
    }
    b += '<div class="hint">遗迹不是藏宝洞。走得越深，越要算自己还剩几口气。</div>';
    u.openModal('上古遗迹', b);
  }

  /* ---------- 动作 ---------- */
  EXT_ACT.ruin = function () {
    var S = cur();
    if (!S || !S.started) return;
    if (S.ruin) return show();
    openPanel();
  };
  EXT_ACT.ruin_resume = function () {
    var S = cur();
    if (!S || !S.ruin) return openPanel();
    show();
  };
  EXT_ACT.ruin_search = function () {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (S.ruin) { u.toast('先把这一处走完'); return show(); }
    u.advanceXun(1);
    if (S.phase !== 'play') return u.render();
    var site = pickUnknown(S, true);
    if (!site) {
      S.stones += 120;
      S.insightXp = (S.insightXp || 0) + 2;
      u.logLine('旧图翻尽，只剩些没用的边角。你换了一百二十石，记下一点旧闻。', '');
      u.closeModal(); u.render();
      return;
    }
    S.ruinsKnown = S.ruinsKnown || {};
    S.ruinsKnown[site.id] = true;
    u.logLine('你按旧图摸到' + site.name + '。断碑还在，门口的风还在。', 'good');
    u.toast('发现遗迹 · ' + site.name);
    if (S.xRealm >= site.minRealm && (S.place || 'qingyue') === site.region) show();
    else { u.closeModal(); openPanel(); u.render(); }
  };
  EXT_ACT.ruin_go = function (id) {
    var S = cur(), u = ui();
    if (!S || !S.started) return;
    if (S.ruin) { u.toast('已在一处遗迹里'); return show(); }
    var site = siteOf(id);
    if (!site) return;
    S.ruinsKnown = S.ruinsKnown || {};
    S.ruinsCleared = S.ruinsCleared || {};
    if (!S.ruinsKnown[id]) { u.toast('尚无此地线索'); return; }
    if (S.ruinsCleared[id]) { u.toast('此地已探尽'); return; }
    if ((S.place || 'qingyue') !== site.region) { u.toast('须先到' + regionName(site.region)); return; }
    if ((S.xRealm || 0) < site.minRealm) { u.toast('境界未至，进去是送死'); return; }
    /* 旧仇可能循着血味尾随；先掷，写进本趟状态，读档也不改。 */
    var tail = (S.karma || 0) >= 60 && u.rng() < 0.35;
    S.ruin = { site: id, seq: makeSeq(), i: 0, tail: tail };
    u.advanceXun(1);
    if (S.phase !== 'play') { S.ruin = null; u.render(); return; }
    if (tail) u.logLine('进洞之前，你回头看了一眼——远处有人停住了脚。', 'danger');
    show();
  };
  EXT_ACT.ruin_step = function () {
    var S = cur();
    if (!S || !S.ruin) return openPanel();
    goNext();
  };
  function goNext() {
    var S = cur(), u = ui();
    if (!S || !S.ruin) return openPanel();
    S.ruin.i = (S.ruin.i || 0) + 1;
    u.advanceXun(1);
    if (S.phase !== 'play') { S.ruin = null; u.render(); return; }
    show();
  }
  function afterChoice(msg, cls, extraXun) {
    var S = cur(), u = ui();
    if (msg) u.logLine(msg, cls || '');
    if (extraXun) {
      u.advanceXun(extraXun);
      if (S.phase !== 'play') { S.ruin = null; u.render(); return; }
    }
    goNext();
  }
  EXT_ACT.ruin_opt = function (kind, choice) {
    var S = cur(), u = ui();
    if (!S || !S.ruin) return openPanel();
    var site = siteOf(S.ruin.site);
    if (!site) { S.ruin = null; return openPanel(); }
    var r = u.rng;
    if (kind === 'fork') {
      if (choice === 'left') {
        var nxt = S.ruin.seq[S.ruin.i + 1];
        if (nxt && nxt !== 'relic') S.ruin.seq.splice(S.ruin.i + 1, 1);
        S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.05));
        afterChoice('你贴着低道钻过去，肩背擦掉一层皮（气血 −5%），前面少走一段。', '');
      } else {
        S.insightXp = (S.insightXp || 0) + 2;
        afterChoice('旧道很长，石阶上的灰一层压一层。你走完时，心里多了一点东西。', '');
      }
      return;
    }
    if (kind === 'trap') {
      if (choice === 'benming') {
        S.benming.dmg = (S.benming.dmg || 0) + 8;
        afterChoice('本命法器浮在身前，替你挡下整片铜针（器损 +8）。', 'good');
        return;
      }
      if (choice === 'beast') {
        var bi = clamp(parseInt(S.warBeast, 10) || 0, 0, (S.barn || []).length - 1);
        if (S.barn && S.barn[bi]) S.barn[bi].bond = Math.max(0, (S.barn[bi].bond || 0) - 2);
        afterChoice((S.barn && S.barn[bi] ? (S.barn[bi].name || '灵兽') : '灵兽') +
          '先一步窜出去，铜片都扎在它经过的地方（亲密 −2）。', 'good');
        return;
      }
      if (choice === 'speed') {
        var sp = clamp(0.42 + (S.stats.speed || 8) * 0.025 - site.minRealm * 0.02 +
          (S.benming && (S.benming.tier || 0) >= 2 ? 0.05 : 0) +
          (S.barn && S.barn.length ? 0.04 : 0), 0.20, 0.92);
        if (r() < sp) afterChoice('你踩着铜片的间隙过去，身后只落了几点火星。', 'good');
        else {
          S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.15));
          afterChoice('铜片还是擦上了，气血 −15%。你咬着牙没停。', 'danger');
        }
        return;
      }
      if (choice === 'insight') {
        var ins = clamp(0.30 + (S.stats.insight || 8) * 0.03 - site.minRealm * 0.02, 0.15, 0.90);
        if (r() < ins) {
          S.insightXp = (S.insightXp || 0) + 2;
          afterChoice('你看懂了铜片的排列，从中间穿过去。顺带记下了一点门道。', 'good');
        } else {
          S.mp = Math.max(0, S.mp - Math.round(S.mpMax * 0.30));
          afterChoice('神识探得太深，反被机关绞了一下，灵力 −30%。', 'danger');
        }
        return;
      }
    }
    if (kind === 'lore') {
      if (choice === 'read') {
        S.stats.insight = clamp((S.stats.insight || 8) + 1, 1, 20);
        S.insightXp = (S.insightXp || 0) + 2;
        afterChoice('你看出那只手不是求救，是在指路。悟性 +1。', 'good');
      } else if (choice === 'rub') {
        var st = 80 + Math.floor(r() * 121);
        S.stones += st;
        afterChoice('你把纹样拓在布上，回头卖了个好价：灵石 +' + st + '。', 'good');
      } else {
        S.mp = Math.min(S.mpMax, S.mp + Math.round(S.mpMax * 0.20));
        afterChoice('你靠着墙闭了会儿眼，灵力回了两成。', '');
      }
      return;
    }
    if (kind === 'trade') {
      if (choice === 'buy') {
        var c = tradeCost(site);
        if (S.stones < c) { u.toast('灵石不足'); return; }
        S.stones -= c;
        S.hp = Math.min(S.hpMax, S.hp + Math.round(S.hpMax * 0.35));
        S.mp = Math.min(S.mpMax, S.mp + Math.round(S.mpMax * 0.35));
        afterChoice('陶俑收下灵石，把一只陶手按在你心口。气血与灵力各回三成半。', 'good');
      } else {
        afterChoice('你从陶俑身边绕过去，它也没有回头。', '');
      }
      return;
    }
    if (kind === 'guard') {
      var base = clamp(0.36 + ((S.xRealm || 0) - site.minRealm) * 0.14 +
        (S.stats.heart || 8) * 0.012 +
        (S.benming && (S.benming.tier || 0) >= 2 ? 0.04 : 0) +
        (S.barn && S.barn.length ? 0.04 : 0), 0.20, 0.92);
      if (choice === 'pay') {
        var pc = tradeCost(site);
        if (S.stones < pc) { u.toast('灵石不足'); return; }
        S.stones -= pc;
        afterChoice('你把灵石放在地上，守关者让开半步。它连看都没看那袋钱。', '');
        return;
      }
      if (choice === 'detour') {
        afterChoice('你退回岔口，从另一侧绕过去。多花了一旬，但身上没添新伤。', '', 1);
        return;
      }
      var win = false;
      if (choice === 'fight') win = r() < base;
      else if (choice === 'disciple') {
        var alive = (S.disciples || []).filter(function (d) { return d && d.alive !== false; });
        if (!alive.length) { u.toast('没有可带的弟子'); return; }
        alive[0].bond = Math.max(0, (alive[0].bond || 0) - 2);
        win = r() < clamp(base + 0.10, 0.20, 0.94);
        if (!win) alive[0].bond = Math.max(0, (alive[0].bond || 0) - 6);
        u.logLine(alive[0].name + '替你挡了半式，退下来时手在抖。', win ? '' : 'danger');
      } else {
        win = r() < clamp(0.32 + (S.stats.insight || 8) * 0.03, 0.15, 0.88);
      }
      if (win) {
        var gain = 100 + site.minRealm * 120 + Math.floor(r() * 81);
        S.stones += gain;
        S.insightXp = (S.insightXp || 0) + 2;
        afterChoice('守关者收势退开。你在它身后的石缝里摸出一小袋旧钱：灵石 +' + gain + '。', 'good');
      } else {
        var hurt = Math.max(1, Math.round(S.hpMax * 0.28));
        S.hp = Math.max(1, S.hp - hurt);
        S.mp = Math.max(0, S.mp - 20);
        afterChoice('你被逼退撞在墙上，气血 −' + hurt + '。守关者没有追，只是重新站回原处。', 'danger');
      }
      return;
    }
    u.toast('此处无此选择');
  };

  /* ---------- 终点三选一 ---------- */
  EXT_ACT.ruin_take = function (what) {
    var S = cur(), u = ui();
    if (!S || !S.ruin) return openPanel();
    var site = siteOf(S.ruin.site);
    if (!site) { S.ruin = null; return openPanel(); }
    var msg = '';
    if (what === 'relic') {
      var rel = relicOf(site.relic);
      if (!S.relics) S.relics = [];
      if (!hasRelic(site.relic)) {
        S.relics.push(site.relic);
        S.tally.relic = (S.tally.relic || 0) + 1;
        msg = '你取走' + (rel ? rel.name : '遗物') + '。' + (rel ? rel.eff : '') + '。';
      } else {
        S.stones += 300;
        msg = '同款遗物你已有一件，石台上的这件换成了三百灵石。';
      }
    } else if (what === 'gongfa') {
      var gf = gongfaOf(site.gongfa);
      var learned = u.addGongfa ? u.addGongfa(site.gongfa) : false;
      if (learned) msg = '你带走' + (gf ? ('《' + gf.name + '》') : '功法断篇') + '。纸很脆，字却还清楚。';
      else {
        S.insightXp = (S.insightXp || 0) + 6;
        S.stones += 150;
        msg = '这篇功法你已学过，只把剩下的批注记进心里：悟性经验 +6，另换一百五十石。';
      }
    } else if (what === 'clue') {
      var bk = bookOf(site.book);
      S.books = S.books || [];
      if (bk && S.books.indexOf(bk.id) < 0) {
        S.books.push(bk.id);
        msg = '你带走' + bk.name + '。封皮是后换的，线脚很新。';
      } else {
        var next = pickUnknown(S, true);
        if (next) {
          S.ruinsKnown = S.ruinsKnown || {};
          S.ruinsKnown[next.id] = true;
          msg = '书已有了，你把最后一页的墨迹对着光看——是' + next.name + '的方位。';
        } else {
          S.stones += 200;
          msg = '书与图都不缺了，你把残页卖了二百石。';
        }
      }
    } else { u.toast('不知该取什么'); return; }
    S.ruinsCleared = S.ruinsCleared || {};
    S.ruinsCleared[site.id] = true;
    /* 尾随旧仇：只在终点结算时收一次，跑得快也躲不掉。 */
    if (S.ruin.tail) {
      var lost = Math.min(S.stones, 80 + site.minRealm * 60 + Math.floor(u.rng() * 61));
      S.stones -= lost;
      S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.08));
      msg += ' 出洞时有人跟了上来，你丢下' + lost + '石才脱身。';
    }
    S.ruin = null;
    u.logLine(msg, 'good');
    u.toast('遗迹探尽 · ' + site.name);
    u.closeModal();
    if (u.checkAch) { try { u.checkAch(); } catch (e) { } }
    u.render();
  };
  EXT_ACT.ruin_leave = function () {
    var S = cur(), u = ui();
    if (!S || !S.ruin) return openPanel();
    var site = siteOf(S.ruin.site);
    var free = (S.ruin.i || 0) === 0;
    S.ruin = null;
    if (!free) {
      u.advanceXun(1);
      if (S.phase !== 'play') return u.render();
    }
    u.logLine('你从' + (site ? site.name : '遗迹') + '退了出来。' + (free ? '还没进去，鞋都没脏。' : '这一旬都花在回头路上了。'), '');
    u.closeModal();
    u.render();
  };

  /* ---------- 舆图 / 历练入口 ---------- */
  EXT.mapRows = function () {
    var S = cur();
    if (!S || !S.started) return '';
    var u = ui();
    var known = EXT.ruinKnown();
    var b = u.divider() + '<div class="small">上古遗迹</div>';
    if (!known.length) {
      return b + '<div class="small muted">舆图上还没有遗迹方位。读书、问人、拍残图，都会留下线索。</div>';
    }
    b += '<ul class="opts">';
    for (var i = 0; i < known.length; i++) {
      var s = known[i];
      var cleared = !!(S.ruinsCleared && S.ruinsCleared[s.id]);
      var here = (S.place || 'qingyue') === s.region;
      var realmOk = (S.xRealm || 0) >= s.minRealm;
      b += u.optRow('·', s.name, { name: cleared ? '尽' : (here ? '可去' : '远'), cls: cleared ? 'peace' : (here ? 'chance' : 'risk') },
        cleared ? '已探尽' : (!here ? '须至' + regionName(s.region) : (!realmOk ? '境界未至' : '可去')),
        cleared || !here || !realmOk, 'do;ruin_go:' + s.id);
    }
    b += '</ul>';
    return b;
  };
  EXT.exploreRows = function () {
    var S = cur();
    if (!S || !S.started) return '';
    var u = ui();
    var known = EXT.ruinKnown().filter(function (s) { return !(S.ruinsCleared && S.ruinsCleared[s.id]); });
    var b = '<div class="small muted" style="margin-top:8px">上古遗迹：' +
      (S.ruin ? '正在探索中' : (known.length + ' 处在册')) + '</div>';
    b += '<div class="selgrid" style="margin-top:6px">';
    if (S.ruin) b += '<span class="chip" data-act="do;ruin">续探遗迹</span>';
    else b += '<span class="chip" data-act="do;ruin">访古（' + known.length + '）</span>';
    b += '<span class="chip" data-act="do;ruin_search">循残图寻访（一旬）</span>';
    b += '</div>';
    return b;
  };

  /* ---------- 坞入口 ---------- */
  (function () {
    var prev = EXT.dockItems;
    EXT.dockItems = function () {
      var S = cur();
      if (!S || !S.started) return prev ? prev() : [];
      var arr = prev ? prev() : [];
      var n = (S.relics || []).length;
      arr.push({
        k: '迹', t: '遗迹', g: '更多',
        s: S.ruin ? '探索中 · 第 ' + ((S.ruin.i || 0) + 1) + ' 节点' : (n ? '遗物 ' + n + ' 件' : '尚无遗物'),
        act: 'do;ruin'
      });
      return arr;
    };
  })();

})(window);
