/* 问道长生 v7.1 · 引擎
   三套体系：
   - 仙道（主流）：六境 + 果位，修灵气，会老死
   - 神道（备选）：八柱，修香火，在洞天，无寿元靠锚
   - 上古十境（传说）：残卷
   核心：v6.2 新增「锚」——道胎/八柱以上无寿元，靠 物·人·事·仪 四锚钉住
*/
(function (G) {
  'use strict';
  const D = G.WXCS3_DATA;
  /* v9.0 第2步：纯规则层。
     这 31 个函数已搬到 wxcs3-rules.js（不碰 DOM、不写 S、不产 HTML）。
     在这里绑成同名局部常量，本文件内 400 多处调用点一行都不用改。
     若 wxcs3-rules.js 未加载，直接报错而不是静默降级——
     缺了 fmtNum 会让所有数值显示变成 undefined，那种「能跑但显示错」更难查。 */
  const RULES = G.WXCS3_RULES;
  if (!RULES) throw new Error('缺少 wxcs3-rules.js：纯规则层未加载');
  const fmtNum = RULES.fmtNum, fmtTime = RULES.fmtTime, pad2 = RULES.pad2;
  const stampName = RULES.stampName, realmNameOf = RULES.realmNameOf;
  const buildMeta = RULES.buildMeta, envelope = RULES.envelope;
  const checkSaveVersion = RULES.checkSaveVersion;
  const keMul = RULES.keMul, qualityDef = RULES.qualityDef;
  const costLine = RULES.costLine, mainlineFor = RULES.mainlineFor;
  const placeVerse = RULES.placeVerse, tribDetail = RULES.tribDetail;
  const discipleStageOf = RULES.discipleStageOf, insightAt = RULES.insightAt;
  const unlockRow = RULES.unlockRow, unlockTable = RULES.unlockTable;
  const rankBaseXian = RULES.rankBaseXian, daotongClassOf = RULES.daotongClassOf;
  const shenTongKindMarked = RULES.shenTongKindMarked, stShort = RULES.stShort;
  const artName = RULES.artName, outNameOf = RULES.outNameOf;
  const matUsedBy = RULES.matUsedBy, hookDef = RULES.hookDef;
  const tallyInit = RULES.tallyInit, placeBaseLingqi = RULES.placeBaseLingqi;
  const goalRewardText = RULES.goalRewardText;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* v8.1 P0 M4：clamp 会原样放行 NaN（Math.min(NaN, x) → NaN）。
     御兽/师徒这批字段是后加的，旧档与旧测试里可能是 undefined；
     一旦 NaN 写进状态，后续每条公式都会静默变成 NaN，且不会抛错。
     凡是从存档读出来的数值，一律先过 numOr。 */
  const numOr = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const clampNum = (v, a, b, d) => clamp(numOr(v, d === undefined ? a : d), a, b);
  /* 版本号只在规则层定义一次，这里引用。
     旧代码把 '6.2' 硬编码在 envelope、checkSaveVersion、导出文件名、帮助面板四处；
     v9.0 把 envelope/checkSaveVersion 搬进 rules.js 时没把常量一起搬过去，
     造成「存档全端失败」。现在唯一权威来源是 RULES.SAVE_VER。 */
  const VER = RULES.SAVE_VER;

  const rnd = (n) => Math.floor(rng() * n) + 1;
  const rnd100 = () => rnd(100);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  /* v9.0 M0：统一可复现随机数。
     背景：全项目 61 处裸 Math.random，天劫、拍卖、NPC 来访、遗迹都不可复现，
     出了问题只能靠猜。这里换成一层可注入的 rng()：
       · 不注入时 rng = Math.random，普通玩家体验一字不变；
       · 注入 seed 后走 mulberry32，同一存档同一序列必定复现。
     只换「随机源」，所有概率公式、判定顺序一律不动——
     这样 M0 不会改变任何数值平衡，只是让随机变得可对账。 */
  let _rngSeed = null;      // null = 未注入，走系统随机
  let _rngState = 0;
  let _rngImpl = null;      // 当前 PRNG 实例
  function rng() { return _rngImpl ? _rngImpl() : Math.random(); }
  /* 注入/清除种子。seed 变化后序列从头开始，便于「同一测试存档复现」。 */
  function setSeed(seed) {
    if (seed === null || seed === undefined) { _rngSeed = null; _rngImpl = null; _rngState = 0; return null; }
    const n = (typeof seed === 'number' && isFinite(seed)) ? (seed | 0) : RULES.hashStr(String(seed));
    _rngSeed = n; _rngState = n; _rngImpl = RULES.mulberry32(n);
    return n;
  }
  function currentSeed() { return _rngSeed; }
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pickN(arr, n) {
    const c = arr.slice(), out = [];
    while (out.length < n && c.length) out.push(c.splice(Math.floor(rng() * c.length), 1)[0]);
    return out;
  }

  /* ============ 状态 ============ */
  let S = null;

  function newGame() {
    return {
      started: false, phase: 'create', createStep: 0, draft: null,
      year: 387, month: 3, turn: 0, age: 16,
      /* v9.0 M0：本局随机种子。写下之后，本世的每一次随机都能复现。 */
      seed: (Math.floor(Math.random() * 1e9) + 1),
      xun: 0,             // 本月已过几旬（0=上旬，1=中旬，2=下旬）
      xiuAcc: 0,          // 修为小数累积器：每旬给月修为/3，取整时不留误差

      name: '', dao: '', gender: '男', look: '', origin: null, path: null,
      cultivation: null,           // xian | shen | both
      faxiang: null, daotong: null, sanxuan: null,
      root: null, rootEls: [], body: null, talents: [],
      stats: { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 },

      hp: 100, hpMax: 100, mp: 100, mpMax: 100,
      /* v10.5 P0·C1：上限字段。hpMax/mpMax 是缓存，真值 = 基数 + 平加 × 乘区 */
      hpFlatBonus: 0, mpFlatBonus: 0,
      hpLuMul: 1, mpLuMul: 1, hpPermMul: 1, mpPermMul: 1,
      capVer: 1, mpGfMul: 1, hpGfMul: 1, lifeGfBonus: 0,

      // 仙道
      xRealm: 0, xStage: 0,        // 六境 + 小阶
      xiuwei: 0,                   // 本阶修为进度
      gongfa: ['juqi'],            // 主修功法
      xianji: null,                // 仙基
      daoyin: [],                  // 道途四印
      shenTong: [],                // 神通
      jinxing: false,              // 金性
      guowei: null,                // 果位

      // 神道
      pillar: 0, pos: 0,
      xianghuo: 0, followers: 0, piety: 1.0,
      miao: '野祀', miaoHao: '', benmingQuanbing: [],
      miaoUp: {},                  // 庙产：香炉/金身/功德箱/法铃/庙地契
      xiangExchangeMonth: 0,       // 本月已化香火钱（灵石数）
      stoneAcc: 0,                 // 香火钱的零头，攒够 1 石再入账

      // 通用
      lingqi: 1,                   // 灵气档（= max(地点基础, 洞府升级)）
      lingqiUp: 1,                 // 洞府升级档（花灵石/灵脉契提升的那部分）
      place: 'qingyue',            // 当前所在地
      stones: 200, fame: 0, merit: 0, karma: 0,
      lifeMax: 120, lifeStop: false,
      lu: null,
      bag: { pillHp: 1, pillMp: 1, heal: 1 },
      npcs: {}, sect: null,
      cave: { facilities: {} },
      combat: null,
      log: [], mainline: '',
      unlockStage: 0,
      goals: [], encSeen: [],       // 道途目标进度 / 最近见过的奇遇（防连刷同一个）
      inDongtian: false, shenwei: null, xianghuoQian: 0,

      // v6.2 锚
      anchors: { wu: 1, ren: 1, shi: 1, yi: 1 },   // 1=固 0.5=松 0=断
      anchorTick: { wu: 0, ren: 0, shi: 0, yi: 0 },// 到期计时（月）
      arts: [], equipped: {},       // 法宝与佩挂

      // —— v9.0 M1 道痕命格 ——
      fate: null,                  // {id, tier} 择痕之后永久生效
      fateReroll: 0,               // 一生一次重悟，用掉记 1

      // —— v6.3 能力三分：修炼功法 / 术法 / 神通 ——
      daogong: 'juqi',             // 修炼功法（道基，决定修炼速度与境界上限）
      skillsKnown: [],             // 术法（SKILLS 表 id；兼容字段名，v11 再删）
      skillsEquip: ['zhiquan'],    // 装配进斗法的术法，默认只带一击
      ownedArts: [],               // 术法（role=fa 的功法，id 前缀 fa:）

      // —— v6.3 宗门与家族 ——
      sect: null,                  // {rank, contrib, hall, peak, joinedTurn}
      clan: null,                  // {name, lv, pop, luck, ident, elders, rules, founded}

      // —— v6.3 年谱（完整纪事，不截断） ——
      chronicle: [],
      books: [], bookRead: {}, insightXp: 0,   // 道书与阅读进度
      /* v10.6：叙事标记。事件与奇遇写下的事，后续事件用它作前置——
         「火塘不认」先落 ancestor_reject，才轮得到「阴亲之议」。 */
      flags: {},
      lastVerse: '',

      // —— v6.4 四艺 ——
      craft: { dan: 0, qi: 0, fu: 0, zhen: 0 },   // 四艺熟练度
      craftLv: { dan: 1, qi: 1, fu: 1, zhen: 1 }, // 品级
      learnedArts: [],        // 已学会的四艺
      learnedRecipes: [],     // 已掌握的配方
      bagMat: {},             // 材料库存（与丹药法宝分开）
      talismans: {},          // 符箓库存
      craftedQ: {},           // 自制成品品相：{物品id:[{q,n}]}，与普通购货分开计价
      disks: [],              // 已布阵盘
      dishes: { dan: 0, qi: 0, fu: 0, zhen: 0 },  // 本月制作次数（用于收支）
      ledger: { income: [], expense: [] },        // 本月收支明细
      /* v10.5 P1·E8：行情双向——sell 是回收价，buy 是进货价。
         两套倍率分开波动，囤货与择时才有意义；护栏保证最低买入仍高于最高回收。 */
      market: { mul: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 },
                buy: { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 }, month: 0 },
      /* v10.5 P1·E4：坊市摆摊每月限件数（文案承诺），按月重置 */
      sellMonth: { market: 0 },
      sellCh: 'market',           // 卖出渠道：sect / market / black
      txHistory: [], pendingTx: null, lastLiturgy: '',
      breakBonus: 0, cultBonus: 1,  // 丹药临时加成
      pendingEnc: null, yaoshou: false, miaoSites: 0, debt: 0,   // debt 已废弃，仅旧档兼容
      /* v8.1 P0 批次3：御兽。barn 是兽栏（最多 BEAST_BARN[灵脉档] 头），
         bond 亲密 / power 妖力是两条互不替代的养成轴。 */
      barn: [], beastBond: 0, beastPower: 1,
      /* v9.0 M2：外物有命——本命法器与主战灵兽 */
      benming: null, warBeast: 0, beastOfficer: false, beastFedMonth: 0,
      /* v8.1 P0 批次4：师徒。disciple 每项 {id,name,days,stage,bond,alive}，
         与 NPC 好感（S.npcs[id].fav）分开存——师徒是人锚，情缘是另一条线。
         v9.0 M3：npcId 记人物身份，stay 记留山执事；school 与 timed 由扩展读写。
         注意 S.daotong 是「金行/木行」那种道统字符串，不是组织，别混用。 */
      disciples: [], masterId: null,
      school: null, timed: null, timedDone: {},
      anchorDone: { wu: false, ren: false, shi: false, yi: false },
      luHistory: [],               // 已受过的箓
      daoyinOk: false,             // 四印是否配成对
      shenweiIdx: 0, renGong: 0,   // 神位与renGong
      pages: 3, legacy: null,      // 百世书
      /* v9.0 M4：上古遗迹与百世道果。
         ruin 只存「当前这一次探索」的进度；已知/已探尽按处记，
         relics 是遗物收藏，道果是上一世留下、创角时兑现的一枚。 */
      ruin: null, ruinsKnown: {}, ruinsCleared: {}, relics: [],
      daoFruit: null,
      stoneAcc: 0,                 // 灵石零头（神道按月摊销）
      anchorMiss: { wu: 0, ren: 0, shi: 0, yi: 0 },// 误期计数
      collapse: 0,                  // 崩解期月数
      lastEventId: null, eventStreak: 0,
      // —— v6.6 功过格（只记，不算，不参与任何公式） ——
      ach: {}, tally: tallyInit(), achTab: 'gong', legacyMemory: null, bloodDebt: 0,

      // —— v8.0 神道神器 / 愿物 ——
      dArt: { staff: 0, mirror: 0, seal: 0 },  // 神器等级 0~3
      dArtIdle: 0,        // 连续停供月数（付不起维护时加成失效）
      votive: {},         // 愿物库存 { 物品id: 件数 }
      votMade: 0,         // 本月已制作次数
      votSold: 0,         // 本月已售出件数

      // —— v8.1 P0 M2 淬体 / M5 指令坞折叠 ——
      tribLock: 0,        // 天劫未过后还有几旬不能再破
      trib: null,         // 本次破境撞上的那类劫
      sectArrears: 0,     // 宗门欠课连月数（满 3 降一阶）
      arrears: 0,         // 固定开销欠缴连月数（影响修行效率）
      quench: 0,          // 淬体阶数 0~9（0 = 未淬）
      quenchApplied: 0,   // 已写进气血上限的阶数（防重复复利，存档迁移据此算增量倍率）
      dockOpen: {},       // 指令坞折叠组展开态

      // —— v8.0 拍卖会 ——
      aucSell: [],        // 本场寄存的拍品 [{kind,id,q,n,base,qMul}]
      aucYear: 0,         // 已进场的年份（一年只进一次）
      aucFloor: 'mid',    // 底价档 low/mid/high
      aucLot: null,       // 本场客籍拍品 id
      aucLotWon: null,    // 已拍得的客籍拍品名

      npcCall: null,      // 待处理的 NPC 主动事件 {id, kind}
      tutStep: 0,         // 新手引导进度（到 TUTORIAL_STEPS.length 即结束）
      hdRate: 0,          // 心魔劫：本次破境的原成功率
      prep: null,         // 破境准备：{place, pill, guard}
      pendingVengeance: false,   // 仇家已上门，等一个处理时机
      dying: null,        // 临终状态 {reason}
      dyingUsed: false,   // 一局只给一次临终选择
      legacyPact: null,   // 临终所托：pass / daotong，带到来世

      // —— v6.7 恩义·钩子 ——
      hooks: [],          // 你欠别人的（可能被收割）
      hooksGiven: [],     // 别人欠你的（可以讨，但可能赖账）
      hookPending: null,  // 正在被索（挡住奇遇，别把面板顶掉）
      hookSeen: 0         // 被窥视次数
    };
  }

  /* ============ 公式 ============ */
  const st = (k) => S.stats[k] || 1;
  const xrealm = () => D.XIAN_REALMS[S.xRealm];
  const pillar = () => D.PILLARS[S.pillar];
  const posName = () => D.POSITIONS[S.pos];

  function isXian() { return S.cultivation === 'xian'; }
  function isShen() { return S.cultivation === 'shen'; }
  /* 神道线判定：纯神道或双修都应能走神道（修复 P1-9） */
  function usesShenLine() { return isShen() || S.cultivation === 'both'; }

  function realmName() {
    if (isXian() || S.cultivation === 'both') {
      const r = xrealm();
      const s = r.stages[S.xStage] || '';
      return r.name + (s ? '·' + s : '');
    }
    return pillar().name + '·' + posName();
  }

  /* 仙道月修为 */
  function monthXiuwei() {
    const r = xrealm();
    if (!r.base) return 0;
    const qi = D.LINGQI[S.lingqi].v;
    const qual = st('qualify') / 10;
    const root = S.root ? D.ROOTS[S.root].mul : 1;
    const g = getDaogong();
    const gf = g ? D.GONGFA_TIERS[g.tier].mul : 1;
    let zt = 1.0;
    if (hpRatio() < 0.33) zt = 0.4;
    else if (hpRatio() < 0.66) zt = 0.7;
    else if (hpRatio() < 0.9) zt = 0.9;

    let v = r.base * qi * qual * root * gf * zt;
    // 体质加成只在这里乘一次（先天道体 +50%）
    if (S.body === 'dao') v *= 1.5;
    const _bd1 = D.BODIES.filter(function (b) { return b.id === S.body; })[0] || {};
    if (_bd1.both && S.cultivation === 'both') v *= _bd1.both;   // 玄阴 / 纯阳：双修增益
    if (S.lu && S.lu.name === '行气吞灵') v *= 1.2;
    if (S.cultivation === 'both') v *= 0.8;   // 未定：前两阶 −20%
    if (S.meditate) v *= 2;                   // 闭关 ×2
    if (S.cultBonus && S.cultBonus > 1) v *= S.cultBonus; // 日月玄浆：本月有效
    const _arr1 = Math.max(0, S.arrears || 0);
    if (_arr1) v *= Math.max(D.FIXED_COST.arrearsFloor, 1 - D.FIXED_COST.arrearsStep * _arr1);
    if (hasDebuff('borrowed_luck')) v *= 1.2;  // 借来的运：快，但会走火
    v *= xiuweiGongfaMul(zt);
    return v;
  }

  /* v10.4 P1·3.2：功法倾向进修炼公式。
     ------------------------------------------------------------
     病了十几年的老问题：45 本功法同品阶修炼收益完全一样——
     因为 `gf` 只读品阶（黄 1.0 → 仙 3.0），功法自己的 effect 零参与。
     这里不新造字段，只从已有 EFFECT 派生一个乘区：
       heal  → 疗伤本钱：伤势惩罚减免（zt 从 0.4 抬到 0.4+0.12 这种）
       ward  → 守成：闭关时稳一点（现无走火判定，落到闭关收获上，见下）
       fate  → 卜筮：不加修为，改在奇遇侧生效（见 gongfaFateAdd）
     关键取舍：**不是所有功法都该加快修炼**。`all`/`dims` 这类纯战力功法
     一律不加，否则「换功法」就退化成「换一个更大的数字」。 */
  function xiuweiGongfaMul(zt) {
    const X = G.WXCS3_EXT;
    if (!X) return 1;
    let m = 1;
    /* heal：长春功 0.25 / 续脉决 0.30 / 月湖映秋诀 0.10
       伤势越重，减免越明显——这正是「带伤修炼」最疼的地方。 */
    const heal = X.gongfaHeal ? numOr(X.gongfaHeal(), 0) : 0;
    if (heal > 0 && zt < 1) {
      m *= 1 + heal * (1 - zt) * 1.6;
    }
    /* ward：闭关时守得住，收获更实。
       方案原意是「降低闭关走火概率」，但本项目闭关没有走火判定
       （走火只挂在「借来的运」这条 debuff 上）。与其新造一个风险，
       不如兑现成「闭关收获 +ward 的一半」——同一句「稳」，不新增系统。 */
    const ward = X.gongfaWard ? numOr(X.gongfaWard(), 0) : 0;
    if (ward > 0 && S.meditate) m *= 1 + ward * 0.5;
    /* 功法磨得越久越显差异：品阶低的功法在本项上不吃亏，
       因为乘区只由 effect 决定，与 tier 无关。 */
    return clamp(m, 1, 1.6);
  }

  /* 庙产计数 */
  function miaoUpCount(k) { return (S.miaoUp && S.miaoUp[k]) || 0; }

  /* 神道月香火 */
  function monthXianghuo() {
    const f = S.followers / 4;
    const miaoC = D.MIAO_COEFF[S.miao] || 1;
    const qi = D.LINGQI[S.lingqi].v;
    /* v10.1 第三梯队·问题6：原为魔法数 isShen()?1.2:0.8，
       与 D.QIHE 表数值完全相同却从不读表，clash:0.6 从未被用过。
       现改由扩展按「本命/客庙/相冲」三态取系数。
       typeof 保护：test_econ 会把本函数单独抽出来跑，那里没有外层 G。 */
    const _Q = (typeof G !== 'undefined') ? G.WXCS3_EXT : null;
    const qiheC = (_Q && _Q.xianghuoQiheMul) ? _Q.xianghuoQiheMul() : (isShen() ? 1.2 : 0.8);
    let zt = 1.0;
    if (hpRatio() < 0.33) zt = 0.4;
    else if (hpRatio() < 0.66) zt = 0.7;
    if (S.templeBroken) zt = Math.min(zt, 0.6);
    let v = f * S.piety * miaoC * qi * qiheC * zt;
    v *= (1 + 0.08 * miaoUpCount('lu'));          // 铜香炉：每座 +8%
    if (S.body === 'dao') v *= 1.5;
    const _bd2 = D.BODIES.filter(function (b) { return b.id === S.body; })[0] || {};
    if (_bd2.both && S.cultivation === 'both') v *= _bd2.both;
    if (S.cultivation === 'both') v *= 0.8;
    if (S.meditate) v *= 1.5;
    const _arr2 = Math.max(0, S.arrears || 0);
    if (_arr2) v *= Math.max(D.FIXED_COST.arrearsFloor, 1 - D.FIXED_COST.arrearsStep * _arr2);
    const cap = pillar().need / 12;
    /* v10.4 P0·3.1：香火成神法「以香火铸神 +15%」。
       功法加成只乘在回报上，不动 cap —— 上限属于柱位，不该被一本书改写。
       用内联读取而不是调 gongfaXianghuoMul()：tools/test_econ.js 会把本函数
       整段抽到裸沙箱里跑（那里没有外层闭包与 EXT），与 maxXianghuo 同一个坑。 */
    const _XH2 = (typeof G !== 'undefined') ? G.WXCS3_EXT : null;
    const _xhv = (_XH2 && _XH2.gongfaXianghuo) ? _XH2.gongfaXianghuo() : 0;
    if (_xhv > 0) v *= (1 + clamp(_xhv, 0, 0.5));
    return { raw: v, capped: Math.min(v, cap), cap };
  }

  function maxXianghuo() {
    /* v10.1 第二梯队·问题1：旧版 load>=1.5?2.5:2 把五种灵根压成两档，
       天/地/变异挤一档、真/伪挤一档。改由扩展给五档，资质真正分层。 */
    /* 用 typeof 保护：tools/test_econ.js 会把这个函数单独抽出来在沙箱里跑，
       那里没有外层闭包的 G。缺扩展时退回旧的两档，行为不变。 */
    const _X = (typeof G !== 'undefined') ? G.WXCS3_EXT : null;
    const _xcap = (_X && _X.xianghuoCapMul) ? _X.xianghuoCapMul() : null;
    const _xdef = S.root ? D.ROOTS[S.root].load : 1;
    const _xmul = (_xcap != null) ? _xcap : (_xdef >= 1.5 ? 2.5 : 2);
    const base = pillar().need * _xmul;
    /* 庙地契 +30%/张；牧土神印 +15%/级（v8.0） */
    return Math.round(base * (1 + 0.3 * miaoUpCount('di')) * dArtSealMul());
  }

  /* ============ v8.0 神道神器 ============
     三件神器都只加「已有的东西」：显圣信众、显圣耗香、香火上限与权柄斗法。
     不做新的资源，也不碰仙道；断了灵石供奉就集体失效——这是它们唯一的下限。 */
  function dArtRaw(id) { return (S.dArt && S.dArt[id]) || 0; }
  /* 停供期间等级还在，但一切加成都当 0 用；补上维护就立刻恢复。 */
  function dArtLv(id) { return (S.dArtIdle ? 0 : dArtRaw(id)); }
  function dArtUpkeep() {
    let sum = 0;
    for (const a of D.DIVINE_ARTIFACTS) sum += a.upkeep * dArtRaw(a.id);
    return sum;
  }
  /* 摄心神杖：显圣所得信众 ×(1+20%/级) */
  function dArtStaffMul() { return 1 + 0.20 * dArtLv('staff'); }
  /* 照愿法镜：显圣耗香 −8%/级（与法铃叠乘，合计最低留四成） */
  function dArtMirrorCut() { return clamp(0.08 * dArtLv('mirror'), 0, 0.6); }
  /* 牧土神印：香火上限 +15%/级；权柄斗法 +12%/级 */
  function dArtSealMul() { return 1 + 0.15 * dArtLv('seal'); }
  function dArtSealPower() { return 1 + 0.12 * dArtLv('seal'); }

  /* ============ v8.0 愿物 ============
     香火 → 灵石的第二条闸门。坊市的「化香火钱」按月只出 2~5 石，
     愿物则把香火做成香客要买的东西：能换更多灵石，但要先垫灵石成本、
     且受信众数量限制（没人来买，做出来只能压仓）。两条渠道各走各的，不互通。 */
  function votItem(id) { return D.VOTIVE_ITEMS.find(function (v) { return v.id === id; }) || null; }
  function votHave(id) { return (S.votive && S.votive[id]) || 0; }
  /* 有信众才有人来求；庙再大，没人上门也做不成生意。 */
  function votCraftCap() { return clamp(1 + Math.floor((S.followers || 0) / 800), 1, 4); }
  function votSellCap() { return clamp(1 + Math.floor((S.followers || 0) / 400), 1, 5); }
  function votStockTotal() {
    let n = 0;
    for (const v of D.VOTIVE_ITEMS) n += votHave(v.id);
    return n;
  }

  /* ============ v8.0 信众来源缩放 ============
     传教是「常数收益」，流失是「百分比」，于是信众必然在 收益/流失率 处饱和：
     30+115 人/月 ÷ 1% ≈ 11500 人——这个数与柱位无关。
     而五柱起的信众上限是 3 万 / 9.5 万 / 30 万，光靠传教永远够不到，
     结果就是越往后越只能反复刷显圣（一次几百人，要刷几百次）。
     这里让「传教」与「显圣」两条来源都随上限等比放大，
     使每柱拉信众的耗时稳定在一两年，而不是按柱位指数级增长。 */
  function followerScale() {
    return Math.max(1, followLimit() / 3450);
  }

  /* 买香只能补到本柱需求的八成——余下两成须得真信众来烧 */
  function xiangBuyCap() {
    return Math.round(pillar().need * D.EXCHANGE.buyCapRatio);
  }

  /* 每月可化香火钱的上限（灵石）：香火钱箱就那么大 */
  function xiangOutCap() {
    const x = D.EXCHANGE;
    return x.outCapBase + Math.floor(S.followers / x.outCapPer) + x.outCapBox * miaoUpCount('box');
  }

  /* 锚定强度 */
  function anchorStrength() {
    let v = 0;
    for (const k in S.anchors) v += S.anchors[k];
    return v;
  }
  function anchorStatus() {
    const v = anchorStrength();
    for (const a of D.ANCHOR_STATUS) if (v >= a.min && v < a.max) return a;
    return D.ANCHOR_STATUS[D.ANCHOR_STATUS.length - 1];
  }
  function needsAnchor() {
    return (isXian() && S.xRealm >= 5) || (isShen() && S.pillar >= 7) || S.cultivation === 'both' && S.xRealm >= 5;
  }

  /* ============ 时间 ============ */
  const MN = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

  /* ============================================================
     v8.0 行动预算：月拆三旬
     ------------------------------------------------------------
     改之前的问题：修为由 monthXiuwei() 在 advanceMonth 里自动结算，
     「打坐」按钮本身不产出任何东西——它只是调用 advanceXun(1)。
     于是时间不是成本，是奖励：你躺着不动，修为照样涨。
     155 个动作里有 125 个不花时间，所有系统都是免费外挂，
     没有取舍，也就没有策略。

     改之后：每月三旬，每旬一次行动。
       打坐 1 旬  → 修为 + 月修为/3
       全月打坐   → 月修为（与改前完全一致，数值曲线不动）
       做一件事   → 少 1/3 月修为，这就是机会成本

     XUN_PER_MONTH 设成 1 即退回「一月一行动」的旧行为。
     这是唯一的回退开关：所有时间推进都走 advanceXun()。
     ============================================================ */
  const XUN_PER_MONTH = 3;
  const XUN_NAME = ['上旬', '中旬', '下旬'];
  /* 一月要打坐三次才顶过去，如果三次回报同一句话，
     玩家会觉得在点点点。三旬各一句，成本极低，但把「重复」变成了「推移」。 */
  const XUN_SIT = [
    '天没亮就坐了，露水顺着瓦檐滴到石阶上。',
    '日头移到院当中，影子缩到脚边不动了。',
    '夜里坐的，灯芯爆了一下，屋里暗了半瞬。'
  ];
  function season() { const m = S.month; return m >= 3 && m <= 5 ? '春' : m <= 8 ? '夏' : m <= 11 ? '秋' : '冬'; }
  function timeLine() {
    const y = Math.floor(S.turn / 12);
    const xn = XUN_NAME[S.xun || 0] || '';
    return (y === 0 ? `天玄历 ${S.year} 年 · ${MN[S.month]}月` : `入道第 ${y} 年 · ${MN[S.month]}月`) + ' ' + xn;
  }

  /* 修为入账：带小数累积器，保证「每旬给月修为/3」三次之后与「给整月修为」一致。
     直接 Math.round(v/3) 会每旬丢掉零点几，三个月能差出三四点，
     全打坐路径的时长就会与改前对不上。 */
  function gainXiuwei(v) {
    if (!(v > 0)) return 0;
    /* v9.0 M1：命格与劫伤的修炼折损在扩展里（丹火养命 −5%、折骨风余伤折半），
       这里只留一个读数口，具体数值见 wxcs3-ext-fate.js / wxcs3-ext-trib.js */
    v = v * fateMul('cult');
    S.xiuAcc = (S.xiuAcc || 0) + v;
    const whole = Math.floor(S.xiuAcc);
    if (whole <= 0) return 0;
    S.xiuAcc -= whole;
    const need = xrealm().need;
    const before = S.xiuwei;
    S.xiuwei = need ? Math.min(need, S.xiuwei + whole) : S.xiuwei + whole;
    return S.xiuwei - before;
  }

  /* 推进 n 旬。这是全项目唯一的时间入口。
     ------------------------------------------------------------
     跨旬不结算世界，跨月才走 advanceMonth()——寿元、家族、NPC、行情、
     维护这些本来就是「按月」的事，不该被拆成三次。
     动作的时间成本一律 1 旬，写法统一为 advanceXun(1)。 */
  function advanceXun(n) {
    n = n || 1;
    for (let i = 0; i < n; i++) {
      /* 天劫余威按「旬」走：锁的是三旬，不是三月 */
      if (S.tribLock > 0) { S.tribLock--; if (!S.tribLock) logLine('天劫余威散了，可以再试。', ''); }
      S.xun = (S.xun || 0) + 1;
      if (S.xun >= XUN_PER_MONTH) {
        S.xun = 0;
        advanceMonth(1);
        if (S.phase !== 'play') return;
      }
    }
  }

  function advanceMonth(n) {
    n = n || 1;
    for (let i = 0; i < n; i++) {
      S.turn++; S.month++;
      if (S.month > 12) { S.month = 1; S.year++; }
      // 新的一月：清空收支账本（上个月的已在左栏看过）
      ledgerReset();
      S.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
      S.votMade = 0; S.votSold = 0;   // 愿物按月重置制作/售出次数
      S.xiangExchangeMonth = 0;      // 香火钱箱按月清空额度
      S.sellMonth = { market: 0 };   // v10.5 P1·E4：坊市摊位额度按月重置

      /* —— 仙道：修为不再由时间自动产出。
         旧版这里直接 S.xiuwei += monthXiuwei()，等于「你躺着也涨」，
         于是「打坐」按钮没有任何独立价值，它只是主动跳过一个月。
         现在修为只由打坐产出（ACT.cultivate 每旬给月修为/3，闭关按月给）。
         lastGain 仍按满月速率记，界面用它显示「若全月打坐能得多少」。 */
      if (isXian() || S.cultivation === 'both') {
        S.lastGain = Math.round(monthXiuwei() * 10) / 10;
      }

      /* —— 神道：香火不再由时间自动产出（与修为同理），
         改由「坐庙温养」按旬给出。这里只留信众生灭——
         生老病死是世界的节律，本来就该按月。 */
      if (isShen() || S.cultivation === 'both') {
        if (S.followers > 0) {
          // P1-10：按设定的「净」流失率结算（生灭已折进这个数）
          let loss = S.trustee ? 0.003 : (S.meditate ? 0.02 : 0.01);
          if (S.sanxuan === 'dou') loss *= 0.8;   // 兜玄：信众增长 +20% → 流失打八折
          S.followers = Math.max(0, Math.round(S.followers * (1 - loss)));
          const lim = followLimit();
          if (lim && S.followers > lim) S.followers = lim;
        }
      }

      // —— 寿元（年龄只在跨年时 +1）
      S.lifeStop = isShen() && lifeStoppedShen();
      if (needsAnchor()) {
        S.lifeStop = true;   // 无寿元上限
        if (S.month === 1) S.age++;
      } else if (S.lifeStop) {
        if (S.month === 1) S.age++;   // 香火续命：年龄只增不减
      } else if (S.month === 1) {
        S.age++;
        /* v10.4 P0·3.1：太阴蜕形尸解真法「死生不复为形所囿」。
           此前 lifeStop 只是数据表里的一个字，game.js 从不读它。
           兑现方式：寿元到限时不立刻死，改成「这一篇替你挡一次」——
           挡过之后修为折损，但人还在。不写成永久免死，否则寿元这条线就废了。 */
        if (S.age >= S.lifeMax) {
          if (gongfaLifeStop() && !S.lifeStopUsed) {
            S.lifeStopUsed = true;
            S.lifeMax = Math.max(S.age + 30, S.lifeMax);
            S.xiuwei = Math.max(0, Math.round((S.xiuwei || 0) * 0.5));
            logLine('寿元已尽。尸解之法自行运转，形蜕而神存 —— 寿元上限续至 ' + S.lifeMax + '，修为折半。', 'danger');
            toast('尸解 · 死生不复为形所囿');
          } else {
            die('寿元耗尽。你在蒲团上坐着，直到风把道袍吹干。'); return;
          }
        }
      }

      // 人情压身：一年老一分道心
      if (S.month === 1 && hasDebuff('debt_weight')) {
        S.stats.heart = Math.max(1, S.stats.heart - 1);
        logLine('又一年。你想不清自己欠了几个人。道心 −1。', 'danger');
      }

      // —— 锚时钟（P0-5：到期未办 → 转松/转断，之后 resolveAnchors 接管）
      if (needsAnchor()) {
        tickAnchors();
        resolveAnchors();
        if (S.phase !== 'play') return;
      }
      // —— 气血自然回复（按月，按境界，按伤势打折）
      if (S.hp < S.hpMax && S.hp > 0) {
        S.hp = Math.min(S.hpMax, S.hp + monthlyHeal());
      }
      /* v10.4 P0·3.1：吞海功/补天真经/太阴吐纳这类「改上限」的功法，
         在这里统一对齐一次。与受箓、破境、读档三处同一口径。 */
      syncMpCap();
      syncLifeBonus();
      /* v10.4 P2·12：以这本功法为道基在修，熟练度自然长。
         每月 4 点，闭关翻倍 —— 闭关才是真下的功夫。 */
      if (isXian() || S.cultivation === 'both') addGfProf(S.meditate ? 8 : 4, '于月下运转');
      // —— 灵力回复（原只在吃丹药与创角时变化，打几场就永久枯竭）
      if (S.mp < S.mpMax) {
        /* v10.5 P1·C4：月回灵同样按上限百分比兜底，
           否则上限涨到千级后，「5+境界×3」这点回复会让连续战斗直接卡死。 */
        S.mp = Math.min(S.mpMax, S.mp + Math.max(5 + (S.xRealm || 0) * 3, Math.round(S.mpMax * MONTH_MP_PCT)));
      }
      // —— 神位人功（P0-7）
      tickShenwei();
      // —— 家族：族人供奉与族运自然增长
      tickClan();
      // —— v8.0：NPC 主动来访/病故（一次只挂一件，不打断当前面板）
      if (S.phase === 'play') tickNpcEvents();
      /* —— v8.0 仇家上门：业力与夺祀/叛门的真后果
         旧版 S.enemy 只在夺祀时置一次 true，之后再没人读过，
         等于「你多了个死仇」只是一句日志。现在它会真的找上门。 */
      if (S.phase === 'play' && !S.combat && !S.pendingVengeance) {
        if (S.enemy) {
          const chase = clamp(0.02 + S.karma / 2000, 0.02, 0.08) * fateMul('venv');   // v9.0 M1：血债偿心，仇家来得更快
          if (rng() < chase) S.pendingVengeance = 'person';
        }
        /* 叛门的账也要有人来收。旧版 S.enemySect 写了一次就再没人读过，
           等于「立过的誓会咬人」只是面板上的一句话。 */
        if (!S.pendingVengeance && S.enemySect && rng() < 0.03) {
          S.pendingVengeance = 'sect';
        }
      }
      // —— 四艺：行情波动、阵盘维持费
      tickMarket();
      if (Array.isArray(S.disks) && S.disks.length) {
        let upkeep = 0;
        S.disks.forEach(function (d) {
          const dk = D.ARRAY_DISKS.find(function (x) { return x.id === d.id; });
          upkeep += dk ? dk.upkeep : 0;
        });
        if (upkeep > 0) {
          if (S.stones >= upkeep) {
            S.stones -= upkeep;
            ledgerAdd('out', '阵盘维持', upkeep);
          } else {
            // 付不起就失效
            S.disks = [];
            logLine('灵石断了，阵盘一座座暗下去。', 'danger');
          }
        }
      }
      // —— v8.0 神器维护：灵石供奉断了，加成本月全失效（等级不降，补上即恢复）
      const artUp = dArtUpkeep();
      if (artUp > 0) {
        if (S.stones >= artUp) {
          S.stones -= artUp;
          ledgerAdd('out', '神器维护', artUp);
          if (S.dArtIdle) logLine('神器重新供上了，铃又响了。', 'good');
          S.dArtIdle = 0;
        } else {
          S.dArtIdle = (S.dArtIdle || 0) + 1;
          logLine('灵石断了供奉，神器一间间静下来。', 'danger');
        }
      } else if (S.dArtIdle) { S.dArtIdle = 0; }

      /* —— v9.0 M2：外物有命。扩展的月结钩子（本命反噬/温养账、
         灵兽饥饿/叛逃/兽官亲昵）——外物的日子也按月过。 */
      const _XM = G.WXCS3_EXT;
      if (_XM && _XM.onMonthHooks) {
        for (let _i = 0; _i < _XM.onMonthHooks.length; _i++) _XM.onMonthHooks[_i]();
        if (S.phase !== 'play') return;
      }

      // —— 宗门月俸
      if (S.sect && S.sect.rank > 0) {
        const pay = D.SECT.ranks[S.sect.rank].pay;
        if (S.month === 1) { S.stones += pay * 12; logLine('宗门年俸到账：灵石 +' + pay * 12 + '。', ''); }
      }
      // —— 神道灵石进项（P1-12）
      if (usesShenLine()) {
        S.stoneAcc = (S.stoneAcc || 0) + shenStoneIncome();
        if (S.stoneAcc >= 1) {
          const g2 = Math.floor(S.stoneAcc);
          S.stones += g2;
          S.stoneAcc -= g2;
          ledgerAdd('in', '香火钱', g2);
        }
      }

      // —— 固定开销（v8.1 收尾项 2）：不做事也要付的钱
      applyFixedCosts();

      // —— 香火反噬
      if (isShen() && S.karma > 50 && !S.sui) {
        if (rnd100() <= S.karma / 5) {
          const halve = S.merit > 50 ? 0.5 : 1;
          if (S.body === 'chun' && !S.chunImmune) S.chunImmune = true;
          else if (rnd100() <= 50 * halve) {
            S.rebound = (S.rebound || 0) + 1;
            S.stats.heart = Math.max(1, S.stats.heart - 1);
            S.followers = Math.round(S.followers * 0.9);
            S.suiFlag = true;
            if (S.rebound >= 3) S.sui = true;
          }
        }
      }
    }
    // P1-9：截断到 maxXianghuo（need×2~2.5），余额保留为超额储备
    if (isShen() && S.xianghuo > maxXianghuo()) S.xianghuo = maxXianghuo();
    // —— v6.6 功过格钩子 1：月度统计（必须放 for 之外，否则推进 n 月会跑 n 遍）
    if (S.phase === 'play') { afterMonthTally(); tickHooks(); checkAch(); }
  }

  function lifeStoppedShen() {
    const th = [100, 300, 800, 2000, 5000, 12000, 30000, 80000][S.pillar] || 100;
    return S.followers >= th && S.xianghuo > 0;
  }

  /* ============ 锚结算（v6.2 核心） ============ */
  function resolveAnchors() {
    const v = anchorStrength();
    const status = anchorStatus();

    if (v >= 3.0) {
      // 恢复稳定必须把崩解计数归零，否则一旦崩解过，
      // 状态栏永远挂着「崩解期第 N 月」，do_med 也会永久提前中断。
      if (S.collapse > 0) { S.collapse = 0; logLine('四锚复固，崩解止住了。', 'good'); }
      S.anchorState = '稳'; return;
    }

    if (v >= 2.0) {
      S.anchorState = '虚';
      if (rnd100() <= 20) {
        // 恍惚：忘一件事
        S.forgetCount = (S.forgetCount || 0) + 1;
        logLine('恍惚——你忽然想不起一个本该记得的事。', 'danger');
      }
      return;
    }

    if (v >= 1.0) {
      S.anchorState = '将散';
      if (rnd100() <= 60) logLine('异象：影子短了一截，信徒说神像换了张脸。', 'danger');
      return;
    }

    // 失锚 → 崩解期
    S.anchorState = '失锚';
    S.collapse = (S.collapse || 0) + 1;
    if (S.collapse === 1) logLine('崩解第 1 月：金性生锈／塑像裂／仪式忘了词。', 'danger');
    else if (S.collapse === 2) logLine('崩解第 2 月：你说话带上了回声。', 'danger');
    else if (S.collapse >= 3) {
      // 补回至少两根锚才能挽回
      let solid = 0;
      for (const k in S.anchors) if (S.anchors[k] >= 1) solid++;
      if (solid < 2) {
        die(isXian() ? '道化：意识散作山雾。形犹在，已非汝。'
                     : '枯朽：像犹在，不复应汝。');
        return;
      }
      S.collapse = 0;
      logLine('你在最后一月补回了锚，稳住了自己。', 'good');
    }
  }

  function logLine(txt, cls) {
    S.log.unshift({ t: timeLine(), txt, cls: cls || '' });
    if (S.log.length > 200) S.log.pop();
    // 年谱：左栏事件流只留 200 条给现场看，年谱留全部，可导出成文件
    if (!Array.isArray(S.chronicle)) S.chronicle = [];
    S.chronicle.push({
      turn: S.turn, year: S.year, month: S.month, age: S.age,
      realm: realmName(), cls: cls || '', txt: txt
    });
    if (S.chronicle.length > 4000) S.chronicle.shift();
  }
  /* toast 队列：1800ms 内的第二条不再顶掉第一条。
     容器带 aria-live（见 HTML），屏幕阅读器也能收到这条唯一全局反馈。 */
  const TOAST_Q = [];
  let toastBusy = false;
  function toast(m) {
    const el = document.getElementById('toast');
    if (!el) return;
    TOAST_Q.push(String(m));
    if (TOAST_Q.length > 8) TOAST_Q.shift();
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const el = document.getElementById('toast');
    if (!el) { toastBusy = false; return; }
    const m = TOAST_Q.shift();
    if (m === undefined) { toastBusy = false; el.classList.remove('show'); return; }
    toastBusy = true;
    el.textContent = m;
    el.classList.add('show');
    /* 关键数值给得久一点；但最长 4.2s，免得排队拖尾 */
    const dur = Math.min(4200, Math.max(1800, 1200 + m.length * 60));
    clearTimeout(toast._h);
    toast._h = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(nextToast, 220);
    }, dur);
  }
  function die(reason) {
    /* v8.0：临终一择。还有一口气时先给玩家三条路——最后一搏、传功后人、托付道统。
       一局只给一次（S.dyingUsed），用过之后再死就是真死，免得变成反复读命的免死金牌。 */
    if (S.phase === 'over' || S.phase === 'dying') return;
    if (!S.dyingUsed) {
      S.dyingUsed = true;
      S.dying = { reason: reason };
      S.phase = 'dying';
      S.combat = null;
      try { checkAch(); } catch (e) { }
      return;
    }
    finalizeDeath(reason);
  }

  function finalizeDeath(reason) {
    // —— v6.6 过格记账：所有死亡都从这里出去 ——
    try {
      const t = tly();
      t.deaths = (t.deaths || 0) + 1;
      if (S.combat && S.combat.foe) {
        const myR = realmIdxRank(positionRank()), foeR = realmIdxRank(S.combat.foe.rank);
        if (myR === foeR) bump('deathBySame');
        if (combatTierNow(S.combat) === '绝境') bump('deathCrush');
      }
      if (/寿元/.test(String(reason))) bump('deathSit');
      if (/道化|锚|枯朽/.test(String(reason))) bump('deathDaohua');
      let near = 0; const g2 = S.npcs || {};
      for (const k in g2) if ((g2[k] || {}).fav >= 40) near++;
      if (!near) bump('deathLonely');
      if ((S.chronicle || []).length < 10) bump('deathEmpty');
    } catch (e) { }
    S.phase = 'over'; S.deathReason = reason; S.combat = null;
    try { checkAch(); } catch (e) { }
  }

  /* ============ 渲染工具 ============ */
  /* 数值变化追踪：涨青玉、跌朱砂，600ms 回落。
     整个 stage 是 innerHTML 整块替换，CSS 拿不到「旧值→新值」，
     所以上一帧只能记在 JS 里。换存档/新开局时引用变化，自动清空。 */
  let _lastVals = {}, _lastBars = {}, _lastSRef = null;
  function syncTrackRef() {
    if (_lastSRef !== S) { _lastSRef = S; _lastVals = {}; _lastBars = {}; }
  }
  function flashCls(key, v) {
    syncTrackRef();
    const prev = _lastVals[key];
    _lastVals[key] = v;
    if (prev === undefined || !isFinite(prev) || prev === v) return '';
    return v > prev ? ' numgain' : ' numloss';
  }
  function bar(cur, max, color, key, label) {
    const w = 4.5, frac = clamp(cur / (max || 1), 0, 1), a = frac * w;
    let cls = '', st = `width:${a}em;background:${color}`;
    if (key) {
      syncTrackRef();
      const prev = _lastBars[key];
      _lastBars[key] = frac;
      /* 进度条不能靠 transition：新节点没有旧宽度。
         把上一帧写进 --from，用 keyframes 从旧宽度长到新宽度。 */
      if (prev !== undefined && isFinite(prev) && Math.abs(prev - frac) > 0.001) {
        cls = ' fill--shift';
        st += `;--from:${(prev * w).toFixed(3)}em`;
      }
    }
    const low = (key === 'hp' || key === 'foe_hp') && frac < 0.33 ? ' low' : '';
    const aria = 'role="progressbar" aria-valuemin="0" aria-valuemax="' + Math.round(max || 0) +
      '" aria-valuenow="' + Math.round(cur) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '');
    const numCls = key ? flashCls(key + ':num', Math.round(cur)) : '';
    return `<span class="barwrap"><span class="bar${low}" style="width:${w}em" ${aria}>
      <i class="fill${cls}" style="${st}"></i></span>
      <span class="barnum${numCls}">${fmtNum(cur)}/${fmtNum(max)}</span></span>`;
  }
  function elemChip(k) {
    const e = D.ELEMENTS[k] || D.MUT_ELEMENTS[k];
    return e ? `<span class="elem" style="background:${e.color}">${e.name}</span>` : '';
  }
  /* ---------- 条目图标（2026-11-18 图标层） ----------
     图标只回答「这是哪一类」，不承载数值：等级/品阶仍走色板 chip。
     缺图时返回空串——界面回退到纯文字，不留破图位。
     table+id → 图标键的归并规则见 wxcs3-icons.js（生成物，勿手改）。 */
  function iconKey(table, id) {
    const I = (typeof WXCS3_ICONS !== 'undefined') ? WXCS3_ICONS : null;
    return I ? I.icon(table, id) : null;
  }
  function iconSrc(key) {
    const A = (typeof WXCS3_ART !== 'undefined') ? WXCS3_ART : null;
    return A ? A.iconSrc(key) : null;
  }
  /* size: 'xs'=16(列表行) 'sm'=24 'md'=32(创角卡) 'lg'=48(弹窗) */
  function iconTag(table, id, size, cls) {
    const key = iconKey(table, id);
    if (!key) return '';
    const src = iconSrc(key);
    if (!src) return '';
    return `<img class="ico ico--${size || 'xs'}${cls ? ' ' + cls : ''}" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">`;
  }
  /* 已知道图标键时直接贴（用途/氛围图走这条） */
  function iconTagByKey(key, size, cls) {
    if (!key) return '';
    const src = iconSrc(key);
    if (!src) return '';
    return `<img class="ico ico--${size || 'xs'}${cls ? ' ' + cls : ''}" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">`;
  }
  function panel(title, body, o) {
    o = o || {};
    return `<div class="panel ${o.cls || ''}"><div class="ph">${esc(title)}${o.sub ? `<span class="sub">${o.sub}</span>` : ''}</div><div class="pb">${body}</div></div>`;
  }
  const divider = () => '<div class="divider"></div>';
  function optRow(k, txt, tag, note, dis, act) {
    const t = tag ? `<span class="tag ${tag.cls}">${esc(tag.name)}</span>` : '';
    return `<li class="opt"${dis ? ' disabled' : ''} data-act="${esc(act)}">
      <span class="key">${esc(k)}</span>${t}<span class="txt">${esc(txt)}</span>
      ${note ? `<span class="note">${esc(note)}</span>` : ''}</li>`;
  }
  /* 带图标的项目行（2026-11-18 图标层）。
     与 optRow 并列而非改 optRow：optRow 被 100+ 处复用，
     改它会波及所有弹窗的行布局。图标缺失时本函数退化成 optRow 的样子。 */
  function iconRow(table, id, k, txt, tag, note, dis, act, size) {
    const ico = iconTag(table, id, size || 'xs');
    if (!ico) return optRow(k, txt, tag, note, dis, act);
    const t = tag ? `<span class="tag ${tag.cls}">${esc(tag.name)}</span>` : '';
    return `<li class="opt opt--ico"${dis ? ' disabled' : ''} data-act="${esc(act)}">
      ${ico}<span class="key">${esc(k)}</span>${t}<span class="txt">${esc(txt)}</span>
      ${note ? `<span class="note">${esc(note)}</span>` : ''}</li>`;
  }
  /* 坊市 SHOP 的条目散在几张扩展表里（id 同源），按 cat 找回它的归属表。
     cat: pill→PILL_EXT / art→ARTIFACT_EXT / mat→MATERIAL_EXT。
     归错了会取到别的同 id 条目的图标，所以这里必须显式映射。 */
  function shopIconTable(cat) {
    return cat === 'art' ? 'ARTIFACT_EXT' : cat === 'mat' ? 'MATERIAL_EXT' : 'PILL_EXT';
  }
  /* v9.0 M0：行动预览。
     目的不是加装饰，是消灭「点完才发现少了一旬」。
     口径与 docs/03_玩法设计/行动预算_分档表.md 严格一致：
       xun: 0 表示顺手（不占旬），1 表示占一旬。
     成本只写「这一下真正要付的」，不重复计月度固定开销——
     固定开销另有账本，这里混进来玩家会以为被收两次。 */
  /* 带预览的动作行：正文一行，成本另作一行小字。390 宽下不会把标题挤成竖排。 */
  function optRowX(k, txt, tag, note, dis, act, cost) {
    const t = tag ? `<span class="tag ${tag.cls}">${esc(tag.name)}</span>` : '';
    const cl = costLine(cost);
    return `<li class="opt"${dis ? ' disabled' : ''} data-act="${esc(act)}">
      <span class="key">${esc(k)}</span>${t}<span class="txt">${esc(txt)}</span>
      ${cl ? `<br><span class="muted" style="font-size:12px">${esc(cl)}</span>` : ''}
      ${note ? `<span class="note">${esc(note)}</span>` : ''}</li>`;
  }
  /* 两行货架行：名与价同一行，说明另起一行。
     庙市的说明比坊市长（香火/石/已置数），用 optRow 会在 390 宽把名称挤成竖排。 */
  function shopRow(name, meta, desc, dis, act) {
    return `<li class="opt"${dis ? ' disabled' : ''} data-act="${esc(act)}">
      <span class="key">·</span><span class="txt">${esc(name)}<span class="muted">　${esc(meta)}</span>
      ${desc ? `<br><span class="muted" style="font-size:12px;line-height:1.45">${esc(desc)}</span>` : ''}</span></li>`;
  }
  function favorTier(f) { for (const t of D.FAVOR_TIERS) if (f >= t.min && f <= t.max) return t.name; return '陌生'; }

  function getGongfa() { return D.GONGFA.find(g => g.id === S.gongfa[0]) || D.GONGFA[0]; }
  /* v10.4 P0·3.1：吞海功「气海 +15%」此前只编译没接线。
     灵力上限是缓存字段（受箓/丹药/丹药天赋都会改它），
     所以不能每次重算，只能记住「上次应用的功法乘区」，
     乘区一变就按差额换算——这样受箓的 ×1.5 不会被功法重算抹掉。 */
  function gongfaMpCapMul() {
    const X = G.WXCS3_EXT;
    const v = (X && X.gongfaMpCap) ? X.gongfaMpCap() : 0;
    return 1 + clamp(numOr(v, 0), 0, 0.5);
  }
  /* ============================================================
     v10.5 P0·C1：气血 / 灵力上限的唯一重算出口
     ------------------------------------------------------------
     旧版上限在创角写死 100，破境只改寿元 —— 境界、修炼、功法、淬体
     的成长全部挤在 100 的尺度里。现在口径是：
       上限 = (境界基数 + 永久平加) × 淬体 × 受箓 × 永久 × 功法
     所有加成只写字段，禁止直接乘缓存值；需要变上限时一律调 recalcCaps。
     ============================================================ */
  function capLine() {
    if (isShen() && !hasXianLine()) return 'shen';
    return 'xian';
  }
  function capBase(kind) {
    const line = capLine();
    const arr = (D.CAP_BASE[line] || D.CAP_BASE.xian)[kind];
    const idx = line === 'shen' ? (S.pillar || 0) : (S.xRealm || 0);
    /* 神道用四位折算小阶：初/中/上/正位各 +1%，合计约 +3% */
    const sub = line === 'shen' ? ((S.pos || 0) / 4) : (S.xStage || 0);
    return Math.round(arr[clamp(idx, 0, arr.length - 1)] * (1 + D.CAP_STAGE_STEP * sub));
  }
  function gongfaHpCapAdd() {
    const X = G.WXCS3_EXT;
    return (X && X.gongfaHpCap) ? clamp(numOr(X.gongfaHpCap(), 0), 0, 0.5) : 0;
  }
  function hpMulAll() {
    return Math.max(0.1, quenchHpMul() * (S.hpLuMul || 1) * (S.hpPermMul || 1) * (1 + gongfaHpCapAdd()));
  }
  function mpMulAll() {
    return Math.max(0.1, gongfaMpCapMul() * (S.mpLuMul || 1) * (S.mpPermMul || 1));
  }
  /* keepRatio=true：按旧上限等比缩放当前气血/灵力，伤势不漂移；
     false：只把当前值截到新上限（创角用）。 */
  function recalcCaps(keepRatio) {
    const oldHp = Math.max(1, S.hpMax || 100);
    const oldMp = Math.max(1, S.mpMax || 100);
    S.hpMax = Math.max(1, Math.round((capBase('hp') + (S.hpFlatBonus || 0)) * hpMulAll()));
    S.mpMax = Math.max(10, Math.round((capBase('mp') + (S.mpFlatBonus || 0)) * mpMulAll()));
    /* 兼容字段：只供面板/扩展读取，不再参与换算 */
    S.mpGfMul = gongfaMpCapMul();
    S.hpGfMul = hpMulAll() / Math.max(1e-9, quenchHpMul() * (S.hpLuMul || 1) * (S.hpPermMul || 1));
    if (keepRatio) {
      S.hp = clamp(Math.round((S.hp || 0) * S.hpMax / oldHp), 0, S.hpMax);
      S.mp = clamp(Math.round((S.mp || 0) * S.mpMax / oldMp), 0, S.mpMax);
    } else {
      S.hp = Math.min(S.hp || 0, S.hpMax);
      S.mp = Math.min(S.mp || 0, S.mpMax);
    }
  }
  /* v10.4 的老入口保留为薄包装：功法乘区变了要立刻重算，不再靠「差额换算」，
     避免反复换功法/受箓后取整误差累积。 */
  function syncMpCap() { recalcCaps(true); return true; }
  /* 遁速：御风/凌波/天遁的「遁走 +X%」由扩展给，这里只做口径统一 */
  function gongfaEscapeAdd() {
    const X = G.WXCS3_EXT;
    return (X && X.gongfaEscape) ? numOr(X.gongfaEscape(), 0) : 0;
  }
  /* 寿元加成：龟息(+10)/补天(+80)/太阴吐纳(+60)。寿元上限同样是缓存字段，
     用同一套「记住已应用值」的办法，避免破境重设 lifeMax 时重复叠加。 */
  function syncLifeBonus() {
    const X = G.WXCS3_EXT;
    const want = (X && X.gongfaLifeBonus) ? numOr(X.gongfaLifeBonus(), 0) : 0;
    const old = S.lifeGfBonus || 0;
    if (want === old) return false;
    if (S.lifeMax > 0) S.lifeMax = Math.max(20, S.lifeMax - old + want);
    S.lifeGfBonus = want;
    return true;
  }
  /* 机缘：梅花易「机缘 +6」。读的是真数值而不是展示文本，
     接在奇遇/逃遁/交涉这些已经吃 st('fate') 的判定上。 */
  function gongfaFateAdd() {
    const X = G.WXCS3_EXT;
    return (X && X.gongfaFate) ? numOr(X.gongfaFate(), 0) : 0;
  }
  /* 位格压制抵消档数：乾天一元统摄诸天神法 */
  function gongfaGapUp() {
    const X = G.WXCS3_EXT;
    return (X && X.gongfaGapUp) ? numOr(X.gongfaGapUp(), 0) : 0;
  }
  /* 香火产出：香火成神法 */
  function gongfaXianghuoMul() {
    const X = G.WXCS3_EXT;
    const v = (X && X.gongfaXianghuo) ? numOr(X.gongfaXianghuo(), 0) : 0;
    return 1 + clamp(v, 0, 0.5);
  }
  /* 寿元死豁免：太阴蜕形尸解真法「死生不复为形所囿」 */
  function gongfaLifeStop() {
    const X = G.WXCS3_EXT;
    return !!(X && X.gongfaLifeStop && X.gongfaLifeStop());
  }
  /* v10.5 P0·A1/A2：功法的数据边界。
     dao = 修炼功法（可作道基、决定境界上限）；fa = 杀伐术法（进术法池、可装配）。
     旧版 GONGFA_EXT 把两者混在一张表里，do_setgf 于是能把《烈火掌》设成道基。 */
  function gongfaById(id) { return D.GONGFA.find(function (g) { return g.id === id; }); }
  function isFaGongfa(id) { const g = gongfaById(id); return !!(g && g.role === 'fa'); }
  function daoGongfaList() { return D.GONGFA.filter(function (g) { return g.role !== 'fa'; }); }
  function faGongfaList() { return D.GONGFA.filter(function (g) { return g.role === 'fa'; }); }

  /* 道基功法：fa 永不返回；旧档若指向 fa，回退到第一本 dao 功法 */
  function getDaogong() {
    const g = gongfaById(S.daogong);
    if (g && g.role !== 'fa') return g;
    const fb = gongfaById((S.gongfa || [])[0]);
    if (fb && fb.role !== 'fa') return fb;
    return gongfaById('juqi') || D.GONGFA[0];
  }
  /* 唯一的「获得功法」入口。之前坊市/传法/奇遇三处各写一次裸 push，
     旧档缺字段时必崩；收成一个函数，兜底只需要写一遍。 */
  function addGongfa(id) {
    const _g0 = gongfaById(id);
    if (!_g0) return false;
    /* v10.5 P0·A1：术法走术法池。所有获得入口（遗物/传法/奇遇）仍只调
       addGongfa，不各自分叉——否则总有一条路把术法塞回道基池。 */
    if (_g0.role === 'fa') {
      const okArt = learnArt('fa:' + id);
      if (okArt) queueGain('术法《' + _g0.name + '》', 0, '已入术法池，装配后才用得上', true);
      return okArt;
    }
    if (!Array.isArray(S.ownedGongfa)) S.ownedGongfa = ['juqi'];
    if (S.ownedGongfa.indexOf(id) >= 0) return false;
    S.ownedGongfa.push(id);
    const g = _g0;
    queueGain('功法《' + (g ? g.name : id) + '》', 0,
      (g && g.tier ? (D.GONGFA_TIERS[g.tier] || {}).name + ' · ' : '') + '要参悟才换主修', true);
    return true;
  }
  function followLimit() {
    // 在两柱之间按对数平滑增长，不再从镇上限突然跳到城上限。
    const t = clamp((S.pillar + S.pos / 3) / 2, 0, D.FOLLOW_LIMIT.length - 1);
    const lo = Math.floor(t), hi = Math.min(D.FOLLOW_LIMIT.length - 1, lo + 1);
    if (lo === hi) return D.FOLLOW_LIMIT[lo].max;
    const a = D.FOLLOW_LIMIT[lo].max, b = D.FOLLOW_LIMIT[hi].max;
    return Math.round(a * Math.pow(b / a, t - lo));
  }

  /* ============ 战力 ============ */
  /* v10.5 P2·S2：气血比例的唯一出口。
     上限异常为 0（旧档/半初始化状态）时返回 0，而不是 NaN——
     NaN 会一路传进战力、破境率与面板宽度，最后表现为整块界面空白。 */
  function hpRatio() {
    return S.hpMax > 0 ? clamp((S.hp || 0) / S.hpMax, 0, 1) : 0;
  }
  function computePower() {
    if (isShen()) {
      const p = pillar();
      const posMul = [1.0, 1.15, 1.3, 1.45][S.pos];
      let stMul = 1.0;
      if (hpRatio() < 0.33) stMul = 0.4;
      else if (hpRatio() < 0.66) stMul = 0.7;
      if (S.templeBroken) stMul *= 0.8;
      /* v10.4 P1·S4：战力按「类别多样性」聚合，不再只数数量。
         旧版每道 +5% 封顶 2.0 —— 五道同类与四类各一道收益完全相同，
         玩家没有理由凑多样性。新口径：
           基础 0.8 + 0.05×道数（保留「带得多略强」），
           再乘「类别数」系数：四类 1.20 / 三类 1.12 / 两类 1.05 / 一类 1.00。
         结果：四道四类 ≈ 0.8+0.2=1.0 → ×1.2 = 1.20；
              五道同类 ≈ 0.8+0.25=1.05 → ×1.0 = 1.05。
         多样性第一次比堆数量更划算。 */
      let sd = 0.8 + stEquipList().length * 0.05;
      sd = clamp(sd, 0.8, 2.0);
      sd *= stanceKindMul();
      /* 牧土神印：权柄斗法 +12%/级 */
      const base = p.power * posMul * stMul * sd * dArtSealPower();
      // 锚定影响
      const as = anchorStatus();
      let am = 1;
      if (as.name === '虚') am = 0.85;
      if (as.name === '将散') am = 0.6;
      if (as.name === '失锚') am = 0.3;
      return Math.round(base * am * (bodyDef().pow || 1));
    }
    // 仙道
    const r = xrealm();
    let base = r.power;
    if (r.idx === 0 && S.xStage < 5) base = 5;
    if (r.idx === 1) base = 25 + S.xStage * 2;
    if (r.idx === 2) {
      base = { '黄基': 80, '玄基': 90, '地基': 105, '天基': 125 }[S.xianji] || 80;
    }
    if (r.idx === 3) base = 350 * Math.pow(1.15, stEquipList().length);
    if (r.idx === 4) base = S.guowei ? D.GUOWEI_RANK[S.guowei.rank].power : 450;
    if (r.idx >= 5) base = 6000;
    let stMul = 1.0;
    /* v10.5 P1·C5：低血惩罚从 0.4 提到 0.55。
       旧口径下「低血 → 战力 ×0.4 → ratio 变小 → 敌方 ×1/ratio 放大」
       形成正反馈，高境界一场斗法会直接死亡螺旋；0.55 保留「重伤乏力」
       的语义，但不至必死。 */
    if (hpRatio() < 0.33) stMul = 0.55;
    else if (hpRatio() < 0.66) stMul = 0.7;
    else if (S.mp <= 0) stMul = 0.6;
    let sd = 0.8 + stEquipList().length * 0.05;
    sd = clamp(sd, 0.8, 2.0);
    /* v10.4 P1·S4：仙道同样按类别多样性聚合（口径同神道） */
    sd *= stanceKindMul();
    const as = anchorStatus();
    let am = 1;
    if (as.name === '虚') am = 0.85;
    if (as.name === '将散') am = 0.6;
    if (as.name === '失锚') am = 0.3;
    /* v10.1 第二梯队·问题1：灵根的战斗出口。
       旧版战斗里完全没有灵根：天灵根与伪灵根打架一样重。
       现在资质给一个乘区（天>地/变异>真>伪），经扩展缝口读取。 */
    const _XR = (G.WXCS3_EXT && G.WXCS3_EXT.rootPowerMul) ? G.WXCS3_EXT.rootPowerMul() : 1;
    return Math.round(base * stMul * sd * am * (bodyDef().pow || 1) * _XR);
  }

  /* 位格：仙道用境界档，神道用柱位 */
  /* ============================================================
     位阶换算（v6.7 修复「机缘一遇就死档」的根因）
     ------------------------------------------------------------
     旧写法 `xRealm * 4 + xStage` 假设每境四阶，但实际阶数是
       胎息 6 / 练气 9 / 筑基 4 / 紫府 3 / 金丹 1 / 道胎 1。
     于是 练气九层（xRealm 1, stage 8）算出 rank 12 —— 与紫府一关同号；
     startCombat 里 `floor(foeR/4)` 再一查表，敌人直接被抬成紫府
     （战力 350 vs 玩家 25），R≈0.07，两回合必死。
     机缘是随机触发的，所以这不是"难度"，是死档。
     ------------------------------------------------------------
     现在：rank 由各境真实阶数累加得出；反向有 realmIdxRank / stageIdxRank。
     跨体系（仙↔神）不靠 rank 比大小，改用 realmGap() 只比"大境差"，
     具体强弱一律交给战力比 R。 */
  function positionRank() {
    if (isShen()) return S.pillar * 4 + S.pos;
    const b = rankBaseXian();
    const i = clamp(S.xRealm, 0, (D.XIAN_REALMS || []).length - 1);
    return b[i] + clamp(S.xStage, 0, 99);
  }
  /* rank → 境界索引（神道即柱序） */
  function realmIdxRank(rank) {
    rank = Math.max(0, Math.round(Number(rank) || 0));
    if (isShen()) return clamp(Math.floor(rank / 4), 0, 7);
    const b = rankBaseXian();
    let idx = 0;
    for (let i = 0; i < (D.XIAN_REALMS || []).length; i++) if (rank >= b[i]) idx = i;
    return idx;
  }
  /* rank → 该境内的第几阶 */
  function stageIdxRank(rank) {
    rank = Math.max(0, Math.round(Number(rank) || 0));
    if (isShen()) return clamp(rank % 4, 0, 3);
    const i = realmIdxRank(rank);
    const b = rankBaseXian();
    const n = ((D.XIAN_REALMS[i] || {}).stages || []).length || 1;
    return clamp(rank - b[i], 0, n - 1);
  }
  /* 我当前的境界索引（仙=境界序号，神=柱序） */
  function myRealmIdx() { return isShen() ? S.pillar : S.xRealm; }
  /* 大境差：>0 敌人更高。这是唯一用于文案与减伤的尺度 */
  function realmGap(foeRank) { return realmIdxRank(foeRank) - myRealmIdx(); }

  /* ============ 渲染（三栏：左事件 / 中选择 / 右状态） ============ */
  function render() {
    const stage = document.getElementById('stage');
    const clockEl = document.getElementById('clock');
    _scenePlaceMemo = null;   // 插画横幅与场景文本同景：每次重绘重掷地点

    /* 兜底：气血归零却还停在 'play' —— 目前只有 foeTurn 会把血打到 0 并立刻处理，
       但这类「状态机漏一条出口」正是本作反复栽的坑（foeTurn 不 render、
       dispatch 不认 enc:、pendingEnc 残留）。宁可在这里多拦一次。 */
    if (S && S.phase === 'play' && S.started && S.hp <= 0) {
      die('气血耗尽。你没撑到下一个春天。');
    }
    // 道途目标：任何会触发重绘的变化都在这里结算（破境、升柱、信众达标…）
    if (S && S.phase === 'play' && S.started) checkGoals();
    const c = clockEl;
    if (c) c.textContent = S.started ? timeLine() : '天玄历 387 年 · 春';
    if (!stage) return;

    if (S.phase === 'create') {
      stage.className = 'stage-create';
      stage.innerHTML = renderSceneArt('create', 'create') + renderCreate();
      enhanceA11y(stage);
      return;
    }
    stage.className = 'stage';
    if (S.phase === 'over') { stage.innerHTML = renderOverArt() + renderOver(); enhanceA11y(stage); scheduleAutoSave(); return; }
    if (S.phase === 'dying') { stage.innerHTML = renderSceneArt('dying', 'backdrop') + renderDying(); enhanceA11y(stage); scheduleAutoSave(); return; }
    if (S.phase === 'combat') {
      if (!S.combat) { S.phase = 'play'; }        // 脏状态直接降级，走下面的正常渲染
      else {
        stage.className = 'stage stage-fight';     // 左右双栏
        stage.innerHTML = renderSceneArt('combat', 'combat') + renderCombat();
        enhanceA11y(stage);
        scheduleAutoSave();
        return;
      }
    }

    /* v10.7 P1：桌面改为「左导航 / 中行事 / 右状态」。
       旧版底部那条通栏功能坞另起一行，必须滚过三栏才够得着，
       而左右两栏又各自不等高——于是「下面找不到、左右空着」。
       现在功能坞拆进左栏常驻，纪事与月账移到中栏主行动之后。 */
    const navG = navGroups();
    stage.innerHTML =
      '<div class="col col-nav' +
      (navG.some(function (g) { return g.id === 'urgent' && g.items.length; }) ? '' : ' col-nav--quiet') + '">' +
      renderNavCol(navG) + '</div>' +
      '<div class="col col-main">' + renderMainCol() + renderChronCol() + '</div>' +
      '<div class="col col-state">' + renderStateCol() + '</div>' +
      renderMobileNav(navG);
    enhanceA11y(stage);
    scheduleAutoSave();
  }

  /* 防抖自动存档：避免每帧写 localStorage */
  function scheduleAutoSave() {
    if (typeof autoSave !== 'function') return;
    clearTimeout(scheduleAutoSave._h);
    scheduleAutoSave._h = setTimeout(function () { autoSave(); }, 600);
  }

  /* ---------- 左栏：常驻导航 ---------- */
  /* v10.7 P1：左栏不再放纪事，改放常驻全功能导航。
     天时三行留在最上——它是「你在哪儿」的上下文，不是入口，放在导航之上最顺。 */
  function renderNavCol(groups) {
    let b = '';
    const pathName = (D.PATHS.filter(function (p) { return p.id === S.path; })[0] || {}).name || '—';
    b += panel('天时',
      '<div class="sl"><span class="k">所在</span><span class="v">' + esc(curPlace()) + '</span></div>' +
      '<div class="sl"><span class="k">时节</span><span class="v">' + season() + ' · ' + MN[S.month] + '月</span></div>' +
      '<div class="sl"><span class="k">道途</span><span class="v">' + esc(pathName) + '</span></div>',
      { sub: '左' });

    b += '<div class="navbox">';
    groups.forEach(function (g) {
      if (!g.items.length) return;          // 空组不占位（要务消失了就整个消失）
      b += '<div class="navgrp' + (g.id === 'urgent' ? ' navgrp--urgent' : '') + '">';
      b += '<div class="ngrpt"><span class="ngtn">' + esc(g.name) + '</span>' +
        '<span class="ngrpn">' + g.items.length + ' 项</span></div>';
      b += '<div class="navlist">';
      g.items.forEach(function (it) {
        b += '<div class="navitem' + (g.id === 'urgent' ? ' navitem--urgent' : '') +
          '" data-act="' + esc(it.act) + '">' +
          '<span class="nk">' + esc(it.k) + '</span>' +
          '<span class="nt">' + esc(it.t) + '</span>' +
          '<span class="ns">' + esc(it.s) + '</span></div>';
      });
      b += '</div></div>';
    });
    b += '</div>';
    return b;
  }

  /* ---------- 中栏：近期纪事 + 本月收支 ---------- */
  /* v10.7 P1：纪事从左栏搬到中栏主行动之后。
     默认给 5~8 条（够看清「刚才发生了什么」），要看全部走年谱。 */
  function renderChronCol() {
    const items = (S.log || []).slice(0, 7);
    let b = '<div class="chhead"><span class="chn">近期纪事</span>' +
      '<span class="chs" data-act="act:openChronicle">全部 ›</span></div>';
    if (items.length) {
      b += '<div class="logbox logbox--mid">' + items.map(function (l) {
        return '<div class="ev ' + (l.cls || '') + '"><span class="t">' + esc(l.t) +
          '</span><span class="x">' + l.txt + '</span></div>';
      }).join('') + '</div>';
    } else {
      b += '<div class="muted">尚无纪事。</div>';
    }
    const led = renderLedger();
    if (led) b += divider() + led;
    return panel('纪事 · 月账', b, { sub: '中' });
  }

  /* 移动端底部五项导航（桌面端整块隐藏）。
     手机上不能把桌面左栏硬压成一条窄缝——那是把「入口找不到」原样搬过来。
     五项：修行 / 外物 / 出行 / 人事 / 更多；
     要办的事（来访、急事、拍卖、人情、锚定）不塞进这五项，
     而是留在页首单独一条——它们本来就该一眼看见，不该藏在菜单里。 */
  function renderMobileNav(groups) {
    const gs = groups || navGroups();
    const urgent = gs.filter(function (g) { return g.id === 'urgent'; })[0];
    const n = urgent ? urgent.items.length : 0;
    return '<div class="navmob">' +
      '<button class="navmobtn" data-act="do;navgrp:xiu"><b>修行</b><span>功法 · 四艺</span></button>' +
      '<button class="navmobtn" data-act="do;navgrp:wai"><b>外物</b><span>袋 · 法宝</span></button>' +
      '<button class="navmobtn" data-act="do;navgrp:chu"><b>出行</b><span>历练 · 坊市</span></button>' +
      '<button class="navmobtn" data-act="do;navgrp:ren"><b>人事</b><span>情缘 · 门下</span></button>' +
      '<button class="navmobtn' + (n ? ' navmobtn--hot' : '') + '" data-act="do;navmore"><b>更多</b>' +
      (n ? '<span class="navdot">' + n + '</span>' : '<span>要务 · 经营</span>') + '</button>' +
      '</div>';
  }

  /* ---------- 右栏：状态 + 修为 + 六维 ---------- */
  /* v10.2：右栏原来 14 项平铺，玩家找不到「现在危不危险」。
     按 异常→生存→修为→资源→关系 分组，异常永远压在最上面，关系默认收起。 */
  let SG_OPEN = { warn: true, life: true, cult: true, res: true, rel: false };
  function sgBox(key, title, body, note, crit) {
    const on = !!SG_OPEN[key];
    const head = '<div class="sgt" data-act="do;sg:' + key + '" role="button" tabindex="0" aria-expanded="' + on + '">' +
      '<span class="sga">' + (on ? '▾' : '▸') + '</span>' + esc(title) +
      (note ? '<span class="sgn">' + note + '</span>' : '') + '</div>';
    return '<div class="sgroup' + (crit ? ' crit' : '') + '">' + head +
      (on ? '<div class="sgb">' + body + '</div>' : '') + '</div>';
  }
  function renderStateCol() {
    let b = '';

    const ab = [];
    if (hpRatio() < 0.33) ab.push('垂死');
    else if (hpRatio() < 0.66) ab.push('重伤');
    if (S.suiFlag) ab.push('祟气缠身');
    if (S.templeBroken) ab.push('庙宇破损');
    if (S.karma > 50) ab.push('业力缠身');
    if (ab.length) b += sgBox('warn', '异常', '<div class="small danger">' + ab.join(' · ') + '</div>', ab[0], true);

    b += '<div class="sl"><span class="k">道号</span><span class="v">' + esc(S.dao || S.name) + '</span></div>';
    b += '<div class="sl"><span class="k">年岁</span><span class="v">' + S.age + ' 岁</span></div>';
    b += '<div class="sl"><span class="k">境界</span><span class="v">' + esc(realmName()) + '</span></div>';
    b += '<div class="sl"><span class="k">战力</span><span class="v">' + computePower() + '</span></div>';
    b += '<div class="sl"><span class="k">主修</span><span class="v">' +
      esc((D.CULTIVATION.filter(function (c) { return c.id === S.cultivation; })[0] || {}).name || '—') + '</span></div>';

    /* —— 生存：寿元 / 气血 / 灵力 —— */
    let life = '';
    if (S.lifeMax) {
      const lr = S.age / S.lifeMax;
      const left = S.lifeStop ? 0 : Math.max(0, S.lifeMax - S.age);
      life += '<div class="row' + (left <= 10 && !S.lifeStop ? ' critical-life' : '') + '"><span class="lab">寿元</span>' +
        bar(left, S.lifeMax, lr > 0.75 ? 'var(--cinnabar)' : 'var(--life)', 'life', '寿元') + '</div>';
    } else {
      life += '<div class="row"><span class="lab">寿元</span><span class="good small">无上限（靠锚）</span></div>';
    }
    life += '<div class="row"><span class="lab">气血</span>' + bar(S.hp, S.hpMax, 'var(--hp)', 'hp', '气血') + '</div>';
    life += '<div class="row"><span class="lab">灵力</span>' + bar(S.mp, S.mpMax, 'var(--mp)', 'mp', '灵力') + '</div>';
    b += sgBox('life', '生存', life, Math.round(hpRatio() * 100) + '% 气血', hpRatio() < 0.33);

    /* —— 修为：境界细节、道统、箓印、灵根、六维 —— */
    let cult = '';
    if (isXian() || S.cultivation === 'both') {
      const nr = xrealm().need;
      cult += '<div class="row"><span class="lab">修为</span>' + bar(S.xiuwei, nr || 1, 'var(--cul)', 'xiuwei', '修为') + '</div>';
      cult += '<div class="row" style="margin-top:-2px"><span class="lab"></span><span class="muted">月增 ' + (S.lastGain || 0) +
        '　灵气 ' + esc(D.LINGQI[S.lingqi].name) + '×' + D.LINGQI[S.lingqi].v + '</span></div>';
    }
    const showDao = (isShen() && S.unlockStage >= 2) || (isXian() && S.unlockStage >= 3);
    if (showDao && S.daotong) {
      // 道统先归入大类（金行/木行/十二炁…），再给具体名目
      const dtClass = daotongClassOf(S.daotong);
      cult += '<div class="sl"><span class="k">道统</span><span class="v">' + esc(S.daotong) +
        (dtClass ? '<span class="small muted">（' + esc(dtClass) + '）</span>' : '') +
        (S.sanxuan ? ' · ' + esc(D.SANXUAN[S.sanxuan].name) : '') + '</span></div>';
      // 该道统下可得的神通（把 SHENTONG 表也接上，不再只作装饰）
      const pool = D.SHENTONG[S.daotong];
      if (pool && pool.length) {
        cult += '<div class="small muted" style="margin-top:-2px">可求神通：' +
          pool.slice(0, 4).map(esc).join('、') + (pool.length > 4 ? ' 等 ' + pool.length + ' 道' : '') + '</div>';
      }
    }
    if (S.xianji) cult += '<div class="sl"><span class="k">仙基</span><span class="v">' + esc(S.xianji) + '</span></div>';
    if (S.unlockStage >= 3) cult += '<div class="sl"><span class="k">神通</span><span class="v">' + S.shenTong.length + '/' + shenTongLimit() + '</span></div>';
    if (S.lu) cult += '<div class="sl"><span class="k">箓</span><span class="v">' + esc(S.lu.rank) + '箓·' + esc(S.lu.name) + '</span></div>';
    if (S.daoyin.length || (isXian() && S.xRealm >= 2)) {
      cult += '<div class="sl"><span class="k">道途印</span><span class="v">' +
        S.daoyin.map(function () { return '●'; }).join('') +
        '○'.repeat(Math.max(0, 4 - S.daoyin.length)) + '</span></div>';
    }
    if (S.guowei) cult += '<div class="sl"><span class="k">果位</span><span class="v">' + esc(S.guowei.n) + '（' + esc(S.guowei.rank) + '）</span></div>';

    const s = S.stats;
    cult += '<div class="attr-grid">' + Object.keys(D.STATS).map(function (k) {
      return '<div class="a"><span class="n">' + esc(D.STATS[k].name) + '</span><span class="v">' + s[k] + '</span></div>';
    }).join('') + '</div>';

    if (S.root) {
      /* v10.1 第二梯队·问题1：多系从「彩色装饰」变成可读的主/副结构。
         副系会真的参与五行克制（打不同对手时换最优），所以要标出来。 */
      const _els = S.rootEls || [];
      const _main = _els.length ? elemChip(_els[0]) : '';
      const _subs = _els.slice(1).map(elemChip).join('');
      cult += '<div class="row" style="margin-top:7px"><span class="lab">灵根</span>' +
        _main + (_subs ? '<span class="muted" style="margin:0 3px">副</span>' + _subs : '') + '</div>';
      const _rd = (G.WXCS3_EXT && G.WXCS3_EXT.rootInfo) ? G.WXCS3_EXT.rootInfo() : null;
      cult += '<div class="small muted" style="margin-top:-2px">' + esc(D.ROOTS[S.root].name) +
        (_rd ? ' · 战力 ×' + _rd.powerMul.toFixed(2) : '') +
        (_els.length > 1 ? ' · 副系按专精度 ' + (_rd ? _rd.concentration.toFixed(2) : '') + ' 折价' : '') +
        (S.body ? ' · ' + esc(D.BODIES.filter(function (x) { return x.id === S.body; })[0].name) : '') + '</div>';
    }

    /* v10.1 第三梯队·问题6：盘活 PIETY / QIHE 两张死表与 insightXp。
       原先只有「虔诚 1.3」一个数字，四档名一次都没显示过；
       香火气数（本命/客庙/相冲）也从未可见。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.stateExtras) {
      const _sx = G.WXCS3_EXT.stateExtras();
      if (_sx) cult += '<div style="margin-top:4px">' + _sx + '</div>';
    }
    const _topA = (typeof topAch === 'function') ? topAch() : null;
    if (_topA) cult += '<div class="sl"><span class="k">称号</span><span class="v" style="color:' +
      (D.ACH_TIERS.filter(function (t) { return t.id === _topA.tier; })[0] || { color: '#6E6759' }).color + '">' +
      esc(_topA.name) + '</span></div>';
    b += sgBox('cult', '修为', cult, realmName());

    /* —— 资源：灵石/声望/功德/业力、香火、锚定、人情 —— */
    let res = '';
    /* 裸数字没有量感：拿坊市最常见的一味丹做参照 */
    const _pillRef = S.stones >= 40 ? '（≈ ' + Math.floor(S.stones / 40) + ' 枚聚气丹）' : '';
    res += '<div class="small">灵石 <b style="color:var(--stone)">' + S.stones + '</b>' +
      (_pillRef ? '<span class="muted">' + _pillRef + '</span>' : '') + '　声望 ' + S.fame +
      '　功德 <b style="color:var(--merit)">' + S.merit + '</b>　业力 <b style="color:var(--karma)">' + S.karma + '</b></div>';
    if (isShen() || S.cultivation === 'both') {
      res += '<div class="sl"><span class="k">神庙</span><span class="v">' + esc(S.miaoHao || '野庙') + ' · ' + esc(S.miao) + '</span></div>';
      res += '<div class="sl"><span class="k">信众</span><span class="v">' + S.followers + '/' + followLimit() + ' · 虔诚 ' + S.piety.toFixed(1) + '</span></div>';
      res += '<div class="row"><span class="lab">香火</span>' + bar(S.xianghuo, pillar().need, 'var(--cul)', 'xianghuo', '香火') + '</div>';
      res += '<div class="row" style="margin-top:-2px"><span class="lab"></span><span class="muted">月增 ' +
        Math.round(monthXianghuo().capped) + '　香火钱 ' + (Math.round(shenStoneIncome() * 10) / 10) +
        ' 石/月　月兑 ' + xiangOutCap() + ' 石</span></div>';
    }
    if (needsAnchor()) {
      const str = anchorStrength(), as = anchorStatus();
      res += '<div class="sl"><span class="k">锚定</span><span class="v ' + (as.name === '稳' ? 'good' : 'danger') + '">' +
        str.toFixed(1) + '/4.0 · ' + esc(as.name) + '</span></div>';
      res += '<div class="small muted" style="margin-top:3px">' +
        D.ANCHOR_TYPES.map(function (a) {
          const v = S.anchors[a.id];
          const t = v >= 1 ? '<span class="good">固</span>' : v >= 0.5 ? '<span class="muted">松</span>' : '<span class="danger">断</span>';
          return esc(a.name.slice(0, 1)) + t;
        }).join(' ') + '</div>';
      if (S.collapse > 0) res += '<div class="small danger" style="margin-top:4px">崩解期第 ' + S.collapse + ' 月</div>';
    }
    // —— 恩义：欠/放的人情，以及只写征兆不写公式的因果 ——
    const _owe = hookUnsettled().length;
    const _given = (S.hooksGiven || []).filter(function (x) { return !x.done; }).length;
    if (_owe || _given) {
      res += '<div class="small" style="margin-top:4px">人情　欠 <b>' + _owe + '</b> ｜ 人欠 <b>' + _given + '</b></div>';
    }
    const _signs = hookSigns();
    if (_signs.length) {
      res += '<div class="small muted" style="margin-top:2px">' + _signs.join('　') + '</div>';
    }
    b += sgBox('res', '资源', res, S.stones + ' 石');

    /* —— 关系：默认收起，认识人多了也不挤占主线 —— */
    const met = Object.keys(S.npcs).filter(function (id) { return S.npcs[id].met; });
    let rel = '';
    if (met.length) {
      rel = met.map(function (id) {
        const n = D.NPC_POOL.filter(function (x) { return x.id === id; })[0];
        const f = S.npcs[id].fav;
        return '<div class="sl"><span class="k">' + esc(n.name) + '</span><span class="v" style="color:var(--peach)">' +
          f + ' · ' + favorTier(f) + '</span></div>';
      }).join('');
    } else {
      rel = '<div class="small muted">尚未结识他人。</div>';
    }
    b += sgBox('rel', '关系', rel, met.length ? met.length + ' 人' : '');

    return panel('状态 · 修为', b, { sub: '右' });
  }

  /* ---------- 中栏：场景 + 选项 + 功法卡 ---------- */
  /* O3：境界条。之前境界挤在标题右上角，11px、常规字重、92% 透明度，
     比正文还小还淡。提到中栏第一视觉层级。 */
  function realmProgress() {
    if (isShen()) return { name: realmName(), label: '香火', cur: S.xianghuo, max: pillar().need };
    const r = xrealm();
    return { name: realmName(), label: '修为', cur: S.xiuwei, max: r.need || 0 };
  }
  function renderRealmBar() {
    const p = realmProgress();
    const prog = p.max > 0 ? Math.min(1, p.cur / p.max) : 1;
    const cap = isShen() ? null : daogongCapInfo();
    syncTrackRef();
    const prevProg = _lastBars.realm;
    _lastBars.realm = prog;
    let rcls = '', rst = 'width:' + (prog * 100).toFixed(1) + '%';
    if (prevProg !== undefined && Math.abs(prevProg - prog) > 0.001) {
      rcls = ' class="shift"';
      rst += ';--from:' + (prevProg * 100).toFixed(1) + '%';
    }
    let b = '<div class="realmbar">';
    b += '<div class="rb-top"><span class="rname">' + esc(p.name) + '</span>';
    b += '<span class="rsub">' + p.label + ' ' + fmtNum(Math.round(p.cur)) +
      (p.max > 0 ? ' / ' + fmtNum(p.max) : '') + '</span></div>';
    b += '<div class="rbar"><i' + rcls + ' style="' + rst + '"></i></div>';
    if (cap && cap.blocked) {
      b += '<div class="rnote danger">功法所限 · 修至' + esc(cap.to) +
        ' 即止，需换更高阶道基功法（现为' + esc(cap.tierName) + '）</div>';
    } else if (cap && cap.atCap) {
      b += '<div class="rnote">已至此功法所能到的尽头（' + esc(cap.to) + '）</div>';
    }
    b += '</div>';
    return b;
  }

  /* 道基功法能给到的境界上限 */
  function daogongCapInfo() {
    const g = getDaogong();
    const c = D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang;
    const rr = xrealm();
    const lastStage = clamp((rr.stages || []).length - 1, 0, 99);
    // 已在本境最后一阶，且本境就是这篇功法能到的尽头 → 卡住
    const atLast = S.xRealm >= c.cap && S.xStage >= lastStage;
    const blocked = atLast && !!rr.need;
    return {
      cap: c.cap, to: c.to, why: c.why, tierName: D.GONGFA_TIERS[g.tier].name,
      blocked: blocked, atCap: S.xRealm >= c.cap
    };
  }

  /* 手机端首屏快照：气血 / 灵力 / 灵石 / 寿元（神道换信众）。
     桌面三栏齐全，手机竖屏的状态栏在页面最底部——不把这四个数抬上来，
     玩家每次都得滚两屏才知道自己还剩多少血、多少钱。 */
  function renderVitals() {
    const lowHp = hpRatio() < 0.33;
    const lowLife = S.lifeMax && !S.lifeStop && (S.lifeMax - S.age) <= 20;
    const hpV = Math.round(S.hp), mpV = Math.round(S.mp);
    let b = '<div class="vitals">';
    b += '<div class="vt"><span>气血</span><span class="vn' + flashCls('vis:hp', hpV) + (lowHp ? ' low' : '') + '">' +
      hpV + '<span class="muted">/' + Math.round(S.hpMax) + '</span></span></div>';
    b += '<div class="vt"><span>灵力</span><span class="vn' + flashCls('vis:mp', mpV) + '">' +
      mpV + '<span class="muted">/' + Math.round(S.mpMax) + '</span></span></div>';
    b += '<div class="vt"><span>灵石</span><span class="vn gold' + flashCls('vis:stones', S.stones) + '">' + fmtNum(S.stones) + '</span></div>';
    if (usesShenLine()) {
      b += '<div class="vt"><span>信众</span><span class="vn">' + fmtNum(S.followers) + '</span></div>';
    } else {
      b += '<div class="vt"><span>寿元</span><span class="vn' + (lowLife ? ' low' : '') + '">' +
        (S.lifeStop || !S.lifeMax ? '无上限' : (S.lifeMax - S.age) + ' 年') + '</span></div>';
    }
    b += '</div>';
    return b;
  }

  /* ============================================================
     道途目标（v7.4）
     ------------------------------------------------------------
     不写主线剧情，只回答一个玩家最常问的问题：现在该干什么。
     沿境界/柱数排，完成一张换下一张；奖励自动入账，不弹挡住操作的窗。
     ============================================================ */
  let goalBusy = false;
  function goalsForLine() {
    return (isShen() ? D.GOALS.shen : D.GOALS.xian) || [];
  }
  function goalDone(id) { return (S.goals || []).indexOf(id) >= 0; }
  function currentGoal() {
    const list = goalsForLine();
    for (let i = 0; i < list.length; i++) if (!goalDone(list[i].id)) return list[i];
    return null;
  }
  function goalMet(g) {
    if (g.kind === 'realm') return (S.xRealm || 0) >= g.n;
    if (g.kind === 'pillar') return (S.pillar || 0) >= g.n;
    if (g.kind === 'followers') return (S.followers || 0) >= g.n;
    return false;
  }
  function goalProgText(g) {
    if (goalMet(g)) return '已至';
    if (g.kind === 'realm') {
      const cur = D.XIAN_REALMS[clamp(S.xRealm || 0, 0, D.XIAN_REALMS.length - 1)] || D.XIAN_REALMS[0];
      return '现 ' + cur.name + ' ' + ((S.xStage || 0) + 1) + '/' + ((cur.stages || []).length || 1);
    }
    if (g.kind === 'pillar') {
      return goalMet(g) ? '已至' : '香火 ' + fmtNum(Math.round(S.xianghuo)) + ' / ' + fmtNum(pillar().need);
    }
    if (g.kind === 'followers') return (S.followers || 0) + ' / ' + g.n;
    return '';
  }
  function grantGoal(g) {
    const r = g.reward || {};
    if (r.stones) { S.stones += r.stones; ledgerAdd('in', '道途 · ' + g.name, r.stones); }
    if (r.xianghuo) S.xianghuo = Math.min(maxXianghuo(), S.xianghuo + r.xianghuo);
    if (r.pill) { S.bag = S.bag || {}; S.bag[r.pill] = (S.bag[r.pill] || 0) + 1; }
    logLine('道途 · 「' + g.name + '」已了：' + goalRewardText(g) + '。', 'good');
    goalToast(g);
  }
  function goalToast(g) {
    try {
      let box = document.getElementById('achstack');
      if (!box) { box = document.createElement('div'); box.id = 'achstack'; document.body.appendChild(box); }
      const el = document.createElement('div');
      el.className = 'achtoast';
      el.style.borderLeftColor = 'var(--gold)';
      el.innerHTML = '<div class="at">道途 · 目标已了</div>' +
        '<div class="an" style="color:var(--gold)">' + esc(g.name) + '</div>' +
        '<div class="ad">' + esc(goalRewardText(g)) + '</div>';
      box.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
    } catch (e) { }
  }
  function checkGoals() {
    if (!S || !S.started || S.phase === 'over' || goalBusy) return;
    goalBusy = true;
    try {
      if (!Array.isArray(S.goals)) S.goals = [];
      for (let i = 0; i < 12; i++) {
        const g = currentGoal();
        if (!g || !goalMet(g)) break;
        S.goals.push(g.id);
        grantGoal(g);
      }
    } finally { goalBusy = false; }
  }
  function renderGoalCard() {
    const g = currentGoal();
    if (!g) return '<div class="goalcard done"><span class="gk">道途</span>' +
      '<span class="gn">已至尽头</span><span class="gp">剩下的路自己走</span></div>';
    return '<div class="goalcard" data-act="act:openGoals">' +
      '<span class="gk">道途</span><span class="gn">' + esc(g.name) + '</span>' +
      '<span class="gp">' + esc(goalProgText(g)) + '</span><span class="ga">›</span></div>';
  }
  function openGoals() {
    const list = goalsForLine();
    const cur = currentGoal();
    let b = '';
    if (S.mainline) b += '<div class="small" style="color:var(--strong)">此身之志：' + esc(S.mainline) + '</div>' + divider();
    b += '<div class="small muted">沿境界走，一步一步来。完成即换下一张，奖励自动入账。</div>' + divider();
    b += '<ul class="opts">';
    list.forEach(function (g) {
      const done = goalDone(g.id), now = !!cur && cur.id === g.id;
      const tag = done ? '<span class="tag peace">已了</span>'
        : now ? '<span class="tag chance">当前</span>'
          : '<span class="tag risk">未至</span>';
      const meta = goalRewardText(g) + (now ? '　·　' + goalProgText(g) : '');
      // 两行：名与说明一行，奖励与进度一行。用 optRow 的右对齐 note 会在窄屏把字挤成竖排。
      b += '<li class="opt"' + (now ? '' : ' disabled') + '>' +
        '<span class="key">' + (done ? '✓' : now ? '●' : '·') + '</span>' + tag +
        '<span class="txt">' + esc(g.name) + '<span class="muted">　' + esc(g.hint) + '</span>' +
        '<br><span class="muted" style="font-size:11.5px">' + esc(meta) + '</span></span></li>';
    });
    b += '</ul>';
    b += '<div class="hint">目标只是路标，不是枷锁。不做也不扣什么。</div>';
    openModal('道途 · 目标', b);
  }

  function breakReady() {
    const xianReady = hasXianLine() && (S.xRealm >= 4 || (!!xrealm().need && S.xiuwei >= xrealm().need));
    const shenReady = hasShenLine() && (S.pillar >= D.PILLARS.length - 1 || S.xianghuo >= pillar().need);
    return isBoth() ? (xianReady || shenReady) : (isShen() ? shenReady : xianReady);
  }

  /* 本月旬数条：已过的旬划掉，当前旬高亮，右侧写余几旬。
     预算必须一直看得见，否则玩家不会为它做取舍。 */
  function renderXunBar() {
    const used = S.xun || 0;
    let b = '<div class="xunbar">';
    for (let i = 0; i < XUN_PER_MONTH; i++) {
      const cls = i < used ? ' used' : (i === used ? ' now' : '');
      b += '<span class="xun' + cls + '">' + XUN_NAME[i] + '</span>';
    }
    const left = Math.max(0, XUN_PER_MONTH - used);
    b += '<span class="xunleft">本月余 ' + left + ' 旬</span></div>';
    return b;
  }

  function renderMainCol() {
    let b = '';
    /* 横幅先取图键（只读标记不消费），随后 .scene 文本才消费 justBroke 等一次性标记——
       次序颠倒会出现「图是破境、文是山野」的错位。 */
    b += renderSceneArt(sceneArtKey(), 'banner');
    b += renderRealmBar();
    b += renderVitals();
    b += renderGoalCard();
    b += '<div class="scene">' + esc(scene()) + '</div>';
    b += renderXunBar();

    const o = [];
    /* 打坐会自动坐满本月剩下的旬，所以这里报的是「坐完能得多少」。
       做一件事之后再来看，这个数就会变小——那就是刚才那件事的价格。 */
    const xunLeftNow = Math.max(1, XUN_PER_MONTH - (S.xun || 0));
    const perXun = (isXian() || S.cultivation === 'both')
      ? monthXiuwei() / XUN_PER_MONTH
      : monthXianghuo().capped / XUN_PER_MONTH;
    const gain = Math.round(perXun * xunLeftNow);
    const unit = isShen() ? '香火' : '修为';

    /* 修为已满时打坐是白扔一旬——这一旬本可以拿去做事。
       把它写在按钮上，免得玩家在满修时还习惯性点 A。 */
    const xFullNow = (isXian() || S.cultivation === 'both')
      && !!xrealm().need && S.xiuwei >= xrealm().need;
    const sFullNow = isShen() && S.xianghuo >= maxXianghuo();
    const fullNow = xFullNow || sFullNow;
    o.push(optRow('A', (isShen() ? '坐庙温养' : '打坐采气'),
      { name: '平和', cls: 'peace' },
      fullNow ? '已满 · 白坐' : ('+' + gain + ' ' + unit + '（余 ' + xunLeftNow + ' 旬）'),
      false, 'act:cultivate'));

    const full = breakReady();
    // 神道未受箓：破柱之后本该受箓，漏领则永远进不了洞天
    const noLu = hasShenLine() && !S.lu && S.pillar >= 1;
    if (noLu && full) {
      o.push(optRow('B', '受箓（入洞天之凭）', { name: '机缘', cls: 'chance' }, '未受箓则进不得洞天', false, 'act:openLuPick'));
    } else if (full) {
      o.push(optRow('B', isShen() ? (S.pos >= 3 ? '破柱（立新庙）' : '升位')
        : (S.xRealm >= 4 ? (S.guowei ? '化道胎' : '设法仪证果位') : '破境'),
        { name: '风险', cls: 'risk' }, '需抉择', false, 'act:openBreak'));
    } else {
      o.push(optRow('B', '闭关快进', { name: '平和', cls: 'peace' }, '岁月流逝', false, 'act:openMeditate'));
    }

    if (hasShenLine()) {
      o.push(optRow('C', '显圣（用权柄）', { name: '机缘', cls: 'chance' }, '耗香火', !isShen() && !isBoth(), 'act:openXiansheng'));
      o.push(optRow('D', '传教聚信', { name: '平和', cls: 'peace' }, '耗灵石', false, 'act:preach'));
    } else {
      o.push(optRow('C', '外出历练', { name: '机缘', cls: 'chance' }, '冒险', false, 'act:explore'));
      o.push(optRow('D', '参悟功法', { name: '平和', cls: 'peace' }, '换主修', false, 'act:openGongfa'));
    }
    // 疗伤排最后：字母顺序与显示顺序一致（A B C D E），键盘直选不会跳
    o.push(optRow('E', isShen() ? '守庙静养' : '打坐疗伤', { name: '平和', cls: 'peace' },
      injuryLevel().name + ' · 回 ' + fmtNum(monthlyHeal()), false, 'act:openRest'));

    b += '<ul class="opts">' + o.join('') + '</ul>';
    b += '<div class="freebar"><input id="in-free" placeholder="自由输入行动，回车执行">' +
      '<button class="btn ghost" data-act="do;free">执行</button></div>';
    b += '<div class="hint">' + (isShen()
      ? '权柄＝你被人求的那件事。河神管不了旱灾。'
      : '仙道是与天争命——快，但天要收你。') + '</div>';

    /* 能力三分后，中栏要一眼看出「道基 / 术法 / 神通」三条线 */
    const g = getDaogong();
    const cap = D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang;
    b += divider();
    b += '<div class="slotline"><span class="sk">道基</span>' +
      '<span class="sv">' + esc(g.name) + '</span>' +
      '<span class="tier" style="background:' + D.GONGFA_TIERS[g.tier].color + '">' +
      esc(D.GONGFA_TIERS[g.tier].name) + ' ×' + D.GONGFA_TIERS[g.tier].mul + '</span></div>';
    b += '<div class="slotnote">' + esc(g.eff) + '　｜　上限 ' + esc(cap.to) + '</div>';
    const eqs = equippedSkills();
    b += '<div class="slotline"><span class="sk">术法</span>' +
      '<span class="sv">' + (eqs.length ? eqs.map(function (k) { return esc(k.name); }).join(' · ') : '无') + '</span>' +
      '<span class="tier" style="background:#8B98A6">' + eqs.length + '/' + equipLimit() + '</span></div>';
    const _stN = (S.shenTong || []);
    b += '<div class="slotline"><span class="sk">神通</span>' +
      '<span class="sv">' + (_stN.length ? _stN.map(function (nm) { return esc(stShort(nm)); }).join(' · ') : '无') + '</span>' +
      '<span class="tier" style="background:#8B6FA8">' + _stN.length + ' 道</span></div>';

    if (S.ownedGongfa && S.ownedGongfa.length > 1) {
      b += '<div class="small muted" style="margin-top:5px">已习：' + S.ownedGongfa.map(function (id) {
        const x = D.GONGFA.filter(function (z) { return z.id === id; })[0];
        return x ? '<span style="color:' + D.GONGFA_TIERS[x.tier].color + '">' + esc(x.name) + '</span>' : '';
      }).join(' · ') + '</div>';
    }

    // P2-20：按道途/境界切换标题，仙道不再显示「庙中」
    let title;
    if (isShen()) title = '庙中 · ' + timeLine();
    else if (S.xRealm >= 4) title = '丹房 · ' + timeLine();
    else if (S.xRealm >= 2) title = '洞府 · ' + timeLine();
    else title = '山门 · ' + timeLine();
    return panel(title, b, { cls: 'main-panel', sub: realmName() });
  }

  /* ---------- 底部常驻指令区（三栏下方，等宽对齐） ---------- */
  function npcCountText() {
    const n = Object.keys(S.npcs).filter(function (id) { return S.npcs[id].met; }).length;
    return n ? n + ' 人相识' : '尚无';
  }
  function bagCountText() {
    let n = 0;
    for (const k in S.bag) n += S.bag[k] || 0;
    return n ? n + ' 件' : '空';
  }
  /* ============ v8.0 新手引导 ============
     TUTORIAL_STEPS 之前只有文案，没有任何地方展示。这里做成一条可跳过的短引导：
     不弹模态（避免顶掉开局的传法/奇遇），只在常驻区挂一个「引」按钮，走完自动消失。 */
  function tutLeft() {
    const n = D.TUTORIAL_STEPS.length;
    const i = S.tutStep || 0;
    return Math.max(0, n - i);
  }
  function openTut() {
    const steps = D.TUTORIAL_STEPS;
    const i = Math.min(S.tutStep || 0, steps.length - 1);
    const cur = steps[i];
    let b = `<div class="small muted">第 ${i + 1} / ${steps.length} 条</div>`;
    b += `<div class="small" style="margin:6px 0"><b>${esc(cur.name)}</b></div>`;
    b += `<div class="small">${esc(cur.text)}</div>`;
    b += divider() + '<ul class="opts">';
    if (i < steps.length - 1) {
      b += optRow('A', '下一条', { name: '续', cls: 'peace' }, '', false, 'do;tut:next');
    } else {
      b += optRow('A', '知道了，开始吧', { name: '完', cls: 'peace' }, '', false, 'do;tut:done');
    }
    b += optRow('B', '不必再看', { name: '略', cls: 'warn' }, '', false, 'do;tut:done');
    b += '</ul>';
    openModal('新手引导', b);
  }
  function do_tut(a) {
    if (a === 'next') S.tutStep = (S.tutStep || 0) + 1;
    else S.tutStep = D.TUTORIAL_STEPS.length;
    closeModal(); render();
  }

  function dockItems() {
    const list = [];
    /* 有人上门时排在最前面——这件事不处理，会一直挂着 */
    if (S.npcCall) {
      const cn = D.NPC_POOL.find(function (x) { return x.id === S.npcCall.id; });
      list.push({
        k: '客', t: '有人来访',
        s: (cn ? cn.name : '故人') + (S.npcCall.kind === 'funeral' ? ' · 丧讯' : ''),
        act: 'act:openNpcCall'
      });
    }
    list.push({ k: '功', t: '功法', s: getGongfa().name, act: 'act:openGongfa' });
    /* 新手引导走完就自己消失，不长期占位 */
    if (S.started && tutLeft() > 0) {
      list.push({ k: '引', t: '新手引导', s: '还有 ' + tutLeft() + ' 条', act: 'act:openTut' });
    }
    if (isShen()) list.push({ k: '庙', t: '庙宇', s: S.miaoHao || S.miao, act: 'act:openTemple' });
    else list.push({ k: '府', t: '洞府', s: D.LINGQI[S.lingqi].name, act: 'act:openCave' });
    // 两套系统两个市：仙道坊市只认灵石，神道庙市另开一摊
    if (isShen()) {
      list.push({ k: '市', t: '庙市', s: '香火 ' + fmtNum(Math.round(S.xianghuo)), act: 'act:openMiaoMarket' });
    } else {
      list.push({ k: '市', t: '坊市', s: '灵石 ' + fmtNum(S.stones), act: 'act:openShop' });
      if (isBoth()) list.push({ k: '庙', t: '庙市', s: '香火 ' + fmtNum(Math.round(S.xianghuo)), act: 'act:openMiaoMarket' });
    }
    /* 拍卖会只在开场的年份出现在常驻区——平时不占位置，开了就一眼看得见 */
    if (auctionOpen() && !aucUsed()) {
      list.push({ k: '拍', t: '拍卖会', s: '三年一场 · 今日开场', act: 'act:openAuction' });
    }
    /* 神器与愿物是神道专属的两条经济线：一条养战力，一条把香火换成灵石。
       只在神道/双修时出现，仙道不显示，免得占常驻区。 */
    if (usesShenLine()) {
      const artN = (S.dArt ? (S.dArt.staff || 0) + (S.dArt.mirror || 0) + (S.dArt.seal || 0) : 0);
      list.push({
        k: '器', t: '神器',
        s: artN ? (artN + ' 级 ·' + (S.dArtIdle ? '停供' : '维护 ' + dArtUpkeep()))
          : '未请',
        act: 'act:openDivineArts'
      });
      list.push({
        k: '愿', t: '愿物',
        s: votStockTotal() ? ('存 ' + votStockTotal() + ' 件') : '未做',
        act: 'act:openVotive'
      });
    }
    /* 四艺紧跟坊市：坊市买料、四艺用料，逻辑上是连着的一步。
       旧版它排在第 12 位，手机上要往下滚两屏才看得到——玩家根本不知道有四艺。 */
    if (hasXianLine()) list.push({
      k: '艺', t: '四艺',
      s: (S.learnedArts || []).length ? ((S.learnedArts || []).map(artName).join('·')) : '未学',
      act: 'act:openCraft'
    });
    list.push({ k: '图', t: '舆图', s: curPlace(), act: 'act:openMap' });
    list.push({ k: '缘', t: '情缘', s: npcCountText(), act: 'act:openLove' });
    list.push({ k: '历', t: '历练', s: isShen() ? '显圣' : '外出', act: isShen() ? 'act:openXiansheng' : 'act:explore' });
    list.push({ k: '宝', t: '法宝', s: (S.arts || []).length ? (S.arts.length + ' 件') : '无', act: 'act:openArts' });
    if (canDaotai()) list.push({ k: '胎', t: '化道胎', s: '以己心代天心', act: 'act:openDaotai' });
    list.push({ k: '书', t: '道书', s: (S.books || []).length ? ((S.books || []).length + ' 部') : '无', act: 'act:openDaoshu' });
    if (hasXianLine()) list.push({
      k: '宗', t: '宗门',
      s: S.sect ? D.SECT.ranks[S.sect.rank].name : '未入',
      act: 'act:openSect'
    });
    if (hasXianLine() || S.clan) list.push({
      k: '族', t: '家族',
      s: S.clan ? (S.clan.name + '氏 · ' + clanLv().name) : '未立',
      act: 'act:openClan'
    });
    if (hookUnsettled().length || (S.hooksGiven || []).some(function (x) { return !x.done; })) {
      const _o = hookUnsettled().length;
      const _g = (S.hooksGiven || []).filter(function (x) { return !x.done; }).length;
      list.push({ k: '情', t: '人情', s: _o ? ('欠 ' + _o) : ('人欠 ' + _g), act: 'act:openHooks' });
    }
    /* v8.1 P0 M4：师徒。门下有人才常驻显示，没有时不占坞位——
       与「洞天」「锚定」同一套出现规则，不给空面板留位置。 */
    if (discipleList().length || (S.disciplesOut || []).length) {
      const _d = discipleList();
      const _dn = _d[0] ? discipleStageOf(_d[0]).name : ((S.disciplesOut || []).length + ' 人已离门下');
      list.push({
        k: '徒', t: '门下',
        s: _d.length + '/' + discipleLimit() + ' · ' + _dn,
        act: 'act:openDisciple'
      });
    }
    list.push({ k: '囊', t: '乾坤袋', s: bagCountText(), act: 'act:openBag' });
    if (S.unlockStage >= 4 && (isShen() || S.xRealm >= 3))
      list.push({ k: '洞', t: '洞天', s: S.inDongtian ? '洞天' : '阳世', act: 'act:openDongtian' });
    if (needsAnchor()) list.push({ k: '锚', t: '锚定', s: anchorStrength().toFixed(1) + '/4', act: 'act:openAnchor' });
    /* v8.1 P0 M5：五组归类。act / k / t / s 一律不动，只补一个 g 字段——
       所有入口的 act 值不变，check_actions.py 的断言范围因此不受影响。 */
    {
      const X = G.WXCS3_EXT;
      if (X && X.dockItems) {
        const ex = X.dockItems();
        for (let i = 0; i < ex.length; i++) list.push(ex[i]);
      }
    }
    /* v10.7 P1：分组字段改成左导航的分组名。
       「常用/修炼/经营/人事/更多」这套旧分组是给底部折叠坞用的，
       坞拆进左栏后这套名字已经没有意义——分组改由 NAV_GROUPS 唯一定义。 */
    for (const it of list) it.g = navGroupOf(it.k);
    return list;
  }

  /* v10.7 P1：左侧常驻导航。
     dockItems() 仍是入口真源（十来个扩展都往里追加），
     navItems()/NAV_GROUPS 只负责「分组 + 排序」，
     同一个动作名不在两处各维护一份。
     分组依 v10.7 方案 §4.2：
       要务 —— 有人来访、限时急事、拍卖会、待清人情、锚定危险（出现即急，消失不留位）
       修行 —— 功法、四艺、道书、构筑、道果、化道胎
       外物 —— 乾坤袋、法宝、本命、灵兽、神器、愿物
       经营 —— 洞府/庙宇、家族、宗门、道统
       人事 —— 情缘、门下
       出行 —— 历练/显圣、舆图、坊市/庙市、洞天、遗迹
       记录 —— 年谱、功过格、账本（存档与设置仍留顶栏系统菜单） */
  const NAV_GROUPS = [
    { id: 'urgent', name: '要务', ks: ['客', '急', '引', '拍', '情', '锚'] },
    { id: 'xiu', name: '修行', ks: ['功', '艺', '书', '胎', '构', '果'] },
    { id: 'wai', name: '外物', ks: ['囊', '宝', '命', '兽', '器', '愿'] },
    { id: 'jing', name: '经营', ks: ['府', '庙', '族', '宗', '统'] },
    { id: 'ren', name: '人事', ks: ['缘', '徒'] },
    { id: 'chu', name: '出行', ks: ['历', '图', '市', '洞', '迹'] },
    { id: 'rec', name: '记录', ks: [], static: true }
  ];
  function navGroupOf(k) {
    for (let i = 0; i < NAV_GROUPS.length; i++) {
      if (NAV_GROUPS[i].ks.indexOf(k) >= 0) return NAV_GROUPS[i].id;
    }
    return 'other';   // 兜底：没登记的入口一律进「其他」，绝不悄悄丢掉
  }
  /* 记录组是静态的：年谱/功过格/账本原本只在顶栏系统菜单里，
     挪进导航后不必先点「系统」才看得见。 */
  function navStaticItems() {
    const n = ledgerNet();
    return [
      { k: '谱', t: '年谱', s: ((S.log || []).length) + ' 条', act: 'act:openChronicle' },
      { k: '过', t: '功过格', s: achStat().now + ' / ' + D.ACHIEVEMENTS.length, act: 'act:openAch' },
      { k: '账', t: '账本', s: (n.net >= 0 ? '+' : '') + fmtNum(n.net), act: 'act:openLedger' }
    ];
  }
  /* 组内顺序按 NAV_GROUPS 里的 ks 定，不按 dockItems 的追加顺序——
     「功法」永远排在「四艺」前面，玩家不必每次重新找。 */
  function navGroups() {
    const items = dockItems();
    const used = {};
    const out = [];
    NAV_GROUPS.forEach(function (g) {
      const arr = items.filter(function (it) { return g.ks.indexOf(it.k) >= 0; });
      arr.sort(function (a, b) { return g.ks.indexOf(a.k) - g.ks.indexOf(b.k); });
      arr.forEach(function (it) { used[it.k] = 1; });
      if (g.static) {
        const st = navStaticItems();
        st.forEach(function (it) { used[it.k] = 1; });
        arr.push.apply(arr, st);
      }
      out.push({ id: g.id, name: g.name, items: arr });
    });
    /* 兜底组：任何没登记到分组表的入口都进这里（并在控制台留痕）。
       「入口零丢失」是本轮的硬验收，所以宁可多一个杂项组，也不能让入口凭空消失。 */
    const rest = items.filter(function (it) { return !used[it.k]; });
    if (rest.length) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[nav] 未登记分组的入口：' + rest.map(function (x) { return x.k + '/' + x.t; }).join('、'));
      }
      out.push({ id: 'other', name: '其他', items: rest });
    }
    return out;
  }
  /* ACT.do_navgrp / do_navgo 与其它 ACT 一起登记在下方（ACT 表在 1727 行才建，提前赋值会撞 TDZ） */


  /* ---------- 固定开销（v8.1 收尾项 2） ----------
     时间预算只解决「做事有成本」，「不做事零成本」还留着——于是最省的打法是不出门。
     这里补四笔月度固定开销：宗门月课、家族口粮、庙宇修缮、洞府维护。
     四笔都「能付就付、付不起只降效率不删档」，避免把老档逼死。 */
  /* v10.3 P1：月课按「本阶边际门槛」收，不再按累计门槛。
     旧式 need/40 用的是累计升阶门槛（500/2000/8000/30000），
     长老月课 750 贡献，而三旬宗门任务满打满算约 144 贡献 ——
     升阶即成惩罚，连欠三月还要降阶。
     现在每个位阶写死 due，与 pay 同量纲（1 贡献 ≈ 5 石）：
     真传 40、长老 120，两旬任务即可兜住。 */
  function sectDue() {
    if (!S.sect || !(S.sect.rank > 0)) return 0;
    const r = D.SECT.ranks[S.sect.rank] || {};
    if (typeof r.due === 'number') return Math.max(10, r.due);
    /* 兜底：旧数据没有 due 时仍按边际门槛推算 */
    const prev = D.SECT.ranks[S.sect.rank - 1] || {};
    const step = Math.max(0, (r.need || 0) - (prev.need || 0));
    return Math.max(10, Math.round(step / D.FIXED_COST.sectDueNeedDiv));
  }
  function clanFoodCost() {
    if (!S.clan) return 0;
    return Math.max(1, Math.round((S.clan.pop || 1) * D.FIXED_COST.clanFoodPerPop));
  }
  function templeUpkeep() {
    if (!usesShenLine()) return 0;
    const c = D.MIAO_COEFF[S.miao] || 1;
    return Math.max(10, Math.round(D.FIXED_COST.templeBase * c));
  }
  function caveUpkeep() {
    if (!hasXianLine()) return 0;
    const qi = (D.LINGQI[S.lingqi] || D.LINGQI[0]).v || 1;
    const fac = (S.cave && S.cave.facilities) || {};
    return Math.max(10, Math.round(D.FIXED_COST.caveBase * qi + D.FIXED_COST.cavePerFacility * Object.keys(fac).length));
  }
  function fixedCostList() {
    let items = [
      { id: 'sect', name: '宗门月课', contrib: sectDue() },
      { id: 'clan', name: '家族口粮', stones: clanFoodCost() },
      { id: 'temple', name: '庙宇修缮', stones: templeUpkeep() },
      { id: 'cave', name: '洞府维护', stones: caveUpkeep() }
    ];
    /* v9.0 M1：命格的固定代价（负薪问道 +15）在扩展里追加；
       v9.0 M2：本命温养/兽官俸禄走 fixedCosts2（第二缝，避免扩展互相覆盖） */
    const X = G.WXCS3_EXT;
    if (X && X.fixedCosts) items = items.concat(X.fixedCosts());
    if (X && X.fixedCosts2) items = items.concat(X.fixedCosts2());
    return items.filter(function (x) { return (x.stones || 0) > 0 || (x.contrib || 0) > 0 || (x.xianghuo || 0) > 0; });
  }
  /* 月度结算：能付就付，付不起只记账不删档；四笔全清则欠费清零。 */
  function applyFixedCosts() {
    const items = fixedCostList();
    if (!items.length) { S.arrears = 0; return; }
    let unpaid = 0;
    for (const it of items) {
      if (it.id === 'sect') {
        const due = it.contrib;
        if ((S.sect.contrib || 0) >= due) {
          S.sect.contrib -= due;
          logLine('宗门月课：贡献 −' + due + '。', '');
          continue;
        }
        /* v10.5 P0·E2：只按「贡献缺口」折灵石。
           旧版先把贡献扣光、又按全额收钱——contrib=90/due=120 时
           等于缺口 30，却付了 120 贡献的钱。 */
        const have = Math.max(0, S.sect.contrib || 0);
        const gap = Math.max(0, due - have);
        const cash = gap * D.FIXED_COST.sectCashPerContrib;
        if (S.stones >= cash) {
          S.sect.contrib = Math.max(0, have - due);
          S.stones -= cash;
          ledgerAdd('out', '宗门月课（灵石抵缴）', cash);
          logLine('贡献 ' + have + '，缺口 ' + gap + ' 折 ' + cash + ' 灵石。', '');
          continue;
        }
        S.sectArrears = (S.sectArrears || 0) + 1;
        unpaid++;
        if (S.sectArrears >= D.FIXED_COST.sectArrearsMax && S.sect.rank > 0) {
          S.sect.rank = Math.max(0, S.sect.rank - 1);
          S.sectArrears = 0;
          logLine('连欠三月月课，宗门把你的位次降了一阶。', 'danger');
        } else {
          logLine('月课没缴上，宗门记了一笔。', 'danger');
        }
        continue;
      }
      const cost = it.stones || 0;
      if (cost > 0) {
        if (S.stones >= cost) {
          S.stones -= cost;
          ledgerAdd('out', it.name, cost);
        } else {
          unpaid++;
          logLine(it.name + '没付上，气息跟着滞了一层。', 'danger');
        }
        continue;
      }
      /* v9.0 M2：香火开销（兽官俸禄）——庙里的账走庙里的钱 */
      const xh = it.xianghuo || 0;
      if (xh > 0) {
        if (S.xianghuo >= xh) {
          S.xianghuo -= xh;
          logLine(it.name + '：香火 −' + xh + '。', '');
        } else {
          unpaid++;
          logLine(it.name + '的俸禄发不出，兽官的香也淡了。', 'danger');
        }
      }
    }
    if (unpaid) S.arrears = Math.min(9, (S.arrears || 0) + 1);
    else {
      if (S.arrears) logLine('欠账都清了，气机重新顺过来。', 'good');
      S.arrears = 0;
    }
  }


  /* ---------- v9.0 M1 扩展缝 ----------
     新玩法的数值逻辑都在 wxcs3-ext-*.js 里，本文件只留这几个薄口：
     fateMul/fateAdd 取命格与劫伤修正；buildInfo 给构筑面板一份只读快照。 */
  function fateMul(kind) {
    const X = G.WXCS3_EXT;
    return X && X.fateMul ? X.fateMul(kind) : 1;
  }
  function fateAdd(kind) {
    const X = G.WXCS3_EXT;
    return X && X.fateAdd ? X.fateAdd(kind) : 0;
  }
  function buildInfo() {
    const g = getGongfa();
    const dg = getDaogong();
    return {
      realm: realmName(),
      gongfa: g ? { id: g.id, name: g.name, tier: g.tier } : null,
      daogong: dg ? { id: dg.id, name: dg.name, el: dg.el || null } : null,
      shenTong: (S.shenTong || []).slice(),
      artsN: (S.arts || []).length,
      quench: quenchLv(),
      disciples: discipleList().length,
      sect: S.sect ? D.SECT.ranks[S.sect.rank].name : null,
      fixedCosts: fixedCostList(),
      stones: S.stones || 0,
      karma: S.karma || 0,
      merit: S.merit || 0
    };
  }

  /* ---------- 天劫五类（v8.1 P0 批次 2） ----------
     旧版破境只有一个骰子；这里给骰子加一个「看得见的对手」：
     每一类劫验一件事，克法按仙/神分列，命中就涨成功率，没命中就只能硬扛。
     只在跨大境界时来，同境小阶不打断节奏。 */
  function isMajorXianBreak() {
    const r = xrealm();
    return !!r && S.xStage >= (r.stages || []).length - 1;
  }
  function rollTribulation() {
    /* v9.0 M1：境界固定池（D.TRIB_WEIGHT）+ 近期行为权重（扩展提供，设上限）。
       杀伐重的人更容易听见故人叫门，嗑丹多的人天河更近——但固定池兜底，
       保证每条路线都遇得上每一类劫、也都有克法。 */
    const W = {};
    for (const k in D.TRIB_WEIGHT) W[k] = D.TRIB_WEIGHT[k];
    const EW = (G.WXCS3_EXT && G.WXCS3_EXT.tribWeights) ? G.WXCS3_EXT.tribWeights() : null;
    if (EW) for (const k in EW) if (W[k] !== undefined) W[k] = Math.max(4, W[k] + (EW[k] || 0));
    let total = 0;
    for (const k in W) total += W[k];
    let r = rng() * total;
    for (const k in W) { r -= W[k]; if (r <= 0) return tribDetail(k); }
    return tribDetail('lei');
  }
  /* 克法读数：同一类劫，仙道与神道各有一条活路；没有就写明「无克法」。 */
  function tribCounter(id) {
    const shen = isShen();
    if (id === 'lei') {
      const h = st('heart');
      return { bonus: h >= 12 ? 0.12 : 0, text: '道心 ' + h + (h >= 12 ? '，雷声不乱' : '，其心先怯') };
    }
    if (id === 'shui') {
      if (!shen) {
        const g = getDaogong();
        const el = (g && g.el) || null;
        return { bonus: el === 'water' ? 0.12 : 0, text: el === 'water' ? '道基属水，河声相认' : '道基非水，水势逼人' };
      }
      const p = S.piety || 1;
      return { bonus: p >= 1.5 ? 0.10 : 0, text: '信众虔诚 ×' + p.toFixed(1) + (p >= 1.5 ? '，香火可制水' : '，香火不敌') };
    }
    if (id === 'huo') {
      /* v9.0 M1：无灯焰不能只认神道神器——仙道佩着法宝（外物）同样护得住灯火 */
      if (!shen) {
        const n = (S.arts || []).length;
        return { bonus: n > 0 ? 0.10 : 0, text: n ? '法宝 ' + n + ' 件，灯焰有蔽' : '无神器法宝，灯不及身' };
      }
      const artN = (S.dArt ? (S.dArt.staff || 0) + (S.dArt.mirror || 0) + (S.dArt.seal || 0) : 0);
      return { bonus: artN > 0 ? 0.12 : 0, text: artN ? '神器 ' + artN + ' 级，灯自明' : '无神器，灯遂灭' };
    }
    if (id === 'feng') {
      const q = quenchLv();
      const b = q >= 6 ? 0.16 : q >= 3 ? 0.10 : 0;
      return { bonus: b, text: '淬体 ' + q + ' 阶' + (b ? '，骨已换' : '，皮肉未坚') };
    }
    if (id === 'gu') {
      const n = hookUnsettled().length;
      return { bonus: n === 0 ? 0.12 : 0, text: n ? '尚有 ' + n + ' 笔恩义未偿' : '恩义皆清' };
    }
    return { bonus: 0, text: '无' };
  }
  /* 天劫未过的三重代价：气血落一成、修为再跌三成、三旬不得再破。 */
  function tribFailPenalty() {
    S.hp = Math.max(1, Math.round(S.hpMax * 0.10));
    S.xiuwei = Math.round((S.xiuwei || 0) * 0.7);
    /* 含本次这一旬：破境本身要走一旬，所以记 4，玩家实等 3 旬 */
    S.tribLock = 4;
    logLine('天劫未渡：气血仅余一成，修为再退三成，三旬内不得复破。', 'danger');
    /* v9.0 M1：劫类专属余波在扩展里（道心受挫/气海受损/外物遭劫/折骨之伤/故人成仇） */
    const id = S.trib && S.trib.id;
    const X = G.WXCS3_EXT;
    if (id && X && X.tribFailExtra) X.tribFailExtra(id);
    const fx = X && X.tribFailText ? X.tribFailText(id) : '';
    if (fx) logLine('· ' + fx, 'danger');
  }
  function openTribulation(rate) {
    const t = S.trib || rollTribulation();
    const c = tribCounter(t.id);
    let b = '<div class="small">' + esc(t.line) + '</div>';
    b += '<div class="statline"><span class="k">劫</span><span class="v">' + esc(t.name) + '（验' + esc(t.test) + '）</span></div>';
    b += '<div class="statline"><span class="k">克法</span><span class="v">' + esc(c.text) + '　' +
      (c.bonus ? '<span class="good">+' + Math.round(c.bonus * 100) + '%</span>' : '<span class="danger">无</span>') + '</span></div>';
    b += '<div class="statline"><span class="k">成功率</span><span class="v">' + Math.round(rate * 100) + '% → <b>' +
      Math.round(clamp(rate + c.bonus, 0.05, 0.95) * 100) + '%</b></span></div>';
    b += '<div class="hint">若不渡：气血去一成，修为退三成，三旬内不得复破。</div>';
    b += '<ul class="opts">' + optRow('A', '渡劫', { name: '风险', cls: 'risk' }, '该来者终须来', false, 'do;tribGo') + '</ul>';
    openModal('天劫 · ' + t.name, b, true);
  }

  /* ---------- 体质读数（v8.1 P0 M2） ----------
     八种体质各有一个可达落点：剑灵体加战力、九阳加火法、冰魄落主修水、
     玄阴/纯阳加双修、混沌不被反克、凡体淬体贵三倍。 */
  function bodyDef() {
    return D.BODIES.filter(function (b) { return b.id === S.body; })[0] || D.BODIES[D.BODIES.length - 1];
  }
  function quenchLv() { return clamp(S.quench || 0, 0, D.QUENCH.length); }
  function quenchDef() { const n = quenchLv(); return n > 0 ? D.QUENCH[n - 1] : null; }
  function quenchHpMul() { const d = quenchDef(); return d ? d.hpMul : 1; }
  function quenchBlock() { const d = quenchDef(); return d ? d.block : 0; }
  /* 下一阶的实付成本：凡体三倍（决策点 ①），其余原价 */
  function quenchNext() {
    const lv = quenchLv();
    if (lv >= D.QUENCH.length) return null;
    const d = D.QUENCH[lv], mul = bodyDef().quenchMul || 1;
    return { lv: lv + 1, def: d, stones: Math.round(d.stones * mul), herbN: Math.round(d.herb.n * mul), herbId: d.herb.id };
  }
  /* 招式加成：火系看九阳，冰系无对应招式，落在「主修水」上（冰属水） */
  function bodySpellMul(kind) {
    const bd = bodyDef();
    if (kind === 'fire' && bd.fire) return bd.fire;
    if (bd.ice && mainEl() === 'water') return bd.ice;
    if (bd.keFloor) return 1.05;
    return 1;
  }

  /* ---------- 御兽（v8.1 P0 批次 3） ----------
     三条实现口径：
     1) 兽栏上限跟灵脉档走（D.BEAST_BARN），洞府投资第一次有了「能多养一头」的正反馈；
     2) 亲密/妖力两轴分开：喂只涨亲密，调教只涨妖力还跌亲密——换着养才是常态；
     3) 战斗里它只做「第四位」：护主（挡一下）或反噬（咬你一口），
        概率全部从 D.BEAST_BOND 读，不在战斗代码里写魔法数。 */
  function barnCap() {
    const q = clamp(S.lingqi || 0, 0, D.BEAST_BARN.length - 1);
    return D.BEAST_BARN[q] || 1;
  }
  function barnList() { return Array.isArray(S.barn) ? S.barn : (S.barn = []); }
  function beastBondTier(bond) {
    const b = numOr(bond == null ? S.beastBond : bond, 0);
    let t = D.BEAST_BOND[0];
    D.BEAST_BOND.forEach(function (x) { if (b >= x.min) t = x; });
    return t;
  }
  function beastPowerMul() {
    /* 妖力是乘法累积，但封顶在 BEAST_CARE.powerCap，防反噬/输出失控 */
    return clampNum(S.beastPower, 0.5, D.BEAST_CARE.powerCap, 1);
  }
  function beastAtkBonus() {
    /* 上场的那一头：默认取兽栏第一头已「认」的 */
    const list = barnList().filter(function (b) { return numOr(b.bond, 0) >= 0; });
    if (!list.length) return 0;
    const b = list[0];
    const pack = D.BEAST_STOCK.find(function (x) { return x.id === b.id; }) || { atk: 1 };
    /* 妖力 × 族群系数，再乘一个「认不认你」的折扣：
       野的只出一半力，契的才满打。 */
    const tier = beastBondTier(numOr(b.bond, 0));
    const trust = clamp(0.5 + tier.guard * 0.6, 0.5, 1);
    return Math.max(0, (pack.atk * beastPowerMul() * trust) - 1);
  }
  function beastAdd(id) {
    const pack = D.BEAST_STOCK.find(function (x) { return x.id === id; });
    if (!pack) return { ok: false, why: '没有这种妖物' };
    const list = barnList();
    if (list.length >= barnCap()) return { ok: false, why: '兽栏满了（灵脉只养得起 ' + barnCap() + ' 头）' };
    list.push({ id: pack.id, name: pack.name, el: pack.el, bond: 10, power: 1 });
    S.yaoshou = true;
    return { ok: true, beast: pack };
  }
  function beastFeed() {
    const list = barnList();
    if (!list.length) return { ok: false, why: '兽栏是空的' };
    const c = D.BEAST_CARE;
    if (S.stones < c.feedStone) return { ok: false, why: '灵石不足 ' + c.feedStone };
    S.stones -= c.feedStone;
    ledgerAdd('out', '喂养妖物', c.feedStone);
    list.forEach(function (b) { b.bond = clampNum(numOr(b.bond, 0) + c.feedBond, -99, 100, 0); });
    S.beastBond = clampNum(numOr(S.beastBond, 0) + c.feedBond, -99, 100, 0);
    S.beastFedMonth = S.turn;   // v9.0 M2：饿了会走——喂养记账，ext-beast 月结查这本账
    return { ok: true };
  }
  function beastTrain() {
    const list = barnList();
    if (!list.length) return { ok: false, why: '兽栏是空的' };
    const c = D.BEAST_CARE;
    list.forEach(function (b) {
      b.bond = clampNum(numOr(b.bond, 0) + c.trainBond, -99, 100, 0);
    });
    S.beastPower = clampNum(numOr(S.beastPower, 1) * (1 + c.trainPower), 0.5, c.powerCap, 1);
    S.beastBond = clampNum(numOr(S.beastBond, 0) + c.trainBond, -99, 100, 0);
    return { ok: true };
  }

  /* ---------- 师徒（v8.1 P0 批次 4） ----------
     刻意不复用 FOLLOW_LIMIT（信众上限，量级差四个数量级）。
     四条出路都要能结算：授业（涨进度）→ 出师（独立门户）→ 叛师 / 先死。
     逆徒、杀师两条成就的计数器就挂在这里。 */
  function discipleLimit() { return D.DISCIPLE_LIMIT; }
  /* v9.0 M3：门规可以改收徒门槛（宽 15 / 中 20 / 严 25）。
     扩展未加载时退回 20，老玩法一字不变。 */
  function discipleAdmitFav() {
    const X = G.WXCS3_EXT;
    const v = (X && X.schoolAdmitFav) ? X.schoolAdmitFav() : 20;
    return (typeof v === 'number' && v > 0) ? v : 20;
  }
  function discipleList() { return Array.isArray(S.disciples) ? S.disciples : (S.disciples = []); }
  function discipleAdd(name, bond) {
    const list = discipleList();
    if (list.length >= discipleLimit()) return { ok: false, why: '门下已满（上限 ' + discipleLimit() + ' 人）' };
    const b = numOr(bond, 0);
    const d = {
      id: 'dp_' + Date.now().toString(36) + '_' + list.length,
      name: name || '无名弟子',
      days: 0, bond: b, alive: true, stage: 'ru'
    };
    list.push(d);
    /* 「逆徒」：收一个好感 ≤ −40 的人为徒。条件写在成就表里，这里只负责记账。 */
    if (b <= -40) bump('badDisciple');
    return { ok: true, disciple: d };
  }
  function discipleTeach(id) {
    const list = discipleList();
    const d = list.find(function (x) { return x.id === id; });
    if (!d || !d.alive) return { ok: false, why: '没有这个弟子' };
    d.days = numOr(d.days, 0) + 30;
    d.bond = clampNum(numOr(d.bond, 0) + 8, -99, 100, 0);
    d.stage = discipleStageOf(d).key;
    return { ok: true, stage: discipleStageOf(d) };
  }
  function discipleGraduate(id) {
    const list = discipleList();
    const i = list.findIndex(function (x) { return x.id === id; });
    if (i < 0) return { ok: false, why: '没有这个弟子' };
    const d = list[i];
    const st = discipleStageOf(d);
    if (st.key !== 'chu') return { ok: false, why: '还没到出师的火候（' + st.name + '）' };
    /* 出师：给一笔「束脩」，弟子离开门下但记在仙谱里（不删记录，改 alive 语义为已出师） */
    list.splice(i, 1);
    S.disciplesOut = (S.disciplesOut || []).concat([{ name: d.name, bond: d.bond, at: S.year + '年', kind: 'graduate' }]);
    S.stones += 300;
    ledgerAdd('in', '弟子出师束脩', 300);
    /* v9.0 M3：出师是道统声望的正经来源（买不到）。扩展未加载时无副作用。 */
    const _XS = G.WXCS3_EXT;
    if (_XS && _XS.schoolOnGraduate) _XS.schoolOnGraduate(d);
    return { ok: true, name: d.name };
  }
  function discipleBetray(id) {
    const list = discipleList();
    const i = list.findIndex(function (x) { return x.id === id; });
    if (i < 0) return { ok: false, why: '没有这个弟子' };
    const d = list.splice(i, 1)[0];
    bump('badDisciple');
    return { ok: true, name: d.name };
  }

  /* 拜师与弑师：师徒关系的另一半——你自己也可以是别人的徒弟。
     这两条存在的理由只有一个：让「杀师」这个判定有真实来源，
     而不是靠一个永远为 0 的计数器占着成就表。 */
  function masterTaken(npcId) {
    if (S.masterId) return { ok: false, why: '你已有师承' };
    const n = D.NPC_POOL.find(function (x) { return x.id === npcId; });
    if (!n) return { ok: false, why: '查无此人' };
    const r = (S.npcs || {})[npcId];
    if (!r || !r.met) return { ok: false, why: '尚未见过此人' };
    if (numOr(r.fav, 0) < 30) return { ok: false, why: '好感不足（需 30）' };
    S.masterId = npcId;
    return { ok: true, name: n.name };
  }
  /* 弑师：只有在你确有师承、且此人还活着时成立。
     不写「击杀记录」的判定链——这里只记账，战斗结算另有其处。 */
  function masterKilled(npcId) {
    if (!S.masterId || S.masterId !== npcId) return { ok: false, why: '此人并非你的授业者' };
    const r = (S.npcs || {})[npcId];
    if (r && r.alive === false) return { ok: false, why: '他已不在' };
    if (r) r.alive = false;
    S.masterId = null;
    bump('killMaster');
    return { ok: true };
  }
  /* 弑师需要一个能动手的场合，不能是一个凭空按钮：
     由战斗结算调用，判定「对面正是我的师父」。
     现在仇家/叛门/寻仇三条都会走 startCombat，这里作为统一钩子。 */
  function masterCheckOnKill(foeName) {
    if (!S.masterId) return false;
    const n = D.NPC_POOL.find(function (x) { return x.id === S.masterId; });
    if (!n || n.name !== foeName) return false;
    const r = masterKilled(S.masterId);
    return !!r.ok;
  }

  /* ---------- 属性分档（v8.1 P0 第 6 项） ----------
     属性不再只影响成功率，也决定「你看得见什么」。
     statTier 返回 low/mid/high，insightAt 按门槛挑线索——
     门槛不达标就一个字都不给，达标才多一行。 */
  function statTier(k) {
    const v = st(k);
    let t = D.STAT_TIER[0];
    D.STAT_TIER.forEach(function (x) { if (v >= x.min) t = x; });
    return t;
  }
  /* 某属性在门槛之上才返回线索，否则空串。渲染处直接拼，空串等于没这行。 */
  function clue(statKey) {
    const rows = D.INSIGHT_LINES.filter(function (x) { return x.stat === statKey; });
    if (!rows.length) return '';
    let best = '';
    rows.forEach(function (r) { if (st(statKey) >= r.min) best = r.text; });
    return best;
  }

  /* ---------- 功能门（v8.1 P0 §2.2） ----------
     UNLOCK_XIAN / UNLOCK_SHEN 两张表建了很久却零引用：16 条境界词永远不出现。
     这里只做软门——抬档时把该档的境界词写进纪事，帮助面板按档显示
     「能做什么 / 还有什么未显」。硬门一概不加：老档被锁在门外比没有门更糟。
     unlockTable / unlockRow 已移入 wxcs3-rules.js（纯查表）。 */
  function bumpUnlock(line, stage) {
    if (!(stage > (S.unlockStage || 0))) return false;
    S.unlockStage = stage;
    const row = unlockRow(line, stage);
    if (row && row.phrase) logLine('· ' + row.phrase, 'good');
    if (row && row.name) toast('境 · ' + row.name);
    return true;
  }

  /* ---------- 创角 ---------- */
  function needEls(k) { return ({ heaven: 1, earth: 2, true_: 3, pseudo: 4, mutate: 1 })[k] || 1; }
  function baseStats() { return { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 }; }
  function sumStats(o) { return Object.values(o).reduce((a, b) => a + b, 0); }
  function talLeft() {
    return 5 - (S.draft.talents || []).reduce((s, id) => {
      const t = D.TALENTS.find(x => x.id === id); return s + (t ? t.cost : 0);
    }, 0);
  }

  function renderCreate() {
    if (S.createStep === 0) {
      let b = `<div class="muted small" style="margin-bottom:10px">${esc(pick(D.SCRIPTS))}</div>`;
      /* v9.0 M4：道果在创角第一眼就要看得见，否则「世界记得你」只是一句空话。 */
      const _XB = G.WXCS3_EXT;
      if (_XB && _XB.fruitBanner) b += _XB.fruitBanner();
      b += `<div class="creation-step">第零步 · 主修（比灵根重要）</div>`;
      b += `<div class="muted small" style="margin:4px 0">这不是选职业，是选死法。</div>`;
      b += `<div class="selgrid" style="margin-top:6px">`;
      for (const cv of D.CULTIVATION) {
        b += `<span class="chip ${S.draft.cultivation === cv.id ? 'on' : ''}" data-act="cv:${cv.id}" style="justify-content:flex-start">
          <b>${esc(cv.name)}</b><span class="muted" style="font-weight:400">· ${esc(cv.desc)}<br>${esc(cv.cost)}</span></span>`;
      }
      b += `</div>`;

      b += divider();
      b += `<div class="creation-step">第一步 · 你是谁</div>`;
      b += `<div class="row"><span class="lab">姓名</span><input id="in-name" value="${esc(S.draft.name || '')}" placeholder="自定姓名" style="flex:1;min-width:120px"></div>`;
      b += `<div class="row"><span class="lab">性别</span><div style="display:flex;gap:6px;flex-wrap:wrap">`;
      for (const g of ['男', '女', '自定义（不辨雌雄）'])
        b += `<span class="chip ${(S.draft.gender || '男') === g ? 'on' : ''}" data-act="gender:${esc(g)}">${esc(g)}</span>`;
      b += `</div></div>`;
      b += `<div class="row"><span class="lab">年龄</span><input id="in-age" type="number" min="16" max="60" value="${S.draft.age || 16}" style="width:80px"><span class="muted small">16~60</span></div>`;
      b += `<div class="row"><span class="lab">相貌</span><input id="in-look" value="${esc(S.draft.look || '')}" placeholder="如：眉目清冷" style="flex:1;min-width:140px"></div>`;

      // 法相：仅神道
      if (S.draft.cultivation === 'shen' || S.draft.cultivation === 'both') {
        b += divider();
        b += `<div class="creation-step">第二步 · 法相（神道 · 十二选一）</div>`;
        b += `<div class="muted small" style="margin:4px 0">你身上显了哪一尊真君，就走哪一条权柄线——八座庙在你入神道那一刻就已注定。</div>`;
        b += `<div class="selgrid" style="margin-top:6px">`;
        for (const f of D.FAXIANG) {
          b += `<span class="chip ${S.draft.faxiang === f.id ? 'on' : ''}" data-act="fx:${f.id}" style="justify-content:flex-start">
            ${iconTag('FAXIANG', f.id, 'md')}<b>${esc(f.zodiac)}</b><span class="muted" style="font-weight:400">· ${esc(f.name)} · ${esc(f.opening)}</span></span>`;
        }
        b += `</div>`;
      }

      b += divider();
      b += `<div class="creation-step">出身（十选一）</div>`;
      b += `<div class="selgrid" style="margin-top:6px">`;
      for (const o of D.ORIGINS) {
        b += `<span class="chip ${S.draft.origin === o.id ? 'on' : ''}" data-act="origin:${o.id}" style="justify-content:flex-start">
          ${iconTag('ORIGINS', o.id, 'md')}<b>${esc(o.name)}</b><span class="muted" style="font-weight:400">· ${esc(o.desc)}</span></span>`;
      }
      b += `</div>`;

      b += divider();
      b += `<div class="creation-step">道途（六选一）</div>`;
      b += `<div class="selgrid" style="margin-top:6px">`;
      for (const p of D.PATHS) {
        b += `<span class="chip ${S.draft.path === p.id ? 'on' : ''}" data-act="path:${p.id}" style="justify-content:flex-start">
          ${iconTag('PATHS', p.id, 'md')}<b>${esc(p.name)}</b><span class="muted" style="font-weight:400">· ${esc(p.desc)}</span></span>`;
      }
      b += `</div>`;

      b += divider();
      const needFx = S.draft.cultivation === 'shen' || S.draft.cultivation === 'both';
      const ok = S.draft.name && S.draft.cultivation && S.draft.origin && S.draft.path && (!needFx || S.draft.faxiang);
      b += `<div style="display:flex;gap:8px;align-items:center">
        <button class="btn" data-act="create-next" ${ok ? '' : 'disabled'}>下一步 · 灵根与根基</button>
        <span class="muted small">${ok ? '' : '请补齐姓名/主修/出身/道途'}</span></div>`;
      return panel('创角 · 第一面', b, { sub: '作者：雾见川' });
    }

    // 第二面
    let b = `<div class="creation-step">灵根</div>`;
    b += `<div class="muted small" style="margin:4px 0">灵根决定修为/香火速度与法术威力。</div>`;
    b += `<div class="row"><span class="lab">类型</span><div style="display:flex;gap:6px;flex-wrap:wrap">`;
    for (const k in D.ROOTS) {
      b += `<span class="chip ${S.draft.root === k ? 'on' : ''}" data-act="root:${k}">
        <b>${esc(D.ROOTS[k].name)}</b><span class="muted" style="font-weight:400">×${D.ROOTS[k].mul}</span></span>`;
    }
    b += `</div></div>`;
    if (S.draft.root) {
      const need = needEls(S.draft.root);
      b += `<div class="row"><span class="lab">系别</span><div style="display:flex;gap:6px;flex-wrap:wrap">`;
      const src = S.draft.root === 'mutate' ? D.MUT_ELEMENTS : D.ELEMENTS;
      for (const k in src)
        b += `<span class="chip ${(S.draft.rootEls || []).includes(k) ? 'on' : ''}" data-act="el:${k}">${esc(src[k].name)}</span>`;
      b += `</div><span class="muted small">选 ${need} 系</span></div>`;
    }

    b += divider();
    b += `<div class="creation-step">体质</div>`;
    b += `<div class="selgrid" style="margin-top:6px">`;
    for (const bd of D.BODIES) {
      b += `<span class="chip ${S.draft.body === bd.id ? 'on' : ''}" data-act="body:${bd.id}" style="justify-content:flex-start">
        <b>${esc(bd.name)}</b><span class="muted" style="font-weight:400">· ${esc(bd.eff)}</span></span>`;
    }
    b += `</div>`;

    b += divider();
    b += `<div class="creation-step">六维（共 60 点，单项 1~15）</div>`;
    const used = sumStats(S.draft.stats || baseStats());
    b += `<div class="small" style="margin:4px 0">已用 <b class="${used > 60 ? 'numbad' : 'numgood'}">${used}</b> / 60</div>`;
    for (const k in D.STATS) {
      const v = (S.draft.stats || baseStats())[k];
      b += `<div class="row" style="margin:2px 0">
        <span class="lab" style="min-width:3em">${esc(D.STATS[k].name)}</span>
        <span class="bar" style="width:9em"><i class="fill" style="width:${v / 20 * 9}em;background:var(--jade)"></i></span>
        <b style="min-width:2em;text-align:right">${v}</b>
        <button class="cmd" data-act="st:-:${k}">−</button>
        <button class="cmd" data-act="st:+:${k}">＋</button>
        <span class="muted small">${esc(D.STATS[k].desc)}</span></div>`;
    }

    b += divider();
    b += `<div class="creation-step">天赋（5 点）</div>`;
    const tl = talLeft();
    b += `<div class="small" style="margin:4px 0">剩余天赋点 <b class="${tl < 0 ? 'numbad' : 'numgood'}">${tl}</b></div>`;
    b += `<div class="selgrid" style="margin-top:4px">`;
    for (const t of D.TALENTS) {
      b += `<span class="chip ${(S.draft.talents || []).includes(t.id) ? 'on' : ''}" data-act="tal:${t.id}" style="justify-content:flex-start">
        <b>${esc(t.name)}</b><span class="muted" style="font-weight:400">· ${esc(t.desc)} · ${t.cost}点</span></span>`;
    }
    b += `</div>`;

    b += divider();
    const ready = S.draft.root && (S.draft.rootEls || []).length >= needEls(S.draft.root)
      && S.draft.body && used <= 60 && tl >= 0 && tl <= 5;
    b += `<div style="display:flex;gap:8px;align-items:center">
      <button class="btn ghost" data-act="create-back">上一步</button>
      <button class="btn" data-act="create-start" ${ready ? '' : 'disabled'}>踏入仙途</button>
      <span class="muted small">${ready ? '' : '请补齐灵根/体质/点数'}</span></div>`;
    return panel('创角 · 第二面', b, { sub: '灵根 · 体质 · 六维 · 天赋' });
  }

  /* ---------- 状态卡 ---------- */
  /* renderStatus() 已删除：它与 renderStateCol() 高度重复且从未被调用。
     2026-11-08 踩过：往 renderStatus 里加了「人情/征兆」，界面上却什么也没有——
     因为真正渲染右栏的是 renderStateCol。死代码留在文件里，就会有人（包括 AI）改错函数。 */


  function shenTongLimit() {
    if (isShen()) {
      if (!S.xianji) return 1;
      const x = { '黄基': 1, '玄基': 2, '地基': 3, '天基': 4 }[S.xianji] || 1;
      let l = x;
      if (S.sanxuan === 'qing') l += 1;
      return l;
    }
    // 仙道：紫府三关 + 神通数 1~5
    if (S.xRealm === 3) return 5;
    if (S.xRealm === 2) return { '黄基': 1, '玄基': 2, '地基': 3, '天基': 4 }[S.xianji] || 1;
    return 0;
  }
  /* v10.5 P1·N2：神通入口配置化。
     旧版把「紫府 idx===3」写死在破境与紫府关两处，筑基有额度却没有入口。
     现在入口只读 SHENTONG_GRANT：改一个 fromRealm 就能让神通从筑基起赋予。 */
  function canGrantShenTong(reason) {
    const line = capLine();
    const cfg = D.SHENTONG_GRANT && D.SHENTONG_GRANT[line];
    if (!cfg) return false;
    if (line === 'xian' && (S.xRealm || 0) < (cfg.fromRealm || 0)) return false;
    if (line === 'shen' && (S.pillar || 0) < (cfg.fromPillar || 0)) return false;
    const lim = shenTongLimit();
    if (lim <= 0) return false;
    return (S.shenTong || []).length < lim;
  }
  function grantShenTong(reason) {
    if (!canGrantShenTong(reason)) return false;
    openShentongPick();
    return true;
  }

  /* ============================================================
     v10.4 P2·11：神通装配（S.stEquip 子集）
     ------------------------------------------------------------
     方案原意：把「全持有全可用」变成「选带 N 道」。
     落地时有个前提必须说清：本项目已有 shenTongLimit（1~5 道）这道
     持有上限，若再叠一层「装配上限」，等于双重限制 —— 玩家本来就只有
     几道，再砍一刀，战斗会变得局促而不是有趣。
     所以这里的口径是：
       · 拥有即默认装配（旧存档零迁移，读档行为不变）
       · 装配数 = 持有数（不新造上限）
       · 玩家可以「主动卸下」某几道，用来让入场态势的类别构成更集中
         （比如卸掉两道术，把「偏执」换成「四象归元」）
     于是装配的意义不是「省着带」，而是「为了态势取舍」——这才与 S4 咬合。
     ============================================================ */
  function stEquipList() {
    const all = S.shenTong || [];
    if (!Array.isArray(S.stEquip)) return all.slice();   // 未做选择＝全装
    return all.filter(function (n) { return S.stEquip.indexOf(n) >= 0; });
  }
  /* 「这一道是否已装配」——未设置时视为已装 */
  function stEquipped(name) {
    if (!Array.isArray(S.stEquip)) return true;
    return S.stEquip.indexOf(name) >= 0;
  }
  function stEquipCost(name) {
    const sp = shenTongSpec(name);
    return sp.cost;
  }

  /* ============================================================
     v10.4 P2·12：功法熟练度（方案标注「可选」）
     ------------------------------------------------------------
     加这一项的前提在方案里写得很清楚：只有玩家已经能感知功法差异，
     成长维度才值得加。P0/P1 做完之后，这个前提成立。
     ------------------------------------------------------------
     设计上刻意避开「练得越久数字越大」这种纯循环：
       · 熟练度只随「真正用这本功法做事」增长：以它为道基修炼、
         闭关、以及它与神通/四艺咬合的那些时刻
       · 熟练度不解锁新系统，只把「这本功法已经有的那个特点」放大
         （有 heal 的更像 heal，有 craftArts 的更像那门手艺）
       · 三阶封顶，每阶 +25% 该功法的主特征，不叠加新词条
     于是它增长的是「这本功法的性格」，不是「又一个乘区」。
     ============================================================ */
  const GF_PROF_STEPS = [0, 60, 180, 400];   // 熟练度门槛：初习/小成/精熟/化境
  const GF_PROF_NAME = ['初习', '小成', '精熟', '化境'];
  const GF_PROF_MUL = [1, 1.25, 1.5, 1.75];  // 只乘「主特征」，不是全局乘区

  function gfProfMap() { return (S.gfProf && typeof S.gfProf === 'object') ? S.gfProf : (S.gfProf = {}); }
  function gfProfOf(id) { return Math.max(0, Math.round(numOr(gfProfMap()[id], 0))); }
  function gfProfStep(id) {
    const v = gfProfOf(id);
    let i = 0;
    for (let k = 0; k < GF_PROF_STEPS.length; k++) if (v >= GF_PROF_STEPS[k]) i = k;
    return i;
  }
  function gfProfName(id) { return GF_PROF_NAME[gfProfStep(id)]; }
  /* 熟练度乘区：只作用于「这本功法的主特征」，由扩展决定乘给谁 */
  function gfProfMul(id) { return GF_PROF_MUL[gfProfStep(id || (S.gongfa && S.gongfa[0]))]; }
  /* 供扩展读取（EXT 在 game.js 之后挂载，用探针拿实时值） */
  function gfProfProbe() {
    const id = S.gongfa && S.gongfa[0];
    return id ? { id: id, prof: gfProfOf(id), step: gfProfStep(id), mul: gfProfMul(id), name: gfProfName(id) } : null;
  }
  /* 增长入口。为什么要「受用」才涨：
     换着功法乱试不涨、把书买来不读也不涨 —— 熟练是「用过」的痕迹。 */
  function addGfProf(n, why) {
    const id = S.gongfa && S.gongfa[0];
    if (!id) return 0;
    const m = gfProfMap();
    const before = gfProfOf(id);
    const cap = GF_PROF_STEPS[GF_PROF_STEPS.length - 1];
    if (before >= cap) return 0;
    m[id] = Math.min(cap, before + Math.max(0, Math.round(n)));
    const afterStep = gfProfStep(id), beforeStep = (function () {
      let i = 0;
      for (let k = 0; k < GF_PROF_STEPS.length; k++) if (before >= GF_PROF_STEPS[k]) i = k;
      return i;
    })();
    if (afterStep > beforeStep) {
      const g = getDaogong();
      logLine('《' + (g ? g.name : id) + '》' + why + '，已至「' + GF_PROF_NAME[afterStep] + '」。', 'good');
      toast('功法精进 · ' + GF_PROF_NAME[afterStep]);
    }
    return m[id] - before;
  }

  function curPlace() {
    if (S.inDongtian) return '洞天·' + (S.shenwei || '未入品');
    return curPlaceObj().name;
  }

  /* 旧的单栏 renderMain / renderCmds 已由三栏渲染取代，删除 */

  /* ---------- 场景描写：地点 × 季节 × 状态 ----------
     旧版一年只有 4 句，玩家每月看到同一句话。
     现在：特殊场景优先（破境/受伤/出关/有人来访/灾异），否则按地点×季节随机取一句。 */
  function sceneSeason() {
    const m = S.month;
    if (m >= 3 && m <= 5) return 'spring';
    if (m <= 8) return 'summer';
    if (m <= 11) return 'autumn';
    return 'winter';
  }
  /* 图随文走：同一次渲染里 scenePlace 只掷一次骰子，横幅与文本必同景 */
  var _scenePlaceMemo = null;
  function scenePlace() {
    if (_scenePlaceMemo) return _scenePlaceMemo;
    /* 洞天是独立地点：旧版把它并进 temple，人在洞天里读到的却是庙前的雪。
       SCENES.dongtian 已经按素材补了八条（影子比人先动、石的墨迹未干）。 */
    var k;
    if (S.inDongtian) k = 'dongtian';
    else if (isShen()) k = 'temple';
    else if (S.clan && S.place === 'qingyue' && rng() < 0.2) k = 'cave';
    else {
      const p = S.place || 'qingyue';
      if (S.phase === 'combat') k = 'wild';
      else if (S.cultPlace === 'market') k = 'market';
      /* 宗门场景写了四十条，但旧版这里从来没返回过 'sect'——
         入了宗门的人读到的还是「洞府」与「山野」。
         入了宗门且不在别处，就该看见宗门。 */
      else if (S.sect && S.xRealm >= 1 && rng() < 0.5) k = 'sect';
      else k = (S.xRealm >= 1 ? 'cave' : 'wild');
    }
    _scenePlaceMemo = k;
    return k;
  }

  /* ---------- 水墨插画层（纯渲染，逻辑零改动） ----------
     键优先级与 scene() 的特殊场景链完全对齐——图文永远匹配。
     WXCS3_ART 缺失（Node 测试桩只装 data+game 两文件）时静默回退纯文字。 */
  function sceneArtKey() {
    if (S.justBroke) return 'break';
    if (hpRatio() < 0.33) return 'hurt';
    if (S.justClosed) return 'closed';
    if (S.visitorIncoming) return 'visitor';
    if (S.famine) return 'drought';
    return scenePlace();
  }
  function artSeasonCls() {
    const m = S.month;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  }
  function renderSceneArt(key, variant) {
    const A = (typeof WXCS3_ART !== 'undefined') ? WXCS3_ART : null;
    if (!A || !A.has(key)) return '';
    return '<div class="sceneart sceneart--' + (variant || 'banner') +
      ' sceneart--' + artSeasonCls() + '">' +
      '<img src="' + esc(A.src(key)) + '" alt="" onerror="this.parentNode.style.display=\'none\'">' +
      '</div>';
  }
  function renderOverArt() {
    const end = resolveEnding();
    return renderSceneArt(end ? 'end_' + end.id : 'over', 'backdrop');
  }
  function scene() {
    // 洞天特殊
    if (S.inDongtian) return '洞天里香火钱串成一条线，你走过的地方，神像都在看你。';
    // 特殊场景优先
    const sp = D.SCENES_SPECIAL || {};
    if (S.justBroke) { S.justBroke = false; return pick(sp.breakXian || ['天还没亮你就醒了。']); }
    if (hpRatio() < 0.33) return pick(sp.hurt || ['伤口在阴天里发痒。']);
    if (S.justClosed) { S.justClosed = false; return pick(sp.closure || ['出关的那天，你站在洞口。']); }
    if (S.visitorIncoming) { S.visitorIncoming = false; return pick(sp.visitor || ['门外有人咳嗽了一声。']) + '你起身去开门。'; }
    if (S.famine) return pick(sp.drought || ['天旱了几个月。']);
    // 常规：地点 × 季节
    const place = scenePlace();
    const season = sceneSeason();
    const pool = (D.SCENES && D.SCENES[place] && D.SCENES[place][season]) || null;
    if (pool && pool.length) return pick(pool);
    // 兜底（旧行为）
    const m = S.month;
    if (m >= 3 && m <= 5) return '春。后山灵气略活，草叶上凝着细小的水珠。';
    if (m <= 8) return '暑气蒸腾，气海里的那点水声也燥了起来。';
    if (m <= 11) return '秋。灵气渐清，是采气的好时节。';
    return '冬。霜封了洞口，吐纳时呼出的气会凝成白雾。';
  }
  /* 地名题咏 */


  /* ============ 行动 ============ */
  const ACT = {};
  /* v9.0 第1步：扩展动作注册表。
     与 ACT 同形（key 不带 do_ 前缀亦可，dispatch 两处都会试），
     但由外部文件通过 G.WXCS3_EXT_ACT 写入。
     放在这里而不是新建全局，是为了让 dispatch 只有一条查找路径。 */
  const EXT_ACT = (G.WXCS3_EXT_ACT = G.WXCS3_EXT_ACT || {});

  /* v8.1 P0 M5：指令坞折叠组开关
     v10.7 P1：底部坞已拆进左导航常驻，折叠组随之取消。
        折叠的代价是「两级点击」——旧版要展开「修炼」才看得见功法，
        而多数人根本没意识到那四组是可以展开的。现在一级功能直接可见。
        移动端另有五项底栏（do_navgrp / do_navgo），承担同一批入口。 */
  ACT.do_navgrp = (gid) => {
    const g = navGroups().filter(function (x) { return x.id === gid; })[0];
    if (!g || !g.items.length) { toast('此处暂无可用之处'); return; }
    let b = '<ul class="opts">';
    g.items.forEach(function (it, i) {
      b += optRow('ABCDEFG'[i] || '·', it.t, { name: '入口', cls: 'peace' }, it.s, false,
        'do;navgo:' + encodeURIComponent(it.act));
    });
    b += '</ul>';
    openModal(g.name + ' · 入口', b);
  };
  /* 从「更多」里挑一条：先关掉分组弹窗再派发，免得目标面板被压在底下。 */
  ACT.do_navgo = (a, b2, c2) => {
    const act = decodeURIComponent([a, b2, c2].filter(function (x) { return x !== undefined && x !== null && x !== ''; }).join(':'));
    if (!act) { closeModal(); return; }
    closeModal();
    dispatch(act);
  };
  /* 移动端「更多」：把没进前四项的入口一次列全（要务永远排最前）。 */
  ACT.do_navmore = () => {
    const groups = navGroups();
    const main = { xiu: 1, wai: 1, chu: 1, ren: 1 };
    let b = '';
    groups.forEach(function (g) {
      if (main[g.id]) return;
      if (!g.items.length) return;
      b += '<div class="sechead">' + esc(g.name) + '</div><ul class="opts">';
      g.items.forEach(function (it, i) {
        b += optRow('ABCDEFG'[i] || '·', it.t, { name: '入口', cls: 'peace' }, it.s, false,
          'do;navgo:' + encodeURIComponent(it.act));
      });
      b += '</ul>';
    });
    if (!b) b = '<div class="small muted">此处暂无更多入口。</div>';
    openModal('更多入口', b);
  };

  ACT.openGoals = openGoals;
  ACT.openTut = openTut;
  ACT.do_tut = do_tut;

  ACT.screen = () => { closeModal(); render(); };

  /* 修炼 */
  /* 香火入账：与修为同理，一旬给月额的 1/3，累计值也要跟着涨 */
  function gainXianghuo(v) {
    if (!(v > 0)) return 0;
    const cap = maxXianghuo();
    const before = S.xianghuo;
    S.xianghuo = Math.min(cap, S.xianghuo + v);
    const d = S.xianghuo - before;
    if (d > 0) S.xianghuoQian = (S.xianghuoQian || 0) + d;
    return d;
  }

  ACT.cultivate = () => {
    if (S.phase !== 'play') return;
    S.meditate = false;
    /* 「打坐」一次坐到本月末，而不是只坐一旬。
       ------------------------------------------------------------
       如果每点一次只推一旬，升到紫府要按一千多次，那不是取舍，是折磨。
       而打坐本身没有任何决策——有决策的是「这一旬拿去打坐，还是拿去做事」。
       所以让打坐自动填满剩下的旬，把决策留在「做事」那一步：
         月初直接打坐 → 坐满三旬 = 一个月修为
         做了一件事再打坐 → 只剩两旬 = 三分之二个月
       做事的机会成本因此一眼可见。 */
    const left = Math.max(1, XUN_PER_MONTH - (S.xun || 0));
    const xunNow = S.xun || 0;
    let dx = 0, dh = 0;
    if (isXian() || S.cultivation === 'both') dx = gainXiuwei(monthXiuwei() / XUN_PER_MONTH * left);
    if (isShen() || S.cultivation === 'both') dh = gainXianghuo(monthXianghuo().capped / XUN_PER_MONTH * left);
    advanceXun(left);
    if (S.phase !== 'play') return render();
    const span = left > 1 ? ('（余 ' + left + ' 旬一并坐过去）') : '';
    // 两套账：仙道打坐只出修为，香火一分也不该涨；神道坐庙只动香火
    if (isShen()) {
      if (dh > 0) logLine(`坐庙温养到月末，香火 +${dh}`, 'good');
      else logLine('香火已满，这些日子白坐。', '');
    } else if (isBoth() && dh > 0) {
      logLine(`打坐到月末，修为 +${dx}，香火 +${dh}`, 'good');
    } else if (dx > 0) {
      logLine(XUN_SIT[xunNow] + span + `　修为 +${dx}`, 'good');
    } else {
      logLine('本境修为已满，再坐也只是白坐——该破境了。', '');
    }
    maybeEvent();
    render();
  };

  /* 传教（神道聚信） */
  ACT.preach = () => {
    if (!usesShenLine()) { toast('唯神道需聚信'); return; }
    const cost = 30;
    if (S.stones < cost) { toast('灵石不足（需 30）'); return; }
    S.stones -= cost;
    ledgerAdd('out', '庙会施粥', cost);
    advanceXun(1);
    if (S.phase !== 'play') return render();
    /* 收益随柱位放大：柱越高，一场庙会能招来的人越多 */
    const add = Math.round((30 + rnd(170)) * followerScale());
    const mul = S.fame > 20 ? 1.3 : 1;
    S.followers = Math.min(followLimit(), S.followers + Math.round(add * mul));
    S.piety = Math.min(2.0, S.piety + 0.05);
    logLine(`施粥、请戏、庙会。信众 +${Math.round(add*mul)}，虔诚 +0.05`, 'good');
    maybeEvent(); render();
  };

  ACT.openMeditate = () => {
    const shen = isShen();
    let b = shen
      ? `<div class="small muted">守庙闭关：香火 ×1.5，但信众流失翻倍，也会错过外界事件。</div>`
      : `<div class="small muted">闭关 ×2 修为，但会错过外界事件；寿元将尽或修为满自动停止。</div>`;
    // 预览：按当前速度能拿到多少（到本境满为止）。让玩家在按下去之前就知道值不值。
    const mx = monthXianghuo();
    const perM = shen ? Math.min(mx.raw * 1.5, mx.cap) : monthXiuwei() * 2;
    const cur = shen ? S.xianghuo : S.xiuwei;
    const need = shen ? pillar().need : (xrealm().need || 0);
    const est = function (y) { return Math.max(0, Math.min(perM * 12 * y, need - cur)); };
    b += divider() + `<div class="selgrid">`;
    for (const y of [1, 3, 10, 30]) {
      b += `<span class="chip" data-act="do;med:${y}">闭关 ${y} 年` +
        `<b style="color:var(--muted);font-weight:400;font-size:11px">+${fmtNum(Math.round(est(y)))} ` +
        (shen ? '香火' : '修为') + `</b></span>`;
    }
    b += `</div>`;
    b += `<div class="hint">数字是照现在的灵气、功法与身体算的；中途修为满了会自动出关。</div>`;
    openModal(shen ? '守庙闭关 · 岁月流逝' : '闭关 · 岁月流逝', b);
  };

  ACT.do_med = (y) => {
    closeModal();
    S.meditate = true;
    const shen = isShen();
    const unit = shen ? '香火' : '修为';
    const cur = () => (shen ? S.xianghuo : S.xiuwei);
    const goal = () => (shen ? pillar().need : xrealm().need);
    let total = 0, stopped = '';
    const months = y * 12;
    S.xun = 0;              // 闭关是整月的事，本月余下的旬一并吞掉
    for (let i = 0; i < months; i++) {
      const before = cur();
      /* 闭关按月给足额：monthXiuwei / monthXianghuo 里已有 meditate 加成 */
      if (isXian() || S.cultivation === 'both') gainXiuwei(monthXiuwei());
      if (isShen() || S.cultivation === 'both') gainXianghuo(monthXianghuo().capped);
      advanceMonth(1);
      if (S.phase !== 'play') return render();
      total += cur() - before;
      const need = goal();
      if (need && cur() >= need) { stopped = unit + '已满，出关在即。'; break; }
      if (!S.lifeStop && S.age / S.lifeMax > 0.9) { stopped = '寿元将尽，惊觉须出关寻生机。'; break; }
      if (S.collapse > 0) { stopped = '锚已失稳，崩解期开始了。'; break; }
    }
    S.meditate = false;
    let b = `<div class="small">${shen ? '守庙' : '闭关'} ${y} 年，岁月无声。</div>`;
    b += `<div class="small">${unit} +${Math.round(total)}，当前 ${Math.round(cur())}/${goal() || '—'}</div>`;
    b += `<div class="small">年龄 ${S.age} 岁</div>`;
    if (stopped) { b += divider() + `<div class="small good">${esc(stopped)}</div>`; }
    logLine(`${shen ? '守庙闭关' : '闭关'} ${y} 年，${unit} +${Math.round(total)}`, 'good');
    openModal('岁月流逝', b);
    render();
  };

  /* 破境 */
  ACT.openBreak = () => {
    const line = S.breakLine;
    S.breakLine = null;          // 用一次就清，不粘住
    // 双修要自己选走哪条线，而不是被硬塞进仙道分支
    if (isBoth() && !line) { openBothBreakPick(); return; }
    if (line === 'shen') {
      if (S.pos >= 3) openPillarBreak(); else openPosBreak();
      return;
    }
    if (isShen() || line === 'shen') {
      // 八柱正位已是终点：不能再被「香火未满」拦住，否则永远看不到终局面板
      if (S.pillar >= D.PILLARS.length - 1) { openZhenjunEnd(); return; }
      if (S.xianghuo < pillar().need) { toast('香火未满'); return; }
      if (S.pos >= 3) openPillarBreak(); else openPosBreak();
    } else {
      // P1-13：金丹/道胎统一在入口第一层判定
      if (S.xRealm === 4) { if (S.guowei) ACT.openDaotai(); else openJindan(); return; }
      // v6.3 功法所限：黄阶修到练气圆满就到头了，不换功法永远上不去。
      // 注意只在「已到本境最后一阶、正想跨大境界」时才卡，
      // 否则一进练气第 1 层就再也动不了，那成了卡死而不是设定。
      const capInfo = daogongCapInfo();
      const rr = xrealm();
      const lastStage = clamp((rr.stages || []).length - 1, 0, 99);
      if (S.xRealm >= capInfo.cap && S.xStage >= lastStage) {
        openCapBlocked(capInfo);
        return;
      }
      const need = xrealm().need;
      if (!need) { openJindan(); return; }
      if (S.xiuwei < need) { toast('修为未满'); return; }
      /* v10.1 第三梯队·问题7：修为满不再是唯一钥匙。
         跨大境界前先过「条件型门槛」（灵根与功法相合/道书/悟性），
         不满足则给出面板说清差在哪、怎么补——不是卡死，是要求。 */
      if (G.WXCS3_EXT && G.WXCS3_EXT.breakGate) {
        const _bg = G.WXCS3_EXT.breakGate({ onlyBlocked: true });
        if (!_bg.ok) { openBreakGateBlocked(_bg); return; }
      }
      // P2-15：紫府三关走独立判定
      if (S.xRealm === 3 && S.xStage >= 2) { openZifuGate(); return; }
      openXianBreak();
    }
  };

  /* v10.1 第三梯队·问题7：门槛未满足时的说明面板。
     三件事必须齐：差什么（逐条）、差多少（当前值/要求）、怎么补（解法）。
     缺任何一项，玩家就只会觉得「被卡住」，那和死档没有区别。 */
  function openBreakGateBlocked(bg) {
    const rows = bg.blocked || [];
    let b = '<div class="small">修为已满，但还不够。<b>破境不是许愿，是过关。</b></div>';
    b += divider();
    b += '<ul class="opts" style="list-style:none;padding:0">';
    for (const r of rows) {
      b += '<li style="margin:6px 0">' +
        '<div class="small danger"><b>' + esc(r.label) + '</b>　' + esc(r.text) + '</div>' +
        '<div class="muted small" style="margin-left:1em">解法：' + esc(r.hint) + '</div></li>';
    }
    b += '</ul>';
    b += divider();
    b += '<div class="hint">这些条件都在你手上能凑齐的范围内——不是运气，是准备。</div>';
    b += '<div style="margin-top:10px"><button class="btn ghost" data-act="modal:close">回去准备</button></div>';
    openModal('破境 · 条件未足', b, true);
  }

  /* 双修：本次破境走仙道还是神道 */
  function openBothBreakPick() {
    const xianReady = xrealm().need ? S.xiuwei >= xrealm().need : true;
    const shenReady = S.xianghuo >= pillar().need;
    let b = '<div class="small">你两条线都在走。这一次，先破哪一边？</div>' + divider();
    b += '<ul class="opts">';
    b += optRow('A', '破仙道：' + esc(realmName()), { name: '机缘', cls: 'chance' },
      xianReady ? '修为已满' : '修为未满（' + fmtNum(Math.round(S.xiuwei)) + '/' + fmtNum(xrealm().need || 0) + '）',
      !xianReady, 'do;breakline:xian');
    b += optRow('B', esc(pillar().name) + '神道：' + esc(D.POSITIONS[S.pos]),
      { name: '机缘', cls: 'chance' },
      shenReady ? '香火已满' : '香火未满（' + fmtNum(Math.round(S.xianghuo)) + '/' + fmtNum(pillar().need) + '）',
      !shenReady, 'do;breakline:shen');
    b += '</ul>';
    b += '<div class="hint">双修不是两边都快，是两边都慢——你只有一双手。</div>';
    openModal('双修 · 破哪一边', b, true);
  }

  ACT.do_breakline = (which) => {
    S.breakLine = which;
    closeModal();
    ACT.openBreak();
  };

  /* 被道基功法的品阶卡住时，给一个能走出去的路 */
  function openCapBlocked(capInfo) {
    let b = '<div class="small">' + esc(capInfo.tierName) + '道基功法，只供得起' +
      esc(capInfo.to) + '。<b>这不是修为不够，是路走断了。</b></div>';
    b += '<div class="muted small" style="margin:6px 0">' + esc(capInfo.why) + '</div>';
    b += divider();
    b += '<div class="small">三条路：</div>';
    b += '<ul class="opts">';
    b += optRow('A', '去坊市换功法', { name: '平和', cls: 'peace' }, '黄/玄两阶', false, 'act:openShop');
    b += optRow('B', '入宗门，进藏经阁', { name: '机缘', cls: 'chance' }, '贡献换地阶', false, 'act:openSect');
    b += optRow('C', '等一个传法机缘', { name: '机缘', cls: 'chance' }, '撞大运', false, 'modal:close');
    b += '</ul>';
    b += '<div class="hint">换功法不是换个名字——换的是你能走多远。</div>';
    openModal('功法所限 · ' + capInfo.to, b);
  }

  /* ============================================================
     v8.0 破境准备：把「掷骰子」变成「布置」
     ------------------------------------------------------------
     旧版破境只有一个 rate，玩家能做的只有「等修为满，然后点一下」。
     丹药要先去背包吃、地点在哪都一样、没人护法这回事——
     结果就是所有准备系统的意义都停留在文案上。
     现在把三件事摆到破境面板里，每一件都要付代价：
       择地（洞府灵气／宗门禁地／荒野）
       备药（破境类丹药，吃了就没）
       护法（一个交情过 60 的人，代价是欠他一次人情）
     三样都不是免费的，所以「准备到什么程度」本身是个决策。
     ============================================================ */
  function prepState() {
    if (!S.prep || typeof S.prep !== 'object') S.prep = { place: 'wild', pill: null, guard: null };
    if (S.prep.place === undefined) S.prep.place = 'wild';
    return S.prep;
  }
  function prepPlaceBonus() {
    const pl = prepState().place;
    if (pl === 'cave') return 0.03 + 0.015 * (S.lingqi || 1);   // 洞府越深越稳
    if (pl === 'sect') return S.sect ? 0.05 : 0;
    return 0;
  }
  function prepPillBonus() {
    const id = prepState().pill;
    if (!id) return 0;
    const it = D.PILL_EXT.find(function (x) { return x.id === id; });
    return it ? (it.v || 0) : 0;
  }
  function prepGuardBonus() { return prepState().guard ? 0.08 : 0; }
  function prepBonus() { return prepPlaceBonus() + prepPillBonus() + prepGuardBonus(); }
  function prepGuardCandidates() {
    return Object.keys(S.npcs || {}).filter(function (id) {
      const r = S.npcs[id];
      return r && r.met && r.alive !== false && (r.fav || 0) >= 60;
    }).slice(0, 4);
  }
  function prepPillCandidates() {
    return Object.keys(S.bag || {}).filter(function (id) {
      if ((S.bag[id] || 0) < 1) return false;
      const it = D.PILL_EXT.find(function (x) { return x.id === id; });
      return it && it.type === 'break';
    }).slice(0, 4);
  }

  /* v10.1 第三梯队·问题6：insightXp（阅历/悟道点）原本 6 处产出、零消费。
     现在按 20 点折 1 点悟性，直接进破境率——阅历终于名副其实。 */
  function insightWithXp() {
    const base = st('insight');
    if (!(G.WXCS3_EXT && G.WXCS3_EXT.insightBonus)) return base;
    return base + G.WXCS3_EXT.insightBonus();
  }

  function xianBreakRate() {
    // 文档：胎息/练气门槛低，越往上越渺茫
    const baseByRealm = [0.72, 0.62, 0.50, 0.36, 0.22];
    let r = baseByRealm[clamp(S.xRealm, 0, 4)];
    r += st('heart') * 0.012;
    /* 悟道点折算进悟性：读书攒下的阅历在破境这一刻兑现 */
    r += insightWithXp() * 0.006;
    r -= S.xStage * 0.03;
    if (S.karma > 30) r -= 0.06;
    if (S.merit > 20) r += 0.04;
    if (D.LINGQI[S.lingqi].v >= 2.0) r += 0.04;
    /* v8.0：道途四印配成对，气机自洽，破境更稳。
       旧版 checkDaoyin() 算出了 S.daoyinOk 却没有任何地方读它——
       四印这个系统整条是装饰，玩家配不配成对完全没区别。 */
    if (daoyinPaired()) r += 0.06;
    // 破境丹类加成（新表：小破障/筑基/大破障/凝婴）
    r += (S.breakBonus || 0);
    r += prepBonus();   // v8.0 择地／备药／护法三项准备的合计加成
    if (hpRatio() < 0.33) r -= 0.15;
    if (hpRatio() < 0.66) r -= 0.06;
    if (hasDebuff('karma_tangle')) r -= 0.08;   // 因果缠身
    return clamp(r, 0.05, 0.95);
  }

  function openXianBreak() {
    const r = xianBreakRate();
    /* v9.0 M1：跨大境界时，劫在开门前就掷定——准备面板必须先亮出
       劫类、克法、缺口、代价与成功率，让准备真正「有针对性」。
       劫定在同一存档上不重掷（do_xbreak 处不再重 roll）。 */
    if (isMajorXianBreak() && !S.trib && S.xRealm < 5) S.trib = rollTribulation();
    const p = prepState();
    const next = xrealm().stages[S.xStage + 1] || '下一境';
    const pct = function (v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; };
    let b = `<div class="small">${esc(realmName())} → ${esc(next)}</div>`;
    b += `<div class="row"><span class="lab">成败之机</span><b style="color:${r > .6 ? 'var(--merit)' : 'var(--cinnabar)'}">${Math.round(r * 100)}%</b><span class="muted small">道心 ${st('heart')} · 悟性 ${st('insight')}</span></div>`;
    /* v10.1 第三梯队·问题7：把门槛摊开给玩家看——已满足的打勾，未满足的写解法。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.breakGateHtml) b += G.WXCS3_EXT.breakGateHtml();
    b += divider();

    /* 择地 */
    b += `<div class="statline"><span class="k">择地</span><span class="v">${pct(prepPlaceBonus())}</span></div>`;
    b += `<div class="row" style="gap:6px;flex-wrap:wrap;margin:2px 0 8px">`;
    b += `<span class="chip${p.place === 'cave' ? ' on' : ''}" data-act="do;prep:place:cave">洞府内</span>`;
    b += `<span class="chip${p.place === 'sect' ? ' on' : ''}" data-act="do;prep:place:sect"${S.sect ? '' : ' style="opacity:.4"'}>宗门禁地</span>`;
    b += `<span class="chip${p.place === 'wild' ? ' on' : ''}" data-act="do;prep:place:wild">荒野</span>`;
    b += `</div>`;

    /* 备药 */
    const pills = prepPillCandidates();
    b += `<div class="statline"><span class="k">备药</span><span class="v">${pct(prepPillBonus())}</span></div>`;
    b += `<div class="row" style="gap:6px;flex-wrap:wrap;margin:2px 0 8px">`;
    if (!pills.length) b += `<span class="chip" style="opacity:.45">囊中无破境丹</span>`;
    pills.forEach(function (id) {
      const it = D.PILL_EXT.find(function (x) { return x.id === id; });
      b += `<span class="chip${p.pill === id ? ' on' : ''}" data-act="do;prep:pill:${id}">` +
        esc(it.name) + ` ×${S.bag[id]}</span>`;
    });
    if (p.pill) b += `<span class="chip" data-act="do;prep:pill:none">不服丹</span>`;
    b += `</div>`;

    /* 护法 */
    const guards = prepGuardCandidates();
    b += `<div class="statline"><span class="k">护法</span><span class="v">${pct(prepGuardBonus())}</span></div>`;
    b += `<div class="row" style="gap:6px;flex-wrap:wrap;margin:2px 0 8px">`;
    if (!guards.length) b += `<span class="chip" style="opacity:.45">无可托之人（须好感 60）</span>`;
    guards.forEach(function (id) {
      const n = D.NPC_POOL.find(function (x) { return x.id === id; }) || { name: id };
      b += `<span class="chip${p.guard === id ? ' on' : ''}" data-act="do;prep:guard:${id}">` +
        esc(n.name) + `（好感 ${S.npcs[id].fav}）</span>`;
    });
    if (p.guard) b += `<span class="chip" data-act="do;prep:guard:none">无须护法</span>`;
    b += `</div>`;

    /* 四印是否成对，直接在面板上写出来——不然那 +6% 是隐形的，玩家不知道它从哪来 */
    const dyOk = daoyinPaired();
    b += `<div class="statline"><span class="k">道途四印</span><span class="v" style="color:${dyOk ? 'var(--merit)' : 'var(--muted)'}">${dyOk ? '成对（+6%）' : '未成对'}</span></div>`;
    /* v9.0 M1：天劫预览（劫类/克法/缺口/代价/成功率）由扩展渲染 */
    const tp = (G.WXCS3_EXT && G.WXCS3_EXT.tribPreview) ? G.WXCS3_EXT.tribPreview(r) : '';
    if (tp) b += tp;
    b += `<div class="hint">所备皆有费：丹服即耗，护法欠一人情；择地之益，仅此一度。</div>`;
    b += `<div class="hint danger">若败：修为退至 ${S.jinxing ? '88' : '70'}%，气血逆冲。</div>`;
    b += `<div style="margin-top:10px"><button class="btn" data-act="do;xbreak">开坛破境</button>
      <button class="btn ghost" data-act="act:screen" style="margin-left:6px">再等等</button></div>`;
    openModal('破境 · ' + xrealm().name, b, true);
  }

  ACT.do_prep = (kind, val) => {
    const p = prepState();
    if (kind === 'place') p.place = (['cave', 'sect', 'wild'].indexOf(val) >= 0 ? val : 'wild');
    else if (kind === 'pill') p.pill = (val === 'none' ? null : val);
    else if (kind === 'guard') p.guard = (val === 'none' ? null : val);
    openXianBreak();
  };

  ACT.do_xbreak = () => {
    closeModal();
    if (S.tribLock > 0) { toast('天劫余威未散，还需 ' + S.tribLock + ' 旬'); return; }
    /* 跨大境界先过天劫：给骰子一个看得见的对手，再谈准备与丹药 */
    if (isMajorXianBreak() && !S.trib && S.xRealm < 5) {
      S.trib = rollTribulation();
      openTribulation(xianBreakRate());
      return;
    }
    // 破障丹加成只影响「这一次」破境；筑基丹的 +15 也要真的加进去。
    // 旧代码 breakBonus 只加不减、consumeBreakBonus 从未被调用，
    // 吃一颗小破障丹等于此后每次破境永久 +12%。
    let rate = xianBreakRate();
    if (S.trib) rate = clamp(rate + tribCounter(S.trib.id).bonus, 0.05, 0.95);
    /* —— 准备在这里兑现：丹药扣掉、人情欠下、地方用掉。
       旧版这里有一段「手里有筑基丹就自动吃」的特判，
       等于玩家连吃药这一步都不用想。现在药要自己选，选了才吃。 */
    const p = prepState();
    if (p.pill) {
      if ((S.bag[p.pill] || 0) < 1) {
        toast('丹已不在手中');
        S.prep = null;
        render();
        return;
      }
      S.bag[p.pill]--;
      consumeQuality(p.pill);
      const pit = D.PILL_EXT.find(function (x) { return x.id === p.pill; });
      logLine('服下' + (pit ? pit.name : '丹药') + '，气机一沉。', '');
    }
    if (p.guard) {
      const gr = S.npcs[p.guard];
      const gn = D.NPC_POOL.find(function (x) { return x.id === p.guard; });
      if (gr) {
        gr.fav = clamp((gr.fav || 0) - 15, 0, 120);
        logLine((gn ? gn.name : '护法者') + '在关外守了一夜。这份人情记下了。', '');
      }
    }
    S.prep = null;
    S.breakBonus = 0;
    S.cultBonus = 1;
    /* ============================================================
       v8.0 心魔劫：业力的第一个真消费端
       ------------------------------------------------------------
       旧版业力只值「破境率 −6%」——杀十个人和没杀，区别小到看不见。
       业力本来就是「你做过的事在夜里回来找你」，所以它该在破境这一夜发作：
       业力 ≥30 时，破境前会先被问一句。答什么，决定这一夜能不能过去。
       ============================================================ */
    if (S.karma >= 30) {
      const odds = clamp(S.karma / 100, 0.30, 0.85);
      if (rng() < odds) {
        S.hdRate = rate;
        openHeartDemon();
        return;
      }
    }
    resolveXianBreak(rate);
  };

  /* 心魔问的那句话，按境界换口气：低境问「怕不怕」，高境问「值不值」 */
  function heartDemonQ() {
    if (S.xRealm >= 3) {
      return {
        q: '你这一路走上来，踩过的人，还记得几个？',
        a: '「记得。夜里记得。」',
        b: '「不记得。他们不重要。」',
        c: '「记得。但我不打算还。」'
      };
    }
    if (S.xRealm >= 1) {
      return {
        q: '若这一关过不去，你悔不悔？',
        a: '「悔。但还是要过。」',
        b: '「不悔。悔了就过不去。」',
        c: '「悔不悔，都得过。」'
      };
    }
    return {
      q: '怕吗？',
      a: '「怕。」',
      b: '「不怕。」',
      c: '「怕，所以更要试。」'
    };
  }

  function openHeartDemon() {
    const k = heartDemonQ();
    let b = `<div class="small muted">识海里有个声音，用你自己的口气说话。</div>`;
    b += `<div class="npcmeet" style="margin:8px 0"><div class="nm-line">「${esc(k.q)}」</div></div>`;
    b += `<div class="small" style="margin-bottom:6px">答完之后，这一夜才继续。</div>`;
    b += '<ul class="opts">';
    b += optRow('A', k.a, { name: '认', cls: 'peace' }, '道心 −1 · 业力 −5 · 成功率 上浮一成', false, 'do;hd:admit');
    b += optRow('B', k.b, { name: '抗', cls: 'risk' }, '道心 +2 · 成功率 下压一成半', false, 'do;hd:fight');
    b += optRow('C', k.c, { name: '借', cls: 'chance' }, '业力 +15 · 功德 −10 · 成功率 上浮三成半', false, 'do;hd:borrow');
    b += '</ul>';
    b += `<div class="hint">认了会软，抗了会硬，借来的力最省事——也最贵。</div>`;
    openModal('心魔 · ' + realmName(), b, true);
  }

  ACT.do_tribGo = () => { closeModal(); ACT.do_xbreak(); };

  ACT.do_hd = (kind) => {
    const base = S.hdRate || 0.5;
    S.hdRate = 0;
    closeModal();
    let rate = base;
    if (kind === 'admit') {
      rate = clamp(base * 1.10, 0.05, 0.95);
      S.stats.heart = Math.max(1, st('heart') - 1);
      S.karma = Math.max(0, S.karma - 5);
      logLine('你说了实话。心魔退了一步，你也退了一步。', '');
    } else if (kind === 'fight') {
      rate = clamp(base * 0.85, 0.05, 0.95);
      S.stats.heart = Math.min(20, st('heart') + 2);
      logLine('你把那句话按了回去。按住了，手却在抖。', '');
    } else {
      rate = clamp(base * 1.35, 0.05, 0.95);
      S.karma += 15;
      S.merit = Math.max(0, S.merit - 10);
      logLine('你借了它的力。它没有讨价，只是记下了。', 'danger');
    }
    resolveXianBreak(rate);
  };

  function resolveXianBreak(rate) {
    if (rng() < rate) {
      const r = xrealm();
      if (S.xStage < r.stages.length - 1) {
        S.xStage++;
        S.xiuwei = 0;
        recalcCaps(true);   // v10.5：每小阶 +4% 的基数增长在这里落地
        logLine('破境：晋 ' + realmName() + '。', 'good');
        const sv = reciteVerse('breakStage');
        if (sv) logLine('· ' + sv, '');
        if (S.xRealm >= 2 && (S.daoyin || []).length < 4) tryOpenYin();
      } else {
        // 跨大境界（越界保护：道胎以上不再靠破境推进）
        if (S.xRealm >= 5) { S.xiuwei = 0; toast('道胎既成，破境之路已尽'); render(); return; }
        const lifeBefore = S.lifeMax || 0;
        S.xRealm++; S.xStage = 0; S.xiuwei = 0;
        const nr = xrealm() || D.XIAN_REALMS[D.XIAN_REALMS.length - 1];
        S.lifeMax = nr.life || 0;
        /* v10.4 P0：破境会把 lifeMax 重设成境界基准值，
           补天/龟息/太阴吐纳的加成必须重新落一次，否则一破境就丢。 */
        S.lifeGfBonus = 0; syncLifeBonus();
        recalcCaps(true);     // v10.5：境界基数换档，先重算再回满
        healOnMajorBreak();   // 只有破大境界才回满
        /* v8.1：补 idx === 1（练气）——旧版从 0 直接跳到 3，
           「胎息」「练气」两档的境界词因此永不可达。 */
        if (nr.idx === 1) bumpUnlock('xian', 2);
        if (nr.idx === 2) bumpUnlock('xian', 3);
        if (nr.idx === 3) bumpUnlock('xian', 4);
        logLine(`破境成功：晋入 ${nr.name}。`, 'good');
        const verse = reciteVerse('breakXian');
        if (verse) logLine('· ' + verse, 'good');   // 弹窗被奇遇顶掉时，纪事里至少还留一句
        // 仙基 / 道印 / 神通这些面板放到「继续」之后——先出诗，再办手续
        S.afterBreak = [];
        if (nr.idx === 2) S.afterBreak.push('xianji');
        /* v10.7 阶段二：筑基仪式的第三步——本命锻造。
           只在「由练气晋入筑基」这一次排入；已有本命、纯神道不排。
           仪式不查炼器等级、不额外占旬、不掷成功率（见 ext-40 openNatalForge）。 */
        if (nr.idx === 2 && !S.benming && S.cultivation !== 'shen') S.afterBreak.push('forge');
        if (nr.idx >= 2 && (S.daoyin || []).length < 4) S.afterBreak.push('daoyin');
        if (canGrantShenTong('break')) S.afterBreak.push('shentong');
        /* v9.0 M1：命格是破境的第四道手续——无痕者排进队列（扩展判空） */
        {
          const FX = G.WXCS3_EXT;
          if (FX && FX.fateWanted && FX.fateWanted()) S.afterBreak.push('fate');
        }
        S.holdEvent = true;   // 这一回合先看诗，奇遇等「继续」之后再掷
        S.breakPop = {
          title: '破境 · ' + nr.name,
          poem: verse,
          sub: realmName() + '　' + (nr.idx === 2 ? '六轮兵解' : nr.idx === 3 ? '三关俱过' : nr.idx === 4 ? '金性已凝' : '气海翻涌'),
          life: lifeBefore && nr.life ? (nr.life - lifeBefore) : 0
        };
      }
      S.renGong = (S.renGong || 0) + 80;
      if (S.trib) { logLine('天劫已渡：' + S.trib.name + '此关，得生路焉。', 'good'); S.trib = null; }
      toast('破境 · ' + realmName());
      // 借来的运：钩子给的功法让你走得快，也让你走火
      if (hasDebuff('borrowed_luck') && rng() < 0.15) {
        const z = Math.round(S.hpMax * 0.3);
        S.hp = Math.max(1, S.hp - z);
        S.xiuwei = Math.round((xrealm().need || 100) * 0.2);
        logLine('一缕非我之气忽焉逆冲，是为气机倒行。气血 −' + z + '，修为退。', 'danger');
        bump('heartBreak');   // 功过格「走火」需要两次
        toast('气机逆行');
      }
      // holdEvent 期间不抢先弹传法：破境的诗还没看完，传法等 afterbreak 放行
      if (S.phase === 'play' && !S.holdEvent) maybeTransmitNow();
    } else {
      /* v8.0：金性不坏。金丹之后，破境失败不再把修为散掉三成。
         旧版 S.jinxing 只在结丹时置 true，之后再没人读过——
         「煅出金性」这个金丹的核心设定等于没写。 */
      const keep = S.jinxing ? 0.88 : 0.70;
      if (S.jinxing) logLine('金性不动，修为未散，此夜终难度。', 'good');
      S.xiuwei = Math.round((xrealm().need || 100) * keep);
      const dmg = Math.round(S.hpMax * (0.12 + rng() * 0.15));
      S.hp = Math.max(1, S.hp - dmg);   // 破境失败不致死，最低留 1 血
      let extra = '';
      if (S.xRealm === 1) { extra = '六轮复归气海，须重修一段'; }
      const fline = pick(D.VERSES.fail);
      logLine('· ' + fline, 'danger');
      S.lastLiturgy = fline;
      logLine('破境未成，气血逆冲 −' + dmg + '，修为退至七成。', 'danger');
      if (S.trib) { tribFailPenalty(); S.trib = null; }
      S.holdEvent = true;
      S.breakPop = {
        title: '破境未成 · ' + realmName(),
        poem: fline,
        sub: '此关未过',
        fail: true,
        dmg: dmg, extra: extra
      };
      toast('此关未过');
    }
    advanceXun(1);
    // 破境的诗必须压在最后弹：advanceMonth 可能开奇遇，先弹会被顶掉
    if (S.breakPop && !modalBusy()) {
      const p = S.breakPop; S.breakPop = null;
      if (p.fail) {
        openVersePop(p.title, p.poem, [
          { k: '气血', v: '−' + p.dmg, cls: 'hno' },
          { k: '修为', v: '跌回七成' },
          { k: '道心', v: '动摇 · 需静养', cls: 'hno' }
        ], { sub: p.sub, tail: p.extra || '再来一次，未必还是这个样子。', btn: '默坐良久', act: 'do;afterbreak' });
      } else {
        const rows = [{ k: '境界', v: esc(realmName()), cls: 'good' }];
        if (p.life > 0) rows.push({ k: '寿元上限', v: '+' + p.life + ' 年', cls: 'good' });
        rows.push({ k: '气血灵力', v: '尽复' });
        openVersePop(p.title, p.poem, rows, {
          sub: p.sub,
          tail: (S.afterBreak || []).length ? '还有一件事要办。' : '',
          btn: (S.afterBreak || []).indexOf('xianji') >= 0 ? '六轮兵解' : '继续',
          act: 'do;afterbreak'
        });
      }
      return;
    }
    maybeEvent(); render();
  };

  /* 破境后的手续：仙基 → 本命锻造 → 道印 → 神通 → 命格，一个一个来。
     v10.7 阶段二：改成真正的 FIFO——每次只 shift() 当前一项，其余留在
     S.afterBreak 里。旧版把整队取出再逐条 filter：一旦某一步自己不再回调
     `do;afterbreak`（do_yin 选完道印直接 closeModal，do_st 只弹得物窗），
     后面的神通/命格就永远丢了。新增锻造步骤更会把整条链吃掉。 */
  function finishAfterBreak() {
    render();
    // 破境时挂起的奇遇，现在放行
    if (S.holdEvent) { S.holdEvent = false; maybeEvent(); render(); }
    else if (!modalBusy()) maybeTransmitNow();
  }
  /* 面板完成后的统一续接口（本命锻造等扩展也用这个出口） */
  function afterBreakStepDone() {
    if ((S.afterBreak || []).length) return ACT.do_afterbreak();
    finishAfterBreak();
  }
  /* 摘掉「已完成」的那一步。默认只认队头——不按名字乱删，
     防止某一步没做完就被别处的同名步骤顶掉。 */
  function afterBreakPop(step) {
    const q = (S.afterBreak || []).slice();
    if (q.length && (!step || q[0] === step)) q.shift();
    else if (step) {
      const i = q.indexOf(step);
      if (i >= 0) q.splice(i, 1);
    }
    S.afterBreak = q;
  }
  /* 完成当前一步 → 续接下一步。所有面板的选择动作都从这里回队列。 */
  function afterBreakDone(step) {
    afterBreakPop(step);
    return afterBreakStepDone();
  }
  ACT.do_afterbreak_done = (step) => { closeModal(); afterBreakDone(step || null); };

  ACT.do_afterbreak = () => {
    closeModal();
    if (!(S.afterBreak || []).length) { finishAfterBreak(); return; }
    const step = S.afterBreak[0];       // peek：这一步完成前不摘，读档后仍可续
    if (step === 'xianji') return openXianjiPick();
    if (step === 'forge') {
      const FX = G.WXCS3_EXT;
      if (FX && FX.openNatalForge) return FX.openNatalForge();
      afterBreakPop('forge');           // 扩展未加载：跳过，不堵队列
      return ACT.do_afterbreak();
    }
    if (step === 'daoyin') { if (tryOpenYin()) return; afterBreakPop('daoyin'); return ACT.do_afterbreak(); }
    if (step === 'shentong') { if (openShentongPick()) return; afterBreakPop('shentong'); return ACT.do_afterbreak(); }
    /* v9.0 M1：择痕排在仙基/道印/神通之后。面板由扩展开，选完走 do;afterbreak_done:fate */
    if (step === 'fate') {
      const FX = G.WXCS3_EXT;
      if (FX && FX.openFateChoice) return FX.openFateChoice();
      afterBreakPop('fate');
      return ACT.do_afterbreak();
    }
    afterBreakPop(step);                // 未知步骤：跳过而不是卡死
    return ACT.do_afterbreak();
  };

  /* 筑基：铸仙基（自动定道统） */
  function openXianjiPick() {
    const pool = ['黄基', '玄基', '地基', '天基'];
    let b = `<div class="small">六轮兵解，气海里多了一块东西。仙基品类定死你的道统归属。</div>`;
    b += `<div class="muted small" style="margin:4px 0">按「灵根＋所修功法＋灵脉」三者自定。</div>`;
    b += divider();
    const g = getGongfa();
    const tierIdx = ['huang', 'xuan', 'di', 'tian', 'xian'].indexOf(g.tier);
    const qiLv = S.lingqi;
    let auto = Math.min(tierIdx, qiLv >= 1 ? 3 : 2);
    if (S.root === 'heaven') auto = Math.min(3, auto + 1);
    const result = pool[clamp(auto, 0, 3)];
    // 道统
    const el = S.rootEls[0];
    const dtPool = D.QI_TO_DAOTONG[el] || ['坎水', '府水'];
    const dt = pick(dtPool);
    S.xianji = result;
    S.daotong = dt;
    S.sanxuan = pick(['qing', 'tong', 'dou']);
    let shown = `<div class="small">仙基：<b>${esc(result)}</b>（神通上限 ${({黄基:1,玄基:2,地基:3,天基:4})[result]}）</div>`;
    shown += `<div class="small">道统：<b>${esc(dt)}</b> · 三玄 ${esc(D.SANXUAN[S.sanxuan].name)}</div>`;
    shown += `<div class="muted small" style="margin-top:4px">你采的这口气，有点像${esc(D.ELEMENTS[el] ? D.ELEMENTS[el].name : '某种东西')}。</div>`;
    b += shown;
    b += `<div class="hint">道途四印从此开始：每破一境得一枚，四枚须为二干二支且配成一对。</div>`;
    b += `<div style="margin-top:10px"><button class="btn" data-act="do;afterbreak_done:xianji">继续</button></div>`;
    logLine(`筑基，铸 ${result}，道统显形：${dt}`, 'good');
    openModal('筑基 · 仙基与道统', b, true);
  }

  /* 金丹：证果位 */
  /* 金丹证位的成功率：底数直接取果位表里那个从没被用过的 rate（闰60/余40/正20/至尊5），
     再按四印是否成对与心性加减。面板上「四印未配成对——证位时 −15」这句承诺，
     终于在这里兑现。 */
  function jindanRate(g) {
    const base = (D.GUOWEI_RANK[g.rank] ? D.GUOWEI_RANK[g.rank].rate : 40) / 100;
    let r = base;
    r += daoyinPaired() ? 0.15 : -0.15;
    r += st('heart') * 0.008;
    if (S.merit >= 50) r += 0.04;
    if (S.karma >= 50) r -= 0.06;
    return clamp(r, 0.05, 0.92);
  }

  function openJindan() {
    let b = `<div class="small">金丹需有<b>果位</b>，没有果位的金丹叫「散金丹」——战力只有同阶三成。</div>`;
    b += `<div class="muted small" style="margin:4px 0">三十个位，都有人了。你要去抢一个。</div>`;
    b += divider();
    const pool = pickN(D.GUOWEI, 3);
    b += `<ul class="opts">`;
    pool.forEach((g, i) => {
      b += optRow('ABC'[i], `${g.n}（${g.gz}）—— ${g.img}`, { name: '机缘', cls: 'chance' },
        `${g.rank} · ×${D.GUOWEI_RANK[g.rank].mul} · 约 ${Math.round(jindanRate(g) * 100)}%`,
        false, 'do;jindan:' + encodeURIComponent(g.n));
    });
    b += `</ul>`;
    b += `<div class="hint">至尊三位（天河水／天上火／大海水）：取之，是向当世最强者宣战。</div>`;
    openModal('金丹 · 果位', b, true);
  }

  ACT.do_jindan = (enc) => {
    const name = decodeURIComponent(enc);
    const g = D.GUOWEI.find(x => x.n === name);
    if (!g) { closeModal(); return; }
    const rate = jindanRate(g);
    if (rng() >= rate) {
      /* 证位失败：丹没结成，这一身修为全散了。
         旧版这里没有任何判定——点一下就白得一个果位，
         金丹是整个仙道最重的门槛，却也是唯一不设关卡的地方。 */
      S.xiuwei = 0;
      S.hp = Math.max(1, Math.round(S.hp - S.hpMax * 0.3));
      S.karma += 3;
      logLine(`取「${g.n}」未得。丹碎于气海，修为尽散，气血去三成。`, 'danger');
      toast('证位未成');
      closeModal(); advanceXun(1); if (S.phase === 'play') render();
      return;
    }
    S.guowei = g;
    S.xRealm = 4; S.xStage = 0; S.xiuwei = 0;
    S.lifeMax = 1200;
    recalcCaps(true);
    S.jinxing = true;
    bumpUnlock('xian', 5);
    /* 功过格「孤证」：既无道侣，也无一个交情过 40 的人——
       这一位，是一个人证下来的。 */
    if (!npcHasMate() && !Object.keys(S.npcs || {}).some(function (k) {
      return (S.npcs[k] || {}).fav >= 40;
    })) bump('aloneCert');
    logLine(`结丹得果位：${g.n}（${g.rank}）。以己心代天心。`, 'good');
    toast('金丹 · ' + g.n);
    closeModal(); advanceXun(1); render();
  };

  /* 道胎：需三个剧情条件 */
  ACT.openDaotai = () => {
    let b = `<div class="small">道胎非修可得，唯「化」耳：须有一事，令人尽忘此我。</div>`;
    b += divider();
    b += `<div class="small">三事既具，方可证之：</div>`;
    b += `<div class="small muted">1. 一事令人忘我：非为殉身，乃不复计较。</div>`;
    b += `<div class="small muted">2. 一物足以系汝（物／人／事／仪，四锚其一）。</div>`;
    b += `<div class="small muted">3. 一度孤身证位，无人护法。</div>`;
    b += divider();
    b += `<div class="danger small">道胎无寿元之限。自此寿元一栏空，代之以锚。</div>`;
    b += `<div style="margin-top:10px"><button class="btn gold" data-act="do;daotai">化道胎</button></div>`;
    openModal('道胎 · 元婴', b, true);
  };

  ACT.do_daotai = () => {
    S.xRealm = 5; S.xStage = 0;
    recalcCaps(true);
    S.lifeMax = 0; S.lifeStop = true;
    S.anchors = { wu: 1, ren: 1, shi: 1, yi: 1 };
    bumpUnlock('xian', 6);
    logLine('道胎既化，寿元遂空，唯锚相系。', 'good');
    toast('道胎 · 寿元已尽，唯锚系之');
    closeModal(); advanceXun(1); render();
  };

  /* ---------- 神道破柱 ---------- */
  function posRate() {
    const hard = 20 + (S.pillar + 1) * 5;
    let r = 0.5 + st('heart') * 0.03 - (hard - 25) * 0.01;
    if (hasDebuff('karma_tangle')) r -= 0.08;
    return clamp(r, 0.10, 0.95);
  }

  function openPosBreak() {
    const rate = posRate();
    let b = `<div class="small">${esc(realmName())} → ${esc(D.POSITIONS[S.pos + 1])}</div>`;
    b += `<div class="row"><span class="lab">成功率</span><b>${Math.round(rate * 100)}%</b></div>`;
    b += `<div class="hint">失败：香火跌 25%，塑像裂一道缝。</div>`;
    b += `<div style="margin-top:10px"><button class="btn" data-act="do;posbreak">升位</button></div>`;
    openModal('升位', b, true);
  }

  ACT.do_posbreak = () => {
    closeModal();
    if (rng() < posRate()) {
      S.pos++;
      recalcCaps(true);
      S.xianghuo = Math.round(S.xianghuo * 0.6);   // 升位只折损六成，不清零
      S.renGong = (S.renGong || 0) + 120;
      logLine(`升位成功：晋 ${realmName()}。`, 'good');
    } else {
      S.xianghuo = Math.round(S.xianghuo * 0.75);
      logLine('升位失败，香火跌 25%，塑像裂了一道缝。', 'danger');
    }
    advanceXun(1); maybeEvent(); render();
  };

  function pillarRate(mode) {
    const row = D.BREAK_BASE[S.pillar];
    let base = { self: row.self, borrow: row.borrow, seize: row.seize }[mode];
    let adj = 0;
    if (st('heart') >= 15) adj += 5;
    if (st('heart') < 8) adj -= 10;
    if (S.merit > 20) adj += 5;
    if (S.karma > 30) adj -= 10;
    if (D.LINGQI[S.lingqi].v >= 2.0) adj += 5;
    if (S.xianghuo > pillar().need * 1.5) adj += 5;
    if (hpRatio() < 0.33) adj -= 15;
    if (S.sanxuan === 'tong' && mode === 'borrow') adj += 10;
    if (S.sanxuan === 'dou' && mode === 'seize') adj += 10;
    if (hasDebuff('karma_tangle')) adj -= 8;
    return clamp(Math.round(base + adj), 5, 95);
  }

  function openPillarBreak() {
    // 八柱正位已是神道终点：再点破柱会读 D.PILLARS[8].name 抛 TypeError
    if (S.pillar >= D.PILLARS.length - 1) { openZhenjunEnd(); return; }
    let b = `<div class="small">${esc(realmName())} 已正其位。破柱者，立新庙也：庙址、名分、香火之来源，三者缺一不可。</div>`;
    b += `<div class="muted small" style="margin:4px 0">下一柱：${D.PILLARS[S.pillar+1].name}《${D.PILLARS[S.pillar+1].title}》</div>`;
    b += `<ul class="opts">`;
    b += optRow('A', '自建（正祀）：购址营庙', { name: '平和', cls: 'peace' }, `${pillarRate('self')}% · 慢但正`, false, 'do;pilbreak:self');
    b += optRow('B', '借祀（附祀）：附于宗门、朝廷', { name: '机缘', cls: 'chance' }, `${pillarRate('borrow')}% · 年供20%`, false, 'do;pilbreak:borrow');
    b += optRow('C', '夺祀（抢祀）：毁人之庙', { name: '风险', cls: 'risk' }, `${pillarRate('seize')}% · 业力+15~30`, false, 'do;pilbreak:seize');
    b += `</ul>`;
    b += `<div class="hint">若败：一至三柱散香 30%、庙塌一角；四至六柱散 50%、退一阶；七至八柱法相崩解，神形俱灭。</div>`;
    openModal('破柱 · 三法抉择', b, true);
  }

  ACT.do_pilbreak = (mode) => {
    closeModal();
    if (S.pillar >= D.PILLARS.length - 1) { openZhenjunEnd(); return; }
    /* v10.1 第三梯队·问题7：神道破柱同样要过条件门槛（虔诚分档，读 PIETY 表）。
       原状：只要香火满就能试，虔诚只是公式里一个乘数。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.breakGate) {
      const _bg = G.WXCS3_EXT.breakGate({ onlyBlocked: true });
      if (!_bg.ok) { openBreakGateBlocked(_bg); return; }
    }
    if (S.tribLock > 0) { toast('天劫余威未散，还需 ' + S.tribLock + ' 旬'); return; }
    /* 神道破柱同样是跨大境：天劫在柱前落，克法按神道那一列读 */
    const tb = rollTribulation(), tc = tribCounter(tb.id);
    S.trib = tb;
    let rate = pillarRate(mode);
    rate = clamp(rate + tc.bonus * 100, 5, 95);
    logLine('破柱之日，天劫乃至：' + tb.name + '（' + tc.text + '）。', '');
    if (rnd100() <= rate) {
      S.pillar++; S.pos = 0; S.xianghuo = 0;
      /* v10.1 第三梯队·问题6：记录破柱所用之法，供 QIHE 三态判定（ext-90 读取）。
         自建=本命线 / 借祀=客庙 / 夺祀=相冲，三态各有真实出处。 */
      S.lastBreakMode = mode;
      S.miao = D.PILLARS[S.pillar].miao;
      S.lifeMax = D.PILLARS[S.pillar].life || 0;
      recalcCaps(true);
      if (!S.miaoHao) S.miaoHao = pick(['清微', '玄裳', '沧溟', '白岩']) + pick(['显应侯', '灵应公', '土地正神', '真君']);
      if (mode === 'seize') {
        bump('seizeWin');
        S.karma += 15 + rnd(15);
        S.enemy = true;
        S.enemyName = pick(['邻庙庙祝', '血奉执事', '游方邪修']);
        logLine('毁' + S.enemyName + '之庙，自是结一死仇。', 'danger');
      }
      /* 神道：破柱后 pillar 已 ++，一柱对应 stage 1；创角处已置 1，故二柱起从 2 续上 */
      bumpUnlock('shen', Math.min(8, S.pillar + 1));
      logLine(`破柱功成，晋入 ${realmName()}。`, 'good');
      S.followers = Math.round(S.followers * 1.5);
      S.renGong = (S.renGong || 0) + 200;
      toast('破柱 · ' + realmName());
      addRenGong(400);
      reciteLiturgy('breakShen');
      S.pendingQuanbing = true;
      if (!S.lu) { logLine('破柱已成，当受天箓——否则入洞天即为邪魔。', 'danger'); openLuPick(); return; }
      S.pendingQuanbing = false;
      if (S.phase === 'play') maybeTransmitNow();   // P0-1
      openQuanbingPick();
      return;
    }
    if (S.pillar <= 2) {
      S.xianghuo = Math.round(S.xianghuo * 0.7);
      S.followers = Math.round(S.followers * 0.8);
      S.templeBroken = true; bump('templeBroken');
      logLine('破柱未成：香火散 30%，庙墙颓其一角。', 'danger');
    } else if (S.pillar <= 5) {
      S.xianghuo = Math.round(S.xianghuo * 0.5);
      S.pos = Math.max(1, S.pos - 1);
      S.templeBroken = true; bump('templeBroken');
      logLine('香火散 50%，塑像碎，退一阶。', 'danger');
    } else {
      if (rng() < 0.5) { die('法相崩解，身化香灰。'); return; }
      S.sui = true; S.karma += 20;
      logLine('遂堕为「祟」。', 'danger');
    }
    S.trib = null;
    S.tribLock = 4;   // 含本次这一旬，玩家实等 3 旬
    logLine('天劫未渡：三旬之内不得再破柱。', 'danger');
    advanceXun(1); maybeEvent(); render();
  };

  function openQuanbingPick() {
    const t = currentQuanbing();
    const scopes = t.scope.split(/[、，]/).filter(Boolean);
    const pool = pickN(scopes.length ? scopes : ['（自拟）'], 3);
    let b = `<div class="small">破柱登阶，${esc(t.temple)}的特点化作权柄。</div>`;
    b += `<ul class="opts">`;
    pool.forEach((p, i) => b += optRow('ABC'[i], p, { name: '机缘', cls: 'chance' }, '本命权柄', false, 'do;qb:' + encodeURIComponent(p)));
    b += `</ul>`;
    openModal('本命权柄 · ' + t.temple, b, true);
  }

  ACT.do_qb = (enc) => {
    S.benmingQuanbing.push(decodeURIComponent(enc));
    logLine(`得本命权柄：${decodeURIComponent(enc)}`, 'good');
    closeModal(); advanceXun(1); render();
  };

  function currentQuanbing() {
    const fx = S.faxiang || 'g1';
    const zj = D.ZHENJUN.find(z => z.id === fx) || D.ZHENJUN[0];
    return zj.temples[S.pillar] || zj.temples[0];
  }

  /* ---------- 显圣 ---------- */
  function xsCost(lv) {
    const base = { small: 50, mid: 200, big: 1000 }[lv] || 50;
    /* 法铃 −20%，照愿法镜 −8%/级，两者叠乘 */
    return Math.round(base * (miaoUpCount('ling') ? 0.8 : 1) * (1 - dArtMirrorCut()));
  }
  ACT.openXiansheng = () => {
    const qb = currentQuanbing();
    let b = `<div class="small">你的权柄来自 <b>${esc(qb.name)}</b>：</div>`;
    b += `<div class="small" style="margin:4px 0">${esc(qb.scope)}</div>`;
    b += divider();
    b += `<ul class="opts">`;
    /* v10.1 第三梯队·问题6：法相生肖的五行与主修五行相性，接进显圣强度。
       原先 FAXIANG.zodiac 只在创角界面显示一个生肖字，不参与任何结算。 */
    const _fxm = (G.WXCS3_EXT && G.WXCS3_EXT.faxiangXianshengMul) ? G.WXCS3_EXT.faxiangXianshengMul() : 1;
    b += '<div class="small muted" style="margin:4px 0">' +
      (G.WXCS3_EXT && G.WXCS3_EXT.faxiangLine ? esc(G.WXCS3_EXT.faxiangLine()) : '') +
      (_fxm !== 1 ? ' · 显圣 ×' + _fxm.toFixed(2) : '') + '</div>';
    b += optRow('A', `小显圣（一村·${xsCost('small')} 香火）`, { name: '平和', cls: 'peace' }, '权柄内必成', S.xianghuo < xsCost('small'), 'do;xs:small');
    b += optRow('B', `中显圣（一镇·${xsCost('mid')} 香火）`, { name: '机缘', cls: 'chance' }, '信众大涨', S.xianghuo < xsCost('mid'), 'do;xs:mid');
    b += optRow('C', `大显圣（一城·${xsCost('big')} 香火）`, { name: '风险', cls: 'risk' }, '灵验或反噬', S.xianghuo < xsCost('big'), 'do;xs:big');
    b += `</ul>`;
    b += `<div class="hint">香火不够就是「神迹不显」——信众会知道你不灵了。</div>`;
    openModal('显圣 · ' + qb.name, b);
  };

  ACT.do_xs = (lv) => {
    closeModal();
    const free = !!(S.preBuff && S.preBuff.freeXiansheng);
    const cost = free ? 0 : xsCost(lv);
    if (S.xianghuo < cost) { toast('香火不足'); return; }
    S.xianghuo -= cost;
    if (free) { S.preBuff.freeXiansheng = false; logLine('祈雨符箓化作青烟，此次显圣不耗香火。', 'good'); }
    advanceXun(1);
    if (S.phase !== 'play') return render();
    let base = { small: 0.75, mid: 0.6, big: 0.42 }[lv] + st('fate') * 0.015;
    if (S.benmingQuanbing.length) base += 0.05;
    if (rng() < clamp(base, 0.15, 0.95)) {
      /* 摄心神杖：显圣所得信众 ×(1+20%/级)，只放大「灵验」那一半的收获 */
      const raw = Math.round({ small: 20 + rnd(80), mid: 120 + rnd(380), big: 600 + rnd(1400) }[lv] * followerScale());
      const gain = Math.round(raw * dArtStaffMul() * fateMul('xs'));   // v9.0 M1：万家香火
      S.followers = Math.min(followLimit(), S.followers + gain);
      S.piety = Math.min(2.0, S.piety + (lv === 'big' ? 0.2 : 0.1));
      logLine(`显圣灵验，信众 +${gain}`, 'good');
      addRenGong(220);
      toast('神迹显');
    } else {
      S.piety = Math.max(0.5, S.piety - 0.2);
      logLine('神迹未显，虔诚 -0.2', 'danger');
      addRenGong(60);
      toast('神迹不显');
    }
    maybeEvent(); render();
  };

  /* ---------- v8.0 神道神器 ---------- */
  function dArtPrice(a) { return Math.round(a.price * Math.pow(1.6, dArtRaw(a.id))); }

  ACT.openDivineArts = () => {
    if (!usesShenLine()) { toast('神器只认香火，仙道用不上'); return; }
    let b = `<div class="small">神器不靠香火养，靠灵石养。断了供奉，它们只是三件旧物——等级还在，加成不在。</div>`;
    b += `<div class="statline"><span class="k">每月维护</span><span class="v"><b>${fmtNum(dArtUpkeep())} 灵石</b></span></div>`;
    if (S.dArtIdle) {
      b += `<div class="small danger">已停供 ${S.dArtIdle} 个月，三件神器全部失效。灵石一补上就恢复。</div>`;
    }
    b += divider() + '<ul class="opts">';
    const keys = ['A', 'B', 'C'];
    D.DIVINE_ARTIFACTS.forEach(function (a, i) {
      const lv = dArtRaw(a.id);
      const maxed = lv >= a.max;
      const price = dArtPrice(a);
      const tag = lv ? { name: lv + ' 级', cls: 'peace' } : { name: '未请', cls: 'warn' };
      const note = maxed ? '已至顶 · 维护 ' + a.upkeep + '/级'
        : price + ' 灵石 · 维护 ' + a.upkeep + '/级';
      b += iconRow('DIVINE_ARTIFACTS', a.id, keys[i], a.name + '　' + a.eff, tag, note,
        maxed || S.stones < price, maxed ? 'act:openDivineArts' : 'do;dart:' + a.id);
    });
    b += '</ul>';
    b += `<div class="hint">维护在每月结算时自动扣除；付不起则当月全部失效，不会掉级。</div>`;
    openModal('神器 · 身上的东西', b);
  };

  ACT.do_dart = (id) => {
    const a = D.DIVINE_ARTIFACTS.find(function (x) { return x.id === id; });
    if (!a) { toast('无此神器'); return; }
    if (dArtRaw(id) >= a.max) { toast('已至顶'); return; }
    const price = dArtPrice(a);
    if (S.stones < price) { toast('灵石不足（需 ' + price + '）'); return; }
    S.stones -= price;
    ledgerAdd('out', '请' + a.name, price);
    if (!S.dArt) S.dArt = {};
    S.dArt[id] = dArtRaw(id) + 1;
    logLine('请回' + a.name + '（' + S.dArt[id] + ' 级）。' + a.desc, 'good');
    toast(a.name + ' · ' + S.dArt[id] + ' 级');
    render();
    ACT.openDivineArts();
  };

  /* ---------- v8.0 愿物 ---------- */
  ACT.openVotive = () => {
    if (!usesShenLine()) { toast('愿物是香客的生意，仙道做不来'); return; }
    const made = S.votMade || 0, sold = S.votSold || 0;
    const cCap = votCraftCap(), sCap = votSellCap();
    let b = `<div class="small">把香火做成香客肯掏钱的东西。比「化香火钱」挣得多，但要先垫灵石、也得有人来买。</div>`;
    b += `<div class="statline"><span class="k">本月制作</span><span class="v"><b>${made}/${cCap} 次</b></span></div>`;
    b += `<div class="statline"><span class="k">本月售出</span><span class="v"><b>${sold}/${sCap} 件</b></span></div>`;
    b += `<div class="statline"><span class="k">仓中存货</span><span class="v">${votStockTotal()} 件</span></div>`;
    b += divider() + `<div class="muted small">开炉制作</div><ul class="opts">`;
    const keys = ['A', 'B', 'C'];
    D.VOTIVE_ITEMS.forEach(function (v, i) {
      const mats = Object.keys(v.mats || {});
      let matOk = true;
      mats.forEach(function (k) { if (votHave(k) < v.mats[k]) matOk = false; });
      const dis = made >= cCap || S.xianghuo < v.xianghuo || S.stones < v.stones || !matOk;
      const matTxt = mats.length ? ' · 耗' + mats.map(function (k) {
        const it = votItem(k); return (it ? it.name : k) + '×' + v.mats[k];
      }).join('、') : '';
      b += iconRow('VOTIVE_ITEMS', v.id, keys[i], v.name + ' ×' + v.out,
        { name: '香火 ' + v.xianghuo, cls: 'warn' },
        v.stones + ' 灵石' + matTxt, dis, 'do;votc:' + v.id);
    });
    b += '</ul>' + divider() + `<div class="muted small">卖给香客</div><ul class="opts">`;
    ['D', 'E', 'F'].forEach(function (k, i) {
      const v = D.VOTIVE_ITEMS[i];
      const have = votHave(v.id);
      const dis = sold >= sCap || have <= 0;
      b += optRow(k, '售 ' + v.name, { name: '存 ' + have, cls: have > 0 ? 'peace' : 'warn' },
        v.price + ' 灵石/件', dis, 'do;vots:' + v.id);
    });
    b += '</ul>';
    b += `<div class="hint">制作与售出次数随信众增长；没人来上香，做出来也只能压仓。清净符水每卖一份另积功德 1。</div>`;
    openModal('愿物 · 香客的生意', b);
  };

  ACT.do_votc = (id) => {
    const v = votItem(id);
    if (!v) { toast('无此愿物'); return; }
    if ((S.votMade || 0) >= votCraftCap()) { toast('本月开炉次数已尽'); return; }
    if (S.xianghuo < v.xianghuo) { toast('香火不足（需 ' + v.xianghuo + '）'); return; }
    if (S.stones < v.stones) { toast('灵石不足（需 ' + v.stones + '）'); return; }
    const mats = Object.keys(v.mats || {});
    for (const k of mats) {
      if (votHave(k) < v.mats[k]) {
        const it = votItem(k);
        toast('缺' + (it ? it.name : k));
        return;
      }
    }
    S.xianghuo -= v.xianghuo;
    S.stones -= v.stones;
    ledgerAdd('out', '愿物本钱·' + v.name, v.stones);
    if (!S.votive) S.votive = {};
    mats.forEach(function (k) { S.votive[k] = votHave(k) - v.mats[k]; });
    S.votive[id] = votHave(id) + v.out;
    S.votMade = (S.votMade || 0) + 1;
    logLine('开炉制成 ' + v.name + ' ×' + v.out + '。', 'good');
    toast(v.name + ' +' + v.out);
    render();
    ACT.openVotive();
  };

  ACT.do_vots = (id) => {
    const v = votItem(id);
    if (!v) { toast('无此愿物'); return; }
    if ((S.votSold || 0) >= votSellCap()) { toast('今日香客已散，来日再至'); return; }
    if (votHave(id) <= 0) { toast('仓里没有' + v.name); return; }
    S.votive[id] = votHave(id) - 1;
    S.stones += v.price;
    ledgerAdd('in', '愿物·' + v.name, v.price);
    S.votSold = (S.votSold || 0) + 1;
    S.fame += 1;
    if (id === 'fuShui') { S.merit += 1; }
    logLine('香客请走' + v.name + '，得灵石 ' + v.price + '。', 'good');
    toast('灵石 +' + v.price);
    render();
    ACT.openVotive();
  };

  /* ---------- 锚（v6.2） ---------- */
  ACT.openAnchor = () => {
    let b = `<div class="small">道胎／八柱起没有寿元。状态不靠时间维持，靠「锚」。</div>`;
    b += `<div class="muted small" style="margin:4px 0">四类锚各三态：固(1)／松(0.5)／断(0)。至少三类在固才算稳。</div>`;
    b += divider();
    const str = anchorStrength();
    b += `<div class="statline"><span class="k">当前强度</span><span class="v"><b>${str.toFixed(1)}/4.0 · ${esc(anchorStatus().name)}</b></span></div>`;
    b += `<div class="small muted" style="margin:4px 0">${esc(anchorStatus().eff)}</div>`;
    b += divider();
    b += `<ul class="opts">`;
    for (const a of D.ANCHOR_TYPES) {
      const v = S.anchors[a.id];
      const tag = v >= D.ANCHOR_STATES.solid.v ? { name: D.ANCHOR_STATES.solid.name, cls: 'peace' }
        : v >= D.ANCHOR_STATES.loose.v ? { name: D.ANCHOR_STATES.loose.name, cls: 'warn' } : { name: D.ANCHOR_STATES.broken.name, cls: 'risk' };
      const what = isXian() ? a.xian : a.shen;
      b += optRow('·', a.name + '：' + what, tag,
        (v >= 1 ? '按期维护' : '修复') + ' · ' + a.fixStones + ' 石', S.stones < a.fixStones, 'do;anchor:' + a.id);
    }
    b += `</ul>`;
    b += `<div class="hint">维护会重置该类锚的周期计时；不必等它松断后再救。</div>`;
    b += `<div class="hint danger">仪式有窗口期：误一期转松，连误三期即断。仪式中被中断，当场断一锚且反噬。</div>`;
    if (needsAnchor()) b += `<div style="margin-top:8px"><button class="btn gold" data-act="do;ritual">举行仪式（续锚）</button></div>`;
    openModal('锚 · 无寿元者的活法', b);
  };

  ACT.do_anchor = (id) => {
    const a = D.ANCHOR_TYPES.find(x => x.id === id);
    if (!a) return;
    const cost = a.fixStones;
    if (S.stones < cost) { toast(`需 ${cost} 灵石（${a.fixCost}）`); return; }
    S.stones -= cost;
    ledgerAdd('out', '维护' + a.name, cost);
    doAnchorMaintain(id);
    logLine(`${S.anchors[id] >= 1 ? '维护' : '补回'}${a.name}，周期重计。`, 'good');
    closeModal(); render();
  };

  ACT.do_ritual = () => {
    const rit = isXian() ? D.RITUALS[0] : D.RITUALS[1];
    let b = `<div class="small">${esc(rit.name)} —— ${esc(rit.period)}，${esc(rit.duration)}</div>`;
    b += `<div class="muted small" style="margin:4px 0">${esc(rit.note)}</div>`;
    b += divider();
    b += `<div class="small danger">法事方行，不可中辍。若中断，立断一锚且遭反噬（气血 −30%、道心 −1）。</div>`;
    b += `<div style="margin-top:10px"><button class="btn" data-act="do;ritualDo">如期举行</button></div>`;
    openModal('仪式 · ' + rit.name, b, true);
  };

  ACT.do_ritualDo = () => {
    closeModal();
    advanceXun(1);
    if (S.phase !== 'play') return render();
    // 有概率被打断
    if (rng() < 0.12) {
      S.anchors.ren = Math.min(S.anchors.ren, 0.5);
      S.hp = Math.round(S.hp * 0.7);
      S.stats.heart = Math.max(1, S.stats.heart - 1);
      logLine('法事为外人所扰，立断一锚，气血 −30%，道心 −1。', 'danger');
      toast('法事中辍');
    } else {
      doAnchorMaintain('yi');
      logLine(`${isXian() ? '续灯仪' : '岁时大醮'}如期举行，仪锚复固，周期重计。`, 'good');
      toast('法事告成');
    }
    render();
  };

  /* ---------- 功法 ---------- */
  ACT.openGongfa = () => {
    const g = getDaogong();
    const cap = D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang;
    let b = '<div class="small">修炼功法管「能修多远」，术法与神通管「能打多狠」。三者分开养。</div>';
    b += divider();
    b += '<div class="slotline"><span class="sk">道基</span><span class="sv">' + esc(g.name) + '</span>' +
      '<span class="tier" style="background:' + D.GONGFA_TIERS[g.tier].color + '">' +
      esc(D.GONGFA_TIERS[g.tier].name) + ' ×' + D.GONGFA_TIERS[g.tier].mul + '</span></div>';
    b += '<div class="slotnote">' + esc(g.eff) + '　｜　境界上限 ' + esc(cap.to) + '</div>';
    /* v10.4 P2·12：熟练度 —— 练的是这本功法的哪一面，面板上要看得见 */
    const _pf = (G.WXCS3_EXT && G.WXCS3_EXT.gfProfFocus) ? G.WXCS3_EXT.gfProfFocus() : '';
    const _pv = gfProfOf(g.id), _ps = gfProfStep(g.id);
    const _nxt = GF_PROF_STEPS[_ps + 1];
    b += '<div class="slotnote">熟练 <b>' + esc(gfProfName(g.id)) + '</b>　' + _pv +
      (_nxt ? ' / ' + _nxt : '（已至化境）') +
      (_pf ? '　｜　所长：' + esc(_pf) : '') +
      (_ps > 0 ? '　｜　该长已 ×' + GF_PROF_MUL[_ps].toFixed(2) : '') + '</div>';
    /* v10.1 第二梯队·问题2：把 effect 翻译成人话显示，
       让「文案承诺」与「实际结算」能当面对上，玩家可自行核对。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.gongfaEffectText) {
      const _et = G.WXCS3_EXT.gongfaEffectText(g.id);
      if (_et) b += '<div class="hint"><b>实际结算</b>：' + esc(_et) + '</div>';
      else b += '<div class="hint muted">这本功法只有品阶与五行，没有额外承诺。</div>';
    }
    /* v8.1 P0 第6项：悟性够了才看得出这门功法自身的毛病 */
    const _gc = clue('insight');
    if (_gc) b += '<div class="hint">' + esc(_gc) + '</div>';
    b += divider();
    b += '<div class="small muted">换道基功法会重算境界上限。修至上限之上则被卡住——此非舛误，乃其制如此。</div>';
    b += '<div class="selgrid" style="margin-top:6px">';
    for (const x of D.GONGFA) {
      if (x.role === 'fa') continue;          // 术法不进道基候选
      if (!S.ownedGongfa || !S.ownedGongfa.includes(x.id)) continue;
      const on = getDaogong().id === x.id;
      const c2 = D.DAOGONG_CAP[x.tier] || D.DAOGONG_CAP.huang;
      /* 列表里就标出「这本有没有真东西」，换功法前一眼可辨 */
      const _xet = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaEffectText) ? G.WXCS3_EXT.gongfaEffectText(x.id) : '';
      b += '<span class="chip ' + (on ? 'on' : '') + '" data-act="do;setgf:' + x.id + '" style="justify-content:flex-start">' +
        '<b>' + esc(x.name) + '</b><span class="muted" style="font-weight:400">· ' +
        esc(D.GONGFA_TIERS[x.tier].name) + ' · 至' + esc(c2.to) +
        (gfProfStep(x.id) > 0 ? ' · <span class="good">' + esc(GF_PROF_NAME[gfProfStep(x.id)]) + '</span>' : '') +
        (_xet ? ' · ' + esc(_xet) : '') + '</span></span>';
    }
    b += '</div>';
    b += divider();
    b += '<div style="margin-top:4px"><button class="btn ghost" data-act="act:openSkillBook">术法 · 装配（' +
      equippedSkills().length + '/' + equipLimit() + '）</button></div>';
    openModal('修炼功法（道基）', b);
  };

  ACT.do_setgf = (id) => {
    const g = gongfaById(id);
    if (!g) return;
    if (g.role === 'fa') { toast('这是术法，不能作道基'); return; }
    if (!S.ownedGongfa || !S.ownedGongfa.includes(id)) { toast('未拥有此功法'); return; }
    const oldCap = (D.DAOGONG_CAP[getDaogong().tier] || D.DAOGONG_CAP.huang).cap;
    const newCap = (D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang).cap;
    if (S.gongfa[0] !== id) bump('gfChanged');   // 「一炁」要求从未换过功法
    S.gongfa[0] = id;
    S.daogong = id;
    const gname = g.name;
    logLine('改修《' + gname + '》为道基（修炼功法）。', '');
    if (newCap < S.xRealm) {
      // 换低阶功法会把自己卡在当下——这是代价，得说清楚
      logLine('此功法只供得起' + (D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang).to +
        '，你已在更远处——路被这篇法诀重新钉死了。', 'danger');
      toast('境界上限降至 ' + (D.DAOGONG_CAP[g.tier] || D.DAOGONG_CAP.huang).to);
    }
    S.topGongfaTier = ['huang', 'xuan', 'di', 'tian', 'xian'].indexOf(g.tier);
    /* v10.4 P0·3.1：换功法就是换气海与寿元。若不在这里对齐，
       吞海功要等到下个月月初才生效——玩家会以为「装了没用」。 */
    syncMpCap();
    syncLifeBonus();
    /* 改换道基不是翻页——要重新坐过。占一旬。 */
    advanceXun(1); if (S.phase !== 'play') return render();
    closeModal(); render();
  };

  /* ---------- 洞府 ---------- */
  ACT.openCave = () => {
    let b = `<div class="statline"><span class="k">灵气</span><span class="v">${esc(D.LINGQI[S.lingqi].name)}（×${D.LINGQI[S.lingqi].v}）</span></div>`;
    b += divider();
    // 四艺设施：有就加成功率
    if (hasXianLine()) {
      const facs = (S.cave && S.cave.facilities) || {};
      b += '<div class="small muted">作坊</div><ul class="opts">';
      D.CRAFT_ARTS.forEach(function (a) {
        const has2 = !!facs[a.id];
        b += optRowX('·', a.name + (has2 ? '（已设）' : '（未设）'), { name: '设施', cls: 'peace' },
          has2 ? '制作成功率 +5%' : '制作成功率 +5%',
          has2 || S.stones < 800, 'do;buildfac:' + a.id,
          has2 ? null : { xun: 1, stones: 800 });
      });
      b += '</ul>';
      // 阵盘
      if ((S.disks || []).length) {
        b += '<div class="small muted" style="margin-top:6px">已布阵盘</div>';
        b += (S.disks || []).map(function (d) {
          const dk = D.ARRAY_DISKS.find(function (x) { return x.id === d.id; });
          return '<div class="sl"><span class="k">' + esc(d.name) + '</span><span class="v">' +
            esc(dk ? dk.eff : '') + '　维持 ' + (dk ? dk.upkeep : 0) + '/月</span></div>';
        }).join('');
      }
      b += divider();
      /* v8.1 P0 M2：淬体走洞府，不占指令坞位（M5 分组之后坞位更金贵） */
      const qn = quenchNext();
      b += '<div class="small muted">每月维护 ' + fmtNum(caveUpkeep()) + ' 灵石（灵脉 ×' +
        ((D.LINGQI[S.lingqi] || D.LINGQI[0]).v || 1) + ' ＋ 每间作坊 20）</div>';
      b += '<div class="small muted">淬体 · 皮肉筋骨</div>';
      b += '<div class="statline"><span class="k">淬体阶</span><span class="v">' +
        (quenchLv() ? (esc(D.QUENCH[quenchLv() - 1].name) + '（' + quenchLv() + '/' + D.QUENCH.length + '）') : '未淬') +
        '　气血 ×' + quenchHpMul().toFixed(2) + '　卸力 +' + Math.round(quenchBlock() * 100) + '%</span></div>';
      if (qn) {
        const _hn = (D.MATERIAL_EXT.find(function (x) { return x.id === qn.herbId; }) || {}).name || qn.herbId;
        const _mine = (S.bagMat && S.bagMat[qn.herbId]) || 0;
        b += '<div class="small">下一阶 · ' + esc(qn.def.name) + '：' + fmtNum(qn.stones) + ' 灵石 + ' + _hn + ' ' + qn.herbN +
          ' 株（存 ' + _mine + '）　气血 ×' + qn.def.hpMul.toFixed(2) +
          (bodyDef().quenchMul ? '<span class="muted">　凡体三倍</span>' : '') + '</div>';
        b += '<ul class="opts">' + optRowX('·', '按方淬体',
          { name: '淬体', cls: 'peace' }, '气血 ×' + qn.def.hpMul.toFixed(2),
          S.stones < qn.stones || _mine < qn.herbN, 'do;quench',
          { xun: 1, stones: qn.stones, herb: _hn + ' ' + qn.herbN + ' 株（存 ' + _mine + '）' }) + '</ul>';
      } else {
        b += '<div class="small muted">已至不漏，再无可淬。</div>';
      }
      b += divider();
      /* v8.1 P0 M4：兽栏。挂在洞府，因为「养得起」本身就是洞府投资的一部分。 */
      const barn = barnList();
      b += '<div class="small muted">兽栏 · ' + barn.length + '/' + barnCap() +
        '（上限随灵脉档：' + esc((D.LINGQI[S.lingqi] || D.LINGQI[0]).name) + '）</div>';
      if (barn.length) {
        barn.forEach(function (bt, i) {
          const tier = beastBondTier(bt.bond || 0);
          const pack = D.BEAST_STOCK.find(function (x) { return x.id === bt.id; }) || {};
          b += '<div class="sl"><span class="k">' + esc(bt.name) + '</span><span class="v">' +
            esc(tier.name) + '（' + Math.round(bt.bond || 0) + '）· 妖力 ×' +
            beastPowerMul().toFixed(2) + ' · ' + esc(pack.el ? (D.ELEMENTS[pack.el] || {}).name || '' : '') +
            '</span></div>';
        });
        b += '<ul class="opts">';
        b += optRowX('·', '喂养一次', { name: '亲密', cls: 'peace' },
          '亲密 +' + D.BEAST_CARE.feedBond,
          S.stones < D.BEAST_CARE.feedStone, 'do;beastfeed',
          { xun: 0, stones: D.BEAST_CARE.feedStone });
        b += optRowX('·', '调教一次', { name: '妖力', cls: 'risk' },
          '妖力 +' + Math.round(D.BEAST_CARE.trainPower * 100) + '% · 亲密 ' + D.BEAST_CARE.trainBond,
          false, 'do;beasttrain', { xun: 1 });
        b += '</ul>';
        b += '<div class="hint">' + esc(beastBondTier(S.beastBond || 0).note) +
          '　亲密高才护主，太生分它会咬你。</div>';
      } else {
        b += '<div class="small muted">兽栏空着。负伤的妖物认了你，才会自己走进来。</div>';
      }
      b += divider();
    }
    const up = Math.max(parseInt(S.lingqiUp, 10) || 0, placeBaseLingqi(S.place));
    const cost = (up + 1) * 800;
    if (up < D.LINGQI.length - 1) {
      b += `<div class="small">提升灵气 → ${D.LINGQI[up+1].name}（${cost} 灵石）</div>`;
      b += `<div style="margin-top:6px"><button class="btn gold" data-act="do;upqi">寻龙脉升阶</button></div>`;
    } else b += `<div class="small muted">灵气已至洞天，再无可升。</div>`;
    b += `<div class="hint">夺灵脉是仙道最常见的战争：一条福地灵脉，够养活一个小宗门。</div>`;
    openModal('洞府 · 灵脉', b);
  };

  /* v8.1 P0 M2：淬体。每旬一次（advanceXun(1) 即耗掉当旬行动），
     气血按增量倍率写入上限，同时等比抬当前气血，伤势比值不动。 */
  ACT.do_quench = () => {
    const q = quenchNext();
    if (!q) { toast('淬体已至不漏'); return; }
    if (S.stones < q.stones) { toast('灵石不足（需 ' + q.stones + '）'); return; }
    if (((S.bagMat || {})[q.herbId] || 0) < q.herbN) { toast('药材不足（需 ' + q.herbN + ' 株）'); return; }
    S.stones -= q.stones;
    S.bagMat[q.herbId] = (S.bagMat[q.herbId] || 0) - q.herbN;
    ledgerAdd('out', '淬体 · ' + q.def.name, q.stones);
    S.quench = q.lv;
    S.quenchApplied = q.lv;
    recalcCaps(true);   // v10.5：乘区交给 recalcCaps，不再直接乘缓存
    logLine('淬体：' + q.def.name + '。气血上限 ' + fmtNum(S.hpMax) + '，卸力 ' + Math.round(quenchBlock() * 100) + '%。', 'good');
    toast('淬体 · ' + q.def.name);
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_buildfac = (art) => {
    if (!D.CRAFT_ARTS.some(function (a) { return a.id === art; })) return;
    if (!S.cave) S.cave = { facilities: {} };
    if (!S.cave.facilities) S.cave.facilities = {};
    if (S.cave.facilities[art]) { toast('已设此作坊'); return; }
    if (S.stones < 800) { toast('灵石不足'); return; }
    S.stones -= 800;
    S.cave.facilities[art] = 1;
    ledgerAdd('out', '兴建' + artName(art) + '作坊', 800);
    logLine('洞府里多了一间' + artName(art) + '作坊。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  /* v8.1 P0 M4：御兽两条养成动作。
     喂养不占旬（是顺手的事），调教占一旬（是正经事）——口径与 check_time.py 一致。 */
  ACT.do_beastfeed = () => {
    const r = beastFeed();
    if (!r.ok) { toast(r.why); return; }
    logLine('你把灵石搁在槽边，它低头吃了。', 'good');
    closeModal(); render();
  };

  ACT.do_beasttrain = () => {
    const r = beastTrain();
    if (!r.ok) { toast(r.why); return; }
    logLine('你逼它扑了三回。它扑了，回窝时没看你。', '');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_upqi = () => {
    const up = Math.max(parseInt(S.lingqiUp, 10) || 0, placeBaseLingqi(S.place));
    const cost = (up + 1) * 800;
    if (up >= D.LINGQI.length - 1) { toast('灵气已至洞天'); return; }
    if (!spendStones(cost, '灵脉升档')) { toast('灵石不足'); return; }
    S.lingqiUp = up + 1;
    syncLingqi();
    logLine(`灵脉升至${D.LINGQI[S.lingqi].name}。`, 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  /* ---------- 庙宇（神道） ---------- */
  ACT.openTemple = () => {
    if (!hasShenLine()) { toast('唯有神道有庙'); return; }
    let b = `<div class="statline"><span class="k">神庙</span><span class="v">${esc(S.miaoHao || '野庙')}　${esc(S.miao)}</span></div>`;
    b += `<div class="statline"><span class="k">托付守庙</span><span class="v">${S.trustee ? '<span class="good">有人守着</span>' : '<span class="danger">无人（坐庙 -3%/月）</span>'}</span></div>`;
    if (S.templeBroken) b += `<div class="small danger">庙宇破损：香火系数 ×0.6</div>`;
    b += `<div class="small muted">修缮 ${fmtNum(templeUpkeep())} 灵石／月（按庙阶计）</div>`;
    b += divider();
    b += `<ul class="opts">`;
    b += optRow('A', S.trustee ? '托付已有人守着' : '托付他人守庙', { name: '平和', cls: 'peace' }, '流失降到 -0.3%', S.trustee, 'do;trustee');
    if (S.templeBroken) b += optRow('B', '修补庙宇（300 香火）', { name: '平和', cls: 'peace' }, '', S.xianghuo < 300, 'do;repair');
    b += `</ul>`;
    b += divider();
    b += `<div class="small muted">庙市不做仙家的生意：香烛、庙产、香客寄卖，都只收灵石。香火能当钱花，但要经「化香火钱」。</div>`;
    b += `<div class="selgrid" style="margin-top:6px">`;
    b += `<span class="chip" data-act="act:openMiaoMarket">开庙市</span>`;
    b += `<span class="chip" data-act="act:openExchange">化香火钱</span>`;
    b += `</div>`;
    openModal('庙宇', b);
  };

  ACT.do_trustee = () => {
    if (S.trustee) return;
    const met = Object.keys(S.npcs).filter(id => S.npcs[id].met && S.npcs[id].fav >= 40);
    if (!met.length) { toast('需一位好感≥40的人替你守庙'); return; }
    S.trustee = true;
    S.anchors.ren = 1;
    logLine(`${D.NPC_POOL.find(x=>x.id===met[0]).name} 答应替你守庙。`, 'good');
    closeModal(); render();
  };

  ACT.do_repair = () => {
    if (S.xianghuo < 300) { toast('香火不足'); return; }
    S.xianghuo -= 300; S.templeBroken = false;
    logLine('塑像重修，庙墙补齐。', 'good');
    advanceXun(1); if (S.phase !== 'play') return render();
    closeModal(); render();
  };

  /* ============================================================
     庙市（神道专用）
     ------------------------------------------------------------
     与仙道坊市是两套账：
       香供：灵石 → 香火（只补到本柱八成）
       庙产：灵石 → 庙宇产业（香炉、金身、功德箱、法铃、地契）
       寄卖：仙家丹药符箓经香客代卖，抽三成
     仙道没有香火，也不进这道门。
     ============================================================ */
  function miaoSellPrice(base) { return Math.max(1, Math.round(base * 0.7)); }

  ACT.openMiaoMarket = (cat) => {
    if (!usesShenLine()) { toast('庙市只做神道的生意'); return; }
    cat = cat || 'xiang';
    const capLeft = Math.max(0, xiangOutCap() - (S.xiangExchangeMonth || 0));
    let b = '<div class="row"><span class="lab">香火</span><b style="color:var(--cul)">' +
      fmtNum(Math.round(S.xianghuo)) + ' / ' + fmtNum(pillar().need) + '</b></div>';
    b += '<div class="row"><span class="lab">灵石</span><b style="color:var(--stone)">' + fmtNum(S.stones) + '</b></div>';
    b += '<div class="small muted" style="margin-top:3px">香火钱箱：本月尚可化 ' + capLeft + ' 石　官价 1 石 = ' + D.EXCHANGE.xiangPerStone + ' 香火</div>';
    b += '<div class="shop-tabs">';
    [['xiang', '香供'], ['pill', '丹药'], ['chan', '庙产'], ['sell', '寄卖']].forEach(function (t) {
      b += '<span class="shop-tab ' + (cat === t[0] ? 'on' : '') + '" data-act="do;miaocat:' + t[0] + '">' + t[1] + '</span>';
    });
    b += '</div>' + divider();
    b += '<ul class="opts">';

    if (cat === 'xiang') {
      const cap = xiangBuyCap();
      const room = Math.max(0, cap - S.xianghuo);
      b += '<div class="small muted" style="margin-bottom:4px">买来的香只补到本柱八成（' + fmtNum(cap) +
        '）——余下两成须得真信众来烧。</div>';
      D.XIANG_GONG.forEach(function (it) {
        const gain = Math.min(it.xiang, room);
        const cost = gain >= it.xiang ? it.price : Math.max(1, Math.ceil(it.price * gain / it.xiang));
        const note = room <= 0 ? '香火已至八成，买不进了'
          : gain < it.xiang
            ? fmtNum(it.xiang) + ' 香火 · ' + it.price + ' 石（只装 ' + fmtNum(gain) + '）'
            : fmtNum(it.xiang) + ' 香火 · ' + it.price + ' 石';
        b += shopRow(it.name, note, it.desc, room <= 0 || S.stones < cost, 'do;buyxiang:' + it.id);
      });
    } else if (cat === 'pill') {
      b += '<div class="small muted" style="margin-bottom:4px">神道不开坊市。要丹药，托香客去城里代购——加价两成。</div>';
      D.PILL_EXT.filter(function (p) { return p.type !== 'xiang'; }).forEach(function (p) {
        const price = Math.ceil(p.price * 1.2);
        b += shopRow(p.name, fmtNum(price) + ' 石（坊市 ' + fmtNum(p.price) + '）', p.desc || '',
          S.stones < price, 'do;miaobuy:' + p.id);
      });
    } else if (cat === 'chan') {
      D.MIAO_UP.forEach(function (it) {
        const own = miaoUpCount(it.id);
        b += shopRow(it.name, it.eff + ' · 已 ' + own + '/' + it.max + ' · ' + fmtNum(it.price) + ' 石',
          it.desc, own >= it.max || S.stones < it.price, 'do;miaochan:' + it.id);
      });
    } else {
      const pills = Object.keys(S.bag || {}).filter(function (k) {
        return (S.bag[k] || 0) > 0 && D.PILL_EXT.some(function (p) { return p.id === k; });
      });
      if (!pills.length) b += '<div class="small muted">无丹可寄。</div>';
      pills.forEach(function (k) {
        const p = D.PILL_EXT.find(function (x) { return x.id === k; });
        b += shopRow(p.name, '×' + S.bag[k] + ' · ' + fmtNum(miaoSellPrice(p.price)) + ' 石/枚',
          '香客抽三成', false, 'do;miaosell:pill:' + k);
      });
      const tals = Object.keys(S.talismans || {}).filter(function (k) { return (S.talismans[k] || 0) > 0; });
      tals.forEach(function (k) {
        const t = D.TALISMANS.find(function (x) { return x.id === k; });
        if (!t) return;
        b += shopRow(t.name, '×' + S.talismans[k] + ' · ' + fmtNum(miaoSellPrice(t.price)) + ' 石/张',
          '香客抽三成', false, 'do;miaosell:tal:' + k);
      });
      b += '<div class="hint">香客替你出货，抽三成——比仙道坊市贱，但神道也只走得通这条门路。</div>';
    }
    b += '</ul>';
    b += '<div class="hint">庙市只收灵石。香火要花成灵石，去「化香火钱」。</div>';
    openModal('庙市 · 灵石 ' + fmtNum(S.stones), b);
  };

  ACT.do_miaocat = (c) => { closeModal(); ACT.openMiaoMarket(c); };

  ACT.do_miaobuy = (id) => {
    const p = D.PILL_EXT.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!usesShenLine()) { toast('庙市只做神道的生意'); return; }
    const price = Math.ceil(p.price * 1.2);
    if (S.stones < price) { toast('灵石不足'); return; }
    S.stones -= price;
    S.bag[id] = (S.bag[id] || 0) + 1;
    ledgerAdd('out', '香客代购 ' + p.name, price);
    logLine('托香客代购' + p.name + '，耗灵石 ' + price + '。', 'good');
    toast('购得 ' + p.name);
    closeModal(); ACT.openMiaoMarket('pill'); render();
  };

  ACT.do_buyxiang = (id) => {
    const it = D.XIANG_GONG.find(function (x) { return x.id === id; });
    if (!it) return;
    if (!usesShenLine()) { toast('此物唯神道受用'); return; }
    const room = Math.max(0, xiangBuyCap() - S.xianghuo);
    if (room <= 0) { toast('香火已至本柱八成，买不进了'); return; }
    const gain = Math.min(it.xiang, room);
    const cost = gain >= it.xiang ? it.price : Math.max(1, Math.ceil(it.price * gain / it.xiang));
    if (S.stones < cost) { toast('灵石不足'); return; }
    S.stones -= cost;
    S.xianghuo = Math.min(maxXianghuo(), S.xianghuo + gain);
    ledgerAdd('out', '香烛', cost);
    logLine('庙市买香，耗灵石 ' + cost + '，香火 +' + Math.round(gain) + '。', 'good');
    toast('香火 +' + Math.round(gain));
    closeModal(); ACT.openMiaoMarket('xiang'); render();
  };

  ACT.do_miaochan = (id) => {
    const it = D.MIAO_UP.find(function (x) { return x.id === id; });
    if (!it) return;
    if (!usesShenLine()) { toast('神道之物'); return; }
    const own = miaoUpCount(id);
    if (own >= it.max) { toast('已到顶'); return; }
    if (S.stones < it.price) { toast('灵石不足'); return; }
    S.stones -= it.price;
    S.miaoUp = S.miaoUp || {};
    S.miaoUp[id] = own + 1;
    if (id === 'xiang') S.piety = Math.min(2.0, Math.round((S.piety + 0.1) * 100) / 100);
    ledgerAdd('out', it.name, it.price);
    logLine('庙市置办「' + it.name + '」，' + it.eff + '。', 'good');
    toast('已置 ' + it.name);
    closeModal(); ACT.openMiaoMarket('chan'); render();
  };

  ACT.do_miaosell = (kind, id) => {
    let name = '', price = 0;
    if (kind === 'pill') {
      const p = D.PILL_EXT.find(function (x) { return x.id === id; });
      if (!p || (S.bag[id] || 0) < 1) { toast('没有'); return; }
      S.bag[id]--; name = p.name; price = miaoSellPrice(p.price);
    } else {
      const t = D.TALISMANS.find(function (x) { return x.id === id; });
      if (!t || (S.talismans[id] || 0) < 1) { toast('没有'); return; }
      S.talismans[id]--; name = t.name; price = miaoSellPrice(t.price);
    }
    S.stones += price;
    ledgerAdd('in', '香客代卖 ' + name, price);
    logLine(name + '经香客出手，得灵石 ' + price + '。', 'good');
    closeModal(); ACT.openMiaoMarket('sell'); render();
  };

  /* ---------- 化香火钱：香火 → 灵石 ---------- */
  ACT.openExchange = () => {
    if (!usesShenLine()) { toast('唯神道可化香火钱'); return; }
    const x = D.EXCHANGE;
    const capLeft = Math.max(0, xiangOutCap() - (S.xiangExchangeMonth || 0));
    const afford = Math.floor(S.xianghuo / x.outPerStone);
    const max = Math.min(capLeft, afford);
    let b = '<div class="row"><span class="lab">香火</span><b style="color:var(--cul)">' +
      fmtNum(Math.round(S.xianghuo)) + '</b></div>';
    b += '<div class="row"><span class="lab">灵石</span><b style="color:var(--stone)">' + fmtNum(S.stones) + '</b></div>';
    b += '<div class="small muted" style="margin:6px 0">官价 1 石 = ' + x.xiangPerStone +
      ' 香火。化出要经庙工与香烛，实付 <b>' + x.outPerStone + ' 香火 = 1 石</b>。</div>';
    b += '<div class="small muted">香火钱箱：本月尚可化 <b>' + capLeft + '</b> 石；以你现有香火，最多化 <b>' + max + '</b> 石。</div>';
    b += '<div class="small danger" style="margin-top:4px">化出去的是修为——香火少了，本柱就更远一步。</div>' + divider();
    b += '<ul class="opts">';
    b += optRow('A', '化 1 石', { name: '灵石', cls: 'peace' }, x.outPerStone + ' 香火', max < 1, 'do;exch:1');
    b += optRow('B', '化 10 石', { name: '灵石', cls: 'peace' }, (x.outPerStone * 10) + ' 香火', max < 10, 'do;exch:10');
    b += optRow('C', '尽数化出（' + max + ' 石）', { name: '灵石', cls: 'chance' }, (x.outPerStone * max) + ' 香火', max < 1, 'do;exch:max');
    b += '</ul>';
    b += '<div class="hint">功德箱越多，每月化得越多；信众越多，箱也越大。</div>';
    openModal('化香火钱', b);
  };

  ACT.do_exch = (n) => {
    if (!usesShenLine()) return;
    const x = D.EXCHANGE;
    const capLeft = Math.max(0, xiangOutCap() - (S.xiangExchangeMonth || 0));
    const afford = Math.floor(S.xianghuo / x.outPerStone);
    let want = n === 'max' ? afford : (parseInt(n, 10) || 0);
    want = Math.min(want, capLeft, afford);
    if (want < 1) { toast('化不出——香火不足，或钱箱已满'); return; }
    const cost = want * x.outPerStone;
    S.xianghuo -= cost;
    S.stones += want;
    S.xiangExchangeMonth = (S.xiangExchangeMonth || 0) + want;
    ledgerAdd('in', '化香火钱', want);
    logLine('化香火钱 ' + want + ' 石，香火散 ' + cost + '。殿里的灯暗了一寸。', 'good');
    toast('灵石 +' + want);
    closeModal(); render();
  };

  /* ---------- 坊市（仙道专用） ---------- */
  /* v10.2：商品一多，价格排序与按名检索比来回翻列表快 */
  let _shopSort = 'def', _shopQ = '', _shopLastCat = 'pill';
  /* v10.5 P0·E5：坊市开着时不要把「所得」面板顶上来 */
  let _shopOpen = false;
  function shopNameHit(name) {
    const q = (_shopQ || '').trim();
    return !q || String(name).indexOf(q) >= 0;
  }
  function shopListInner(cat) {
    let b = '';
    if (cat === 'fa') {
      /* v10.5 P1·A4：术法单独成页。只卖外门/内门两档 SKILLS，
         与藏经阁的「贡献换」形成灵石/贡献双轨；真传术法不上市。 */
      const list = D.SKILLS.filter(function (s) {
        return s.id !== 'zhiquan' && (s.lvl === 'wai' || s.lvl === 'nei') && shopNameHit(s.name);
      });
      list.sort(function (a, b2) {
        const pa = D.SKILL_PRICE[a.lvl], pb = D.SKILL_PRICE[b2.lvl];
        if (_shopSort === 'asc') return pa - pb;
        if (_shopSort === 'desc') return pb - pa;
        return 0;
      });
      /* role=fa 的功法也归术法：它们与 SKILLS 同属「买来装配」的一侧，
         不回到修炼功法页，否则三分在货架上又混了。 */
      const faG = D.SHOP_GONGFA.filter(function (g) { return g.role === 'fa' && shopNameHit(g.name); });
      if (!list.length && !faG.length) return '<div class="hint">没有匹配的术法。</div>';
      list.forEach(function (s) {
        const price = Math.round(D.SKILL_PRICE[s.lvl] * 1.2);
        const owned = knownSkills().some(function (k) { return k.id === s.id; });
        b += iconRow('SKILLS', s.id, '·', s.name,
          { name: '术法', cls: 'peace' },
          owned ? '已习得' : fmtNum(price) + ' 石', owned || S.stones < price, 'do;buyfa:' + s.id);
      });
      faG.forEach(function (g) {
        const owned = hasArt('fa:' + g.id);
        b += iconRow('GONGFA_EXT', g.id, '·', g.name + '（' + D.GONGFA_TIERS[g.tier].name + '）',
          { name: '功法术法', cls: 'peace' },
          owned ? '已习得' : fmtNum(g.price) + ' 石', owned || S.stones < g.price, 'do;buyg:' + g.id);
      });
    } else if (cat === 'gongfa') {
      /* v10.5 P1·A4：修炼功法页只列 dao；role=fa 的功法改列「术法」页 */
      const list = D.SHOP_GONGFA.filter(function (g) { return g.role !== 'fa' && shopNameHit(g.name); });
      list.sort(function (a, b2) {
        if (_shopSort === 'asc') return a.price - b2.price;
        if (_shopSort === 'desc') return b2.price - a.price;
        return 0;
      });
      if (!list.length) return '<div class="hint">没有匹配的功法。</div>';
      list.forEach(function (g) {
        /* v10.5 P0·A2：术法（role=fa）不卖作道基，买回去进术法池 */
        const isFa = g.role === 'fa';
        const owned = isFa ? hasArt('fa:' + g.id) : (S.ownedGongfa || []).includes(g.id);
        const tagName = isFa ? '术法' : D.GONGFA_TIERS[g.tier].name;
        b += iconRow('GONGFA_EXT', g.id, '·', g.name + '（' + D.GONGFA_TIERS[g.tier].name + '）',
          { name: tagName, cls: 'peace' },
          owned ? '已习得' : fmtNum(g.price) + ' 石', owned || S.stones < g.price, 'do;buyg:' + g.id);
      });
    } else {
      const list = D.SHOP.filter(function (x) {
        if (x.cat !== cat || !shopNameHit(x.name)) return false;
        if (x.cat === 'pill' && x.type === 'xiang' && !usesShenLine()) return false;
        return true;
      });
      list.sort(function (a, b2) {
        if (_shopSort === 'asc') return a.price - b2.price;
        if (_shopSort === 'desc') return b2.price - a.price;
        return 0;
      });
      if (!list.length) return '<div class="hint">没有匹配的物品。</div>';
      list.forEach(function (it) {
        /* v10.5 P1·E8：买入价随行情波动；显示价与扣款同源 */
        const price = buyPriceOf(it);
        let note = fmtNum(price) + ' 石';
        if (it.tier) note = D.GONGFA_TIERS[it.tier].name + ' · ' + note;
        let owned = false;
        let tag = it.cat === 'art' ? '法器' : it.cat === 'mat' ? '材料' : '丹药';
        if (it.type === 'land') {
          tag = '灵脉契';
          owned = (parseInt(S.lingqiUp, 10) || 0) >= D.LINGQI.length - 1;
          if (owned) note = '已至洞天';
        } else if (it.cat === 'art') {
          /* v10.5 P0·E6：购买入口唯一；制作/掉落仍可多件，不限制已有库存 */
          owned = (S.arts || []).indexOf(it.id) >= 0;
          if (owned) note = '已拥有';
        }
        b += iconRow(shopIconTable(it.cat), it.id, '·', it.name + '　' + (it.desc || it.eff || ''),
          { name: tag, cls: 'peace' },
          note, owned || S.stones < price, 'do;buy:' + it.id);
      });
    }
    return b;
  }
  /* v10.5 P0·E1：所有灵石支出只走这一处——余额校验、扣款、记账、空囊成就。
     此前坊市买入从不写账本，月账净入虚高；各购买分支各写一遍也迟早会漏。 */
  function spendStones(n, label) {
    n = Math.round(n || 0);
    if (!(n > 0)) return true;
    if ((S.stones || 0) < n) return false;
    S.stones -= n;
    if (S.stones === 0) bump('buyAtZero');
    ledgerAdd('out', label, n);
    return true;
  }
  /* v10.5 P0·E5：买完只换列表与余额，不重建弹窗——
     搜索框焦点、滚动位置、已输的检索词都留住。失败也不关窗。 */
  function refreshShop(cat) {
    const ul = document.getElementById('shop-list');
    if (ul) ul.innerHTML = shopListInner(cat || _shopLastCat || 'pill');
    const stone = document.getElementById('shop-stone');
    if (stone) stone.textContent = fmtNum(S.stones);
    const title = document.getElementById('modal-title');
    if (title) title.textContent = '坊市 · 灵石 ' + fmtNum(S.stones);
  }
  ACT.openShop = (cat) => {
    // 两套系统各走各的门：神道进的是庙市，仙道才进坊市
    if (isShen() && !isBoth()) { toast('神道只走庙市'); ACT.openMiaoMarket(); return; }
    cat = cat || 'pill';
    if (cat === 'sell') { ACT.openSell(); return; }
    _shopLastCat = cat;
    const tabs = [['pill', '丹药'], ['gongfa', '修炼功法'], ['fa', '术法'], ['art', '法器'], ['mat', '材料'], ['sell', '卖出']];
    let b = '<div class="row"><span class="lab">灵石</span><b id="shop-stone" style="color:var(--stone)">' + fmtNum(S.stones) + '</b></div>';
    b += '<div class="shop-tabs">';
    for (const t of tabs) {
      b += '<span class="shop-tab ' + (cat === t[0] ? 'on' : '') + '" data-act="do;shopcat:' + t[0] + '">' + t[1] + '</span>';
    }
    b += '</div>';
    b += '<div class="shop-tools"><input id="shop-q" class="shop-q" type="text" placeholder="搜名字…" value="' +
      esc(_shopQ) + '" aria-label="搜索商品">' +
      [['def', '默认'], ['asc', '价↑'], ['desc', '价↓']].map(function (s) {
        return '<span class="shop-chip' + (_shopSort === s[0] ? ' on' : '') +
          '" data-act="do;shopsort:' + s[0] + '">' + s[1] + '</span>';
      }).join('') + '</div>';
    b += '<ul class="opts" id="shop-list">' + shopListInner(cat) + '</ul>';
    b += '<div class="hint">坊市只售黄、玄两阶。地阶以上不上市——那要靠「传法机缘」自己撞。</div>';
    b += '<div class="hint">坊市只认灵石，不认香火。香火是庙里的东西。</div>';
    openModal('坊市 · 灵石 ' + fmtNum(S.stones), b);
    _shopOpen = true;
    /* 边输边筛：只换列表，不动整个弹窗，焦点才留得住 */
    const qi = document.getElementById('shop-q');
    if (qi && qi.addEventListener) {
      qi.addEventListener('input', function () {
        _shopQ = this.value;
        const ul = document.getElementById('shop-list');
        if (ul) ul.innerHTML = shopListInner(cat);
      });
    }
  };
  ACT.do_buyfa = (id) => {
    const s = D.SKILLS.find(function (x) { return x.id === id; });
    if (!s) return;
    const price = Math.round(D.SKILL_PRICE[s.lvl] * 1.2);
    if (knownSkills().some(function (k) { return k.id === id; })) { toast('已习得此术法'); return; }
    if (!spendStones(price, '术法 ' + s.name)) {
      toast('灵石不足：需 ' + fmtNum(price) + '，余 ' + fmtNum(S.stones));
      return;
    }
    learnArt(id);
    logLine('购得术法「' + s.name + '」。', 'good');
    toast('习得术法 ' + s.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
    refreshShop('fa'); render();
  };

  ACT.do_shopsort = (s) => { _shopSort = s || 'def'; ACT.openShop(_shopLastCat || 'pill'); };

  ACT.do_shopcat = (c) => { closeModal(); ACT.openShop(c); };

  /* 右栏分组开合：只存在内存里，不写档——读档后回到默认视野 */
  ACT.do_sg = (k) => {
    if (!k) return;
    SG_OPEN[k] = SG_OPEN[k] === undefined ? true : !SG_OPEN[k];
    render();
  };

  ACT.do_buyg = (id) => {
    const g = D.SHOP_GONGFA.find(function (x) { return x.id === id; });
    if (!g) return;
    const isFa = g.role === 'fa';
    const artId = 'fa:' + g.id;
    const owned = isFa ? hasArt(artId) : (S.ownedGongfa || []).includes(g.id);
    if (owned) { toast(isFa ? '已习得此术法' : '已习得'); return; }
    if (!spendStones(g.price, (isFa ? '术法 ' : '功法 ') + g.name)) {
      toast('灵石不足：需 ' + fmtNum(g.price) + '，余 ' + fmtNum(S.stones));
      return;
    }
    if (isFa) {
      learnArt(artId);
      logLine('购得术法「' + g.name + '」（' + D.GONGFA_TIERS[g.tier].name + '）。', 'good');
      toast('习得术法 ' + g.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
      refreshShop('fa'); render();
      if (!_shopOpen) flushGain('得一门术法', '术法要装配进斗法才用得上——去「术法 · 装配」选一格。', true);
      return;
    }
    addGongfa(g.id);
    logLine('购得修炼功法「' + g.name + '」（' + D.GONGFA_TIERS[g.tier].name + '）。', 'good');
    toast('习得 ' + g.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
    refreshShop('gongfa'); render();
    if (!_shopOpen) flushGain('得一部功法', '买了不等于在用——去「功法」面板参悟，才会换成主修。', true);
  };

  /* 法器：购买入包 + 佩戴 */
  ACT.openArts = () => {
    let b = '<div class="small muted">法宝只有佩戴才生效。攻击位加伤、护体位减伤、遁走位加遁速。</div>' + divider();
    const own = S.arts || [];
    /* v10.7 P1·战斗口径：一次性之物单列。
       它们没有对应的装备位（slot='once'），旧版混在装备列表里，
       点了「佩戴」只是写进一个没人读的 equipped.once——看着像能装，实际不能。 */
    const equipA = D.ARTIFACT_EXT.filter(function (a) { return own.indexOf(a.id) >= 0 && a.slot !== 'once'; });
    const onceA = D.ARTIFACT_EXT.filter(function (a) { return own.indexOf(a.id) >= 0 && a.slot === 'once'; });
    if (!own.length) b += '<div class="small muted">尚无法宝。去坊市看看。</div>';
    else {
      if (equipA.length) {
        b += '<ul class="opts">';
        equipA.forEach(function (a) {
          const eq = (S.equipped || {})[a.slot] === a.id;
          b += iconRow('ARTIFACT_EXT', a.id, eq ? '●' : '·', a.name + '　' + a.eff,
            { name: eq ? '已佩' : (a.slot === 'atk' ? '攻击' : a.slot === 'body' ? '护体' : a.slot === 'move' ? '遁走' : '一次'),
             cls: eq ? 'peace' : 'chance' },
            eq ? '卸下' : '佩戴', false, 'do;equip:' + a.id);
        });
        b += '</ul>';
      }
      if (onceA.length) {
        b += divider() + '<div class="small muted">一次性之物：用掉即无。</div><ul class="opts">';
        onceA.forEach(function (a) {
          if (a.id === 'jinchuan') {
            /* 传音符平时就能用（传讯相识之人），不必等开战。 */
            b += iconRow('ARTIFACT_EXT', a.id, '·', a.name + '　' + a.eff,
              { name: '可用', cls: 'chance' }, '使用', false, 'do;useart:' + a.id);
          } else {
            b += '<li class="opt disabled"><span class="key">·</span>' +
              '<span class="txt">' + esc(a.name) + '<span class="muted">　' + esc(a.eff) + '</span></span>' +
              '<span class="note">战前用</span></li>';
          }
        });
        b += '</ul>';
      }
    }
    openModal('法宝', b);
  };

  /* v10.7 P1·战斗口径：传音符兑现。
     旧版它躺在 S.arts 里，既没有使用分支，战前菜单里点了也只写一句
     「战前用了传音符」——文案是句空话，物品却被消耗掉了。
     现在给它一个真实的平时用途：传讯一位相识之人，好感 +5。 */
  ACT.do_useart = (id) => {
    const a = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
    if (!a) { toast('没有此物'); return; }
    if (id !== 'jinchuan') { toast('此物只能在战前使用'); return; }
    if ((S.arts || []).indexOf(id) < 0) { toast('此物已不在身上'); return; }
    const met = Object.keys(S.npcs || {}).filter(function (k) { return S.npcs[k] && S.npcs[k].met; });
    if (!met.length) { toast('尚无相识之人，符传不到'); return; }
    closeModal();
    /* 传音是「走动」的替代品，不是白送的好感：
       找上门聊天（do_ia）要占一旬，传音符省了路，但省不掉那一旬——
       否则它就是一条只卖灵石、不耗时间的刷好感外挂。 */
    advanceXun(1);
    if (S.phase !== 'play') return render();
    const k = met[Math.floor(rng() * met.length)];
    const rec = S.npcs[k];
    const before = rec.fav || 0;
    rec.fav = clamp(before + 5, 0, 120);
    const nm = (D.NPC_POOL.find(function (x) { return x.id === k; }) || {}).name || '故人';
    S.arts.splice((S.arts || []).indexOf(id), 1);
    consumeQuality(id);
    logLine('传音符化作一道轻烟，「' + nm + '」收到了你的问候（好感 +' + (rec.fav - before) + '）。', 'good');
    toast('传音已至 · ' + nm);
    render();
  };

  ACT.do_buy = (id) => {
    // 灵脉契是「地产」不是法宝：旧代码先判 cat==='art' 就把 fudi 塞进 S.arts，
    // 结果花 2400 石买了个看不见也用不上的东西。
    const land = (D.SHOP || []).find(function (x) { return x.id === id; });
    if (land && land.type === 'land') {
      if ((parseInt(S.lingqiUp, 10) || 0) >= D.LINGQI.length - 1) { toast('灵气已至洞天，再无可升'); return; }
      const landPrice = buyPriceOf(land);
      if (!spendStones(landPrice, '灵脉契')) {
        toast('灵石不足：需 ' + fmtNum(landPrice) + '，余 ' + fmtNum(S.stones));
        return;
      }
      S.lingqiUp = (parseInt(S.lingqiUp, 10) || 0) + 1;
      syncLingqi();
      logLine('立灵脉契，洞府灵气升一档：' + D.LINGQI[S.lingqi].name + '。', 'good');
      toast('灵脉契 · ' + D.LINGQI[S.lingqi].name + ' · 余 ' + fmtNum(S.stones) + ' 石');
      refreshShop('art'); render();
      return;
    }
    const it = D.SHOP.find(function (x) { return x.id === id; });
    if (!it) return;
    if (it.type === 'xiang' && !usesShenLine()) { toast('此物唯神道受用'); return; }
    if (it.cat === 'art') {
      /* v10.5 P0·E6：购买唯一。已经有一件就别再花一次灵石买同一件。
         制作/掉落仍可多件，只卡「买」这个入口。 */
      S.arts = S.arts || [];
      if (S.arts.indexOf(it.id) >= 0) { toast('已拥有此法宝'); return; }
    }
    const buyPrice = buyPriceOf(it);
    if (!spendStones(buyPrice, '购 ' + it.name)) {
      toast('灵石不足：需 ' + fmtNum(buyPrice) + '，余 ' + fmtNum(S.stones));
      return;
    }
    if (it.cat === 'art') {
      S.arts.push(it.id);
      logLine('购得「' + it.name + '」，可佩戴。', 'good');
      toast('购得 ' + it.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
      S.gainQueue = S.gainQueue || [];
      queueGain(it.name, 0, (it.eff || '法宝') + ' · 待佩戴', true);
    } else if (it.cat === 'mat') {
      /* 修 bug：旧代码写进 S.bag，而四艺查的是 S.bagMat。
         结果「在坊市花钱买的材料，炼丹永远显示没有」——四艺整条链断在这里。 */
      addMat(it.id, 1);
      logLine('购得材料「' + it.name + '」。', 'good');
      toast('购得 ' + it.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
    } else {
      S.bag[it.id] = (S.bag[it.id] || 0) + 1;
      logLine('购得「' + it.name + '」。', 'good');
      toast('购得 ' + it.name + ' · 余 ' + fmtNum(S.stones) + ' 石');
    }
    /* 买完不关窗：只换列表与余额，能接着买下一件 */
    refreshShop(_shopLastCat || 'pill'); render();
    /* 坊市开着就先不弹「所得」，否则一买就被顶掉、连买断掉 */
    if (!_shopOpen) {
      // 只在这一种料是「第一次见到」时弹窗说明，连买十份不会弹十次
      if (it.cat === 'mat') flushGain('新材料', '这种料以前没用过——看看它能做什么。', false);
      else if (it.cat === 'art') flushGain('得一件法宝', '法宝不佩戴就不生效。去「法宝」选位置：攻击位加伤、护体位减伤、遁走位加遁速。', true);
    }
  };

  ACT.do_equip = (id) => { equipArt(id); closeModal(); render(); };

    ACT.openBag = () => {
    let b = '';
    const items = Object.keys(S.bag).filter(k => S.bag[k] > 0).map(k => {
      const it = D.SHOP.find(x => x.id === k);
      return { k, n: S.bag[k], name: it ? it.name : k, desc: it ? it.desc : '' };
    });
    if (!items.length) b += `<div class="small muted">乾坤袋空空如也。</div>`;
    else {
      b += `<ul class="opts">`;
      for (const it of items) b += optRow('·', `${it.name} ×${it.n}　${it.desc}`, null, '使用', false, 'do;use:' + it.k);
      b += `</ul>`;
    }
    openModal('乾坤袋', b);
  };

  ACT.do_use = (k) => {
    if ((S.bag[k] || 0) < 1) { toast('没有此物'); return; }
    const it = D.SHOP.find(x => x.id === k) || D.PILL_EXT.find(x => x.id === k) || D.MATERIAL_EXT.find(x => x.id === k);
    if (!it) { toast('无法使用'); return; }
    if (it.type === 'xiang' && !usesShenLine()) { toast('此物唯神道受用'); return; }
    if (it.cat === 'mat' || it.type === 'mat') { toast('这是材料，需炼丹炼器用'); return; }
    S.bag[k]--;
    bump('pillUsed'); S.pillThisMonth = true;
    const eff = applyPill(it);
    logLine(`用了${it.name}：${eff}。`, 'good');
    closeModal(); render();
  };

  /* ---------- 地图 ---------- */
  ACT.openMap = () => {
    let b = `<div class="small">当前：<b>${esc(curPlace())}</b>　灵气 ${esc(D.LINGQI[S.lingqi].name)}（×${D.LINGQI[S.lingqi].v}）</div>` + divider();
    /* 舆图：四个空白圆点是压缩原图里就有的标记位，州名由 HTML 叠加，中州居中 */
    if (typeof WXCS3_ART !== 'undefined' && WXCS3_ART.has('map')) {
      const spots = [
        { id: 'beiyuan', x: 33.4, y: 23 },
        { id: 'qingyue', x: 67.5, y: 22.6 },
        { id: 'xisha', x: 41.1, y: 81.7 },
        { id: 'nanyue', x: 65.5, y: 81.2 },
        { id: 'zhongzhou', x: 50.6, y: 52 }
      ];
      b += '<div class="mapart"><img src="' + esc(WXCS3_ART.src('map')) +
        '" alt="" onerror="this.parentNode.style.display=\'none\'">';
      for (const sp of spots) {
        const reg = D.REGIONS.find(function (r) { return r.id === sp.id; }) || {};
        b += '<span class="mapart-name' + ((S.place || 'qingyue') === sp.id ? ' here' : '') +
          '" style="left:' + sp.x + '%;top:' + sp.y + '%">' + esc(reg.name || '') + '</span>';
      }
      b += '</div>' + divider();
    }
    b += '<div class="small muted">迁地即换灵气档与危险度。低境闯高阶地界，真会死。</div>';
    b += '<ul class="opts">';
    for (const p of PLACES) {
      const here = (S.place || 'qingyue') === p.id;
      const ok = myRealmIdx() >= Math.max(0, p.danger);
      const dq = D.REGIONS.find(function (r) { return r.id === p.id; }) || {};
      b += optRow(here ? '●' : '·', p.name + '　灵气 ' + D.LINGQI[p.lingqi].name,
        here ? { name: '当前', cls: 'peace' } : { name: '危险 ' + p.danger, cls: p.danger >= 2 ? 'risk' : 'chance' },
        dq.suggest || '', here || !ok, 'do;travel:' + p.id);
    }
    b += '</ul>';
    /* v9.0 M4：已知遗迹按地点挂在舆图上——它和迁地共用同一张地图。 */
    const _XR = G.WXCS3_EXT;
    if (_XR && _XR.mapRows) { const _rr = _XR.mapRows(); if (_rr) b += _rr; }
    /* v8.1 P0 第6项：属性进文本。神识不够就一个字都不给——
       这不是「少一行装饰」，是「你在同一张地图上比别人少看见一条路」。 */
    const _mc = clue('sense');
    if (_mc) b += '<div class="hint">' + esc(_mc) + '</div>';
    openModal('九州舆图', b);
  };

  /* ---------- 历练 ---------- */
  ACT.explore = () => {
    let b = `<div class="small muted">山野之外便是他人猎场。</div>`;
    b += `<div class="selgrid" style="margin-top:6px">`;
    b += `<span class="chip" data-act="do;xing:wild">山野历练</span>`;
    b += `<span class="chip" data-act="do;xing:market">坊市打探</span>`;
    b += `</div>`;
    /* v9.0 M4：遗迹入口与山野并列——访古也是一次外出。 */
    const _XE = G.WXCS3_EXT;
    if (_XE && _XE.exploreRows) { const _er = _XE.exploreRows(); if (_er) b += _er; }
    openModal('外出历练', b);
  };

  ACT.do_xing = (where) => {
    closeModal();
    advanceXun(1);
    if (S.phase !== 'play') return render();
    if (where === 'wild') {
      const r = rnd100();
      // 收益随境界走：练气时 +8 修为还算事，金丹时 +8 就是侮辱
      const rk = S.xRealm || 0;
      if (r <= 45) {
        const g = Math.round(8 + rk * 7 + st('fate') * 2);
        S.xiuwei = Math.min(xrealm().need || 0, S.xiuwei + g);
        logLine(`山野采气，修为 +${g}`, '');
      } else if (r <= 65) {
        const m = 30 + rk * 45;
        S.stones += m;
        logLine(`拾得散修遗落的灵石 ${m}。`, '');
      } else if (r <= 82) {
        const g = 6 + rnd(6) + rk * 4;
        S.xiuwei = Math.min(xrealm().need || 0, S.xiuwei + g);
        logLine(`偶遇同门切磋，修为 +${g}`, '');
      } else { startCombat(false); return; }
    } else {
      logLine(pick(['坊市传言：南疆赤炎火脉出现异动，有地阶功法残卷流出。',
        '有人低声说，上古的「结晶」境残卷在古洞府里出现过。',
        '老者议论：灵气潮汐将近，各宗都在暗中备赛。']), '');
    }
    maybeEvent(); render();
  };

  /* ============================================================
     v6.3 宗门：外门四殿 → 内门四峰 → 真传
     上乘神通只在真传层。「真正厉害的神通都在圣火崖上呢，非真传不可学！」
     ============================================================ */
  function sectRank() { return S.sect ? (D.SECT.ranks[S.sect.rank] || D.SECT.ranks[0]) : null; }

  ACT.openSect = () => {
    let b = '';
    if (!S.sect) {
      b += '<div class="small">' + esc(D.SECT.name) + '的山门在青岳北面。外门四殿先在底下挑人。</div>';
      b += '<div class="muted small" style="margin:6px 0">' + esc(D.SECT.oath) + '</div>';
      b += divider();
      b += '<div class="small">入宗要先择一殿做杂役。四殿各有各的去处：</div>';
      b += '<ul class="opts">';
      D.SECT.halls.forEach(function (h, i) {
        b += optRow('ABCD'[i], h, { name: '外门', cls: 'peace' }, '记名弟子 · 无月俸', false, 'do;joinsect:' + i);
      });
      b += '</ul>';
      b += '<div class="hint">立誓之后叛门，代价是修为倾泻一个大境。叛门非易宗而复游戏。</div>';
      openModal('宗门 · ' + D.SECT.name, b);
      return;
    }
    const r = sectRank();
    b += '<div class="statline"><span class="k">宗门</span><span class="v">' + esc(D.SECT.name) + '</span></div>';
    b += '<div class="statline"><span class="k">身份</span><span class="v">' + esc(r.name) +
      (S.sect.peak ? ' · ' + esc(D.SECT.peaks[S.sect.peak]) : ' · ' + esc(D.SECT.halls[S.sect.hall])) + '</span></div>';
    b += '<div class="statline"><span class="k">贡献</span><span class="v">' + fmtNum(S.sect.contrib) +
      (r.need ? ' / ' + fmtNum(r.need) : '') + '</span></div>';
    if (S.sect.rank > 0) b += '<div class="small muted">月俸 ' + r.pay + ' 灵石 · 可装配术法 ' + r.equip + ' 道</div>';
    if (sectDue() > 0) b += '<div class="small muted">月课 ' + fmtNum(sectDue()) + ' 贡献（不足则以 ' +
      fmtNum(sectDue() * D.FIXED_COST.sectCashPerContrib) + ' 灵石抵缴）' +
      (S.sectArrears ? '　<span class="danger">已欠 ' + S.sectArrears + ' 月</span>' : '') + '</div>';
    b += '<div class="muted small" style="margin:4px 0">' + esc(r.desc) + '</div>';
    b += divider();
    b += '<ul class="opts">';
    b += optRow('A', '领宗门任务', { name: '平和', cls: 'peace' }, '换贡献', false, 'act:openSectTask');
    b += optRow('B', '藏经阁', { name: '机缘', cls: 'chance' }, '用贡献换功法/神通', false, 'act:openSectLib');
    b += optRow('E', '交成品换贡献', { name: '平和', cls: 'peace' }, '丹药/符箓换身份', false, 'act:openSectDeliver');
    if (S.sect.rank < D.SECT.ranks.length - 1)
      b += optRow('C', '晋升考核', { name: '风险', cls: 'risk' }, '需 ' + fmtNum(D.SECT.ranks[S.sect.rank + 1].need) + ' 贡献', S.sect.contrib < D.SECT.ranks[S.sect.rank + 1].need, 'do;sectup');
    b += optRow('D', '叛门离宗', { name: '风险', cls: 'risk' }, '修为跌落一个大境', false, 'do;sectquit');
    b += '</ul>';
    b += '<div class="hint">真传才有资格学上乘神通。这条不是数值门槛，是身份门槛。</div>';
    openModal('宗门 · ' + esc(r.name), b);
  };

  ACT.do_joinsect = (i) => {
    i = clamp(parseInt(i, 10) || 0, 0, D.SECT.halls.length - 1);
    S.sect = { rank: 0, contrib: 0, hall: i, peak: null, joinedTurn: S.turn, sworn: true };
    S.fame += 10;
    logLine('入' + D.SECT.halls[i] + '做记名弟子，立下玄景之誓。', 'good');
    toast('记名弟子 · ' + D.SECT.halls[i]);
    closeModal(); render();
  };

  ACT.openSectTask = () => {
    let b = '<div class="small">宗门任务换贡献。有风险，但比在山野碰运气稳。</div>' + divider();
    b += '<ul class="opts">';
    D.SECT.tasks.forEach(function (t, i) {
      b += optRow('ABCDE'[i], t.name, { name: t.risk >= 0.28 ? '风险' : '平和', cls: t.risk >= 0.28 ? 'risk' : 'peace' },
        '+' + t.contrib + ' 贡献 · ' + t.desc, false, 'do;secttask:' + i);
    });
    b += '</ul>';
    b += '<div class="hint">贡献点先换的是功法，不是灵石——这是宗门与坊市最大的不同。</div>';
    openModal('宗门任务', b);
  };

  ACT.do_secttask = (i) => {
    const t = D.SECT.tasks[clamp(parseInt(i, 10) || 0, 0, D.SECT.tasks.length - 1)];
    closeModal();
    advanceXun(1);
    if (S.phase !== 'play') return render();
    const gain = t.contrib + Math.floor(st('insight') * 1.5);
    S.sect.contrib += gain;
    S.stones += Math.round(t.contrib * 0.3);
    // 任务也给材料——四艺的「料」从这里来，不然玩家会被买不到材料卡死
    /* 每个任务至少覆盖一条四艺的完整材料需求：
       旧表缺朱砂（制符必需）、骨灵花、龙岩铁、天璇星砂，
       导致「增益符 / 生肌续骨丹 / 九转飞剑 / 五行轮杀阵」四张配方永远做不出来。 */
    const drops = {
      caoyao:  [{ id: 'lanyouCao', n: 3 }, { id: 'buqiCao', n: 2 }, { id: 'gulingHua', n: 1 }],
      liandan: [{ id: 'heshenHua', n: 2 }, { id: 'buqiCao', n: 1 }, { id: 'gulingHua', n: 1 }],
      xunshan: [{ id: 'tieMu', n: 2 }, { id: 'fuZhi', n: 3 }, { id: 'zhuSha', n: 3 }],
      lieyao:  [{ id: 'mudanYao', n: 1 }, { id: 'huanShi', n: 1 }, { id: 'longYan', n: 1 }],
      zhensou: [{ id: 'zhenQi', n: 1 }, { id: 'jinLing', n: 2 }, { id: 'starSand', n: 1 }]
    };
    const dd = drops[t.id] || drops.caoyao;
    let matMsg = [];
    dd.forEach(function (x) {
      const it = D.MATERIAL_EXT.find(function (y) { return y.id === x.id; });
      addMat(x.id, x.n);
      matMsg.push((it ? it.name : x.id) + '×' + x.n);
    });
    logLine('完成' + t.name + '：贡献 +' + gain + '，并得 ' + matMsg.join('、') + '。', '');
    S.gainQueue = S.gainQueue || [];
    queueGain('宗门贡献', gain, '可换功法/丹药', true);
    if (rng() < t.risk) {
      const dmg = Math.round(S.hpMax * (0.10 + rng() * 0.20));
      S.hp = Math.max(1, S.hp - dmg);
      logLine(t.name + '途中出了岔子，气血 −' + dmg + '。', 'danger');
    }
    maybeEvent(); render();
    if (!modalBusy()) flushGain(t.name + ' · 所得', '材料已入库存，做东西时点配方就能看见够不够。', true);
  };

  ACT.openSectLib = () => {
    const lvls = sectAllowedLvl();
    const r = sectRank() || { name: '散修' };
    let b = '<div class="small">藏经阁 · ' + esc(r.name) + '能进 ' + lvls.map(function (l) {
      return ({ wai: '外门层', nei: '内门层', zhen: '神通层' })[l];
    }).join('、') + '。</div>';
    b += '<div class="muted small" style="margin:4px 0">贡献 ' + fmtNum(S.sect.contrib) + '</div>' + divider();
    /* v10.5 P1·A3/A4：藏经阁按能力三分分架。
       修炼功法只列 role!=fa；术法 = GONGFA(role=fa) + SKILLS；
       神通只列来源，不可在此购买——它由道基/破境按 SHENTONG_GRANT 授予。 */
    const priceOfTier = { huang: 200, xuan: 700, di: 2600, tian: 9000, xian: 30000 };
    b += '<div class="small muted" style="margin-bottom:4px">修炼功法</div><ul class="opts">';
    // 之前遍历 SHOP_GONGFA（只有黄/玄），所以地阶/天阶永远不会出现，
    // 「真传可学上乘功法」是空的，也是「天阶只能金丹后拿、金丹又要天阶」的死锁源头。
    D.GONGFA_EXT.filter(function (g) { return g.role !== 'fa'; }).forEach(function (g) {
      const tierLvl = ({ huang: 'wai', xuan: 'nei', di: 'zhen', tian: 'zhen', xian: 'zhen' })[g.tier];
      const ok = lvls.indexOf(tierLvl) >= 0;
      const owned = (S.ownedGongfa || []).indexOf(g.id) >= 0;
      const price = priceOfTier[g.tier];
      b += iconRow('GONGFA_EXT', g.id, '·', g.name + '（' + D.GONGFA_TIERS[g.tier].name + '）', { name: '修炼', cls: 'peace' },
        owned ? '已习' : (!ok ? '身份不够' : fmtNum(price) + ' 贡献'), owned || !ok || S.sect.contrib < price,
        'do;libb:' + g.id);
    });
    b += '</ul>' + divider() + '<div class="small muted" style="margin-bottom:4px">术法</div><ul class="opts">';
    D.GONGFA_EXT.filter(function (g) { return g.role === 'fa'; }).forEach(function (g) {
      const tierLvl = ({ huang: 'wai', xuan: 'nei', di: 'zhen', tian: 'zhen', xian: 'zhen' })[g.tier];
      const ok = lvls.indexOf(tierLvl) >= 0;
      const owned = hasArt('fa:' + g.id);
      const price = priceOfTier[g.tier];
      b += iconRow('GONGFA_EXT', g.id, '·', g.name + '（' + D.GONGFA_TIERS[g.tier].name + '）', { name: '术法', cls: 'peace' },
        owned ? '已习' : (!ok ? '身份不够' : fmtNum(price) + ' 贡献'), owned || !ok || S.sect.contrib < price,
        'do;libb:' + g.id);
    });
    D.SKILLS.forEach(function (sk) {
      if (sk.id === 'zhiquan') return;
      const ok = lvls.indexOf(sk.lvl) >= 0;
      const own = (S.skillsKnown || []).indexOf(sk.id) >= 0;
      const price = D.SKILL_PRICE[sk.lvl];
      b += iconRow('SKILLS', sk.id, '·', sk.name, { name: ({ wai: '外门', nei: '内门', zhen: '真传' })[sk.lvl], cls: sk.lvl === 'zhen' ? 'chance' : 'peace' },
        own ? '已习' : (!ok ? '非真传不可学' : fmtNum(price) + ' 贡献'),
        own || !ok || S.sect.contrib < price, 'do;libskill:' + sk.id);
    });
    b += '</ul>' + divider() + '<div class="small muted" style="margin-bottom:4px">神通（只列来源）</div><ul class="opts">';
    if ((S.shenTong || []).length) {
      S.shenTong.forEach(function (nm) {
        b += '<div class="small" style="padding:3px 0">' + esc(stShort(nm)) +
          '<span class="muted"> · ' + esc(shenTongKindMarked(nm) || '道基所赋') + ' · 不可购</span></div>';
      });
    } else {
      b += '<div class="small muted">尚无神通。破境/紫府按道统授予，不由藏经阁出售。</div>';
    }
    b += '</ul>';
    b += '<div class="hint">「真正厉害的术法都在顶层，非真传不可学」；神通是道基所赋，买不到。</div>';
    openModal('藏经阁', b);
  };

  /* 交成品换贡献：给四艺一个稳定、无风险、不用摆摊的出口 */
  ACT.openSectDeliver = () => {
    const deals = [
      { id: 'dan', name: '3 枚回春丹', contrib: 90, check: function () { return (S.bag.pillHp || 0) >= 3; }, take: function () { S.bag.pillHp -= 3; } },
      { id: 'fu', name: '5 张火符', contrib: 120, check: function () { return (S.talismans.fuHuo || 0) >= 5; }, take: function () { S.talismans.fuHuo -= 5; } },
      { id: 'qi', name: '1 件玄阶法宝', contrib: 600, check: function () { return (S.arts || []).length > 0; }, take: function () { S.arts.pop(); } },
      { id: 'zhen', name: '1 座聚灵阵盘', contrib: 400, check: function () { return (S.disks || []).some(function (d) { return d.id === 'zhenJuLing'; }); }, take: function () { S.disks = S.disks.filter(function (d) { return d.id !== 'zhenJuLing'; }); } }
    ];
    let b = '<div class="small">把手艺交给宗门，换身份。</div>';
    b += '<div class="muted small" style="margin:4px 0">这是四艺最稳的出口——不用摆摊、不用担风险，还直接换地位。</div>' + divider();
    b += '<ul class="opts">';
    deals.forEach(function (d, i) {
      b += optRow('ABCD'[i], d.name, { name: '交付', cls: 'peace' }, '+' + d.contrib + ' 贡献',
        !d.check(), 'do;sectdeal:' + d.id);
    });
    b += '</ul>';
    b += '<div class="hint">宗门本来就需要炼丹师——这条路让「会做东西」也能爬到高层。</div>';
    openModal('交成品 · 换贡献', b);
  };

  ACT.do_sectdeal = (id) => {
    const deals = {
      /* v10.5 P1·M2：交成品换贡献统一上浮两成，给四艺一个稳定出口 */
      dan: { contrib: 108, take: function () { S.bag.pillHp -= 3; }, ok: function () { return (S.bag.pillHp || 0) >= 3; } },
      fu: { contrib: 144, take: function () { S.talismans.fuHuo -= 5; }, ok: function () { return (S.talismans.fuHuo || 0) >= 5; } },
      qi: { contrib: 720, take: function () { S.arts.pop(); }, ok: function () { return (S.arts || []).length > 0; } },
      zhen: { contrib: 480, take: function () { S.disks = (S.disks || []).filter(function (d) { return d.id !== 'zhenJuLing'; }); }, ok: function () { return (S.disks || []).some(function (d) { return d.id === 'zhenJuLing'; }); } }
    };
    const d = deals[id];
    if (!d) return;
    if (!d.ok()) { toast('没有可交的东西'); return; }
    d.take();
    S.sect.contrib += d.contrib;
    logLine('交上一批成品，换得贡献 +' + d.contrib + '。', 'good');
    closeModal(); ACT.openSect(); render();
  };

  ACT.do_libb = (id) => {
    const g = D.GONGFA.find(function (x) { return x.id === id; });
    if (!g) return;
    const tierLvl = ({ huang: 'wai', xuan: 'nei', di: 'zhen', tian: 'zhen', xian: 'zhen' })[g.tier];
    if (sectAllowedLvl().indexOf(tierLvl) < 0) { toast('身份不够，进不了这一层'); return; }
    const price = ({ huang: 200, xuan: 700, di: 2600, tian: 9000, xian: 30000 })[g.tier];
    if (S.sect.contrib < price) { toast('贡献不足'); return; }
    const isFa = g.role === 'fa';
    if (isFa ? hasArt('fa:' + id) : (S.ownedGongfa || []).indexOf(id) >= 0) { toast('已习'); return; }
    S.sect.contrib -= price;
    addGongfa(id);
    logLine('以 ' + price + ' 贡献从藏经阁换得' + (isFa ? '术法《' : '修炼功法《') + g.name + '》。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_libskill = (id) => {
    const sk = D.SKILLS.find(function (x) { return x.id === id; });
    if (!sk) return;
    if (sectAllowedLvl().indexOf(sk.lvl) < 0) { toast('非真传不可学'); return; }
    const price = D.SKILL_PRICE[sk.lvl];
    if (S.sect.contrib < price) { toast('贡献不足'); return; }
    if ((S.skillsKnown || []).indexOf(id) >= 0) { toast('已习'); return; }
    S.sect.contrib -= price;
    learnSkill(id);
    logLine('从藏经阁学得术法「' + sk.name + '」。', 'good');
    toast('术法 · ' + sk.name);
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_sectup = () => {
    const next = D.SECT.ranks[S.sect.rank + 1];
    if (!next) return;
    if (S.sect.contrib < next.need) { toast('贡献不足'); return; }
    // 台阶：内门要三品、真传要五品、长老要七品
    const artGate = { 2: 3, 3: 5, 4: 7 }[S.sect.rank + 1];
    if (artGate) {
      const best = Math.max.apply(null, ['dan', 'qi', 'fu', 'zhen'].map(function (k) {
        return (S.craftLv || {})[k] || 1;
      }));
      if (best < artGate) {
        toast('技艺不足：需任一门 ' + artGate + ' 品（现 ' + best + ' 品）');
        return;
      }
    }
    // 内门以上要挑峰
    S.sect.rank++;
    if (S.sect.rank >= 2 && S.sect.peak == null) S.sect.peak = Math.floor(rng() * D.SECT.peaks.length);
    logLine('晋升' + next.name + '。' + next.desc + '。', 'good');
    toast(next.name);
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_sectquit = () => {
    confirmAction('叛门离宗', '立过的誓会咬人。修为跌落一个大境，道心永久 −3，原宗门追杀。', function () {
      const b = D.SECT.betray;
      S.xRealm = Math.max(0, S.xRealm + b.realm);
      S.xStage = 0; S.xiuwei = 0;
      S.stats.heart = clamp(S.stats.heart + b.heart, 1, 20);
      S.fame = Math.max(0, S.fame + b.fame);
      logLine('玄景破碎。一身修为如同流水一般倾泻而出。', 'danger');
      S.karma += 20;
      S.sect = null;
      S.enemySect = true;
      bump('leftSect');     // 功过格「叛门」
      closeModal(); render();
    });
  };

  /* ============================================================
     v6.3 家族：祠堂 / 族人 / 族运 / 族老会
     「父亲可是要学那书上的宗族法度，立祠堂，开族府」
     ============================================================ */
  function clanLv() { return S.clan ? D.CLAN.hallRanks[S.clan.lv] : D.CLAN.hallRanks[0]; }

  ACT.openClan = () => {
    let b = '';
    if (!S.clan) {
      const ok = isXian() || isBoth();
      const cost = D.CLAN.foundCost;
      b += '<div class="small">家族是实业：有人口、有祠堂、有族产、有族老会。</div>';
      b += '<div class="muted small" style="margin:6px 0">立族需筑基以上 ＋ ' + fmtNum(cost) + ' 灵石 ＋ 一处洞府。</div>';
      b += divider();
      b += '<ul class="opts">';
      b += optRow('A', '立族开祠', { name: '机缘', cls: 'chance' },
        (!ok ? '需筑基' : S.stones < cost ? '灵石不足' : fmtNum(cost) + ' 石'),
        !ok || S.stones < cost || S.xRealm < D.CLAN.foundRealm, 'do;clanfound');
      b += '</ul>';
      b += '<div class="hint">一族即一庙之基。仙道玩家把族运换修炼加成，神道玩家把族运换信众。</div>';
      openModal('家族', b);
      return;
    }
    const hall = clanLv();
    const ident = D.CLAN.idents.find(function (x) { return x.id === S.clan.ident; }) || D.CLAN.idents[0];
    b += '<div class="statline"><span class="k">族名</span><span class="v">' + esc(S.clan.name) + '氏</span></div>';
    b += '<div class="statline"><span class="k">祠堂</span><span class="v">' + esc(hall.name) + '（' + S.clan.lv + ' 级）</span></div>';
    b += '<div class="statline"><span class="k">身份</span><span class="v">' + esc(ident.name) + '</span></div>';
    b += '<div class="statline"><span class="k">族人</span><span class="v">' + S.clan.pop + ' / ' + hall.pop + '</span></div>';
    b += '<div class="small muted">口粮 ' + fmtNum(clanFoodCost()) + ' 灵石／月（按族人计）</div>';
    b += '<div class="statline"><span class="k">族运</span><span class="v">' + Math.round(S.clan.luck) + ' / ' + hall.luck + '</span></div>';
    b += '<div class="muted small" style="margin:4px 0">每月族人供奉 ' +
      Math.round(S.clan.pop * D.CLAN.income.stonePerPop) + ' 灵石（未派活时），族运 +' +
      Math.round(S.clan.pop * D.CLAN.income.luckPerPop) + '。可传授功法至 ' +
      esc(D.GONGFA_TIERS[hall.gongfa].name) + '。</div>';
    b += '<ul class="opts">' + optRow('产', '族人派活 · 药圃／帮工／跑商／修行',
      { name: '新', cls: 'chance' }, Math.min(S.clan.pop, clanIndUsed()) + '/' + S.clan.pop + ' 已派',
      false, 'act:openClanInd') + '</ul>';
    b += divider();
    b += '<div class="small muted" style="margin-bottom:4px">族老会</div>';
    b += D.CLAN.elders.map(function (e) {
      return '<div class="sl"><span class="k">' + esc(e.name) + '</span><span class="v">' + esc(e.stance) + '</span></div>';
    }).join('');
    b += divider();
    b += '<ul class="opts">';
    if (S.clan.lv < D.CLAN.hallRanks.length - 1) {
      const nx = D.CLAN.hallRanks[S.clan.lv + 1];
      b += optRow('A', '扩建祠堂 → ' + nx.name, { name: '平和', cls: 'peace' },
        fmtNum(nx.cost) + ' 石 · 族人上限 ' + nx.pop, S.stones < nx.cost, 'do;clanup');
    }
    b += optRow('B', '收拢旁姓入族', { name: '机缘', cls: 'chance' }, '耗 300 族运，族人增加', S.clan.luck < 300, 'do;clanabsorb');
    b += optRow('C', '族运换修行', { name: '平和', cls: 'peace' }, '按 10:1 折修为', S.clan.luck < 100, 'do;clanluck:xian');
    if (hasShenLine()) b += optRow('D', '族运换信众', { name: '平和', cls: 'peace' }, '一族即一庙', S.clan.luck < 100, 'do;clanluck:shen');
    b += '</ul>';
    b += '<div class="hint">族人被杀你不出头，族运就崩；你结仇太多，仇家会来灭族。</div>';
    openModal('家族 · ' + esc(S.clan.name) + '氏', b);
  };

  ACT.do_clanfound = () => {
    if (!(isXian() || isBoth()) || S.xRealm < D.CLAN.foundRealm) { toast('需筑基以上'); return; }
    if (S.stones < D.CLAN.foundCost) { toast('灵石不足'); return; }
    S.stones -= D.CLAN.foundCost;
    const nm = (S.name || '李').slice(0, 1);
    // 开局自定族规：随机取三条，玩家在族谱里能看到
    const rules = [];
    const pool2 = D.CLAN.rules.slice();
    for (let i = 0; i < 3 && pool2.length; i++) rules.push(pool2.splice(Math.floor(rng() * pool2.length), 1)[0].id);
    S.clan = { name: nm, lv: 1, pop: 120, luck: 60, ident: 'di', rules: rules, founded: S.turn, peaks: null,
      ind: { farm: 0, work: 0, trade: 0, study: 0 },
      elder: pick(['shou', 'jin', 'li']) };
    logLine('立祠堂，开族府。' + nm + '氏在这一带算是有了名。', 'good');
    toast('立族 · ' + nm + '氏');
    advanceXun(1); if (S.phase !== 'play') return render();
    closeModal(); render();
  };

  ACT.do_clanup = () => {
    const nx = D.CLAN.hallRanks[S.clan.lv + 1];
    if (!nx) return;
    if (S.stones < nx.cost) { toast('灵石不足'); return; }
    S.stones -= nx.cost;
    S.clan.lv++;
    S.clan.luck = Math.min(clanLv().luck, S.clan.luck + 100);
    logLine('祠堂扩为' + nx.name + '，可授 ' + D.GONGFA_TIERS[nx.gongfa].name + '功法。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_clanabsorb = () => {
    if (S.clan.luck < 300) { toast('族运不足'); return; }
    S.clan.luck -= 300;
    const add = 40 + rnd(80);
    S.clan.pop = Math.min(clanLv().pop, S.clan.pop + add);
    S.merit += 10;
    logLine('叶氏诸族老上门，愿意恢复祖姓。族人 +' + add + '。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_clanluck = (kind) => {
    if (S.clan.luck < 100) { toast('族运不足'); return; }
    S.clan.luck -= 100;
    if (kind === 'shen') {
      S.followers = Math.min(followLimit(), S.followers + 60);
      logLine('一族即一庙之基，信众 +60。', 'good');
    } else {
      S.xiuwei = Math.min(xrealm().need || 0, S.xiuwei + 10);
      logLine('族人供奉香火助你闭关，修为 +10。', 'good');
    }
    closeModal(); render();
  };

  /* ============ v8.0 家族产业 ============
     CLAN_INDUSTRIES 之前只是一张说明表，族人的产出跟「派去做什么」无关。
     现在族人要分配：派去帮工/跑商换灵石，派去药圃出草药，派去修行攒悟道。
     没派活的人只按老规矩交一点供奉（0.35 石/人），所以「派人」是真的取舍。 */
  function clanIndOf() {
    if (!S.clan) return { farm: 0, work: 0, trade: 0, study: 0 };
    if (!S.clan.ind || typeof S.clan.ind !== 'object') S.clan.ind = { farm: 0, work: 0, trade: 0, study: 0 };
    return S.clan.ind;
  }
  function clanIndUsed() {
    const i = clanIndOf();
    return (i.farm || 0) + (i.work || 0) + (i.trade || 0) + (i.study || 0);
  }
  function clanElder() { return (S.clan && S.clan.elder) || 'jin'; }
  function clanElderName() {
    const e = D.CLAN.elders.find(function (x) { return x.id === clanElder(); });
    return e ? e.name : '进取族老';
  }

  function tickClan() {
    if (!S.clan) return;
    const hall = clanLv();
    S.clan.luck = Math.min(hall.luck, S.clan.luck + S.clan.pop * D.CLAN.income.luckPerPop);
    const ind = clanIndOf();
    const pop = S.clan.pop || 0;
    const used = Math.min(pop, clanIndUsed());
    const idle = Math.max(0, pop - used);
    const elder = clanElder();
    /* 空闲：老规矩的供奉；帮工 0.8/人；跑商 2.0/人（贪利族老再抽五成） */
    let stone = idle * D.CLAN.income.stonePerPop + (ind.work || 0) * 0.8 + (ind.trade || 0) * 2.0;
    if (elder === 'li') stone += (ind.trade || 0) * 1.0;
    stone = Math.round(stone);
    if (stone > 0) { S.stones += stone; ledgerAdd('in', '家族营生', stone); }
    /* 药圃：守旧族老增产两成，200 人一株 */
    const farmMul = elder === 'shou' ? 1.2 : 1;
    const herb = Math.floor((ind.farm || 0) * farmMul / 200);
    for (let i = 0; i < herb; i++) addMat('lanyouCao', 1);
    if (herb > 0) logLine('药圃收了 ' + herb + ' 株蓝幽草。', 'good');
    /* 修行：50 人一月一悟 */
    const xp = Math.floor((ind.study || 0) / 50);
    if (xp > 0) S.insightXp = (S.insightXp || 0) + xp;
    /* 跑商有风险，贪利族老把风险也放大了 */
    const risk = elder === 'li' ? 0.10 : 0.05;
    if ((ind.trade || 0) > 0 && rng() < risk) {
      S.clan.luck = Math.max(0, S.clan.luck - 40);
      logLine('族人跑商折了本，族运 −40。', 'danger');
    }
  }

  ACT.openClanInd = () => {
    if (!S.clan) { toast('尚未立族'); return; }
    const ind = clanIndOf();
    const pop = S.clan.pop || 0;
    const idle = Math.max(0, pop - Math.min(pop, clanIndUsed()));
    let b = `<div class="small">族人派去做什么，就长出什么。没派活的人只交一点供奉。</div>`;
    b += `<div class="statline"><span class="k">族人</span><span class="v">${pop}</span></div>`;
    b += `<div class="statline"><span class="k">已派</span><span class="v">${Math.min(pop, clanIndUsed())}</span></div>`;
    b += `<div class="statline"><span class="k">空闲</span><span class="v">${idle}（每月 0.35 石/人）</span></div>`;
    b += `<div class="statline"><span class="k">主事族老</span><span class="v">${esc(clanElderName())}</span></div>`;
    b += divider() + '<ul class="opts">';
    const keys = ['A', 'B', 'C', 'D'];
    D.CLAN_INDUSTRIES.forEach(function (x, i) {
      const n = ind[x.id] || 0;
      b += optRow(keys[i], x.name + '　' + n + ' 人',
        { name: n > 0 ? '在办' : '未派', cls: n > 0 ? 'peace' : 'warn' }, x.eff, false,
        'do;ind:' + x.id + ':plus');
      b += optRow('−', '　减一成（现 ' + n + ' 人）', { name: '调', cls: 'warn' }, '',
        n <= 0, 'do;ind:' + x.id + ':minus');
    });
    b += '</ul>';
    b += `<div class="hint">一择而增一成之口。派去跑商来钱最快，但族运可能折损。</div>`;
    openModal('家族产业 · 族人怎么用', b);
  };

  ACT.do_ind = (k, dir) => {
    if (!S.clan) return;
    const ind = clanIndOf();
    const pop = S.clan.pop || 0;
    const step = Math.max(1, Math.round(pop * 0.1));
    if (dir === 'minus') {
      if ((ind[k] || 0) <= 0) return;
      ind[k] = Math.max(0, (ind[k] || 0) - step);
    } else {
      const used = Math.min(pop, clanIndUsed());
      if (used >= pop) { toast('族人都派满了'); return; }
      ind[k] = (ind[k] || 0) + Math.min(step, pop - used);
    }
    ACT.openClanInd(); render();
  };


  /* ---------- 洞天 ---------- */
  ACT.openDongtian = () => {
    let b = `<div class="small">阳世 ↔ 洞天并行，时间同步。</div>` + divider();
    b += `<div class="statline"><span class="k">现在</span><span class="v">${S.inDongtian ? '洞天' : '阳世'}</span></div>`;
    b += `<div class="statline"><span class="k">神位</span><span class="v">${S.shenwei || '未入品'}</span></div>`;
    if (hasShenLine() && !S.lu) {
      b += `<div class="small danger">无箓者入洞天视为邪魔，诸神见之则诛。</div>`;
      b += `<div style="margin:10px 0"><button class="btn gold" data-act="act:openLuPick">去受箓（补领）</button></div>`;
    }
    b += divider() + `<ul class="opts">`;
    for (const g of D.GATE) b += optRow('·', g.name + '（' + g.cost + ' 香火）', { name: '风险', cls: 'risk' }, S.inDongtian ? '回阳世' : '入洞天', hasShenLine() && S.xianghuo < g.cost, 'do;gate:' + g.id);
    b += `</ul>`;
    openModal('两界 · 界门', b);
  };

  ACT.do_gate = (id) => {
    const g = D.GATE.find(x => x.id === id);
    if (!g || !hasShenLine()) { toast('唯有神道或双修可行两界'); return; }
    if (S.xianghuo < g.cost) { toast('香火不足'); return; }
    if (!S.inDongtian && !S.lu) { toast('无箓入洞天＝邪魔，诸神见之则诛'); return; }
    S.xianghuo -= g.cost;
    S.inDongtian = !S.inDongtian;
    if (S.inDongtian) bump('gate');
    logLine(S.inDongtian ? `过${g.name}，入洞天。` : `过${g.name}，归阳世。`, '');
    closeModal(); render();
  };

  /* ---------- 情缘 ---------- */
  /* ---------- NPC 台词取用 ----------
     旧版「论道」只记「好感 +4」，一句台词都没有。
     而 D.NPC_POOL 里本来就有 look/inner/likes/taboo——素材都在，只是没说出来。 */
  function npcStageLines(n) {
    const fav = (S.npcs[n.id] || {}).fav || 0;
    const stages = (n.stages || []).slice().sort(function (a, b) { return b.min - a.min; });
    for (let i = 0; i < stages.length; i++) {
      if (fav >= stages[i].min) return stages[i].lines || [];
    }
    return (stages[stages.length - 1] || {}).lines || [];
  }
  function npcCtxLine(n, kind) {
    const c = (n.ctx || {})[kind];
    return c && c.length ? pick(c) : '';
  }
  /* 首次见面：把 meet 的两段说出来 */
  function npcMeet(n) {
    const rec = S.npcs[n.id] || (S.npcs[n.id] = { fav: 0, met: false });
    if (rec.met) return false;
    rec.met = true;
    if (rec.since === undefined) rec.since = S.turn || 0;   // ren_100y 要靠它
    if (rec.alive === undefined) rec.alive = true;
    const mt = n.meet || [];
    let b = '<div class="npcmeet">';
    b += '<div class="nm-name">' + esc(n.name) + '<span class="muted small">　' + esc(n.role) + '</span></div>';
    mt.forEach(function (t) {
      b += '<div class="nm-line">' + esc(t) + '</div>';
    });
    b += '<div class="nm-look">' + esc(n.look || '') + '　' + esc(n.inner || '') + '</div>';
    b += '</div>';
    b += '<div style="margin-top:10px"><button class="btn" data-act="modal:close">记下了</button></div>';
    openModal('初见 · ' + n.name, b);
    logLine('遇见' + n.name + '。' + (n.role || ''), '');
    return true;
  }

  /* ============================================================
     v8.1 P0 M4：师徒
     四条出路都要能结算：授业（涨进度）/ 出师（独立门户）/ 叛师 / 先死。
     与情缘 NPC 刻意分两套数据：师徒走 S.disciples，好感走 S.npcs[id].fav。
     共用一套会让「这个人是我的徒弟还是我的道侣」在存档里无法区分。
     ============================================================ */
  ACT.openDisciple = () => {
    const list = discipleList();
    let b = '<div class="statline"><span class="k">门下</span><span class="v">' +
      list.length + ' / ' + discipleLimit() + '</span></div>';
    b += '<div class="small muted">师徒是人锚的一种。教出来的，比捡来的近。</div>' + divider();

    if (!list.length) {
      b += '<div class="small muted">门下无人。要收徒，先得有个愿意磕头的人——去情缘里找一个信你的。</div>' + divider();
    } else {
      list.forEach(function (d) {
        const st = discipleStageOf(d);
        const tier = favorTier(d.bond || 0);
        b += '<div class="npcline">' + esc(d.name) + '　<span class="muted">' +
          esc(st.name) + ' · ' + esc(tier) + '（' + Math.round(d.bond || 0) + '）· 已教 ' +
          (d.days || 0) + '</span></div>';
        b += '<div class="small muted">' + esc(st.note) + '</div>';
        b += '<ul class="opts">';
        b += optRowX('·', '授业一次', { name: '教', cls: 'peace' }, '进度 +30 · 亲密 +8', false,
          'do;dpteach:' + d.id, { xun: 1 });
        const canGrad = st.key === 'chu';
        b += optRow('·', '准其出师', { name: '出师', cls: 'chance' },
          canGrad ? '得束脩 300 石，记入仙谱' : ('火候未到（' + esc(st.name) + '）'),
          !canGrad, 'do;dpgrad:' + d.id);
        /* v9.0 M3：留山/遣出历练/叛师由扩展补行；扩展未加载时这一行是空串。 */
        const _XR = (G.WXCS3_EXT && G.WXCS3_EXT.discipleRows) ? G.WXCS3_EXT.discipleRows(d) : '';
        if (_XR) b += _XR;
        b += optRow('·', '逐出门墙', { name: '断', cls: 'risk' }, '亲密清零，记一笔逆徒', false,
          'do;dpbetray:' + d.id);
        b += '</ul>';
      });
      b += divider();
    }

    /* 收徒：从已见过且好感够的 NPC 里挑。门槛 20 = FAVOR_TIERS 的「相熟」一档，
       太低会让路边点头之交也来磕头。 */
    const _admit = discipleAdmitFav();
    const cands = Object.keys(S.npcs || {}).filter(function (id) {
      const r = S.npcs[id];
      if (!r || !r.met) return false;
      if (!r.alive) return false;
      if ((r.fav || 0) < _admit) return false;
      return !list.some(function (d) {
        if (d.npcId) return d.npcId === id;
        return d.name === (D.NPC_POOL.find(function (x) { return x.id === id; }) || {}).name;
      });
    });
    if (list.length < discipleLimit() && cands.length) {
      b += '<div class="small muted">可收为门下</div><ul class="opts">';
      cands.forEach(function (id) {
        const n = D.NPC_POOL.find(function (x) { return x.id === id; });
        if (!n) return;
        b += optRow('·', n.name, { name: '收徒', cls: 'chance' },
          '好感 ' + Math.round(S.npcs[id].fav || 0) + ' · ' + (n.role || ''),
          false, 'do;dpadd:' + id);
      });
      b += '</ul>';
    } else if (list.length < discipleLimit()) {
      b += '<div class="small muted">暂无可收之人。好感到「' + _admit + '」之上，才谈得上托付。</div>';
    } else {
      b += '<div class="small muted">门下已满（' + discipleLimit() + ' 人）。教得过来才叫教。</div>';
    }

    if ((S.disciplesOut || []).length) {
      b += divider() + '<div class="small muted">仙谱 · 已离门下</div>';
      (S.disciplesOut || []).forEach(function (x) {
        /* v9.0 M3：出路不止出师——先亡与叛去也记在谱上，只是记法不同。 */
        const _fate = x.kind === 'died' ? '亡故' : x.kind === 'betray' ? '叛去' : '出师';
        const _extra = x.kind === 'died' ? (x.cause ? '　' + esc(x.cause) : '') : ('　别时好感 ' + Math.round(x.bond || 0));
        b += '<div class="sl"><span class="k">' + esc(x.name) + '</span><span class="v">' +
          esc(x.at || '') + ' ' + _fate + _extra + '</span></div>';
      });
    }

    /* 你也可以是别人的徒弟。这一栏存在的意义是让「杀师」有真实来源。 */
    b += divider();
    if (S.masterId) {
      const mn = D.NPC_POOL.find(function (x) { return x.id === S.masterId; });
      b += '<div class="statline"><span class="k">师承</span><span class="v">' +
        esc(mn ? mn.name : '（已故）') + '</span></div>';
      b += '<div class="small muted">授业者仍在世。你若对他动手，账会记在「杀师」上。</div>';
    } else {
      const ms = Object.keys(S.npcs || {}).filter(function (id) {
        const r = S.npcs[id];
        return r && r.met && r.alive !== false && (r.fav || 0) >= 30;
      });
      if (ms.length) {
        b += '<div class="small muted">可拜为师</div><ul class="opts">';
        ms.forEach(function (id) {
          const n = D.NPC_POOL.find(function (x) { return x.id === id; });
          if (!n) return;
          b += optRow('·', '拜 ' + n.name + ' 为师', { name: '师承', cls: 'chance' },
            '好感 ' + Math.round(S.npcs[id].fav || 0), false, 'do;dpmaster:' + id);
        });
        b += '</ul>';
      } else {
        b += '<div class="small muted">无可拜之人。好感 30 之上，才有人肯收你。</div>';
      }
    }
    b += '<div class="hint">徒弟会死在你前头，也可能先对你动手。这一条路没有善终的保证。</div>';
    openModal('门下 · 授业与出师', b);
  };

  ACT.do_dpadd = (id) => {
    const n = D.NPC_POOL.find(function (x) { return x.id === id; });
    if (!n) return;
    const r = S.npcs[id];
    /* 面板只列出好感够的人，但动作本身也必须自己把关——
       面板过滤是「不给你点」，这里才是「点了也不算」。两者缺一，就有绕过路径。 */
    if (!r || !r.met) { toast('尚未见过此人'); return; }
    const _need = discipleAdmitFav();
    if (numOr(r.fav, 0) < _need) { toast('好感不足（须 ' + _need + '），其人尚未肯折腰'); return; }
    const res = discipleAdd(n.name, numOr(r.fav, 0));
    if (!res.ok) { toast(res.why); return; }
    /* v9.0 M3：师徒与情缘共用人物身份，但两套关系分开记。
       npcId 用于留山/先亡/叛师回写 NPC 状态；disciple 标记补上「收徒」成就。 */
    res.disciple.npcId = id;
    r.disciple = true;
    logLine(n.name + '跪下去，磕了三个头。你受了。', 'good');
    /* 人锚：收徒是「人」这一锚的现实来源之一 */
    S.anchors = S.anchors || {};
    S.anchors.ren = Math.max(S.anchors.ren || 0, (S.anchors.ren || 0));
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_dpteach = (id) => {
    const res = discipleTeach(id);
    if (!res.ok) { toast(res.why); return; }
    logLine('你教了一旬。他学得慢，但没走神。', '');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_dpgrad = (id) => {
    const res = discipleGraduate(id);
    if (!res.ok) { toast(res.why); return; }
    logLine(res.name + '出师了。走的时候回头看了一眼，没说话。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.do_dpbetray = (id) => {
    const res = discipleBetray(id);
    if (!res.ok) { toast(res.why); return; }
    logLine('你把他逐出门墙。他站在门外，很久才走。', 'danger');
    closeModal(); render();
  };

  ACT.do_dpmaster = (id) => {
    const res = masterTaken(id);
    if (!res.ok) { toast(res.why); return; }
    logLine('你向' + res.name + '行了礼。他受了，也没多说什么。', 'good');
    closeModal(); advanceXun(1); if (S.phase !== 'play') return render(); render();
  };

  ACT.openLove = () => {
    // 开局那位还没正式见过面——先让他说两句话
    const pend = Object.keys(S.npcs).filter(function (id) {
      const r = S.npcs[id];
      return r && !r.met && r.pendingMeet;
    });
    if (pend.length) {
      const n = D.NPC_POOL.find(function (x) { return x.id === pend[0]; });
      if (n) { S.npcs[n.id].pendingMeet = false; npcMeet(n); return; }
    }
    let b = '';
    const met = Object.keys(S.npcs).filter(id => S.npcs[id].met);
    if (!met.length) b += `<div class="small muted">你还没遇上什么人。</div>`;
    else {
      b += `<ul class="opts">`;
      for (const id of met) {
        const n = D.NPC_POOL.find(x => x.id === id);
        b += optRow('·', `${n.name}（${n.gender}·${n.role}）`, { name: favorTier(S.npcs[id].fav) === '道侣' ? '情缘' : '平和', cls: 'love' }, '好感 ' + S.npcs[id].fav, false, 'do;talk:' + id);
      }
      b += `</ul>`;
    }
    // 还能在路上遇见别人——不是一开始就全在名单里
    const unknown = D.NPC_POOL.filter(function (x) { return !S.npcs[x.id] || !S.npcs[x.id].met; });
    if (unknown.length) {
      b += divider();
      b += '<div class="small muted">还未见过的：' + unknown.length + ' 人</div>';
      b += '<ul class="opts">' + optRow('遇', '出去走走，或可遇见一个人', { name: '机缘', cls: 'chance' },
        '记入「相识」', false, 'do;meetnp:c') + '</ul>';
    }
    openModal('情缘', b);
  };

  /* 遇见新人：首次见面先说一段相遇 */
  ACT.do_meetnp = (who) => {
    const unknown = D.NPC_POOL.filter(function (x) { return !S.npcs[x.id] || !S.npcs[x.id].met; });
    if (!unknown.length) { toast('都见过了'); return; }
    // 遇到的人与境界/所在地相关：境界差太大不会出现
    const fit = unknown.filter(function (n) { return (n.realm || 0) <= S.xRealm + 2; });
    const n = pick(fit.length ? fit : unknown);
    closeModal();
    advanceXun(1);
    if (S.phase !== 'play') return render();
    // 初见是这场相遇的正戏：先推进世界，最后再把他那两句话摆出来，
    // 否则 maybeEvent 弹出的事件窗会把它盖掉。
    maybeEvent();
    render();
    if (!S.phase || S.phase === 'play') npcMeet(n);
  };

  ACT.do_talk = (id) => {
    const n = D.NPC_POOL.find(x => x.id === id);
    let b = `<div class="small">${esc(n.look)}</div>`;
    b += `<div class="small muted" style="margin:4px 0">${esc(n.inner)}</div>` + divider();
    /* v9.0 M3：高神识看得见他这一趟的来意。 */
    const _XI = G.WXCS3_EXT;
    if (_XI && _XI.npcIntentLine) {
      const _il = _XI.npcIntentLine(n, S.npcs[id]);
      if (_il) b += _il;
    }
    b += `<div class="small">喜：${n.likes.join('、')}　｜　忌：${esc(n.taboo)}</div>`;
    b += `<div class="small muted" style="margin:4px 0">讨好之道：${esc(n.approach)}</div>`;
    // 当前阶段台词：先让他说一句，再给选项
    const stLines = npcStageLines(n);
    if (stLines.length) {
      b += '<div class="npcline">' + esc(pick(stLines)) + '</div>';
    }
    b += `<ul class="opts">`;
    b += optRow('A', '论道', { name: '平和', cls: 'peace' }, '他会问你一个问题', false, 'do;ask:' + id);
    b += optRow('B', '送礼（80 灵石）', { name: '情缘', cls: 'love' }, '好感 +6~12', S.stones < 80, 'do;ia:' + id + ':gift');
    b += optRow('C', '邀约同行', { name: '风险', cls: 'risk' }, '好感 +5~15', false, 'do;ia:' + id + ':adv');
    b += `</ul>`;
    openModal(n.name, b, true);
  };

  /* 论道：真的一问一答。三个选项没有「正确答案」，但都会改变他怎么看你。 */
  ACT.do_ask = (id) => {
    const n = D.NPC_POOL.find(function (x) { return x.id === id; });
    if (!n || !n.ask) { ACT.do_ia(id, 'talk'); return; }
    let b = '<div class="npcline">' + esc(n.name) + '：「' + esc(n.ask.q) + '」</div>' + divider();
    b += '<ul class="opts">';
    n.ask.opts.forEach(function (o, i) {
      b += optRow('ABC'[i], o.t, { name: '回答', cls: 'peace' }, '他在等你', false, 'do;iaans:' + id + ':' + i);
    });
    /* v9.0 M3：高道心多一个「问心」选项——属性进选项，而不只进成功率。 */
    const _XH = G.WXCS3_EXT;
    if (_XH && _XH.askExtraRows) {
      const _xr = _XH.askExtraRows(n, id);
      if (_xr) b += _xr;
    }
    b += '</ul>';
    b += '<div class="hint">三个说法都没有对错。但你怎么答，他就怎么记你。</div>';
    openModal('论道 · ' + n.name, b);
  };

  ACT.do_iaans = (id, i) => {
    const n = D.NPC_POOL.find(function (x) { return x.id === id; });
    if (!n || !n.ask) return;
    const o = n.ask.opts[parseInt(i, 10) || 0];
    if (!o) return;
    advanceXun(1);
    if (S.phase !== 'play') { closeModal(); return render(); }
    const rec = S.npcs[id] || (S.npcs[id] = { fav: 0, met: true });
    let d = o.fav || 3;
    if (S.talents.includes('peach')) d = Math.round(d * 1.2);
    if (hasDebuff('debt_weight')) d = Math.max(1, Math.round(d * 0.7));   // 人情压身：处不熟
    const favBefore = rec.fav || 0;
    rec.fav = clamp(rec.fav + d, 0, 120);
    rec.answers = (rec.answers || 0) + 1;
    bumpIn('talk', id);                                   // 「论道百回」按人计数
    /* v9.0 M3：论道也是道统声望的来源——同一人每月只记一次，防止刷声望。 */
    const _XT = G.WXCS3_EXT;
    if (_XT && _XT.schoolOnTalk) _XT.schoolOnTalk(n, id);
    /* v9.0 M4：交情够深，对方会说起一处古遗迹。每人只提一次。 */
    if (_XT && _XT.onNpcTalk) _XT.onNpcTalk(n, id, rec);
    if (favBefore <= -60 && rec.fav >= 40) bump('enemyToFriend');   // 「化敌」
    /* 相识年数从第一次见面起算，给「故人」用 */
    if (rec.since === undefined) rec.since = S.turn || 0;
    // 把对话展示出来，而不是只记一笔账
    let b = '<div class="npcmeet">';
    b += '<div class="nm-name">' + esc(n.name) + '</div>';
    b += '<div class="nm-line">「' + esc(o.t) + '」——你说。</div>';
    b += '<div class="nm-line">' + esc(o.reply) + '</div>';
    b += '<div class="nm-look">好感 +' + d + '</div>';
    b += '</div>';
    b += '<div style="margin-top:10px"><button class="btn" data-act="modal:close">告辞</button></div>';
    logLine('与' + n.name + '论道。' + o.reply, '');
    openModal('论道 · ' + n.name, b);
    S.visitorIncoming = true;   // 这次交谈就算「有人来过」
    render();
  };

  ACT.do_ia = (id, kind) => {
    closeModal();
    const n = D.NPC_POOL.find(x => x.id === id);
    advanceXun(1);
    if (S.phase !== 'play') return render();
    let d = 0;
    if (kind === 'talk') d = 2 + rnd(4);
    else if (kind === 'gift') { if (S.stones < 80) { toast('灵石不足'); return; } S.stones -= 80; d = 6 + rnd(7); }
    else { if (rng() < 0.7) d = 5 + rnd(11); else { d = 2; S.hp = Math.max(1, S.hp - Math.round(S.hpMax*0.2)); } }
    if (S.talents.includes('peach')) d = Math.round(d * 1.2);
    const favBefore2 = S.npcs[id].fav || 0;
    S.npcs[id].fav = clamp(S.npcs[id].fav + d, 0, 120);
    if (kind === 'talk') bumpIn('talk', id);
    if (favBefore2 <= -60 && S.npcs[id].fav >= 40) bump('enemyToFriend');
    if (S.npcs[id].since === undefined) S.npcs[id].since = S.turn || 0;
    // 让他说句话，而不是只记「好感 +N」
    let line = '';
    if (kind === 'gift') line = npcCtxLine(n, 'together') || ('「收下了。」' + n.name + '把东西收进袖里。');
    else if (kind === 'adv') line = npcCtxLine(n, 'together');
    else line = npcStageLines(n)[0] || '';
    if (line) logLine(`${n.name}：${line}（好感 +${d}）`, '');
    else logLine(`与${n.name}相处，好感 +${d}`, '');
    maybeEvent(); render();
  };

  /* ============================================================
     v8.0 NPC 主动事件
     ------------------------------------------------------------
     旧版 NPC 只是一份「你去点他」的名单：没人会主动来找你，
     好感涨到 120 也不会发生任何事。这里补上月度主动来访——
     重伤、突破、婚约、生肖相冲，以及伤重不治后的葬礼。
     一次只挂一件（S.npcCall），在常驻区提示，不硬顶掉当前面板。
     ============================================================ */
  const ZODIAC_NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  /* 玩家生肖由生年推：年 − 岁 = 生年，(生年−4) mod 12 即位次 */
  function playerZodiac() {
    const by = S.year - S.age;
    return ZODIAC_NAMES[(((by - 4) % 12) + 12) % 12];
  }
  function npcRec(id) {
    if (!S.npcs[id]) S.npcs[id] = { fav: 0, met: true };
    const r = S.npcs[id];
    if (r.alive === undefined) r.alive = true;
    if (r.mate === undefined) r.mate = false;
    if (r.injured === undefined) r.injured = false;
    if (r.lastCall === undefined) r.lastCall = 0;
    /* 相识年数：ren_100y 一直不可达，就是因为这个字段从没写过 */
    if (r.since === undefined) r.since = S.turn || 0;
    return r;
  }
  function npcHasMate() {
    return Object.keys(S.npcs || {}).some(function (id) { return (S.npcs[id] || {}).mate; });
  }

  /* 每月一次：先看有没有人熬不过去，再决定这个月谁来敲门 */
  function tickNpcEvents() {
    if (S.npcCall) return;
    const ids = Object.keys(S.npcs || {}).filter(function (id) {
      const r = S.npcs[id];
      return r && r.met && r.alive !== false;
    });
    if (!ids.length) return;
    for (const id of ids) {
      const r = npcRec(id);
      if (r.injured && rng() < 0.12) {
        const n = D.NPC_POOL.find(function (x) { return x.id === id; }) || { name: id };
        r.alive = false;
        S.npcCall = { id: id, kind: 'funeral' };
        logLine('噩耗传来：' + n.name + '没能熬过这个冬天。', 'danger');
        return;
      }
    }
    /* 主动来访：好感越高越常来，同一人至少隔十个月，已结道侣的走日常不再走事件 */
    const pool = ids.filter(function (id) {
      const r = npcRec(id);
      return (S.turn - (r.lastCall || 0)) >= 10 && !r.mate;
    });
    if (!pool.length) return;
    const id = pick(pool);
    const r = npcRec(id);
    const n = D.NPC_POOL.find(function (x) { return x.id === id; }) || { id: id, name: id };
    const chance = clamp(0.02 + r.fav / 1600, 0.02, 0.08);
    if (rng() > chance) return;
    r.lastCall = S.turn;

    let kind = 'hurt';
    const clashWith = D.ZODIAC_CLASH[playerZodiac()];
    if (r.fav >= 60 && !npcHasMate() && rng() < 0.3) kind = 'marry';
    else if (clashWith && clashWith === n.zodiac && rng() < 0.5) kind = 'clash';
    else if (rng() < 0.45) kind = 'break';
    S.npcCall = { id: id, kind: kind };
    logLine(n.name + '来找你了。', '');
  }

  ACT.openNpcCall = () => {
    const c = S.npcCall;
    if (!c) { toast('无人来访'); return; }
    const n = D.NPC_POOL.find(function (x) { return x.id === c.id; }) || { id: c.id, name: c.id, role: '' };
    const r = npcRec(c.id);
    let b = '';
    const line = function (kind) {
      const t = npcCtxLine(n, kind);
      return t ? '<div class="nm-line">' + esc(t) + '</div>' : '';
    };
    if (c.kind === 'hurt') {
      b += '<div class="small">' + esc(n.name) + '站在门口，脸色白得不像话，衣裳下摆是暗的。</div>';
      b += line('hurt');
      b += divider() + '<ul class="opts">';
      const hasPill = (S.bag.heal || 0) > 0;
      b += optRow('A', hasPill ? '拿疗伤药出来（耗 1 枚）' : '拿出 300 灵石去抓药',
        { name: '仁', cls: 'peace' }, '好感 +14 · 功德 +12',
        !hasPill && S.stones < 300, 'do;npc:heal');
      b += optRow('B', '只留一句话，不插手', { name: '冷', cls: 'warn' },
        '好感 −12 · 业力 +6 · 伤会拖下去', false, 'do;npc:leave');
      b += '</ul>';
    } else if (c.kind === 'break') {
      b += '<div class="small">' + esc(n.name) + '说他要闭一次死关，问你肯不肯在外面守三日。</div>';
      b += line('break');
      b += divider() + '<ul class="opts">';
      b += optRow('A', '在洞口守三日', { name: '义', cls: 'peace' },
        '好感 +18 · 悟道 +20 · 三成自己受伤', false, 'do;npc:guard');
      b += optRow('B', '推说有事', { name: '冷', cls: 'warn' },
        '好感 −10 · 两成他会走岔', false, 'do;npc:refuse');
      b += '</ul>';
    } else if (c.kind === 'marry') {
      b += '<div class="small">' + esc(n.name) + '把一枚旧簪放在你案上，什么也没说，站着等你开口。</div>';
      b += line('together');
      b += divider() + '<ul class="opts">';
      b += optRow('A', '应下', { name: '缘', cls: 'love' },
        npcHasMate() ? '你已有道侣' : '结为道侣 · 好感至 120 · 功德 +20',
        npcHasMate(), 'do;npc:marry');
      b += optRow('B', '把簪推回去', { name: '冷', cls: 'warn' },
        '好感 −16 · 业力 +10', false, 'do;npc:reject');
      b += '</ul>';
    } else if (c.kind === 'clash') {
      const z = playerZodiac();
      b += '<div class="small">你属' + esc(z) + '，' + esc(n.name) + '属' + esc(n.zodiac || '？') +
        '。有人提了一句「六冲」，这话就传开了。</div>';
      b += line('part');
      b += divider() + '<ul class="opts">';
      b += optRow('A', '请人做一场禳解（500 灵石）', { name: '和', cls: 'peace' },
        '好感 +10 · 冲解', S.stones < 500, 'do;npc:resolve');
      b += optRow('B', '顺势疏远', { name: '冷', cls: 'warn' },
        '好感 −8', false, 'do;npc:drift');
      b += '</ul>';
    } else {
      b += '<div class="small">' + esc(n.name) + '走了。丧仪定在三日后，乡里在等他家里人的一句话。</div>';
      b += divider() + '<div class="small muted">他最后留下的东西不多：一件旧衣，一只没喝完的酒盏。</div>';
      b += divider() + '<ul class="opts">';
      b += optRow('A', '去送他一程', { name: '义', cls: 'peace' }, '功德 +30 · 记入功过格', false, 'do;npc:mourn');
      b += optRow('B', '不去', { name: '冷', cls: 'warn' }, '业力 +12', false, 'do;npc:skip');
      b += '</ul>';
    }
    openModal('来访 · ' + n.name, b);
  };

  ACT.do_npc = (choice) => {
    const c = S.npcCall;
    if (!c) return;
    const n = D.NPC_POOL.find(function (x) { return x.id === c.id; }) || { id: c.id, name: c.id };
    const r = npcRec(c.id);
    S.npcCall = null;
    closeModal();
    const say = function (t) { logLine(n.name + '：' + t, ''); };

    if (c.kind === 'hurt') {
      if (choice === 'heal') {
        if ((S.bag.heal || 0) > 0) { S.bag.heal--; }
        else if (S.stones >= 300) { S.stones -= 300; ledgerAdd('out', '抓药', 300); }
        else { toast('灵石不足'); S.npcCall = c; return; }
        r.fav = clamp(r.fav + 14, 0, 120);
        r.injured = false;
        S.merit += 12;
        say('这条命，我记着。');
        logLine('你替' + n.name + '处理了伤口。好感 +14，功德 +12。', 'good');
      } else {
        r.fav = Math.max(0, r.fav - 12);
        r.injured = true;
        S.karma += 6;
        say('……我明白了。');
        logLine('你没有插手。' + n.name + '的伤拖了下去。好感 −12，业力 +6。', 'danger');
      }
    } else if (c.kind === 'break') {
      if (choice === 'guard') {
        r.fav = clamp(r.fav + 18, 0, 120);
        S.insightXp = (S.insightXp || 0) + 20;
        if (rng() < 0.3) {
          S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.25));
          logLine('洞外有人来过。你替他挡了一下，气血 −25%。', 'danger');
        }
        say('三日。多谢。');
        logLine('你替' + n.name + '守了三日。好感 +18，悟道 +20。', 'good');
      } else {
        r.fav = Math.max(0, r.fav - 10);
        if (rng() < 0.2) {
          r.injured = true;
          logLine(n.name + '出关时不对，走岔了。', 'danger');
        } else {
          logLine('你没有去。' + n.name + '一个人闭了关。好感 −10。', '');
        }
      }
    } else if (c.kind === 'marry') {
      if (choice === 'marry') {
        if (npcHasMate()) { toast('你已有道侣'); S.npcCall = c; return; }
        r.mate = true;
        r.fav = 120;
        S.merit += 20;
        say('那就这样吧。');
        logLine('你与' + n.name + '结为道侣。', 'good');
        toast('道侣 · ' + n.name);
      } else {
        r.fav = Math.max(0, r.fav - 16);
        S.karma += 10;
        say('……好。');
        logLine('你把簪推了回去。' + n.name + '收得很快。好感 −16，业力 +10。', 'danger');
      }
    } else if (c.kind === 'clash') {
      if (choice === 'resolve') {
        if (S.stones < 500) { toast('灵石不足'); S.npcCall = c; return; }
        S.stones -= 500;
        ledgerAdd('out', '禳解', 500);
        r.fav = clamp(r.fav + 10, 0, 120);
        logLine('一场禳解，话头就此压下去。好感 +10。', 'good');
      } else {
        r.fav = Math.max(0, r.fav - 8);
        logLine('你没有解释。往来渐渐稀了。好感 −8。', '');
      }
    } else {
      if (choice === 'mourn') {
        S.merit += 30;
        bump('npcFuneral');
        /* 功过格「白头」：他从初见走到老死，你一次境都没破过 */
        if ((S.xRealm || 0) === 0 && (S.pillar || 0) === 0) bump('npcFuneralSameRealm');
        logLine('你送' + n.name + '走完了最后一程。功德 +30。', 'good');
      } else {
        S.karma += 12;
        logLine('你没有去。丧仪照常办了。业力 +12。', 'danger');
      }
      r.funeral = true;
    }
    advanceXun(1);
    if (S.phase !== 'play') return render();
    render();
  };

  /* ============================================================
     v8.0 自由行动 · 意图引擎
     ------------------------------------------------------------
     旧版这里是 if/else 六条正则：打坐、显圣、偷、杀、救、练功，
     其余全部落到 else——「做了一月，没落下什么」。
     玩家写「去后山采药」和写「今天想睡个懒觉」得到同一句话，
     等于在告诉他：你打的字不算数。
     ------------------------------------------------------------
     现在：30 类意图 × 3~4 种结果 × 境界分层。
     匹配用「最长关键词优先」，所以「采药」不会被「药」字抢走。
     认不出来的输入也不打发人：会照他写的字回一句话。
     ============================================================ */
  function matchIntent(txt) {
    const t = String(txt || '');
    let best = null, bestScore = 0;
    for (const it of (D.INTENTS || [])) {
      /* 完整词优先：长度越具体分越高，句首再加权 */
      for (const k of it.keys) {
        const at = t.indexOf(k);
        if (at < 0) continue;
        const sc = k.length * 10 + (at === 0 ? 6 : 0);
        if (sc > bestScore) { bestScore = sc; best = it; }
      }
      /* 单字软匹配：只用来兜「喝点酒」「写首诗」这类说法，
         分值固定很低，绝不会盖过任何完整词 */
      for (const k of (it.soft || [])) {
        if (t.indexOf(k) < 0) continue;
        const sc = 5 + (t.indexOf(k) === 0 ? 1 : 0);
        if (sc > bestScore) { bestScore = sc; best = it; }
      }
    }
    return best;
  }

  function pickIntentOutcome(it) {
    const tier = myRealmIdx();
    let pool = it.outs.filter(function (o) {
      return o.minT == null || tier >= o.minT;
    });
    if (!pool.length) pool = it.outs.slice();
    let total = 0;
    pool.forEach(function (o) { total += (o.w || 1); });
    let r = rng() * total;
    for (const o of pool) {
      r -= (o.w || 1);
      if (r <= 0) return o;
    }
    return pool[pool.length - 1];
  }

  /* 把意图效果的数值落地，返回给玩家看的一串短记 */
  function applyIntentEff(eff) {
    if (!eff) return [];
    const out = [];
    const add = function (label, n) { if (n) out.push(label + (n > 0 ? ' +' : ' ') + n); };
    if (eff.xiuweiMul && (isXian() || S.cultivation === 'both')) {
      const g = Math.round(monthXiuwei() * eff.xiuweiMul);
      if (g > 0) { S.xiuwei += g; add('修为', g); }
    }
    if (eff.stones) {
      S.stones = Math.max(0, S.stones + eff.stones);
      add('灵石', eff.stones);
      ledgerAdd(eff.stones > 0 ? 'in' : 'out', '闲事', Math.abs(eff.stones));
    }
    if (eff.hp) {
      S.hp = clamp(S.hp + eff.hp, 0, S.hpMax);
      add('气血', eff.hp);
    }
    if (eff.hpPct) {
      const d = Math.round(S.hpMax * eff.hpPct);
      S.hp = clamp(S.hp + d, 0, S.hpMax);
      add('气血', d);
    }
    if (eff.xh) {
      S.xianghuo = Math.max(0, S.xianghuo + eff.xh);
      add('香火', eff.xh);
    }
    if (eff.followers) {
      S.followers = Math.max(0, Math.min(followLimit(), S.followers + eff.followers));
      add('信众', eff.followers);
    }
    if (eff.piety) {
      S.piety = clamp(S.piety + eff.piety, 0.5, 2.0);
      out.push('虔诚 ' + (eff.piety > 0 ? '+' : '') + eff.piety);
    }
    if (eff.merit) { S.merit = Math.max(0, S.merit + eff.merit); add('功德', eff.merit); }
    if (eff.karma) { S.karma = Math.max(0, S.karma + eff.karma); add('业力', eff.karma); }
    if (eff.fame) { S.fame = Math.max(0, S.fame + eff.fame); add('声望', eff.fame); }
    if (eff.insightXp) { S.insightXp = (S.insightXp || 0) + eff.insightXp; add('悟道', eff.insightXp); }
    ['heart', 'insight', 'qualify', 'fate', 'sense', 'speed'].forEach(function (k) {
      if (eff[k]) {
        const nm = { heart: '道心', insight: '悟性', qualify: '资质', fate: '机缘', sense: '神识', speed: '身法' }[k];
        S.stats[k] = clamp((S.stats[k] || 8) + eff[k], 1, 20);
        add(nm, eff[k]);
      }
    });
    if (eff.mat) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === eff.mat[0]; });
      addMat(eff.mat[0], eff.mat[1] || 1);
      out.push('得' + (it ? it.name : eff.mat[0]) + '×' + (eff.mat[1] || 1));
    }
    if (eff.fav) {
      const met = Object.keys(S.npcs || {}).filter(function (k) {
        return S.npcs[k] && S.npcs[k].met && S.npcs[k].alive !== false;
      });
      if (met.length) {
        const id = pick(met);
        const r = npcRec(id);
        r.fav = clamp((r.fav || 0) + eff.fav, -100, 120);
        const n = D.NPC_POOL.find(function (x) { return x.id === id; });
        out.push((n ? n.name : '故人') + '好感 ' + (eff.fav > 0 ? '+' : '') + eff.fav);
      }
    }
    /* v10.6：两条新键，为「事件也能落物、落因果」。
       art 给法宝（旧版事件只能给材料，写「得旧物」就成了空话）；
       flag 给后续事件当条件——when.flag 一直在读，此前却没有人写。 */
    if (eff.art) {
      const a = D.ARTIFACT_EXT.find(function (x) { return x.id === eff.art; });
      if (a) {
        S.arts = S.arts || [];
        S.arts.push(a.id);
        out.push('得' + a.name);
      }
    }
    if (eff.flag) {
      S.flags = S.flags || {};
      S.flags[eff.flag] = 1;
    }
    return out;
  }

  /* 认不出来的输入：也要照着他写的字回一句，而不是一句「没落下什么」 */
  const FREE_FALLBACK = [
    '一月既往，事未成，所以未成，汝亦不能言。',
    '初以为易。及动手，方知是不难，非是易。',
    '无阻之者，事竟成。人莫之知，亦无须知。',
    '半途而止。所以止之由，后亦不复记。',
    '此月遂过。山中日月，素来如是，作与不作，日皆照常西沉。'
  ];

  ACT.do_free = () => {
    const el = document.getElementById('in-free');
    const txt = el ? el.value.trim() : '';
    if (!txt) { toast('写下你想做的事'); return; }
    closeModal();
    const it = matchIntent(txt);
    advanceXun(1);
    if (S.phase !== 'play') return render();

    if (!it) {
      const line = '你' + txt + '。' + pick(FREE_FALLBACK);
      maybeEvent();
      logLine(line, '');     // 记在随机事件之上：玩家做的事要看得见
      return render();
    }
    const o = pickIntentOutcome(it);
    const notes = applyIntentEff(o.eff);
    const cls = o.cls || (notes.some(function (n) { return /\+/.test(n); }) ? 'good' : '');
    /* 正文 + 小字记账：正文负责味道，括号负责让玩家知道发生了什么 */
    const line = o.text + (notes.length ? '（' + notes.join('，') + '）' : '');
    /* v8.0：造业到一定程度，总有人记着。
       这条线把「业力」接到「仇家」上，再接到「寻仇」上——三段原本互不相干的东西串成一个回路。 */
    if (!S.enemy && S.karma >= 50 && rng() < 0.12) {
      S.enemy = true;
      S.enemyName = pick(['苦主之子', '同门的兄弟', '游方剑客', '货郎的雇主', '那家人的长兄']);
      logLine('有人在暗处记下了你的样子。', 'danger');
    }
    /* 先让随机事件记账，再把玩家的行动记到最上面——
       否则一进事件流，自己做的事就被一件不相干的事压下去了 */
    maybeEvent();
    logLine(line, cls);
    render();
  };

  /* ---------- 存档：本地槽位 + 导入导出 ---------- */
  const SAVE_KEY = 'wxcs3_save';        // 自动存档（兼容旧存档键）
  const SLOT_META = 'wxcs3_slots';      // 槽位元数据
  const SLOT_N = 5;
  const slotKey = (i) => 'wxcs3_slot_' + i;

  function slotMeta() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(SLOT_META) || '{}'); } catch (e) { m = null; }
    return (m && typeof m === 'object') ? m : {};
  }
  function slotWriteMeta(i, meta) {
    const m = slotMeta();
    if (meta) m[i] = meta; else delete m[i];
    try { localStorage.setItem(SLOT_META, JSON.stringify(m)); } catch (e) { }
  }
  function slotRead(i) {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) return null;
    try { const o = JSON.parse(raw); return o && o.state ? o.state : o; } catch (e) { return null; }
  }

  /* 把局面打包成能导入导出的信封 */

  /* 读回来时补齐缺失字段，免得旧档 / 残档把引擎打崩 */
  /* ---------- v10.7 阶段二：本命独立化迁移 ----------
     旧档 S.benming = {artId, name, tier, xp, dmg}：本命只是「某件普通法器的认主」，
     与 S.arts/装备槽绑死。新结构 ver:2 不再引用普通法器，按物映射器形、保留培养。
     迁移一次性、幂等：二次读档结果完全一致；不删普通物品、不重复发材料。 */
  const NATAL_ART_FORMS = {
    jiuzhuan: 'sword', wanyePiu: 'banner', wanlingfan: 'banner',
    taiyinBao: 'mirror', guixibao: 'bell', qingyezhou: 'mirror'
  };
  function natalElKey(S2) {
    const e = (S2 && S2.rootEls && S2.rootEls[0]) || null;
    if (e && (D.ELEMENTS[e] || D.MUT_ELEMENTS[e])) return e;
    return 'metal';
  }
  function migrateBenming(b, S2) {
    if (!b || typeof b !== 'object') return null;
    const forms = D.NATAL_FORMS || [];
    const hasForm = function (id) { return forms.some(function (f) { return f.id === id; }); };
    const out = (b.ver === 2) ? b : {
      ver: 2,
      form: NATAL_ART_FORMS[b.artId] || 'sword',
      el: natalElKey(S2),
      name: b.name || '',
      tier: parseInt(b.tier, 10) || 1,
      xp: Number(b.xp) || 0,
      dmg: Number(b.dmg) || 0,
      quality: 'normal',
      forgedRealm: 2,
      skillsUsed: 0,
      legacyArtId: b.artId || null
    };
    /* 字段残缺按安全默认值修复（不因为一个坏字段把整件本命丢掉） */
    out.ver = 2;
    if (!hasForm(out.form)) out.form = NATAL_ART_FORMS[out.legacyArtId] || 'sword';
    if (!out.el || !(D.ELEMENTS[out.el] || D.MUT_ELEMENTS[out.el])) out.el = natalElKey(S2);
    out.name = String(out.name || '');
    out.tier = clamp(parseInt(out.tier, 10) || 1, 1, 4);
    out.xp = clamp(Number(out.xp) || 0, 0, 100);
    out.dmg = Math.max(0, Number(out.dmg) || 0);
    if (!out.quality) out.quality = 'normal';
    out.forgedRealm = clamp(parseInt(out.forgedRealm, 10) || 2, 1, 9);
    out.skillsUsed = Math.max(0, parseInt(out.skillsUsed, 10) || 0);
    return out;
  }

  function applyState(st) {
    if (!st || typeof st !== 'object') { toast('存档内容无效'); return false; }
    const base = newGame();
    const out = Object.assign(base, st);
    out.stats = Object.assign(baseStats(), st.stats || {});
    out.bag = Object.assign({ pillHp: 0, pillMp: 0, heal: 0 }, st.bag || {});
    out.anchors = Object.assign({ wu: 1, ren: 1, shi: 1, yi: 1 }, st.anchors || {});
    out.anchorMiss = Object.assign({ wu: 0, ren: 0, shi: 0, yi: 0 }, st.anchorMiss || {});
    // v8.0：神器与愿物是后加字段，旧档没有。dock/dockItems 会直接读，
    // 缺了就是 undefined.staff → 一进游戏 render 抛错、整屏冻住。
    out.dArt = Object.assign({ staff: 0, mirror: 0, seal: 0 }, st.dArt || {});
    out.votive = Object.assign({}, st.votive || {});
    out.dockOpen = Object.assign({}, st.dockOpen || {});
    /* v8.1 P0 M4：御兽字段是后加的。旧档只有布尔 S.yaoshou ——
       「妖物认了你」这个布尔本身就是一头兽，只是从来没进过兽栏。
       显式把它抬成一头狐妖（最常见的那类），而不是靠默认值把它丢掉：
       老玩家读档后不该发现自己洞口那只不见了。 */
    if (!Array.isArray(out.barn)) out.barn = [];
    if (out.yaoshou && out.barn.length === 0) {
      out.barn.push({ id: 'huyao', name: '狐妖', el: 'wood', bond: 20, power: 1 });
    }
    out.yaoshou = out.barn.length > 0;
    if (typeof out.beastBond !== 'number') out.beastBond = out.barn.length ? (out.barn[0].bond || 0) : 0;
    if (typeof out.beastPower !== 'number') out.beastPower = out.barn.length ? (out.barn[0].power || 1) : 1;
    /* v8.1 P0 M4：师徒字段同理，缺就是没徒弟，但不能是 undefined */
    if (!Array.isArray(out.disciples)) out.disciples = [];
    if (out.masterId === undefined) out.masterId = null;
    /* v9.0 M3：师徒四出路与道统/时限事件。
       老档的弟子没有 npcId —— 按名字回填一次，顺便补上「收徒」成就所需的
       S.npcs[id].disciple 标记（旧版从没写过，于是这条成就一直挂着）。
       读档时刻的时限事件是临场窗口，不继承；已完成记录保留。 */
    if (!Array.isArray(out.disciplesOut)) out.disciplesOut = [];
    out.disciplesOut.forEach(function (x) { if (x && !x.kind) x.kind = 'graduate'; });
    out.disciples.forEach(function (d) {
      if (!d || typeof d !== 'object') return;
      if (!d.stay) d.stay = false;
      let nid = d.npcId;
      if (!nid) {
        const nn = (D.NPC_POOL || []).find(function (x) { return x.name === d.name; });
        if (nn) nid = d.npcId = nn.id;
      }
      if (nid && out.npcs && out.npcs[nid]) out.npcs[nid].disciple = true;
    });
    out.school = (st.school && typeof st.school === 'object') ? st.school : null;
    out.timedDone = (st.timedDone && typeof st.timedDone === 'object') ? st.timedDone : {};
    out.timed = null;
    out.tribLock = clamp(parseInt(st.tribLock, 10) || 0, 0, 9);
    /* v9.0 M0：存档带随机种子。
       新局写入一个 seed，读档时按它恢复序列——同一存档重放同一段剧情，
       结果一致。旧档没有 seed 就补一个（补的是当时的随机，不追溯）。 */
    if (!out.seed) out.seed = (Math.floor(Math.random() * 1e9) + 1);
    out.trib = null;    // 天劫是临场状态，读档不继承
    /* v9.0 M1：道痕命格。旧档无命格按未择痕处理；fengUntil（折骨风余伤的
       绝对旬数）直接沿用旧值，过期自动失效，无需迁移。 */
    out.fate = st.fate || null;
    out.fateReroll = st.fateReroll || 0;
    /* v9.0 M4：遗迹与道果都是后加字段。探索到一半的进度要能读回来；
       已探尽/已拿遗物按 id 保留；道果只在创角前存在，读过就照旧。 */
    out.ruin = (st.ruin && typeof st.ruin === 'object') ? st.ruin : null;
    out.ruinsKnown = (st.ruinsKnown && typeof st.ruinsKnown === 'object') ? st.ruinsKnown : {};
    out.ruinsCleared = (st.ruinsCleared && typeof st.ruinsCleared === 'object') ? st.ruinsCleared : {};
    out.relics = Array.isArray(st.relics) ? st.relics.slice() : [];
    out.daoFruit = (st.daoFruit && typeof st.daoFruit === 'object') ? st.daoFruit : null;
    /* v9.0 M2：外物有命。旧档无本命按未认主处理；主战兽栏序号越界归零；
       beastFedMonth 缺省 0＝从没喂过，第一个月结就会开始饥饿倒计时，
       与「旧档灵兽从无喂养记录」的语义一致。 */
    out.benming = migrateBenming(st.benming, out);
    if (Array.isArray(out.barn) && out.barn.length) {
      out.warBeast = clamp(parseInt(st.warBeast, 10) || 0, 0, out.barn.length - 1);
    } else { out.warBeast = 0; }
    out.beastOfficer = !!st.beastOfficer;
    out.beastFedMonth = parseInt(st.beastFedMonth, 10) || 0;
    /* v8.1 P0 M2：淬体存档迁移。
       只补「尚未写进气血的阶差」，两端同乘一个增量倍率 —— hp / hpMax 比值不变，
       伤势等级不漂移；quenchApplied === quench 时整段跳过，不重复复利。
       旧档无 quench 字段，按 0 处理，等于整段不执行。 */
    out.quench = clamp(parseInt(st.quench, 10) || 0, 0, D.QUENCH.length);
    out.quenchApplied = clamp(parseInt(st.quenchApplied, 10) || 0, 0, out.quench);
    if (out.quench > out.quenchApplied) {
      const _lo = out.quenchApplied > 0 ? D.QUENCH[out.quenchApplied - 1].hpMul : 1;
      const _qmul = D.QUENCH[out.quench - 1].hpMul / _lo;
      out.hpMax = Math.round((st.hpMax || 100) * _qmul);
      out.hp = Math.min(out.hpMax, Math.round((st.hp || 1) * _qmul));
      out.quenchApplied = out.quench;
    }
    out.dArtIdle = st.dArtIdle || 0;
    out.votMade = st.votMade || 0;
    out.votSold = st.votSold || 0;
    out.aucSell = Array.isArray(st.aucSell) ? st.aucSell : [];
    out.aucYear = st.aucYear || 0;
    out.aucFloor = st.aucFloor || 'mid';
    out.aucLot = st.aucLot || null;
    out.aucLotWon = st.aucLotWon || null;
    // 来访事件是瞬态：存档/刷新时挂着的弹窗要清掉，否则每回合都被它挡住
    out.npcCall = null;
    /* 寻仇是瞬态：读档时清掉，下次按月重新掷 */
    out.pendingVengeance = false;
    out.hdRate = 0;
    out.prep = null;   // 破境准备是临场的，读档重置
    /* v8.0 行动预算：旧档没有旬与累积器，补默认值。
       旧档的 xiuwei 是按「月」攒的，直接接上即可——旬是新的时间刻度，
       不需要把旧进度折算。 */
    out.xun = (typeof st.xun === 'number' && st.xun >= 0 && st.xun < XUN_PER_MONTH) ? st.xun : 0;
    out.xiuAcc = typeof st.xiuAcc === 'number' ? st.xiuAcc : 0;
    /* 临终状态要留：不然在读档时把「还有一口气」吞掉，等于白送一条命 */
    out.dying = st.dying || null;
    if (out.phase === 'dying' && !out.dying) out.phase = 'over';
    out.dyingUsed = !!st.dyingUsed;
    out.legacyPact = st.legacyPact || null;
    /* 老玩家不推新手引导：他们不是新手，弹出来只会烦 */
    out.tutStep = st.tutStep === undefined ? D.TUTORIAL_STEPS.length : st.tutStep;
    // v8.0：家族产业字段是后加的，旧档的 clan 里没有
    if (out.clan) {
      out.clan.ind = Object.assign({ farm: 0, work: 0, trade: 0, study: 0 }, out.clan.ind || {});
      out.clan.elder = out.clan.elder || 'jin';
    }
    // 奇遇卡死过的存档会残留 pendingEnc，不清掉的话 maybeEvent 里
    // `!S.pendingEnc` 恒为假，奇遇系统此后永久不再触发。
    out.pendingEnc = null;
    // 同一条病：传法弹窗开着时存档/刷新，pendingTx 会一直挂着，
    // maybeEvent 里 `!S.pendingTx` 恒为假 → 传法此后永久不再触发。
    out.pendingTx = null;
    // 同一条病：钩子面板开着时存档，hookPending 会一直挂着，
    // maybeEvent 里一旦据此拦截，奇遇与传法此后永久不再触发。
    out.hookPending = null;
    if (!Array.isArray(out.hooks)) out.hooks = [];
    out.hooks.forEach(function (h) {
      // 索债弹窗未处理时刷新：清掉瞬态锁，让下月能重新上门；赖账后果则保留。
      if (h && !h.done && !h.refuseDebuff) h.blocked = false;
    });
    if (!Array.isArray(out.hooksGiven)) out.hooksGiven = [];
    if (!Array.isArray(out.log)) out.log = [];
    if (!Array.isArray(out.gongfa) || !out.gongfa.length) out.gongfa = ['juqi'];
    // B2：ownedGongfa 是后加的字段，旧档里没有。三处「得功法」都是裸 push，
    // 缺了它一买书就 TypeError → render 抛错 → 界面冻结。
    if (!Array.isArray(out.ownedGongfa) || !out.ownedGongfa.length) {
      out.ownedGongfa = (out.gongfa || []).slice();
      if (out.ownedGongfa.indexOf('juqi') < 0) out.ownedGongfa.unshift('juqi');
    }
    // v6.3 迁移：修炼功法 / 术法（旧字段名 skillsKnown 保留一版兼容）
    if (!out.daogong || !D.GONGFA.find(function (g) { return g.id === out.daogong; }))
      out.daogong = (out.gongfa && out.gongfa[0]) || 'juqi';
    if (!Array.isArray(out.skillsKnown)) out.skillsKnown = [];
    if (!Array.isArray(out.skillsEquip) || !out.skillsEquip.length) out.skillsEquip = ['zhiquan'];
    out.skillsEquip = out.skillsEquip.filter(function (id) {
      return D.SKILLS.find(function (k) { return k.id === id; });
    });
    if (!out.skillsEquip.length) out.skillsEquip = ['zhiquan'];
    if (out.skillsKnown.length === 0) {
      // 旧档按境界补发已习招式，避免读档后招式一夜清空
      const shield = clamp(out.xRealm || 0, 0, 5);
      out.skillsKnown = D.SKILLS.filter(function (k) {
        if (k.lvl === 'zhen') return shield >= 4;
        if (k.lvl === 'nei') return shield >= 2;
        return true;
      }).map(function (k) { return k.id; });
    }
    /* v10.5 P0·A1：ownedGongfa 里的术法迁到 ownedArts，道基/主修回退到 dao。
       旧档若把《烈火掌》设成道基，读档后回到第一本 dao 功法，术法本身不丢。 */
    if (!Array.isArray(out.ownedArts)) out.ownedArts = [];
    {
      const _dao = [], _fa2 = [];
      (out.ownedGongfa || []).forEach(function (id) {
        const g = gongfaById(id);
        if (g && g.role === 'fa') _fa2.push('fa:' + id);
        else _dao.push(id);
      });
      if (_fa2.length) {
        out.ownedGongfa = _dao.length ? _dao : ['juqi'];
        _fa2.forEach(function (id) { if (out.ownedArts.indexOf(id) < 0) out.ownedArts.push(id); });
      }
      const _dg = gongfaById(out.daogong);
      if (!_dg || _dg.role === 'fa') out.daogong = out.ownedGongfa[0] || 'juqi';
      const _mg = gongfaById((out.gongfa || [])[0]);
      if (!_mg || _mg.role === 'fa') out.gongfa = [out.daogong];
    }
    if (!Array.isArray(out.chronicle)) out.chronicle = [];
    if (!Array.isArray(out.books)) out.books = [];
    if (!out.bookRead || typeof out.bookRead !== 'object') out.bookRead = {};
    if (typeof out.insightXp !== 'number') out.insightXp = 0;
    // v6.4 四艺
    if (!out.craft || typeof out.craft !== 'object') out.craft = { dan: 0, qi: 0, fu: 0, zhen: 0 };
    ['dan', 'qi', 'fu', 'zhen'].forEach(function (k) {
      if (typeof out.craft[k] !== 'number') out.craft[k] = 0;
    });
    if (!out.craftLv || typeof out.craftLv !== 'object') out.craftLv = { dan: 1, qi: 1, fu: 1, zhen: 1 };
    ['dan', 'qi', 'fu', 'zhen'].forEach(function (k) {
      if (typeof out.craftLv[k] !== 'number') out.craftLv[k] = 1;
    });
    if (!Array.isArray(out.learnedArts)) out.learnedArts = [];
    if (!Array.isArray(out.learnedRecipes)) out.learnedRecipes = [];
    if (!out.bagMat || typeof out.bagMat !== 'object') out.bagMat = {};
    /* 旧档迁移：修 bug 之前买的材料都躺在 bag 里，这里搬回 bagMat，不让玩家白花灵石 */
    if (out.bag && typeof out.bag === 'object') {
      Object.keys(out.bag).forEach(function (k) {
        const isMat = (D.MATERIAL_EXT || []).some(function (m) { return m.id === k; });
        if (isMat && out.bag[k] > 0) {
          out.bagMat[k] = (out.bagMat[k] || 0) + out.bag[k];
          delete out.bag[k];
        }
      });
    }
    if (!out.talismans || typeof out.talismans !== 'object') out.talismans = {};
    if (!Array.isArray(out.disks)) out.disks = [];
    if (!out.craftedQ || typeof out.craftedQ !== 'object') out.craftedQ = {};
    Object.keys(out.craftedQ).forEach(function (id) {
      if (!Array.isArray(out.craftedQ[id])) out.craftedQ[id] = [];
      out.craftedQ[id] = out.craftedQ[id].filter(function (r) {
        return r && qualityDef(r.q) && Number(r.n) > 0;
      }).map(function (r) { return { q: r.q, n: Math.floor(Number(r.n)) }; });
    });
    if (!out.dishes || typeof out.dishes !== 'object') out.dishes = { dan: 0, qi: 0, fu: 0, zhen: 0 };
    if (!out.ledger || typeof out.ledger !== 'object') out.ledger = { income: [], expense: [] };
    if (!out.market || typeof out.market !== 'object') out.market = { mul: {}, buy: {}, month: 0 };
    if (!out.market.mul || typeof out.market.mul !== 'object') out.market.mul = {};
    if (!out.market.buy || typeof out.market.buy !== 'object') out.market.buy = {};
    ['dan', 'qi', 'fu', 'zhen', 'mat'].forEach(function (k) {
      if (typeof out.market.mul[k] !== 'number') out.market.mul[k] = 1;
      if (typeof out.market.buy[k] !== 'number') out.market.buy[k] = 1;
    });
    if (!out.sellMonth || typeof out.sellMonth !== 'object') out.sellMonth = { market: 0 };
    if (typeof out.sellMonth.market !== 'number') out.sellMonth.market = 0;
    if (!out.sellCh) out.sellCh = 'market';
    if (!Array.isArray(out.goals)) out.goals = [];
    if (!Array.isArray(out.encSeen)) out.encSeen = [];
    if (out.sect && typeof out.sect !== 'object') out.sect = null;
    if (out.clan && typeof out.clan !== 'object') out.clan = null;
    if (!Array.isArray(out.daoyin)) out.daoyin = [];
    if (!Array.isArray(out.shenTong)) out.shenTong = [];
    /* v10.4 P2·11：stEquip 是后加字段。旧档没有它 → 保持「未设置」，
       语义是「拥有即全装」，行为与加这个字段之前完全一致。
       只在它存在时做一次清洗（剔除已不再持有的名字）。 */
    if (Array.isArray(out.stEquip)) {
      out.stEquip = out.stEquip.filter(function (n) { return out.shenTong.indexOf(n) >= 0; });
      if (!out.stEquip.length) out.stEquip = out.shenTong.slice();
    }
    if (!out.stKind || typeof out.stKind !== 'object') out.stKind = {};
    if (!Array.isArray(out.afterBreak)) out.afterBreak = [];
    if (!out.holdEvent) out.holdEvent = false;
    if (!out.holdEvent) out.holdEvent = false;
    if (!Array.isArray(out.talents)) out.talents = [];
    // v7.2 双轨经济：庙产、香火钱月限、香火钱零头
    if (!out.miaoUp || typeof out.miaoUp !== 'object') out.miaoUp = {};
    if (typeof out.xiangExchangeMonth !== 'number') out.xiangExchangeMonth = 0;
    if (typeof out.stoneAcc !== 'number') out.stoneAcc = 0;
    // 仙道不该有香火；旧档里若因信香漏进来，一并清掉，免得两套账混着走
    if (out.cultivation === 'xian') out.xianghuo = 0;
    if (!Array.isArray(out.rootEls)) out.rootEls = [];
    if (!out.npcs || typeof out.npcs !== 'object') out.npcs = {};
    if (!out.cave || typeof out.cave !== 'object') out.cave = { facilities: {} };
    if (!out.draft) out.draft = draftInit();
    if (typeof out.lingqiUp !== 'number') out.lingqiUp = typeof out.lingqi === 'number' ? out.lingqi : 1;
    if (typeof out.lingqiBase !== 'number') out.lingqiBase = 1;
    // v6.6：旧档没有 ach / tally。这个项目已经因为缺字段崩过一次档，
    // 兜底必须写，否则 checkAch 里 a.test(S) 抛错会让整帧渲染失败。
    if (!out.ach || typeof out.ach !== 'object') out.ach = {};
    out.tally = Object.assign(tallyInit(), (out.tally && typeof out.tally === 'object') ? out.tally : {});
    if (!out.achTab) out.achTab = 'gong';
    if (typeof out.bloodDebt !== 'number') out.bloodDebt = 0;
    if (typeof out.xRealm !== 'number') out.xRealm = 0;
    if (typeof out.pillar !== 'number') out.pillar = 0;
    if (!out.started) { toast('这份存档还没有开局'); return false; }
    S = out;
    /* v10.4 P0·3.1：读档后把功法上限奖励对齐一次。
       旧档没有 mpGfMul/lifeGfBonus 字段，先补基准再同步。 */
    if (typeof S.mpGfMul !== 'number') S.mpGfMul = 1;
    if (typeof S.lifeGfBonus !== 'number') S.lifeGfBonus = 0;
    if (typeof S.hpFlatBonus !== 'number') S.hpFlatBonus = 0;
    if (typeof S.mpFlatBonus !== 'number') S.mpFlatBonus = 0;
    if (typeof S.hpLuMul !== 'number') S.hpLuMul = 1;
    if (typeof S.mpLuMul !== 'number') S.mpLuMul = 1;
    if (typeof S.hpPermMul !== 'number') S.hpPermMul = 1;
    if (typeof S.mpPermMul !== 'number') S.mpPermMul = 1;
    /* v10.5 P0·S1：上限体系迁移。旧档的上限里已经含淬体/受箓，直接按新基数
       重算会把玩家的成长砍掉。做法是先除掉淬体乘区、反推一个「永久平加」，
       只增不减；capVer 防止重复迁移。 */
    if (!S.capVer) {
      const _baseHp = capBase('hp');
      const _baseMp = capBase('mp');
      const _qMul = Math.max(1, quenchHpMul());
      S.hpFlatBonus = Math.max(S.hpFlatBonus || 0,
        Math.max(0, Math.round((S.hpMax || 100) / _qMul - _baseHp)));
      S.mpFlatBonus = Math.max(S.mpFlatBonus || 0,
        Math.max(0, Math.round((S.mpMax || 100) - _baseMp)));
      S.capVer = 1;
    }
    syncLifeBonus();
    recalcCaps(true);
    /* v9.0 M0：读档即恢复随机序列。放在 S = out 之后，
       保证注入的是「这份存档的种子」，而不是上一份的。 */
    setSeed(S.seed);
    closeModal();
    render();
    return true;
  }

  function autoSave() {
    try {
      if (S && S.started && S.phase !== 'create') localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) { }
  }

  /* v10.3 P0：Electron 在 file:// 下没有下载管理器，a.download 既不触发下载、
     也不抛异常，旧代码于是把「什么都没有」报成「已导出」。
     判据要卡准：普通浏览器从磁盘双击打开也是 file://，但它有自己的下载管理器，
     blob 下载照常可用——一刀切拦掉反而会把能用的功能变成报错。
     所以只在「file:// + Electron」这一种组合下判定为不可用。 */
  function downloadBlocked() {
    try {
      if (location.protocol !== 'file:') return false;
      const ua = (window.navigator && window.navigator.userAgent) || '';
      return /Electron/i.test(ua);
    } catch (e) { return false; }
  }
  const NO_BRIDGE_TIP = '桌面版导出不可用：请用「系统 → 存档」菜单，或安装最新版本';

  function downloadJson(filename, obj) {
    const txt = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
    /* 桌面版走系统「另存为」，玩家知道文件到底落在哪；
       Web 版仍用 blob 下载。两边的取消/失败都要说清楚，不再一律报「已导出」 */
    const desk = window.WENDAO_DESKTOP;
    if (desk && typeof desk.saveFile === 'function') {
      desk.saveFile(filename, txt).then(function (r) {
        if (r && r.ok) toast('已导出 ' + r.path);
        else if (r && r.canceled) toast('已取消导出');
        else toast('导出失败' + (r && r.error ? '：' + r.error : ''));
      }).catch(function (e) { toast('导出失败：' + e); });
      return false;
    }
    if (downloadBlocked()) { toast(NO_BRIDGE_TIP); return false; }
    try {
      const blob = new Blob([txt], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      return true;
    } catch (e) { toast('导出失败：' + e.message); return false; }
  }

  function chooseFile(cb) {
    const desk = window.WENDAO_DESKTOP;
    if (desk && typeof desk.openFile === 'function') {
      desk.openFile().then(function (r) {
        if (r && r.ok) cb(String(r.text || ''), r.name || 'save.json');
        else if (r && r.canceled) { /* 玩家自己取消，不吵 */ }
        else toast('读取失败' + (r && r.error ? '：' + r.error : ''));
      }).catch(function (e) { toast('读取失败：' + e); });
      return;
    }
    let inp = document.getElementById('file-in');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'file-in';
      inp.accept = '.json,application/json';
      inp.style.display = 'none';
      document.body.appendChild(inp);
    }
    inp.value = '';
    inp.onchange = function () {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () { cb(String(r.result || ''), f.name || 'save.json'); };
      r.onerror = function () { toast('读取文件失败'); };
      r.readAsText(f, 'utf-8');
    };
    inp.click();
  }

  function saveToSlot(i) {
    if (!S || !S.started) { toast('还未开局，无处可存'); return; }
    try {
      localStorage.setItem(slotKey(i), JSON.stringify(envelope(S)));
      slotWriteMeta(i, buildMeta(S));
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      toast('已存入槽位 ' + i);
      logLine('存档 → 槽位 ' + i + '。', '');
      render();
    } catch (e) { toast('存档失败：' + e.message); }
  }

  /* v10.7 阶段二：读档后若破境手续未办完，回到队列继续。
     「每一步读档都能继续」不能只靠 S.afterBreak 存着却没人读。 */
  function resumeAfterBreak() {
    if (!S || S.phase !== 'play') return false;
    if (!Array.isArray(S.afterBreak) || !S.afterBreak.length) return false;
    ACT.do_afterbreak();
    return true;
  }

  function loadFromSlot(i) {
    const st = slotRead(i);
    if (!st) { toast('槽位 ' + i + ' 是空的'); return; }
    if (applyState(st)) {
      toast('已读取槽位 ' + i); logLine('读档 ← 槽位 ' + i + '。', '');
      resumeAfterBreak();
    }
  }

  /* ---------- 存档面板 ---------- */
  ACT.openSave = () => {
    const meta = slotMeta();
    let b = '';
    b += '<div class="muted small" style="margin-bottom:11px">槽位写在本机浏览器里（localStorage）。导出的 .json 才是真正能带走、能备份到硬盘的那一份。</div>';
    b += '<div class="slotlist">';
    for (let i = 1; i <= SLOT_N; i++) {
      const m = meta[i];
      const info = m
        ? '<b>' + esc(m.dao || '无名') + '</b>' +
          '<span class="muted">' + esc(m.realm || '—') + ' · ' + esc(String(m.age)) + ' 岁 · 入道 ' + esc(String(m.year)) + ' 年</span>' +
          '<span class="muted">' + esc(m.when || '') + '</span>'
        : '<b>空槽 ' + i + '</b><span class="muted">尚未使用</span>';
      b += '<div class="slot"><div class="si">' + info + '</div><div class="sb">' +
        '<button class="btn mini" data-act="do;save:' + i + '">存入</button>' +
        '<button class="btn mini ghost" data-act="do;load:' + i + '"' + (m ? '' : ' disabled') + '>读取</button>' +
        '<button class="btn mini ghost" data-act="do;exp:' + i + '"' + (m ? '' : ' disabled') + '>导出文件</button>' +
        '<button class="btn mini risk" data-act="do;del:' + i + '"' + (m ? '' : ' disabled') + '>删除</button>' +
        '</div></div>';
    }
    b += '</div>';
    b += divider();
    b += '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn ghost" data-act="do;imp">导入存档文件</button>' +
      '<button class="btn ghost" data-act="do;expall">备份全部槽位</button>' +
      '<button class="btn ghost" data-act="do;auto">读自动存档</button>' +
      '<button class="btn risk" data-act="do;reset">重置重来</button>' +
      '</div>';
    b += '<div class="hint">关页面时自动存档会再写一次。但清浏览器数据、换浏览器、换电脑都带不走它——重要进度务必导出一份 .json 放到硬盘。</div>';
    openModal('存档 · 本地槽位与导入导出', b);
  };

  ACT.save = () => { autoSave(); toast('已自动存档'); render(); };

  ACT.do_save = (i) => { saveToSlot(parseInt(i, 10) || 1); ACT.openSave(); };

  ACT.do_load = (i) => {
    try { const _t = (S && S.tally) ? S.tally : null; if (_t) _t.cheated = (_t.cheated || 0) + 1; } catch (e) {}
    if (i) { loadFromSlot(parseInt(i, 10) || 1); return; }
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { toast('没有自动存档'); return; }
    let st = null;
    try { const o = JSON.parse(raw); st = o && o.state ? o.state : o; } catch (e) { st = null; }
    if (applyState(st)) { toast('已读自动存档'); resumeAfterBreak(); }
  };

  ACT.do_auto = () => { ACT.do_load(); };

  ACT.do_del = (i) => {
    i = parseInt(i, 10) || 1;
    confirmAction('删除槽位 ' + i, '这个槽位里的进度会被永久抹去。确定？', () => {
      localStorage.removeItem(slotKey(i));
      slotWriteMeta(i, null);
      toast('槽位 ' + i + ' 已清空');
      ACT.openSave();
    });
  };

  ACT.do_exp = (i) => {
    i = parseInt(i, 10) || 1;
    const st = slotRead(i);
    if (!st) { toast('槽位 ' + i + ' 是空的'); return; }
    const nm = '问道长生v6.2_' + (st.dao || st.name || '无名') + '_' + realmNameOf(st) + '_' + stampName() + '.json';
    if (downloadJson(nm, envelope(st))) toast('已导出：' + nm);
  };

  ACT.do_expall = () => {
    const meta = slotMeta();
    const slots = {};
    for (let i = 1; i <= SLOT_N; i++) {
      const st = slotRead(i);
      if (st) slots[i] = { meta: meta[i] || buildMeta(st), save: envelope(st) };
    }
    if (!Object.keys(slots).length) { toast('还没有任何槽位可备份'); return; }
    const nm = '问道长生v6.2_全槽位备份_' + stampName() + '.json';
    if (downloadJson(nm, { format: 'wxcs3-all', version: VER, exportedAt: Date.now(), slots })) toast('已备份全部槽位');
  };

  ACT.do_imp = () => {
    chooseFile(function (txt, fname) {
      let o = null;
      try { o = JSON.parse(txt); } catch (e) { toast('这不是合法的存档文件'); return; }
      // ① 全槽位备份包
      if (o && o.slots && typeof o.slots === 'object') {
        const keys = Object.keys(o.slots);
        let hit = keys.filter(function (k) { return !!slotRead(k); });
        const doImport = function () {
          let n = 0;
          for (const k of keys) {
            const rec = o.slots[k];
            const env = (rec && rec.save) ? rec.save : rec;
            const st = (env && env.state) ? env.state : env;
            if (!st || typeof st !== 'object') continue;
            try {
              localStorage.setItem(slotKey(k), JSON.stringify(envelope(st)));
              slotWriteMeta(k, buildMeta(st));
              n++;
            } catch (e) { }
          }
          toast('已导入 ' + n + ' 个槽位');
          ACT.openSave();
        };
        if (hit.length) {
          confirmAction('覆盖存档', '备份包里含槽位 ' + hit.join('、') +
            '，本机已有内容会被覆盖。确定继续？', doImport);
        } else doImport();
        return;
      }
      // ② 单个存档
      const vchk = checkSaveVersion(o);
      if (!vchk.ok) { toast('存档无法识别：' + vchk.why); return; }
      if (vchk.why !== 'ok' && vchk.why !== '备份包') console.log('导入：' + vchk.why);
      const st = (o && o.state) ? o.state : ((o && o.save && o.save.state) ? o.save.state : o);
      if (!st || typeof st !== 'object' || st.started === undefined) { toast('文件里没有可识别的存档'); return; }
      let put = 0;
      for (let i = 1; i <= SLOT_N; i++) {
        if (!slotRead(i)) {
          try {
            localStorage.setItem(slotKey(i), JSON.stringify(envelope(st)));
            slotWriteMeta(i, buildMeta(st));
            put = i;
          } catch (e) { }
          break;
        }
      }
      applyState(st);
      toast(put ? ('已导入槽位 ' + put + ' 并载入：' + fname) : ('槽位已满，仅在本次载入：' + fname));
      resumeAfterBreak();
    });
  };

  ACT.do_reset = () => {
    confirmAction('重置', '抹去当前一切，重新创角。确定？', () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
      S = newGame(); S.draft = draftInit(); closeModal(); render();
    });
  };

  /* ---------- 系统面板（右上角入口） ---------- */
  ACT.openSys = () => {
    let b = '';
    b += '<div class="sysgrid">';
    b += '<button class="sysbtn" data-act="act:openSave"><b>存档</b><span>5 个本地槽位</span></button>';
    b += '<button class="sysbtn" data-act="do;imp"><b>导入</b><span>读取 .json</span></button>';
    b += '<button class="sysbtn" data-act="do;load"><b>读档</b><span>自动存档</span></button>';
    b += '<button class="sysbtn" data-act="act:openAch"><b>功过格</b><span>' + achStat().now + ' / ' + D.ACHIEVEMENTS.length + ' · 前世 ' + achStat().past + '</span></button>';
    b += '<button class="sysbtn" data-act="act:openChronicle"><b>年谱</b><span>纪事 / 导出</span></button>';
    b += '<button class="sysbtn" data-act="act:openHelp"><b>帮助</b><span>指令大全</span></button>';
    b += '<button class="sysbtn" data-act="act:screen"><b>面板</b><span>刷新界面</span></button>';
    b += '<button class="sysbtn danger" data-act="do;reset"><b>重置</b><span>烧页重来</span></button>';
    b += '</div>';
    b += '<div class="hint">存档写在本机浏览器（localStorage）。换机或清缓存会丢，重要进度请「存档 → 导出文件」存 .json 到硬盘。</div>';
    b += '<div class="hint">手机：浏览器菜单「添加到主屏幕」可离线玩；页面改成网络优先，下次打开会自动取新版。</div>';
    b += '<div class="hint muted">v' + esc(VER) + ' · 单文件网页版</div>';
    openModal('系统', b);
  };

  ACT.openHelp = () => {
    let b = '';
    const uRow = unlockRow(S.cultivation === 'shen' ? 'shen' : 'xian', S.unlockStage || 0);
    if (uRow) {
      b += '<div class="small"><b>你如今能做什么</b>　' + esc((uRow.show || []).join(' ｜ ')) + '</div>';
      if ((uRow.hide || []).length)
        b += '<div class="small muted"><b>还未显于你面前之事</b>　' + esc(uRow.hide.join(' ｜ ')) + '</div>';
    }
    b += '<div class="small"><b>修炼·变强</b>　' + (isShen() ? '香火(坐庙) | 升位 | 破柱 | 显圣 | 科仪 | 庙市 | 化香火钱' : '打坐采气 | 破境 | 功法 | 洞府灵脉 | 历练') + '</div>';
    b += '<div class="small"><b>游历·探索</b>　舆图 | 历练 | ' + (isShen() ? '庙市（只此一市）' : '坊市（只认灵石）') + ' | ' + (S.unlockStage >= 4 ? '洞天' : '') + '</div>';
    b += '<div class="small"><b>人际</b>　情缘 | 对话</div>';
    b += '<div class="small"><b>道途</b>　主栏目标卡：点开看全程与奖励，做完自动换下一张</div>';
    if (hasXianLine()) b += '<div class="small"><b>势力</b>　宗门（贡献 / 藏经阁 / 真传神通）｜家族（祠堂 / 族人 / 族运）</div>';
    b += '<div class="small"><b>年谱</b>　系统 → 年谱，可导出 .txt</div>';
    if (hasXianLine()) b += '<div class="small"><b>卖出</b>　交宗门稳（两成折贡献）｜坊市平｜黑市贵但要背业力</div>';
    b += '<div class="small"><b>两套账</b>　' + (isShen()
      ? '香火＝修为，也能当钱；灵石＝通货。香火化灵石 110:1，每月有上限；灵石买香只补到本柱八成。'
      : '灵石＝通货，只走坊市。香火是庙里的东西，仙道一分也没有。') + '</div>';
    if (needsAnchor()) b += '<div class="small"><b>长生</b>　锚（物/人/事/仪）| 仪式</div>';
    b += '<div class="small"><b>快捷键</b>　A~E / 1~5 直选主栏，Enter 执行自由输入</div>';
    b += '<div class="small"><b>系统</b>　右上角「系统」｜存档 · 导入 · 读档 · 帮助 · 重置</div>';
    b += divider();
    b += '<div class="hint">左侧是常驻导航：修行 · 外物 · 经营 · 人事 · 出行 · 记录，一级入口直接可见，不必先展开分组。</div>';
    b += divider();
    b += '<div class="hint danger">仙道是与天争命——快，但天要收你；神道是与人间争香火——慢，但只要还有人记得你，天就收不走你。</div>';
    if (needsAnchor()) b += '<div class="hint danger">真正的长生代价：凡人怕老，长生者怕没人记得自己是谁。</div>';
    b += divider();
    b += '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn ghost" data-act="act:openSave">存档面板</button>' +
      '<button class="btn ghost" data-act="do;imp">导入文件</button>' +
      '<button class="btn ghost" data-act="act:openSys">系统</button></div>';
    openModal('指令大全 · 问道长生 v' + VER, b);
  };

  /* ============================================================
     P0 修复包 · 接通断链（对应审查报告 P0-1~P0-7）
     ============================================================ */

  /* ---------- P0-1 箓气授予 ---------- */
  ACT.openLuPick = () => { openLuPick(); };

  function openLuPick() {
    const used = (S.luHistory || []).map(function (h) { return h.name; });
    const remain = D.LU.filter(function (x) { return used.indexOf(x.name) < 0; });
    if (!remain.length) {
      S.lu = { rank: '黄', name: '移时易世仪', eff: '借一寸光阴，可回退一回合' };
      logLine('天授已尽，你得了最后一箓。', 'good');
      return;
    }
    const pool = pickN(remain, Math.min(3, remain.length));
    let b = '<div class="small">破柱登阶，天庭授箓。<b>三条取一，其余作废</b>——选错不可悔。</div>';
    b += divider() + '<ul class="opts">';
    pool.forEach(function (x, i) {
      const cls = x.rank === '黄' ? 'risk' : x.rank === '青' ? 'chance' : 'peace';
      b += optRow('ABC'[i], x.name + '（' + x.rank + '箓）', { name: x.rank + '箓', cls: cls }, x.eff, false,
        'do;lu:' + encodeURIComponent(x.name));
    });
    b += '</ul>';
    b += '<div class="hint">无箓者入洞天视为邪魔，诸神见之则诛。有了箓，你才进得了两界之间的门。</div>';
    openModal('受箓 · 天授', b, true);
  }

  ACT.do_lu = (enc) => {
    const name = decodeURIComponent(enc);
    const x = D.LU.find(function (z) { return z.name === name; });
    if (!x) { closeModal(); return; }
    S.lu = { rank: x.rank, name: x.name, eff: x.eff };
    S.luHistory = (S.luHistory || []).concat([{ name: x.name, rank: x.rank }]);
    /* v10.5：受箓只写乘区字段，由 recalcCaps 统一重算——
       旧版直接乘 hpMax，破境/读档重算时要么丢、要么重复乘。 */
    if (x.name === '力贯千钧') { S.hpLuMul = 1.3; recalcCaps(true); }
    if (x.name === '重海长鲸') { S.mpLuMul = 1.5; recalcCaps(true); }
    if (x.name === '延年长命' && S.lifeMax) S.lifeMax += 40;
    if (x.name === '彩彻云衢') for (const k in S.stats) S.stats[k] = clamp(S.stats[k] + 1, 1, 20);
    if (x.name === '明霜松岭') S.stats.sense = clamp(S.stats.sense + 3, 1, 20);
    logLine('受箓：' + x.rank + '箓·' + x.name + '。', 'good');
    toast('受箓 · ' + x.name);
    closeModal(); advanceXun(1); render();
    if (S.pendingQuanbing) {
      S.pendingQuanbing = false;
      openQuanbingPick();
    }
  };

  /* ---------- P0-2 道途四印 ---------- */
  /* 四印是否配成对：2 干 + 2 支，且至少有一对同阴阳。
     抽成独立函数是因为破境率要现算——存成缓存会读到过期的值。 */
  function daoyinPaired() {
    const marks = S.daoyin || [];
    let gan = 0, zhi = 0;
    marks.forEach(function (m) { if (m.kind === 'gan') gan++; else if (m.kind === 'zhi') zhi++; });
    if (marks.length !== 4 || gan !== 2 || zhi !== 2) return false;
    return marks.some(function (g) {
      return g.kind === 'gan' && marks.some(function (z) {
        return z.kind === 'zhi' && g.g % 2 === z.z % 2;
      });
    });
  }
  function checkDaoyin() {
    const ok = daoyinPaired();
    S.daoyinOk = ok;      // 仅作面板显示用
    return ok;
  }

  function tryOpenYin() {
    if ((S.daoyin || []).length >= 4) return false;
    openYinPick();
    return true;
  }

  function openYinPick() {
    const marks = S.daoyin || [];
    const ganUsed = marks.filter(function (m) { return m.kind === 'gan'; }).map(function (m) { return m.g; });
    const zhiUsed = marks.filter(function (m) { return m.kind === 'zhi'; }).map(function (m) { return m.z; });
    const ganLeft = 2 - ganUsed.length;
    const zhiLeft = 2 - zhiUsed.length;
    let b = '<div class="small">破境得印。四印须为 <b>二干二支</b>，且干支能配成一对——配不成，证位时 −15。</div>';
    b += divider();
    b += '<div class="small muted">已有 ' + marks.length + '/4　（干 ' + ganUsed.length + '/2 · 支 ' + zhiUsed.length + '/2）</div>';
    b += '<ul class="opts">';
    if (ganLeft > 0) {
      const gp = pickN(D.TIANJIANG.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return ganUsed.indexOf(o.i) < 0; }), Math.min(3, ganLeft + 1));
      gp.forEach(function (o, i) {
        b += optRow('干' + (i + 1), o.x, { name: '天干', cls: 'chance' }, '得一干印', false, 'do;yin:gan:' + o.i);
      });
    }
    if (zhiLeft > 0) {
      const zp = pickN(D.DIZHA.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return zhiUsed.indexOf(o.i) < 0; }), Math.min(3, zhiLeft + 1));
      zp.forEach(function (o, i) {
        b += optRow('支' + (i + 1), o.x, { name: '地支', cls: 'peace' }, '得一支印', false, 'do;yin:zhi:' + o.i);
      });
    }
    b += '</ul>';
    b += '<div class="hint">干为天之纲，支为地之纪。配成一对的那两枚，才是你的道途印。</div>';
    openModal('道途四印 · 第 ' + (marks.length + 1) + ' 枚', b, true);
  }

  ACT.do_yin = (kind, idx) => {
    idx = parseInt(idx, 10);
    const nm = kind === 'gan' ? D.TIANJIANG[idx] : D.DIZHA[idx];
    S.daoyin = (S.daoyin || []).concat([{ kind: kind, g: kind === 'gan' ? idx : null, z: kind === 'zhi' ? idx : null, name: nm }]);
    const ok = checkDaoyin();
    logLine('得' + (kind === 'gan' ? '干' : '支') + '印：' + nm + (ok ? '　四印成对。' : ''), ok ? 'good' : '');
    if (S.daoyin.length >= 4 && !ok) logLine('四印未配成对——证位时 −15。', 'danger');
    closeModal(); advanceXun(1); render();
    /* v10.7 阶段二：选完这一枚要回到破境队列，否则后面的神通/命格丢在半路 */
    afterBreakDone('daoyin');
  };

  /* ---------- P0-3 神通授予 ---------- */
  /* 道统 → 大类（DAOTONG 表按金木水火土/十二炁/雷/孤独分九组） */

  /* ---------- 神通：原著里只有少数标了类别（命/术/身/目），其余按名字稳定分配 ----------
     为什么要四类而不是统一倍率：神通是这个游戏里唯一「属于你自己的道」的东西。
     如果每道神通都只是「伤害 ×1.5」，玩家集四道也感觉不到变化——这正是
     「有术法但攻击方式单一」的来源。 */
  const SHENTONG_SPEC = {
    '命': { mul: 1.85, cost: 45, kindName: '命神通', desc: '必中·破防，正面一击' },
    '术': { mul: 1.55, cost: 40, kindName: '术神通', desc: '压其势，两回合伤害 −30%' },
    '身': { mul: 1.15, cost: 30, kindName: '身神通', desc: '自愈一成二，本回合护体' },
    '目': { mul: 1.30, cost: 35, kindName: '目神通', desc: '看破破绽，两回合受伤 +25%' }
  };
  const SKILL_KIND_NAME = {
    normal: '朴素', sword: '剑', fire: '火', water: '水', wood: '木',
    earth: '土', poison: '毒', thunder: '雷', control: '控', blood: '血炼'
  };
  function shenTongKind(name) {
    if (S.stKind && S.stKind[name]) return S.stKind[name];
    const mk = shenTongKindMarked(name);
    if (mk) return mk;
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
    return ['命', '术', '身', '目'][h % 4];
  }
  /* v10.4 P0·S1：双属不再降级取首字。
     `data.js` 里 26 个名字带括号标注，其中 命中6种组合（命身×5、命术×1）。
     旧版 `k.charAt(0)` 让「（命身）」的第二属性完全失效——玩家拿到一道
     写着「命身」的神通，实际只是一道命神通，名与实对不上。
     ------------------------------------------------------------
     护栏：复合不能把 1.85 与 1.15 相加（那是 ×3.0，一道神通顶半场）。
     取「强者 ×1.1」封顶，代价按两类之和的七成——双属是多一个效果，
     不是多一倍伤害。 */
  function stParts(k) {
    const out = [];
    for (let i = 0; i < (k || '').length; i++) {
      const p = k.charAt(i);
      if (SHENTONG_SPEC[p] && out.indexOf(p) < 0) out.push(p);
    }
    return out.length ? out : ['术'];
  }
  /* v10.4 P1·S2：道统气质。
     ------------------------------------------------------------
     道统此前只决定「道统池里抽哪些神通名」——抽到之后，所有术类神通
     长得一模一样，名字不同、用起来相同。这里按 S.daotong 派生一支气质，
     对同一类神通做 mul±0.10 / cost±5 的微调，并附一个附加效果。
     幅度刻意压小：气质的作用是「手感不同」，不是「强弱碾压」。
     旧存档零迁移——S.daotong 缺省时返回 null，行为与本轮之前完全一致。 */
  function daotongTemper(name) {
    const dt = name || S.daotong;
    const T = D.DAOTONG_TEMPER || {};
    for (const k in T) {
      if (!T.hasOwnProperty(k)) continue;
      if ((T[k].daotong || []).indexOf(dt) >= 0) {
        return { id: k, name: k, mul: T[k].mul || 0, cost: T[k].cost || 0,
          desc: T[k].desc || '', text: T[k].text || '' };
      }
    }
    return null;
  }

  function shenTongSpec(name) {
    const k = shenTongKind(name);
    const parts = stParts(k);
    const tp = daotongTemper();
    /* 气质的乘区与耗损：加法微调后取整，避免 1.85×1.10 这种隐性叠乘 */
    const tm = tp ? tp.mul : 0;
    const tc = tp ? tp.cost : 0;
    let base, baseCost;
    if (parts.length === 1) {
      const b = SHENTONG_SPEC[parts[0]];
      baseCost = b.cost;
      base = { mul: b.mul, cost: b.cost, desc: b.desc,
        kind: parts[0], kindName: b.kindName, parts: parts };
    } else {
      let mul = 0, cost = 0;
      const names = [], descs = [];
      parts.forEach(function (p) {
        const b = SHENTONG_SPEC[p];
        mul = Math.max(mul, b.mul);
        cost += b.cost;
        names.push(p);
        descs.push(b.desc);
      });
      /* 不在中间步骤取整：1.85×1.1=2.035 若先舍成 2.04，
         比值就变成 1.103；再叠气质取整会偏到 1.076/1.106，
         两边的舍入方向还不一致，最终比值飘到 1.13。
         倍率保持全精度，只在展示时舍（见 stMulText）。 */
      baseCost = Math.round(cost * 0.7);
      base = {
        mul: mul * 1.1,
        cost: baseCost,
        desc: descs.join('；'),
        kind: parts.join(''),
        kindName: names.join('') + '双属',
        parts: parts
      };
    }
    if (tp) {
      /* 同样不取整：气质是加法微调，舍入留到最后一步 */
      base.mul = base.mul + tm;
      base.cost = Math.max(5, baseCost + tc);
      base.temper = tp.id;
      base.temperText = tp.text;
      base.desc = base.desc + '；' + tp.desc;
      base.kindName = base.kindName + '·' + tp.name;
    }
    /* v10.5 P1·C4：单独记一份「基础耗灵」，
       百分比兜底只作用于它，气质的加减改动不被抹平。 */
    base.costBase = baseCost;
    return base;
  }

  /* ============================================================
     v10.4 P1·S4：神通入场态势
     ------------------------------------------------------------
     旧版 computePower 只读 S.shenTong.length —— 五道同类神通与
     四类各一道的收益完全一样，玩家没有理由去凑多样性。
     态势把「你带的是什么样的四道」变成开局就能感知的规则改写。
     它不改普攻/招式的任何算法，只在战斗开局动三个开关：
     灵力、首回合、减伤。这正是方案说的「独立框架」在文字游戏里的等价物。
     护栏：单类 ≥3 的「偏执」必须带真实代价（其他类本场禁用），
     否则堆同类就变成了纯收益。
     ============================================================ */
  const STANCE_SPEC = {
    sixiang: { name: '四象归元', desc: '四类俱全 · 本场首次神通不耗灵力', boon: '神通免灵' },
    xiansheng: { name: '先声夺人', desc: '命目并举 · 首回合必中且破绽可见', boon: '首合破绽' },
    shouzhong: { name: '守中带攻', desc: '术身相济 · 本场首次受击减伤三成', boon: '首击减伤' },
    pianzhi: { name: '偏执', desc: '单类独盛 · 该类 +20%，其他类本场禁用', boon: '单类专精' }
  };
  /* 按持有神通的类别构成判定「已达成的态势」（可能多个） */
  function stanceList() {
    /* v10.4 P2·11：态势只看「已装配」—— 卸一道就能改势，这是装配的意义 */
    const sts = stEquipList();
    if (!sts.length) return [];
    const cnt = { '命': 0, '术': 0, '身': 0, '目': 0 };
    sts.forEach(function (nm) {
      stParts(shenTongKind(nm)).forEach(function (p) { if (cnt[p] !== undefined) cnt[p]++; });
    });
    const kinds = Object.keys(cnt).filter(function (k) { return cnt[k] > 0; });
    const out = [];
    if (kinds.length >= 4) out.push('sixiang');
    if (cnt['命'] + cnt['目'] >= 2) out.push('xiansheng');
    if (cnt['术'] + cnt['身'] >= 2) out.push('shouzhong');
    /* 偏执：单类 ≥3 且并非四类齐全（四象是更好的选择，不该同时算偏执） */
    const top = kinds.sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (cnt[top] >= 3 && kinds.length < 4) out.push('pianzhi');
    return out;
  }
  /* 本场实际生效的态势。
     ------------------------------------------------------------
     v10.4 P2 修：`c.stance || stanceList()[0]` 会把「显式设为无态势」
     误判成「还没设过」，于是自动回退到第一个已达成的态势 ——
     测试里 `stance:null` 的场景实际一直在吃「四象归元」的归元乘区，
     导致「百炼比聚气强 1.275」这个假象（那是归元×1.27 而不是功法品阶）。
     现在用 hasOwnProperty 区分「没设过」与「设成 null」：
       · 没设过（旧存档/旧战斗态）→ 回退到自动判定，保持兼容
       · 设成 null → 明确表示「本场不要态势」，不再回退 */
  function curStance() {
    const c = S.combat;
    if (!c) return null;
    const id = Object.prototype.hasOwnProperty.call(c, 'stance')
      ? c.stance
      : (stanceList()[0] || null);
    return id ? Object.assign({ id: id }, STANCE_SPEC[id]) : null;
  }
  /* ============================================================
     v10.4 P2·联动：神通的「五行归属」
     ------------------------------------------------------------
     神通本身没有 el 字段（178 个裸字符串，不改表）。它的五行只能从
     「这道神通出自哪个道统」推导：S.daotong 是玩家当前道统，
     道统又归属某个五行大类。所以同一道神通在不同道统下，
     吃到的功法加成不同——这正是「我修什么」与「我这一击」第一次相遇。
     返回 fx 的键位（metal/wood/water/fire/earth/thunder/qi），
     与 ext-60 的 dims 键位、KIND_TO_EL 保持同一套命名。
     ============================================================ */
  const CLASS_TO_EL = {
    '金行': 'metal', '木行': 'wood', '水行': 'water', '火行': 'fire', '土行': 'earth',
    '雷': 'thunder', '十二炁': 'qi', '六阳六阴': 'qi', '孤独': 'qi'
  };
  function shenTongEl() {
    const cls = daotongClassOf(S.daotong);
    return CLASS_TO_EL[cls] || null;
  }
  /* 联动一：功法 dims 对同属神通的乘区。
     复用 ext-60 的 gongfaCastInfo 缝：它在 sk=null 时按「功法自身五行」
     给出乘区，正好就是「这道功法擅长什么」。 */
  function gongfaShenTongMul() {
    const X = G.WXCS3_EXT;
    if (!X || !X.gongfaShenTongMul) return { mul: 1, text: '' };
    return X.gongfaShenTongMul(shenTongEl());
  }

  /* 类别多样性系数：四类 1.20 / 三类 1.12 / 两类 1.05 / 一类 1.00 */
  function stanceKindMul() {
    const sts = stEquipList();
    if (!sts.length) return 1;
    const kinds = {};
    sts.forEach(function (nm) {
      stParts(shenTongKind(nm)).forEach(function (p) { kinds[p] = true; });
    });
    const n = Object.keys(kinds).length;
    if (n >= 4) return 1.20;
    if (n === 3) return 1.12;
    if (n === 2) return 1.05;
    return 1.00;
  }

  /* 偏执专精的是哪一类（计数最高者） */
  function stanceFocusKind() {
    const sts = stEquipList();
    const cnt = { '命': 0, '术': 0, '身': 0, '目': 0 };
    sts.forEach(function (nm) {
      stParts(shenTongKind(nm)).forEach(function (p) { if (cnt[p] !== undefined) cnt[p]++; });
    });
    let best = null, n = 0;
    Object.keys(cnt).forEach(function (k) { if (cnt[k] > n) { n = cnt[k]; best = k; } });
    return best;
  }

  /* 倍率展示：只在需要显示字符串时舍到两位 */
  function stMulText(m) { return (Math.round(m * 100) / 100).toFixed(2); }

  function daotongPool() {
    if (S.daotong && D.SHENTONG[S.daotong]) return D.SHENTONG[S.daotong].slice();
    const el = (S.rootEls && S.rootEls[0]) || 'jin';
    const key = (D.QI_TO_DAOTONG[el] && D.QI_TO_DAOTONG[el][0]) || '坎水';
    return (D.SHENTONG[key] || ['分阳钗（命）']).slice();
  }

  function openShentongPick() {
    /* v10.7 阶段二：返回布尔——破境队列据此判断「这一步是否真的打开了」。
       旧版无返回值，队列会以为没开而把它跳过（神通被静默吞掉）。 */
    const lim = shenTongLimit();
    if (S.shenTong.length >= lim) { toast('神通已满（仙基所限 ' + lim + '）'); return false; }
    const pool = daotongPool().filter(function (x) { return S.shenTong.indexOf(x) < 0; });
    if (!pool.length) { toast('道统池已空'); return false; }
    const choose = pickN(pool, Math.min(3, pool.length));
    let b = '<div class="small">道基有感，道统池中得一道神通。<b>三选一</b>。上限 ' + lim + '（仙基所限），已有 ' + S.shenTong.length + '。</div>';
    b += divider() + '<ul class="opts">';
    choose.forEach(function (x, i) {
      b += optRow('ABC'[i], x, { name: '神通', cls: 'chance' }, '战力上升', false, 'do;st:' + encodeURIComponent(x));
    });
    b += '</ul>';
    openModal('神通 · 三选一', b, true);
    return true;
  }

  ACT.do_st = (enc) => {
    const nm = decodeURIComponent(enc);
    if (S.shenTong.indexOf(nm) >= 0) { toast('已有此神通'); return; }
    if (S.shenTong.length >= shenTongLimit()) { toast('神通已满'); return; }
    S.shenTong.push(nm);
    /* 类别：原著标了就照标；没标就挑一个「手上还没有的类型」。
       否则四道神通全落在同一类，玩家会以为「神通都一样」——这正是攻击手段单一的另一半原因。 */
    S.stKind = S.stKind || {};
    if (!S.stKind[nm]) {
      const marked = shenTongKindMarked(nm);
      if (marked) S.stKind[nm] = marked;
      else {
        const used = S.shenTong.map(function (x) { return S.stKind[x]; }).filter(Boolean);
        const order = ['命', '术', '身', '目'];
        S.stKind[nm] = order.find(function (k) { return used.indexOf(k) < 0; })
          || order[S.shenTong.length % 4];
      }
    }
    const sp0 = shenTongSpec(nm);
    logLine('得神通：' + stShort(nm) + '（' + sp0.kindName + '）—— 战力上升，交手时「术」里可用。', 'good');
    toast('神通 · ' + stShort(nm) + ' · ' + sp0.kindName);
    closeModal(); advanceXun(1); render();
    /* v10.7 阶段二：这一步已经完成，立刻从队列摘掉——
       否则在得物窗存档再读，会重新开一次「神通三选一」，等于白送一道。
       得物窗的「继续」只负责回到队列，不再代表「完成」。 */
    afterBreakPop('shentong');
    const _hasNext = (S.afterBreak || []).length > 0;
    // 必须放在 closeModal 之后：先弹会被它自己关掉
    if (!modalBusy()) {
      openGain('得一道神通', [
        { name: stShort(nm), num: 0, note: sp0.kindName }
      ], {
        note: sp0.desc, tail: '神通不占招式装配格，但每道每场只能出一次。战斗中点「术」就能看见它。',
        btn: _hasNext ? '继续' : '', act: _hasNext ? 'do;afterbreak_done:shentong' : ''
      });
    } else if (_hasNext) { afterBreakDone('shentong'); }
  };

  /* ---------- P0-7 神位十八品 ---------- */
  function shenweiIdx() { return clamp(parseInt(S.shenweiIdx, 10) || 0, 0, 17); }
  function curShenwei() { return D.SHENWEI[shenweiIdx()] || D.SHENWEI[0]; }
  function renGongNeed(idx) { return Math.round(3000 * Math.pow(1.85, idx)); }

  function addRenGong(n) {
    if (!(isShen() || S.cultivation === 'both')) return;
    S.renGong = (S.renGong || 0) + n;
  }

  function tickShenwei() {
    if (!(isShen() || S.cultivation === 'both')) return;
    if (!S.inDongtian) return;
    if (!S.shenwei) S.shenwei = '从九品·村土地';
    const idx = shenweiIdx();
    if (idx >= 17) return;
    if ((S.renGong || 0) >= renGongNeed(idx)) {
      S.shenweiIdx = idx + 1;
      S.renGong = 0;
      const w = D.SHENWEI[S.shenweiIdx];
      S.shenwei = w.rank + '·' + w.name;
      S.stones += w.salary;
      logLine('人功已满，擢升 ' + S.shenwei + '，俸禄 ' + w.salary + ' 灵石。', 'good');
      toast('神位擢升 · ' + S.shenwei);
    }
  }

  /* ---------- P1-12 神道灵石进项 ---------- */
  /* 香客投进功德箱的铜钱，与香火是两本账。
     香火→灵石必须手动「化香火钱」，有抽成、有月限，不能躺着自己变钱。 */
  function shenStoneIncome() {
    if (!usesShenLine()) return 0;
    let v = S.followers / 50;                        // 50 信众 ≈ 1 石/月
    if (S.shenwei) v += curShenwei().salary / 12;
    if (S.lu && S.lu.name === '持盈保泰') v *= 1.1;
    return v;
  }

  /* ---------- P0-5 锚到期衰减 ---------- */
  function needsDaotaiTier() {
    return (isXian() && S.xRealm >= 5) || (isShen() && S.pillar >= 7);
  }

  function anchorPeriodMonths(k) {
    if (k === 'wu') return 120;                                  // 物：约十年一修
    if (k === 'ren') return 36;                                  // 人：三年一见
    if (k === 'shi') return 12;                                  // 事：一年一履职
    if (k === 'yi') return needsDaotaiTier() ? 720 : 12;         // 仪：道胎六十年续灯 / 八柱每年大醮
    return 12;
  }

  function tickAnchors() {
    if (!needsAnchor()) return;
    if (!S.anchorTick) S.anchorTick = { wu: 0, ren: 0, shi: 0, yi: 0 };
    if (!S.anchorMiss) S.anchorMiss = { wu: 0, ren: 0, shi: 0, yi: 0 };
    for (const k in S.anchorTick) {
      /* v9.0 M2：本命合道后，物锚之「物」因器而稳，不再误期 */
      if (k === 'wu') {
        const _XA = G.WXCS3_EXT;
        if (_XA && _XA.benmingAnchorStable && _XA.benmingAnchorStable()) continue;
      }
      S.anchorTick[k] = (S.anchorTick[k] || 0) + 1;
      const period = anchorPeriodMonths(k);
      if (S.anchorTick[k] < period) continue;
      S.anchorTick[k] = 0;
      if (S.anchorDone && S.anchorDone[k]) { S.anchorDone[k] = false; continue; }
      S.anchorMiss[k] = (S.anchorMiss[k] || 0) + 1;
      const nm = (D.ANCHOR_TYPES.find(function (x) { return x.id === k; }) || {}).name || k;
      if (S.anchorMiss[k] === 1 && S.anchors[k] >= 1) {
        S.anchors[k] = 0.5;
        logLine('「' + nm + '」误期，转松。', 'danger');
      } else if (S.anchorMiss[k] >= 3 && S.anchors[k] > 0) {
        S.anchors[k] = 0;
        logLine('「' + nm + '」三期未办，断了。', 'danger');
      }
    }
  }

  function doAnchorMaintain(k) {
    S.anchors[k] = 1;
    S.anchorMiss[k] = 0;
    S.anchorTick[k] = 0;
    if (!S.anchorDone) S.anchorDone = {};
    S.anchorDone[k] = true;
  }

  /* ---------- P0-6 百世书 ---------- */
  function pageCount() { return parseInt(S.pages, 10) || 0; }

  ACT.do_burn = () => {
    if (!pageCount()) { toast('没有页可烧'); return; }
    /* v10.1 第一梯队：让 reinc（百世书）结局真正出现。
       它此前零调用，因为 do_legacy 直接 newGame 从不展示结局。
       语义上「烧一页重来」本身就是这一世的结尾，所以在这里把它念出来：
       玩家点开烧页面板，先看到自己这一世以「百世书」收尾，再选择带什么走。
       v10.3 P0：补上 reincShown 标记，resolveEnding 据此把这一世判成「轮回」，
       否则结局屏背后仍是「陨落/坐化」。 */
    S.reincShown = true;
    const _reinc = (D.ENDINGS || []).find(function (e) { return e.id === 'reinc'; });
    let b = '';
    if (_reinc) {
      b += '<div class="endingname" style="font-size:15px">' + esc(_reinc.name) + '</div>';
      b += '<div class="small" style="margin:2px 0 8px">' + esc(_reinc.text) + '</div>';
      b += divider();
    }
    b += '<div class="small">烧掉一页，世界会记得你做过的事——但只记得一件。</div>';
    b += '<div class="muted small">现有页数：' + pageCount() + '</div>';
    b += divider() + '<ul class="opts">';
    b += optRow('A', '留一件宝物给来世', { name: '宝物', cls: 'chance' }, '灵石带过去', false, 'do;legacy:treasure');
    b += optRow('B', '留一段修为给来世', { name: '修为', cls: 'peace' }, '起手修为不归零', false, 'do;legacy:xiuwei');
    b += optRow('C', '留几年寿元给来世', { name: '寿元', cls: 'peace' }, '寿元上限 +40', false, 'do;legacy:life');
    b += '</ul>';
    b += '<div class="hint danger">代价：血债 +10%、寿元上限 −5%、所有关系归零。世界记得你，但记得的是你杀过的人。</div>';
    openModal('百世书 · 烧页', b, true);
  };

  /* v10.1 第一梯队：百世书页数用尽后的唯一出口。
     与 do_legacy 的区别只有两处：不扣页（本来就没有）、不带 legacy。
     其余一律照旧——加血债、重建世界、清关系。这样「烧尽」是真的有代价，
     而不是换了个名字继续拿好处。 */
  ACT.do_rebor = () => {
    if (pageCount() > 0) { toast('还有页可烧，先烧一页'); return; }
    const pact = S.legacyPact || null;
    const debt = (S.bloodDebt || 0) + 0.1;
    /* 道果不是遗产，是「世界记得你」：空手投胎也带得走。 */
    const fruit = (G.WXCS3_EXT && G.WXCS3_EXT.fruitSnapshot) ? G.WXCS3_EXT.fruitSnapshot() : null;
    S = newGame();
    S.draft = draftInit();
    S.pages = 0;
    S.legacy = null;          // 关键：什么都不带
    S.legacyPact = pact;      // 临终所托仍生效——那是别人的承诺，不是你的遗产
    S.daoFruit = fruit;
    S.bloodDebt = debt;
    S.reborCount = 1 + ((typeof S.reborCount === 'number') ? S.reborCount : 0);
    closeModal();
    bump('cheated');
    render();
    toast('赤手投生。前尘尽忘，唯余此心');
    if (S.legacy || pageCount() < 3) { const _m = unlockedMemories(); if (_m.length) offerMemory(); }
  };

  ACT.do_legacy = (kind) => {
    if (['treasure', 'xiuwei', 'life'].indexOf(kind) < 0) { toast('须选一项传承'); return; }
    const pages = Math.max(0, pageCount() - 1);
    const debt = (S.bloodDebt || 0) + 0.1;
    const pact = S.legacyPact || null;    // 临终所托要跨过 newGame 带到来世
    /* 烧页之前先取下这一世的道果——它读的是本世的 tally/声望/遗迹。 */
    const fruit = (G.WXCS3_EXT && G.WXCS3_EXT.fruitSnapshot) ? G.WXCS3_EXT.fruitSnapshot() : null;
    S = newGame();
    S.draft = draftInit();
    S.pages = pages;
    S.legacy = { kind: kind };
    S.legacyPact = pact;
    S.daoFruit = fruit;
    S.bloodDebt = debt;
    if (kind === 'treasure') S.stones = 400;
    closeModal();
    bump('cheated');
    render();
    toast('焚其一页。来世或有记焉');
    if (S.legacy || pageCount() < 3) { const _m = unlockedMemories(); if (_m.length) offerMemory(); }
  };

  /* v8.0 临终结算：最后一搏 / 传功后人 / 托付道统 / 闭眼 */
  ACT.do_die = (a) => {
    if (S.phase !== 'dying') return;
    const reason = (S.dying && S.dying.reason) || '道消身殒。';
    S.dying = null;

    if (a === 'stand') {
      /* v10.3 P1：寿元死不能只「减寿元上限」。
         寿元死的条件是 age >= lifeMax 已经成立，若生还后 lifeMax 再 −10，
         下个月 1 号 age++ 必然再触发一次，而 dyingUsed 已置 true，直接终局——
         玩家的 35% 生还其实只买到最多 11 个月。所以寿元死改成「续命一年」。 */
      const byAge = /寿元/.test(reason);
      if (rng() < 0.35) {
        S.phase = 'play';
        S.hp = 1;
        S.stats.heart = Math.max(1, st('heart') - 2);
        if (byAge) {
          S.lifeMax = Math.max(20, (S.lifeMax || 60)) + 12;
          logLine('强撑得返。于蒲团上又坐起来，寿元续得一年，道心微动。', 'danger');
        } else {
          S.lifeMax = Math.max(20, (S.lifeMax || 60) - 10);
          logLine('强撑得返。气血仅余一线，寿元上限损十年，道心微动。', 'danger');
        }
        toast('此关得渡');
        render();
        return;
      }
      logLine('此搏未回。', 'danger');
      finalizeDeath(reason + '　最后一搏未成。');
      render();
      return;
    }

    if (a === 'pass') {
      const heir = dyingHeir();
      if (heir) {
        S.legacyPact = 'pass';
        S.npcs[heir.id].fav = clamp((S.npcs[heir.id].fav || 0) + 20, 0, 120);
        logLine('一生所学，尽传' + heir.name + '。', 'good');
      }
    } else if (a === 'daotong') {
      if (S.sect || S.clan) {
        S.legacyPact = 'daotong';
        logLine('道统已有所托。' + (S.clan ? '宗族中自有人继之。' : '宗门当记此名。'), 'good');
      }
    }
    finalizeDeath(reason);
    render();
  };

  /* ---------- P0-4 道胎入口 ---------- */
  function canDaotai() {
    return !isShen() && S.xRealm === 4 && !!S.guowei && S.phase === 'play';
  }

  /* ============================================================
     P2 / P3 修复包
     ============================================================ */

  /* ---------- P3-24 大数字格式化 ---------- */

  /* ---------- P2-19 五行相克 ---------- */
  function mainEl() { return (S.rootEls && S.rootEls[0]) || null; }

  /* 八柱正位：不再是「继续破柱」，而是证真君的结算口 */
  function openZhenjunEnd() {
    const solid = Object.keys(S.anchors || {}).filter(function (k) { return S.anchors[k] >= 1; }).length;
    let b = '<div class="small">八柱既满。第十二真君法相久悬，今当有坐之者。</div>' + divider();
    b += '<div class="statline"><span class="k">柱位</span><span class="v">' + esc(realmName()) + '</span></div>';
    b += '<div class="statline"><span class="k">信众</span><span class="v">' + fmtNum(S.followers) + '</span></div>';
    b += '<div class="statline"><span class="k">固锚</span><span class="v">' + solid + '/4</span></div>';
    b += '<div class="statline"><span class="k">功德/业力</span><span class="v">' + S.merit + ' / ' + S.karma + '</span></div>';
    b += divider();
    if (solid < 4) {
      b += '<div class="small danger">四锚未固，法相难安。先补其锚。</div>';
      b += '<ul class="opts">' + optRow('A', '去补锚', { name: '平和', cls: 'peace' }, '', false, 'act:openAnchor') + '</ul>';
    } else {
      b += '<div class="small good">四锚皆固，可以证位。</div>';
      b += '<ul class="opts">' + optRow('A', '证真君 · 法相归位（终局）', { name: '风险', cls: 'risk' }, '功德 ≥ 300 更稳', false, 'do;zhenjun') + '</ul>';
    }
    b += '<div class="hint">真君非修而得，乃为一方水土所认。</div>';
    openModal('八柱·正位 · 法相归位', b, true);
  }

  ACT.do_zhenjun = () => {
    closeModal();
    if (S.merit < 300 && rng() < 0.35) {
      S.merit += 50;
      logLine('法相未认你——神位空了一夜。功德 +50。', 'danger');
      render(); return;
    }
    S.endingId = S.merit >= 300 ? 'shizun' : 'zhenjun';
    S.phase = 'over';
    S.deathReason = S.endingId === 'shizun'
      ? '万民愿力洗净神胎。你不受封，不列真君，自成世尊。'
      : '法相归位。十二真君之中，有了你一个。';
    S.combat = null;
    logLine(S.endingId === 'shizun' ? '功德圆满，你成了世尊。' : '法相归位，你成了第十二真君之一。', 'good');
    render();
  };

  /* ---------- P2-15 紫府三关 ---------- */
  const ZIFU_GATES = ['升阳关', '蒙昧关', '幻想关'];
  function zifuGateName() {
    if (S.xRealm !== 3) return null;
    return ZIFU_GATES[clamp(S.xStage, 0, ZIFU_GATES.length - 1)] || ZIFU_GATES[ZIFU_GATES.length - 1];
  }
  /* 紫府是否已是最后一关（渡完就该跨入金丹，不再循环） */
  function zifuIsLastGate() {
    return S.xRealm === 3 && S.xStage >= ZIFU_GATES.length - 1;
  }

  /* 幻想关：渡败则修为全散 */
  ACT.do_zifu = () => {
    closeModal();
    const gate = zifuGateName();
    const rate = clamp(0.55 + st('heart') * 0.02 + st('insight') * 0.012 - S.xStage * 0.06, 0.15, 0.9);
    if (rng() < rate) {
      S.xiuwei = 0;
      if (zifuIsLastGate()) {
        // 第三关（幻想关）渡过后直入金丹。之前这里只 xStage++，
        // 于是紫府永远停在 xRealm=3，金丹/果位/道胎/锚全部不可达。
        S.xRealm = 4; S.xStage = 0;
        const nr4 = D.XIAN_REALMS[4] || D.XIAN_REALMS[D.XIAN_REALMS.length - 1];
        S.lifeMax = nr4.life || 0;
        bumpUnlock('xian', 4);
        recalcCaps(true);
        healOnMajorBreak();
        reciteLiturgy('breakXian');
        logLine('渡过' + gate + '，三关俱过。紫府散尽，气海里那点东西凝成了 —— 晋入 ' + nr4.name + '。', 'good');
        if ((S.daoyin || []).length < 4) tryOpenYin();
        toast('金丹 · ' + nr4.name);
        advanceXun(1);
        maybeTransmitNow();
        render();
        return;
      }
      S.xStage++;
      logLine('渡过' + gate + '，紫府又开一重。晋 ' + realmName() + '。', 'good');
      if (!grantShenTong('stage')) { toast('紫府 · ' + realmName()); advanceXun(1); render(); }
    } else {
      if (gate === '幻想关') {
        S.xiuwei = 0;
        S.hp = Math.max(1, Math.round(S.hp * 0.5));
        S.stats.insight = Math.max(1, S.stats.insight - 1);
        bump('zifuFail');
        logLine('幻想关渡败——你所见皆妄，修为尽散，气血逆冲。', 'danger');
        toast('幻想关败 · 修为尽散');
      } else {
        S.xiuwei = Math.round((xrealm().need || 100) * 0.5);
        S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.15));
        logLine(gate + '未渡，修为跌半。', 'danger');
        toast(gate + ' · 未渡');
      }
      advanceXun(1); render();
    }
  };

  function openZifuGate() {
    const gate = zifuGateName();
    const rate = clamp(0.55 + st('heart') * 0.02 + st('insight') * 0.012 - S.xStage * 0.06, 0.15, 0.9);
    let b = '<div class="small">紫府三关：<b>升阳 → 蒙昧 → 幻想</b>。每关一问：「汝为谁」。</div>';
    b += '<div class="row"><span class="lab">当前</span><b>' + esc(gate) + '</b>' +
      '<span class="muted small">第 ' + Math.min(ZIFU_GATES.length, S.xStage + 1) + ' / ' + ZIFU_GATES.length + ' 关</span></div>';
    if (zifuIsLastGate()) b += '<div class="small good">此最后一关，渡之即金丹。</div>';
    b += '<div class="row"><span class="lab">通过率</span><b style="color:' + (rate > .5 ? 'var(--merit)' : 'var(--cinnabar)') + '">' + Math.round(rate * 100) + '%</b></div>';
    b += '<div class="hint danger">幻想关败：修为尽散、气血减半、悟性 −1。紫府之最贵者。</div>';
    b += '<div style="margin-top:10px"><button class="btn" data-act="do;zifu">渡关</button> ' +
      '<button class="btn ghost" data-act="modal:close">再等等</button></div>';
    openModal('紫府 · ' + gate, b, true);
  }

  /* ---------- P2-16 双修线：both 也能立庙/显圣/传教 ---------- */
  function isBoth() { return S.cultivation === 'both'; }
  function hasShenLine() { return isShen() || isBoth(); }
  function hasXianLine() { return isXian() || isBoth(); }

  /* ---------- P2-17 事件表：1d100 十二区间 ---------- */
  function eventSlot(roll) {
    /* v8.0：按事件表长度均分 1~100，以后往 EVENTS 里加事件不必再改这张表。
       旧版是写死的十二区间，加一条事件就要同时改数据和这里，漏改的那条永远抽不到。 */
    const all = D.EVENTS || [];
    if (!all.length) return 'pilgrim';
    /* 按道途筛池子。旧版 22 条事件里 12 条是神道专属（上香、香火、庙会），
       仙道玩家抽到只会觉得「这不是我的事」——名义上有事件，其实没有内容。 */
    const shen = isShen(), xian = isXian(), both = isBoth();
    /* v9.0 M0：事件结构数据化第一步——把 when 真正读起来。
       旧机制只有 path 一道筛，任何「条件不满足就不该出现」的想法都无处安放，
       于是没人会写条件字段（写了也是死字段）。这里给 when 一个可执行的语义：
         when: { minRealm, maxRealm, month, place, flag, needSect, needTemple }
       判断全部走已有状态，不新增存档字段、不引入新状态机。
       条件不满足的事件不进池，因此也不会被抽到——而不是抽到了再判否。 */
    const whenOk = function (e) {
      const w = e.when;
      if (!w) return true;
      if (w.minRealm != null && myRealmIdx() < w.minRealm) return false;
      if (w.maxRealm != null && myRealmIdx() > w.maxRealm) return false;
      if (w.month != null && S.month !== w.month) return false;
      if (w.place && S.place !== w.place) return false;
      if (w.needSect && !S.sect) return false;
      if (w.needTemple && !(S.miaoSites > 0)) return false;
      if (w.flag && !(S.flags && S.flags[w.flag])) return false;
      return true;
    };
    const list = all.filter(function (e) {
      if (!whenOk(e)) return false;
      if (!e.path) return true;
      if (e.path === 'shen') return shen || both;
      if (e.path === 'xian') return xian || both;
      return true;
    });
    if (!list.length) return all[0].id;
    const idx = clamp(Math.floor((roll - 1) * list.length / 100), 0, list.length - 1);
    return list[idx].id;
  }

  /* ---------- P2-18 舆图：真实移动 ---------- */
  const PLACES = [
    { id: 'qingyue', name: '东洲·青岳', danger: 0, lingqi: 1 },
    { id: 'nanyue', name: '南疆·赤炎', danger: 1, lingqi: 1 },
    { id: 'xisha', name: '西漠·流沙', danger: 2, lingqi: 2 },
    { id: 'beiyuan', name: '北原·寒渊', danger: 3, lingqi: 2 },
    { id: 'zhongzhou', name: '中州·天阙', danger: 2, lingqi: 3 }
  ];
  function curPlaceObj() { return PLACES.find(function (p) { return p.id === (S.place || 'qingyue'); }) || PLACES[0]; }
  /* 地点基础灵气 + 洞府升级档 分开存，最终值取两者较高者。
     旧代码迁地时直接用地点基础灵气覆盖 S.lingqi，
     花灵石升的洞府被一次旅行清零，还能靠迁到高灵气处免费拿高灵气。 */
  function syncLingqi() {
    const base = placeBaseLingqi(S.place || 'qingyue');
    const up = clamp(parseInt(S.lingqiUp, 10) || 0, 0, D.LINGQI.length - 1);
    S.lingqiBase = base;
    S.lingqi = clamp(Math.max(base, up), 0, D.LINGQI.length - 1);
  }

  ACT.do_travel = (id) => {
    const p = PLACES.find(function (x) { return x.id === id; });
    if (!p) return;
    const need = p.danger * 2;   // 危险度 → 境界门槛
    const myRank = positionRank();
    if (myRank < need) { toast('境界不足，此去必死（需位格 ' + need + ' 以上）'); return; }
    S.place = p.id;
    markIn('places', p.id);
    // 地点基础灵气与洞府升级档分开算，取较高者。
    // 地点基础灵气与洞府升级档分开算，取较高者。
    // 旧代码直接用地点基础灵气覆盖 S.lingqi，洞府升的级一迁就没了，
    // 还能靠迁到高灵气处白得高灵气。
    syncLingqi();
    logLine('迁往 ' + p.name + '。此地灵气 ' + D.LINGQI[p.lingqi].name + '，危险度 ' + p.danger + '。', '');
    closeModal(); advanceXun(1); render();
  };

  /* ---------- P3-25 键盘快捷键 ---------- */
  /* 主栏直选：字母与数字都走这里，按当前线路给同一件事。
     旧表把 c 固定成「外出历练」、d 固定成「参悟功法」，神道按下去是错的。 */
  function mainKeyAction(k) {
    const full = breakReady();
    /* B 键必须与中栏「此刻真正画出来的那个 B」一致：
       神道破柱后未受箓时，屏幕上 B 是「受箓」，旧表却固定开破境，
       键盘与鼠标走成两套意图。 */
    const noLu = hasShenLine() && !S.lu && S.pillar >= 1;
    const map = {
      a: 'act:cultivate',
      b: (full && noLu) ? 'act:openLuPick' : full ? 'act:openBreak' : 'act:openMeditate',
      c: hasShenLine() ? 'act:openXiansheng' : 'act:explore',
      d: hasShenLine() ? 'act:preach' : 'act:openGongfa',
      e: 'act:openRest'
    };
    const num = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' }[k];
    return map[num || k] || null;
  }

  /* ---------- P3-27 存档版本校验 ---------- */

  /* ============================================================
     回血 / 疗伤 / 法宝 / 招式 / 奇遇（素材扩充）
     ============================================================ */

  /* ---------- 伤势分级（据小说用词：轻伤 / 重伤 / 濒死 / 垂死） ---------- */
  function injuryLevel() {
    const r = S.hp / Math.max(1, S.hpMax);
    if (S.hp <= 0) return { id: 'dead', name: '已死' };
    if (r < 0.15) return { id: 'critical', name: '濒死', healMul: 0.35, warn: true };
    if (r < 0.35) return { id: 'heavy', name: '重伤', healMul: 0.6, warn: true };
    if (r < 0.65) return { id: 'light', name: '轻伤', healMul: 0.85, warn: false };
    return { id: 'none', name: '无伤', healMul: 1, warn: false };
  }

  /* ---------- 自然回血：按月，按境界，按伤势打折扣 ---------- */
  function monthlyHeal() {
    const lv = injuryLevel();
    if (lv.id === 'dead') return 0;
    // 基础回复比例：境界越高，气血越厚，回得越慢
    const basePct = [0.07, 0.06, 0.05, 0.04, 0.035, 0.03][clamp(S.xRealm, 0, 5)] || 0.03;
    let v = Math.round(S.hpMax * basePct * lv.healMul);
    // 休息（闭关）额外加成
    if (S.meditate) v = Math.round(v * 1.8);
    // 长春功 / 续脉决：疗伤加成
    /* v10.1 第二梯队·问题2：疗伤加成改由功法 effect 统一结算，
       不再对 id 做硬编码特判（长春功/续脉决/月湖映秋诀一视同仁）。
       注意：旧版续脉决「只要拥有就生效」，现在改为按主修功法结算，
       「装配改变体验」这句话第一次成立。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.gongfaHeal) {
      const _gh = G.WXCS3_EXT.gongfaHeal();
      if (_gh > 0) v = Math.round(v * (1 + _gh));
    }
    if (S.yuluHulu) v = Math.round(v * 1.4);            // 灵药葫芦
    if (S.body === 'dao') v = Math.round(v * 1.15);
    if (quenchBlock() > 0) v = Math.round(v * (1 + quenchBlock() * 2));  // 淬体：伤好得更快
    return Math.max(1, v);
  }

  /* ---------- 打坐疗伤 / 守庙静养：主动，耗时间，按境界回 ---------- */
  ACT.openRest = () => {
    const lv = injuryLevel();
    const per = monthlyHeal();
    const shen = isShen();
    let b = '<div class="small">伤势：<b class="' + (lv.warn ? 'danger' : '') + '">' + lv.name + '</b>'
      + '（气血 ' + Math.round(S.hp) + '/' + Math.round(S.hpMax) + '）</div>';
    b += '<div class="muted small" style="margin:6px 0">自然回复：每月约 ' + fmtNum(per) + ' 点'
      + (S.meditate ? '（闭关中，×1.8）' : '') + '</div>';
    b += divider() + '<ul class="opts">';
    b += optRow('A', '静养一月', { name: '平和', cls: 'peace' }, '推进一月，回 ' + fmtNum(per), false, 'do;rest:1');
    b += optRow('B', '闭关三月', { name: '平和', cls: 'peace' }, '回 ' + fmtNum(per * 3) + '，' + (shen ? '香火' : '修为') + '推进', false, 'do;rest:3');
    b += optRow('C', '闭关一载', { name: '机缘', cls: 'chance' }, '回满，但岁月流逝', false, 'do;rest:12');
    b += '</ul>';
    b += shen
      ? '<div class="hint">守庙静养只把时间换成气血与香火。要快，还是得显圣、传教、拉信众。</div>'
      : '<div class="hint">打坐只是把时间换成气血与修为。真正的速效还是丹药——坊市里回春丹 50 石一颗。</div>';
    openModal(shen ? '守庙静养' : '打坐疗伤', b);
  };

  ACT.do_rest = (n) => {
    n = parseInt(n, 10) || 1;
    closeModal();
    S.xun = 0;              // 静养按整月算，余下的旬一并吞掉
    for (let i = 0; i < n; i++) {
      if (S.phase !== 'play') break;
      /* v10.3 P1：这里原本留着 S.meditate = true（从 do_med 复制过来的副作用），
         而 monthXiuwei() 见到 meditate 就把月修为 ×2 ——
         于是「静养」等于「闭关 ×2 + 回血 + 滚事件」，打坐按钮永久作废。
         静养的语义是「与打坐同额，只是额外养伤」，所以乘数必须是 1。 */
      if (isXian() || S.cultivation === 'both') gainXiuwei(monthXiuwei());
      if (isShen() || S.cultivation === 'both') gainXianghuo(monthXianghuo().capped);
      advanceMonth(1);
    }
    S.meditate = false;
    if (S.phase !== 'play') { render(); return; }
    logLine((isShen() ? '守庙静养 ' : '静养 ') + n + ' 月，气血复至 ' + Math.round(S.hp) + '/' + Math.round(S.hpMax) + '。', '');
    /* 打坐是玩家最高频的动作，如果不滚机缘，等于「越勤快越没事」——
       advanceMonth 只做结算，不掷事件；事件必须由动作方显式触发。 */
    maybeEvent();
    render();
  };

  /* ---------- 战斗后疗伤提示 ---------- */
  function afterCombatCheck() {
    const lv = injuryLevel();
    if (lv.warn) toast('伤势颇重（' + lv.name + '），宜早疗之');
    // —— v6.6 功过格钩子 2：战斗类 / 越境 / 击杀 / 夺祀
    if (S && S.phase !== 'create') checkAch();
  }

  /* ---------- 丹药效果兑现（扩充版） ---------- */
  /* v10.5 P1·C4：固定值改为「下限 + 上限百分比」。
     战斗与回血都是比例制（敌伤按 foe.hpMax、我伤按 S.hpMax），
     上限随境界涨到 1200~2400 后，固定 50 的丹药、固定 20 的术法耗灵
     会被稀释成噪声：高境界吃回春丹几乎无感、术法灵力近乎免费。
     规则：固定值作「下限」，与上限百分比取较大者；0 仍为 0（免灵/无耗）。 */
  const PILL_HP_PCT = 0.08, PILL_MP_PCT = 0.08, SKILL_MP_PCT = 0.05,
        SHENTONG_MP_PCT = 0.08, ART_HP_COST_PCT = 0.01, MONTH_MP_PCT = 0.06;
  function pillHealOf(it, kind) {
    const base = it.v || (kind === 'mp' ? 40 : 50);
    return Math.max(base, Math.round((kind === 'mp' ? S.mpMax : S.hpMax) * (kind === 'mp' ? PILL_MP_PCT : PILL_HP_PCT)));
  }
  function skillCostOf(sk) {
    if (!sk || !sk.cost) return 0;
    return Math.max(sk.cost, Math.round(S.mpMax * SKILL_MP_PCT));
  }
  function shenTongCostOf(sp) {
    if (!sp || !sp.cost) return 0;
    /* 百分比兜底只作用于「基础耗灵」，气质的加减改动保留——
       否则两个道统的耗灵差会被上限百分比一起抹平，
       「道统改耗灵」这条机制直接失效（见 shenTongSpec 的 costBase）。 */
    const base = (typeof sp.costBase === 'number') ? sp.costBase : sp.cost;
    return Math.max(base, Math.round(S.mpMax * SHENTONG_MP_PCT)) + (sp.cost - base);
  }

  function applyPill(it) {
    if (!it) return '';
    consumeQuality(it.id);
    /* v9.0 M1：丹火养命——自服丹药药力更醇，数值口径在扩展里 */
    if (typeof it.v === 'number' && it.v) it = Object.assign({}, it, { v: it.v * fateMul('pill') });
    let msg = '';
    switch (it.type) {
      case 'hp': {
        const g = pillHealOf(it, 'hp');
        S.hp = Math.min(S.hpMax, S.hp + g); msg = '气血 +' + g; break;
      }
      case 'hpPct': { const g = Math.round(S.hpMax * (it.v || 0.5)); S.hp = Math.min(S.hpMax, S.hp + g); msg = '气血 +' + g; break; }
      case 'hpFull': S.hp = S.hpMax; msg = '气血全满'; break;
      case 'mp': {
        const g = pillHealOf(it, 'mp');
        S.mp = Math.min(S.mpMax, S.mp + g); msg = '灵力 +' + g; break;
      }
      case 'mpPct': { const g = Math.round(S.mpMax * (it.v || 0.4)); S.mp = Math.min(S.mpMax, S.mp + g); msg = '灵力 +' + g; break; }
      case 'mpFull': S.mp = S.mpMax; msg = '灵力全满'; break;
      case 'cure': S.hp = Math.min(S.hpMax, S.hp + Math.round(S.hpMax * 0.6)); S.injury = null; msg = '伤势痊愈'; break;
      case 'heart': S.stats.heart = clamp(S.stats.heart + (it.v || 2), 1, 20); msg = '道心 +' + (it.v || 2); break;
      case 'life': if (S.lifeMax) { S.lifeMax += (it.v || 20); msg = '寿元上限 +' + (it.v || 20); } else msg = '无寿元可续'; break;
      case 'break': S.breakBonus = (S.breakBonus || 0) + (it.v || 0.12); msg = '下次破境 +' + Math.round((it.v || 0.12) * 100) + '%'; break;
      case 'cult': S.cultBonus = 1.3; msg = '闭关效率 +30%（一月）'; break;
      case 'xiang':
        // 香火只归神道：仙道服信香，等于把别人的香火塞进自己气海，不该生效
        if (!usesShenLine()) { msg = '此物与你气海不合，香灰自指缝漏尽'; break; }
        S.xianghuo = Math.min(maxXianghuo(), S.xianghuo + (it.v || 20));
        msg = '香火 +' + (it.v || 20); break;
      default: msg = '服下';
    }
    return msg;
  }

  /* 破境加成用完后清零 */
  function consumeBreakBonus() {
    const b = S.breakBonus || 0;
    S.breakBonus = 0;
    return b;
  }

  /* ---------- 破境回血：只给"破大境界"满血 ---------- */
  function healOnMajorBreak() {
    S.hp = S.hpMax;
    S.mp = S.mpMax;
    logLine('大境界既成，周身气血返本归元，尽复旧观。', 'good');
  }

  /* ============================================================
     高阶功法改为「传法机缘」（据《玄鉴仙族》仪轨文辞）
     ============================================================ */

  /* 传法铭文：破境 / 得法时诵出的短句 */
  const LITURGY = {
    breakXian: [
      '当以时言功，不负效信。随箓焚化，身谢太阴。',
      '愿铅汞成丹，素心在性，腾变仙籍，千年好过。',
      '谨出太阴玄光，诛斩恶逆。止塞愆非，制断恶根。',
      '自始及终，先从戒箓。以烟燎祀，以血祭俸。',
      '巡幽探微，洞见玄奥。三元六节，无有不敬。'
    ],
    breakShen: [
      '兹有李氏子弟，戒除情性。虔具清酌庶馐，寒食牲仪。',
      '恭请玄明妙法，司命安神。使之发生道业，从凡入圣。',
      '当以时言功，不负效信。三元六节，无有不敬。',
      '以时言功，不负效信。愿此香火，长照此方。'
    ],
    obtain: [
      '月湖映秋，寒松露雪。',
      '江河一气，洞泉澈灵。',
      '朝霞采露，越河湍流。',
      '白首叩庭，天离日昃。',
      '玄水成剑，月阙悬空。',
      '紫雷秘元，金殿煌元。'
    ],
    fail: [
      '气机逆冲，玉京轮碎。心中只余一片死寂。',
      '你听见体内有什么东西断裂的声音，很轻，像一根弦。',
      '丹炉倾覆，药力逆走经络。这一关，你过不去。'
    ]
  };

  /* 传法机缘：地阶以上功法不再上架，改由此处授予 */
  const TRANSMISSIONS = [
    {
      id: 'tx_di', name: '残碑问法', tier: 'di', needRealm: 2,
      verse: '残碑半埋山土里，苔痕之下有字。你以指腹一寸寸描过去，描到第七字时，忽然读通了。',
      hint: '地阶功法 · 需筑基以上',
      opts: [
        { t: '以己意解碑', eff: '直接参悟，可能成、可能空', act: 'tx:tx_di:parse', risk: 'chance' },
        { t: '先静坐三日', eff: '耗时间，成功率更高', act: 'tx:tx_di:sit', risk: 'peace' },
        { t: '拓下碑文带走', eff: '稳妥，得残篇可慢慢参', act: 'tx:tx_di:take', risk: 'peace' }
      ]
    },
    {
      id: 'tx_di2', name: '雨中送伞人', tier: 'di', needRealm: 3,
      verse: '山道上雨很大。有人递来一把伞，伞骨是旧的，伞面上墨迹尚未干透——写的是半篇法诀。',
      hint: '地阶功法 · 需紫府以上',
      opts: [
        { t: '问他是谁', eff: '或许牵出一段旧缘', act: 'tx:tx_di2:ask', risk: 'chance' },
        { t: '受伞不问', eff: '得法，但欠一份人情', act: 'tx:tx_di2:quiet', risk: 'peace' },
        { t: '推辞不要', eff: '无功，但心稳', act: 'tx:tx_di2:refuse', risk: 'peace' }
      ]
    },
    {
      id: 'tx_tian', name: '洞天传音', tier: 'tian', needRealm: 4,
      verse: '入夜，洞天深处有声音在念一段你听不懂的话。你听着听着，忽然发现自己正在跟着它念。',
      hint: '天阶功法 · 需金丹以上',
      opts: [
        { t: '跟着念下去', eff: '可能得法，也可能被夺舍', act: 'tx:tx_tian:follow', risk: 'risk' },
        { t: '以神识反探', eff: '探明来处，或可安全取法', act: 'tx:tx_tian:probe', risk: 'chance' },
        { t: '封住耳窍退出', eff: '保住心神，无功', act: 'tx:tx_tian:seal', risk: 'peace' }
      ]
    },
    {
      id: 'tx_tian2', name: '雪中授剑', tier: 'tian', needRealm: 4,
      verse: '雪落了整夜。你出门时，院中已立着一柄剑，剑身覆雪，雪下有字：「持此，去把该了的事都了了。」',
      hint: '天阶功法 · 需金丹以上',
      opts: [
        { t: '拔剑', eff: '剑意入体，或伤及道心', act: 'tx:tx_tian2:draw', risk: 'risk' },
        { t: '先扫去剑上积雪', eff: '敬之，可安稳承剑', act: 'tx:tx_tian2:clear', risk: 'peace' },
        { t: '不动，等它化雪', eff: '以静制动，或有意外', act: 'tx:tx_tian2:wait', risk: 'chance' }
      ]
    },
    {
      id: 'tx_xian', name: '太阴垂照', tier: 'xian', needRealm: 5,
      verse: '月轮西沉，最后一线光华落在你眉心。你听见有人在你耳边说：「形蜕而神存，死生不再受形所囿。」',
      hint: '仙阶功法 · 需道胎',
      opts: [
        { t: '受此一线月华', eff: '或得仙法，或化道', act: 'tx:tx_xian:moon', risk: 'risk' },
        { t: '退回屋中，闭门', eff: '避其锋芒，无功无过', act: 'tx:tx_xian:retreat', risk: 'peace' },
        { t: '以自身道果相换', eff: '需付出果位，可得真法', act: 'tx:tx_xian:trade', risk: 'chance' }
      ]
    }
  ];

  /* 记录已触发过的传法（避免重复） */
  function txDone(id) { return (S.txHistory || []).indexOf(id) >= 0; }
  function markTx(id) { S.txHistory = (S.txHistory || []).concat([id]); }

  /* 破境/破柱后调用：若已有弹窗（仙基、果位、受箓）则让位，等下次 */
  function maybeTransmitNow() {
    const box = document.getElementById('modals');
    // 仙基/果位/受箓这类主线必答弹窗优先，传法让位
    if (box && box.innerHTML && !box.innerHTML.includes('机缘 · ')) return false;
    /* v10.3 P1：普通奇遇让位给传法时，必须走 clearModalBody ——
       以前只清 innerHTML，modal-open 留在 body 上，玩家整页滚不动。 */
    if (box && box.innerHTML.includes('机缘 · ')) clearModalBody();
    return tryTransmission();
  }

  /* 到境界就触发：破境后调用 */
  function tryTransmission() {
    if (S.phase !== 'play') return false;
    const pool = D.TRANSMISSIONS.filter(function (t) { return !txDone(t.id) && S.xRealm >= t.needRealm; });
    if (!pool.length) return false;
    // 只取最接近当前境界的那个（保证按境界递进）
    pool.sort(function (a, b) { return a.needRealm - b.needRealm; });
    const t = pool[0];
    if (rnd100() > 62) return false;    // 62% 概率触发
    openTransmission(t);
    return true;
  }

  function openTransmission(t) {
    markTx(t.id);
    S.pendingTx = t.id;
    let b = '';
    if (t.poem) b += '<div class="poem" style="font-size:15px;line-height:1.95;padding:2px 0 10px">' +
      poemHtml(t.poem) + '</div>';
    b += '<div class="liturgy">' + esc(t.verse) + '</div>';
    b += divider() + '<div class="small muted">' + esc(t.hint) + '</div>';
    b += '<ul class="opts">';
    t.opts.forEach(function (o, i) {
      b += optRow('ABC'[i], o.t, { name: o.risk === 'risk' ? '凶险' : o.risk === 'chance' ? '机缘' : '平和', cls: o.risk }, o.eff, false, o.act);
    });
    b += '</ul>';
    b += '<div class="hint">此法不传于坊市。得之是缘，失之是命。</div>';
    openModal('传法 · ' + t.name, b, true);
    logLine('你遇上了「' + t.name + '」。', 'good');
  }

  /* 从指定品阶里给一本未学的功法 */
  function grantTopGongfa(tier) {
    const pool = D.GONGFA_EXT.filter(function (g) {
      return g.tier === tier && !(S.ownedGongfa || []).includes(g.id);
    });
    if (!pool.length) return null;
    const g = pick(pool);
    addGongfa(g.id);
    return g;
  }

  /* 传法结算 */
  ACT.do_tx = (id, opt) => {
    closeModal();
    S.pendingTx = null;
    const t = D.TRANSMISSIONS.find(function (x) { return x.id === id; });
    if (!t) return render();
    const R = rnd100();
    let msg = '', cls = '';
    const chance = 45 + st('insight') * 2 + st('heart') * 1.5;

    switch (id + ':' + opt) {
      /* 地阶 1：残碑问法 */
      case 'tx_di:parse':
        if (R <= chance) { const g = grantTopGongfa('di'); msg = g ? ('碑上法诀入心——「' + g.name + '」。') : '碑文所述，你早已领会。'; cls = 'good'; }
        else { S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.2)); S.stats.insight = Math.max(1, S.stats.insight - 1); msg = '强行解碑，气机逆冲，气血二成、悟性 −1。'; cls = 'danger'; }
        break;
      case 'tx_di:sit':
        advanceXun(1);
        if (S.phase !== 'play') { render(); return; }
        if (R <= chance + 25) { const g = grantTopGongfa('di'); msg = g ? ('静坐三日，碑文自通——「' + g.name + '」。') : '静坐三日，一无所获。'; cls = g ? 'good' : ''; }
        else { msg = '坐了三天，只坐麻了腿。'; }
        break;
      case 'tx_di:take':
        S.txScroll = (S.txScroll || 0) + 1; S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
        msg = '你拓下碑文。虽未参透，却记住了每一个字的笔势。悟性 +1。'; cls = 'good';
        break;

      /* 地阶 2：雨中送伞人 */
      case 'tx_di2:ask':
        if (R <= chance + 10) { const g = grantTopGongfa('di'); msg = g ? ('他说："拿去吧。"——「' + g.name + '」。') : '他说："你已不需要了。"'; cls = 'good'; }
        else { S.merit += 20; msg = '他没答，只是笑了笑。功德 +20。'; cls = 'good'; }
        break;
      case 'tx_di2:quiet':
        {
          const g = grantTopGongfa('di');
          if (g) pushHook('hook_umbrella', { given: '地阶功法《' + g.name + '》' });
          msg = g ? ('受伞不问，得「' + g.name + '」。你欠下一份人情。') : '你把伞收好了。';
          cls = 'good';
        }
        break;
      case 'tx_di2:refuse':
        S.stats.heart = clamp(S.stats.heart + 2, 1, 20); S.merit += 25;
        msg = '你推辞了。雨里站了很久，道心 +2，功德 +25。'; cls = 'good';
        break;

      /* 天阶 1：洞天传音 */
      case 'tx_tian:follow':
        if (R <= chance - 10) {
          const g = grantTopGongfa('tian');
          if (g) pushHook('hook_voice', { given: '天阶功法《' + g.name + '》' });
          msg = g ? ('跟着念完最后一句，洞天静了——「' + g.name + '」。') : '声音停了。';
          cls = 'good';
        }
        else { S.stats.heart = Math.max(1, S.stats.heart - 2); S.karma += 20; msg = '你念到一半，发现自己记不起自己的名字。道心 −2，业力 +20。'; cls = 'danger'; }
        break;
      case 'tx_tian:probe':
        if (R <= chance + 5) { const g = grantTopGongfa('tian'); msg = g ? ('神识探底，原是一缕残魂在守经——「' + g.name + '」。') : '底下空无一物。'; cls = 'good'; }
        else { S.mp = Math.max(0, S.mp - Math.round(S.mpMax * 0.4)); msg = '神识被弹回，灵力折损四成。'; cls = 'danger'; }
        break;
      case 'tx_tian:seal':
        S.stats.heart = clamp(S.stats.heart + 1, 1, 20); S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
        msg = '你封住耳窍退出。道心 +1，悟性 +1——知道自己听不得什么，也是一种长进。'; cls = 'good';
        break;

      /* 天阶 2：雪中授剑 */
      case 'tx_tian2:draw':
        if (R <= chance - 5) {
          const g = grantTopGongfa('tian');
          if (g) pushHook('hook_sword', { given: '天阶功法《' + g.name + '》' });
          msg = g ? ('剑意灌顶——「' + g.name + '」。') : '剑拔出来了，却没有字。';
          cls = 'good';
        }
        else { S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.35)); msg = '剑意反噬，气血三成五。'; cls = 'danger'; }
        break;
      case 'tx_tian2:clear':
        if (R <= chance + 20) { const g = grantTopGongfa('tian'); msg = g ? ('雪扫尽处，剑上法诀自现——「' + g.name + '」。') : '剑上没有字。'; cls = 'good'; }
        else { msg = '雪扫了，字也淡了。'; }
        break;
      case 'tx_tian2:wait':
        if (R <= chance + 8) { S.stats.insight = clamp(S.stats.insight + 3, 1, 20); S.stones += 600; msg = '雪化之后，剑变成了一枚旧玉钱。悟性 +3，得 600 灵石。'; cls = 'good'; }
        else { msg = '雪化了，剑也没了。'; }
        break;

      /* 仙阶：太阴垂照 */
      case 'tx_xian:moon':
        if (R <= chance - 20) { const g = grantTopGongfa('xian'); msg = g ? ('月华入眉心，你得了「' + g.name + '」。') : '月华过头，什么也没留下。'; cls = 'good'; }
        else { die('道化：最后一线月华照穿了你的意识。你还站着，只是不再是你。'); render(); return; }
        break;
      case 'tx_xian:retreat':
        msg = '你退回屋中。门关上，月光留在外面。'; break;
      case 'tx_xian:trade':
        if (S.guowei) { S.guowei = null; const g = grantTopGongfa('xian'); S.stats.heart = clamp(S.stats.heart + 3, 1, 20); msg = g ? ('以果位换真法——「' + g.name + '」。果位没了，道心 +3。') : '什么也没换来。'; cls = 'good'; }
        else { msg = '你没有果位可换。'; }
        break;
      default: msg = '什么也没发生。';
    }

    if (msg) logLine(msg, cls);
    if (S.phase === 'play') { advanceXun(1); }
    render();
  };

  /* 破境成功后诵铭文 + 一句诗
     铭文是仪轨（据《玄鉴仙族》），诗是心境。两句一起出来，破境才不像一条日志。 */
  /* 旧版永远取 list 的最后一条 → 同一境界每次都是同一句。
     现在：筛出「当前及以下」，取其中最高的那一档，档内随机。 */
  function reciteVerse(kind) {
    const V = (D.VERSES || {});
    let pool = [], key = 'realm', cur = S.xRealm || 0;
    if (kind === 'breakShen') { key = 'pillar'; cur = S.pillar || 0; pool = V.breakShen || []; }
    else if (kind === 'breakStage') { key = 'realm'; pool = V.breakStage || []; }
    else { pool = V.breakXian || []; }
    const ok = pool.filter(function (v) { return (v[key] || 0) <= cur; });
    if (!ok.length) return '';
    const top = Math.max.apply(null, ok.map(function (v) { return v[key] || 0; }));
    let band = ok.filter(function (v) { return (v[key] || 0) === top; });
    /* 同一档里有多句时，避开上一句——否则连着破两次境会念同一首诗。
       旧版把 S.lastVerse 存了下来却从不读，等于白存。 */
    if (band.length > 1) {
      const fresh = band.filter(function (v) { return v.line !== S.lastVerse; });
      if (fresh.length) band = fresh;
    }
    const v = pick(band);
    S.lastVerse = v.line;
    return v.line;
  }

  /* 诗句排版：两句一行。
     ------------------------------------------------------------
     旧写法 `esc(poem).replace(/，/, '，<br>')` 只断第一处，
     七言四句会被切成 1+3 两行，长短悬殊，气口全乱。
     古体诗一行两句才对——这里先按句读切开，再两两拼回。 */
  function poemHtml(s) {
    const t = String(s || '');
    const parts = [];
    let cur = '';
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      cur += ch;
      if ('，。；！？'.indexOf(ch) >= 0) { parts.push(cur); cur = ''; }
    }
    if (cur) parts.push(cur);
    if (parts.length < 3) return esc(t);   // 一句或两行的短诗不用断
    const lines = [];
    for (let i = 0; i < parts.length; i += 2) lines.push(parts[i] + (parts[i + 1] || ''));
    return lines.map(function (x) { return esc(x); }).join('<br>');
  }

  /* 破境/失败的独立诗窗。破境是全局最重的节点之一，用一行 logLine 带过太轻了。 */
  function openVersePop(title, poem, rows, opt) {
    opt = opt || {};
    let b = '<div class="poem">' + poemHtml(poem) + '</div>';
    if (opt.sub) b += '<div class="poemnote">' + esc(opt.sub) + '</div>';
    if (rows && rows.length) {
      b += divider();
      b += '<ul class="gainlist">';
      rows.forEach(function (r) {
        b += '<li><span class="gn">' + esc(r.k) + '</span>' +
          '<span class="gx ' + (r.cls || '') + '">' + r.v + '</span></li>';
      });
      b += '</ul>';
    }
    if (opt.tail) b += '<div class="small muted" style="margin-top:8px">' + opt.tail + '</div>';
    b += '<ul class="opts" style="margin-top:12px">' +
      optRow('A', opt.btn || '继续', { name: '前行', cls: 'chance' }, '', false, opt.act || 'modal:close') +
      '</ul>';
    openModal(title, b, true);
  }

  function reciteLiturgy(kind) {
    const arr = D.LITURGY[kind] || D.LITURGY.breakXian;
    const line = pick(arr);
    S.lastLiturgy = line;
    logLine('· ' + line, '');
    const v = reciteVerse(kind);
    if (v) logLine('· ' + v, 'good');
  }

  /* ---------- 法宝 ---------- */
  function hasUsablePill() {
    return D.PILL_EXT.some(function (p) { return (S.bag[p.id] || 0) > 0 && ['hp','hpPct','hpFull','cure','mp','mpPct','mpFull'].includes(p.type); });
  }

  function ownedArts() { return S.arts || []; }
  function equipArt(id) {
    const a = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
    if (!a) return;
    S.equipped = S.equipped || {};
    if (S.equipped[a.slot] === id) { delete S.equipped[a.slot]; logLine('收起「' + a.name + '」。', ''); return; }
    S.equipped[a.slot] = id;
    logLine('祭起「' + a.name + '」。', 'good');
  }
  function artBonus(kind) {
    let v = 0;
    const e = S.equipped || {};
    for (const slot in e) {
      const a = D.ARTIFACT_EXT.find(function (x) { return x.id === e[slot]; });
      if (a && a.bonus && Number(a.bonus[kind])) v += Number(a.bonus[kind]);
    }
    /* v10.7 阶段二：本命不再借用普通法器 —— 普通法器加成只算一遍。
       旧版这里把本命法器自己的 bonus 再交一遍（「认主翻倍」），
       本命独立后这条双向计账必须消失，否则同一件法器的加成仍被算两次。
       本命的能力走 ext-40 的独立口（被动/法技/器损），不经过 artBonus。 */
    return v;
  }
  function applyAttackArtCost() {
    /* v10.5 P1·C4：百魂幡的固定反噬随上限一起抬，
       固定 5 在 2400 上限时是噪声，等于「攻击位法宝白送」。 */
    const cost = Math.max(artBonus('hpCost'), Math.round(S.hpMax * ART_HP_COST_PCT));
    if (cost > 0) {
      S.hp = Math.max(1, S.hp - cost);
      logLine('百魂幡反噬，气血 −' + cost + '。', 'danger');
    }
  }

  /* ---------- 术法（SKILLS + role=fa 功法）----------
     与修炼功法分家之后：术法不再随境界白送，
     要么入宗门在藏经阁学，要么靠奇遇/传法撞上。
     「真传才授上乘神通」——zhen 层只有真传身份能碰。 */
  /* v10.5 P0·A2：术法池 = SKILLS + GONGFA(role=fa)。
     fa 功法用 'fa:' 前缀存 id，避免与 SKILLS 的同名 id 撞车
     （烈火掌 fa:liehuo 与焚山掌 liehuo 是两回事）。 */
  const FA_ART_COST = { huang: 25, xuan: 30, di: 40, tian: 50, xian: 60 };
  const FA_ART_MUL = { huang: 1.35, xuan: 1.50, di: 1.70, tian: 1.90, xian: 2.10 };
  const EL_TO_KIND = { metal: 'sword', fire: 'fire', water: 'water', wood: 'wood', earth: 'earth',
    thunder: 'thunder', ice: 'water', wind: 'normal', yin: 'normal', yang: 'fire' };
  function faArtSpec(g) {
    return {
      id: 'fa:' + g.id, name: g.name,
      cost: FA_ART_COST[g.tier] || 30, mul: FA_ART_MUL[g.tier] || 1.40,
      kind: EL_TO_KIND[g.el] || 'normal',
      lvl: g.tier === 'huang' ? 'wai' : g.tier === 'xuan' ? 'nei' : 'zhen',
      desc: g.eff, fromGongfa: true
    };
  }
  function artSpecOf(id) {
    if (!id) return null;
    if (id.indexOf('fa:') === 0) {
      const g = gongfaById(id.slice(3));
      return (g && g.role === 'fa') ? faArtSpec(g) : null;
    }
    return D.SKILLS.find(function (k) { return k.id === id; }) || null;
  }
  function artSpecByName(nm) {
    const sk = D.SKILLS.find(function (k) { return k.name === nm; });
    if (sk) return sk;
    const g = D.GONGFA.find(function (x) { return x.role === 'fa' && x.name === nm; });
    return g ? faArtSpec(g) : null;
  }
  function hasArt(id) { return Array.isArray(S.ownedArts) && S.ownedArts.indexOf(id) >= 0; }

  function knownSkills() {
    if (!Array.isArray(S.skillsKnown)) S.skillsKnown = [];
    const ids = ['zhiquan'].concat(S.skillsKnown.filter(function (x) { return x !== 'zhiquan'; }));
    (Array.isArray(S.ownedArts) ? S.ownedArts : []).forEach(function (id) {
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    return ids.map(function (id) { return artSpecOf(id); }).filter(Boolean);
  }
  /* 装配进斗法的招式池 */
  function equippedSkills() {
    const pool = knownSkills();
    const eq = Array.isArray(S.skillsEquip) ? S.skillsEquip : [];
    let out = pool.filter(function (k) { return eq.indexOf(k.id) >= 0; });
    if (!out.length) out = [pool[0]];
    return out.filter(Boolean).slice(0, equipLimit());
  }
  /* 宗门按身份给格；散修随大境界从 2 格长到 4 格。 */
  function equipLimit() {
    if (S.sect) return (D.SECT.ranks[S.sect.rank] || D.SECT.ranks[0]).equip;
    return clamp(2 + Math.floor((S.xRealm || 0) / 2), 2, 4);
  }
  function learnArt(id) {
    if (!artSpecOf(id)) return false;
    if (id.indexOf('fa:') === 0) {
      if (!Array.isArray(S.ownedArts)) S.ownedArts = [];
      if (S.ownedArts.indexOf(id) >= 0) return false;
      S.ownedArts.push(id);
    } else {
      if (!Array.isArray(S.skillsKnown)) S.skillsKnown = [];
      if (id === 'zhiquan' || S.skillsKnown.indexOf(id) >= 0) return false;
      S.skillsKnown.push(id);
    }
    if (!Array.isArray(S.skillsEquip)) S.skillsEquip = ['zhiquan'];
    if (S.skillsEquip.indexOf(id) < 0 && S.skillsEquip.length < equipLimit()) S.skillsEquip.push(id);
    return true;
  }
  function learnSkill(id) { return learnArt(id); }   // 兼容旧调用
  function skillById(id) { return artSpecOf(id); }
  /* 该身份能学哪一层 */
  function sectAllowedLvl() {
    if (!S.sect) return ['wai'];
    return (D.SECT.ranks[S.sect.rank] || D.SECT.ranks[0]).lvl;
  }
  /* B3 修复 + 同源共鸣
     旧代码：D.ELEMENTS[g.el].name === sk.kind
     name 是「火」、kind 是 'fire'，'火'==='fire' 永远 false —— 这条功法↔招式的
     唯一纽带从来没生效过。现在比英文键，并把相生/相克补上。 */
  function resonResult(sk) {
    const g = getDaogong();
    if (!g || !g.el || !sk.kind || sk.kind === 'normal' || sk.kind === 'control') return { mul: 1, txt: '' };
    if (g.el === sk.kind) return { mul: 1.20, txt: '同源' };
    if (D.SHENG[g.el] === sk.kind) return { mul: 1.10, txt: '相生' };
    const my = D.ELEMENTS[g.el];
    if (my && my.ke === sk.kind) {
      // 相克不是纯减益：逆用得当，反而能杀个措手不及
      return rng() < 0.30
        ? { mul: 1.50, txt: '相克逆用' }
        : { mul: 0.85, txt: '相克' };
    }
    return { mul: 1, txt: '无关' };
  }

  function skillMulByName(nm) {
    const sk = artSpecByName(nm);
    if (!sk) return 1;
    const r = resonResult(sk);
    skillMulByName.last = r.txt;      // 供战斗日志取用
    return sk.mul * r.mul;
  }

  /* ---------- 奇遇（机缘三选一） ---------- */
  function tryEncounter(force) {
    if (S.phase !== 'play') return false;
    // 因果缠身：来人更多（有人在放线）
    /* v10.4 P0·3.1：梅花易「机缘 +6」终于参与机缘判定。
       旧版 gongfaFate 只在探针里被读，奇遇掷骰完全没接。 */
    const encRate = 18 + (hasDebuff('karma_tangle') ? 6 : 0) + (hasDebuff('marked_rich') ? 4 : 0)
      + gongfaFateAdd();
    if (!force && rnd100() > encRate) return false;
    const pool = D.ENCOUNTERS.filter(function (e) {
      if (e.kind === 'xian') return isXian() || S.cultivation === 'both';
      if (e.kind === 'shen') return isShen() || S.cultivation === 'both';
      return true;
    });
    if (!pool.length) return false;
    // 同一个机缘连着来三次，就不叫机缘了：最近见过的先让开
    const seen = (S.encSeen || []).slice(-3);
    let pickPool = pool;
    if (pool.length > 4) {
      const fresh = pool.filter(function (e) { return seen.indexOf(e.id) < 0; });
      if (fresh.length) pickPool = fresh;
    }
    const e = pickPool[Math.floor(rng() * pickPool.length)];
    S.encSeen = (S.encSeen || []).concat([e.id]).slice(-6);
    openEncounter(e);
    return true;
  }

  function openEncounter(e) {
    S.pendingEnc = e.id;
    bump('enc'); bumpIn('encIds', e.id);
    if (S.currentScene === 'save') bump('saveAndKill');
    let b = '';
    if (e.poem) b += '<div class="poem" style="font-size:14.5px;line-height:1.9;padding:2px 0 9px">' +
      poemHtml(e.poem) + '</div>';
    /* 机缘氛围图：按 kind（common/xian/shen）取图标，放在文字上方，
       让玩家先看到"这是哪一路机缘"，再读内容。 */
    b += iconTagByKey(iconKey('ENCOUNTERS', e.id), 'lg', 'ico--band');
    b += '<div class="small">' + esc(e.text) + '</div>';
    b += divider() + '<ul class="opts">';
    e.opts.forEach(function (o, i) {
      b += optRow('ABC'[i], o.t, { name: o.risk === 'risk' ? '风险' : o.risk === 'chance' ? '机缘' : '平和', cls: o.risk }, o.eff, false, o.act);
    });
    b += '</ul>';
    b += '<div class="hint">机缘是自己选的。选错未必死，但会留下痕迹。</div>';
    openModal('机缘 · ' + e.name, b, true);
    logLine('遇「' + e.name + '」。', '');
  }

  /* ---------- 奇遇结算 ---------- */
  ACT.do_enc = (id, sub, etc) => {
    const parts = (id + ':' + sub).split(':');
    const eid = parts[0], opt = parts[1];
    closeModal();
    S.pendingEnc = null;
    const R = rnd100();
    let msg = '', cls = '';
    const hit = (base) => R <= base;

    switch (eid) {
      /* 崖边老者 */
      case 'oldman':
        if (opt === 'ask') {
          if (hit(40 + st('fate') * 2)) { S.stats.insight = clamp(S.stats.insight + 2, 1, 20); msg = '老者随口提点了两句，悟性 +2。'; cls = 'good'; }
          else { S.xiuwei = Math.max(0, S.xiuwei - 20); msg = '他说了一堆废话，你白耗半日。'; cls = 'danger'; }
        } else if (opt === 'pass') { msg = '你绕开了他。山道安静得像没人来过。'; }
        else {
          if (S.stones < 20) { toast('灵石不足'); return render(); }
          S.stones -= 20;
          if (hit(70)) { S.stones += 400; msg = '老者塞给你一块旧玉，转手能当 400 灵石。'; cls = 'good'; }
          else { S.merit += 20; S.fame += 10; pushGiven('崖边老者', '半块饼', 1, 0); msg = '他吃完饼，朝你点了下头，走了。功德 +20。'; cls = 'good'; }
        }
        break;
      /* 无名古洞 */
      case 'cave':
        if (opt === 'copy') {
          if (hit(55)) {
            const pool = D.GONGFA_EXT.filter(function (g) { return ['huang', 'xuan'].indexOf(g.tier) >= 0 && !(S.ownedGongfa || []).includes(g.id); });
            if (pool.length) { const g = pick(pool); addGongfa(g.id); msg = '抄得残卷：' + g.name + '（' + D.GONGFA_TIERS[g.tier].name + '）。'; }
            else msg = '残卷上的法诀你已精通，抄了也是白抄。';
            cls = 'good';
          } else { msg = '残卷缺页太多，抄不成篇。'; }
        } else if (opt === 'sit') {
          S.xiuwei += 30; msg = '就地打坐，修为 +30。洞中灵气一次而竭。'; cls = 'good';
        } else {
          if (hit(45)) {
            S.stones += 800;
            const pool = D.MATERIAL_EXT.filter(function (m) { return m.tier !== 'huang'; });
            const m = pick(pool); addMat(m.id, 1);
            msg = '洞底有一具枯骨，怀里揣着 800 灵石和一株' + m.name + '。'; cls = 'good';
          } else { startCombat(false); return; }   // 遇妖
        }
        break;
      /* 濒死的修士 */
      case 'dying':
        if (opt === 'save') {
          const hasPill = D.PILL_EXT.filter(function (p) { return (S.bag[p.id] || 0) > 0 && ['cure', 'hp', 'hpFull'].includes(p.type); })[0];
          if (!hasPill && S.stones < 200) { toast('没有疗伤丹药，灵石也不足 200'); return render(); }
          if (hasPill) S.bag[hasPill.id] -= 1; else S.stones -= 200;
          if (hit(65)) {
            S.merit += 40; S.fame += 25; S.npcKnow = (S.npcKnow || 0) + 1;
            S.stones += 600;
            pushGiven('濒死的修士', '救命之恩', 3, computePower());
            msg = '他活下来了，临走留了 600 灵石和一句话："我叫 X，来日还你。"功德 +40。'; cls = 'good';
          } else { S.merit += 30; msg = '他没能撑过去。你替他合了眼，功德 +30。'; cls = 'good'; }
        } else if (opt === 'rob') {
          S.stones += 1200; S.karma += 15;
          msg = '你取走了他的储物袋，得 1200 灵石。业力 +15。'; cls = 'danger';
        } else { msg = '你转身就走。身后没什么声音。'; }
        break;
      /* 野庙荒祠 */
      case 'ruined':
        if (opt === 'rebuild') {
          if (S.xianghuo < 300) { toast('香火不足 300'); return render(); }
          S.xianghuo -= 300;
          if (!S.miao || S.miao === '野祀') S.miao = '野祀';
          S.followers = Math.min(followLimit(), S.followers + 120);
          S.merit += 25; S.miaoSites = (S.miaoSites || 0) + 1;
          msg = '你重立了香火。此庙归你，信众 +120，庙址 +1。'; cls = 'good';
        } else if (opt === 'take') {
          S.xianghuo = Math.min(maxXianghuo(), S.xianghuo + 200); S.karma += 10;
          msg = '供桌上的陈年香油倒还值点钱，香火 +200。业力 +10。'; cls = 'danger';
        } else { S.xianghuo = Math.min(maxXianghuo(), S.xianghuo + 80); msg = '上三炷香，香火 +80。'; cls = 'good'; }
        break;
      /* 坊市拍卖 */
      case 'market':
        if (opt === 'bid') {
          if (S.stones < 800) { toast('灵石不足 800'); return render(); }
          S.stones -= 800;
          if (hit(50)) {
            const pool = D.ARTIFACT_EXT.filter(function (a) { return a.price <= 2500 && !(S.arts || []).includes(a.id); });
            if (pool.length) { const a = pick(pool); S.arts = (S.arts || []).concat([a.id]); msg = '拍得「' + a.name + '」：' + a.eff; }
            else { S.stones += 600; msg = '拍下的是旧货，你识破了，钱没白花，转了 600 灵石。'; }
            cls = 'good';
          } else { msg = '价被抬到天上去，你没拿下，800 灵石打了水漂。'; cls = 'danger'; }
        } else if (opt === 'watch') { S.fame += 8; S.stats.insight = clamp(S.stats.insight + 1, 1, 20); msg = '你看了一场好戏，声望 +8，悟性 +1。'; cls = 'good'; }
        else {
          if (hit(35)) { S.stones += 900; msg = '你摸进了后台，顺走一只玉匣，得 900 灵石。'; cls = 'good'; }
          else { S.fame -= 10; S.karma += 8; msg = '被人撞破，你狼狈脱身，声望 −10，业力 +8。'; cls = 'danger'; }
        }
        break;
      /* 负伤的妖物 */
      case 'beast':
        if (opt === 'heal') {
          if (S.stones < 300) { toast('灵石不足 300'); return render(); }
          S.stones -= 300;
          if (hit(55)) {
            /* v8.1 P0 M4：救活的妖物真正进兽栏，不再是一个孤立布尔。
               兽栏满或灵脉不济时明说，而不是静默把「它认你了」吞掉。 */
            const add = beastAdd('huyao');
            if (add.ok) {
              bump('beastTame');
              msg = '妖物伤愈后没走，蹲在你洞口。它认你了。'; cls = 'good';
            } else {
              S.merit += 20;
              msg = '它伤好了，嗅了嗅槽边的空处，转身走了——' + add.why + '。功德 +20。'; cls = 'good';
            }
          }
          else { S.merit += 20; msg = '它伤太重，还是死了。功德 +20。'; cls = 'good'; }
        } else if (opt === 'kill') {
          S.karma += 12; addMat('mudanYao', 1);
          msg = '取了一枚妖丹，业力 +12。'; cls = 'danger';
        } else { msg = '你绕过它，什么也没发生。'; }
        break;
      /* 荒村大旱 */
      case 'storm':
        if (opt === 'rain') {
          if (isShen()) {
            if (S.xianghuo < 150) { toast('香火不足 150'); return render(); }
            S.xianghuo -= 150;
          } else {
            if (S.mp < 40) { toast('灵力不足 40'); return render(); }
            S.mp -= 40;
          }
          S.followers = Math.min(followLimit(), S.followers + 200);
          S.merit += 60; S.fame += 40; addRenGong(200);
          if (hit(75)) { msg = '雨下了三天。一村人都记住了你的名字。信众 +200，功德 +60。'; cls = 'good'; }
          else { msg = '雨来了，却小得可怜。信众 +200，但没人真信你。'; }
        } else if (opt === 'take') {
          S.followers = Math.min(followLimit(), S.followers + 300); S.karma += 18;
          msg = '你收编了这一村的祭祀。信众 +300，业力 +18——他们从此求的是你。'; cls = 'danger';
        } else {
          const p = D.PILL_EXT.filter(function (x) { return (S.bag[x.id] || 0) > 0; })[0];
          if (!p) { toast('身上没丹药'); return render(); }
          S.bag[p.id] -= 1; S.merit += 30;
          msg = '你留下一颗' + p.name + '，走了。功德 +30。'; cls = 'good';
        }
        break;
      /* 溪底玉匣 */
      case 'jade':
        if (opt === 'open') {
          if (hit(45)) { S.stones += 1500; msg = '匣里是一枚旧钱币，价高得离谱——1500 灵石。'; cls = 'good'; }
          else { S.karma += 25; startCombat(false); return; }
        } else if (opt === 'keep') { S.bag.yuhe = 1; msg = '你把玉匣收了。不知道里面是什么，但有人会想要。'; }
        else { S.merit += 20; msg = '你重新封好沉底。功德 +20，心口莫名一松。'; cls = 'good'; }
        break;
      /* 叩门的旧识 */
      case 'debtor':
        if (opt === 'host') {
          if (hit(50)) { S.stones += 500; S.npcKnow = (S.npcKnow || 0) + 1; msg = '他没引来仇家，走时留下 500 灵石。'; cls = 'good'; }
          else { S.karma += 10; startCombat(true); return; }
        } else if (opt === 'refuse') {
          const ids = Object.keys(S.npcs).filter(function (i) { return S.npcs[i].met; })[0];
          if (ids) S.npcs[ids].fav = Math.max(0, S.npcs[ids].fav - 10);
          msg = '门关上了。屋里很静。';
        } else {
          S.stats.fate = clamp(S.stats.fate + 2, 1, 20);
          msg = '他讲了一夜，你记住了两条要紧的线索。命数 +2。'; cls = 'good';
        }
        break;
      /* 残页天书 */
      case 'scripture':
        if (opt === 'buy') {
          if (S.stones < 500) { toast('灵石不足 500'); return render(); }
          S.stones -= 500;
          if (hit(50)) {
            const pool = D.GONGFA_EXT.filter(function (g) { return !(S.ownedGongfa || []).includes(g.id); });
            if (pool.length) { const g = pick(pool); addGongfa(g.id); msg = '残页拼出一部「' + g.name + '」。'; }
            else msg = '拼出来的法诀你已会。';
            cls = 'good';
          } else { msg = '拼不成篇，只记住了半句。'; }
        } else if (opt === 'trade') {
          S.fame += 15; S.stones += 200; msg = '你以一枚旧玉换了残页，摊主还倒贴 200 灵石。声望 +15。'; cls = 'good';
        } else { S.stats.insight = clamp(S.stats.insight + 2, 1, 20); msg = '你默记半句，悟性 +2。'; cls = 'good'; }
        break;
      /* ====== 2026-11-17 素材增补：十五处奇遇 ======
         每处三个选项，没有唯一正解。有的给东西，有的给明白，有的给一笔债。
         文字取白描，不替玩家下判断。 */
      /* 残符石门 */
      case 'stoneGate':
        if (opt === 'push') {
          addMat('huanShi', 1); S.karma += 2;
          msg = '门后是一间废丹房，炉冷百年。炉膛里结一枚废丹，色黑，你取走了。夜里梦见有人立在门内，朝你点头。';
          cls = 'good';
        } else if (opt === 'leave') {
          S.stats.heart = clamp(S.stats.heart + 1, 1, 20);
          msg = '你把残符揭下，按回原位。转身下山，身后山风停了一瞬。有些门不是用来开的，是用来记得的。';
          cls = 'good';
        } else {
          gainXiuwei(40); S.karma += 5;
          msg = '火符烧了残符，石门自开。门后空无一物，满地符灰排成一个「谢」字。你不知道那个字是说给谁的。';
          cls = 'danger';
        }
        break;
      /* 断剑 */
      case 'brokenSword':
        if (opt === 'keep') {
          addMat('tieMu', 1); S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
          msg = '你以灵气养它三月。锈下露出第二行小字：斩过不该斩的。';
          cls = 'good';
        } else if (opt === 'back') {
          S.stats.fate = clamp(S.stats.fate + 2, 1, 20);
          msg = '你把断剑插回滩泥。三日后再过，剑没了，滩上多一丛芦苇，长得极直。';
          cls = 'good';
        } else {
          S.stones += 80;
          msg = '拿去铁匠铺熔了。铁匠打出一把锄头，硬得离谱，转手卖了八十灵石。剑系的人听说，看你的眼神淡了。';
          cls = '';
        }
        break;
      /* 夜半授业 */
      case 'nightTeach':
        if (opt === 'learn') {
          gainXiuwei(50); S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
          msg = '那一式上手极快，快得不像初学。你练了三日，忽然想起：教得这样准的人，必是看过你出手。';
          cls = 'good';
        } else if (opt === 'refuse') {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          msg = '不知来路的东西，不用。当夜风很大，你睡得很稳。';
          cls = 'good';
        } else {
          S.stats.fate = clamp(S.stats.fate + 3, 1, 20);
          S.lifeMax = Math.max(20, (S.lifeMax || 0) - 5);
          msg = '以梅花小占逆推，算出一座废观的方向。卦金折在寿数上，去了五年。';
          cls = '';
        }
        break;
      /* 义庄老尸 */
      case 'corpseHall':
        if (opt === 'stay') {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          msg = '三更，棺中传出抓挠声。你坐得离棺很近，抓挠声慢慢停了。看门人送你一页《镇魂贴》残篇。';
          cls = 'good';
        } else if (opt === 'burn') {
          S.karma += 10; S.stones += 120;
          msg = '火起时棺里的人坐了起来，没有打你，只是看着火，看了很久。灰里得一枚尸丹，转手卖了。';
          cls = 'danger';
        } else {
          S.stones += 60;
          msg = '你收了双倍酒钱。出门时他说：明年今日，这酒还温着。';
          cls = '';
        }
        break;
      /* 落难仙子 */
      case 'fallenFairy':
        if (opt === 'save') {
          S.fame += 6; S.karma += 3;
          msg = '救下才知她不是仙子，是魔门放出来的人材，她自己。黑衣人临走看了你一眼，记住了你的脸。';
          cls = 'good';
        } else if (opt === 'report') {
          S.fame += 5; S.stones += 30;
          msg = '官差到时人已散了，只余半地血迹与一枚耳环。官府记你一档，赏了三十灵石。';
          cls = '';
        } else {
          S.stats.heart = clamp(S.stats.heart - 2, 1, 20);
          S.karma += 3;
          msg = '你看了全程，没动。最后她自己断了经脉，黑衣人抬走的是尸首。你记住了他们腰间的铜牌。';
          cls = 'danger';
        }
        break;
      /* 井中月 */
      case 'wellMoon':
        if (opt === 'reach') {
          S.stats.insight = clamp(S.stats.insight + 2, 1, 20);
          S.lifeMax = Math.max(20, (S.lifeMax || 0) - 3);
          msg = '指尖触影那刻，井底传来一声很轻的「唉」。此后每逢月圆，你总觉得手是凉的。';
          cls = '';
        } else if (opt === 'incense') {
          S.piety = clamp((S.piety || 1) + 0.1, 0.5, 2.0);
          S.followers += 30;
          msg = '香沉下去，井水影里的月圆了七分。此后月圆之夜，井水可取一盏月露。';
          cls = 'good';
        } else {
          S.stats.heart = clamp(S.stats.heart + 3, 1, 20);
          S.karma = Math.max(0, S.karma - 2);
          msg = '以符纸封了井口。封前对着井说：过路功德，不敢受用。';
          cls = 'good';
        }
        break;
      /* 贩书人 */
      case 'bookSeller':
        if (opt === 'buy') {
          if (S.stones < 30) { toast('灵石不足'); return render(); }
          S.stones -= 30;
          S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
          msg = '买一本错版《炼气心法》。回家细读，错的那一行，恰好是你一直修岔的地方。';
          cls = 'good';
        } else if (opt === 'ask') {
          S.stats.insight = clamp(S.stats.insight + 2, 1, 20);
          msg = '问他为何只在雨天出摊。他说：晴天卖的是字，雨天卖的是漏。';
          cls = 'good';
        } else {
          S.stones += 50; S.karma += 5;
          msg = '报给坊市巡查。摊位连同摊主，一夜消失，巡查署赏了五十灵石。此后雨天，你总觉得街角少点什么。';
          cls = 'danger';
        }
        break;
      /* 故人之账 */
      case 'oldDebt':
        if (opt === 'pay') {
          if (S.stones < 30) { toast('灵石不足'); return render(); }
          S.stones -= 30; S.merit += 15;
          msg = '补他三十灵石与一炉新丹。老人只收丹，不收钱。功德 +15。';
          cls = 'good';
        } else if (opt === 'proof') {
          S.stats.heart = clamp(S.stats.heart - 1, 1, 20);
          gainXiuwei(30);
          msg = '他真拿出凭据，一张三十年前的赊账单，字迹确实像。你从笔迹里看出师父早期的手法。';
          cls = '';
        } else {
          S.karma += 3; S.enemy = true; S.enemyName = '那个老人的后人';
          msg = '「三十年前的账，利息也该涨到头了。」老人笑了：「好，涨到头了。」';
          cls = 'danger';
        }
        break;
      /* 妖物认亲 */
      case 'foxCub':
        if (opt === 'keep') {
          addMat('mudanYao', 1); S.karma += 2;
          msg = '幼狐入袋那刻，远处山头一声长嚎，应了一声。它在你怀里睡了一路，爪子一直攥着你的衣襟。';
          cls = '';
        } else if (opt === 'return') {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          msg = '送到嚎声来处。母狐在崖上看着，没下来。此后你在那片山采药，野兽不袭。';
          cls = 'good';
        } else {
          S.stones += 88; S.karma += 8;
          S.stats.heart = clamp(S.stats.heart - 2, 1, 20);
          msg = '卖了八十八灵石。回家当夜，三只眼睛的图案出现在梦里，一直看着你。';
          cls = 'danger';
        }
        break;
      /* 前人洞府 */
      case 'oldCave':
        if (opt === 'take') {
          gainXiuwei(60);
          if ((S.books || []).indexOf('taiyin') < 0) { S.books = S.books || []; S.books.push('taiyin'); }
          msg = '只取丹药与书。丹三瓶，两瓶完好；书一册，《太阴吐纳养轮经·注本》。';
          cls = 'good';
        } else if (opt === 'occupy') {
          S.lingqiUp = Math.max(S.lingqiUp || 0, (D.LINGQI.length - 1));
          if (typeof syncLingqi === 'function') syncLingqi();
          msg = '连洞府一起占了。搬进去那晚，蒲团还是温的。';
          cls = 'good';
        } else {
          S.sect = S.sect || null;
          if (S.sect) S.sect.contrib = (S.sect.contrib || 0) + 200;
          else S.stones += 100;
          msg = '报给宗门。宗门清点后分你三成，另记大功一次。';
          cls = 'good';
        }
        break;
      /* 雪夜借宿 */
      case 'snowLodge':
        if (opt === 'pay') {
          S.stones = Math.max(0, S.stones - 2);
          S.stats.heart = clamp(S.stats.heart + 1, 1, 20);
          msg = '猎户不收，说雪夜留人，天经地义。你把钱压在碗底。次年春，他家孩子送来一双新毡靴。';
          cls = 'good';
        } else if (opt === 'tale') {
          S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
          msg = '你讲了一夜修仙界的段子，猎户笑了半宿。能把修行讲成段子，是另一种悟。';
          cls = 'good';
        } else {
          gainXiuwei(20); S.karma += 2;
          msg = '你运功到天明。猎户家的狗叫了一夜，第二日他眼里有血丝，什么也没说。';
          cls = '';
        }
        break;
      /* 断香的名号 */
      case 'noNameStele':
        if (opt === 'incense') {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          S.stats.insight = clamp(S.stats.insight + 1, 1, 20);
          msg = '补上三支香。香点着后，碑面浮出一行水痕字：知者不必名。';
          cls = 'good';
        } else if (opt === 'carve') {
          S.fame += 3;
          S.stats.fate = clamp(S.stats.fate - 1, 1, 20);
          msg = '在碑上刻自己的名号。刻完，碑角崩了一小块。碑不欠你什么，是你欠了碑。';
          cls = '';
        } else {
          addMat('fuZhi', 3);
          msg = '拓印碑文带走。拓完才发觉碑上无字，拓的是风磨的纹路，纹路自成一篇符文。';
          cls = 'good';
        }
        break;
      /* 河伯娶亲 */
      case 'riverBride':
        if (opt === 'lift') {
          S.karma = Math.max(0, S.karma - 5);
          S.fame = Math.max(0, S.fame - 5);
          S.merit += 20;
          msg = '你掀了轿，新娘是个十二岁的孩子。村中长老跪下来求你：河要吃人，不吃就涨水。功德 +20，村里人记恨。';
          cls = 'good';
        } else if (opt === 'sham') {
          S.stones += 40; S.followers += 40;
          msg = '你收了主婚钱，夜里让花轿「自己漂走了」。村民以为河伯收了礼，香火转投了你。';
          cls = 'danger';
        } else {
          S.stats.heart = clamp(S.stats.heart - 1, 1, 20);
          msg = '你走得很远，还是听见河声涨了一寸。有些账，看见了就成了共谋。';
          cls = 'danger';
        }
        break;
      /* 官道截杀 */
      case 'escortRaid':
        if (opt === 'help') {
          S.stones += 120; S.fame += 8;
          msg = '助镖师退敌。事后镖头要分你镖银，你拿了一份，另讨了一面旧镖旗。祀部档案记你一笔协防。';
          cls = 'good';
        } else if (opt === 'loot') {
          S.stones += 150; S.karma += 10;
          msg = '截杀者与镖师两败俱伤，你捡了三箱散落的官香，转手换了灵石。祀部的通缉画像上，多了一张脸。';
          cls = 'danger';
        } else {
          S.merit += 15; S.fame += 5;
          msg = '你把两边受伤的都拖开。最后两头都欠你人情，也都有人觉得你多管闲事。';
          cls = 'good';
        }
        break;
      /* 镜湖照影 */
      case 'mirrorLake':
        if (opt === 'sit') {
          S.stats.insight = clamp(S.stats.insight + 2, 1, 20);
          S.stats.heart = clamp(S.stats.heart + 1, 1, 20);
          msg = '与影对坐一夜。天亮时影先起身，替你把火堆踩灭了。';
          cls = 'good';
        } else if (opt === 'break') {
          S.stones += 200;
          msg = '以雷法轰湖，湖水散尽，湖底是一整面古镜，镜背刻满倒写的经文。你把镜子卖了。';
          cls = '';
        } else {
          S.stats.heart = clamp(S.stats.heart + 1, 1, 20);
          msg = '走出十里，身后「扑通」一声，像有人落水。不回头不是错，只是会一直想。';
          cls = '';
        }
        break;
      /* ====== 2026-11-20 素材增补：五处奇遇 ======
         每条都真的改账：数值、钩子、熟练度、好感，各归其位。
         写着「得某物」却什么都不发生的选项，等于骗人。 */
      /* 石液观机 */
      case 'shiyeguanji':
        if (opt === 'cave') {
          S.stats.fate = clamp(S.stats.fate + 2, 1, 20);
          S.breakBonus = (S.breakBonus || 0) + 0.03;
          msg = '一滴入目，见青光一处，定在来月洞府。机缘 +2；此后再看那座洞府，路是熟的。';
          cls = 'good';
        } else if (opt === 'debt') {
          pushHook('hook_old_debt');
          msg = '第二滴入目，见银中带金一缕，闪烁不定——那是一笔旧债，还没到日子。';
          cls = '';
        } else {
          S.stats.fate = clamp(S.stats.fate + 1, 1, 20);
          addMat('yuhuaYu', 1);
          msg = '你把瓶口重新封了。「百鸟在林，不如一鸟在手。」这一滴留着，等最急那一日。机缘 +1，得未启之液一瓶。';
          cls = 'good';
        }
        break;
      /* 三关·荡魂 */
      case 'sanguandanghun':
        if (opt === 'mountain') {
          if (S.karma > 20) {
            S.stats.heart = clamp(S.stats.heart - 3, 1, 20);
            msg = '山上风起，平生所悔之事一一走过，一件也没落下。你走下时，道心散了三分。';
            cls = 'danger';
          } else {
            S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
            msg = '山上风起，平生所悔之事一一走过。走完你才发现，悔过的事，都已经过去了。道心 +2。';
            cls = 'good';
          }
        } else if (opt === 'valley') {
          S.stats.fate = clamp(S.stats.fate + 1, 1, 20);
          const met = Object.keys(S.npcs || {}).filter(function (k) {
            return S.npcs[k] && S.npcs[k].met && (S.npcs[k].fav || 0) > 0;
          });
          if (met.length) {
            const pid = pick(met);
            const pn = D.NPC_POOL.find(function (x) { return x.id === pid; });
            S.npcs[pid].fav = 0;
            msg = '你绕谷而行，魂魄未动，却丢了一样东西——醒来时怎么也想不起' +
              (pn ? pn.name : '那个人') + '的名字。脸还记得，名字空了。机缘 +1。';
          } else {
            msg = '你绕谷而行，魂魄未动，却丢了一样东西。翻遍行囊，不知少的是什么。机缘 +1。';
          }
          cls = '';
        } else {
          S.lifeMax = Math.max(20, (S.lifeMax || 0) - 2);
          S.breakBonus = (S.breakBonus || 0) + 0.03;
          msg = '逆流而上，水从脚底往下走。你走完了，寿元折去二年，掌心多一道逆流的痕。';
          cls = 'danger';
        }
        break;
      /* 命灯之问 */
      case 'mingdengzhiwen':
        if (opt === 'light') {
          S.karma += 3;
          addMat('wulianXue', 1);
          msg = '你割指滴血，命火燃起。从今日起，你是本宗的记名弟子——命牌认牌不认人，好在牌在你身上。业力 +3。';
          cls = '';
        } else if (opt === 'blow') {
          S.stats.fate = clamp(S.stats.fate + 1, 1, 20);
          S.karma += 3;
          pushHook('hook_lamp_out');
          msg = '灯灭的一瞬，你听见远处有人笑。那盏灯本属一个天赋极高的人。机缘 +1，业力 +3。';
          cls = 'danger';
        } else {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          msg = '你连牌都不想要。「命牌认牌不认人」——那便不认。道心 +2，此路于你关了。';
          cls = 'good';
        }
        break;
      /* 伪箓之问 */
      case 'weiluzhiwen':
        if (opt === 'point') {
          S.craft.fu = (S.craft.fu || 0) + 15;
          if (S.npcs.laodao && S.npcs.laodao.met) {
            S.npcs.laodao.fav = clamp((S.npcs.laodao.fav || 0) + 8, 0, 120);
          }
          msg = '「这不是符，是名籍。名籍上了才算有司——你这是画反了。」那人脸一白，收符就走。制符 +15。';
          cls = 'good';
        } else if (opt === 'take') {
          S.karma += 2;
          S.insightXp = (S.insightXp || 0) + 1;
          msg = '你收下了，没戳破。假符也是符，糊弄鬼神未必不成——只是这张符，从此压在你箱底。业力 +2，悟道 +1。';
          cls = 'danger';
        } else {
          S.stats.heart = clamp(S.stats.heart + 1, 1, 20);
          pushHook('hook_false_register');
          msg = '火起时，那人没跑，只说了一句：「你也没真懂。」符烧完了，灰是黑的。道心 +1。';
          cls = '';
        }
        break;
      /* 三炷香 */
      case 'sanzhuxiang':
        if (opt === 'yes') {
          S.followers = Math.min(followLimit(), S.followers + 40);
          S.piety = clamp((S.piety || 1) + 0.1, 0.5, 2.0);
          S.karma += 2;
          msg = '你应了。第三炷香插正，火苗忽然直了。祠堂里从此多一炷是给你的，阴邪之事绕你三分。信众 +40。';
          cls = 'good';
        } else if (opt === 'no') {
          S.stats.heart = clamp(S.stats.heart + 2, 1, 20);
          S.followers = Math.max(0, S.followers - 15);
          msg = '「死人只认亲不认理。」——你不属于这里。香灭了，门外的人散得比来得快。道心 +2，信众 −15。';
          cls = '';
        } else {
          S.stats.fate = clamp(S.stats.fate + 1, 1, 20);
          msg = '「我是谁？」婆婆不答，只把第三炷香插正。插完她说：「问这个的，都是外面来的。」机缘 +1。';
          cls = 'good';
        }
        break;
      default: msg = '什么也没发生。';
    }

    if (msg) logLine(msg, cls);
    afterCombatCheck();
    if (S.phase === 'play') { advanceXun(1); render(); }
    else render();
  };

  /* ---------- 战斗 ---------- */
  /* v8.0 寻仇：仇家真的会来。来的时候给你三条路，每条都有代价。 */
  function openVengeance(src) {
    const isSect = src === 'sect';
    const nm = isSect ? '宗门执法' : (S.enemyName || '仇家');
    let b = '';
    if (isSect) {
      b += `<div class="small">三个人，一样的衣裳，一样的刀。为首那个把令牌举给你看，说奉命行事，让你自己选个地方。</div>`;
      b += `<div class="small muted" style="margin:6px 0">他们不喊，也不急。宗门办事一向这样。</div>`;
    } else {
      b += `<div class="small">${esc(nm)}站在门外，没带兵器，也没带人。他说等这一天很久了。</div>`;
      b += `<div class="small muted" style="margin:6px 0">街上有几家关了窗。没人出来劝。</div>`;
    }
    b += divider() + '<ul class="opts">';
    b += optRow('A', '迎战', { name: '搏', cls: 'risk' },
      isSect ? '三人，都是内门以上' : '赢了此账两清，输了不一定还有下次', false, 'do;veng:fight');
    b += optRow('B', isSect ? '交出这些年攒下的东西' : '破财消灾', { name: '忍', cls: 'warn' },
      '折三成灵石与人望，人还会再来', S.stones < 50, 'do;veng:pay');
    b += optRow('C', '闭门不见', { name: '避', cls: 'warn' }, '声望 −8，人还会再来', false, 'do;veng:flee');
    b += '</ul>';
    b += `<div class="hint">这件事不了结，它就一直挂在那儿。</div>`;
    S.vengeanceSrc = isSect ? 'sect' : 'person';
    openModal((isSect ? '追杀 · ' : '寻仇 · ') + nm, b, true);
  }

  ACT.do_veng = (k) => {
    closeModal();
    if (k === 'fight') {
      const src = S.vengeanceSrc || 'person';
      startCombat(true);
      if (S.combat) {
        S.combat.isVengeance = src;
        S.combat.foe.name = src === 'sect' ? '宗门执法' : (S.enemyName || S.combat.foe.name);
        if (src === 'sect') { S.combat.foe.power = Math.round(S.combat.foe.power * 1.15); S.combat.foe.hpMax = Math.round(S.combat.foe.hpMax * 1.15); S.combat.foe.hp = S.combat.foe.hpMax; }
      }
      return;
    }
    if (k === 'pay') {
      const s = Math.round(S.stones * 0.3);
      S.stones = Math.max(0, S.stones - s);
      S.followers = Math.round(S.followers * 0.9);
      ledgerAdd('out', '了断旧怨', s);
      logLine(`你把 ${s} 块灵石推过去。他收了，什么也没说，走了。`, '');
    } else {
      S.fame = Math.max(0, S.fame - 8);
      logLine('你没开门。他在门外站到天黑，才走。', '');
    }
    advanceXun(1);
    if (S.phase !== 'play') return render();
    render();
  };

  function startCombat(isCounter) {
    /* 敌人按「境界」生成，不按 rank 算术。上限 +1 大境，永不通跨两境。
       战力以玩家为锚浮动：常规 0.55~1.55 倍（相持~压制），
       仇家 1.25~2.0 倍（下风，打得过也逃得掉）。
       这样最差也只是"下风"，不会出现 R<0.4 的必死局。 */
    const maxRealm = isShen() ? 7 : (D.XIAN_REALMS || []).length - 1;
    let up = rng() < 0.28 ? 1 : 0;
    if (isCounter) up = 1;
    const foeRealm = clamp(myRealmIdx() + up, 0, maxRealm);
    const pool = isShen() ? D.PILLARS : D.XIAN_REALMS;
    const realmPower = (pool[foeRealm] || {}).power || 10;

    const myPow = Math.max(1, computePower());
    let lo = isCounter ? 1.25 : 0.55, hi = isCounter ? 2.00 : 1.55;
    if (hasDebuff('marked_rich')) { lo *= 1.15; hi *= 1.15; }   // 被人惦记：来的更狠
    let foePower = Math.round(myPow * (lo + rng() * Math.max(0.05, hi - lo)));
    // 上限取「该境界的名义战力」而不是玩家倍数：
    // 高你一个大境的人名义上强 3~4 倍，但刚破境/带伤的散修打不出那个数。
    // 这样 R 落在 0.5~0.8（下风，能打能逃），既残酷又不会一遇就死档。
    foePower = Math.max(1, Math.min(foePower, Math.round(realmPower * 1.0)));

    const foeStages = ((pool[foeRealm] || {}).stages || []).length || 1;
    const foeBase = isShen() ? foeRealm * 4 : rankBaseXian()[foeRealm];
    const foeR = foeBase + Math.floor(rng() * Math.min(foeStages, 4));
    const names = ['邻庙庙祝', '散修', '血奉执事', '游方邪修', '宗门执法', '野祀孤魂'];
    S.combat = {
      foe: (function () {
        const elKeys = ['metal', 'wood', 'water', 'fire', 'earth'];
        const hpMax = Math.max(80, Math.round(60 + foePower * 0.8));   // 血量随境界，不再恒 100
        const traits = ['brute', 'veteran', 'slippery', 'normal'];
    return { name: pick(names), rank: foeR, power: foePower,
          hp: hpMax, hpMax: hpMax,
          trait: traits[Math.floor(rng() * traits.length)],
          el: elKeys[Math.floor(rng() * elKeys.length)] };
      })(),
      round: 0, observed: false, defending: false
    };
    S.combat.rankUp = !!(S.preBuff && S.preBuff.rankUp);
    if (S.preBuff) S.preBuff.rankUp = false;
    /* v10.7 阶段二：本命被动在开战瞬间落一次（宝镜：照见破绽）。
       只走一个出口，免得各扩展在 startCombat 里各插一段。 */
    {
      const _XN = G.WXCS3_EXT;
      if (_XN && _XN.natalOnCombatStart) _XN.natalOnCombatStart(S.combat);
    }
    /* v10.4 P1·S4：入场态势在本场开局定下，之后可用 cbtpre:stance:* 切换 */
    S.combat.stance = stanceList()[0] || null;
    S.combat.stanceUsed = {};
    /* v9.0 M2：第四位入场——主战灵兽带独立气血进场（ext-beast） */
    const _X0 = G.WXCS3_EXT;
    if (_X0 && _X0.combatDeploy) _X0.combatDeploy(S.combat);
    S.phase = 'combat';
    bump('warFight');
    render();
  }

  /* ============================================================
     斗法深化：招式 / 法宝 / 五行 / 战前准备
     ============================================================ */

  /* 战前准备：可选符箓或丹药 */
  function openPreFight() {
    const c = S.combat;
    if (!c) return;
    /* v10.4 P1：加了「入场态势」之后，战前能做的事不止一件，
       旧文案「还能做一件事」会与下面的态势区块自相矛盾。 */
    const _hasStance = stanceList().length > 0;
    let b = '<div class="small">开打之前，' + (_hasStance ? '还有两件事：用物、定势。' : '还能做一件事。') + '</div>'
      + divider() + '<ul class="opts">';
    /* v10.7 P1·战斗口径：传音符不是战斗物。
       它承诺「传讯相识之人，好感 +5」，战前用掉它既没有效果分支，纯是浪费——
       非战斗的符不该出现在战前菜单里被无效消耗。 */
    const ones = (S.arts || []).filter(function (id) {
      const a = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
      return a && a.slot === 'once' && a.id !== 'jinchuan';
    });
    ones.forEach(function (id, i) {
      const a = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
      b += optRow('ABC'[i] || '·', '用「' + a.name + '」', { name: '符箓', cls: 'chance' }, a.eff, false, 'do;cbtpre:' + id);
    });
    (S.disks || []).filter(function (d) { return d.id === 'zhenSuoLing'; }).forEach(function (d) {
      b += optRow('阵', '携「锁灵阵」入场', { name: '随身阵', cls: 'peace' }, '本场敌人不能遁走，阵盘不消耗', false, 'do;cbtpre:disk_zhenSuoLing');
    });
    const pills = D.PILL_EXT.filter(function (p) { return (S.bag[p.id] || 0) > 0 && ['hp', 'hpPct', 'hpFull', 'mp', 'mpPct', 'mpFull', 'cure'].includes(p.type); });
    pills.slice(0, 4).forEach(function (p) {
      b += optRow('·', '服 ' + p.name + '（' + (S.bag[p.id]) + '）', { name: '丹药', cls: 'peace' }, p.desc, false, 'do;cbtpill:' + p.id);
    });
    /* 「无可用之物」只针对符/丹，不能连带否掉下面的态势 */
    if (!ones.length && !pills.length) {
      b += '<div class="small muted">身上没有可用的符与丹。' +
        (_hasStance ? '好在势还在——下面可定。' : '那就这么上吧。') + '</div>';
    }
    b += '</ul>';
    /* v10.4 P1·S4：入场态势（可切换） */
    const _stAll = stanceList();
    if (_stAll.length) {
      const _cur = c.stance || _stAll[0];
      b += divider() + '<div class="sechead">入场态势　' + esc((STANCE_SPEC[_cur] || {}).name || '') + '</div>';
      b += '<div class="small muted" style="margin:2px 0 6px">' + esc((STANCE_SPEC[_cur] || {}).desc || '') + '</div>';
      if (_stAll.length > 1) {
        b += '<ul class="opts">';
        _stAll.forEach(function (sid) {
          if (sid === _cur) return;
          const sp2 = STANCE_SPEC[sid];
          b += optRow('换', sp2.name, { name: '态势', cls: 'chance' }, sp2.desc, false, 'do;cbtpre:stance_' + sid);
        });
        b += '</ul>';
      }
    }
    /* v9.0 M2：本命出鞘（共命阶）从扩展里追加战前选项（注册数组，多扩展并存） */
    const _XP = G.WXCS3_EXT;
    if (_XP && _XP.preFightRowsHooks) {
      for (let _i = 0; _i < _XP.preFightRowsHooks.length; _i++) b += _XP.preFightRowsHooks[_i]();
    }
    /* v8.1 P0 第6项：遁速够快，才看得见他身上的旧伤 */
    const _pc = clue('speed');
    if (_pc) b += '<div class="hint">' + esc(_pc) + '</div>';
    b += '<div class="hint">符与丹每场只耗一次，进入战斗后无法再补；态势可免费改，改了当场面生效。</div>';
    openModal('战前准备', b);
  }

  ACT.openPreFight = () => { if (S.combat) S.combat.prepared = true; openPreFight(); };

  /* v10.4 P2·11：神通取舍面板。
     一张表看清「带哪几道、凑出什么势」，卸装即时影响态势与战力。 */
  function openStEquipPanel() {
    const all = S.shenTong || [];
    if (!all.length) { toast('尚无神通'); return; }
    const on = stEquipList();
    let b = '<div class="small">持有 <b>' + all.length + '</b> 道 · 本场装配 <b>' + on.length + '</b> 道</div>';
    b += '<div class="muted small" style="margin:4px 0">卸下的神通本场不可用，但会改变入场态势——想要「四象归元」就凑四类，想要「偏执」就集中一类。</div>';
    b += divider() + '<ul class="opts">';
    all.forEach(function (nm) {
      const sp = shenTongSpec(nm);
      const isOn = stEquipped(nm);
      const note = isOn
        ? ('−' + sp.cost + ' 灵 · ×' + stMulText(sp.mul) + ' · ' + sp.parts.join('') + '类')
        : ('已卸 · ' + sp.parts.join('') + '类 · ' + sp.desc);
      b += optRow(isOn ? '卸' : '装', stShort(nm),
        { name: sp.kindName, cls: isOn ? 'peace' : 'chance' }, note, false,
        'do;steq:' + encodeURIComponent(nm));
    });
    b += '</ul>';
    /* 当前态势预览：让「卸一道会变成什么势」在点之前就能看见 */
    const sl = stanceList();
    b += divider() + '<div class="small">当前态势：';
    if (!sl.length) b += '<span class="muted">无（需至少一道装配）</span>';
    else b += sl.map(function (sid) { return '<b>' + STANCE_SPEC[sid].name + '</b>'; }).join(' / ');
    b += '</div>';
    b += '<div class="hint">装配不设额外上限：拥有即默认可带。卸装只为一件事——把态势调成你想要的那种。</div>';
    openModal('神通 · 取舍', b);
  };

  function doStEquip(enc) {
    const nm = decodeURIComponent(enc);
    if ((S.shenTong || []).indexOf(nm) < 0) return;
    /* 首次操作时把「全装」落成显式数组，之后才谈得上卸 */
    if (!Array.isArray(S.stEquip)) S.stEquip = (S.shenTong || []).slice();
    const at = S.stEquip.indexOf(nm);
    if (at >= 0) {
      if (S.stEquip.length <= 1) { toast('至少留一道神通在手'); return; }
      S.stEquip.splice(at, 1);
      logLine('收起「' + stShort(nm) + '」，本场不带。', '');
    } else {
      S.stEquip.push(nm);
      logLine('取出「' + stShort(nm) + '」，本场带上。', 'good');
    }
    render(); openStEquipPanel();
  };

  ACT.do_cbtpre = (id) => {
    /* v10.4 P1·S4：切换入场态势。只允许切到「已达成」的那几个，
       不给出未达成的选项——否则态势就变成了可以随便挑的免费增益。 */
    if (id.indexOf('stance_') === 0) {
      const sid = id.slice(7);
      if (!S.combat) return;
      if (stanceList().indexOf(sid) < 0) { toast('此势未成'); closeModal(); return; }
      S.combat.stance = sid;
      logLine('改以「' + STANCE_SPEC[sid].name + '」之势入场。', 'good');
      closeModal(); render(); return;
    }
    if (id === 'disk_zhenSuoLing') {
      if (!(S.disks || []).some(function (d) { return d.id === 'zhenSuoLing'; })) return;
      S.combat.noFoeFlee = true;
      logLine('你在四周钉下阵旗，锁灵阵封住了退路。', 'good');
      closeModal(); render(); return;
    }
    const a = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
    if (!a) return;
    const artAt = (S.arts || []).indexOf(id);
    if (artAt < 0) { toast('此物已不在身上'); closeModal(); return; }
    S.arts.splice(artAt, 1);
    consumeQuality(id);
    S.preBuff = S.preBuff || {};
    if (id === 'huoyuyuan') S.preBuff.fire = 0.6;
    else if (id === 'wuyun') { S.preBuff.sureHit = true; S.preBuff.boost = 0.8; }
    else if (id === 'duzuo') S.preBuff.escape = true;
    else if (id === 'hanhuo') S.preBuff.freeXiansheng = true;
    else if (id === 'juxian') {
      /* v10.7 P1·战斗口径：拘仙敕神符的位格压制必须作用在「当前这一场」。
         旧写法只写 S.preBuff.rankUp，而 rankUp 是 startCombat 读的一次性字段——
         战前面板是在战斗已经开始之后才打开的，于是这张符被吃掉却毫无作用。
         现在当场生效；preBuff 一并清掉，免得下一场又白送一次。 */
      S.preBuff.rankUp = false;
      if (S.combat) S.combat.rankUp = true;
    }
    logLine('战前用了「' + a.name + '」。', 'good');
    closeModal(); render();
  };

  ACT.openStEquip = () => openStEquipPanel();
  ACT.do_steq = (enc) => doStEquip(enc);

  ACT.do_cbtpill = (id) => {
    const p = D.PILL_EXT.find(function (x) { return x.id === id; });
    if (!p || (S.bag[id] || 0) < 1) { toast('没有'); closeModal(); return; }
    S.bag[id]--;
    bump('pillUsed'); S.pillThisMonth = true;
    if (S.combat) S.combat.usedPill = true;
    const eff = applyPill(p);
    logLine('战前服下 ' + p.name + '：' + eff + '。', 'good');
    closeModal(); render();
  };

  /* 「器」：符 / 丹 / 权柄，一个二级菜单收拢 */
  ACT.openGear = () => {
    const c = S.combat;
    if (!c) return;
    let b = '<div class="small">灵力 ' + Math.round(S.mp) + '　香火 ' + Math.round(S.xianghuo) + '</div>' + divider();
    b += '<ul class="opts">';
    const tals = Object.keys(S.talismans || {}).filter(function (k) { return (S.talismans[k] || 0) > 0; });
    tals.forEach(function (k) {
      const t = D.TALISMANS.find(function (x) { return x.id === k; });
      if (!t) return;
      b += iconRow('TALISMANS', k, '·', '贴 ' + t.name + '（' + S.talismans[k] + '）',
        { name: '符', cls: 'chance' }, t.eff, false, 'do;cbt:tal:' + k);
    });
    if (isShen()) b += optRow('·', '动权柄', { name: '权柄', cls: 'peace' }, '-50 香火', S.xianghuo < 50, 'do;cbt:quanbing');
    D.PILL_EXT.filter(function (p) { return (S.bag[p.id] || 0) > 0 && ['hp', 'hpPct', 'hpFull', 'mp', 'mpPct', 'mpFull', 'cure'].indexOf(p.type) >= 0; })
      .slice(0, 6).forEach(function (p) {
        b += iconRow('PILL_EXT', p.id, '·', '服 ' + p.name + '（' + S.bag[p.id] + '）',
          { name: '丹药', cls: 'peace' }, p.desc, false, 'do;cbt:pill:' + p.id);
      });
    if (!tals.length && !isShen() && !hasUsablePill()) b += '<div class="small muted">身上没有可用之物。</div>';
    b += '</ul>';
    b += '<div class="hint">符是自己做的，丹药是自己炼的——会不会做，决定你舍不舍得用。</div>';
    openModal('器 · 符 / 丹 / 权柄', b);
  };

  /* 「谋」：观察 / 交涉 / 虚张声势 */
  ACT.openWits = () => {
    let b = '<div class="small">不一定要动手。</div>' + divider() + '<ul class="opts">';
    b += optRow('A', '观察破绽', { name: '平和', cls: 'peace' }, '下一击无视卸力、增伤六成', false, 'do;cbt:observe');
    b += optRow('B', '开口交涉', { name: '机缘', cls: 'chance' }, '或可罢手', false, 'do;cbt:talk');
    b += optRow('C', '虚张声势', { name: '风险', cls: 'risk' }, '或可令其退走', false, 'do;cbt:bluff');
    b += '</ul>';
    b += '<div class="hint">修仙界最常见的结局不是打赢，是各自走开。</div>';
    openModal('谋 · 不打也是本事', b);
  };

  /* 术法菜单（SKILLS + role=fa 功法）；神通是另一张清单 */
  ACT.openSkills = () => {
    const c = S.combat;
    if (!c) return;
    const list = equippedSkills();
    const g = getDaogong();
    /* v10.4 P2·11：只列已装配的神通。卸下的仍在「神通 · 取舍」里，
       只是这一场不带。 */
    const sts = stEquipList();
    c.stUsed = c.stUsed || {};
    let b = '<div class="small">灵力 <b>' + Math.round(S.mp) + '</b>/' + Math.round(S.mpMax) +
      '　道基《' + esc(g.name) + '》（' + esc(g.el ? D.ELEMENTS[g.el].name : '无属') + '）</div>' + divider();

    b += '<div class="sechead">术法　装配 ' + list.length + '/' + equipLimit() + '　可用多次</div>';
    b += '<ul class="opts">';
    if (!list.length) b += '<div class="small muted">一门未装。去「术法」面板装配。</div>';
    list.forEach(function (sk) {
      const dis = S.mp < sk.cost;
      const r = resonResult(sk);
      const note = sk.cost
        ? ('−' + sk.cost + ' 灵 · ×' + sk.mul + (r.txt && r.txt !== '无关' ? ' · ' + r.txt + ' ' + pct(r.mul - 1) : ''))
        : ('无耗 · ×' + sk.mul + (sk.desc ? ' · ' + sk.desc : ''));
      b += optRow('·', sk.name, { name: SKILL_KIND_NAME[sk.kind] || '术法', cls: sk.kind === 'blood' ? 'risk' : 'chance' },
        note, dis, 'do;cbt:skill:' + encodeURIComponent(sk.name));
    });
    b += '</ul>';

    if (sts.length) {
      const _allN = (S.shenTong || []).length;
      b += '<div class="sechead">神通　' + sts.length + '/' + _allN + ' 道' +
        (sts.length < _allN ? '（已卸 ' + (_allN - sts.length) + ' 道）' : '') +
        '　每道本场仅一次</div>';
      b += '<ul class="opts">';
      /* v10.4 P1·S4：偏执之势会禁掉非专精类；freeFirst 会让第一道免灵。
         两件事都必须在菜单上写清，否则玩家点了没反应，会以为界面坏了。 */
      const _mst = curStance();
      const _focus = _mst && _mst.id === 'pianzhi' ? stanceFocusKind() : null;
      const _free = _mst && _mst.id === 'sixiang' && !(c.stanceUsed && c.stanceUsed.stFree);
      sts.forEach(function (nm) {
        const sp = shenTongSpec(nm);
        const used = !!c.stUsed[nm];
        const banned = !!_focus && sp.parts.indexOf(_focus) < 0;
        const costShown = (_free && !used && !banned) ? 0 : sp.cost;
        let note;
        if (used) note = '本场已出';
        else if (banned) note = '偏执之势：本场禁用（只容' + _focus + '类）';
        else note = (costShown === 0 ? '免灵' : '−' + costShown + ' 灵') + ' · ×' + stMulText(sp.mul) + ' · ' + sp.desc;
        b += optRow('·', stShort(nm), { name: sp.kindName, cls: 'chance' }, note,
          used || banned || S.mp < costShown, 'do;cbt:shentong:' + encodeURIComponent(nm));
      });
      b += '</ul>';
    } else {
      b += '<div class="small muted" style="margin-top:8px">尚无神通。紫府开一关时，可从道统池中取一道——那是你自己的道。</div>';
    }
    b += '<div class="hint">术法吃同源共鸣（同系 +20%、相生 +10%、相克 −15%）；神通不吃共鸣，但必中，且带破防／自愈／破绽。</div>';
    if (sts.length) b += '<div class="hint">面板上的 × 是<b>基础倍率</b>，不是最终伤害：神通结算 = 敌方气血上限 × 0.26 × 基础倍率 × 位格/共鸣修正。</div>';
    if ((S.shenTong || []).length) {
      b += '<div style="margin-top:8px"><button class="btn ghost" data-act="act:openStEquip">神通 · 取舍（本场带 ' +
        stEquipList().length + '/' + S.shenTong.length + ' 道）</button></div>';
    }
    openModal('交手 · 术法与神通', b);
  };

  /* 术法装配/拆卸管理 */
  ACT.openSkillBook = () => {
    const eq = Array.isArray(S.skillsEquip) ? S.skillsEquip : [];
    const lim = equipLimit();
    let b = '<div class="small">已习 ' + knownSkills().length + ' 门术法 · 装配上限 ' + lim +
      (S.sect ? '（' + esc(D.SECT.ranks[S.sect.rank].name) + '）' : '（散修）') + '</div>';
    b += '<div class="muted small" style="margin:4px 0">只有装配进斗法的术法才能用。</div>' + divider();
    b += '<ul class="opts">';
    knownSkills().forEach(function (sk) {
      const on = eq.indexOf(sk.id) >= 0;
      b += optRow(on ? '卸' : '装', sk.name,
        { name: on ? '已装' : sk.lvl === 'zhen' ? '真传' : sk.lvl === 'nei' ? '内门' : '外门', cls: on ? 'peace' : 'chance' },
        '×' + sk.mul + (sk.cost ? ' · ' + sk.cost + ' 灵力' : ' · 无耗'),
        false, 'do;eqsk:' + sk.id);
    });
    b += '</ul>';
    b += '<div class="hint">装配满了就得先卸一个。带得多了不一定是好事——灵力不够，术法就是废纸。</div>';
    openModal('术法 · 装配', b);
  };

  ACT.do_eqsk = (id) => {
    if (!skillById(id)) return;
    let eq = Array.isArray(S.skillsEquip) ? S.skillsEquip.slice() : [];
    if (eq.indexOf(id) >= 0) {
      if (id === 'zhiquan') { toast('直取是最后的退路，卸不得'); return; }
      eq = eq.filter(function (x) { return x !== id; });
      logLine('卸下「' + skillById(id).name + '」。', '');
    } else {
      if (eq.length >= equipLimit()) { toast('装配已满（' + equipLimit() + '）'); return; }
      eq.push(id);
      logLine('装上「' + skillById(id).name + '」。', 'good');
    }
    S.skillsEquip = eq;
    ACT.openSkillBook();      // 留在书里，别每次弹回主界面
    render();
  };

  /* 位格数字还原成「境界·阶」 */
  function posText(rank) {
    rank = Math.max(0, Math.round(Number(rank) || 0));
    if (isShen()) {
      const o = D.PILLARS[clamp(Math.floor(rank / 4), 0, 7)];
      return (o ? o.name : '?') + '·' + (D.POSITIONS[clamp(rank % 4, 0, 3)] || '');
    }
    const o = D.XIAN_REALMS[realmIdxRank(rank)];
    const st = (o && o.stages && o.stages[stageIdxRank(rank)]) || '';
    return (o ? o.name : '?') + (st ? '·' + st : '');
  }

  function combatRank(c) {
    return positionRank() + (c && c.rankUp ? (isShen() ? 4 : 1) : 0);
  }
  function combatGap(c) {
    return c ? realmIdxRank(c.foe.rank) - realmIdxRank(combatRank(c)) : 0;
  }
  /* v10.4 P0·S3：灼烧每回合伤害的唯一定义。
     面板与结算必须读同一个函数——两处各写一遍公式，
     玩家就会看到「标签写 18 万、实际掉 20 万」这种对不上的账。 */
  function burnTickOf(c) {
    if (!c || !(c.foeBurn > 0)) return 0;
    return Math.max(1, Math.round(c.foe.hpMax * 0.045 * (c.foeBurnMul || 1)));
  }

  /* v10.7 P1·战斗口径：增益符（fuZeng）的唯一定义。
     「三回合内直接伤害 +30%」——普攻、术法、符箓、神通、施法一律乘同一个系数，
     面板上写的剩余回合数也是同一个字段，不再各算各的。
     旧实现三处毛病：每贴一张 +0.3 无限累加、没有回合数、只增幅普攻。 */
  const TAL_BUFF_TURNS = 3;
  function talBuffMul(c) {
    return (c && c.talBuffTurns > 0 && c.talBuff) ? (1 + c.talBuff) : 1;
  }

  /* v10.7 P1：五雷符（战前一次性强化）的唯一兑现点。
     文案「斗法首击必中，伤害 +80%」——「必中」（无视卸力）由 preBuff.sureHit 兑现，
     「+80%」由这里兑现，且只在第一记直接伤害上生效一次。
     旧版只有 sureHit，+80% 从未存在。 */
  function preBoostMul() {
    if (!(S.preBuff && S.preBuff.boost)) return 1;
    const v = S.preBuff.boost;
    S.preBuff.boost = 0;
    return 1 + v;
  }

  /* ============================================================
     v8.1 卸力：把「未中 / 命中」的二值赌博换成连续减伤
     ------------------------------------------------------------
     旧版这里是个纯概率闸门：玩家每次出手掷 72%（遇老练 60%），
     掷不中就是 0 伤害、只写一句「未中」；而 foeTurn 压根没有命中判定，
     敌方每一击都实打实结算。于是玩家体感必然是「我一直在空挥，他一刀不落」。
     那不是战斗，是单向的掷骰子。
     ------------------------------------------------------------
     现在：每一击必定造成伤害，但会被对方「卸」掉一部分，最低留 5%。
     卸力由位格差、护体法宝、性格决定，全部可预期、可针对：
       · 老练之敌卸力高 → 该用「看破」或神通
       · 莽夫卸力低、伤害高 → 该在守势下换血
     玩家不再是赌命中，而是在「打得动多少」之间做选择。
     ============================================================ */
  function deflectOf(c, side) {
    const gap = combatGap(c);
    let d = 0.15;
    if (side === 'foe') {
      d += clamp(gap * 0.05, -0.10, 0.15);          // 他位格越高，越难打实
      if (c.foe.trait === 'veteran') d += 0.10;     // 老练：稳守，不与你换命
      else if (c.foe.trait === 'brute') d -= 0.08;  // 莽夫：只顾攻，门户大开
    } else {
      d += artBonus('body');                        // 护身法器常驻减伤
      d += clamp(-gap * 0.05, -0.10, 0.15);         // 你位格越高，越扛得住
      d += quenchBlock();                            // 淬体：皮肉筋骨换来的硬
      /* v10.4 P0·3.1：护体类功法（金光咒/金殿煌元诀/九变化龙诀/
         明华煌元经/白首叩庭经）承诺的「减伤」此前无出口。
         这里是防守侧唯一的公共闸口，挂一次就全战斗生效。 */
      const _gw = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaWard) ? G.WXCS3_EXT.gongfaWard() : 0;
      if (_gw > 0) d += _gw;
    }
    return clamp(d, 0.05, 0.55);
  }

  /* 战斗描写：字负责画面，数字由调用处接在后面 */
  function combatLine(kind) {
    const p = (D.COMBAT_TEXT || {})[kind];
    return p && p.length ? pick(p) : '';
  }

  function renderCombat() {
    const c = S.combat;
    if (!c) { S.phase = 'play'; return ''; }

    const myR = combatRank(c), foeR = c.foe.rank;
    const gap = combatGap(c), subGap = foeR - myR;   // 大境差 / 同境内的阶差
    const R = computePower() / Math.max(1, c.foe.power);
    // 胜算五档：碾压 / 压制 / 相持 / 下风 / 绝境
    const tier = R >= 3 ? '碾压' : R >= 1.5 ? '压制' : R >= 0.8 ? '相持' : R >= 0.4 ? '下风' : '绝境';

    let odds, ocls;
    if (gap >= 2) { odds = '高你两个大境以上'; ocls = 'danger'; }
    else if (gap === 1) { odds = '高你一个大境'; ocls = 'danger'; }
    else if (gap === 0 && subGap >= 2) { odds = '高你数阶'; ocls = 'danger'; }
    else if (gap === 0 && subGap === 1) { odds = '略高于你'; ocls = ''; }
    else if (gap === 0 && subGap === 0) { odds = '同阶'; ocls = ''; }
    else { odds = '你占上风'; ocls = 'good'; }

    /* —— 敌 —— */
    let fb = '';
    fb += '<div class="fname">' + esc(c.foe.name) + '</div>';
    // 高你一个大境的人名义上强 3~4 倍；若他的实际战力远低于名义值，
    // 说明这是个刚破境/身上有伤的散修——直接写出来，免得玩家以为自己算错了。
    const _nominal = ((isShen() ? D.PILLARS : D.XIAN_REALMS)[realmIdxRank(foeR)] || {}).power || 0;
    const _weak = (_nominal && c.foe.power < _nominal * 0.6)
      ? '<span class="muted">（气息不稳，像是刚破境或带伤）</span>' : '';
    fb += '<div class="fsub">' + esc(posText(foeR)) + _weak + '</div>';
    fb += divider();
    fb += '<div class="frow"><span class="k">气血</span>' + bar(c.foe.hp, c.foe.hpMax, 'var(--cinnabar)', 'foe_hp', '敌方气血') + '</div>';
    fb += '<div class="frow"><span class="k">战力</span><b>' + fmtNum(c.foe.power) + '</b>';
    if (c.foe.el && D.ELEMENTS[c.foe.el]) fb += elemChip(c.foe.el);
    fb += '</div>';
    const traitName = { brute: '莽夫', veteran: '老练', slippery: '滑头', normal: '寻常' }[c.foe.trait] || '寻常';
    let fstate = '<span class="stance">' + traitName + '</span>';
    if (c.momentum > 0) fstate += '<span class="stance bad">气势 ' + c.momentum + '</span>';
    /* v10.7 P1·战斗口径：破绽、灼烧、迟滞、压制都是「打在他身上的」，
       旧版却全部渲染在我方卡的状态区——玩家一眼看去像是自己中了招，
       于是「这一刀为什么打得更疼」根本无从判断。
       现在敌方的状态一律回到敌方卡；我方卡只留守势、看破、增益、护体这些
       真正作用在自己身上的东西。 */
    const nw = function (s) { return '<span style="white-space:nowrap">' + s + '</span>'; };
    if (c.foeMark > 0) fstate += '<span class="stance bad">破绽 · 受创 ×1.25' + nw('（' + c.foeMark + ' 回合）') + '</span>';
    if (c.foeWeaken > 0) fstate += '<span class="stance bad">压制 · 出手 ×0.7' + nw('（' + c.foeWeaken + ' 回合）') + '</span>';
    if (c.foeBurn > 0) {
      /* v10.5 P2·C7：点火当回合只清标记、不落伤，必须写出来，
         否则玩家会以为「点了没生效」；同一回合再点火是刷新，不是叠层。 */
      fstate += c.burnFresh
        ? '<span class="stance bad">余焰将起 · 下回合起每回合 ' + burnTickOf(c) + ' 伤' + nw('（' + c.foeBurn + ' 回合）') + '</span>'
        : '<span class="stance bad">灼烧 · 每回合 ' + burnTickOf(c) + ' 伤' + nw('（' + c.foeBurn + ' 回合）') + '</span>';
    }
    if (c.foeSlow > 0) fstate += '<span class="stance bad">迟滞 · 出手 ×0.85' + nw('（' + c.foeSlow + ' 回合）') + '</span>';
    fb += '<div class="frow"><span class="k">状态</span><div>' + fstate + '</div></div>';
    const keK2 = keMul(mainEl(), c.foe.el);
    if (c.foe.el) {
      fb += '<div class="frow"><span class="k">相克</span><span class="' + (keK2 > 1 ? 'good' : keK2 < 1 ? 'danger' : 'stance') + '">' +
        (keK2 > 1 ? '你克他 · 伤害 ×1.3' : keK2 < 1 ? '他克你 · 伤害 ×0.85' : '无相克') + '</span></div>';
    }
    // 「什么能改变这一档」——这句话就是手段存在的意义
    const tips = [];
    const talAtk = Object.keys(S.talismans || {}).filter(function (k) {
      const t = D.TALISMANS.find(function (x) { return x.id === k; });
      return t && t.kind === 'atk' && (S.talismans[k] || 0) > 0;
    });
    if (talAtk.length) tips.push('用「' + D.TALISMANS.find(function (x) { return x.id === talAtk[0]; }).name + '」可打开局面');
    if ((S.talismans.fuDun || 0) > 0) tips.push('贴「遁符」可保命');
    if ((S.disks || []).some(function (d) { return d.id === 'zhenSuoLing'; })) tips.push('战前可携锁灵阵，禁敌遁走');
    if (c.noFoeFlee) tips.push('锁灵阵已展开，敌人无法遁走');
    if (tips.length) fb += '<div class="small" style="margin-top:8px">' + tips.map(function (x) { return '→ ' + x; }).join('<br>→ ') + '</div>';
    if (gap >= 1) fb += '<div class="small danger" style="margin-top:8px">对方威压令你窒息。这不是你能上桌的局。</div>';

    /* —— 我 —— */
    let mb = '';
    mb += '<div class="fname">' + esc(S.dao || S.name) + '</div>';
    mb += '<div class="fsub">' + esc(realmName()) + ' · 战力 ' + fmtNum(computePower()) + '</div>';
    mb += divider();
    mb += '<div class="frow"><span class="k">气血</span>' + bar(S.hp, S.hpMax, 'var(--hp)', 'hp', '气血') + '</div>';
    mb += '<div class="frow"><span class="k">灵力</span>' + bar(S.mp, S.mpMax, 'var(--mp)', 'mp', '灵力') + '</div>';
    if (isShen()) mb += '<div class="frow"><span class="k">香火</span>' + bar(S.xianghuo, pillar().need, 'var(--cul)', 'xianghuo', '香火') + '</div>';
    else {
      const g = getDaogong();
      mb += '<div class="frow"><span class="k">道基</span>' + esc(g.name) +
        (g.el ? elemChip(g.el) : '') + '</div>';
      mb += '<div class="frow"><span class="k">术法</span>装配 ' + equippedSkills().length + '/' + equipLimit() + '</div>';
      if ((S.shenTong || []).length) {
        const stn = S.shenTong.map(stShort);
        mb += '<div class="frow"><span class="k">神通</span><span class="small">' +
          (stn.length <= 2 ? stn.join(' · ') : stn.slice(0, 2).join(' · ') + ' 等 ' + stn.length + ' 道') +
          '</span></div>';
      }
    }
    const eqArt = Object.keys(S.equipped || {}).map(function (k) {
      return D.ARTIFACT_EXT.find(function (a) { return a.id === S.equipped[k]; });
    }).filter(Boolean);
    if (eqArt.length) mb += '<div class="frow"><span class="k">法宝</span><div>' +
      eqArt.map(function (a) { return '<span class="stance on">' + esc(a.name) + '</span>'; }).join('') + '</div></div>';
    let tags = '';
    /* v10.1 第一梯队 · 战斗状态可见性。
       此前面板只显示「守势 / 看破」两条，而真正影响伤害的还有四五项，
       玩家挨刀少掉一半血不知道是谁挡的，打出 ×1.25 也看不到标记。
       这里把已有字段渲染出来，一行业务公式都不改——只让看不见的变得看得见。
       v10.7 P1：敌方身上的破绽/灼烧/迟滞/压制已移回敌方卡，
       我方卡只留真正作用在自己身上的状态。 */
    if (c.defending) tags += '<span class="stance on">守势 · 减伤50%</span>';
    if (c.observed) tags += '<span class="stance on">看破 · 下一击无视卸力</span>';
    /* v10.7 P1·战斗口径：增益符的显示写「直接伤害 +30%」并带剩余回合数，
       与结算口径完全一致——面板与公式读同一份数据，不再各说各话。 */
    if (c.talBuffTurns > 0 && c.talBuff) tags += '<span class="stance on">增益 · 直接伤害 +' + Math.round(c.talBuff * 100) + '%' + nw('（' + c.talBuffTurns + ' 回合）') + '</span>';
    if (c.talShield) tags += '<span class="stance on">护体 · 下次受击减伤 ' + Math.round(c.talShield * 100) + '%</span>';
    if (c.noFoeFlee) tags += '<span class="stance on">锁灵 · 敌方不能遁走</span>';
    if (c.momentum > 0) tags += '<span class="stance bad">敌方气势 · 增伤 +' + Math.round((([1.0,1.10,1.20,1.35][c.momentum]||1) - 1) * 100) + '%</span>';
    /* v10.4 P1·S4：入场态势。玩家得看见「这一场是按什么势在打」，
       否则态势就是藏在公式里的隐形加成。 */
    const _stv = curStance();
    if (_stv) tags += '<span class="stance on">势 · ' + esc(_stv.name) + '</span>';
    if (!tags) tags = '<span class="stance">无</span>';
    mb += '<div class="frow"><span class="k">状态</span><div>' + tags + '</div></div>';
    /* v9.0 M2：第四位的血条（注册数组，多扩展并存） */
    const _XF = G.WXCS3_EXT;
    if (_XF && _XF.fightInfoHooks) {
      for (let _i = 0; _i < _XF.fightInfoHooks.length; _i++) mb += _XF.fightInfoHooks[_i](c);
    }

    /* —— 行动：10 项合成 6 项（手机一屏两列三行）——
       攻 / 术 / 御 / 器 / 遁 / 谋
       「战前准备」只在开打前那一次，不再留在回合内——否则「战前」这个概念就没了 */
    let o = [];
    const tals = Object.keys(S.talismans || {}).filter(function (k) { return (S.talismans[k] || 0) > 0; });
    const qbN = isShen() ? 1 : 0;
    const atkPct = Math.round(Math.max(0.10,
      0.19 * Math.sqrt(computePower() / Math.max(1, c.foe.power))) *
      (1 - clamp(deflectOf(c, 'foe') - artBonus('hit') * 0.5, 0, 0.55)) * 100);
    o.push(optRow('1', '攻', { name: '风险', cls: 'risk' },
      '必中 · 约' + atkPct + '% 伤害' + (artBonus('atk') ? ' ·宝+' + Math.round(artBonus('atk') * 100) + '%' : ''), false, 'do;cbt:attack'));
    o.push(optRow('2', '术', { name: '平和', cls: 'peace' },
      '术法' + equippedSkills().length + '·神通' + (S.shenTong || []).length, S.mp < 15, 'act:openSkills'));
    o.push(optRow('3', '御', { name: '平和', cls: 'peace' },
      '减伤 50%' + (artBonus('body') ? ' +法宝' : ''), false, 'do;cbt:defend'));
    o.push(optRow('4', '器', { name: '机缘', cls: 'chance' },
      '符 ' + (tals.length ? tals.reduce(function (a, k) { return a + (S.talismans[k] || 0); }, 0) + ' 张' : '无') +
      (qbN ? ' · 权柄' : '') + ' · 丹', !tals.length && !hasUsablePill() && !qbN, 'act:openGear'));
    o.push(optRow('5', '遁', { name: '风险', cls: 'risk' },
      '遁速 ' + Math.round((0.4 + st('speed') * 0.035 + artBonus('move') + fateAdd('flee') + gongfaEscapeAdd()) * 100) + '%', false, 'do;cbt:flee'));
    o.push(optRow('6', '谋', { name: '平和', cls: 'peace' }, '观察 / 交涉', false, 'act:openWits'));
    /* v9.0 M2：兽令三式与本命法技从扩展里追加（注册数组；do;cbt:ext:* 走同一结算尾巴） */
    if (_XF && _XF.fightRowsHooks) {
      for (let _i = 0; _i < _XF.fightRowsHooks.length; _i++) o = o.concat(_XF.fightRowsHooks[_i]());
    }

    let head = '<div class="vsline"><span>第 ' + (c.round + 1) + ' 回合</span>'
      + '<span>R=' + R.toFixed(2) + '</span>'
      + '<b class="' + (['绝境', '下风'].indexOf(tier) >= 0 ? 'danger' : (['碾压', '压制'].indexOf(tier) >= 0 ? 'good' : '')) + '">' + tier + '</b>'
      + '<span class="' + ocls + '">' + esc(odds) + '</span></div>';
    if (c.round === 0 && !c.prepared) head += '<div class="small" data-act="act:openPreFight" style="cursor:pointer;color:var(--jade)">开战前：符、丹、随身阵，择一准备 →</div>';

    // 战况：只留最近四条，新的在下
    const fl = (S.log || []).slice(0, 4).reverse();
    const fightLog = fl.length ? '<div class="fightlog">' + fl.map(function (l) {
      return '<div class="fl ' + (l.cls || '') + '">' + l.txt + '</div>';
    }).join('') + '</div>' : '';

    return '<div class="col">'
      + panel('敌方', '<div class="fighter">' + fb + '</div>', { cls: 'cinnabar', sub: odds })
      + '</div>'
      + '<div class="col">'
      + panel('我方', '<div class="fighter">' + mb + '</div>', { sub: tier })
      + '</div>'
      + '<div class="dockrow">'
      + panel('行动', head + '<ul class="opts fightacts">' + o.join('') + '</ul>' + fightLog, { sub: '生死在此' })
      + '</div>';
  }

  function foeTurn() {
    const c = S.combat;
    if (!c) return false;
    const gap = combatGap(c), diff = c.foe.rank - combatRank(c);
    /* v10.4 P0·S3：灼烧在敌方回合开头结算。
       旧版 foeBurn/foeBurnMul 只在 cast 分支写入，全项目 0 处读取——
       烈火掌、流火剑诀承诺的「灼烧」一直是空头支票。
       位置选在「敌方将要出手之前」，两个后果都是刻意的：
         · 一次 2 回合的灼烧恰好烧两次（本回合敌动前 + 下回合敌动前）
         · 烧死的敌人来不及还手——点火值钱，就在这一下 */
    if (c.foeBurn > 0 && c.burnFresh) {
      /* 点火那一回合：焰刚起，先不落伤，让「2 回合」= 之后烧 2 次 */
      c.burnFresh = false;
    } else if (c.foeBurn > 0) {
      const bd = burnTickOf(c);
      c.foe.hp = Math.max(0, c.foe.hp - bd);
      c.foeBurn--;
      c.burnTick = bd;
      logLine(c.foe.name + '身上火势未熄，灼伤 ' + bd +
        (c.foeBurn > 0 ? '（余 ' + c.foeBurn + ' 回合）' : '（火熄）'), 'good');
      if (c.foe.hp <= 0) { settleCombatWin(c); return false; }
    }
    // 气势：每三回合涨一档，逼玩家在「稳」和「险」之间选，而不是无限拖
    if (!c.momentum) c.momentum = 0;
    if (c.round > 0 && c.round % 3 === 0) c.momentum = Math.min(3, c.momentum + 1);
    const momMul = [1.0, 1.10, 1.20, 1.35][c.momentum] || 1;
    // P1-8：双向按血量百分比结算
    /* v10.5 P1·C5：ratio 下限从 0.2 提到 0.35，最大约 1/0.35≈2.86（原 5）。
       下限越低，「我战力低」时敌方伤害被放大得越狠，正是死亡螺旋的放大口。 */
    const ratio = clamp(Math.sqrt(computePower() / Math.max(1, c.foe.power)), 0.35, 2.5);
    /* v8.1：基础值保持 0.15。旧版玩家的期望伤害是 0.20×0.72=0.144，
       去掉空挥后若不同步回调这里，战斗会整体变简单。 */
    let dmg = S.hpMax * 0.15 * (1 / ratio) * (0.8 + rng() * 0.4) * momMul;
    /* v10.5 P1·C6：敌方还手与玩家出手共用 GAP_MUL 表，inc 即「被抬多少」 */
    dmg *= gapMul(gap).inc;
    if (c.foeWeaken > 0) dmg *= 0.7;   // 术神通压住了他的势
    if (c.foeSlow > 0) {
      dmg *= 0.85;                     // v10.4 P0·S3：迟滞，身法被冻住
      c.foeSlow--;
    }
    if (c.foe.trait === 'brute') dmg *= 1.25;       // 莽夫：出手更重
    if (c.foe.trait === 'veteran') dmg *= 0.90;     // 老练：不拼命，求稳耗
    /* v8.1：玩家同样有卸力——护体法器与位格优势在这里兑现，
       而不是像旧版那样只挨打、看不出自己的防御有什么用。 */
    const myDefl = clamp(deflectOf(c, 'me') + fateAdd('defl'), 0, 0.55);   // v9.0 M1：守拙藏锋
    dmg *= (1 - myDefl);
    /* v10.4 P1·S4：守中带攻——本场首次受击减伤三成。
       一次性的，用完就记 stanceUsed.stGuard，不再重复减。 */
    if (c.stance === 'shouzhong' && !(c.stanceUsed && c.stanceUsed.stGuard)) {
      dmg *= 0.7;
      c.stanceUsed = c.stanceUsed || {};
      c.stanceUsed.stGuard = true;
      logLine('守中带攻：这一击被卸去了三成。', 'good');
    }
    /* v10.7 P1·战斗口径：守势与护体取强，不叠乘。
       旧写法 red = 0.5 − talShield，金刚符(0.6)叠在守势(0.5)上落到 0.05 下限，
       实际减伤约 95%——文案写「减伤 60%」，玩家却挡掉了九成五。
       现在：守势 0.5、护体 0.6 同时在场时取 0.6，即总减伤 60%。 */
    const _red = Math.max(c.defending ? 0.5 : 0, c.talShield || 0);
    if (_red > 0) dmg *= clamp(1 - _red, 0.05, 0.95);
    if (c.talShield) c.talShield = 0;
    /* v10.7 阶段二：本命神钟的常驻减伤只在「总减伤上限」内生效——
       与守势/护体取强后再乘，不叠加成隐式 95%。 */
    {
      const _XN = G.WXCS3_EXT;
      if (_XN && _XN.natalIncomingMul) dmg *= _XN.natalIncomingMul(c);
    }
    // 滑头：血量低于一半会试着跑
    if (c.foe.trait === 'slippery' && c.foe.hp <= c.foe.hpMax * 0.5 && rng() < 0.35) {
      if (c.noFoeFlee) {
        logLine(c.foe.name + '欲遁，为锁灵阵所遏。', 'good');
        c.foe.trait = 'normal';
        endCombatRound(c);
        return true;
      }
      S.combat = null; S.phase = 'play';
      logLine(combatLine('foeFlee') + '　' + c.foe.name + '遁走了。', '');
      advanceXun(1); render(); return false;
    }
    dmg = Math.round(dmg);
    /* v9.0 M2：第四位出手挪进扩展（ext-beast：令兽护/自动护主/反噬；
       ext-benming：本命出鞘挡击）。钩子返回 true＝这一回合被截胡。
       钩子跑在扣血之前——挡刀才是真的挡刀（旧版先扣血再挡，是个次序 bug）。 */
    const _XH = G.WXCS3_EXT;
    if (_XH && _XH.foeHooks) {
      let _caught = false;
      for (let _i = 0; _i < _XH.foeHooks.length; _i++) {
        if (_XH.foeHooks[_i](c, dmg, myDefl)) { _caught = true; break; }
      }
      if (_caught) {
        c.defending = false;
        if (!S.combat) return false;   // 钩子已把战斗结掉（反噬致死）
        if (c.foeMark > 0) c.foeMark--;
        if (c.foeWeaken > 0) c.foeWeaken--;
        endCombatRound(c);
        return true;
      }
    }
    S.hp = Math.max(0, S.hp - dmg);
    /* v8.1：敌方回合以前只扣血、不报数，玩家看不见自己挨了多少。
       现在给一句画面 + 一个数字，卸力成功时换一种写法。 */
    logLine((myDefl >= 0.25 ? combatLine('fDefl') : combatLine('fHit')) +
      '　气血 −' + dmg + (myDefl >= 0.25 ? '（卸去 ' + Math.round(myDefl * 100) + '%）' : ''), 'danger');
    c.defending = false;
    if (S.hp <= 0) {
      if (rng() < 0.4) { die(`为${c.foe.name}所戕，血溅于地。`); return false; }
      S.combat = null; S.phase = 'play'; S.hp = 1;
      S.stones = Math.floor(S.stones * 0.5);
      S.followers = Math.round(S.followers * 0.6);
      logLine('重伤而仆。及醒，资财尽失。', 'danger');
      toast('重伤 · 财物被劫');
      advanceXun(1);   // 时间要往前走（内部可能再次 die，交给调用方 render 兜底）
      return false;
    }
    if (c.foeMark > 0) c.foeMark--;
    if (c.foeWeaken > 0) c.foeWeaken--;
    endCombatRound(c);
    return true;
  }

  /* v10.7 P1：回合收尾的唯一出口。
     增益符的剩余回合数在这里递减——foeTurn 恰好有三条出口，
     散在各处各写一遍，迟早会漏掉某一条（表现为「增益符永不过期」）。 */
  function endCombatRound(c) {
    if (c.talBuffTurns > 0) {
      c.talBuffTurns--;
      if (c.talBuffTurns <= 0) { c.talBuffTurns = 0; c.talBuff = 0; }
    }
    c.round++;
  }

  /* v10.4 P0·S3：胜利结算收成一处。
     灼烧是「回合结束的额外伤害」，它可能把敌人烧死——
     若各写一份，战利品/明悟/杀师判定迟早会漏掉某一条路径。
     原第 8703 行那段整段搬运，行为一字未改。 */
  function settleCombatWin(c) {
    noteCombatWin(c);
    /* v8.1 P0 M4：如果倒下的正是你的授业者，「杀师」在这里成立。
       判定放在结算最前，因为它要改的是「谁还活着」这件事。 */
    const _slayMaster = masterCheckOnKill(c.foe.name);
    S.combat = null; S.phase = 'play';
    const loot = Math.round((100 + c.foe.rank * 200) * fateMul('loot'));   // v9.0 M1：血债偿心
    S.stones += loot; S.fame += 5;
    ledgerAdd('in', '斗法所得', loot);   // v10.5 P0·E3：收入进月账
    logLine(combatLine('kill') + '。', 'danger');
    if (_slayMaster) logLine('仆者，授业之人也。不呼汝名。', 'danger');
    logLine(isShen() ? `散去对方的香火，得灵石 ${loot}。` : `一剑毕${c.foe.name}，得灵石 ${loot}。`, 'danger');
    // 生死之间有一线明悟：打赢同一境的对手，不该只值几块灵石
    const insight = Math.max(1, Math.round(c.foe.power * 0.35));
    if (isShen()) {
      const room = maxXianghuo() - S.xianghuo;
      if (room > 0) {
        const g2 = Math.min(room, insight);
        S.xianghuo += g2;
        logLine('香客把这场斗法传成了神迹，香火 +' + Math.round(g2) + '。', 'good');
      }
    } else {
      const need = xrealm().need || 0;
      const g2 = Math.max(0, Math.min(need - S.xiuwei, insight));
      if (g2 > 0) {
        S.xiuwei += g2;
        logLine('生死之间有一线明悟，修为 +' + Math.round(g2) + '。', 'good');
      }
    }
    advanceXun(1); render();
  }

  /* v10.5 P1·C6：位格压制一张表，玩家出手与敌方还手共用。
     旧版玩家用「gapCut 之后的 gap」、敌方用原始 gap，两侧不对称且不可预期，
     玩家无法从面板推算「越两境打人会被压多少、挨打会被抬多少」。 */
  const GAP_MUL = {
    up2:  { out: 0.15, inc: 1.60 },   // 低两档打高两档：出手很轻，挨打很重
    up1:  { out: 0.45, inc: 1.60 },
    even: { out: 1.00, inc: 1.00 },
    down1:{ out: 1.30, inc: 0.35 },
    down2:{ out: 1.30, inc: 0.35 }
  };
  function gapMul(gap) {
    if (gap >= 2) return GAP_MUL.up2;
    if (gap >= 1) return GAP_MUL.up1;
    if (gap <= -2) return GAP_MUL.down2;
    if (gap <= -1) return GAP_MUL.down1;
    return GAP_MUL.even;
  }

  ACT.do_cbt = (sub, arg) => {
    const c = S.combat;
    if (!c) return;
    /* v10.4 P0·3.1：乾天一元统摄诸天神法「位格压制 +1 档」。
       只在此处把 gap 压低——卦位表、敌方生成、胜负判定都不动，
       保证「越阶能打」不等于「越阶变简单」。 */
    const gapRaw = combatGap(c);
    /* 位格压制的两层减免：功法（乾天一元）+ 虚空气质的「凌位」，
       两者取较大值而不是相加——相加会让仙人越两境也不掉伤害。 */
    const gapCut = Math.max(gongfaGapUp(), c.temperPierce ? 1 : 0);
    const gap = Math.max(0, gapRaw - gapCut);
    const diff = c.foe.rank - combatRank(c);
    /* v8.1：位格压制不再把伤害压成 1 点。
       「全力一击只留下浅痕」和「未中」是同一种失败体验——出手了却毫无意义。
       现在压制是「打得很轻」而不是「打了等于没打」，差距仍然由 ratio 与卸力体现。
       v10.5 P1·C6：系数取 GAP_MUL 的 out，与敌方还手的 inc 同源同表。 */
    let mult = gapMul(gap).out;
    /* 同大境但位阶差大时仍有一条 diff 规则（表中没有这一档） */
    if (diff >= 2) mult = Math.min(mult, 0.75);
    else if (diff <= -2) mult = 1.3;

    let dmg = 0, hit = true, note = '';
    /* 出手瞬间是否已有破绽：决定这一击吃不吃 ×1.25（见下方结算处） */
    const _markBefore = (c.foeMark || 0) > 0;
    const ratio = clamp(Math.sqrt(computePower() / Math.max(1, c.foe.power)), 0.2, 2.5);
    /* v8.1 P0 M4：妖物助战。只加「输出」不加「判定」——
       它让这一刀更重，但不改变你打不打得中，避免把命中体系搅乱。 */
    const beastBonus = beastAtkBonus();
    let keK = keMul(mainEl(), c.foe.el) || 1;      // P2-19 五行克制
    const _keFloor = bodyDef().keFloor;
    if (_keFloor) keK = Math.max(keK, _keFloor);   // 混沌体：五行皆通，不被反克
    const hitBonus = artBonus('hit') - (c.foe.trait === 'veteran' ? 0.12 : 0);

    if (sub === 'attack') {
      hit = true;                                   // v8.1：普攻必中，不再掷骰子
      const r = ratio;
      /* v10.7 P1·战斗口径：五雷符承诺「斗法首击必中，伤害 +80%」。
         旧版只兑现了「必中」，+80% 从未存在；而且它只对术法分支生效，
         玩家先普攻一手就把这次强化白费了。现在普攻与术法都吃这一次加成。 */
      const _hadBoost = !!(S.preBuff && S.preBuff.boost);
      const _bmul = preBoostMul();
      let _sure = false;
      if (S.preBuff && S.preBuff.sureHit) { S.preBuff.sureHit = false; _sure = true; }
      /* 看破破绽时无视卸力；太阴宝鉴这类命中加成按一半抵掉对方卸力 */
      const defl = (_sure || c.observed) ? 0 : clamp(deflectOf(c, 'foe') - hitBonus * 0.5, 0, 0.55);
      /* v10.7 P1·战斗口径：增益符改为「三回合内直接伤害 +30%」，
         普攻 / 术法 / 符箓 / 神通统一乘 talBuffMul(c)。
         旧写法在这一行单独乘 mult，只增幅普攻，且每贴一张无限累加。 */
      let raw = c.foe.hpMax * Math.max(0.10, 0.19 * r) * mult * keK * (1 + artBonus('atk') + beastBonus) * fateMul('dmg') * talBuffMul(c) * _bmul;
      /* v10.7 阶段二：本命被动（魂幡助对灼烧之敌）——普攻也吃，不只术法 */
      {
        const _XN = G.WXCS3_EXT;
        if (_XN && _XN.natalDamageMul) raw *= _XN.natalDamageMul(null, c);
      }
      raw *= (1 - defl);
      if (c.observed) raw *= 1.6;
      dmg = Math.round(raw * (0.94 + rng() * 0.12));
      if (c.observed) note = '看破了破绽，' + combatLine('pHit');
      else if (defl >= 0.20) note = combatLine('pDefl') + '（卸去 ' + Math.round(defl * 100) + '%）';
      else note = combatLine('pHit');
      if (_hadBoost) note += '（五雷符 +80%）';
      c.observed = false;
    } else if (sub === 'skill') {
      const nm = decodeURIComponent(arg || '');
      const sk = artSpecByName(nm);
      if (!sk) { render(); return; }
      /* v10.5 P1·C4：术法耗灵同样按上限百分比兜底，
         否则上限涨到千级后，20~60 的耗灵在灵力池面前等于免费。 */
      const _skCost = skillCostOf(sk);
      if (S.mp < _skCost) { toast('灵力不足（需 ' + _skCost + '）'); render(); return; }
      S.mp -= _skCost;
      let mul2 = skillMulByName(nm);
      const reson = resonResult(sk);
      let sure = false, extra = reson.txt && reson.txt !== '无关' ? '（' + reson.txt + '）' : '';
      if (sk.kind === 'blood') { S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.1)); extra = '（耗气血一成）'; }
      if (sk.kind === 'thunder') sure = true;
      mul2 *= bodySpellMul(sk.kind);
      if (sk.kind === 'sword') mul2 *= fateMul('sword');   // v9.0 M1：一剑破法
      if (S.preBuff && S.preBuff.fire && sk.kind === 'fire') { mul2 *= (1 + S.preBuff.fire); S.preBuff.fire = 0; extra += '（符箓加成）'; }
      /* v10.7 P1·战斗口径：五雷符的「必中」＝无视卸力，+80% 与它同一次生效。 */
      const _hadBoost = !!(S.preBuff && S.preBuff.boost);
      const _bmul = preBoostMul();
      if (S.preBuff && S.preBuff.sureHit) { sure = true; S.preBuff.sureHit = false; extra += '（五雷符 · 无视卸力）'; }
      hit = true;                                   // v8.1：招式同样必中
      const defl2 = (sure || c.observed) ? 0 : clamp(deflectOf(c, 'foe') - hitBonus * 0.5, 0, 0.55);
      const r2 = ratio;
      /* v10.4 P0·3.4：招式从此也吃主修功法。
         旧版只有「施法」分支接功法，而玩家 90% 的输出走「招式」——
         玄元剑经的「剑系威力 +40%」在剑气纵横上一点作用都没有。
         这里把扩展的 gongfaSkillMul(sk) 乘进去，来源写进日志。 */
      const _gk = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaSkillMul)
        ? G.WXCS3_EXT.gongfaSkillMul(sk) : null;
      const _gkm = (_gk && _gk.mul) ? _gk.mul : 1;
      let raw2 = c.foe.hpMax * Math.max(0.11, 0.21 * r2) * mul2 * _gkm * mult * keK * (1 + artBonus('atk') + beastBonus) * fateMul('dmg') * talBuffMul(c) * _bmul;
      /* v10.7 阶段二：本命被动——飞剑助剑系术法，魂幡助对灼烧之敌 */
      {
        const _XN = G.WXCS3_EXT;
        if (_XN && _XN.natalDamageMul) raw2 *= _XN.natalDamageMul(sk, c);
      }
      raw2 *= (1 - defl2);
      if (c.observed) raw2 *= 1.6;
      dmg = Math.round(raw2 * (0.94 + rng() * 0.12));
      c.observed = false;
      if (_gk && _gk.text) extra += '（功法 ' + _gk.text + '）';
      if (_hadBoost) extra += '（五雷符 +80%）';
      note = '「' + nm + '」' + (defl2 >= 0.20 ? '（卸去 ' + Math.round(defl2 * 100) + '%）' : '') + extra;
    } else if (sub === 'shentong') {
      /* 神通不占装配格、可穿透位格压制的一部分，代价是「一道一场只能出一次」。
         它是大招，不是第二个普攻——所以必中，但消耗高、有次数。 */
      const snm = decodeURIComponent(arg || '');
      if ((S.shenTong || []).indexOf(snm) < 0) { toast('没有这道神通'); render(); return; }
      if (!stEquipped(snm)) { toast('此神通本场未装配（去「神通 · 取舍」装上）'); render(); return; }
      c.stUsed = c.stUsed || {};
      if (c.stUsed[snm]) { toast('此神通本场已出（一道一场只一次）'); render(); return; }
      const sp = shenTongSpec(snm);
      /* v10.4 P1·S4：态势对神通的三处改写 */
      const _stance = curStance();
      const _pianzhiBan = _stance && _stance.id === 'pianzhi' &&
        sp.parts.indexOf(stanceFocusKind()) < 0;
      if (_pianzhiBan) {
        toast('偏执之势：只能出「' + stanceFocusKind() + '」类神通');
        render(); return;
      }
      const _freeFirst = _stance && _stance.id === 'sixiang' && !c.stanceUsed.stFree;
      /* v10.5 P1·C4：神通耗灵按上限百分比兜底（免灵仍为 0）。 */
      const _cost2 = _freeFirst ? 0 : shenTongCostOf(sp);
      if (S.mp < _cost2) { toast('灵力不足（需 ' + _cost2 + '）'); render(); return; }
      S.mp -= _cost2;
      if (_freeFirst) c.stanceUsed.stFree = true;
      c.stUsed[snm] = true;
      /* v10.4 P0·S1：按 parts 逐个叠加，双属两道效果同时生效。
         旧版 `k0 = sp.kind.charAt(0)` 只认首字，与上面的 4 类模板一起
         把 26 个双属名压成了单属。 */
      let sextra = '', stTags = [];
      hit = true;
      /* v10.4 P1：本击之前就存在的破绽才算进 ×1.25。
         老 bug：目类神通自己会置 foeMark，而总伤害结算在「命中之后」
         检查 foeMark>0 —— 同一击先造破绽、再吃破绽，
         1.30 的目神通实际打出 1.30×1.25=1.625，比 1.85 的命神通还稳。 */

      sp.parts.forEach(function (k1) {
        if (k1 === '命') {
          stTags.push('必中');
        } else if (k1 === '术') {
          c.foeWeaken = Math.max(c.foeWeaken || 0, 2);
          stTags.push('压势');
        } else if (k1 === '身') {
          /* v10.4 P2·联动三：身类功法（疗伤）放大身神通的自愈。
             长春 0.25 / 续脉 0.30 / 月湖 0.10 —— 疗伤本钱第一次
             直接变成「护身神通更耐打」。 */
          let heal = Math.round(S.hpMax * 0.12);
          const _gh = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaHeal) ? G.WXCS3_EXT.gongfaHeal() : 0;
          if (_gh > 0) {
            heal = Math.round(heal * (1 + _gh));
            stTags.push('自愈 ' + heal + '+功法');
          } else {
            stTags.push('自愈 ' + heal);
          }
          S.hp = Math.min(S.hpMax, S.hp + heal);
          c.defending = true;
        } else {
          /* v10.4 P2·联动四：目类功法（卜筮）延长破绽。
             梅花易 fate +6：破绽 2 → 3 回合。卜筮不只是加机缘，
             它也让你「看得更久」。 */
          const _gf = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaFate) ? G.WXCS3_EXT.gongfaFate() : 0;
          const _md = _gf > 0 ? 3 : 2;
          c.foeMark = Math.max(c.foeMark || 0, _md);
          stTags.push('破绽 ' + _md + '合');
        }
      });
      /* v10.4 P1·S2：道统气质的附加效果。
         气质只改「这一道打出去之后世界怎么变」，不改基础四类骨架 ——
         在 parts 循环之后追加，保证双属神通仍先按双属结算。 */
      if (sp.temper === '幽微') {
        c.foeMark = Math.max(c.foeMark || 0, (c.foeMark || 0) + 1);
        stTags.push('阴噬');
      } else if (sp.temper === '转换') {
        const back = Math.round(sp.cost * 0.18);
        S.mp = Math.min(S.mpMax, S.mp + back);
        stTags.push('回流 ' + back);
      } else if (sp.temper === '生养') {
        const back = Math.round(S.hpMax * 0.04);
        S.hp = Math.min(S.hpMax, S.hp + back);
        stTags.push('养生 ' + back);
      } else if (sp.temper === '润下') {
        c.momentum = Math.max(0, (c.momentum || 0) - 1);
        stTags.push('夺势');
      } else if (sp.temper === '炎上') {
        /* v10.4 P2·联动二：炎上气质 × 带 burn 的功法。
           功法自己有「灼烧」时（烈火掌 0.5 / 流火剑诀 0.5），
           神通的余焰烧得更旺——从 0.5 提到 0.75，但封顶 0.9，
           避免「两本火功法叠加成秒杀」。 */
        let _bm = 0.5;
        const _gst = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaSpellStatus)
          ? G.WXCS3_EXT.gongfaSpellStatus(null) : null;
        if (_gst && _gst.burn) _bm = Math.min(0.9, _bm + _gst.burn * 0.5);
        const _wasBurn = c.foeBurn > 0;
        c.foeBurn = Math.max(c.foeBurn || 0, 2);
        c.foeBurnMul = Math.max(c.foeBurnMul || 0, _bm);
        c.burnFresh = true;
        stTags.push(_wasBurn ? '余焰已续' : (_bm > 0.5 ? '余焰·焚身' : '余焰'));
      } else if (sp.temper === '虚空') {
        c.temperPierce = 1;      // 本场后续出手位格压制减轻一档
        stTags.push('凌位');
      }
      /* 偏执：该类效果 +20%（用倍率体现，就可量） */
      const _pzMul = (_stance && _stance.id === 'pianzhi') ? 1.2 : 1;
      if (_pzMul > 1) stTags.push('偏执 ×1.2');
      /* 先声夺人：首回合破绽（本场第一次出手） */
      if (_stance && _stance.id === 'xiansheng' && !c.stanceUsed.stMark) {
        c.foeMark = Math.max(c.foeMark || 0, 3);
        c.stanceUsed.stMark = true;
        stTags.push('先声');
      }
      if (_freeFirst) stTags.push('免灵');
      /* v10.4 P2·联动一：功法五行 × 同属神通。
         这是五条联动里唯一作用于伤害本体的，必须封顶 ——
         否则「天阶剑经 + 剑属神通 + 四象归元」三项叠满会打穿战斗系统。
         封顶 1.5：功法 dims 最高 1.40（玄元剑经），留一点余量给 P2 的
         「四象归元 × 功法品阶」但不超过 1.5。 */
      const _gsm = gongfaShenTongMul();
      const _fMul = clamp(_gsm.mul, 1, 1.5);
      if (_fMul > 1.001) stTags.push('功法×' + _fMul.toFixed(2));
      /* v10.4 P2·联动五：四象归元 × 主修功法品阶。
         集齐四类时，功法的品阶乘区额外生效一次（只取品阶的一半，
         与招式侧的 0.5 权重同一口径）。 */
      let _sixMul = 1;
      if (_stance && _stance.id === 'sixiang') {
        const _g = getDaogong();
        const _T = { huang: 1.00, xuan: 1.10, di: 1.22, tian: 1.36, xian: 1.55 };
        const _tm = _T[_g && _g.tier] || 1;
        _sixMul = 1 + (_tm - 1) * 0.5;
        if (_sixMul > 1.001) stTags.push('归元×' + _sixMul.toFixed(2));
      }
      if (stTags.length) sextra = '（' + stTags.join('·') + '）';
      dmg = Math.round(c.foe.hpMax * Math.max(0.13, 0.26 * ratio) * sp.mul * _pzMul *
        _fMul * _sixMul * mult * keK * (1 + artBonus('atk')) * fateMul('dmg') * talBuffMul(c));
      c.observed = false;
      note = '神通「' + stShort(snm) + '」' + sextra;

    } else if (sub === 'cast') {
      // 旧代码判 <25 却扣 30，灵力会被打成负数
      if (S.mp < 30) { toast('灵力不足（需 30）'); render(); return; }
      S.mp -= 30;
      const g = getGongfa();
      /* v10.1 第二梯队·问题2：施法真的施「法」。
         旧版 g 只用于 note 字符串，伤害公式里没有任何功法字段——
         花 75000 灵石买的《百炼成仙道法》与入门《聚气诀》伤害完全相同。
         现在功法经扩展给出乘区（品阶/五行/专属 effect），来源链写进日志。 */
      /* v10.4 P0·3.4：施法没有「招式对象」，但主修功法自己就是一个五行源。
         旧版传 null，扩展里 skillElOf(null) 回的正是功法 el，
         于是同源 ×1.10 恒真（相当于人人白拿 10%）。
         这里显式传 null 表示「按功法自身的路子施法」，
         恒真那一条已在扩展里按 sk 是否存在判掉。 */
      const _gc = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaCastInfo)
        ? G.WXCS3_EXT.gongfaCastInfo(null) : null;
      const _gm = _gc ? _gc.mul : 1;
      dmg = Math.round(c.foe.hpMax * Math.max(0.08, 0.22 * ratio) * mult * keK * (1 + artBonus('atk')) * _gm * talBuffMul(c));
      note = `施展《${g.name}》` + (_gc && _gc.text ? '（' + _gc.text + '）' : '');
      /* 功法附带的持续状态（灼烧/迟滞/破防）由扩展决定，写进战斗态 */
      if (G.WXCS3_EXT && G.WXCS3_EXT.gongfaSpellStatus) {
        const _gst = G.WXCS3_EXT.gongfaSpellStatus(null);
        if (_gst) {
          /* v10.4 P0·S3：点火当回合不结算，从下一回合起烧。
             否则「灼烧 2 回合」实际只在点火后烧 1 次——名与实对不上。
             用 burnFresh 记住「这一道是刚点的」，在 foeTurn 里消费一次。 */
          if (_gst.burn) {
            const _wasBurn = c.foeBurn > 0;
            c.foeBurn = 2; c.foeBurnMul = _gst.burn; c.burnFresh = true;
            if (_wasBurn) logLine('余焰再起，火势续为 2 回合。', 'good');
          }
          if (_gst.slow) { c.foeSlow = 2; }
          if (_gst.pierce) { c.foeWeaken = Math.max(c.foeWeaken || 0, 2); }
        }
      }
    } else if (sub === 'quanbing') {
      if (!isShen()) { toast('仙道无权柄'); render(); return; }
      if (S.xianghuo < 50) { toast('香火不足'); render(); return; }
      S.xianghuo -= 50;
      dmg = Math.round(c.foe.hpMax * Math.max(0.10, 0.30 * ratio) * mult * 1.2);
      note = '动用权柄';
    } else if (sub === 'tal') {
      // 符是消耗品，不是技能——会不会做，决定舍不舍得用
      const tid = arg || '';
      const t = D.TALISMANS.find(function (x) { return x.id === tid; });
      if (!t || (S.talismans[tid] || 0) < 1) { toast('没有这张符'); render(); return; }
      S.talismans[tid]--;
      consumeQuality(tid);
      if (t.kind === 'atk') {
        hit = true;
        dmg = Math.round(c.foe.hpMax * Math.max(0.12, 0.30 * ratio) * (t.v || 1) * mult * fateMul('tal') * talBuffMul(c));
        note = '贴「' + t.name + '」' + (t.el ? '（' + (D.ELEMENTS[t.el] ? D.ELEMENTS[t.el].name : t.el) + '）' : '');
      } else if (t.kind === 'def') {
        /* v10.7 P1·战斗口径：金刚符是「下一次受击总减伤 60%」。
           旧写法 c.talShield 会被守势再减一次（0.5−0.6 落到 0.05 下限），
           实际减伤约 95%，文案完全对不上。现在护体与守势取强，不叠乘。 */
        c.defending = true;
        c.talShield = Math.max(c.talShield || 0, t.v || 0.6);
        note = '贴「' + t.name + '」，护住了要害（下次受击减伤 ' + Math.round(c.talShield * 100) + '%）';
      } else if (t.kind === 'escape') {
        S.combat = null; S.phase = 'play';
        logLine('贴上「' + t.name + '」，身形一晃便不见了。', 'good');
        advanceXun(1); render(); return;
      } else if (t.kind === 'buff') {
        /* v10.7 P1·战斗口径：增益符是「三回合内直接伤害 +30%」。
           旧写法每贴一张就 +0.3 无限累加（贴三张 +90%），也没有回合数，
           而且只增幅普攻——文案写「伤害」，实际术法与符箓不吃。
           回合数记 4：贴符这一手本身不是输出，回合结束时递减一次，
           玩家在面板上看到的仍是「还有 3 回合」。 */
        c.talBuff = t.v || 0.3;
        c.talBuffTurns = TAL_BUFF_TURNS + 1;
        note = '贴「' + t.name + '」，杀气涨了三成（' + TAL_BUFF_TURNS + ' 回合内有效）';
      }
    } else if (sub === 'bluff') {
      const odds = clamp(0.25 + st('insight') * 0.02 + S.fame / 2000 - diff * 0.05, 0.05, 0.7);
      if (rng() < odds) {
        S.combat = null; S.phase = 'play';
        logLine('数言甫毕，彼却半步，回身而去。', 'good');
        S.fame += 3;
        advanceXun(1); render(); return;
      }
      note = '他不信你';
    } else if (sub === 'defend') { c.defending = true; note = combatLine('guard') + '（守势）'; }
    else if (sub === 'flee') {
      if (S.preBuff && S.preBuff.escape) { S.preBuff.escape = false; 
        S.combat = null; S.phase = 'play'; logLine('破宝锥开路，你从容遁走。', 'good'); advanceXun(1); render(); return; }
      /* v10.1 第二梯队·问题2：御风术/凌波仙经/天遁剑诀的「遁速」从此兑现 */
      const _gesc = (G.WXCS3_EXT && G.WXCS3_EXT.gongfaEscape) ? G.WXCS3_EXT.gongfaEscape() : 0;
      if (rng() < clamp(0.4 + st('speed') * 0.035 + artBonus('move') + _gesc + gongfaFateAdd() * 0.005 - gap * 0.18 - diff * 0.02, 0.05, 0.95)) {
        if (combatTierNow(c) === '绝境') bump('escapeDesperate');
        S.combat = null; S.phase = 'play';
        logLine('遁去得脱。', '');
        advanceXun(1); render(); return;
      }
      note = '走不脱';
    } else if (sub === 'observe') { c.observed = true; note = combatLine('observe') + '（看破了破绽）'; }
    else if (sub === 'pill') {
      const p = D.PILL_EXT.find(function (x) { return x.id === arg; }) ||
        D.PILL_EXT.find(function (x) { return (S.bag[x.id] || 0) > 0 && ['hp','hpPct','hpFull','cure','mp','mpPct','mpFull'].includes(x.type); });
      if (!p || (S.bag[p.id] || 0) < 1) { toast('没有可用丹药'); render(); return; }
      S.bag[p.id]--;
      bump('pillUsed'); S.pillThisMonth = true; c.usedPill = true;
      note = '服 ' + p.name + '：' + applyPill(p);
    } else if (sub === 'talk') {
      if (rng() < clamp(0.2 + (st('fate') + gongfaFateAdd()) * 0.02 - gap * 0.1 - diff * 0.01, 0.05, 0.6)) {
        S.combat = null; S.phase = 'play';
        logLine(`以言周旋，${c.foe.name}杀意遂敛。`, 'good');
        advanceXun(1); render(); return;
      }
      note = '不为所动';
    } else if (sub === 'ext') {
      /* v9.0 M2：扩展战斗动作（兽令三式 / 本命法技）走同一条结算尾巴。
         注册数组逐个问，谁认领谁答；'stop'＝扩展已自行 render。 */
      const _XE = G.WXCS3_EXT;
      let _r = null;
      if (_XE && _XE.combatActHooks) {
        for (let _i = 0; _i < _XE.combatActHooks.length; _i++) {
          _r = _XE.combatActHooks[_i](arg, c);
          if (_r !== null && _r !== undefined) break;
        }
      }
      if (_r === 'stop') return;
      if (!_r) { render(); return; }
      dmg = _r.dmg || 0;
      hit = _r.hit !== false;
      note = _r.note || '';
    }

    if (dmg > 0 && hit && ['attack', 'skill', 'shentong', 'cast', 'tal'].indexOf(sub) >= 0) applyAttackArtCost();
    if (gap >= 2 && hit && ['attack', 'skill'].indexOf(sub) >= 0) {
      note = (note ? note + '；' : '') + '位格差得太远，这一下几乎打不动他';
    }
    /* v10.4 P1：破绽加成只看「出手瞬间是否已有破绽」。
       旧写法 `c.foeMark > 0` 会把自己刚造出来的破绽在同一击里吃掉，
       让「造破绽」变成「免费加伤」——目类神通因此长期超模。 */
    const _markApplies = (sub === 'shentong') ? _markBefore : (c.foeMark > 0);
    if (hit && dmg > 0 && _markApplies) { dmg = Math.round(dmg * 1.25); }
    if (hit && dmg > 0) {
      c.foe.hp = Math.max(0, c.foe.hp - dmg);
      note = (note ? note + '；' : '') + '造成 ' + dmg;
    }
    if (note) logLine(note, '');
    if (c.foe.hp <= 0) { settleCombatWin(c); return; }
    // 修卡死：foeTurn 返回 false 的两条出口（战死/昏迷）也必须刷新界面
    if (!foeTurn()) { render(); return; }
    render();
  };

  /* ---------- 随机事件 ---------- */
  function maybeEvent() {
    if (S.phase !== 'play') return;   // 已经死了或进了别处，别再往上面叠事
    if (S.holdEvent) return;   // 破境的诗还没看完，先别插别的事
    /* 仇家堵在门口时先处理这件事——别让一件奇遇把它顶掉，
       那样「死仇」就成了一句永远等不到下文的日志。 */
    if (S.pendingVengeance && S.phase === 'play' && !S.combat) {
      const vsrc = S.pendingVengeance;
      S.pendingVengeance = false;
      openVengeance(vsrc);
      return;
    }
    // 人情账正等着你决定——别用奇遇把面板顶掉（顶掉就等于强制忽略了债）
    if (S.hookPending) return;
    // 传法机缘（主线级）优先：境界够了就先给这个，普通奇遇与随机事件让位
    if (S.phase === 'play' && !S.pendingTx) { if (tryTransmission()) return; }
    // 再掷普通机缘（三选一，玩家自选），命中则不再走随机事件
    if (S.phase === 'play' && !S.pendingEnc && tryEncounter(false)) return;
    if (rnd100() > 20) return;
    // P2-17：1d100 十二区间表
    let id = eventSlot(rnd100());
    if (id === S.lastEventId && S.eventStreak >= 1) id = eventSlot(rnd100());
    let ev = D.EVENTS.find(function (e) { return e.id === id; }) || D.EVENTS[0];
    S.lastEventId = ev.id;
    S.eventStreak = (S.eventStreak || 0) + 1;
    applyEvent(ev);
  }

  function applyEvent(ev) {
    // 先把画面说出来，再结算数值
    if (ev && ev.text) {
      logLine(ev.log || ev.name, ev.kind === 'good' ? 'good' : 'danger');
      S.lastEventText = ev.text;
      S.lastEventAfter = ev.after || '';
      if (rng() < 0.35) {
        // 只偶尔弹窗，不然每回合都打断
        openModal('事 · ' + ev.name,
          iconTagByKey(iconKey('EVENTS', ev.id), 'lg', 'ico--band') +
          '<div class="npcmeet"><div class="nm-line">' +
          esc(ev.text) + '</div>' + (ev.after ? '<div class="nm-look">' + esc(ev.after) + '</div>' : '') +
          '</div><div style="margin-top:10px"><button class="btn" data-act="modal:close">知道了</button></div>', false);
      }
    }
    S.famine = false; S.neighborBetter = false;
    /* v8.0：事件效果改成数据驱动。
       旧版这里是一张 12 个 case 的硬编码表，加一条事件要动两处代码，
       而且十二条几乎全是神道向（信众/香火/香客）——仙道玩家一个月看一次「无事」。
       现在 events 可以直接在数据里写 eff，复用自由行动那套效果结算。 */
    if (ev.eff) {
      const notes = applyIntentEff(ev.eff);
      if (notes.length) logLine(notes.join('，') + '。', '');
      return;
    }
    switch (ev.id) {
      case 'pilgrim': {
        const g = ev.followers || 20;
        S.followers = Math.min(followLimit(), S.followers + g);
        logLine(`有人来上香，信众 +${g}。`, 'good'); break;
      }
      case 'spirit': {
        S.stones += 100;
        logLine('灵脉异动，采到一缕好气。灵石 +100。', 'good'); break;
      }
      case 'donor': {
        S.stones += 150;
        logLine('有富户来还愿，捐了灵石 150。', 'good'); break;
      }
      case 'drought':
        S.famine = true; S.piety = Math.max(0.5, S.piety - 0.1);
        logLine('大旱。求雨的人挤满了庙门。', 'danger'); break;
      case 'plague':
        S.followers = Math.round(S.followers * 0.75);
        logLine('瘟疫，信众 -25%。', 'danger'); break;
      case 'neighbor': {
        S.neighborBetter = true;
        const lose = Math.round(S.followers * 0.15);
        S.followers -= lose;
        logLine(`邻庙更灵，信众 -${lose}。`, 'danger'); break;
      }
      case 'prefect':
        S.stones = Math.max(0, S.stones - 100);
        logLine('官府征调，摊派了 100 灵石。', 'danger'); break;
      case 'wander': {
        S.stats.insight += 1;
        logLine('游方道士指点一句，悟性 +1。', 'good'); break;
      }
      case 'demon':
        S.suiFlag = true; S.piety = Math.max(0.5, S.piety - 0.15);
        logLine('邪祟作乱，当众压制你的灵验。', 'danger'); break;
      case 'draft':
        S.fame += 15; S.followers = Math.min(followLimit(), S.followers + 500);
        logLine('朝廷册封！信众 +500，声望 +15。', 'good'); break;
      case 'theft':
        S.stones = Math.max(0, S.stones - 80);
        logLine('庙产被盗，损失灵石 80。', 'danger'); break;
      case 'storm':
        S.templeBroken = true;
        logLine('暴雨毁了庙墙，庙宇破损。', 'danger'); break;
      default: logLine('无事。', '');
    }
  }

  /* ---------- 弹窗 ---------- */
  /* 可点元素统一补键盘语义：optRow 有 100+ 调用点，逐个改既漏又吵，
     渲染后统一扫描 [data-act] 才是稳的。 */
  function enhanceA11y(root) {
    if (!root || !root.querySelectorAll) return;
    const list = root.querySelectorAll('[data-act]');
    if (!list || !list.length) return;
    Array.prototype.forEach.call(list, function (el) {
      if (!el || !el.setAttribute) return;
      const tag = (el.tagName || '').toUpperCase();
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A') return;
      if (!el.getAttribute || !el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
    });
  }
  let modalFocusReturn = null;
  function openModal(title, body, noClose) {
    const active = document.activeElement;
    if (active && active !== document.body) modalFocusReturn = active;
    document.body.classList.add('modal-open');
    const box = document.getElementById('modals');
    box.innerHTML = `<div class="modal"${noClose ? ' data-noclose="1"' : ''}><div class="box">
      <h3 id="modal-title">${esc(title)}</h3>${body}
      ${noClose ? '' : '<div style="margin-top:12px"><button class="btn ghost" data-act="modal:close">关闭</button></div>'}
    </div></div>`;
    enhanceA11y(box);
    /* 焦点进弹窗：键盘用户打开后立刻能 Tab / Enter，而不是还留在背景输入框 */
    const first = box.querySelector('.box [data-act], .box h3');
    if (first && first.focus) {
      if ((first.tagName || '').toUpperCase() === 'H3' && first.setAttribute) first.setAttribute('tabindex', '-1');
      first.focus();
    }
  }
  /* 关弹窗的唯一出口。
     v10.3 P1：以前「清内容」这件事有两处写法（closeModal 与 maybeTransmitNow），
     后者只写 box.innerHTML='' 不解 modal-open —— 移动端整页从此滚不动。
     现在内容与滚动锁统一由 clearModalBody 负责，谁要清弹窗都调它。 */
  function clearModalBody() {
    const box = document.getElementById('modals');
    if (box) box.innerHTML = '';
    _shopOpen = false;
    document.body.classList.remove('modal-open');
  }
  function closeModal() {
    clearModalBody();
    /* 焦点还给触发元素；重绘后元素可能已经不在，需确认仍在文档里 */
    const back = modalFocusReturn;
    modalFocusReturn = null;
    try {
      if (back && back.focus && (!document.contains || document.contains(back))) back.focus();
    } catch (e) { }
  }
  function confirmAction(t, m, cb) {
    const box = document.getElementById('modals');
    box.innerHTML = `<div class="modal"><div class="box"><h3>${esc(t)}</h3><div class="small">${esc(m)}</div>
      <div style="margin-top:14px;display:flex;gap:8px"><button class="btn risk" data-confirm="1">确定</button>
      <button class="btn ghost" data-act="modal:close">取消</button></div></div></div>`;
    box.querySelector('[data-confirm]').onclick = () => { closeModal(); cb(); };
    return true;
  }

  /* ---------- 分发 ---------- */
  /* v10.3 P1：死后只放行「结局屏与系统」自己的动作。
     旧版 dispatch 只 syncInputs 不看 phase，而键盘映射把 B 绑到 openBreak ——
     结算屏开着时按 B 还能破境加阶（do_xbreak → S.xRealm++），
     结局成因、年谱、成就都会被死后的操作污染。
     白名单只收：系统面板/存档/年谱/功过格/烧页/投胎/临终四选。 */
  const PHASE_FREE_ACT = {
    'do;save': 1, 'do;load': 1, 'do;auto': 1, 'do;del': 1, 'do;exp': 1,
    'do;expall': 1, 'do;imp': 1, 'do;reset': 1,
    'do;burn': 1, 'do;legacy': 1, 'do;rebor': 1, 'do;die': 1,
    'do;chron': 1, 'do;chronmore': 1, 'do;acht': 1, 'do;mem': 1,
    'act:openSys': 1, 'act:openSave': 1, 'act:openHelp': 1,
    'act:openAch': 1, 'act:openChronicle': 1, 'act:screen': 1,
    'modal:close': 1
  };
  function phaseAllows(act, phase) {
    if (phase !== 'over' && phase !== 'dying') return true;
    const key = String(act)
      .replace(/^(do;[^:]+):.*$/, '$1')
      .replace(/^(act:[^:]+):.*$/, '$1');
    return !!PHASE_FREE_ACT[key];
  }

  /* v10.4 P1·3.3：动作后钩子。
     ------------------------------------------------------------
     项目此前没有任何「动作后」全局钩子，于是功法的生活被动每挂一处
     就要改一次对应的 ACT——30 个 ACT 就是 30 次修改，没人愿意做，
     所以「功法在生活侧只有 1 个出口」这个洞一直没补。
     这里给一个极轻的注册数组：所有经 dispatch 的动作在结算末尾调用一次。
     三条纪律：
       ① 只读 act 字符串与 S，不许在钩子里再 dispatch（会无限递归）
       ② 钩子不许改变动作结果，只能做「顺带」的事（记录/小额奖励）
       ③ tx: / enc: / act: 三个前缀不经过 do; —— enc: 单独挂一处 */
  function runActionHooks(act) {
    const X = G.WXCS3_EXT;
    if (!X || !X.onActionHooks || !X.onActionHooks.length) return;
    for (let i = 0; i < X.onActionHooks.length; i++) {
      try { X.onActionHooks[i](act); } catch (e) { /* 钩子失败不许拖垮动作 */ }
    }
  }

  function dispatch(act) {
    if (!act) return;
    syncInputs();
    if (S && !phaseAllows(act, S.phase)) {
      /* 不弹 toast：玩家不该在死后破境，但开发者排查时需要痕迹 */
      console.warn('[phase] ' + S.phase + ' 阶段忽略动作：' + act);
      return;
    }
    // 奇遇／机缘：data.js 里写作 enc:<事件id>:<选项>，没有 do; 前缀
    if (act.startsWith('tx:')) {
      const parts = act.slice(3).split(':');
      ACT.do_tx(parts[0], parts[1]);
      return;
    }
    if (act.startsWith('enc:')) {
      const p = act.split(':');
      if (ACT.do_enc) ACT.do_enc(p[1], p[2]);
      runActionHooks(act);      // 奇遇不经过 do;，单独挂一次
      return;
    }
    if (act.startsWith('act:')) { const k = act.slice(4); if (ACT[k]) ACT[k](); return; }
    if (act.startsWith('do;')) {
      const parts = act.slice(3).split(':');
      /* v9.0 第1步：先查扩展注册表，再回退到本文件的 ACT。
         这样新玩法写在 wxcs3-ext-*.js 里也能被同一个 do; 通道调用，
         而 game.js 只需要这一处转发，不必为每个新功能再改一次。 */
      const extFn = EXT_ACT[parts[0]] ? EXT_ACT[parts[0]] : EXT_ACT['do_' + parts[0]];
      const fn = extFn || ACT['do_' + parts[0]] || ACT[parts[0]];
      if (fn) fn(parts[1], parts[2], parts[3]);
      else toast('无此指令：' + act);
      runActionHooks(act);
      return;
    }
    if (act.startsWith('modal:')) { closeModal(); return; }
    if (act.startsWith('cv:')) { S.draft.cultivation = act.slice(3); if (S.draft.cultivation === 'xian') S.draft.faxiang = null; render(); return; }
    if (act.startsWith('gender:')) { S.draft.gender = act.slice(7); render(); return; }
    if (act.startsWith('fx:')) { S.draft.faxiang = act.slice(3); render(); return; }
    if (act.startsWith('origin:')) { S.draft.origin = act.slice(7); render(); return; }
    if (act.startsWith('path:')) { S.draft.path = act.slice(5); render(); return; }
    if (act.startsWith('root:')) { S.draft.root = act.slice(5); S.draft.rootEls = []; render(); return; }
    if (act.startsWith('el:')) {
      const k = act.slice(3), maxN = needEls(S.draft.root);
      let els = S.draft.rootEls || [];
      if (els.includes(k)) els = els.filter(x => x !== k);
      else { if (els.length >= maxN) els.shift(); els.push(k); }
      S.draft.rootEls = els; render(); return;
    }
    if (act.startsWith('body:')) { S.draft.body = act.slice(5); render(); return; }
    if (act.startsWith('tal:')) {
      const id = act.slice(4);
      let arr = S.draft.talents || [];
      arr = arr.includes(id) ? arr.filter(x => x !== id) : arr.concat([id]);
      S.draft.talents = arr; render(); return;
    }
    if (act.startsWith('st:')) {
      const [, sign, key] = act.split(':');
      S.draft.stats = S.draft.stats || baseStats();
      const v = S.draft.stats[key];
      if (sign === '+' && v < 15) S.draft.stats[key] = v + 1;
      if (sign === '-' && v > 1) S.draft.stats[key] = v - 1;
      render(); return;
    }
    if (act === 'create-next') { S.createStep = 1; render(); return; }
    if (act === 'create-back') { S.createStep = 0; render(); return; }
    if (act === 'create-start') { finishCreate(); return; }
    // 兜底：没有任何分支接住这个 act 时，至少给个提示，
    // 避免"点了完全没反应 + 弹窗又无关闭按钮"的静默卡死。
    toast('此选项暂不可用：' + act);
  }

  function syncInputs() {
    const n = document.getElementById('in-name');
    if (n && S && S.draft) S.draft.name = n.value.trim();
    const a = document.getElementById('in-age');
    if (a && S && S.draft) S.draft.age = clamp(parseInt(a.value, 10) || 16, 16, 60);
    const l = document.getElementById('in-look');
    if (l && S && S.draft) S.draft.look = l.value.trim();
  }

  function draftInit() {
    return { name: '', gender: '男', age: 16, look: '', cultivation: null, faxiang: null,
      origin: null, path: null, root: null, rootEls: [], body: null, talents: [], stats: baseStats() };
  }

  /* ---------- 创角完成 ---------- */
  function finishCreate() {
    const d = S.draft;
    S.name = d.name || '无名';
    S.gender = d.gender; S.age = d.age; S.look = d.look || '眉目清朗';
    S.cultivation = d.cultivation;
    S.faxiang = d.faxiang;
    S.origin = d.origin; S.path = d.path;
    S.root = d.root || 'pseudo'; S.rootEls = (d.rootEls || []).slice();
    S.body = d.body; S.talents = (d.talents || []).slice();
    S.stats = Object.assign({}, d.stats);

    const o = D.ORIGINS.find(x => x.id === S.origin);
    if (o && o.apply) {
      for (const k in o.apply) {
        const v = o.apply[k];
        if (k === 'hpFlat') S.hpFlatBonus = (S.hpFlatBonus || 0) + v;
        else if (k === 'stones') S.stones += v;
        else if (k === 'fame') S.fame += v;
        else if (k === 'scroll') { S.ownedGongfa = ['juqi', 'liuhuo']; }
        else if (k === 'halfDemon') S.halfDemon = true;
        else if (k === 'ritual') S.knowRitual = true;
        else if (S.stats[k] !== undefined) S.stats[k] += v;
      }
    }
    for (const t of S.talents) {
      const tt = D.TALENTS.find(x => x.id === t);
      if (!tt || !tt.apply) continue;
      for (const k in tt.apply) {
        const v = tt.apply[k];
        if (k === 'hpFlat') S.hpFlatBonus = (S.hpFlatBonus || 0) + v;
        else if (k === 'mpFlat') S.mpFlatBonus = (S.mpFlatBonus || 0) + v;
        else if (S.stats[k] !== undefined) S.stats[k] += v;
      }
    }
    for (const k in S.stats) S.stats[k] = clamp(S.stats[k], 1, 20);

    S.dao = genDao();
    /* v10.5：创角也走同一条重算出口。胎息/一柱基数仍是 100，
       所以开局面板不变，但境界与乘区从此有地方落。 */
    S.quenchApplied = quenchLv();
    recalcCaps(false);
    S.hp = S.hpMax; S.mp = S.mpMax;
    /* 起步就在第一档：仙道胎息 / 神道一柱·立庙。旧版这里留 0，
       于是 stage 1 的境界词永远走不到。 */
    S.unlockStage = 1;
    /* 开局那一档的境界词也要落地，否则 16 条里永远缺第一条 */
    const _r0 = unlockRow(S.cultivation === 'shen' ? 'shen' : 'xian', 1);
    if (_r0 && _r0.phrase) logLine('· ' + _r0.phrase, 'good');

    // 按主修初始化
    if (isShen()) {
      S.lifeMax = D.PILLARS[0].life;
      S.followers = 100;
      S.miao = '野祀';
    } else {
      S.lifeMax = D.XIAN_REALMS[0].life;
      S.xiuwei = 0;
      /* v10.5 P0·A1：烈火掌是术法，不再混进道基池 */
      if (!S.ownedGongfa || !S.ownedGongfa.length) S.ownedGongfa = ['juqi', 'yufeng'];
      else S.ownedGongfa = S.ownedGongfa.filter(function (x) { return x !== 'liehuo'; }).concat(['yufeng']);
      learnArt('fa:liehuo');
    }
    if (S.cultivation === 'both') {
      S.lifeMax = D.XIAN_REALMS[0].life;
      S.followers = 100;
      /* v10.5 P0·A1：烈火掌是术法，不再混进道基池 */
      if (!S.ownedGongfa || !S.ownedGongfa.length) S.ownedGongfa = ['juqi', 'yufeng'];
      else S.ownedGongfa = S.ownedGongfa.filter(function (x) { return x !== 'liehuo'; }).concat(['yufeng']);
      learnArt('fa:liehuo');
      S.miao = '野祀';
    }
    if (!S.ownedGongfa) S.ownedGongfa = ['juqi'];
    S.ownedGongfa = S.ownedGongfa.filter(function (v, i, a) { return a.indexOf(v) === i; });
    // P1-11：按已有功法最高品阶反推仙基（筑基时用）
    S.topGongfaTier = (S.ownedGongfa || []).reduce(function (best, id) {
      const g = D.GONGFA.find(function (z) { return z.id === id; });
      const order = ['huang', 'xuan', 'di', 'tian', 'xian'];
      const i2 = g ? order.indexOf(g.tier) : 0;
      return i2 > best ? i2 : best;
    }, 0);

    // 烧页传承：只继承所选一项，同时执行血债与寿元代价。
    if (S.legacy && S.legacy.kind) {
      if (S.legacy.kind === 'xiuwei' && xrealm().need) S.xiuwei = Math.min(xrealm().need, 30);
      if (S.legacy.kind === 'life' && S.lifeMax) S.lifeMax += 40;
      if (S.lifeMax) S.lifeMax = Math.max(40, Math.round(S.lifeMax * 0.95));
      S.bloodDebt = Math.max(0.1, S.bloodDebt || 0);
      logLine('前世烧页之债随此生而来：血债 +10%，寿元上限 −5%。', 'danger');
    }

    // v8.0 临终所托：传功与道统各留一点底子给来世（与烧页传承叠加，不替代）
    if (S.legacyPact === 'pass') {
      S.stats.qualify = Math.min(20, (S.stats.qualify || 8) + 1);
      logLine('前身传功之恩犹在：悟性 +1。', 'good');
      S.legacyPact = null;
    } else if (S.legacyPact === 'daotong') {
      S.stones += 300;
      logLine('前身道统留下的一点家底：灵石 +300。', 'good');
      S.legacyPact = null;
    }

    S.mainline = mainlineFor(S.path);
    S.unlockStage = 0;

    const n0 = D.NPC_POOL[0];
    // 开局不是「名单里已经有个名字」，而是真有一场相遇（首次看到情缘面板时才播）
    S.npcs[n0.id] = { fav: 8, met: false, pendingMeet: true };
    if (S.talents.includes('peach')) S.npcs[n0.id].fav = Math.round(S.npcs[n0.id].fav * 1.2);

    /* v9.0 M4：上一世道果在此兑现。
       只给信息、候选与初始关系；旧庙是唯一带月账的一项。 */
    const _XF = G.WXCS3_EXT;
    if (_XF && _XF.applyFruit) _XF.applyFruit();

    S.started = true; S.phase = 'play'; S.turn = 0;
    /* v9.0 M0：开局就把本局种子注入随机源。
       创角阶段的随机（灵根、外貌）已按种子走，开局后继续同一条序列。 */
    if (!S.seed) S.seed = (Math.floor(Math.random() * 1e9) + 1);
    setSeed(S.seed);
    S.tutStep = 0;      // 新手引导从头开始
    // v6.6：百世书页数烧掉之后，这一世开局可以带一项前世残忆
    if (S.legacy || pageCount() < 3) {
      const _mem = unlockedMemories();
      if (_mem.length) { S.phase = 'play'; logLine('你从很远处来。记忆里有东西还在。', '');
        try { checkAch(); } catch (e) { } render(); offerMemory(); return; }
    }
    logLine(isShen() ? '立庙。天玄历 387 年春，供桌上只有半个冷馒头。'
      : '入道。天玄历 387 年春，气海里第一次响起了水声。', 'good');
    // v6.6：开局也判一次。灵初这类「教学用」成就应当在第一眼就弹出来
    try { checkAch(); } catch (e) { }
    render();
  }

  function genDao() {
    const a = ['清','玄','无','云','素','沧','白','紫','了','妙'];
    const b = ['微','裳','尘','衣','心','涯','霜','阳','真','一'];
    return a[Math.floor(rng()*10)] + b[Math.floor(rng()*10)];
  }


  /* ---------- 结局（接 D.ENDINGS 表） ---------- */
  /* 之前结局是硬编码的一行字，12 个结局全在 data 里躺着没人用。
     v10.3 P0：旧顺序是「死因 → 果位 → 道胎 → 名声」，而进结局屏的唯一路径
     （finalizeDeath）必定写 deathReason，于是 `if (S.deathReason) return 'fall'`
     抢先返回，guowei / daotai / ascend / xianzun / modao 五个结局永远不会出现。
     现在改成「高光结局先判，死因最后兜底」：
       ① 主动证位（证真君/世尊）走 endingId；
       ② 修为与位业到顶的成就型结局；
       ③ 最后才按死因分寿元/失锚/横死。
     寿元死只可能发生在有寿元的境界（<道胎），所以前置不会抢走寿元结局。 */
  function resolveEnding() {
    const pickEnd = function (id) {
      return (D.ENDINGS || []).find(function (e) { return e.id === id; }) || null;
    };
    if (S.endingId) return pickEnd(S.endingId);
    /* 百世书：在结局屏点「烧一页重来」即视为这一世以「轮回」收束，
       由 ACT.do_burn 打上标记（do_legacy 随后 newGame，来不及再判一次）。 */
    if (S.reincShown) return pickEnd('reinc');
    /* v10.1 第一梯队：补齐两个从未触发的结局。
       —— ascend（登仙）——
       原文案「补回断掉的四境」，此前代码里没有任何对应机制，故永远走不到。
       这里不再新造"上古残卷收集"系统（那是另一批工作量），而是复用道胎之后
       真实存在的进展：四锚全固。道胎无寿元，只靠四锚钉住自己；
       四锚全固＝把自己一段一段接回来，与文案「一段一段接回来」正好同义。
       条件：道胎(xRealm>=5) + 四锚各 >=1 + 功德>=100（一路守正而来）。
       —— reinc（百世书）——
       原文案「烧一页重来」。此前 do_legacy 直接 newGame，从不写 endingId，
       所以这个结局永远不显示；现由上方的 reincShown 标记认领。 */
    if (isXian() && S.xRealm >= 5) {
      const solid = Object.keys(S.anchors || {}).filter(function (k) { return (S.anchors[k] || 0) >= 1; }).length;
      if (solid >= 4 && (S.merit || 0) >= 100 && (S.karma || 0) < 100) return pickEnd('ascend');
    }
    if (S.xRealm >= 5) return pickEnd('daotai');
    if (S.pillar >= 7 && S.merit >= 300) return pickEnd('shizun');
    if (S.pillar >= 7) return pickEnd('zhenjun');
    if (S.guowei) return pickEnd('guowei');
    if (S.xianzun || S.fame >= 500) return pickEnd('xianzun');
    if (S.karma >= 300) return pickEnd('modao');
    /* —— 以下按死因兜底 —— */
    if (S.deathReason && /寿元/.test(S.deathReason)) {
      if (S.karma > 100 || S.stats.heart < 6) return pickEnd('sit');
      if (S.merit >= 100 && S.karma < 30) return pickEnd('xiaoyao');
      return pickEnd('sit');
    }
    /* 正则与 finalizeDeath 的成就记账统一：神道失锚写的是「枯朽」，
       旧版这里只认「道化|锚」，庙神死得像被剑捅死。 */
    if (S.deathReason && /道化|锚|枯朽/.test(S.deathReason)) return pickEnd('daohua');
    if (S.deathReason) return pickEnd('fall');
    return pickEnd('sit');
  }

  /* v8.0 临终：死之前还有一件事可以做。这里只摆选择，结果由 ACT.do_die 结算。 */
  function dyingHeir() {
    let bestId = null, bestFav = -999;
    Object.keys(S.npcs || {}).forEach(function (id) {
      const r = S.npcs[id];
      if (!r || !r.met || r.alive === false) return;
      const f = r.fav || 0;
      if (f > bestFav) { bestFav = f; bestId = id; }
    });
    if (!bestId || bestFav < 40) return null;
    return D.NPC_POOL.find(function (x) { return x.id === bestId; }) || null;
  }

  function renderDying() {
    const d = S.dying || {};
    const heir = dyingHeir();
    const hasOrg = !!(S.sect || S.clan);
    let b = '';
    b += '<div class="endingname">临终</div>';
    b += '<div class="endingtext">' + esc(d.reason || '气血将尽。') + '</div>';
    b += divider();
    b += '<div class="small muted">尚有一事未了，止可为一件。</div>';
    b += '<ul class="opts">';
    const byAge = /寿元/.test(String(d.reason || ''));
    b += optRow('A', '最后一搏', { name: '搏', cls: 'risk' },
      byAge ? '生还三成五 · 续命一年 · 道心 −2' : '生还三成五 · 寿元上限 −10 · 道心 −2',
      false, 'do;die:stand');
    b += optRow('B', '传功后人', { name: '传', cls: 'peace' },
      heir ? ('尽传于' + heir.name + '，来世起手悟性 +1') : '侧无人可传',
      !heir, 'do;die:pass');
    b += optRow('C', '托付道统', { name: '道', cls: 'peace' },
      hasOrg ? ((S.clan ? S.clan.name + '氏' : D.SECT.ranks[S.sect.rank].name) + '承此一脉，来世起手灵石 +300')
        : '无宗族可托',
      !hasOrg, 'do;die:daotong');
    b += optRow('D', '就此瞑目', { name: '静', cls: 'warn' }, '不复挣扎', false, 'do;die:close');
    b += '</ul>';
    b += '<div class="hint">此局仅有一次。一搏不回，再无第二次。</div>';
    return panel('临终 · 最后一事', b, { cls: 'warn', sub: '一息尚存' });
  }

  function renderOver() {
    const end = resolveEnding();
    let b = '';
    if (end) {
      b += '<div class="endingname">' + esc(end.name) + '</div>';
      b += '<div class="endingtext">' + esc(end.text) + '</div>';
      b += '<div class="small muted" style="margin-top:4px">成因 · ' + esc(end.cond) + '</div>';
    }
    b += '<div class="small" style="margin-top:8px">' + esc(S.deathReason || '道消身殒。') + '</div>' + divider();
    b += `<div class="statline"><span class="k">道号</span><span class="v">${esc(S.dao || S.name)}</span></div>`;
    b += `<div class="statline"><span class="k">终境</span><span class="v">${esc(realmName())}</span></div>`;
    b += `<div class="statline"><span class="k">享年</span><span class="v">${S.age} 岁</span></div>`;
    b += `<div class="statline"><span class="k">功德/业力</span><span class="v">${S.merit} / ${S.karma}</span></div>`;
    if (S.guowei) b += `<div class="statline"><span class="k">果位</span><span class="v">${esc(S.guowei.n)}</span></div>`;
    if (needsAnchor()) {
      const solid = Object.keys(S.anchors).filter(k => S.anchors[k] >= 1).length;
      b += `<div class="statline"><span class="k">固锚</span><span class="v">${solid}/4</span></div>`;
    }
    b += divider();
    // v6.6：这一生，功过格记得什么
    { const _st = achStat();
      const _cats = ['道','艺','争','缘','势','秘'];
      let _g = 0; _cats.forEach(function(k){ _g += (_st.cats[k]||0); });
      b += '<div class="small">此生：功 ' + _g + ' · 过 ' + (_st.cats['过']||0) + ' · 隐 ' + (_st.cats['隐']||0) + '</div>';
      const _big = D.ACHIEVEMENTS.filter(function(a){ return (a.tier==='dian'||a.tier==='tian') && S.ach && S.ach[a.id]; });
      b += '<div class="small muted">入典 ' + _big.length + ' 项' + (_big.length ? '（' + _big.map(function(a){return esc(a.name);}).join('、') + '）' : '') + '　天书 ' + (_st.tian) + ' 项</div>';
      b += '<div class="small muted">前世累计：入典 ' + _st.past + '　天书 ' + _st.tian + '/' + _st.tianAll + '</div>';
      if (S.legacyMemory) { const _m = D.ACH_MEMORY.find(function(x){return x.id===S.legacyMemory;}); if (_m) b += '<div class="small muted">携「' + esc(_m.name) + '」而去</div>'; }
    }
    b += `<div class="small muted">${isXian() ? '汝已至此法之尽头，抑或未至。' : '像犹在，不复应汝。'}</div>`;
    /* v10.1 第一梯队 · 软死档修复。
       旧版这里只有一个按钮「烧一页重来」，而 do_burn 在 pages===0 时直接
       toast('没有页可烧') 返回 —— 第 4 次死亡后整屏无任何可用操作，
       只能去系统菜单 do_reset，那会连跨世积累一起清空。
       现在分两条路：
         · 还有页 → 烧一页（原逻辑）
         · 没有页 → 空手投胎（保留跨世成就与谱系，只丢本世传承与宝物）
       空手投胎不是白送：它仍走 newGame、仍加血债、仍不继承任何 legacy，
       对应成就「烧尽」的文案「末页亦焚，来世无物可带，包括所应之事」。 */
    if (pageCount() > 0) {
      b += `<div style="margin-top:10px"><button class="btn gold" data-act="do;burn">百世书 · 烧一页重来</button></div>`;
    } else {
      b += '<div class="hint danger">末页亦焚，手中更无余页。</div>';
      b += `<div style="margin-top:10px"><button class="btn" data-act="do;rebor">空手投胎 · 从零再走</button></div>`;
      b += '<div class="small muted" style="margin-top:6px">无宝、无修为、无寿元；功过与前世之忆尚存。</div>';
    }
    return panel('道途终章', b, { cls: 'warn', sub: '坐化 / 道化 / 陨落' });
  }

  /* ============================================================
     v6.3 年谱：完整纪事，可导出为文件
     左栏事件流只保留现场 24 条；年谱不截断，是给玩家留的传。
     ============================================================ */
  const NL = String.fromCharCode(10);
  function chronicleText() {
    const list = S.chronicle || [];
    if (!list.length) return '（尚无纪事）';
    const head = [
      '问道长生 · 年谱',
      '道号：' + (S.dao || S.name || '无名'),
      '道途：' + ((D.PATHS.filter(function (p) { return p.id === S.path; })[0] || {}).name || '—'),
      '主修：' + ((D.CULTIVATION.filter(function (c) { return c.id === S.cultivation; })[0] || {}).name || '—'),
      '终境：' + realmName(),
      '享年：' + S.age + ' 岁',
      '生成时间：' + new Date().toLocaleString('zh-CN'),
      '——'
    ].join(NL);
    const body = list.map(function (e) {
      const mm = (e.month < 10 ? '0' : '') + e.month;
      return '[' + e.year + '.' + mm + ' · ' + (e.age || 0) + '岁 · ' + (e.realm || '') + '] ' + e.txt;
    }).join(NL);
    return head + NL + body;
  }

  function downloadText(filename, txt) {
    const desk = window.WENDAO_DESKTOP;
    if (desk && typeof desk.saveFile === 'function') {
      desk.saveFile(filename, txt).then(function (r) {
        if (r && r.ok) toast('已导出 ' + r.path);
        else if (r && r.canceled) toast('已取消导出');
        else toast('导出失败' + (r && r.error ? '：' + r.error : ''));
      }).catch(function (e) { toast('导出失败：' + e); });
      return;
    }
    /* 与 downloadJson 同一条红线：file:// 下不假报成功 */
    if (downloadBlocked()) { toast(NO_BRIDGE_TIP); return; }
    try {
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
      toast('已导出 ' + filename);
    } catch (e) { toast('导出失败：' + e.message); }
  }

  /* v10.2：年谱越长弹窗越卡，先给最近 60 条，按需往前翻 */
  let _chronShown = 60;
  ACT.openChronicle = () => {
    const list = S.chronicle || [];
    const shown = Math.min(_chronShown, list.length);
    let b = '<div class="small">共 ' + list.length + ' 条纪事' +
      (list.length > shown ? '，已显示最近 ' + shown + ' 条' : '') +
      '。左栏只显示最近 24 条，这里能往前翻。</div>' + divider();
    b += '<div class="chron">';
    if (!list.length) b += '<div class="muted">尚无纪事。</div>';
    else {
      // 倒序展示，先给 60 条，避免一开就渲染几百个节点
      list.slice(-shown).reverse().forEach(function (e) {
        b += '<div class="cev ' + (e.cls || '') + '"><span class="ct">' + e.year + '·' +
          ((e.month < 10 ? '0' : '') + e.month) + '　' + (e.age || 0) + '岁</span>' +
          '<span class="cx">' + esc(e.txt) + '</span></div>';
      });
    }
    b += '</div>';
    if (list.length > shown) {
      b += '<div style="margin-top:10px"><button class="btn ghost" data-act="do;chronmore">载入更早的 ' +
        Math.min(60, list.length - shown) + ' 条</button></div>';
    }
    b += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn" data-act="do;chron">导出年谱 (.txt)</button>' +
      '<button class="btn ghost" data-act="do;expall">导出存档</button></div>';
    b += '<div class="hint">年谱是本作唯一不会丢的东西——存档会坏，年谱写过的就写过了。</div>';
    openModal('年谱 · 纪事', b);
  };
  ACT.do_chronmore = () => { _chronShown += 60; ACT.openChronicle(); };

  ACT.do_chron = () => {
    downloadText('问道长生_年谱_' + (S.dao || S.name || '无名') + '_' + stampName() + '.txt', chronicleText());
  };

  /* ============================================================
     v6.4 四艺：炼丹 / 炼器 / 制符 / 阵法
     定位：四艺是「手段」不是「身份」——不设职业、不设互斥，谁都能学。
     唯一的硬约束：每次制作占 1 旬，和打坐采气互斥。
     ============================================================ */

  function craftTierOf(art) {
    const lv = clamp(parseInt((S.craftLv || {})[art], 10) || 1, 1, D.CRAFT_LEVELS.length);
    return D.CRAFT_LEVELS[lv - 1].tier;
  }
  function tierIdx(t) { return ['huang', 'xuan', 'di', 'tian', 'xian'].indexOf(t); }
  /* 能不能碰这个品阶的配方：受「技艺品级」与「境界」双重限制 */
  function canCraftTier(art, tier, needLv) {
    const myLv = clamp(parseInt((S.craftLv || {})[art], 10) || 1, 1, D.CRAFT_LEVELS.length);
    const myTier = tierIdx(craftTierOf(art));
    const gate = D.CRAFT_REALM_GATE[tier] || 0;
    return myLv >= (needLv || 1) && tierIdx(tier) <= Math.max(myTier, 0) && S.xRealm >= gate;
  }
  function craftRateOf(art, recipe) {
    const lv = clamp(parseInt((S.craftLv || {})[art], 10) || 1, 1, D.CRAFT_LEVELS.length);
    let r = recipe.base + D.CRAFT_LEVELS[lv - 1].rate;
    // 状态：灵力/神识/伤势
    const a = D.CRAFT_ARTS.find(function (x) { return x.id === art; });
    if (a) r += (st(a.stat) - 10) * 0.012;
    if (hpRatio() < 0.33) r -= 0.12;
    else if (hpRatio() < 0.66) r -= 0.05;
    if (S.cave && S.cave.facilities && S.cave.facilities[art]) r += 0.05;
    /* v10.4 P1·3.3：四艺成功率读主修功法。
     ------------------------------------------------------------
     craftRateOf 是炼丹/炼器/制符/阵法四艺的唯一成功率闸口——
     在这里挂一次，四个系统同时生效，不必改 30 个 ACT。
     注意签名：第一个参数是「门类」(dan/qi/fu/zhen)，不是配方。
     功法加成走加法（与境界/属性/设施同口径），不走乘法，
     否则高成功率区会被乘得离谱。 */
    if (G.WXCS3_EXT && G.WXCS3_EXT.gongfaCraftBonus) {
      const _cg = G.WXCS3_EXT.gongfaCraftBonus(art);
      if (_cg > 0) r += _cg;
    }
    return clamp(r, 0.15, 0.95);
  }
  /* 品相判定 */
  function qualityRoll(rate, bonus) {
    bonus = bonus || 0;
    const r = rng();
    // 失败率越高，废品率越高
    const failBonus = (0.95 - rate) * 0.5;
    let acc = 0;
    const table = D.QUALITY.map(function (q, i) {
      let w = q.rate;
      if (i === 0) w += failBonus;                       // 废
      if (i === 3) w += bonus * 0.5;                     // 上品
      if (i === 4) w += bonus * 0.2;                     // 极品
      return w;
    });
    const total = table.reduce(function (a2, b) { return a2 + b; }, 0);
    for (let i = 0; i < table.length; i++) {
      acc += table[i] / total;
      if (r <= acc) return D.QUALITY[i];
    }
    return D.QUALITY[2];
  }
  /* 材料够不够 */
  function matsOf(recipe) { return recipe.mats || {}; }
  function hasMats(recipe) {
    const m = matsOf(recipe);
    for (const k in m) {
      if ((S.bagMat[k] || 0) < m[k]) return false;
    }
    return true;
  }
  function matCostOf(recipe) {
    const m = matsOf(recipe);
    let c = 0;
    for (const k in m) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
      c += (it ? it.price : 0) * m[k];
    }
    return c;
  }
  /* 成品基准价 = 产物表里的零售价（与结算同源）。
     v10.3 P0：旧版按「材料成本 × 2.2」给面板报价，而结算读的是
     PILL_EXT / TALISMANS / ARTIFACT_EXT 的 price——同一件东西两套价，
     回春丹面板说 440 石、实际只能卖 50 石，四张丹方三张半是负毛利。
     现在面板与结算都从这里取数，净利不再漂移。
     阵盘表没有 price 字段，退回「材料成本 × 1.6」作估算（面板与结算共用）。 */
  function outPriceOf(recipe, quality) {
    let base = 0;
    if (recipe && recipe.out) {
      if (recipe.kind === 'dan') {
        const p = D.PILL_EXT.find(function (x) { return x.id === recipe.out; });
        if (p) base = p.price;
      } else if (recipe.kind === 'fu') {
        const t = D.TALISMANS.find(function (x) { return x.id === recipe.out; });
        if (t) base = t.price;
      } else if (recipe.kind === 'qi') {
        const a = D.ARTIFACT_EXT.find(function (x) { return x.id === recipe.out; });
        if (a) base = a.price;
      } else if (recipe.kind === 'zhen') {
        const dk = D.ARRAY_DISKS.find(function (x) { return x.id === recipe.out; });
        if (dk && dk.price) base = dk.price;
      }
    }
    if (!base) base = matCostOf(recipe) * 1.6;
    return Math.round(base * (quality ? quality.mul : 1));
  }
  /* v10.5 P1·M2：自制品相溢价。
     买料→制作→卖若按零售回收，四艺的中间档会稳定亏六成以上，
     产业链只剩「自己采集」一条腿。这里只抬「亲手做出来」的成品：
     底价取 max(表价, 材料成本 × 1.55)，再走统一的回收折价。
     坊市买来的同 id 货物没有 craftedQ 记录，仍按表价回收——
     所以不会出现「低买高卖」的套利。 */
  const CRAFTED_VALUE_MUL = 1.55;
  function craftedValueOf(recipe) {
    if (!recipe) return 0;
    const table = outPriceOf(recipe, { mul: 1 });
    return Math.max(1, Math.round(Math.max(table, matCostOf(recipe) * CRAFTED_VALUE_MUL)));
  }
  function addMat(id, n) {
    S.bagMat = S.bagMat || {};
    const was = S.bagMat[id] || 0;
    S.bagMat[id] = was + n;
    const it = D.MATERIAL_EXT.find(function (x) { return x.id === id; });
    // 第一次拿到某种料时带上用途说明，之后只报数量
    queueGain(it ? it.name : id, n, was === 0 ? (it ? it.eff : '新材料') : '', was === 0);
  }
  function addTalisman(id, n) {
    S.talismans = S.talismans || {};
    S.talismans[id] = (S.talismans[id] || 0) + n;
  }
  /* 加熟练度并重算品级 */
  function addCraftXP(art, n) {
    S.craft = S.craft || { dan: 0, qi: 0, fu: 0, zhen: 0 };
    S.craft[art] = (S.craft[art] || 0) + n;
    let lv = 1;
    for (let i = 0; i < D.CRAFT_LEVELS.length; i++) {
      if (S.craft[art] >= D.CRAFT_LEVELS[i].need) lv = i + 1;
    }
    S.craftLv = S.craftLv || { dan: 1, qi: 1, fu: 1, zhen: 1 };
    const old = S.craftLv[art] || 1;
    S.craftLv[art] = lv;
    if (lv > old) {
      logLine(artName(art) + '精进至 ' + lv + ' 品。', 'good');
      toast(artName(art) + ' · ' + lv + ' 品');
    }
  }
  /* ---------- 「新得之物」：攒着，等这一回合结算完再一次性弹给玩家 ----------
     为什么不在加的时候直接弹：advanceMonth 里可能已经开了奇遇/事件面板，
     直接弹会把它顶掉。所以先入队，由调用方在流程末尾 flushGain()。 */
  function queueGain(name, num, note, fresh) {
    S.gainQueue = S.gainQueue || [];
    S.gainQueue.push({ name: name, num: num || 0, note: note || '', fresh: !!fresh });
  }
  function openGain(title, rows, o) {
    o = o || {};
    let b = '';
    if (o.note) b += '<div class="small muted" style="margin-bottom:6px">' + o.note + '</div>';
    b += '<ul class="gainlist">';
    rows.forEach(function (r) {
      b += '<li><span class="gn">' + esc(r.name) + '</span>' +
        (r.num ? '<span class="gx">×' + r.num + '</span>' : '') +
        (r.note ? '<span class="gd">' + esc(r.note) + '</span>' : '') + '</li>';
    });
    b += '</ul>';
    if (o.tail) b += '<div class="small muted" style="margin-top:7px">' + o.tail + '</div>';
    /* v10.7 阶段二：得物窗可以带一个「继续」出口。
       破境队列中的神通步骤用它回到 do;afterbreak，避免得物窗一关就断链。 */
    if (o.act) {
      b += '<div style="margin-top:10px"><button class="btn" data-act="' + esc(o.act) + '">' + esc(o.btn || '继续') + '</button></div>';
      openModal(title, b, true);
      return;
    }
    openModal(title, b);
  }
  /* 结算末尾调用：有东西才弹，没有就什么都不做（不打断节奏） */
  function flushGain(title, tail, force) {
    let q = S.gainQueue || [];
    S.gainQueue = [];
    /* 默认只弹「第一次见到这种东西」——在坊市连买十份料不该弹十次窗。
       采集/制作/任务这类「一回合的收获」传 force=true，全列出来。 */
    if (!force) q = q.filter(function (g) { return g.fresh; });
    if (!q.length) return false;
    const map = {}, order = [];
    q.forEach(function (g) {
      if (!map[g.name]) { map[g.name] = { name: g.name, num: 0, note: g.note }; order.push(g.name); }
      map[g.name].num += (g.num || 0);
      if (!map[g.name].note && g.note) map[g.name].note = g.note;
    });
    openGain(title || '所得', order.map(function (k) { return map[k]; }), { tail: tail });
    return true;
  }
  /* 面板里已经有东西开着，就别再顶掉它 */
  function modalBusy() {
    const m = document.getElementById('modals');
    return !!(m && m.innerHTML.trim());
  }

  /* 收支记账 */
  function ledgerAdd(kind, label, amount) {
    S.ledger = S.ledger || { income: [], expense: [] };
    const arr = kind === 'in' ? S.ledger.income : S.ledger.expense;
    arr.push({ label: label, amount: amount });
  }

  /* ---------- 四艺面板 ---------- */
  ACT.openCraft = () => {
    const arts = D.CRAFT_ARTS;
    let b = '<div class="small">四艺是手段，不是身份。谁都能学，学几样都行。</div>';
    b += '<div class="muted small" style="margin:4px 0">唯一的硬约束：每次制作占一旬，与打坐采气互斥。</div>' + divider();
    b += '<div class="craftgrid">';
    arts.forEach(function (a) {
      const learned = (S.learnedArts || []).indexOf(a.id) >= 0;
      const xp = (S.craft || {})[a.id] || 0;
      const lv = (S.craftLv || {})[a.id] || 1;
      const next = D.CRAFT_LEVELS[clamp(lv, 0, D.CRAFT_LEVELS.length - 1)];
      b += '<div class="craftcard' + (learned ? '' : ' locked') + '" data-act="' +
        (learned ? 'do;craftart:' + a.id : 'act:openCraftBook') + '">' +
        '<div class="cn">' + esc(a.name) + '</div>' +
        '<div class="cl">' + (learned ? (lv + ' 品') : '未学') + '</div>' +
        '<div class="cx">' + (learned ? ('熟练 ' + fmtNum(xp) + ' / ' + fmtNum(next.need)) : esc(a.desc)) + '</div>' +
        '</div>';
    });
    b += '</div>';
    b += divider();
    b += '<div class="small muted">顺序：<b>攒料 → 学技艺（带配方）→ 制作 → 卖出</b>。料从采集／坊市／宗门任务来。</div>';
    b += '<ul class="opts" style="margin-top:6px">';
    b += optRow('A', '采集材料', { name: '占一旬', cls: 'peace' }, '不花灵石 · 看境界', false, 'act:openGather');
    b += optRow('B', '学技艺（买技艺书）', { name: '平和', cls: 'peace' }, '黄阶 200 石起', false, 'act:openCraftBook');
    b += optRow('C', '看配方 · 制作', { name: '平和', cls: 'peace' }, '已掌握 ' + (S.learnedRecipes || []).length + ' 张 · 库存 ' + bagMatText(), false, 'act:openRecipeBook');
    b += optRow('D', '材料库存', { name: '平和', cls: 'peace' }, bagMatText(), false, 'act:openBagMat');
    b += '<span class="chip" data-act="act:openShop" style="margin-top:4px">去坊市买料</span>';
    b += '</ul>';
    b += '<div class="hint">不爱做生意的可以自用（省下的就是赚的），想赚钱的可以外卖，爱打架的当手段——三条线同时成立。</div>';
    openModal('四艺 · 手段', b);
  };

  function bagMatText() {
    const keys = Object.keys(S.bagMat || {}).filter(function (k) { return (S.bagMat[k] || 0) > 0; });
    if (!keys.length) return '空';
    return keys.length + ' 种';
  }

  ACT.openCraftBook = () => {
    let b = '<div class="small">技艺书决定你能学哪门四艺。坊市有黄阶，宗门/家族有高阶。</div>' + divider();
    b += '<ul class="opts">';
    D.CRAFT_BOOKS.forEach(function (bk) {
      const learned = (S.learnedArts || []).indexOf(bk.art) >= 0;
      const curTier = craftTierOf(bk.art);
      const better = tierIdx(bk.tier) > tierIdx(curTier);
      b += optRow('·', bk.name + '（' + artName(bk.art) + '·' + D.GONGFA_TIERS[bk.tier].name + '）',
        { name: artName(bk.art), cls: 'peace' },
        learned && !better ? '已学' : fmtNum(bk.price) + ' 石',
        (learned && !better) || S.stones < bk.price, 'do;learnart:' + bk.id);
    });
    b += '</ul>';
    b += '<div class="hint">学了就能做该品阶的配方；更高品阶的材料要更高的境界才碰得动。</div>';
    openModal('技艺书', b);
  };

  ACT.do_learnart = (id) => {
    const bk = D.CRAFT_BOOKS.find(function (x) { return x.id === id; });
    if (!bk) return;
    if (S.stones < bk.price) { toast('灵石不足'); return; }
    S.stones -= bk.price;
    ledgerAdd('out', '购 ' + bk.name, bk.price);
    if ((S.learnedArts || []).indexOf(bk.art) < 0) S.learnedArts.push(bk.art);
    // 该品的配方一并学会
    D.RECIPES.filter(function (r) {
      return r.kind === bk.art && tierIdx(r.tier) <= tierIdx(bk.tier);
    }).forEach(function (r) {
      if (S.learnedRecipes.indexOf(r.id) < 0) S.learnedRecipes.push(r.id);
    });
    logLine('学会' + artName(bk.art) + '（' + D.GONGFA_TIERS[bk.tier].name + '）。', 'good');
    toast('习得 ' + artName(bk.art));
    advanceXun(1); if (S.phase !== 'play') return render();
    closeModal(); render();
    const got = D.RECIPES.filter(function (r) {
      return r.kind === bk.art && tierIdx(r.tier) <= tierIdx(bk.tier);
    });
    openGain('习得 · ' + artName(bk.art) + '（' + D.GONGFA_TIERS[bk.tier].name + '）',
      got.map(function (r) { return { name: outNameOf(r), num: 0, note: (r.mats ? Object.keys(r.mats).length : 0) + ' 种料' }; }),
      { note: '这些配方已进「看配方」。缺料会标红并告诉你去哪弄。', tail: '技艺品级由熟练度累积提升：每做一次 +5~12，满 100 升 2 品。' });
  };

  function pct(v) { return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  /* 成功率拆解：玩家得看得见「为什么是 78%」，否则数字就是玄学 */
  function craftRateParts(art, recipe) {
    const lv = clamp(parseInt((S.craftLv || {})[art], 10) || 1, 1, D.CRAFT_LEVELS.length);
    const a = D.CRAFT_ARTS.find(function (x) { return x.id === art; });
    const lvB = D.CRAFT_LEVELS[lv - 1].rate;
    const stB = a ? (st(a.stat) - 10) * 0.012 : 0;
    let hpB = 0;
    if (hpRatio() < 0.33) hpB = -0.12;
    else if (hpRatio() < 0.66) hpB = -0.05;
    const facB = (S.cave && S.cave.facilities && S.cave.facilities[art]) ? 0.05 : 0;
    return {
      base: recipe.base, lv: lvB, stat: stB, hp: hpB, fac: facB,
      total: clamp(recipe.base + lvB + stB + hpB + facB, 0.15, 0.95)
    };
  }
  /* 一张配方卡：叫什么、要什么料（够/缺）、成功率、产多少、值多少钱 */
  function recipeCard(r) {
    const m = matsOf(r);
    const lvNeed = D.CRAFT_LEVELS[clamp((r.lv || 1) - 1, 0, D.CRAFT_LEVELS.length - 1)];
    const can = canCraftTier(r.kind, r.tier, r.lv);
    let lack = 0;
    const matLine = Object.keys(m).map(function (k) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
      const have = S.bagMat[k] || 0;
      const ok = have >= m[k];
      if (!ok) lack++;
      return '<span class="' + (ok ? 'hok' : 'hno') + '">' + esc(it ? it.name : k) + ' ' + m[k] +
        '<i>有' + have + '</i></span>';
    }).join('');
    const cost = matCostOf(r);
    /* v10.3 P0：报价与结算同源。面板给「中品回收价」（坊市基准），
       按产出份数算总回收，净利就是玩家真能拿到的数字。 */
    const unitBack = Math.max(1, Math.round(craftedValueOf(r) * RECOVER_BASE));
    const totalBack = unitBack * (r.need || 1);
    const rate = craftRateOf(r.kind, r);
    const lock = !can || lack > 0;
    let b = '<div class="rrow' + (lock ? ' lock' : '') + '" data-act="' +
      (lock ? 'do;craftwhy:' + r.id : 'do;craftpick:' + r.id) + '">';
    b += '<div class="rt">' + esc(outNameOf(r)) +
      '<span class="rtag">' + artName(r.kind) + '·' + D.GONGFA_TIERS[r.tier].name + '　需技艺 ' + lvNeed.lv + ' 品</span></div>';
    b += '<div class="rm">' + matLine + '</div>';
    b += '<div class="rs">成功率 ' + Math.round(rate * 100) + '%　产 ' + r.need + ' 份　料 ' +
      fmtNum(cost) + ' 石 → 中品回收 ' + fmtNum(unitBack) + ' 石/份（共 ' + fmtNum(totalBack) +
      '，净 ' + fmtNum(totalBack - cost) + '）</div>';
    if (!can) b += '<div class="rs hno">做不了：需 ' + D.GONGFA_TIERS[r.tier].name + ' 技艺，且境界到' +
      (D.XIAN_REALMS[D.CRAFT_REALM_GATE[r.tier] || 0] || { name: '炼气' }).name + '</div>';
    b += '</div>';
    return b;
  }
  ACT.openRecipeBook = () => {
    const mine = S.learnedRecipes || [];
    let b = '<div class="small">已掌握 <b>' + mine.length + '</b> 张配方。点一条看要什么料；缺料会告诉你去哪弄。</div>' + divider();
    if (!mine.length) {
      b += '<div class="small muted">一张也没有。先「学技艺」买一本技艺书——黄阶 200 石，学完自带该阶全部配方。</div>';
      b += '<ul class="opts" style="margin-top:8px">' +
        optRow('A', '去学技艺', { name: '平和', cls: 'peace' }, '200 石起', false, 'act:openCraftBook') +
        optRow('B', '先去采集攒料', { name: '占一旬', cls: 'peace' }, '', false, 'act:openGather') + '</ul>';
      return openModal('配方 · 制作', b);
    }
    ['dan', 'fu', 'qi', 'zhen'].forEach(function (a) {
      const list = D.RECIPES.filter(function (r) { return r.kind === a && mine.indexOf(r.id) >= 0; });
      if (!list.length) return;
      b += '<div class="sechead">' + artName(a) + '　' + list.length + ' 张</div>';
      list.forEach(function (r) { b += recipeCard(r); });
    });
    b += '<div class="hint">料从四处来：采集（自己找）／坊市「材料」页（买）／宗门任务（换）／家族产业（种）。</div>';
    openModal('配方 · 制作', b);
  };
  /* 缺料/品阶不够时，说清楚缺什么、去哪弄 */
  ACT.do_craftwhy = (id) => {
    const r = D.RECIPES.find(function (x) { return x.id === id; });
    if (!r) return;
    const m = matsOf(r);
    let b = '';
    if (!canCraftTier(r.kind, r.tier, r.lv)) {
      const needLv = D.CRAFT_LEVELS.findIndex(function (x) { return x.tier === r.tier; }) + 1;
      const needRealm = (D.XIAN_REALMS[D.CRAFT_REALM_GATE[r.tier] || 0] || { name: '炼气' }).name;
      b += '<div class="small danger">品阶不够：这张是' + D.GONGFA_TIERS[r.tier].name + '配方，需要技艺到 <b>' +
        (needLv > 0 ? needLv : 1) + ' 品</b>，且境界到 <b>' + needRealm + '</b>。现在 ' +
        artName(r.kind) + ' ' + ((S.craftLv || {})[r.kind] || 1) + ' 品 · ' + realmName() + '。</div>';
    }
    b += '<div class="small" style="margin:6px 0 4px">还缺这些料：</div><ul class="gainlist">';
    Object.keys(m).forEach(function (k) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
      const have = S.bagMat[k] || 0;
      const need = m[k];
      b += '<li><span class="gn">' + esc(it ? it.name : k) + '</span>' +
        '<span class="gx ' + (have >= need ? '' : 'hno') + '">' +
        (have >= need ? '够 ' + have + '/' + need : '缺 ' + (need - have) + ' 份（有 ' + have + '）') + '</span>' +
        '<span class="gd">' + esc(it ? it.eff : '') + '</span></li>';
    });
    b += '</ul>';
    b += '<div class="small" style="margin-top:8px">去哪弄：</div>';
    b += '<div class="small muted">· <b>采集</b>：占一旬，不花灵石，按境界出料<br>' +
      '· <b>坊市</b>：材料页直接买，几十到上千石<br>' +
      '· <b>宗门任务</b>：采药/守炉/巡山/猎妖/镇守，做完给料<br>' +
      '· <b>家族</b>：有产业时每月出料</div>';
    b += '<ul class="opts" style="margin-top:10px">' +
      optRow('A', '去采集', { name: '占一旬', cls: 'peace' }, '', false, 'act:openGather') +
      optRow('B', '去坊市买', { name: '灵石', cls: 'chance' }, '', false, 'act:openShop') + '</ul>';
    openModal('缺料 · ' + esc(outNameOf(r)), b);
  };

  /* ---------- 采集：四艺的零门槛料源 ----------
     没有这个，散修（不入宗门就没有任务给料）一点材料都拿不到，
     四艺在散修手里等于不存在。三个方向各有偏重，占一旬。 */
  const GATHER_SPOTS = [
    { id: 'herb', name: '山野采药', want: '草木 · 炼丹主材',
      pool: ['buqiCao', 'lanyouCao', 'heshenHua', 'gulingHua', 'yuhuaYu'] },
    { id: 'sand', name: '溪畔掘砂', want: '符材 · 制符必需',
      pool: ['fuZhi', 'zhuSha', 'jinLing', 'huanShi'] },
    { id: 'mine', name: '废弃矿洞', want: '器料 · 炼器阵材',
      pool: ['tieMu', 'longYan', 'starSand', 'huanShi'] }
  ];
  /* 这个境界能碰的料（品阶由 CRAFT_REALM_GATE 决定） */
  function gatherPoolOf(sp) {
    return sp.pool.filter(function (mid) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === mid; });
      if (!it) return false;
      return S.xRealm >= (D.CRAFT_REALM_GATE[it.tier] || 0);
    });
  }
  ACT.openGather = () => {
    let b = '<div class="small">采集<b>占一旬</b>，不花灵石。境界越高能找的东西越好，灵气越足出稀有的概率越高。</div>';
    b += '<div class="small muted" style="margin-top:4px">当前：' + esc(curPlace()) + ' · 灵气 ' + D.LINGQI[S.lingqi].name + '</div>' + divider();
    b += '<ul class="opts">';
    GATHER_SPOTS.forEach(function (sp) {
      const pool = gatherPoolOf(sp);
      const names = pool.map(function (mid) {
        const it = D.MATERIAL_EXT.find(function (x) { return x.id === mid; });
        return it ? it.name : mid;
      });
      b += optRow('·', sp.name, { name: sp.want, cls: 'peace' },
        pool.length ? (Math.min(2, pool.length) + '~' + Math.min(4, pool.length) + ' 份 · 可能出 ' + names.slice(0, 3).join('/')) : '此境采不到',
        !pool.length, 'do;gather:' + sp.id);
    });
    b += '</ul>';
    b += '<div class="hint">采到的东西会直接入库存，制作时点配方就能看见够不够。</div>';
    openModal('采集 · 占一旬', b);
  };
  ACT.do_gather = (spot) => {
    const sp = GATHER_SPOTS.find(function (x) { return x.id === spot; });
    if (!sp) return;
    closeModal();
    advanceXun(1);
    if (S.phase !== 'play') return render();
    const pool = gatherPoolOf(sp);
    if (!pool.length) { toast('此境采不到东西'); return render(); }
    const n = 2 + rnd(2) + (st('sense') >= 15 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      addMat(pool[rnd(pool.length) - 1], 1);
    }
    // 稀有一份：境界与灵气都加成
    const rareOdds = 0.10 + S.xRealm * 0.05 + (S.lingqi || 0) * 0.04;
    if (rng() < rareOdds && pool.length > 1) {
      const top = pool[pool.length - 1];
      addMat(top, 1);
    }
    logLine('进山' + sp.name.replace('山野', '').replace('溪畔', '').replace('废弃', '') + '一趟，收获见下。', '');
    maybeEvent();
    render();
    if (!modalBusy()) {
      flushGain('采集所得', '采集占去一旬。料在「四艺 → 材料库存」里，做东西时点配方就能看见够不够。');
    }
  };

  /* ---------- 道书：同一部书，不同境界读出不同东西 ---------- */
  function bookReadCount(id) { return (S.bookRead || {})[id] || 0; }
  function bookLayerOk(layer) {
    const nd = layer.need || {};
    /* v10.6：「悟性够 或 道心够」这种门槛，旧 need 表达不了——它只能全要。
       写成 or:[{insight:14},{heart:15}]，任一组成立即通行。 */
    if (nd.or) {
      return nd.or.some(function (alt) {
        return Object.keys(alt).every(function (k) {
          if (k === 'insight') return st('insight') >= alt[k];
          if (k === 'heart') return st('heart') >= alt[k];
          if (k === 'realm') return S.xRealm >= alt[k];
          if (k === 'pillar') return (S.pillar || 0) >= alt[k];
          return true;
        });
      });
    }
    if (nd.insight && st('insight') < nd.insight) return false;
    if (nd.heart && st('heart') < nd.heart) return false;
    if (nd.realm && S.xRealm < nd.realm) return false;
    /* 神道道书按柱位开门。旧版只有悟性/道心/境界三种门槛，
       邪注本这种「读到第几柱才看得懂」的书就没法写。 */
    if (nd.pillar && (S.pillar || 0) < nd.pillar) return false;
    return true;
  }
  ACT.openDaoshu = () => {
    const owned = (S.books || []);
    let b = '<div class="small">道书不是读一遍加属性——同一本书，读得懂多少，看你自己。</div>' + divider();
    if (owned.length) {
      b += '<ul class="opts">';
      owned.forEach(function (id) {
        const bk = (D.DAOSHU || []).find(function (x) { return x.id === id; });
        if (!bk) return;
        const rc = bookReadCount(id);
        b += optRow('读', bk.name, { name: '第 ' + Math.min(rc + 1, bk.layers.length) + ' 读', cls: 'chance' },
          rc >= bk.layers.length ? '已读尽' : (bk.layers[rc] ? bk.layers[rc].needText : ''),
          rc >= bk.layers.length, 'do;readbook:' + id);
      });
      b += '</ul>';
    } else b += '<div class="small muted">还没得到任何道书。坊市有卖的，奇遇里也捡得到。</div>';
    /* 道书按道途分架：邪注本讲的是香火与神位，摆在仙道修士的坊市里不合情理。 */
    const available = (D.DAOSHU || []).filter(function (bk) {
      if (owned.indexOf(bk.id) >= 0) return false;
      if (bk.path === 'shen') return isShen() || isBoth();
      if (bk.path === 'xian') return isXian() || isBoth();
      return true;
    });
    if (available.length) {
      b += divider() + '<div class="small muted">可购道书</div><ul class="opts">';
      available.forEach(function (bk) {
        b += optRow('购', bk.name, { name: '道书', cls: 'chance' }, fmtNum(bk.price) + ' 石',
          S.stones < bk.price, 'do;buybook:' + bk.id);
      });
      b += '</ul>';
    }
    b += '<div class="hint">第一次读只是故事。要读出别的东西，得有那个本事。</div>';
    openModal('道书', b);
  };

  ACT.do_buybook = (id) => {
    const bk = (D.DAOSHU || []).find(function (x) { return x.id === id; });
    if (!bk) return;
    S.books = S.books || [];
    if (S.books.indexOf(id) >= 0) { toast('此书已在架上'); return; }
    if (S.stones < bk.price) { toast('灵石不足'); return; }
    S.stones -= bk.price;
    ledgerAdd('out', '购 ' + bk.name, bk.price);
    S.books.push(id);
    logLine('购得 ' + bk.name + '。', 'good');
    closeModal(); render();
  };

  ACT.do_readbook = (id) => {
    const bk = (D.DAOSHU || []).find(function (x) { return x.id === id; });
    if (!bk) return;
    const rc = bookReadCount(id);
    if (rc >= bk.layers.length) { toast('已经读尽了'); return; }
    const layer = bk.layers[rc];
    S.bookRead = S.bookRead || {};
    if (!bookLayerOk(layer)) {
      // 读不出这一层：不消耗次数，只是读不明白
      let b = '<div class="npcline">你把这一页翻来覆去看了几遍，什么也没看出来。</div>';
      b += '<div class="small muted" style="margin-top:8px">需要：' + esc(layer.needText) + '</div>';
      b += '<div style="margin-top:10px"><button class="btn ghost" data-act="modal:close">合上书</button></div>';
      openModal('读不出 · ' + bk.name, b);
      return;
    }
    S.bookRead[id] = rc + 1;
    /* 读一层道书占一旬。旧版读书不花时间，于是一本道书可以在同一个月里
       从头读到尾——「参悟」这件事就没有重量了。 */
    advanceXun(1);
    if (S.phase !== 'play') { render(); return; }
    // 应用收益
    const gain = layer.gain || '';
    /* 收益兑现：文本里写什么，账上就得有什么。
       旧版只认「道心 +N」和「阅历」，其余全是空话——
       写着「悟性 +1」「寿元 +20」却什么都不发生，那本书就是骗人的。 */
    const heartGain = gain.match(/道心\s*\+\s*(\d+)/);
    if (heartGain) S.stats.heart = clamp(S.stats.heart + parseInt(heartGain[1], 10), 1, 20);
    const insGain = gain.match(/悟性\s*\+\s*(\d+)/);
    if (insGain) S.stats.insight = clamp(S.stats.insight + parseInt(insGain[1], 10), 1, 20);
    const qualGain = gain.match(/资质\s*\+\s*(\d+)/);
    if (qualGain) S.stats.qualify = clamp(S.stats.qualify + parseInt(qualGain[1], 10), 1, 20);
    const lifeGain = gain.match(/寿元\s*\+\s*(\d+)/);
    if (lifeGain) S.lifeMax = (S.lifeMax || 0) + parseInt(lifeGain[1], 10);
    const xiuGain = gain.match(/修为\s*\+\s*(\d+)/);
    if (xiuGain) gainXiuwei(parseInt(xiuGain[1], 10));
    if (/阅历/.test(gain)) S.insightXp = (S.insightXp || 0) + 1 + fateAdd('book');   // v9.0 M1：负薪问道
    /* v10.6：有些真意不是数值，是一次改判或一条伏笔。
       写在 fx 里，读的时候一并兑现——gain 那句话才有下文。 */
    const fx = layer.fx || {};
    if (fx.breakBonus) S.breakBonus = (S.breakBonus || 0) + fx.breakBonus;
    if (fx.hook) pushHook(fx.hook);
    logLine('读 ' + bk.name + ' 第 ' + (rc + 1) + ' 层：' + gain, 'good');
    /* v9.0 M4：读到第二层起，书里可能夹着一条上古遗迹的方位。 */
    const _XBK = G.WXCS3_EXT;
    if (_XBK && _XBK.onBookRead) _XBK.onBookRead(bk, rc);
    let b = '<div class="daoshu">';
    b += '<div class="ds-head">' + esc(bk.name) + '　<span class="muted small">第 ' + (rc + 1) + ' 读</span></div>';
    b += '<div class="ds-text">' + esc(layer.text).replace(/\n/g, '<br>') + '</div>';
    b += '<div class="ds-gain">' + esc(gain) + '</div>';
    if (fx.breakBonus) b += '<div class="ds-gain">下次破境 +' + Math.round(fx.breakBonus * 100) + '%</div>';
    if (fx.hook) b += '<div class="ds-gain">此事未了（记入人情）</div>';
    b += '</div>';
    const nextLayer = bk.layers[rc + 1];
    if (nextLayer) b += '<div class="small muted" style="margin-top:8px">再读下去需要：' + esc(nextLayer.needText) + '</div>';
    b += '<div style="margin-top:10px"><button class="btn" data-act="modal:close">合上书</button></div>';
    openModal('道书 · ' + bk.name, b);
    render();
  };
  ACT.openBagMat = () => {
    const keys = Object.keys(S.bagMat || {}).filter(function (k) { return (S.bagMat[k] || 0) > 0; });
    let b = '';
    if (!keys.length) {
      b += '<div class="small muted">库中无料。三条路：<b>采集</b>（不花灵石）、<b>坊市买</b>、<b>宗门任务换</b>。</div>';
      b += '<ul class="opts" style="margin-top:8px">' +
        optRow('A', '去采集', { name: '占一旬', cls: 'peace' }, '', false, 'act:openGather') +
        optRow('B', '去坊市买料', { name: '灵石', cls: 'chance' }, '', false, 'act:openShop') +
        '</ul>';
      return openModal('材料库存', b);
    }
    b += '<div class="small">共 <b>' + keys.length + '</b> 种。点开看用途——卖掉的地方在详情里，免得误触。</div>' + divider();
    b += '<ul class="opts">';
    keys.forEach(function (k) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
      const used = matUsedBy(k);
      b += optRow('·', (it ? it.name : k), { name: it ? D.GONGFA_TIERS[it.tier].name : '材料', cls: 'peace' },
        '×' + S.bagMat[k] + ' · 值 ' + fmtNum(it ? it.price : 0) +
        (used.length ? ' · 用于' + used.slice(0, 2).join('/') + (used.length > 2 ? '等' : '') : ' · 暂无配方用'),
        false, 'do;matinfo:' + k);
    });
    b += '</ul>';
    b += '<div class="hint">旧版这里是「点一下直接卖一份」，很容易把要用的料卖掉。</div>';
    openModal('材料库存', b);
  };
  ACT.do_matinfo = (k) => {
    const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
    const have = S.bagMat[k] || 0;
    if (!have) { toast('没有此物'); return; }
    const used = matUsedBy(k);
    let b = '';
    b += '<ul class="gainlist">';
    b += '<li><span class="gn">' + esc(it ? it.name : k) + '</span><span class="gx">×' + have + '</span>' +
      '<span class="gd">' + (it ? D.GONGFA_TIERS[it.tier].name + ' · 单价 ' + fmtNum(it.price) + ' 石' : '') + '</span></li>';
    b += '</ul>';
    if (it && it.eff) b += '<div class="small" style="margin:6px 0">' + esc(it.eff) + '</div>';
    b += '<div class="small muted">用于配方：' + (used.length ? used.join('、') : '暂无') + '</div>';
    b += '<ul class="opts" style="margin-top:10px">';
    b += optRow('A', '卖一份', { name: '灵石', cls: 'chance' },
      '+' + fmtNum(it ? sellPriceOf(it.price, sellMul().mat || 1) : 0) + ' 石（' + esc(sellCh().name) + '收价）', false, 'do;sellmat:' + k);
    b += optRow('B', '看配方', { name: '平和', cls: 'peace' }, '', false, 'act:openRecipeBook');
    b += optRow('C', '去采集', { name: '占一旬', cls: 'peace' }, '', false, 'act:openGather');
    b += '</ul>';
    openModal('材料 · ' + esc(it ? it.name : k), b);
  };

  /* ---------- 制作主流程 ---------- */
  ACT.do_craftart = (art) => { ACT.openRecipeBook(); };

  ACT.do_craftpick = (id) => {
    const r = D.RECIPES.find(function (x) { return x.id === id; });
    if (!r) return;
    if (!hasMats(r)) { toast('材料不足'); return; }
    openCraftRun(r);
  };

  /* 制作面板：把「花什么、成什么、多少把握、能卖多少」一次说完 */
  function openCraftRun(r) {
    const p = craftRateParts(r.kind, r);
    const m = matsOf(r);
    const cost = matCostOf(r);
    const sale = Math.max(1, Math.round(craftedValueOf(r) * RECOVER_BASE));
    const totalSale = sale * (r.need || 1);
    const a = D.CRAFT_ARTS.find(function (x) { return x.id === r.kind; });
    const statName = { insight: '悟性', qualify: '资质', sense: '神识' }[a ? a.stat : 'insight'] || '悟性';

    let b = '<div class="small">' + artName(r.kind) + ' · ' + D.GONGFA_TIERS[r.tier].name +
      '　产出 <b>' + r.need + ' 份</b>「' + esc(outNameOf(r)) + '」</div>' + divider();

    b += '<div class="small muted" style="margin-bottom:3px">消耗（点开始即扣，成败都不还）</div>';
    b += '<ul class="gainlist">';
    Object.keys(m).forEach(function (k) {
      const it = D.MATERIAL_EXT.find(function (x) { return x.id === k; });
      const have = S.bagMat[k] || 0;
      b += '<li><span class="gn">' + esc(it ? it.name : k) + '</span>' +
        '<span class="gx">×' + m[k] + '</span>' +
        '<span class="gd">库存 ' + have + (have >= m[k] ? ' · 够' : ' · 缺') + '</span></li>';
    });
    b += '</ul>';

    b += '<div class="small" style="margin:8px 0 3px">成功率 <b style="color:' +
      (p.total > 0.7 ? 'var(--merit)' : 'var(--cinnabar)') + ';font-size:15px">' +
      Math.round(p.total * 100) + '%</b></div>';
    b += '<div class="small muted">配方基 ' + Math.round(p.base * 100) + '%　技艺 ' + pct(p.lv) +
      '　' + statName + ' ' + pct(p.stat) +
      (p.hp ? '　伤势 ' + pct(p.hp) : '') + (p.fac ? '　设施 ' + pct(p.fac) : '') + '</div>';

    b += '<div class="small" style="margin:8px 0 3px">成器后的品相（决定售价）</div>';
    b += '<div class="qbar">' + D.QUALITY.map(function (q) {
      return '<span style="flex:' + q.rate + ';color:' + q.color + '">' + q.name +
        (q.mul ? ' ×' + q.mul : '') + '</span>';
    }).join('') + '</div>';
    b += '<div class="small muted" style="margin-top:5px">料钱 ' + fmtNum(cost) + ' 石　中品回收 ' +
      fmtNum(sale) + ' 石/份 ×' + r.need + '　净利约 ' + fmtNum(totalSale - cost) + ' 石</div>';

    b += divider();
    b += '<div class="small muted">选一种火候。<b>无论成败都占一旬</b>，这一旬不能打坐。</div>';
    const wWen = clamp(p.total + 0.15, 0.10, 0.98);
    const wWu = clamp(p.total - 0.10, 0.10, 0.98);
    b += '<ul class="opts">';
    b += optRow('A', '文火慢炼', { name: '稳', cls: 'peace' },
      Math.round(wWen * 100) + '% · 品相不变', false, 'do;craftgo:' + r.id + ':wen');
    b += optRow('B', '武火猛攻', { name: '贪', cls: 'risk' },
      Math.round(wWu * 100) + '% · 上品/极品概率翻倍 · 炸炉更狠', false, 'do;craftgo:' + r.id + ':wu');
    b += optRow('C', '稳守中火', { name: '常', cls: 'peace' },
      Math.round(p.total * 100) + '% · 不赚不亏', false, 'do;craftgo:' + r.id + ':zhong');
    b += '</ul>';
    if (r.note) b += '<div class="hint">' + esc(r.note) + '</div>';
    openModal('制作 · ' + esc(outNameOf(r)), b);
  }

  ACT.do_craftgo = (id, mode) => {
    const r = D.RECIPES.find(function (x) { return x.id === id; });
    if (!r) return;
    if ((S.learnedRecipes || []).indexOf(id) < 0) { toast('尚未学会这张配方'); return; }
    if (!canCraftTier(r.kind, r.tier, r.lv)) { toast('技艺或境界不足'); return; }
    closeModal();
    if (!hasMats(r)) { toast('材料不足'); return; }
    // 扣料
    const m = matsOf(r);
    for (const k in m) { S.bagMat[k] -= m[k]; }
    // 成功率修正
    let rate = craftRateOf(r.kind, r);
    let qBonus = 0;
    if (mode === 'wen') rate += 0.15;
    else if (mode === 'wu') { rate -= 0.10; qBonus += 0.25; }
    rate = clamp(rate, 0.10, 0.98);
    // 成器判定
    const q = qualityRoll(rate, qBonus);
    const ok = q.mul > 0;
    S.dishes[r.kind] = (S.dishes[r.kind] || 0) + 1;
    addCraftXP(r.kind, ok ? 12 : 5);
    let msg = '', cls = '';
    if (!ok) {
      // 废品：回收 20% 残料
      for (const k in m) {
        const back = Math.max(1, Math.round(m[k] * 0.2));
        addMat(k, back);
      }
      if (r.risk === 'explode' && rng() < 0.5) {
        S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.2));
        S.stats.heart = Math.max(1, S.stats.heart - 1);
        S.heartDebuff = 3;
        msg = '炸炉了。材料全损，气血逆冲，道心 −1（三月不愈）。';
        cls = 'danger';
      } else {
        msg = '这一炉废了。剩一点残料还能用。';
        cls = 'danger';
      }
    } else {
      const ot = D.GONGFA_TIERS[r.tier] ? D.GONGFA_TIERS[r.tier].name : '';
      if (r.kind === 'fu') {
        addTalisman(r.out, r.need);
        msg = '成符 ' + r.need + ' 张（' + q.name + '·' + ot + '）。';
        queueGain(outNameOf(r) + '（' + q.name + '）', r.need, '符箓 · 战斗中用', true);
      } else if (r.kind === 'zhen') {
        S.disks = S.disks || [];
        S.disks.push({ id: r.out, q: q.id, name: outNameOf(r) });
        msg = '阵盘成了（' + q.name + '）。可在洞府布下。';
        queueGain(outNameOf(r) + '（' + q.name + '）', 1, '阵盘 · 洞府布下', true);
      } else if (r.kind === 'qi') {
        S.arts = S.arts || [];
        S.arts.push(r.out);
        msg = '炼成「' + outNameOf(r) + '」（' + q.name + '·' + ot + '）。';
        queueGain(outNameOf(r) + '（' + q.name + '）', 1, '法宝 · 记得佩戴才生效', true);
      } else {
        if (!S.bag) S.bag = {};
        S.bag[r.out] = (S.bag[r.out] || 0) + r.need;
        msg = '成丹 ' + r.need + ' 枚（' + q.name + '·' + ot + '）。';
        queueGain(outNameOf(r) + '（' + q.name + '）', r.need, '丹药 · 背包里可用', true);
      }
      if (r.kind !== 'zhen') addQuality(r.out, q.id, r.need);
      cls = 'good';
    }
    logLine(msg, cls);
    toast(ok ? '成器' : '毁弃');
    // v6.6：四艺记账（成败都计炉数，只有成功的才计品相）
    bump('craft');
    if (ok) {
      if (q.id === 'zhong') bump('qZhong');
      else if (q.id === 'shang') bump('qShang');
      else if (q.id === 'ji') bump('qJi');
    }
    advanceXun(1);
    if (S.phase !== 'play') return render();
    maybeEvent();
    render();
    // 这一炉出了什么，得让玩家看见；但如果奇遇已经弹了，就不顶掉它
    if (!modalBusy()) {
      flushGain(ok ? ('炼制所得 · ' + q.name) : '这一炉废了',
        ok ? '卖出去找「坊市 → 卖出」。自用则直接生效。'
           : '剩下的残料已回库。武火更容易炸炉，文火更稳。', true);
    }
  };

  /* ---------- 坊市卖出 ---------- */
  function addQuality(id, qid, n) {
    if (!S.craftedQ || typeof S.craftedQ !== 'object') S.craftedQ = {};
    if (!Array.isArray(S.craftedQ[id])) S.craftedQ[id] = [];
    const row = S.craftedQ[id].find(function (x) { return x.q === qid; });
    if (row) row.n += n; else S.craftedQ[id].push({ q: qid, n: n });
  }
  function qualityRows(id, total) {
    const rows = ((S.craftedQ || {})[id] || []).filter(function (x) { return x.n > 0; });
    let made = rows.reduce(function (a, x) { return a + x.n; }, 0);
    // 普通服用/消耗也扣总库存；若没逐次指定品相，先从未售记录中同步掉多余数量。
    while (made > total && rows.length) {
      const r = rows[0], cut = Math.min(r.n, made - total);
      r.n -= cut; made -= cut;
      if (r.n <= 0) rows.shift();
    }
    if (S.craftedQ && Array.isArray(S.craftedQ[id])) S.craftedQ[id] = rows;
    const out = rows.map(function (r) { return { q: r.q, n: r.n, made: true }; });
    if (total - made > 0) out.push({ q: 'zhong', n: total - made, made: false });
    return out;
  }
  function consumeQuality(id, qid) {
    const rows = ((S.craftedQ || {})[id] || []);
    if (!rows.length) return false;
    const r = qid ? rows.find(function (x) { return x.q === qid && x.n > 0; }) : rows.find(function (x) { return x.n > 0; });
    if (!r) return false;
    r.n--;
    return true;
  }
  /* ============================================================
     v8.0 拍卖会 —— 独立玩法，不再只是「卖出渠道里的一个倍率」
     ------------------------------------------------------------
     流程：寄售（定底价）→ 开拍 → NPC 举牌 → 成交/流拍 → 抽一成。
     同场另设一件「客籍拍品」，玩家可密封竞价，灵石在这一场里既进也出。
     一年只办一场（year % 3 === 0），一场一人只能进场一次——
     否则反复「开拍」就成了一次次白拿 1.4 倍价的无风险套利。
     ============================================================ */
  const AUC_LOTS = [
    { id: 'lot_jade', name: '残玉一匣', base: 600, eff: '悟性 +1',
      apply: function () { S.stats.qualify = Math.min(20, st('qualify') + 1); },
      desc: '匣中二十一枚碎玉，边缘皆有云纹，像从同一件器物上崩下来的。' },
    { id: 'lot_bone', name: '无名兽骨', base: 900, eff: '气血上限 +20',
      apply: function () { S.hpFlatBonus = (S.hpFlatBonus || 0) + 20; recalcCaps(true); S.hp = Math.min(S.hpMax, S.hp + 20); },
      desc: '三尺长，骨上有旧伤，摸上去还是温的。' },
    { id: 'lot_map', name: '半卷残图', base: 1400, eff: '机缘 +1',
      apply: function () { S.stats.fate = Math.min(20, st('fate') + 1); },
      desc: '只剩半幅，画的是水，水里有山。' },
    { id: 'lot_bell', name: '旧铜小钟', base: 2000, eff: '道心 +1',
      apply: function () { S.stats.heart = Math.min(20, st('heart') + 1); },
      desc: '钟身没有铭文，摇之无声，贴上耳朵才听见一点。' }
  ];
  const AUC_FLOOR = { low: { n: '保守', mul: 0.9 }, mid: { n: '常价', mul: 1.2 }, high: { n: '高价', mul: 1.6 } };

  function aucNextYear() { return S.year + (3 - S.year % 3); }
  function aucFloorMul() { return (AUC_FLOOR[S.aucFloor] || AUC_FLOOR.mid).mul; }
  function aucUsed() { return S.aucYear === S.year; }

  /* 寄售候选：只收单价 100 石以上的东西——拍卖会上没人争一把价值 8 石的香灰。 */
  function aucCandidates() {
    const out = [];
    const seen = {};
    function push(kind, id, base, name) {
      if (!id || seen[kind + id] || base < 100) return;
      let n = 0;
      if (kind === 'dan') n = (S.bag || {})[id] || 0;
      else if (kind === 'tal') n = (S.talismans || {})[id] || 0;
      else n = (S.arts || []).filter(function (x) { return x === id; }).length;
      if (n < 1) return;
      seen[kind + id] = 1;
      qualityRows(id, n).forEach(function (r) {
        out.push({ kind: kind, id: id, q: r.q, n: r.n, base: base, name: name });
      });
    }
    Object.keys(S.bag || {}).forEach(function (id) {
      const p = D.PILL_EXT.find(function (x) { return x.id === id; });
      if (p) push('dan', id, p.price, p.name);
    });
    Object.keys(S.talismans || {}).forEach(function (id) {
      const p = D.TALISMANS.find(function (x) { return x.id === id; });
      if (p) push('tal', id, p.price, p.name);
    });
    (S.arts || []).forEach(function (id) {
      const p = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
      if (p) push('art', id, p.price, p.name);
    });
    out.sort(function (a, b) { return b.base - a.base; });
    return out.slice(0, 8);
  }

  /* 结算一件寄售拍品：最多三位潜在买家，各按自己的心理价举牌。
     底价定得越高，举牌的人越少——这就是「高价」档的真正代价。 */
  function aucRoll(it) {
    const floor = it.base * it.qMul * aucFloorMul();
    let best = 0, bidders = 0;
    const heat = clamp(1.6 - 0.35 * (aucFloorMul() - 0.9) / 0.7, 0.45, 1.6);
    for (let i = 0; i < 3; i++) {
      if (rng() < 0.62 * heat) {
        bidders++;
        const p = it.base * it.qMul * (0.95 + rng() * 0.95);
        if (p > best) best = p;
      }
    }
    if (!bidders) return { ok: false, why: '无人举牌', bidders: 0, price: 0, floor: floor };
    if (best < floor) return { ok: false, why: '未到底价', bidders: bidders, price: Math.round(best), floor: floor };
    return { ok: true, bidders: bidders, price: Math.max(1, Math.round(best * 0.9)), floor: floor, top: Math.round(best) };
  }

  ACT.openAuction = () => {
    if (!auctionOpen()) {
      let b = `<div class="small">拍会三年一开。下一场在 <b>${aucNextYear()}</b> 年仲夏。</div>`;
      b += divider() + `<div class="small muted">届时可寄售自己的丹药、符箓、法器，并竞买一件客籍拍品。</div>`;
      b += `<div class="hint">拍卖倍率 1.40×，成交抽一成；底价定高了会流拍，但流拍不扣货。</div>`;
      openModal('拍卖会 · 未开场', b);
      return;
    }
    if (aucUsed()) {
      let b = `<div class="small">本场已经散场了。下一次在 <b>${aucNextYear()}</b> 年。</div>`;
      const won = S.aucLotWon;
      if (won) b += `<div class="small good">携「${esc(won)}」而去。</div>`;
      b += divider() + `<div class="hint">拍卖会三年一场，一人一场只准进场一次。</div>`;
      openModal('拍卖会 · 已散场', b);
      return;
    }
    if (S.aucSell === undefined || !Array.isArray(S.aucSell)) S.aucSell = [];
    let b = `<div class="small">天玄历 ${S.year} 年 · 仲夏拍会。台上灯已经亮了，台下坐满了不抬头的人。</div>`;
    b += `<div class="statline"><span class="k">已寄存</span><span class="v"><b>${S.aucSell.length}/3 件</b></span></div>`;
    b += `<div class="statline"><span class="k">底价档</span><span class="v">${(AUC_FLOOR[S.aucFloor] || AUC_FLOOR.mid).n}（${aucFloorMul().toFixed(1)}× 底）</span></div>`;
    b += `<div class="row" style="gap:6px;margin:6px 0">`;
    ['low', 'mid', 'high'].forEach(function (k) {
      const on = (S.aucFloor || 'mid') === k;
      b += `<span class="chip${on ? ' on' : ''}" data-act="do;aucfloor:${k}">${AUC_FLOOR[k].n}</span>`;
    });
    b += `</div>`;

    if (S.aucSell.length) {
      b += divider() + `<div class="muted small">已寄存</div><ul class="opts">`;
      S.aucSell.forEach(function (it, i) {
        b += optRow(String(i + 1), it.name + ' · ' + qualityDef(it.q).name + ' ×' + it.n,
          { name: '底 ' + Math.round(it.base * it.qMul * aucFloorMul()), cls: 'peace' },
          '撤下', false, 'do;aucdel:' + i);
      });
      b += `</ul>`;
    }

    if (S.aucSell.length < 3) {
      const cands = aucCandidates();
      b += divider() + `<div class="muted small">可寄存（单价 100 石以上）</div><ul class="opts">`;
      if (!cands.length) b += `<div class="small muted">囊中还没有值得上拍的东西。</div>`;
      cands.forEach(function (c, i) {
        b += optRow('ABCDEFGH'[i] || '·', c.name + ' · ' + qualityDef(c.q).name,
          { name: '存 ' + c.n, cls: 'peace' },
          Math.round(c.base * c.qMul * 1.4) + ' 石估', false,
          'do;aucadd:' + c.kind + ':' + c.id + ':' + c.q);
      });
      b += `</ul>`;
    }

    /* 客籍拍品：一件，密封竞价 */
    if (!S.aucLot) S.aucLot = pick(AUC_LOTS).id;
    const lot = AUC_LOTS.find(function (x) { return x.id === S.aucLot; }) || AUC_LOTS[0];
    b += divider() + `<div class="muted small">客籍拍品</div>`;
    b += `<div class="small"><b>${esc(lot.name)}</b>　起拍 ${fmtNum(lot.base)} 石</div>`;
    b += `<div class="small muted" style="margin:2px 0 6px">${esc(lot.desc)}　<span class="good">${esc(lot.eff)}</span></div>`;
    /* v9.0 M3：高神识看得出拍品之外的价——隐藏拍品的另一种给法。 */
    const _XA = G.WXCS3_EXT;
    const _ah = (_XA && _XA.auctionHint) ? _XA.auctionHint(lot) : '';
    if (_ah) b += _ah;
    b += `<ul class="opts">`;
    [1.0, 1.25, 1.55].forEach(function (m, i) {
      const bid = Math.round(lot.base * m);
      b += optRow('ABC'[i], '出价 ' + fmtNum(bid) + ' 石',
        { name: m === 1 ? '起拍' : (m === 1.25 ? '加两成半' : '志在必得'), cls: m === 1.55 ? 'risk' : 'chance' },
        S.stones < bid ? '灵石不足' : '', S.stones < bid, 'do;aucbid:' + bid);
    });
    b += `</ul>`;
    b += divider() + `<div class="row"><span class="lab">灵石</span><b style="color:var(--stone)">${fmtNum(S.stones)}</b></div>`;
    b += `<div class="hint">开拍后不可反悔，且本场就此散场——一年只能来一次。</div>`;
    b += `<ul class="opts"><li class="opt" data-act="do;aucgo"><span class="key">▶</span>
      <span class="txt">开拍（结清寄存，散场）</span></li></ul>`;
    openModal('拍卖会 · ' + S.year + ' 年仲夏', b);
  };

  ACT.do_aucfloor = (k) => { if (AUC_FLOOR[k]) S.aucFloor = k; ACT.openAuction(); render(); };

  ACT.do_aucadd = (kind, id, q) => {
    if (!Array.isArray(S.aucSell)) S.aucSell = [];
    if (S.aucSell.length >= 3) { toast('最多寄存三件'); return; }
    const kindKey = { dan: 'dan', tal: 'tal', art: 'art' }[kind];
    if (!kindKey) { toast('这类东西不收'); return; }
    let def = null;
    if (kindKey === 'dan') def = D.PILL_EXT.find(function (x) { return x.id === id; });
    else if (kindKey === 'tal') def = D.TALISMANS.find(function (x) { return x.id === id; });
    else def = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
    if (!def) { toast('没有这件东西'); return; }
    const left = S.aucSell.filter(function (x) { return x.kind === kindKey && x.id === id && x.q === q; })
      .reduce(function (a, x) { return a + x.n; }, 0);
    let have = 0;
    if (kindKey === 'dan') have = (S.bag || {})[id] || 0;
    else if (kindKey === 'tal') have = (S.talismans || {})[id] || 0;
    else have = (S.arts || []).filter(function (x) { return x === id; }).length;
    if (have - left < 1) { toast('这个品相已全部寄存'); return; }
    S.aucSell.push({ kind: kindKey, id: id, q: q, n: 1, name: def.name,
      base: def.price, qMul: qualityDef(q).mul });
    ACT.openAuction(); render();
  };

  ACT.do_aucdel = (i) => {
    i = parseInt(i, 10);
    if (!Array.isArray(S.aucSell) || isNaN(i)) return;
    S.aucSell.splice(i, 1);
    ACT.openAuction(); render();
  };

  ACT.do_aucbid = (bid) => {
    bid = parseInt(bid, 10) || 0;
    const lot = AUC_LOTS.find(function (x) { return x.id === S.aucLot; });
    if (!lot || bid <= 0) return;
    if (S.stones < bid) { toast('灵石不足'); return; }
    /* 密封竞价：对手的心理价在 1.0 ~ 1.6 倍之间，出到 1.55 也未必稳拿 */
    const rival = lot.base * (1.0 + rng() * 0.6);
    if (bid >= rival) {
      S.stones -= bid;
      ledgerAdd('out', '拍得' + lot.name, bid);
      lot.apply();
      S.aucLotWon = lot.name;
      logLine('拍得「' + lot.name + '」，' + lot.eff + '。', 'good');
      /* v9.0 M4：半卷残图拍下后，舆图上多一处可去的遗迹。 */
      const _XA = G.WXCS3_EXT;
      if (_XA && _XA.onAuctionWin) _XA.onAuctionWin(lot);
      toast('落槌 · ' + lot.name);
    } else {
      logLine('「' + lot.name + '」被旁人叫走，你的号牌没再举。', '');
      toast('未拍得');
    }
    S.aucLot = null;
    ACT.openAuction(); render();
  };

  ACT.do_aucgo = () => {
    if (!auctionOpen() || aucUsed()) { toast('本场已散'); return; }
    const list = Array.isArray(S.aucSell) ? S.aucSell.slice() : [];
    const results = [];
    list.forEach(function (it) {
      const r = aucRoll(it);
      if (!r.ok) {
        results.push({ it: it, r: r });
        return;
      }
      /* 真的把货扣掉——沿用卖出那套扣减，避免品相库存与总数脱节 */
      if (it.kind === 'dan') { if ((S.bag[it.id] || 0) > 0) S.bag[it.id]--; consumeQuality(it.id, it.q); }
      else if (it.kind === 'tal') { if ((S.talismans[it.id] || 0) > 0) S.talismans[it.id]--; consumeQuality(it.id, it.q); }
      else {
        const at = (S.arts || []).indexOf(it.id);
        if (at >= 0) { S.arts.splice(at, 1); consumeQuality(it.id, it.q); }
        if ((S.arts || []).indexOf(it.id) < 0) {
          Object.keys(S.equipped || {}).forEach(function (slot) {
            if (S.equipped[slot] === it.id) delete S.equipped[slot];
          });
        }
      }
      S.stones += r.price;
      ledgerAdd('in', '拍卖·' + it.name, r.price);
      sellTally(r.price, 'auction');
      bump('auctionWin');
      results.push({ it: it, r: r });
    });
    S.aucSell = [];
    S.aucYear = S.year;
    S.aucLot = null;

    let b = `<div class="small">槌声落定。台上换了三次灯。</div>` + divider();
    if (!results.length) b += `<div class="small muted">你没有寄存任何东西，只坐着看了一场。</div>`;
    let total = 0;
    results.forEach(function (x) {
      const q = qualityDef(x.it.q).name;
      if (x.r.ok) {
        total += x.r.price;
        b += `<div class="small good">${esc(x.it.name)}（${q}）成交 ${fmtNum(x.r.price)} 石 —— ${x.r.bidders} 人举牌，最高 ${fmtNum(x.r.top)}，抽一成。</div>`;
      } else {
        b += `<div class="small muted">${esc(x.it.name)}（${q}）流拍 · ${esc(x.r.why)}${x.r.price ? '（最高只到 ' + fmtNum(x.r.price) + '）' : ''}，货已带回。</div>`;
      }
    });
    if (total) b += `<div class="small" style="margin-top:6px">合计入账 <b style="color:var(--stone)">${fmtNum(total)}</b> 灵石。</div>`;
    b += divider() + `<div class="small">下一场：${aucNextYear()} 年仲夏。</div>`;
    logLine('拍卖会散场，寄售所得 ' + total + ' 灵石。', total ? 'good' : '');
    advanceXun(1);
    if (S.phase !== 'play') return render();
    openModal('拍卖会 · 落槌', b);
    render();
  };

  function auctionOpen() { return S.year % 3 === 0; }
  function auctionPassed() { return sellCh().id !== 'auction' || rng() >= 0.15; }
  function sellMul() {
    return (S.market && S.market.mul) || { dan: 1, qi: 1, fu: 1, zhen: 1, mat: 1 };
  }
  /* v10.5 P1·E4：坊市摆摊每月限件数。宗门身份越高，摊位越多。
     黑市/宗门/拍卖不限件——黑市背业力，宗门折价，拍卖三年一次且会流拍。 */
  function marketLimit() {
    return 5 + (S.sect ? (S.sect.rank || 0) : 0);
  }
  function marketSold() {
    return (S.sellMonth && S.sellMonth.market) || 0;
  }
  function marketFull() {
    return sellCh().id === 'market' && marketSold() >= marketLimit();
  }
  function marketTake() {
    S.sellMonth = S.sellMonth || { market: 0 };
    S.sellMonth.market = (S.sellMonth.market || 0) + 1;
  }
  /* v10.5 P1·E8：买入价随行情波动，并与卖出共用「买入必须高于回收」的护栏。
     最低买价 0.92×、宗门 0.97 折后仍有 0.8924×，
     高于最高回收（黑市 0.6×1.45=0.87×），任何渠道都不再生出正套利。 */
  function buyMulOf(cat) {
    const key = cat === 'pill' ? 'dan' : cat === 'art' ? 'qi' : cat === 'mat' ? 'mat' : null;
    if (!key || !S.market || !S.market.buy) return 1;
    return clamp(S.market.buy[key] || 1, 0.92, 1.25);
  }
  function buyPriceOf(it) {
    if (!it) return 0;
    const base = it.price || 0;
    let p = Math.round(base * buyMulOf(it.cat));
    if (S.sect && (S.sect.rank || 0) >= 2) p = Math.round(p * 0.97);
    return Math.max(1, p);
  }
  function sellCh() {
    const id = S.sellCh || 'market';
    return D.SELL_CHANNELS.find(function (c) { return c.id === id; }) || D.SELL_CHANNELS[1];
  }
  /* v10.3 P0：回收价与零售价分离。
     旧版把渠道倍率直接乘在零售价上：坊市档 1.00 就是原价收，黑市 1.45 更高，
     于是「坊市买入 → 黑市卖出」稳定赚 45%，0 旬 0 风险，第一天就把灵石曲线打穿。
     现在零售价先打 RECOVER_BASE（回收折价）再乘渠道倍率；
     最高的黑市 0.6×1.45 = 0.87，仍低于进货价，任何渠道都不再生出正套利。
     渠道倍率的语义是「相对回收基准的系数」，不是「相对零售价的溢价」。 */
  const RECOVER_BASE = 0.6;
  function sellPriceOf(base, mul, qualityMul) {
    const ch = sellCh();
    const fee = ch.id === 'auction' ? 0.9 : 1;
    return Math.max(1, Math.round(base * RECOVER_BASE * (mul || 1) *
      (qualityMul === undefined ? 1 : qualityMul) * ch.mul * fee));
  }
  ACT.do_sellch = (id) => {
    const ch = D.SELL_CHANNELS.find(function (c) { return c.id === id; });
    if (!ch) return;
    if (ch.need === 'sect' && !S.sect) { toast('未入宗门'); return; }
    if (ch.id === 'auction' && !auctionOpen()) { toast('今年无拍卖会，下一场在' + (S.year + (3 - S.year % 3)) + '年'); return; }
    S.sellCh = id; closeModal(); ACT.openSell();
  };

  ACT.openSell = () => {
    if (S.sellCh === 'auction' && !auctionOpen()) S.sellCh = 'market';
    const ch = sellCh();
    let b = '<div class="row"><span class="lab">灵石</span><b style="color:var(--stone)">' + fmtNum(S.stones) + '</b></div>';
    if (ch.id === 'market') {
      const sold = marketSold(), lim = marketLimit();
      b += '<div class="row"><span class="lab">本月摊位</span><b class="' + (sold >= lim ? 'danger' : '') + '">' +
        sold + ' / ' + lim + '</b></div>';
    }
    b += '<div class="shop-tabs">';
    D.SELL_CHANNELS.forEach(function (c) {
      const off = (c.need === 'sect' && !S.sect) || (c.id === 'auction' && !auctionOpen());
      const on = ch.id === c.id;
      const label = c.name + (c.id === 'auction' && !auctionOpen() ? '（' + (S.year + (3 - S.year % 3)) + '年）' : ' ' + c.mul.toFixed(2) + '×');
      b += off
        ? '<span class="shop-tab" style="opacity:.42">' + label + '</span>'
        : '<span class="shop-tab ' + (on ? 'on' : '') + '" data-act="do;sellch:' + c.id + '">' + label + '</span>';
    });
    b += '</div>';
    b += '<div class="small muted" style="margin:2px 0 4px">' + esc(ch.desc) +
      (ch.id === 'black' ? '（每件业力 +3）' : ch.id === 'sect' ? '（两成折成贡献）' : ch.id === 'auction' ? '（成交价已抽成一成；15% 流拍，流拍不扣货）' : '') + '</div>' + divider();

    function qualityBlock(title, kind, ids, defs, counts, marketKey) {
      b += '<div class="small muted" style="margin-top:6px">' + title + '</div><ul class="opts">';
      if (!ids.length) b += '<div class="small muted">无</div>';
      const recKind = { dan: 'dan', tal: 'fu', art: 'qi' }[kind];
      ids.forEach(function (id) {
        const def = defs(id);
        if (!def) return;
        const rec = D.RECIPES.find(function (r) { return r.out === id && r.kind === recKind; });
        qualityRows(id, counts(id)).forEach(function (qr) {
          const q = qualityDef(qr.q);
          /* v10.5 P1·M2：亲手做的成品按「自制品相溢价」报价，与结算同源 */
          const baseVal = (qr.made && rec) ? craftedValueOf(rec) : def.price;
          const price = sellPriceOf(baseVal, sellMul()[marketKey] || 1, q.mul);
          b += optRow('·', def.name + (qr.made ? ' · 自制' : '') + ' · ' + q.name,
            { name: title, cls: q.id === 'ji' ? 'chance' : 'peace' },
            '×' + qr.n + ' · ' + fmtNum(price) + ' 石/件', false, 'do;sellitem:' + kind + ':' + id + ':' + q.id);
        });
      });
      b += '</ul>';
    }
    const pillIds = Object.keys(S.bag || {}).filter(function (k) {
      return (S.bag[k] || 0) > 0 && D.PILL_EXT.some(function (p) { return p.id === k; });
    });
    qualityBlock('丹药', 'dan', pillIds,
      function (id) { return D.PILL_EXT.find(function (x) { return x.id === id; }); },
      function (id) { return S.bag[id] || 0; }, 'dan');
    const talIds = Object.keys(S.talismans || {}).filter(function (k) { return (S.talismans[k] || 0) > 0; });
    qualityBlock('符箓', 'tal', talIds,
      function (id) { return D.TALISMANS.find(function (x) { return x.id === id; }); },
      function (id) { return S.talismans[id] || 0; }, 'fu');
    const artIds = [];
    (S.arts || []).forEach(function (id) { if (artIds.indexOf(id) < 0) artIds.push(id); });
    qualityBlock('法宝', 'art', artIds,
      function (id) { return D.ARTIFACT_EXT.find(function (x) { return x.id === id; }); },
      function (id) { return (S.arts || []).filter(function (x) { return x === id; }).length; }, 'qi');
    b += '<div class="small muted" style="margin-top:6px">阵盘</div><ul class="opts">';
    if (!(S.disks || []).length) b += '<div class="small muted">无</div>';
    (S.disks || []).forEach(function (d, i) {
      const rec = D.RECIPES.find(function (r) { return r.out === d.id; });
      const dk = D.ARRAY_DISKS.find(function (x) { return x.id === d.id; });
      if (!rec || !dk) return;
      const q = qualityDef(d.q);
      b += optRow('·', dk.name + ' · ' + q.name, { name: '阵盘', cls: 'chance' },
        fmtNum(sellPriceOf(outPriceOf(rec, { mul: 1 }), sellMul().zhen || 1, q.mul)) + ' 石', false,
        'do;sellitem:disk:' + i + ':' + q.id);
    });
    b += '</ul>';
    b += '<div class="hint">族规「不得经商牟利」会在这里咬你——卖多了族运要掉。</div>';
    b += '<div class="selgrid" style="margin-top:6px"><span class="chip" data-act="do;shopcat:pill">← 回坊市</span></div>';
    openModal('坊市 · 卖出', b);
  };

  ACT.do_sellitem = (kind, id, qid) => {
    const ch = sellCh();
    if (ch.need === 'sect' && !S.sect) { toast('未入宗门'); return; }
    if (ch.id === 'auction' && !auctionOpen()) { toast('拍卖会尚未开场'); return; }
    if (marketFull()) { toast('本月摊位已满，去黑市/宗门，或等下月'); return; }
    let def, rec, disk = null, count = 0, base = 0, market = 1;
    if (kind === 'disk') {
      disk = (S.disks || [])[parseInt(id, 10)];
      if (!disk) { toast('没有'); return; }
      def = D.ARRAY_DISKS.find(function (x) { return x.id === disk.id; });
      rec = D.RECIPES.find(function (r) { return r.out === disk.id; });
      if (!def || !rec) return;
      qid = disk.q; count = 1; base = craftedValueOf(rec); market = sellMul().zhen || 1;
    } else if (kind === 'dan') {
      def = D.PILL_EXT.find(function (x) { return x.id === id; });
      count = (S.bag || {})[id] || 0; if (def) { base = def.price; market = sellMul().dan || 1; }
    } else if (kind === 'tal') {
      def = D.TALISMANS.find(function (x) { return x.id === id; });
      count = (S.talismans || {})[id] || 0; if (def) { base = def.price; market = sellMul().fu || 1; }
    } else if (kind === 'art') {
      def = D.ARTIFACT_EXT.find(function (x) { return x.id === id; });
      count = (S.arts || []).filter(function (x) { return x === id; }).length;
      if (def) { base = def.price; market = sellMul().qi || 1; }
    }
    if (!def || count < 1) { toast('没有'); return; }
    const available = kind === 'disk' ? [{ q: qid, n: 1, made: true }] : qualityRows(id, count);
    if (!qid) qid = available[0].q;
    const picked = available.find(function (x) { return x.q === qid && x.n > 0; });
    if (!picked) { toast('这个品相已经没了'); return; }
    /* 只有 craftedQ 里记着的行才享受自制品相溢价；坊市进货按表价回收 */
    if (picked.made) {
      const recKind = { dan: 'dan', tal: 'fu', art: 'qi' }[kind];
      const rr = D.RECIPES.find(function (r) { return r.out === id && r.kind === recKind; });
      if (rr) base = craftedValueOf(rr);
    }
    if (!auctionPassed()) {
      toast('流拍，货物已带回');
      logLine(def.name + '在拍卖会上流拍，货未出手。', '');
      closeModal(); ACT.openSell(); render(); return;
    }
    const q = qualityDef(qid);
    const price = sellPriceOf(base, market, q.mul);
    if (kind === 'dan') { S.bag[id]--; consumeQuality(id, qid); }
    else if (kind === 'tal') { S.talismans[id]--; consumeQuality(id, qid); }
    else if (kind === 'art') {
      const at = S.arts.indexOf(id); if (at >= 0) S.arts.splice(at, 1);
      consumeQuality(id, qid);
      if (S.arts.indexOf(id) < 0) Object.keys(S.equipped || {}).forEach(function (slot) {
        if (S.equipped[slot] === id) delete S.equipped[slot];
      });
    } else if (kind === 'disk') S.disks.splice(parseInt(id, 10), 1);
    S.stones += price;
    if (ch.id === 'market') marketTake();
    if (ch.id === 'black') S.karma += 3;
    if (ch.id === 'sect' && S.sect) S.sect.contrib = (S.sect.contrib || 0) + Math.round(price * 0.2);
    ledgerAdd('in', '卖 ' + def.name + '（' + q.name + '）', price);
    sellTally(price, ch.id);
    logLine('在' + ch.name + '卖出 ' + def.name + '（' + q.name + '），得灵石 ' + price + '。', ch.id === 'black' ? 'danger' : 'good');
    if (S.clan && (S.clan.rules || []).indexOf('noTrade') >= 0 && price >= 200) {
      S.clan.luck = Math.max(0, S.clan.luck - 100);
      logLine('族老们不悦：「与商贾为伍」。族运 −100。', 'danger');
    }
    closeModal(); ACT.openSell(); render();
  };

  /* v10.4 P0：v10.3 P1 瘦身时把这两个别名当成死代码删了，
     但 tools/smoke_econ.js 第 8 节仍走它们——删掉的是「调用便捷入口」，
     断的是测试基线（README 记 913 全绿，实际 904）。
     它们本身是 do_sellitem 的一行转发，保留成本为零，
     留着还能让「卖丹药/卖符」在脚本与扩展里有稳定名字。 */
  ACT.do_selldan = (id) => ACT.do_sellitem('dan', id);
  ACT.do_selltal = (id) => ACT.do_sellitem('tal', id);

  ACT.do_sellmat = (id) => {
    const it = D.MATERIAL_EXT.find(function (x) { return x.id === id; });
    if (!it || (S.bagMat[id] || 0) < 1) { toast('没有'); return; }
    const ch = sellCh();
    if (ch.need === 'sect' && !S.sect) { toast('未入宗门'); return; }
    if (ch.id === 'auction' && !auctionOpen()) { toast('拍卖会尚未开场'); return; }
    if (marketFull()) { toast('本月摊位已满，去黑市/宗门，或等下月'); return; }
    S.bagMat[id]--;
    /* v10.3 P0：材料也走同一条回收基准（原价 × RECOVER_BASE × 渠道）。
       v10.5 P1·E8：材料行情与丹药/符/器同源，不再恒为 1。 */
    const price = sellPriceOf(it.price, sellMul().mat || 1);
    S.stones += price;
    if (ch.id === 'market') marketTake();
    if (ch.id === 'black') S.karma += 3;
    ledgerAdd('in', '卖 ' + it.name, price);
    sellTally(price, ch.id);
    closeModal(); ACT.openBagMat(); render();
  };
  /* ---------- 月度收支 ---------- */
  function ledgerReset() {
    S.ledger = { income: [], expense: [] };
  }
  function ledgerNet() {
    const L = S.ledger || { income: [], expense: [] };
    const inc = (L.income || []).reduce(function (a, x) { return a + x.amount; }, 0);
    const exp = (L.expense || []).reduce(function (a, x) { return a + x.amount; }, 0);
    return { inc: inc, exp: exp, net: inc - exp };
  }
  function renderLedger() {
    const L = S.ledger || { income: [], expense: [] };
    if (!(L.income || []).length && !(L.expense || []).length) return '';
    const n = ledgerNet();
    let b = '<div class="ledger">';
    b += '<div class="lh">本月收支<span style="float:right;font-weight:400;cursor:pointer;color:var(--jade-deep)" data-act="act:openLedger">全部 ›</span></div>';
    (L.income || []).slice(-4).forEach(function (x) {
      b += '<div class="lr"><span>' + esc(x.label) + '</span><b class="good">+' + fmtNum(x.amount) + '</b></div>';
    });
    (L.expense || []).slice(-4).forEach(function (x) {
      b += '<div class="lr"><span>' + esc(x.label) + '</span><b class="danger">−' + fmtNum(x.amount) + '</b></div>';
    });
    b += '<div class="lr net"><span>净入</span><b class="' + (n.net >= 0 ? 'good' : 'danger') + '">' +
      (n.net >= 0 ? '+' : '') + fmtNum(n.net) + '</b></div>';
    b += '<div class="lr sub"><span>余</span><b>' + fmtNum(S.stones) + '</b></div>';
    b += '</div>';
    return b;
  }

  /* v10.5 P2·E10：本月账本全量明细。
     左栏只留最近四条看趋势；要看「钱到底花在哪」时，从这里展开。 */
  ACT.openLedger = () => {
    const L = S.ledger || { income: [], expense: [] };
    const inc = L.income || [], exp = L.expense || [];
    const n = ledgerNet();
    let b = '<div class="row"><span class="lab">本月收入</span><b class="good">+' + fmtNum(n.inc) + '</b></div>';
    b += '<div class="row"><span class="lab">本月支出</span><b class="danger">−' + fmtNum(n.exp) + '</b></div>';
    b += '<div class="row"><span class="lab">净入</span><b class="' + (n.net >= 0 ? 'good' : 'danger') + '">' +
      (n.net >= 0 ? '+' : '') + fmtNum(n.net) + '</b></div>';
    b += '<div class="row"><span class="lab">现余</span><b>' + fmtNum(S.stones) + '</b></div>';
    b += divider();
    function block(title, arr, cls) {
      let s = '<div class="sechead">' + title + '　' + arr.length + ' 笔</div>';
      if (!arr.length) return s + '<div class="small muted">无</div>';
      s += '<ul class="gainlist">';
      arr.forEach(function (x) {
        s += '<li><span class="gn">' + esc(x.label) + '</span>' +
          '<span class="gx ' + cls + '">' + (cls === 'good' ? '+' : '−') + fmtNum(x.amount) + '</span></li>';
      });
      return s + '</ul>';
    }
    b += block('收入', inc, 'good');
    b += block('支出', exp, 'hno');
    b += '<div class="hint">账本每月初一重置；所有灵石增减都走同一条账本。</div>';
    openModal('账本 · 本月全部收支', b);
  };

  /* ---------- 行情 ---------- */
  function tickMarket() {
    if (!S.market) S.market = { mul: {}, buy: {}, month: 0 };
    if (!S.market.mul) S.market.mul = {};
    if (!S.market.buy) S.market.buy = {};
    ['dan', 'qi', 'fu', 'zhen', 'mat'].forEach(function (k) {
      if (typeof S.market.mul[k] !== 'number') S.market.mul[k] = 1;
      if (typeof S.market.buy[k] !== 'number') S.market.buy[k] = 1;
    });
    if (S.month === 1) {
      const m = S.market.mul, b = S.market.buy;
      ['dan', 'qi', 'fu', 'zhen', 'mat'].forEach(function (k) {
        m[k] = clamp((m[k] || 1) + (rng() - 0.5) * 0.2, 0.7, 1.5);
        b[k] = clamp((b[k] || 1) + (rng() - 0.5) * 0.16, 0.92, 1.25);
      });
    }
    // 事件放大：荒年丹药贵，可从「回收价高、买入价也高」两头体现
    if (S.marketEvent) {
      const e = S.marketEvent;
      if (e === 'drought') { S.market.mul.dan *= 1.3; S.market.buy.dan = clamp((S.market.buy.dan || 1) * 1.12, 0.92, 1.25); }
      if (e === 'storm' || e === 'demon') {
        S.market.mul.qi *= 1.5; S.market.mul.fu *= 1.3;
        S.market.buy.qi = clamp((S.market.buy.qi || 1) * 1.10, 0.92, 1.25);
        S.market.buy.fu = clamp((S.market.buy.fu || 1) * 1.08, 0.92, 1.25);
      }
      S.marketEvent = null;
    }
  }

  /* ---------- 全局绑定 ---------- */
  document.addEventListener('click', (e) => {
    // 点遮罩关弹窗：手机上长列表要滚到底才能按「关闭」，不如点外面。
    // noClose 的弹窗（破柱/破境抉择）不能这样溜走。
    if (e.target && e.target.classList && e.target.classList.contains('modal')) {
      if (!e.target.getAttribute('data-noclose')) closeModal();
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el || el.hasAttribute('disabled')) return;
    dispatch(el.getAttribute('data-act'));
  });

  document.addEventListener('keydown', (e) => {
    if (!S) return;
    /* ESC 必须在「有弹窗就 return」之前处理：
       旧版把 closeModal 写在守卫之后，弹窗一开就永远走不到，
       玩家只能点遮罩或滚到底找关闭。 */
    if (e.key === 'Escape') {
      const m = document.getElementById('modals');
      if (m && m.innerHTML) {
        const modal = m.querySelector('.modal');
        if (!(modal && modal.getAttribute('data-noclose'))) closeModal();
        e.preventDefault();
      }
      return;
    }
    const f0 = document.getElementById('in-free');
    const typing = f0 && document.activeElement === f0;
    /* 键盘可达性：Tab 聚焦到 [data-act] 后，Enter/空格等同点击 */
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      const ae = document.activeElement;
      const aTag = ae && ae.tagName ? ae.tagName.toUpperCase() : '';
      if (ae && ae.getAttribute && ae.getAttribute('data-act') &&
          aTag !== 'INPUT' && aTag !== 'TEXTAREA' && aTag !== 'SELECT') {
        e.preventDefault();
        dispatch(ae.getAttribute('data-act'));
        return;
      }
    }
    if (e.key === 'Enter') {
      if (S.phase === 'create' && S.createStep === 0) { syncInputs(); render(); return; }
      if (typing) dispatch('do;free');
      return;
    }
    if (typing || S.phase !== 'play' || document.getElementById('modals').innerHTML) return;
    // P3-25：A/B/C/D 与 1/2/3/4 直选
    const k = e.key.toLowerCase();
    const act = mainKeyAction(k);
    if (act) { e.preventDefault(); dispatch(act); }
  });

  function boot() {
    S = newGame(); S.draft = draftInit(); render();
    /* v8.0 全局错误网：以前脚本一抛错就是整屏白，玩家以为手机卡死。
       现在至少把错误摊在屏幕下方，且只报一次，不刷屏。 */
    let errShown = 0;
    window.onerror = function (msg, src, line, col, err) {
      errShown++;
      if (errShown > 3) return;
      const txt = '脚本出错：' + (err && err.message ? err.message : msg) +
        (line ? '（第 ' + line + ' 行）' : '') + '　已自动存档，可刷新再试。';
      try { toast(txt); } catch (e) { }
      try { console.error('[wxcs3]', msg, src, line, col, err); } catch (e) { }
      try { autoSave(); } catch (e) { }
    };
    window.addEventListener('unhandledrejection', function (e) {
      try { console.error('[wxcs3] unhandled', e && e.reason); } catch (x) { }
    });
    // 顶栏「系统」按钮由全局 data-act 分发处理（act:openSys），无需额外绑定
    window.addEventListener('beforeunload', function () { autoSave(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') autoSave();
    });
    if (localStorage.getItem(SAVE_KEY)) setTimeout(function () {
      toast('有自动存档在，可于右上「系统 → 读档」复之');
    }, 900);
  }



  /* ============================================================
     v6.7 恩义 · 钩子
     ------------------------------------------------------------
     设计铁律（改之前先读）：
     1) 零数值影响之外的东西一律不做——钩子只改「别人怎么对你」。
     2) 恩的纯度与施恩者境界成反比。
     3) 「期」设在三十年后 / 破境那一夜 / 证位动不了那一刻，才有味道。
     4) 暗钩必须留破绽（hint）。没破绽的暗钩是不公平，不是伏笔。
     5) debuff 不许直接扣命扣境；状态卡只写征兆，不写公式。
     6) 债的效力取决于实力：对方远超你时，他可以不还，你不能怎样。
     ============================================================ */
  const HOOK_MAX = 3;

  function hookAll() {
    if (!Array.isArray(S.hooks)) S.hooks = [];
    return S.hooks;
  }
  function hookUnsettled() {
    return hookAll().filter(function (h) { return !h.done; });
  }

  /* 记账：你欠了谁 */
  function pushHook(defId, opts) {
    opts = opts || {};
    const d = hookDef(defId);
    if (!d) return null;
    if (hookAll().some(function (h) { return h.id === defId && !h.done; })) return null;
    // 上限 3：超出时最旧的一笔「有人替你平了账」——给叙事理由，不静默丢弃
    const alive = hookUnsettled();
    if (alive.length >= HOOK_MAX) {
      const oldest = alive[0];
      oldest.done = true;
      logLine('有人替你平了「' + (hookDef(oldest.id) || {}).given + '」那笔旧账。你不知道是谁。', '');
    }
    const h = {
      id: defId,
      from: opts.from || d.from,
      fromRank: d.fromRank || 0,
      given: opts.given || d.given,
      known: !!d.known,
      due: d.due || null,
      born: { y: S.year, m: S.month },
      bornTurn: S.turn,
      done: false, warned: false, overdue: false, blocked: false, refused: false
    };
    hookAll().push(h);
    if (d.known) {
      logLine('你欠下一份人情（' + h.from + '）。什么人情，要到还的时候才知道。', '');
    }
    return h;
  }

  /* 别人欠你的 */
  function pushGiven(to, what, weight, power) {
    if (!Array.isArray(S.hooksGiven)) S.hooksGiven = [];
    if (S.hooksGiven.some(function (x) { return x.to === to && !x.done; })) return;
    S.hooksGiven.push({
      to: to, what: what, weight: weight || 2,
      power: power || 0, y: S.year, done: false
    });
    logLine('你把这件事记下了：' + to + '欠你一次。', 'muted');
  }

  /* 当前缠在身上的因果 */
  function hookDebuffIds() {
    const out = [];
    hookUnsettled().forEach(function (h) {
      if (h.refused && h.refuseDebuff) out.push(h.refuseDebuff);
      if (h.overdue && h.dueDebuff) out.push(h.dueDebuff);
    });
    const over = hookUnsettled().filter(function (h) { return h.overdue; });
    if (over.length >= 2) out.push('debt_weight');
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  function hasDebuff(id) { return hookDebuffIds().indexOf(id) >= 0; }
  function hookSigns() {
    return hookDebuffIds().map(function (id) {
      const d = (D.HOOK_DEBUFF || []).find(function (x) { return x.id === id; });
      return d ? esc(d.sign) : '';
    }).filter(Boolean);
  }

  /* 到期判定 */
  function hookIsDue(h) {
    const d = h.due || {};
    switch (d.kind) {
      case 'realm': return myRealmIdx() >= (d.at || 0);
      case 'year': return (S.year - h.born.y) >= (d.at || 0);
      case 'kill': return ((S.tally && S.tally.kill) || 0) >= (d.at || 1);
      case 'weak': return (S.hp / Math.max(1, S.hpMax)) < 0.35;
      case 'guowei': return !!S.guowei;
      default: return false;
    }
  }

  /* 每月：到期先给一句不对劲，宽限三月再上门 */
  function tickHooks() {
    if (!S || S.phase !== 'play') return;

    // 神魂暗契：每月 10% 被窥视
    if (hasDebuff('soul_lien') && rnd100() <= 10) {
      S.hookSeen = (S.hookSeen || 0) + 1;
      logLine('有人在你背后说了句话，回头时街上只有风。', 'muted');
    }

    const list = hookUnsettled();
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      if (h.blocked) continue;
      if (!hookIsDue(h)) continue;
      const d = hookDef(h.id);
      if (!h.warned) {
        h.warned = true; h.warnTurn = S.turn;
        logLine(h.known
          ? '「' + h.from + '」那边，好像有信要来了。'
          : ((d && d.hint) || '你总觉得有什么事在等着。'), 'muted');
        continue;
      }
      if (S.turn - (h.warnTurn || 0) < 3) continue;
      h.overdue = true;
      h.blocked = true;
      S.hookPending = h.id;
      openHookClaim(h);
      return;
    }
  }

  /* 索：还 / 赖 / 斩 */
  function openHookClaim(h) {
    const d = hookDef(h.id);
    if (!d || !d.claim) { h.blocked = false; S.hookPending = null; return; }
    const c = d.claim;
    let b = '<div class="small">' + esc(c.text) + '</div>' + divider();
    b += '<div class="small"><b>他要：</b>' + esc(c.want || '一件你说不清的东西') + '</div>';
    b += '<div class="small muted">你当初拿到：' + esc(h.given) + '　·　来自 ' + esc(h.from) + '</div>';
    b += divider();
    b += '<ul class="opts">';
    b += optRow('A', '还', { name: '平和', cls: 'peace' }, '按他说的给', false, 'do;hookpay:' + h.id + ':pay');
    const r = c.refuse || {};
    b += optRow('B', '赖', { name: '风险', cls: 'risk' },
      '业力 +' + (r.karma || 0) + '　气血 −' + Math.round(Math.abs(r.hpPct || 0) * 100) + '%',
      false, 'do;hookpay:' + h.id + ':refuse');
    b += optRow('C', '斩', { name: '风险', cls: 'risk' }, '道心 −3　气血 −50%　从此两清',
      (S.stats.heart < 5), 'do;hookpay:' + h.id + ':cut');
    b += '</ul>';
    b += '<div class="hint">还，代价往往大于当初所得——这就是「收割」。<br>斩，是不认这笔账。天认不认，另说。</div>';
    openModal('人情 · ' + h.from, b, true);
  }

  ACT.do_hookpay = (id, choice) => {
    const h = hookUnsettled().find(function (x) { return x.id === id; });
    const d = hookDef(id);
    if (!h || !d) { S.hookPending = null; closeModal(); render(); return; }
    const c = d.claim || {};
    const e = c.effect || {};
    let msg = '', cls = '';

    if (choice === 'pay') {
      if (typeof e.xiuweiPct === 'number' && S.xiuwei) {
        S.xiuwei = Math.max(0, Math.round(S.xiuwei * (1 + e.xiuweiPct)));
      }
      if (typeof e.lifePct === 'number' && S.lifeMax) {
        S.lifeMax = Math.max(20, Math.round(S.lifeMax * (1 + e.lifePct)));
        S.age = Math.min(S.age, Math.max(1, S.lifeMax - 1));
      }
      if (typeof e.hpPct === 'number') S.hp = Math.max(1, S.hp + Math.round(S.hpMax * e.hpPct));
      if (typeof e.merit === 'number') S.merit = Math.max(0, S.merit + e.merit);
      if (typeof e.fame === 'number') S.fame = Math.max(0, S.fame + e.fame);
      if (typeof e.karma === 'number') S.karma += e.karma;
      if (e.takeGuowei && S.guowei) S.guowei = null;
      h.done = true;
      if (e.die) {
        h.blocked = false; S.hookPending = null;
        closeModal(); logLine(c.text, 'danger'); die(e.die); render(); return;
      }
      msg = '你还了。' + (c.want ? '（' + c.want + '）' : '');
      cls = 'danger';
    } else if (choice === 'refuse') {
      const r = c.refuse || {};
      S.karma += (r.karma || 15);
      if (r.hpPct) S.hp = Math.max(1, S.hp + Math.round(S.hpMax * r.hpPct));
      // 赖账不等于清账：debuff 留在身上，钩子继续挂着
      h.refused = true;
      h.done = false;
      h.overdue = true;
      h.refuseDebuff = r.debuff || 'karma_tangle';
      msg = '你没还。他看了你很久，什么也没说，转身走了。';
      cls = 'danger';
    } else {
      // 斩：一次性重代价，彻底清账
      S.stats.heart = Math.max(1, S.stats.heart - 3);
      S.hp = Math.max(1, S.hp - Math.round(S.hpMax * 0.5));
      h.done = true;
      msg = '你割了一刀在自己身上。这笔账从今天起断了——他不知道，天知道。';
      cls = 'good';
    }
    if (h.done) { h.blocked = false; h.overdue = false; h.refuseDebuff = null; }
    S.hookPending = null;
    closeModal();
    logLine(msg, cls);
    render();
  };

  function dueText(due) {
    if (!due) return '不定';
    switch (due.kind) {
      case 'realm': return isShen() ? ('第 ' + ((due.at || 0) + 1) + ' 柱') : (((D.XIAN_REALMS[due.at] || {}).name) || '某境');
      case 'year': return (due.at || 0) + ' 年后';
      case 'kill': return '你杀够 ' + (due.at || 1) + ' 人时';
      case 'weak': return '你重伤时';
      case 'guowei': return '你证位时';
      default: return '不定';
    }
  }

  /* 人情账面板 */
  ACT.openHooks = () => {
    const owe = hookUnsettled();
    const given = (S.hooksGiven || []).filter(function (x) { return !x.done; });
    let b = '<div class="small muted">恩与债都记在这里。它不改数值——改的是别人怎么对你。</div>' + divider();
    b += '<div class="small"><b>你欠的</b>　' + owe.length + ' / ' + HOOK_MAX + '</div>';
    if (!owe.length) b += '<div class="small muted">干净。</div>';
    owe.forEach(function (h) {
      b += '<div class="small" style="margin-top:6px"><b>' + esc(h.from) + '</b>　' + esc(h.given) +
        (h.overdue ? '　<span class="danger">已到期</span>'
          : (h.warned ? '　<span class="muted">有信了</span>' : '')) + '</div>';
      if (!h.known) b += '<div class="small muted">（你并不觉得自己欠了什么）</div>';
      b += '<div class="small muted">期：' + dueText(h.due) + '　起于 ' + h.born.y + ' 年</div>';
    });
    b += divider();
    b += '<div class="small"><b>别人欠你的</b>　' + given.length + '</div>';
    if (!given.length) b += '<div class="small muted">还没有。</div>';
    given.forEach(function (x) {
      b += '<div class="small" style="margin-top:4px">' + esc(x.to) + '　' + esc(x.what) +
        '　<span class="muted">' + x.y + ' 年</span></div>';
    });
    if (given.length) {
      b += '<div style="margin-top:8px"><button class="btn ghost" data-act="act:openGiven">去讨一次</button></div>';
    }
    const db = hookDebuffIds();
    if (db.length) {
      b += divider() + '<div class="small muted">身上缠着：' + db.map(function (id) {
        const d2 = (D.HOOK_DEBUFF || []).find(function (y) { return y.id === id; });
        return d2 ? esc(d2.name) : id;
      }).join('、') + '</div>';
      b += '<div class="small muted" style="margin-top:2px">' + hookSigns().join('　') + '</div>';
    }
    openModal('人情账', b);
  };

  /* 讨债：债的效力取决于你现在打不打得过他 */
  ACT.openGiven = () => {
    const given = (S.hooksGiven || []).filter(function (x) { return !x.done; });
    if (!given.length) { toast('没有人欠你'); return; }
    let b = '<div class="small">开一次口，可能还回来，也可能连这份情一起没了。</div><ul class="opts">';
    given.forEach(function (x, i) {
      b += optRow('ABC'[i] || '·', '找' + x.to + '要一次', { name: '机缘', cls: 'chance' },
        x.what + '（情分 ' + x.weight + '）', false, 'do;claim:' + i);
    });
    b += '</ul><div class="hint">对方境界若已远超你，他可以不还——而且你不能怎样。</div>';
    openModal('讨债', b);
  };

  ACT.do_claim = (i) => {
    const given = (S.hooksGiven || []).filter(function (x) { return !x.done; });
    const x = given[parseInt(i, 10)];
    if (!x) { closeModal(); render(); return; }
    const n = (S.npcs || {})[x.to];
    const fav = n ? n.fav : 30;
    const tooStrong = (x.power || 0) > computePower() * 2.2;
    let msg = '', cls = '';
    if (tooStrong) {
      msg = x.to + '笑了笑：「那点小事，你还记得。」——他没还，你也不能怎样。';
      cls = 'danger';
      x.done = true;
    } else if (rnd100() <= 30 + fav / 2) {
      S.stones += 200; S.fame += 6;
      msg = x.to + '还了：灵石 200，声望 +6。';
      cls = 'good';
      x.done = true;
      if (n) n.fav = clamp(n.fav + 5, 0, 120);
    } else {
      msg = x.to + '推说改日。这份情，就这么淡了。';
      cls = '';
      x.done = true;
      if (n) n.fav = Math.max(0, n.fav - 10);
    }
    closeModal(); logLine(msg, cls); render();
  };

  /* ============================================================
     v6.6 功过格（成就系统）
     原则一：零数值影响。S.ach / S.tally 不参与任何公式。
     原则二：跨局独立存储键 ACH_KEY，不跟存档走——这是整个设计的地基。
     原则三：判定走数据表的 test(s)，不写 if 链。少一个分支就是三十个按钮失灵。
     ============================================================ */
  const ACH_KEY = 'wxcs3.ach';
  let achBusy = false;

  function tly() {
    if (!S.tally || typeof S.tally !== 'object') S.tally = tallyInit();
    return S.tally;
  }
  function bump(k, n) { const t = tly(); t[k] = (t[k] || 0) + (n == null ? 1 : n); return t[k]; }
  function markIn(bag, key) {
    const t = tly();
    if (!t[bag] || typeof t[bag] !== 'object') t[bag] = {};
    t[bag][key] = 1;
  }
  function sellTally(price, channel) {
    const t = tly();
    t.sell = (t.sell || 0) + 1;
    if (price > (t.sellMax || 0)) t.sellMax = price;
    if (channel === 'auction') bump('auctionWin');
    if (channel === 'black') bump('blackSell');
  }
  function bumpIn(bag, key, n) {
    const t = tly();
    if (!t[bag] || typeof t[bag] !== 'object') t[bag] = {};
    t[bag][key] = (t[bag][key] || 0) + (n == null ? 1 : n);
  }

  /* ---------- 独立存储（烧页不清、换档不清） ---------- */
  function achDisk() {
    try {
      const o = JSON.parse(localStorage.getItem(ACH_KEY) || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }          // 隐私模式 / 坏数据：退化成「没有前世」
  }
  function achDiskSave(d) { try { localStorage.setItem(ACH_KEY, JSON.stringify(d || {})); } catch (e) { } }
  function achTierOf(id) { return D.ACH_TIERS.find(function (t) { return t.id === id; }) || D.ACH_TIERS[0]; }

  function unlockedMemories() {
    const disk = achDisk();
    return D.ACH_MEMORY.filter(function (m) {
      const a = D.ACHIEVEMENTS.find(function (x) { return x.id === m.from; });
      if (!a) return false;
      if (a.tier !== 'dian' && a.tier !== 'tian') return false;   // 只有入典及以上算「前世记得」
      return !!((S.ach && S.ach[m.from]) || disk[m.from]);
    });
  }

  function unlockAch(id, disk) {
    const a = D.ACHIEVEMENTS.find(function (x) { return x.id === id; });
    if (!a) return false;
    if (!S.ach) S.ach = {};
    if (S.ach[id]) return false;
    const d = disk || achDisk();
    if (d[id] && !S.ach[id]) { S.ach[id] = { y: d[id].y || 0, age: d[id].age || 0, realm: '前世', turn: S.turn || 0, past: true }; return false; }
    S.ach[id] = { y: S.year, m: S.month, age: S.age, realm: realmName(), turn: S.turn || 0 };
    d[id] = { y: S.year, age: S.age };
    achDiskSave(d);
    achToast(a);
    logLine('功过格 · ' + a.name + (a.poem ? '　' + a.poem : '　' + a.txt), 'good');
    return true;
  }

  function checkAch() {
    if (!S || S.phase === 'create' || achBusy) return;
    achBusy = true;
    try {
      const disk = achDisk();          // 只 parse 一次
      for (let i = 0; i < D.ACHIEVEMENTS.length; i++) {
        const a = D.ACHIEVEMENTS[i];
        if (S.ach && S.ach[a.id]) continue;
        // 前世已达成：标成 past（灰色 ◐），本局不再重复弹提示。
        // 旧写法 `|| disk[a.id]` 直接 continue，于是 past 标记永远写不进去，
        // 面板上的「◐ 前世」和「前世」页签整体失效。
        if (disk[a.id]) {
          if (!S.ach) S.ach = {};
          S.ach[a.id] = { y: disk[a.id].y || 0, age: disk[a.id].age || 0, realm: '前世', turn: 0, past: true };
          continue;
        }
        let ok = false;
        try { ok = !!a.test(S); } catch (e) { ok = false; }
        if (ok) unlockAch(a.id, disk);
      }
    } finally { achBusy = false; }
  }

  /* 竖笺滑入：与底部错误 toast 分开容器，否则会被覆盖 */
  function achToast(a) {
    try {
      const t = achTierOf(a.tier);
      /* 入典与天书一生只有十几条，值得停一下；传闻/载录/立传用 toast，
         否则一局弹几十次会把节奏砸碎。 */
      if ((a.tier === 'dian' || a.tier === 'tian') && a.poem && !modalBusy() && S.phase === 'play') {
        openVersePop('功过格 · ' + t.name, a.poem, [
          { k: a.name, v: esc(a.cond || '') }
        ], { sub: esc(t.name), tail: a.txt, btn: '记下', act: 'modal:close' });
        return;
      }
      let box = document.getElementById('achstack');
      if (!box) {
        box = document.createElement('div');
        box.id = 'achstack';
        document.body.appendChild(box);
      }
      const el = document.createElement('div');
      el.className = 'achtoast';
      el.style.borderLeftColor = t.color;
      el.innerHTML = '<div class="at">功过格 · ' + esc(t.name) + '</div>' +
        '<div class="an" style="color:' + t.color + '">' + esc(a.name) + '</div>' +
        (a.poem ? '<div class="apoem">' + esc(a.poem) + '</div>' : '') +
        '<div class="ad">入道' + Math.floor((S.turn || 0) / 12) + ' 年 · ' + (S.age || 0) + ' 岁</div>';
      box.appendChild(el);
      /* 最多留 3 条：旧版一局连打能叠满右屏，把主线遮住 */
      if (box.children && box.removeChild) {
        let guard = 0;
        while (box.children.length > 3 && guard++ < 50) {
          const old = box.children[0];
          if (!old) break;
          box.removeChild(old);
        }
      }
      const kill = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el._h = setTimeout(kill, 3400);
      /* 悬停暂停：玩家想读诗时别让它自己消失 */
      el.onmouseenter = function () { clearTimeout(el._h); };
      el.onmouseleave = function () { el._h = setTimeout(kill, 1800); };
    } catch (e) { }
  }

  function achStat() {
    const disk = achDisk();
    const cats = { '道': 0, '艺': 0, '争': 0, '缘': 0, '势': 0, '秘': 0, '过': 0, '隐': 0 };
    let now = 0, past = 0, tian = 0, tianAll = 0;
    D.ACHIEVEMENTS.forEach(function (a) {
      const inNow = !!(S.ach && S.ach[a.id]);
      const inPast = !inNow && !!disk[a.id];
      if (a.tier === 'tian') { tianAll++; if (inNow || inPast) tian++; }
      if (inNow) { now++; cats[a.cat] = (cats[a.cat] || 0) + 1; }
      else if (inPast) past++;
    });
    return { now: now, past: past, cats: cats, tian: tian, tianAll: tianAll, mem: unlockedMemories().length };
  }

  /* 称号：取本局已达成的最高档（同档取最近达成） */
  function topAch() {
    const order = ['wen', 'zai', 'li', 'dian', 'tian'];
    let best = null, bi = -1, bt = -1;
    D.ACHIEVEMENTS.forEach(function (a) {
      if (!(S.ach && S.ach[a.id])) return;
      const i = order.indexOf(a.tier);
      const tt = (S.ach[a.id] || {}).turn || 0;
      if (i > bi || (i === bi && tt > bt)) { bi = i; bt = tt; best = a; }
    });
    return best;
  }

  /* ---------- 每月结算 ---------- */
  function afterMonthTally() {
    const t = tly();
    if ((S.stones || 0) <= 0) t.stones0 = (t.stones0 || 0) + 1; else t.stones0 = 0;
    if (S.inDongtian) bump('dongtianMonth');
    if (S.pillThisMonth) { t.pillStreak = (t.pillStreak || 0) + 1; S.pillThisMonth = false; }
    else t.pillStreak = 0;
    const n = ledgerNet();
    if (n && n.net > (t.bestMonthNet || 0)) t.bestMonthNet = n.net;
    if (S.collapse >= 3 && S.phase === 'play') bump('collapseSurvive');
    // 寿元将尽却突破成功
    if (S.justBrokeEdge) { S.justBrokeEdge = false; bump('edgeBreak'); }
  }

  /* ---------- 战斗记账 ---------- */
  function combatTierNow(c) {
    if (!c || !c.foe) return '相持';
    const R = computePower() / Math.max(1, c.foe.power);
    return R >= 3 ? '碾压' : R >= 1.5 ? '压制' : R >= 0.8 ? '相持' : R >= 0.4 ? '下风' : '绝境';
  }
  function noteCombatWin(c) {
    if (!c || !c.foe) return;
    /* v8.0：仇家是活的。打赢寻仇的人，这笔账才算清；
       否则 S.enemy 永远为 true，成了没人读的摆设。 */
    if (c.isVengeance === 'sect' && S.enemySect) {
      S.enemySect = false;
      S.fame += 12;
      logLine('三个都留下了。你把令牌收进怀里，从此不打算再回那座山。', 'danger');
    } else if (c.isVengeance && S.enemy) {
      S.enemy = false;
      S.fame += 10;
      S.stones += 200;
      logLine('仇了了一段。你把他埋了，碑上没写名字。', 'good');
      S.enemyName = null;
      /* v10.1 第一梯队：补上 oldGrudge 计数器。
         这条成就此前被 check_ach 的归档白名单挡住（理由写作「S.enemy 只置位、
         无击杀路径」），但击杀链其实早在 v8.0 就通了——玩法在，计数器没接，
         于是检查器永远报绿。现在接上，白名单那一条同时删掉。 */
      bump('oldGrudge');
    }
    const t = tly();
    t.warWin = (t.warWin || 0) + 1;
    t.kill = (t.kill || 0) + 1;          // 钩子的「期：你杀够 N 人时」用
    if ((c.round || 0) <= 0) bump('warOne');
    if ((c.round || 0) >= 10) bump('warHold');
    const foeRealm = realmIdxRank(c.foe.rank), myRealm = myRealmIdx();
    if (foeRealm - myRealm >= 1) {
      bump('warOver');
      if (!c.usedPill) bump('overNoPill');
    }
    if (combatTierNow(c) === '绝境') bump('reverseWin');
    if (t.saveMonth === S.turn) bump('saveAndKill');
    if (c.foe.king) bump('kingKill');
    if (c.foe.god) bump('godKill');
  }

  /* ---------- 前世残忆 ---------- */
  function applyMemory(m) {
    if (!m) return false;
    if (m.id === 'm_light') { S.lingqiUp = (parseInt(S.lingqiUp, 10) || 1) + 1; syncLingqi(); }
    else if (m.id === 'm_word') { S.stats.insight = clamp(S.stats.insight + 2, 1, 20); }
    else if (m.id === 'm_xiang') { S.followers = (S.followers || 0) + 50; }
    else if (m.id === 'm_hand') { S.hpFlatBonus = (S.hpFlatBonus || 0) + 20; recalcCaps(true); S.hp = S.hpMax; }
    else if (m.id === 'm_gate') { S.fame = (S.fame || 0) + 30; }
    else if (m.id === 'm_wei') { S.stones = (S.stones || 0) + 500; }
    else if (m.id === 'm_qian') { S.memPreach = true; }
    else if (m.id === 'm_sha') { S.memFirstStrike = true; }
    else if (m.id === 'm_xue') { S.merit = (S.merit || 0) + 30; S.karma = (S.karma || 0) + 20; }
    else if (m.id === 'm_fire') { return 'needart'; }
    S.legacyMemory = m.id;
    S.bloodDebt = (S.bloodDebt || 0) + 0.05;       // 接上「世界记得你」
    logLine('你记得一些不该记得的事——' + m.name + '（' + m.eff + '）。', 'good');
    return true;
  }

  function offerMemory() {
    const mem = unlockedMemories();
    if (!mem.length) return false;
    let b = '<div class="small">烧掉的页数不会白烧。你从这一生里记住了一样东西。</div>';
    b += '<div class="small muted" style="margin:4px 0">只能带一项，不叠加，不消耗。</div>' + divider();
    b += '<ul class="opts">';
    mem.forEach(function (m) {
      b += optRow('·', m.name, { name: '残忆', cls: 'chance' }, esc(m.eff), false, 'do;mem:' + m.id);
    });
    b += '</ul>';
    b += '<div style="margin-top:10px"><button class="btn ghost" data-act="do;mem:none">什么都不带</button></div>';
    b += '<div class="hint">代价：血债 +5%。世界记得你，你也记得一些不该记得的事。</div>';
    openModal('百世书 · 前世残忆', b);
    return true;
  }

  ACT.do_mem = (id) => {
    if (!id || id === 'none') { closeModal(); render(); return; }
    const m = D.ACH_MEMORY.find(function (x) { return x.id === id; });
    if (!m) { closeModal(); return; }
    if (!unlockedMemories().some(function (x) { return x.id === id; })) { toast('尚未解锁'); return; }
    if (m.id === 'm_fire') { openMemArt(); return; }
    applyMemory(m);
    closeModal(); toast('残忆 · ' + m.name); render();
  };

  function openMemArt() {
    let b = '<div class="small">你记得火候，但只记得一门。</div>' + divider() + '<ul class="opts">';
    D.CRAFT_ARTS.forEach(function (a) {
      b += optRow('·', a.name, { name: '技艺', cls: 'peace' }, '直入三品', false, 'do;memart:' + a.id);
    });
    b += '</ul>';
    openModal('记得火候', b);
  }

  ACT.do_memart = (art) => {
    const a = D.CRAFT_ARTS.find(function (x) { return x.id === art; });
    if (!a) return;
    S.craft = S.craft || { dan: 0, qi: 0, fu: 0, zhen: 0 };
    S.craftLv = S.craftLv || { dan: 1, qi: 1, fu: 1, zhen: 1 };
    S.craft[art] = Math.max(S.craft[art] || 0, D.CRAFT_LEVELS[2].need);
    S.craftLv[art] = 3;
    S.legacyMemory = 'm_fire';
    S.memFireArt = art;
    S.bloodDebt = (S.bloodDebt || 0) + 0.05;
    const m = D.ACH_MEMORY.find(function (x) { return x.id === 'm_fire'; });
    logLine('你记得' + a.name + '的火候——直接到了三品。', 'good');
    closeModal(); toast('残忆 · ' + m.name); render();
  };

  /* ---------- 面板 ---------- */
  ACT.openAch = () => { if (!S.achTab) S.achTab = 'gong'; renderAch(); };
  ACT.do_acht = (k) => { S.achTab = k || 'gong'; renderAch(); };

  function achRowHtml(a, disk) {
    const t = achTierOf(a.tier);
    const rec = (S.ach || {})[a.id];
    const inNow = !!rec && !rec.past;
    const inPast = !!disk[a.id];
    const hidden = !!a.hidden && !inNow && !inPast;
    const cls = inNow ? 'on' : inPast ? 'past' : 'off';
    const meta = inNow ? (esc(rec.realm || '') + ' · ' + (rec.age || 0) + ' 岁')
      : inPast ? ('前世 · ' + (disk[a.id].age || 0) + ' 岁') : '——';
    let b = '<div class="achrow ' + cls + '">';
    // 圆点用 CSS 画，不依赖字体里的 ●◐○（◐ 缺字会渲染成方块）
    b += '<span class="adot ' + cls + '" style="--tc:' + t.color + '"></span>';
    b += '<span class="atier" style="color:' + t.color + '">' + esc(t.name) + '</span>';
    b += '<span class="aname">' + esc(a.name) + '</span>';
    b += '<span class="ameta">' + meta + '</span>';
    b += '<div class="acond">' + esc(hidden ? '？' : (a.cond || '')) + '</div>';
    if (inNow || inPast) {
      if (a.poem) b += '<div class="atxt">' + esc(a.poem) + '</div>';
      b += '<div class="atxt2">' + esc(a.txt) + '</div>';
    }
    b += '</div>';
    return b;
  }

  function renderAch() {
    if (!S) return;
    const tab = S.achTab || 'gong';
    const st = achStat();
    const disk = achDisk();
    const gongN = st.cats['道'] + st.cats['艺'] + st.cats['争'] + st.cats['缘'] + st.cats['势'] + st.cats['秘'];
    let b = '<div class="achhdr">本局　功 ' + gongN + ' · 过 ' + st.cats['过'] + ' · 隐 ' + st.cats['隐'] +
      '　｜　前世 ' + st.past + '　天书 ' + st.tian + '/' + st.tianAll + '</div>';
    b += '<div class="achtabs">';
    [['gong', '功'], ['guo', '过'], ['yin', '隐'], ['qian', '前世']].forEach(function (x) {
      b += '<span class="achtab' + (tab === x[0] ? ' on' : '') + '" data-act="do;acht:' + x[0] + '">' + x[1] + '</span>';
    });
    b += '</div>';
    b += '<div class="achlist">';
    if (tab === 'qian') {
      b += '<div class="small muted" style="margin-bottom:6px">入典及以上成就解锁「前世残忆」。达成一条解锁一项，每局只带 1 项。</div>';
      if (!st.mem) b += '<div class="small muted">还没有任何入典成就——先把一生走到金丹试试。</div>';
      D.ACH_MEMORY.forEach(function (m) {
        const a = D.ACHIEVEMENTS.find(function (x) { return x.id === m.from; });
        const ok = !!a && (a.tier === 'dian' || a.tier === 'tian') &&
          !!((S.ach && S.ach[m.from]) || disk[m.from]);
        const cur = S.legacyMemory === m.id;
        b += '<div class="achrow ' + (cur ? 'on' : ok ? 'past' : 'off') + (ok && !cur ? ' clickable' : '') + '"' +
          (ok && !cur ? ' data-act="do;mem:' + m.id + '"' : '') + '>';
        b += '<span class="adot ' + (cur ? 'on' : ok ? 'past' : 'off') + '" style="--tc:var(--gold)"></span>';
        b += '<span class="atier" style="color:' + (ok ? 'var(--gold)' : '#B9B2A6') + '">残忆</span>';
        b += '<span class="aname">' + esc(m.name) + '</span>';
        b += '<span class="ameta">' + (cur ? '已带' : ok ? '可选' : '未解锁') + '</span>';
        b += '<div class="acond">' + esc(m.eff) + '</div>';
        if (ok) b += '<div class="atxt">来自「' + esc(a ? a.name : m.from) + '」</div>';
        b += '</div>';
      });
    } else {
      const cats = tab === 'gong' ? ['道', '艺', '争', '缘', '势', '秘'] : tab === 'guo' ? ['过'] : ['隐'];
      D.ACHIEVEMENTS.forEach(function (a) {
        if (cats.indexOf(a.cat) < 0) return;
        b += achRowHtml(a, disk);
      });
    }
    b += '</div>';
    const t = topAch();
    if (t) b += '<div class="hint">称号：' + esc(t.name) + '（本局最高成就，纯装饰，无数值）</div>';
    b += '<div class="hint">功过格不参与任何公式——它只记，不算。你死了，账还在。</div>';
    openModal('功过格 · 一生总账', b);
  }


  /* 导出给自动化测试用：dispatch / render / ACT，正式运行时只依赖 boot。
     advanceXun 也导出——测试要精确控制「过了几旬」，用动作间接推进
     会把修为、事件一起带上，断言就不干净了。 */
  G.WXCS3 = { boot, dispatch, render, ACT, advanceXun, advanceMonth,
    get S() { return S; }, get D() { return D; },
    /* 只读探针：给测试与模拟脚本看「这类劫对谁有利」 */
    tribInfo: function (id) {
      const t = tribDetail(id), c = tribCounter(id);
      return { id: id, name: t.name, test: t.test, bonus: c.bonus, text: c.text };
    },
    tribRoll: function () { return rollTribulation().id; },
    /* v8.1 P0 M4/M6：只读探针。测试要能验「兽养没养成、属性看不看得见」，
       而这些函数在模块内是私有的——不给出口，就只能靠面板 HTML 猜。 */
    applyState,
    gainXiuwei,
    addGongfa,
    /* v10.5 P0：上限/能力三分的只读与可驱动探针，供测试验「真改了上限」 */
    recalcCaps,
    capBase,
    getDaogong,
    artSpecOf,
    learnArt,
    hasArt,
    applyMemory,
    /* v10.5 P1/P2：经济与口径的只读探针，供回归测试验「显示价=结算价」 */
    buyPriceOf, sellPriceOf, sellMul, marketLimit, marketSold,
    hpRatio, craftedValueOf, pillHealOf, skillCostOf, shenTongCostOf,
    gapMul, canGrantShenTong, ledgerNet, applyPill,
    settleCombatWin,
    checkAch,
    clue,
    statTier,
    beastAtkBonus,
    barnCap,
    masterKilled,
    masterCheckOnKill,
    discipleStageOf,
    tallyInit,
    /* v9.0 M0：随机源探针。测试要验「同 seed 可复现」，
       必须能自己设种子、读当前种子，而不是靠外部改 Math.random。 */
    /* v10.1 第一梯队：可达性测试需要直接驱动结局判定与战斗记账，
       否则只能靠"玩到那一步"来验，而结局恰恰最难玩到。 */
    resolveEnding,
    noteCombatWin,
    renderCombat,
    /* v10.7 P1：导航探针。
       回归测试要验「dockItems 的每个入口都在左导航里、且每个入口的动作都能派发」，
       没有探针就只能靠肉眼数按钮——那正是本轮要消灭的验证盲区。 */
    dockItems, navGroups, navGroupOf,
    talBuffMul, preBoostMul, TAL_BUFF_TURNS,
    /* v10.7 阶段二：破境 FIFO 与本命迁移探针。
       测试要验「每一步都能续接」「迁移两次结果一致」，没有出口就只能靠点 UI。 */
    afterBreakDone, afterBreakStepDone, migrateBenming,
    pageCount,
    setSeed,
    getSeed: currentSeed,
    rng,
    costLine,
    /* v9.0 M0：事件池探针。验的是「when 真的在筛事件」，
       否则条件字段又会变成写不读的死字段。 */
    eventSlot,
    /* v10.6：事件结算探针。事件现在能落法宝、落 flag（eff.art / eff.flag），
       验「写了就结算」必须能单发一条事件，而不是靠抽。 */
    applyEvent,
    /* v9.0 第1步：给扩展文件用的最小工具面。
       只导出「写纪事 / 弹提示」两个，不给扩展开 render 与内部状态，
       避免扩展绕过既有渲染管线另起一套。
       v9.0 M1：命格/天劫/构筑三个扩展需要 UI 工具与只读探针，
       补 esc/clamp/fmtNum/optRow/divider/openModal/closeModal 与 buildInfo。 */
    logLine,
    toast,
    esc, clamp, fmtNum, optRow, divider,
    openModal, closeModal,
    buildInfo,
    /* v10.4 P2·12：功法熟练度探针（扩展读取，避免扩展闭包里再算一遍） */
    gfProfPeek: gfProfProbe,
    addGfProf,
    get EXT_ACT() { return EXT_ACT; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
