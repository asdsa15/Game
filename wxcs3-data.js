/* 问道长生 v6.2 · 数据层
   三套体系：
   - 仙道（主流）：六境 胎息→练气→筑基→紫府→金丹→道胎，修灵气
   - 神道（备选）：八柱，修香火，只在洞天
   - 上古十境（传说）：只剩遗迹残卷
   依据 v6 三份设定文档
*/
(function (G) {
  'use strict';

  /* ====== 十二真君 × 八柱 · 九十六庙（从 v6 附录 G 原表抽取） ====== */
  const ZHENJUN = [
    { id: 'g1', name: '山河障市真君', zodiac: '龙', keywords: '君，帝王，尊贵，龙，江山，地域，空间',
      temples: [
        { tier: 1, name: '河神庙', scope: '海洋、河流、湖泊、灌溉、大小泾渭、流域水系' },
        { tier: 2, name: '山神庙', scope: '山脉、高原平原、地质、岩石、矿物、草木' },
        { tier: 3, name: '宫廷庙', scope: '华堂、皇权、至尊、贵显、璎珞绝世、帝王仪礼' },
        { tier: 4, name: '六律庙', scope: '宫庭之道、帝王心术、封建昏君、驭民五术、处事百姓' },
        { tier: 5, name: '巡世庙', scope: '观世音、监六道、听八极、照人间、地方治理' },
        { tier: 6, name: '祭天庙', scope: '开坛求雨、晴雨天气、大旱大涝、司掌气象' },
        { tier: 7, name: '韬略庙', scope: '兵阵、阵法、谋算、韬略、兵法、战争' },
        { tier: 8, name: '疆域庙', scope: '疆域封疆、空间转移、地方限制、开辟空间、创造小世界' },
      ] },
    { id: 'g2', name: '市井江湖真君', zodiac: '狗', keywords: '民，九流，烟火，人，饮食，风俗，时间',
      temples: [
        { tier: 1, name: '喜婚庙', scope: '婚姻喜红事、喜庆仪典、媒妁、娱婚' },
        { tier: 2, name: '丧事庙', scope: '丧葬、殡仪习俗、出殡下葬、造棺抬棺' },
        { tier: 3, name: '家宅庙', scope: '宅里宅外、祖宗祠、祖先、家宅平安、镇宅' },
        { tier: 4, name: '市井庙', scope: '三教九流、婚丧生计、街巷邻里、一技之长、处事营生' },
        { tier: 5, name: '村乡庙', scope: '农耕种植、野神农神、作物丰收、四季种植' },
        { tier: 6, name: '文庙', scope: '知识传承、文字书籍、百家思想、文明传承' },
        { tier: 7, name: '灶食庙', scope: '灶火、饮食、盐酱、烹馔、锅灶' },
        { tier: 8, name: '习俗庙', scope: '传统节日、地方风俗、四季节令、昼夜子午' },
      ] },
    { id: 'g3', name: '关外北马真君', zodiac: '鸡', keywords: '乱，村野，苦难，贼，畜生，动荡，迷信',
      temples: [
        { tier: 1, name: '五家仙庙', scope: '胡黄白灰、乡野五家仙、动物神' },
        { tier: 2, name: '五弊三缺庙', scope: '鳏寡孤独、盲哑聋、身体残疾、肉体苦难' },
        { tier: 3, name: '山猎庙', scope: '狩猎、山林探险、探山宝、野外生存、寻路' },
        { tier: 4, name: '兵灾庙', scope: '匪乱、战争、兵刃之灾、怒纵慌乱、枪炮祸爆' },
        { tier: 5, name: '瘟灾庙', scope: '疾病传播、瘟疫扩散、菌病、寄生物感染' },
        { tier: 6, name: '荒灾庙', scope: '蝗虫、旱涝、粮无收、枯树、作物枯萎' },
        { tier: 7, name: '结缘庙', scope: '人际关系、相识结缘、仇恨结怨' },
        { tier: 8, name: '动荡庙', scope: '世衰象教、教唆、动摇人心、动乱' },
      ] },
    { id: 'g4', name: '侠武乱禁真君', zodiac: '马', keywords: '侠，武术，劳力，镖，功夫，宗师，乱禁',
      temples: [
        { tier: 1, name: '五脏庙', scope: '脏府、六腑、脏官、五气、呼吸运气、器官' },
        { tier: 2, name: '形意庙', scope: '拟动物、植物、天气、自然现象、拟兽形神' },
        { tier: 3, name: '横练庙', scope: '外家功夫、筋骨、血肌、肉身强横、金身' },
        { tier: 4, name: '百兵庙', scope: '化身刀剑戟、斧钺钩叉、兵神兵器' },
        { tier: 5, name: '人秘庙', scope: '人体隐秘、特殊基因、特异功能、潜力激发、超自然' },
        { tier: 6, name: '行天下庙', scope: '车行路、过水渡河、上天入地、通行无阻' },
        { tier: 7, name: '宗师庙', scope: '开宗立派、传武守教、教徒规训、创法传承、名扬天下' },
        { tier: 8, name: '乱禁庙', scope: '打破规则定制、侠行大恩、谋逆居龙' },
      ] },
    { id: 'g5', name: '生死岐黄真君', zodiac: '猴', keywords: '医，诊病，医官，药，手术，接骨，济世',
      temples: [
        { tier: 1, name: '丹药庙', scope: '炼丹、制药、识药草、用药性' },
        { tier: 2, name: '望问庙', scope: '望诊、问诊、断疾、断病情' },
        { tier: 3, name: '偏方庙', scope: '不循药理古法、偏方、邪疾邪治' },
        { tier: 4, name: '正骨庙', scope: '骨骼、髓、接骨、牙齿、跌打损伤' },
        { tier: 5, name: '疡医庙', scope: '开膛、五脏手术、切除、内外科' },
        { tier: 6, name: '祝由庙', scope: '精法术、道医神术、心理医疗、催眠暗示' },
        { tier: 7, name: '伤寒庙', scope: '治疗发炎、病毒细菌、内外寒热' },
        { tier: 8, name: '内经庙', scope: '经络筋脉、血液、内分泌激素' },
      ] },
    { id: 'g6', name: '南洋邪灵真君', zodiac: '蛇', keywords: '毒，诅咒，邪神，巫，蛊毒，灵媒，左道',
      temples: [
        { tier: 1, name: '蛊虫庙', scope: '蛊虫、驱虫、毒物、蛊毒' },
        { tier: 2, name: '降头庙', scope: '邪术、邪降、死咒、诅咒、降头' },
        { tier: 3, name: '打春庙', scope: '土瘟、秽病、湿气、黄牛、牲畜传染病' },
        { tier: 4, name: '盐饲庙', scope: '蛊、下蛊、蛊虫、蛊毒' },
        { tier: 5, name: '龙婆庙', scope: '预言、念经、阿赞、显圣、神迹' },
        { tier: 6, name: '佛牌庙', scope: '护身正牌、人缘、四面神、挡降贝' },
        { tier: 7, name: '巫媒庙', scope: '通灵、邪神、巫法、邪术、灵媒、草药' },
        { tier: 8, name: '刺符庙', scope: '刺青、纹身、皮符、善信画符' },
      ] },
    { id: 'g7', name: '西传密藏真君', zodiac: '虎', keywords: '佛，密宗，普渡，藏，皈依，因果，轮回',
      temples: [
        { tier: 1, name: '戒律庙', scope: '戒、杀盗淫妄酒、衣戒、受戒' },
        { tier: 2, name: '护法神庙', scope: '金刚、佛兵、护法、天母' },
        { tier: 3, name: '业障庙', scope: '鬼祟、邪孽、业障、损福、报应' },
        { tier: 4, name: '无量庙', scope: '虚空、不可计量的时辰、寿命' },
        { tier: 5, name: '化缘庙', scope: '布施、人际结交、佛珠、募集' },
        { tier: 6, name: '苦行庙', scope: '肉体折磨、恒河沐浴、焚身升天' },
        { tier: 7, name: '六道庙', scope: '畜生、修罗、饿鬼、地狱' },
        { tier: 8, name: '普渡庙', scope: '超度众生、救济、大慈悲、解脱' },
      ] },
    { id: 'g8', name: '天师法道真君', zodiac: '羊', keywords: '道，五行，长生，天，无为，出世，自然',
      temples: [
        { tier: 1, name: '养生庙', scope: '长寿、生养、辟谷、清心' },
        { tier: 2, name: '森罗庙', scope: '金木水火土、五行、四象、自然元素' },
        { tier: 3, name: '心魔庙', scope: '幻术、迷惘、幻象、迷惑、惑心' },
        { tier: 4, name: '授箓庙', scope: '符、箓、法诀、存图' },
        { tier: 5, name: '五雷庙', scope: '掌心雷、天罡、驱邪、雷击' },
        { tier: 6, name: '镇妖庙', scope: '山禁、解厄、驱邪、镇魔、收鬼' },
        { tier: 7, name: '三尸七魄庙', scope: '僵尸、伏矢、雀阴、吞噬、臭肺' },
        { tier: 8, name: '无为庙', scope: '隐世、出世、无为、道不可道' },
      ] },
    { id: 'g9', name: '神工百匠真君', zodiac: '牛', keywords: '匠，工艺，美，行，工业，造物，科学',
      temples: [
        { tier: 1, name: '丹青庙', scope: '水墨、彩绘、描摹、色彩' },
        { tier: 2, name: '营造庙', scope: '建筑、桥梁、房屋、园林、亭台楼阁' },
        { tier: 3, name: '篆刻庙', scope: '雕刻、打磨、印章、玉刻' },
        { tier: 4, name: '木工庙', scope: '锯、刨、榫卯、凿钻' },
        { tier: 5, name: '火工庙', scope: '冶炼、金属、陶瓷、锻造' },
        { tier: 6, name: '织纺庙', scope: '皮革、织绣、编织、制绳' },
        { tier: 7, name: '机巧庙', scope: '机关、精巧构造、齿轮器械' },
        { tier: 8, name: '曲乐庙', scope: '音律、优伶乐师、宫商角徵羽' },
      ] },
    { id: 'g10', name: '百无禁忌真君', zodiac: '猪', keywords: '脏，邪祟，尸体，死，葬，风水，忌讳',
      temples: [
        { tier: 1, name: '五谷轮回庙', scope: '五谷轮回、脏污、排泄物、消化系统' },
        { tier: 2, name: '墓葬庙', scope: '下葬、阴宅、墓室、陵寝' },
        { tier: 3, name: '仵作庙', scope: '仵作、法医、尸检、人体学' },
        { tier: 4, name: '移山挪岭庙', scope: '堪舆、风水、掘山、探穴、捉脉、拿龙' },
        { tier: 5, name: '厌胜庙', scope: '镇宅、厌镇、厌物、辟邪、住宅风水' },
        { tier: 6, name: '鉴相庙', scope: '人面、面相、手形、纹理' },
        { tier: 7, name: '鬼话庙', scope: '志怪、野兽传说、鬼故事' },
        { tier: 8, name: '生死庙', scope: '阴司、死亡、生殖、凋零、复活' },
      ] },
    { id: 'g11', name: '福宝衰运真君', zodiac: '鼠', keywords: '命，生辰，商贾，运，八字，命理，玄学',
      temples: [
        { tier: 1, name: '衰运庙', scope: '倒卖、衰运、衰年、流年不利' },
        { tier: 2, name: '财运庙', scope: '五显、五通、五盗、商贾、聚财' },
        { tier: 3, name: '福运庙', scope: '寿康宁、福报、功名利禄、心想事成' },
        { tier: 4, name: '八字庙', scope: '生辰八字、月令、命理、厄运' },
        { tier: 5, name: '姻缘庙', scope: '男女缘分、爱情预测、婚姻走向' },
        { tier: 6, name: '凶煞庙', scope: '克命、克夫、四柱神煞' },
        { tier: 7, name: '算术庙', scope: '推算、计数、周易、八卦' },
        { tier: 8, name: '劫难庙', scope: '灾劫、坎、命不由人、天注定' },
      ] },
    { id: 'g12', name: '天外逐岁真君', zodiac: '兔', keywords: '妙，悖论，星宿，理，太空，哲学，神秘',
      temples: [
        { tier: 1, name: '经学庙', scope: '哲学、悖论、原理、伦理' },
        { tier: 2, name: '观星庙', scope: '星宿、太阴太阳、纪年、天文、太空' },
        { tier: 3, name: '黄粱庙', scope: '梦境、神幻、幻梦、虚诞、假寐、睡眠' },
        { tier: 4, name: '神秘庙', scope: '非科学、不可名状、超自然、无法解释' },
        { tier: 5, name: '物理庙', scope: '宏观作用力、电磁、重力引' },
        { tier: 6, name: '基因庙', scope: '编译、物种杂交、遗传信息' },
        { tier: 7, name: '微观庙', scope: '化学反应、微观粒子、分子原子' },
        { tier: 8, name: '能量庙', scope: '热能、辐射、量子、暗能量、星轨' },
      ] },
  ];

  /* ====== 六维 ====== */
  const STATS = {
    qualify: { name: '资质', desc: '修为/香火转化（每点 +5%，本作按 ÷10 计）' },
    insight: { name: '悟性', desc: '参悟功法、顿悟、技艺、自创法门' },
    sense:   { name: '神识', desc: '探查、炼丹炼器、抗幻术降头' },
    speed:   { name: '遁速', desc: '移动、战斗先手、逃跑' },
    heart:   { name: '道心', desc: '破境、抗心魔、不被自家力量吞噬' },
    fate:    { name: '仙缘', desc: '显圣灵验、奇遇、绝境逢生' }
  };

  /* ====== 主修（v6 第一条决定） ====== */
  const CULTIVATION = [
    { id: 'xian', name: '仙道', desc: '灵气·六境·果位·正统身份，只认灵石', cost: '会老死（寿元是硬约束）', default: true },
    { id: 'shen', name: '神道', desc: '香火·八柱·神位编制·香火续命，养庙也要灵石', cost: '进境约为仙道的 1/4；庙毁即废；受祀部管辖' },
    { id: 'both', name: '未定', desc: '两边都能碰', cost: '前两阶各 −20% 效率；立庙或筑基时被迫二选一' }
  ];

  /* ====== 仙道六境 ====== */
  const XIAN_REALMS = [
    { idx: 0, name: '胎息', ancient: '养轮', stages: ['玄景轮', '承明轮', '周行轮', '青元轮', '玉京轮', '灵初轮'],
      stageLabel: '轮', need: 30, base: 10, life: 120, power: 8,
      key: '聚八十一缕灵气，凝成玄景轮' },
    { idx: 1, name: '练气', ancient: '服气', stages: ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层'],
      stageLabel: '层', need: 150, base: 9, life: 200, power: 25,
      key: '采吞天地灵气，配合功法' },
    { idx: 2, name: '筑基', ancient: '', stages: ['初期', '中期', '后期', '圆满'],
      stageLabel: '阶', need: 300, base: 8, life: 400, power: 90,
      key: '六轮兵解，铸一道仙基；集齐道途四印' },
    { idx: 3, name: '紫府', ancient: '炼神', stages: ['一关', '二关', '三关'],
      stageLabel: '关', need: 1000, base: 6, life: 700, power: 350,
      key: '推仙基入升阳 → 破蒙昧之念 → 渡无尽幻想' },
    { idx: 4, name: '金丹', ancient: '求性', stages: ['金丹'],
      stageLabel: '', need: 0, base: 0, life: 1200, power: 1500,
      key: '煅出金性，设法仪引来果位，立护道' },
    { idx: 5, name: '道胎', ancient: '元婴', stages: ['道胎'],
      stageLabel: '', need: 0, base: 0, life: null, power: 6000,
      key: '以己心代天心之后' }
  ];

  /* ====== 气血 / 灵力上限基数（v10.5 P0·C1） ======
     旧版上限在创角写死 100，破境只改寿元，于是境界、修炼、功法、淬体的成长
     全部挤在 100 的尺度里。这里给「境界基数」，乘区（淬体/受箓/功法）另算。
     数值取每境约 ×1.8~2.0，与 power 的 ×2.5~4 解耦：
     气血不该跟着战力指数爆炸，否则丹药与固定伤害全部失真。 */
  const CAP_BASE = {
    xian: {
      hp: [100, 180, 320, 600, 1200, 2400],   // 胎息→道胎
      mp: [100, 160, 260, 420, 700, 1200]
    },
    shen: {
      hp: [100, 150, 240, 380, 600, 950, 1500, 2400], // 一柱→八柱
      mp: [100, 140, 200, 300, 450, 650, 950, 1400]
    }
  };
  /* 每小阶 / 每位 +4%：六境共 32 个小阶，满阶也只多三成，不与大境基数抢戏 */
  const CAP_STAGE_STEP = 0.04;

  /* 仙基品阶 */
  const XIANJI = [
    { name: '黄基', cond: '黄阶功法＋普通灵脉', limit: 1, note: '粗胚，一场大战就能打裂' },
    { name: '玄基', cond: '玄阶功法＋浓郁灵脉', limit: 2, note: '有纹有理' },
    { name: '地基', cond: '地阶功法＋福地', limit: 3, note: '庙毁基不毁' },
    { name: '天基', cond: '天阶功法＋洞天福地＋机缘', limit: 4, note: '「位」的雏形' }
  ];

  /* 练气采气 → 道统倾向 */
  const QI_TO_DAOTONG = {
    metal: ['兑金', '庚金'], wood: ['正木', '保木'],
    water: ['坎水', '府水'], fire: ['离火', '真火'], earth: ['艮土', '戊土']
  };

  /* ====== 灵气系数 ====== */
  const LINGQI = [
    { name: '贫瘠', v: 0.6 }, { name: '普通', v: 1.0 }, { name: '浓郁', v: 1.5 },
    { name: '福地', v: 2.0 }, { name: '洞天', v: 2.5 }
  ];

  /* ====== 灵根 ====== */
  const ROOTS = {
    heaven: { name: '天灵根', load: 2.0, mul: 2.0, els: 1, desc: '单系，万中无一' },
    earth:  { name: '地灵根', load: 1.6, mul: 1.6, els: 2, desc: '双系，主次分明' },
    true_:  { name: '真灵根', load: 1.3, mul: 1.3, els: 3, desc: '三系，均衡' },
    pseudo: { name: '伪灵根', load: 1.0, mul: 1.0, els: 4, desc: '四/五系，杂而不精' },
    mutate: { name: '变异灵根', load: 1.8, mul: 1.8, els: 1, desc: '雷/风/冰/阴/阳' }
  };

  const ELEMENTS = {
    metal: { name: '金', color: '#C9A45C', ke: 'wood' },
    wood:  { name: '木', color: '#6BA38E', ke: 'earth' },
    water: { name: '水', color: '#5E8FAE', ke: 'fire' },
    fire:  { name: '火', color: '#C05F55', ke: 'metal' },
    earth: { name: '土', color: '#B08A4E', ke: 'water' }
  };
  const MUT_ELEMENTS = {
    thunder: { name: '雷', color: '#8B6FA8' }, wind: { name: '风', color: '#7F9C9C' },
    ice: { name: '冰', color: '#7FA8C9' }, yin: { name: '阴', color: '#6E5E86' },
    yang: { name: '阳', color: '#C98F3C' }
  };

  /* ====== 功法品阶（仙道核心） ====== */
  /* ============================================================
     素材扩充表（据《苟在初圣魔门当人材》《苟在两界修仙》《俗主》提炼）
     ============================================================ */

  /* ====== 功法（扩充 · 全品阶可购） ====== */
  const GONGFA_EXT = [
    /* 黄阶 · 入门 */
    { id: 'juqi',     name: '聚气诀',     tier: 'huang', el: null,    price: 120,   role: 'dao', eff: '入门内功，引气之正' },
    { id: 'liehuo',   name: '烈火掌',     tier: 'huang', el: 'fire',  price: 160,   role: 'fa', eff: '火属小术' },
    { id: 'yufeng',   name: '御风术',     tier: 'huang', el: 'wind',  price: 140,   role: 'dao', eff: '遁速 +5%' },
    { id: 'lianqi',   name: '敛气诀',     tier: 'huang', el: null,    price: 180,   role: 'dao', eff: '敛其气机，人莫能窥' },
    { id: 'daoahai',  name: '蹈海诀',     tier: 'huang', el: 'water', price: 200,   role: 'dao', eff: '水属步法，涉水如夷' },
    { id: 'guixi',    name: '龟息延年诀', tier: 'huang', el: 'earth', price: 220,   role: 'dao', eff: '吐纳绵长，寿元 +10' },
    { id: 'jinguang', name: '金光咒',     tier: 'huang', el: 'metal', price: 190,   role: 'dao', eff: '金光护体，减伤一成' },
    /* 玄阶 */
    { id: 'changchun',name: '长春功',     tier: 'xuan',  el: 'wood',  price: 520,   role: 'dao', eff: '气血自复，疗伤之资' },
    { id: 'liuhuo',   name: '流火剑诀',   tier: 'xuan',  el: 'fire',  price: 560,   role: 'fa', eff: '火属剑法，中者灼' },
    { id: 'bingpo',   name: '冰魄诀',     tier: 'xuan',  el: 'ice',   price: 600,   role: 'fa', eff: '冰属，缓其行' },
    { id: 'tunhai',   name: '吞海功',     tier: 'xuan',  el: 'water', price: 640,   role: 'dao', eff: '气海 +15%，玄阶之厚者' },
    { id: 'bihai',    name: '碧海功',     tier: 'xuan',  el: 'water', price: 660,   role: 'dao', eff: '水属常法，绵绵不绝' },
    { id: 'zhenlei',  name: '震雷诀',     tier: 'xuan',  el: 'thunder', price: 680,  role: 'fa', eff: '雷属起手，破其防' },
    { id: 'lingbo',   name: '凌波仙经',   tier: 'xuan',  el: 'water', price: 700,   role: 'dao', eff: '身法：遁速 +12%' },
    { id: 'meihua',   name: '梅花易',     tier: 'xuan',  el: null,    price: 720,   role: 'dao', eff: '卜筮之术，机缘 +6，窥因果一线' },
    { id: 'xumai',    name: '续脉决',     tier: 'xuan',  el: 'wood',  price: 700,   role: 'dao', eff: '经脉损而自复，疗伤 +30%' },
    /* 地阶 */
    { id: 'zixiao',   name: '紫霄雷法',   tier: 'di',    el: 'thunder', price: 2400,  role: 'fa', eff: '雷属大威，须雷灵根' },
    { id: 'xuanyuan', name: '玄元剑经',   tier: 'di',    el: 'metal', price: 2600,  role: 'fa', eff: '剑属威力 +40%' },
    { id: 'tianhe',   name: '天河剑诀',   tier: 'di',    el: 'metal', price: 2800,  role: 'fa', eff: '剑势若天河倒泻，伤害 +50%' },
    { id: 'tianli',   name: '天遁剑诀',   tier: 'di',    el: 'metal', price: 2900,  role: 'fa', eff: '攻遁合一，遁走 +15' },
    { id: 'jiuhuan',   name: '九寰天书',   tier: 'di',    el: null,    price: 3100,  role: 'dao', eff: '包罗九寰，诸法可入' },
    { id: 'jujing',   name: '九变化龙诀', tier: 'di',    el: null,    price: 3200,  role: 'fa', eff: '九变之身，攻守兼顾（魔门正统）' },
    { id: 'jixing',  name: '剑君谈玄执金秘章', tier: 'di', el: 'metal', price: 3000,  role: 'fa', eff: '执金执剑，二者并绝' },
    { id: 'wuling',   name: '万灵归墟道经', tier: 'di', el: null,    price: 3300,  role: 'fa', eff: '万灵归墟，借众物之气' },
    /* 天阶 */
    { id: 'taixu',    name: '太虚剑典',   tier: 'tian',  el: 'metal', price: 12000,  role: 'fa', eff: '剑属大成，一念千剑' },
    { id: 'zaohua',   name: '造化丹经',   tier: 'tian',  el: null,    price: 13000,  role: 'dao', eff: '丹道登峰之途' },
    { id: 'butian',   name: '补天真经',   tier: 'tian',  el: null,    price: 14000,  role: 'dao', eff: '补天之缺，寿元上限 +80' },
    { id: 'xuanrong', name: '乾天一元统摄诸天神法', tier: 'tian', el: null, price: 15000,  role: 'dao', eff: '统摄诸天，位格压制 +1 档' },
    { id: 'xianghuo', name: '香火成神法', tier: 'tian',  el: null,    price: 14500,  role: 'dao', eff: '以香火铸神，神道之正' },
    { id: 'datie',    name: '天语焜烨龙章', tier: 'tian', el: null,  price: 15500,  role: 'dao', eff: '龙章凤姿，威压自生' },
    /* 仙阶 */
    /* 玄鉴仙族取材 */
    { id: 'jianghe',   name: '江河一气诀',     tier: 'di',    el: 'water', price: 0,  role: 'dao', eff: '一气贯江河，修为绵长' },
    { id: 'zilei',     name: '紫雷秘元功',     tier: 'di',    el: 'thunder', price: 0,  role: 'dao', eff: '雷元内蕴，破境抗噬' },
    { id: 'jindian',   name: '金殿煌元诀',     tier: 'tian',  el: 'metal', price: 0,  role: 'dao', eff: '金殿煌煌，护体不破' },
    { id: 'minghua',   name: '明华煌元经',     tier: 'tian',  el: null,   price: 0,  role: 'dao', eff: '明华照世，威压自生' },
    { id: 'yingyue',   name: '月阙剑典',       tier: 'di',    el: 'metal', price: 0,  role: 'fa', eff: '月阙悬空，剑出无影' },
    { id: 'xuanShui',  name: '玄水剑诀',       tier: 'xuan',  el: 'water', price: 640,  role: 'fa', eff: '水凝为剑，柔中寓刚' },
    { id: 'chaoXia',   name: '朝霞采露诀',     tier: 'huang', el: 'wood', price: 210,  role: 'dao', eff: '采朝露之气，入门之正' },
    { id: 'yueHu',     name: '月湖映秋诀',     tier: 'xuan',  el: 'water', price: 700,  role: 'dao', eff: '月湖映秋，心境不扰' },
    { id: 'taixuDou',  name: '太虚斗转诀',     tier: 'di',    el: null,   price: 0,  role: 'fa', eff: '斗转星移，易位而避' },
    { id: 'taiyinTuna',name: '太阴吐纳养轮经', tier: 'tian',  el: null,   price: 0,  role: 'dao', eff: '养轮之法，寿元上限 +60' },
    { id: 'baishou',   name: '白首叩庭经',     tier: 'di',    el: null,   price: 0,  role: 'dao', eff: '白首叩庭，道心不堕' },
    { id: 'xuanguang', name: '玄光赶山经',     tier: 'di',    el: 'earth', price: 0,  role: 'fa', eff: '玄光赶山，御土如驱' },
    { id: 'hongmeng', name: '鸿蒙紫气诀', tier: 'xian',  el: null,    price: 68000,  role: 'dao', eff: '万法归宗，须天道机缘' },
    { id: 'taiyin',   name: '太阴蜕形尸解真法', tier: 'xian', el: null, price: 72000,  role: 'dao', eff: '形蜕神存，死生不复为形所囿' },
    { id: 'bailian',  name: '百炼成仙道法', tier: 'xian', el: null, price: 75000,  role: 'dao', eff: '百炼凡骨，终成仙体' }
  ];

  /* ====== 丹药（扩充） ====== */
  const PILL_EXT = [
    /* 回气血 */
    { id: 'pillHp',   name: '回春丹',     price: 50,    tier: 'huang', type: 'hp',   v: 50,    desc: '复气血 50' },
    { id: 'xiaoSheng',name: '生肌续骨丹', price: 140,   tier: 'xuan',  type: 'hp',   v: 160,   desc: '复气血 160，续骨生肌' },
    { id: 'shengji',  name: '复原丹',     price: 480,   tier: 'xuan',  type: 'hpPct', v: 0.5,  desc: '复气血 50%（依上限计）' },
    { id: 'fuYuan',   name: '大还丹',     price: 1600,  tier: 'di',    type: 'hpFull', desc: '气血尽复，重伤立瘳' },
    { id: 'huichun',  name: '九转回春散', price: 3600,  tier: 'di',    type: 'hpFull', desc: '气血尽复，诸伤悉除' },
    /* 疗伤 / 续命 */
    { id: 'heal',     name: '疗伤药',     price: 80,    tier: 'huang', type: 'cure', desc: '疗轻重之伤' },
    { id: 'xuming',   name: '续命丹',     price: 2200,  tier: 'di',    type: 'life', v: 20,   desc: '寿元 +20 年（一时所续，不复增）' },
    { id: 'jiebang',  name: '接骨膏',     price: 260,   tier: 'xuan',  type: 'cure', desc: '断肢可续，重伤转轻' },
    /* 回灵 */
    { id: 'pillMp',   name: '聚气丹',     price: 40,    tier: 'huang', type: 'mp',   v: 40,    desc: '复灵力 40' },
    { id: 'huiLing',  name: '回灵散',     price: 180,   tier: 'xuan',  type: 'mpPct', v: 0.4,  desc: '复灵力 40%' },
    { id: 'yuhuaShui',name: '玉华灵水',   price: 760,   tier: 'di',    type: 'mpFull', desc: '灵力尽复（补气草、合神花、玉华宝鱼汁所炼）' },
    /* 道心 / 修为 */
    { id: 'clear',    name: '清心丹',     price: 120,   tier: 'huang', type: 'heart', v: 2,  desc: '道心 +2' },
    { id: 'ningShen', name: '凝神散',     price: 320,   tier: 'xuan',  type: 'heart', v: 4,  desc: '道心 +4，渡关前宜服' },
    { id: 'xiaoPo',   name: '小破障丹',   price: 900,   tier: 'xuan',  type: 'break', v: 0.12, desc: '破境之机 +12%' },
    { id: 'zhuji',    name: '筑基丹',     price: 1500,  tier: 'xuan',  type: 'break', v: 0.15, desc: '助筑基，成事 +15%' },
    { id: 'daPo',     name: '大破障丹',   price: 6800,  tier: 'di',    type: 'break', v: 0.28, desc: '破境之机 +28%' },
    { id: 'ningYing', name: '凝婴丹',     price: 12000, tier: 'di',    type: 'break', v: 0.35, desc: '金丹证元婴一关，成事 +35%' },
    /* 增益 */
    { id: 'xiaoXuan', name: '日月玄浆',   price: 2400,  tier: 'di',    type: 'cult', desc: '服之，闭关所得 +30%（一月）' },
    { id: 'xiang',    name: '信香',       price: 30,    tier: 'huang', type: 'xiang', v: 20, desc: '香火 +20（神道用）' }
  ];

  /* ====== 符箓（制符产物，战斗中一次性消耗） ======
     v10.7 P1·战斗口径：eff 里的每一句都要能在结算里找到对应，
     文案与实际对不上，比没有文案更坏——玩家会照着空头支票做决策。 */
  const TALISMANS = [
    { id: 'fuHuo',  name: '火符',   tier: 'huang', price: 110, eff: '一用即焚，火伤 0.9，不耗灵力', kind: 'atk', v: 0.9,  el: 'fire' },
    { id: 'fuJin',  name: '金刚符', tier: 'huang', price: 130, eff: '下一次受击总减伤 60%（与守势取强，不叠乘）', kind: 'def', v: 0.6 },
    { id: 'fuDun',  name: '遁符',   tier: 'huang', price: 150, eff: '必遁，境界之压不能阻（遁走无战利品）', kind: 'escape' },
    { id: 'fuZeng', name: '增益符', tier: 'xuan',  price: 240, eff: '三回合内直接伤害 +30%（刷新不叠层）', kind: 'buff', v: 0.30 },
    { id: 'fuLei',  name: '雷符',   tier: 'xuan',  price: 320, eff: '雷伤 ×1.3，无视卸力，不耗灵力', kind: 'atk', v: 1.3, el: 'thunder' }
  ];

  /* ====== 法器 / 法宝（扩充） ====== */
  const ARTIFACT_EXT = [
    { id: 'qingyezhou', name: '青叶舟',     price: 400,   tier: 'huang', slot: 'move', bonus: { move: 0.10 }, eff: '遁走 +10，行路不耗灵力' },
    { id: 'guixibao',   name: '护身玉符',   price: 600,   tier: 'huang', slot: 'body', bonus: { body: 0.08 }, eff: '斗法减伤 8%，常驻' },
    { id: 'duzuo',      name: '破宝锥',     price: 1200,  tier: 'xuan',  slot: 'once', eff: '一用：破境界之压，必开生路，可遁' },
    { id: 'wanyePiu',    name: '百魂幡',     price: 2400,  tier: 'xuan',  slot: 'atk', bonus: { atk: 0.15, hpCost: 5 }, eff: '斗法伤害 +15%，耗气血 5' },
    { id: 'jiuzhuan',    name: '九转飞剑',   price: 3200,  tier: 'di',    slot: 'atk', bonus: { atk: 0.25 }, eff: '可为本命，攻击 +25%' },
    { id: 'taiyinBao',   name: '太阴宝鉴',   price: 4600,  tier: 'di',    slot: 'body', bonus: { hit: 0.10 }, eff: '照见虚妄，命中 +10，幻术立破' },
    { id: 'huoyuyuan',   name: '火云符',     price: 180,   tier: 'huang', slot: 'once', eff: '一用之符：斗法中火系术法伤害 +60%（限一次）' },
    { id: 'jinchuan',    name: '传音符',     price: 90,    tier: 'huang', slot: 'once', eff: '一用：传讯相识之人，好感 +5（平时即可用）' },
    { id: 'wanlingfan',  name: '万灵幡',     price: 8600,  tier: 'tian',  slot: 'atk', bonus: { atk: 0.40 }, eff: '万灵归幡，斗法伤害 +40%，可收妖' },
    { id: 'wuyun',       name: '五雷符',     price: 520,   tier: 'xuan',  slot: 'once', eff: '一用：斗法首击必中（无视卸力），伤害 +80%' },
    { id: 'hanhuo',      name: '祈雨符箓',   price: 160,   tier: 'huang', slot: 'once', eff: '神道：一场显圣，不耗香火' },
    { id: 'juxian',      name: '拘仙敕神符', price: 2800,  tier: 'di',    slot: 'once', eff: '一用：本场位格压制 +1 档（仙道 +1 阶／神道 +1 位），限一场' }
  ];

  /* ====== 炼器 / 炼丹材料 ====== */
  const MATERIAL_EXT = [
    { id: 'buqiCao',    name: '补气草',     price: 60,  tier: 'huang', eff: '炼丹主材：回灵诸丹' },
    { id: 'heshenHua',  name: '合神花',     price: 90,  tier: 'huang', eff: '炼丹主材：宁神诸丹' },
    { id: 'yuhuaYu',    name: '玉华宝鱼汁', price: 220, tier: 'xuan',  eff: '炼丹主材：玉华灵水' },
    { id: 'gulingHua',  name: '骨灵花',     price: 380, tier: 'xuan',  eff: '疗伤诸丹之引' },
    { id: 'tianying',   name: '天婴果',     price: 900, tier: 'di',    eff: '凝婴丹主材' },
    { id: 'jidaoGuo',   name: '剑道果',     price: 1100, tier: 'di',   eff: '剑修大成之果，剑属功法之效 +20%' },
    { id: 'wuxingling', name: '五行灵果',   price: 660, tier: 'xuan',  eff: '五行俱备，补灵根之偏' },
    { id: 'starSand',   name: '天璇星砂',   price: 1500, tier: 'di',   eff: '炼器主材：法器品阶 +1' },
    { id: 'mudanYao',   name: '妖丹',       price: 800, tier: 'xuan',  eff: '妖兽内丹，器丹两用' },
    { id: 'qunfangSui', name: '群芳髓',     price: 420, tier: 'xuan',  eff: '双修、驻颜之物' },
    { id: 'wulianXue',  name: '万炼血',     price: 1300, tier: 'di',   eff: '魔门血炼主材，业力 +5，其威亦可观' },
    { id: 'lanyouCao',  name: '蓝幽草',     price: 140, tier: 'huang', eff: '疗伤常草，山野多有' },
    /* —— 四艺专用材料（符纸/符墨/阵材/器料）—— */
    { id: 'fuZhi',      name: '符纸',       price: 20,  tier: 'huang', eff: '制符所载，一纸一符' },
    { id: 'zhuSha',     name: '朱砂',       price: 30,  tier: 'huang', eff: '制符定属，赤者最灵' },
    { id: 'zhenQi',     name: '阵旗',       price: 260, tier: 'xuan',  eff: '布阵所必需，可再用' },
    { id: 'huanShi',    name: '幻属石',     price: 180, tier: 'xuan',  eff: '迷踪阵主材' },
    { id: 'jinLing',    name: '金灵砂',     price: 200, tier: 'xuan',  eff: '炼器刻阵所用，善导灵气' },
    { id: 'tieMu',      name: '铁木心',     price: 150, tier: 'huang', eff: '器胚主材，坚而韧' },
    { id: 'longYan',    name: '龙岩铁',     price: 700, tier: 'di',    eff: '地阶器胚主材' }
  ];

  /* ====== 斗法招式（法术池） ====== */
  /* ====== 四艺配方（炼丹 / 炼器 / 制符 / 阵法）==========
     统一骨架：选配方 → 备料 → 三次判定 → 成器判定（品相）→ 处置
     mats 里的 id 对应 MATERIAL_EXT；out 对应产物表 id。
     risk：explode 炸炉 / ruin 报废 / none 只降品相
     依据《我师兄实在太稳健了》「第一炉就能走到成丹这一步，节省了自己准备的其他八份材料」 */
  const RECIPES = [
    /* —— 炼丹 —— */
    { id: 'dan_huichun', kind: 'dan', name: '回春丹',   tier: 'huang', lv: 1,
      mats: { lanyouCao: 1, buqiCao: 1 }, out: 'pillHp', need: 1, base: 0.75, risk: 'explode',
      note: '疗伤之基。习此一方，终身无缺药之虞' },
    { id: 'dan_juhui',   kind: 'dan', name: '聚气丹',   tier: 'huang', lv: 1,
      mats: { buqiCao: 2 }, out: 'pillMp', need: 1, base: 0.75, risk: 'explode',
      note: '补灵之物。散修入门，先习此方' },
    { id: 'dan_qingxin', kind: 'dan', name: '清心丹',   tier: 'huang', lv: 2,
      mats: { heshenHua: 1, lanyouCao: 1 }, out: 'clear', need: 1, base: 0.70, risk: 'explode',
      note: '道心动摇，服一丸以定' },
    { id: 'dan_shengji', kind: 'dan', name: '生肌续骨丹', tier: 'xuan', lv: 3,
      mats: { lanyouCao: 2, gulingHua: 1 }, out: 'xiaoSheng', need: 1, base: 0.65, risk: 'explode',
      note: '续骨生肌，虽重伤亦可挽' },
    { id: 'dan_yuhua',   kind: 'dan', name: '玉华灵水', tier: 'di', lv: 5,
      mats: { buqiCao: 1, heshenHua: 1, yuhuaYu: 1 }, out: 'yuhuaShui', need: 1, base: 0.55, risk: 'explode',
      note: '三味同炉，灵力顷刻复满' },
    /* —— 制符 —— */
    { id: 'fu_huo',  kind: 'fu', name: '火符',   tier: 'huang', lv: 1,
      mats: { fuZhi: 1, zhuSha: 1 }, out: 'fuHuo', need: 3, base: 0.72, risk: 'ruin',
      note: '一炉三纸，工省而成速' },
    { id: 'fu_jin',  kind: 'fu', name: '金刚符', tier: 'huang', lv: 2,
      mats: { fuZhi: 1, zhuSha: 2 }, out: 'fuJin', need: 3, base: 0.70, risk: 'ruin',
      note: '佩一纸，当一击' },
    { id: 'fu_dun',  kind: 'fu', name: '遁符',   tier: 'huang', lv: 2,
      mats: { fuZhi: 2, zhuSha: 1 }, out: 'fuDun', need: 3, base: 0.68, risk: 'ruin',
      note: '势不可敌，则遁。能遁者，得长生' },
    { id: 'fu_zeng', kind: 'fu', name: '增益符', tier: 'xuan', lv: 3,
      mats: { fuZhi: 2, zhuSha: 2, heshenHua: 1 }, out: 'fuZeng', need: 3, base: 0.60, risk: 'ruin',
      note: '三回合增伤三成，越阶取胜之资' },
    { id: 'fu_lei',  kind: 'fu', name: '雷符',   tier: 'xuan', lv: 4,
      mats: { fuZhi: 3, zhuSha: 3, jinLing: 1 }, out: 'fuLei', need: 3, base: 0.55, risk: 'ruin',
      note: '必中破甲，诸符之贵者' },
    /* —— 炼器 —— */
    { id: 'qi_qingye', kind: 'qi', name: '青叶舟', tier: 'huang', lv: 2,
      mats: { tieMu: 2, jinLing: 1 }, out: 'qingyezhou', need: 1, base: 0.65, risk: 'ruin',
      note: '器胚一成，刻阵可再' },
    { id: 'qi_hushen', kind: 'qi', name: '护身玉符', tier: 'huang', lv: 3,
      mats: { tieMu: 1, jinLing: 2, huanShi: 1 }, out: 'guixibao', need: 1, base: 0.60, risk: 'ruin',
      note: '常驻减伤，佩之无时或离' },
    { id: 'qi_jiuzhuan', kind: 'qi', name: '九转飞剑', tier: 'di', lv: 5,
      mats: { longYan: 1, jinLing: 3, starSand: 1 }, out: 'jiuzhuan', need: 1, base: 0.50, risk: 'ruin',
      note: '可为本命。攻击 +25%' },
    /* —— 阵法（阵盘，布在洞府持续生效）—— */
    { id: 'zhen_juling', kind: 'zhen', name: '聚灵阵', tier: 'huang', lv: 2,
      mats: { jinLing: 2, buqiCao: 2 }, out: 'zhenJuLing', need: 1, base: 0.70, risk: 'ruin',
      note: '洞府灵气 +1 档，岁糜灵石以养之' },
    { id: 'zhen_mizong', kind: 'zhen', name: '迷踪阵', tier: 'xuan', lv: 3,
      mats: { huanShi: 3, zhenQi: 1 }, out: 'zhenMiZong', need: 1, base: 0.62, risk: 'ruin',
      note: '藏形洞府，人莫能窥' },
    { id: 'zhen_wuxing', kind: 'zhen', name: '五行轮杀阵', tier: 'di', lv: 5,
      mats: { jinLing: 1, buqiCao: 1, huanShi: 1, zhenQi: 1, longYan: 1 }, out: 'zhenWuXing', need: 1, base: 0.52, risk: 'ruin',
      note: '五行各一，环镇洞府，犯者伤' },
    { id: 'zhen_suoling', kind: 'zhen', name: '锁灵阵', tier: 'xuan', lv: 4,
      mats: { zhenQi: 1, jinLing: 2, huanShi: 1 }, out: 'zhenSuoLing', need: 1, base: 0.58, risk: 'ruin',
      note: '斗法之际，锁其去路' }
  ];

  /* 阵盘（阵地产物，与法宝分开存） */
  const ARRAY_DISKS = [
    { id: 'zhenJuLing', name: '聚灵阵',     tier: 'huang', eff: '洞府灵气 +1 档',       upkeep: 20 },
    { id: 'zhenMiZong', name: '迷踪阵',     tier: 'xuan',  eff: '藏形洞府，人莫能窥',   upkeep: 40 },
    { id: 'zhenSuoLing',name: '锁灵阵',     tier: 'xuan',  eff: '斗法时锁敌去路',       upkeep: 50 },
    { id: 'zhenWuXing', name: '五行轮杀阵', tier: 'di',    eff: '环镇洞府，犯者受伤',   upkeep: 90 }
  ];

  /* ====== 四艺等级（九品）==========
     熟练度门槛 → 品级 → 可做配方阶 / 成功率加成 */
  const CRAFT_LEVELS = [
    { lv: 1, need: 0,    rate: 0,    tier: 'huang' },
    { lv: 2, need: 100,  rate: 0.03, tier: 'huang' },
    { lv: 3, need: 300,  rate: 0.06, tier: 'xuan'  },
    { lv: 4, need: 600,  rate: 0.09, tier: 'xuan'  },
    { lv: 5, need: 1200, rate: 0.12, tier: 'di'    },
    { lv: 6, need: 1800, rate: 0.14, tier: 'di'    },
    { lv: 7, need: 3000, rate: 0.17, tier: 'tian'  },
    { lv: 8, need: 4500, rate: 0.19, tier: 'tian'  },
    { lv: 9, need: 6500, rate: 0.22, tier: 'xian'  }
  ];

  /* 四艺品阶 → 境界门槛（限制的是「能不能碰高阶材料」，不是「能不能学」） */
  const CRAFT_REALM_GATE = { huang: 1, xuan: 2, di: 3, tian: 4, xian: 5 };

  /* 技艺书（学四艺用的） */
  const CRAFT_BOOKS = [
    { id: 'bk_dan_huang', art: 'dan',  tier: 'huang', name: '青囊丹经',       price: 200 },
    { id: 'bk_dan_xuan',  art: 'dan',  tier: 'xuan',  name: '九转还丹法',     price: 900 },
    { id: 'bk_dan_di',    art: 'dan',  tier: 'di',    name: '造化丹经残卷',   price: 3000 },
    { id: 'bk_fu_huang',  art: 'fu',   tier: 'huang', name: '灵符辑要',       price: 200 },
    { id: 'bk_fu_xuan',   art: 'fu',   tier: 'xuan',  name: '朱文玉章',       price: 900 },
    { id: 'bk_fu_di',     art: 'fu',   tier: 'di',    name: '五雷符法',       price: 3000 },
    { id: 'bk_qi_huang',  art: 'qi',   tier: 'huang', name: '器道入门',       price: 200 },
    { id: 'bk_qi_xuan',   art: 'qi',   tier: 'xuan',  name: '百炼匠录',       price: 900 },
    { id: 'bk_qi_di',     art: 'qi',   tier: 'di',    name: '铸山手记',       price: 3000 },
    { id: 'bk_zhen_huang',art: 'zhen', tier: 'huang', name: '阵法初解',       price: 200 },
    { id: 'bk_zhen_xuan', art: 'zhen', tier: 'xuan',  name: '奇门三才图',     price: 900 },
    { id: 'bk_zhen_di',   art: 'zhen', tier: 'di',    name: '五行轮杀阵图',   price: 3000 }
  ];

  /* 四艺：名称 / 主属性 / 说明 */
  const CRAFT_ARTS = [
    { id: 'dan',  name: '炼丹', stat: 'insight', desc: '自服省药资，出市亦有恒需' },
    { id: 'qi',   name: '炼器', stat: 'qualify', desc: '所费最巨，而成器之效尤胜' },
    { id: 'fu',   name: '制符', stat: 'sense',   desc: '工省而效速，越阶制敌之资' },
    { id: 'zhen', name: '阵法', stat: 'insight', desc: '一设而长久，可决胜负' }
  ];

  /* 品相五档（四艺共用） */
  const QUALITY = [
    { id: 'fei',  name: '废',   mul: 0,   rate: 0.15, color: '#9A9088' },
    { id: 'xia',  name: '下品', mul: 0.7, rate: 0.35, color: '#B0A48C' },
    { id: 'zhong',name: '中品', mul: 1.0, rate: 0.35, color: '#7FA8C9' },
    { id: 'shang',name: '上品', mul: 1.6, rate: 0.12, color: '#8B6FA8' },
    { id: 'ji',   name: '极品', mul: 3.0, rate: 0.03, color: '#C9A45C' }
  ];

  /* 卖出渠道：宗门收购 / 坊市摆摊 / 拍卖 / 黑市 */
  const SELL_CHANNELS = [
    { id: 'sect',  name: '交宗门', mul: 0.80, need: 'sect',  desc: '稳定量大，可换贡献' },
    { id: 'market',name: '坊市摆摊', mul: 1.00, need: null,  desc: '市价，每月限件数' },
    { id: 'auction',name: '拍卖会', mul: 1.40, need: 'timer',desc: '三年一次，抽成一成，可能流拍' },
    { id: 'black', name: '黑市',   mul: 1.45, need: null,    desc: '不问来路，收价最高' }
  ];

  /* ====== 招式（杀伐神通 · 与道基功法分家） ======
     lvl 决定出处：wai 外门层（黄阶，凡记名弟子可借）
                  nei 内门层（玄阶，需内门弟子）
                  zhen 真传层（地/天阶，非真传不得学）
     习得之后还要「装配」才能带进斗法，装配上限见 equipLimit() */
  const SKILLS = [
    { id: 'zhiquan',   name: '直取',       cost: 0,   mul: 1.0,  kind: 'normal',  lvl: 'wai',  desc: '平实一击，不耗灵力' },
    { id: 'jianqi',    name: '剑气纵横',   cost: 20,  mul: 1.35, kind: 'sword',   lvl: 'wai',  desc: '剑修常法，耗灵力 20' },
    { id: 'liehuo',    name: '焚山掌',     cost: 25,  mul: 1.45, kind: 'fire',    lvl: 'wai',  desc: '火属一掌，中者灼' },
    { id: 'hanshui',   name: '寒水箭',     cost: 22,  mul: 1.30, kind: 'water',   lvl: 'wai',  desc: '凝水成箭，克火' },
    { id: 'mumin',     name: '缠木根',     cost: 28,  mul: 1.20, kind: 'wood',    lvl: 'nei',  desc: '缠根缚身，敌一回合伤害减半' },
    { id: 'luoshi',    name: '落石诀',     cost: 26,  mul: 1.40, kind: 'earth',   lvl: 'nei',  desc: '沉雄一击，破其防' },
    { id: 'dugu',      name: '毒火丝',     cost: 30,  mul: 1.15, kind: 'poison',  lvl: 'nei',  desc: '真伤绵延三回合' },
    { id: 'zhentian',  name: '镇压八方',   cost: 50,  mul: 1.60, kind: 'control', lvl: 'nei',  desc: '镇压八方，敌下一回合不能攻' },
    { id: 'liuJian',   name: '流转剑罡',   cost: 35,  mul: 1.50, kind: 'sword',   lvl: 'nei',  desc: '剑罡绕身，攻守兼顾' },
    { id: 'leiming',   name: '惊雷引',     cost: 40,  mul: 1.75, kind: 'thunder', lvl: 'zhen', desc: '雷属，必中，破半甲' },
    { id: 'baigu',     name: '白骨飞剑',   cost: 45,  mul: 1.80, kind: 'sword',   lvl: 'zhen', desc: '白骨凝剑，锋锐易折（命中偏难）' },
    { id: 'xueLian',   name: '血炼神光',   cost: 0,   mul: 1.55, kind: 'blood',   lvl: 'zhen', desc: '魔门常法：倾气血以易伤' },
    { id: 'xuanZhu',   name: '玄珠坠月',   cost: 55,  mul: 1.90, kind: 'water',   lvl: 'zhen', desc: '玄珠压顶，水滴石穿' },
    { id: 'shenying',  name: '神霄御剑',   cost: 60,  mul: 2.10, kind: 'thunder', lvl: 'zhen', desc: '雷剑相合，威巨而耗灵亦巨' }
  ];

  /* ====== 道基功法的境界上限（修炼功法 / 杀伐招式 分家后最重的一条） ======
     品阶不够，修到本境圆满就再也上不去了 —— 必须去换更高阶的道基功法
     依据《苟在初圣魔门当人材》：「七品以下无缘筑基，三品以下无缘金丹」 */
  const DAOGONG_CAP = {
    huang: { cap: 1, to: '练气圆满', why: '散修通行之引气法，极于练气' },
    xuan:  { cap: 2, to: '筑基圆满', why: '小宗外门之学' },
    di:    { cap: 3, to: '紫府三关', why: '大宗内门、真传之学' },
    tian:  { cap: 4, to: '金丹',     why: '峰主、世家嫡系所传' },
    xian:  { cap: 5, to: '道胎',     why: '传闻之法，唯秘境得见' }
  };

  /* ====== 五行相生（同源共鸣用） ====== */
  const SHENG = {
    metal: 'water', water: 'wood', wood: 'fire', fire: 'earth', earth: 'metal',
    thunder: 'wood', ice: 'water', wind: 'fire', yin: 'water', yang: 'fire'
  };

  /* ====== 铭文（破境 / 得法 / 失手时诵出，据《玄鉴仙族》仪轨） ====== */
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
      '以时言功，不负效信。愿此香火，长照此方。'
    ],
    fail: [
      '气机逆冲，玉京轮碎。心中只余一片死寂。',
      '你听见体内有什么东西断裂的声音，很轻，像一根弦。',
      '丹炉倾覆，药力逆走经络。这一关，你过不去。'
    ]
  };

  /* ====== 传法机缘（地阶以上功法出处） ====== */
  const TRANSMISSIONS = [
    {
      id: 'tx_di', name: '残碑问法', tier: 'di', needRealm: 2,
      poem: '碑断犹存半句法，苔深不见六朝人。',
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
      poem: '伞骨旧曾蔽行客，墨痕新处已藏钩。',
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
      poem: '空中有声诵吾名，三遍之后吾亦诵。',
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
      poem: '一夜无人庭自雪，剑横霜上字犹寒。',
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
      poem: '月沉西极光入骨，形蜕之后不问年。',
      verse: '月轮西沉，最后一线光华落在你眉心。你听见有人在你耳边说：「形蜕而神存，死生不再受形所囿。」',
      hint: '仙阶功法 · 需道胎',
      opts: [
        { t: '受此一线月华', eff: '或得仙法，或化道', act: 'tx:tx_xian:moon', risk: 'risk' },
        { t: '退回屋中，闭门', eff: '避其锋芒，无功无过', act: 'tx:tx_xian:retreat', risk: 'peace' },
        { t: '以自身道果相换', eff: '需付出果位，可得真法', act: 'tx:tx_xian:trade', risk: 'chance' }
      ]
    }
  ];


  /* ====== 奇遇池（机缘，按道途分支） ====== */
  const ENCOUNTERS = [
    {
      id: 'oldman', name: '崖边老者', kind: 'common',
      poem: '道旁老叟啮冷粮，遇人无惊亦无问。',
      text: '山道尽头，一个披着旧袍的老者蹲在石头上啃干粮。他抬头看你，眼里没有半点惊疑。',
      opts: [
        { t: '上前问路', risk: 'risk', eff: '需通过命数判定', act: 'enc:oldman:ask' },
        { t: '绕道而行', risk: 'peace', eff: '稳妥，但什么也得不到', act: 'enc:oldman:pass' },
        { t: '递上半块饼', risk: 'chance', eff: '消耗 20 灵石，或有回报', act: 'enc:oldman:share' }
      ]
    },
    {
      id: 'cave', name: '无名古洞', kind: 'common',
      poem: '雨裂山腹开一线，壁间残诀字犹温。',
      text: '雨后的山壁上裂开一道口子，往里走三步，灵气陡然浓了起来。洞壁上刻着半篇残缺的法诀。',
      opts: [
        { t: '抄录法诀', risk: 'chance', eff: '可能得功法残卷', act: 'enc:cave:copy' },
        { t: '就地打坐', risk: 'peace', eff: '修为 +30，但洞中灵气一次而竭', act: 'enc:cave:sit' },
        { t: '深入探查', risk: 'risk', eff: '可能遇妖，也可能得宝', act: 'enc:cave:deep' }
      ]
    },
    {
      id: 'dying', name: '濒死的修士', kind: 'xian',
      poem: '草间残喘犹攥袋，抬手非为求生。',
      text: '草丛里躺着个修士，胸口一个碗大的窟窿，还在喘气。他攥着储物袋，看见你就抬手。',
      opts: [
        { t: '施药救人', risk: 'chance', eff: '耗一颗疗伤丹（或 200 灵石），可能得人情', act: 'enc:dying:save' },
        { t: '取走储物袋', risk: 'risk', eff: '得灵石若干，业力 +15', act: 'enc:dying:rob' },
        { t: '转身就走', risk: 'peace', eff: '无所得，心不亏', act: 'enc:dying:leave' }
      ]
    },
    {
      id: 'ruined', name: '野庙荒祠', kind: 'shen',
      poem: '泥塑半倾灰三寸，指端一按尚余温。',
      text: '一尊倒了半边的泥塑神像，供桌上积着三寸灰。你伸手一抹，指腹上有点暖意。',
      opts: [
        { t: '重立香火', risk: 'chance', eff: '耗 300 香火，庙址 +1，信众大增', act: 'enc:ruined:rebuild' },
        { t: '取走供品', risk: 'risk', eff: '得香火若干，业力 +10', act: 'enc:ruined:take' },
        { t: '上三炷香', risk: 'peace', eff: '香火 +80，无其他变化', act: 'enc:ruined:incense' }
      ]
    },
    {
      id: 'market', name: '坊市拍卖', kind: 'common',
      poem: '铜铃三响红未揭，价自众人心底定。',
      text: '拍卖行的铜铃响了第三遍。台上那件东西被红布盖着，台下有人已经举了三回牌子。',
      opts: [
        { t: '举牌竞拍', risk: 'chance', eff: '耗 800 灵石，得一件法器或功法', act: 'enc:market:bid' },
        { t: '观望行情', risk: 'peace', eff: '灵石 = 见识，声望 +8', act: 'enc:market:watch' },
        { t: '混进后台', risk: 'risk', eff: '可能偷得真货，也可能被打出来', act: 'enc:market:sneak' }
      ]
    },
    {
      id: 'beast', name: '负伤的妖物', kind: 'xian',
      poem: '断足之兽眼不闭，看人如看一念间。',
      text: '一头开了灵智的妖兽倒在你必经的山道上，后腿骨头断了，眼睛却一直盯着你。',
      opts: [
        { t: '救它', risk: 'chance', eff: '耗 300 灵石，或得契约妖宠', act: 'enc:beast:heal' },
        { t: '杀了取丹', risk: 'risk', eff: '得妖丹，业力 +12', act: 'enc:beast:kill' },
        { t: '绕过去', risk: 'peace', eff: '无所得', act: 'enc:beast:pass' }
      ]
    },
    {
      id: 'storm', name: '荒村大旱', kind: 'shen',
      poem: '井见底时香火起，人跪门前问野神。',
      text: '三十几户人家的村子，水井见了底，老人跪在自家门口烧黄纸。有人在传：后山有个野神。',
      opts: [
        { t: '行雨显圣', risk: 'chance', eff: '仙道：耗灵力；神道：耗香火。信众大涨', act: 'enc:storm:rain' },
        { t: '收编村祭', risk: 'risk', eff: '立为一村香火，但要担起此村', act: 'enc:storm:take' },
        { t: '留下丹药', risk: 'peace', eff: '耗丹药，功德 +30', act: 'enc:storm:pill' }
      ]
    },
    {
      id: 'jade', name: '溪底玉匣', kind: 'common',
      poem: '潮退石间露半匣，封蜡未损字曰勿开。',
      text: '退潮后的溪石间露出半只玉匣，封蜡还完好，匣底刻着两个字：勿开。',
      opts: [
        { t: '打开它', risk: 'risk', eff: '可能得宝，也可能放出祸祟', act: 'enc:jade:open' },
        { t: '原样带回去', risk: 'peace', eff: '可作奇物，价值未知', act: 'enc:jade:keep' },
        { t: '重新封好沉底', risk: 'chance', eff: '功德 +20，或得上天垂青', act: 'enc:jade:close' }
      ]
    },
    {
      id: 'debtor', name: '叩门的旧识', kind: 'common',
      poem: '夜叩门者带血腥，但求一宿，不言明朝。',
      text: '夜里有人敲门，是个许久不见的旧识，一身血腥气，说只求躲一宿。',
      opts: [
        { t: '留他一夜', risk: 'risk', eff: '可能被仇家找上门，也可能得助力', act: 'enc:debtor:host' },
        { t: '拒之门外', risk: 'peace', eff: '无风险，好感 −10', act: 'enc:debtor:refuse' },
        { t: '问清缘由', risk: 'chance', eff: '可能牵出一条线索', act: 'enc:debtor:ask' }
      ]
    },
    {
      id: 'scripture', name: '残页天书', kind: 'xian',
      poem: '三年废纸压书肆，翻开一行已成诀。',
      text: '旧书摊上一卷残页，摊主说不认得字，只当废纸压了三年。你翻开，第一行是半句口诀。',
      opts: [
        { t: '买下残页', risk: 'chance', eff: '耗 500 灵石，可能得功法残卷', act: 'enc:scripture:buy' },
        { t: '请他换一物', risk: 'risk', eff: '以物易物，或以人情换', act: 'enc:scripture:trade' },
        { t: '默默记下', risk: 'peace', eff: '记一半，机缘 +2', act: 'enc:scripture:memorize' }
      ]
    },
    /* ====== 2026-11-17 素材增补：十五处奇遇 ======
       结构对齐 enc:<id>:<opt>，每个选项在 do_enc 里都有分支。
       题诗一句，作开场的定调；正文只写看见的，不写该怎样想。 */
    { id: 'stoneGate', name: '残符石门', kind: 'common', poem: '石门半掩刻残符，推者还须代守门。',
      text: '山行遇一石门，门上残符半张。符下刻着一行字：推门者，代守门者。',
      opts: [
        { t: '推门', risk: 'risk', eff: '门后有物，亦有因果', act: 'enc:stoneGate:push' },
        { t: '不推', risk: 'peace', eff: '道心 +1', act: 'enc:stoneGate:leave' },
        { t: '破符', risk: 'risk', eff: '修为 +40，业力 +5', act: 'enc:stoneGate:burn' }
      ] },
    { id: 'brokenSword', name: '断剑', kind: 'common', poem: '河滩半剑锈成泥，剑格犹存一个云。',
      text: '河滩上有半截断剑，锈得只剩剑格。剑格上刻着一个「云」字。',
      opts: [
        { t: '拾起带走', risk: 'chance', eff: '以灵气养它三月', act: 'enc:brokenSword:keep' },
        { t: '原地插回', risk: 'peace', eff: '机缘 +2', act: 'enc:brokenSword:back' },
        { t: '熔了打农具', risk: 'risk', eff: '灵石 +80，剑系声望 −', act: 'enc:brokenSword:melt' }
      ] },
    { id: 'nightTeach', name: '夜半授业', kind: 'common', poem: '夜半有人隔空语，一字一句教法诀。',
      text: '闭关半夜，忽有人隔空传音，一字一句教一式法诀。睁眼，四下无人。',
      opts: [
        { t: '照诀修行', risk: 'chance', eff: '修为 +50，悟性 +1', act: 'enc:nightTeach:learn' },
        { t: '硬压心神', risk: 'peace', eff: '道心 +2', act: 'enc:nightTeach:refuse' },
        { t: '反循传音', risk: 'risk', eff: '机缘 +3，寿元 −5', act: 'enc:nightTeach:trace' }
      ] },
    { id: 'corpseHall', name: '义庄老尸', kind: 'common', poem: '义庄看门人劝酒，说庄里客人快醒。',
      text: '义庄看门人请你喝一碗酒，说庄里那位客人快醒了，问你怕不怕。',
      opts: [
        { t: '留下守夜', risk: 'chance', eff: '道心 +2，得残篇', act: 'enc:corpseHall:stay' },
        { t: '烧了棺材', risk: 'risk', eff: '业力 +10，得尸丹', act: 'enc:corpseHall:burn' },
        { t: '收钱走人', risk: 'peace', eff: '灵石 +60', act: 'enc:corpseHall:leave' }
      ] },
    { id: 'fallenFairy', name: '落难仙子', kind: 'common', poem: '山道三人围一女，袖口绣着不识花。',
      text: '山道遇一女子被三名黑衣人围困。女子袖口绣着一朵你不认识的教中花。',
      opts: [
        { t: '出手相助', risk: 'risk', eff: '声望 +6，被记了脸', act: 'enc:fallenFairy:save' },
        { t: '报官', risk: 'peace', eff: '声望 +5，灵石 +30', act: 'enc:fallenFairy:report' },
        { t: '观望', risk: 'risk', eff: '道心 −2，业力 +3', act: 'enc:fallenFairy:watch' }
      ] },
    { id: 'wellMoon', name: '井中月', kind: 'common', poem: '庙后枯井月自圆，影中月比天上全。',
      text: '庙后枯井，月圆之夜井里有月。水影里的月，比天上那个完整。',
      opts: [
        { t: '伸手捞月', risk: 'chance', eff: '悟性 +2，寿元 −3', act: 'enc:wellMoon:reach' },
        { t: '投一炷香', risk: 'peace', eff: '虔诚 +，信众 +30', act: 'enc:wellMoon:incense' },
        { t: '封井', risk: 'peace', eff: '道心 +3，业力 −2', act: 'enc:wellMoon:seal' }
      ] },
    { id: 'bookSeller', name: '贩书人', kind: 'common', poem: '坊市拐角一书摊，只在雨天卖错版。',
      text: '坊市拐角有个书摊，摊主只在雨天出摊，卖的都是错版书。',
      opts: [
        { t: '买一本', risk: 'chance', eff: '灵石 −30，悟性 +1', act: 'enc:bookSeller:buy' },
        { t: '问他为何雨天出摊', risk: 'peace', eff: '悟性 +2', act: 'enc:bookSeller:ask' },
        { t: '报给巡查', risk: 'risk', eff: '灵石 +50，业力 +5', act: 'enc:bookSeller:report' }
      ] },
    { id: 'oldDebt', name: '故人之账', kind: 'common', poem: '三十年前半炉丹，如今拦路问人还。',
      text: '一个陌生老者拦路，说三十年前你师父欠他半炉丹药。',
      opts: [
        { t: '认账代还', risk: 'peace', eff: '灵石 −30，功德 +15', act: 'enc:oldDebt:pay' },
        { t: '让他拿凭据', risk: 'chance', eff: '道心 −1，修为 +30', act: 'enc:oldDebt:proof' },
        { t: '不认', risk: 'risk', eff: '结一段仇', act: 'enc:oldDebt:refuse' }
      ] },
    { id: 'foxCub', name: '妖物认亲', kind: 'common', poem: '三眼幼狐跟十里，不讨食，卧脚背。',
      text: '一只三眼幼狐跟了你十里，不讨食，只把尾巴搭在你脚背上，睡了一觉。',
      opts: [
        { t: '收养', risk: 'chance', eff: '得妖丹，业力 +2', act: 'enc:foxCub:keep' },
        { t: '送归山林', risk: 'peace', eff: '道心 +2，山中不遇兽', act: 'enc:foxCub:return' },
        { t: '卖给坊市', risk: 'risk', eff: '灵石 +88，业力 +8', act: 'enc:foxCub:sell' }
      ] },
    { id: 'oldCave', name: '前人洞府', kind: 'common', poem: '雷雨山崩露洞府，门大开着主人急。',
      text: '雷雨夜山体滑坡，露出一处洞府。府门大开着，不是没人，是主人走得急。',
      opts: [
        { t: '只取丹药书籍', risk: 'peace', eff: '修为 +60，得道书', act: 'enc:oldCave:take' },
        { t: '连洞府一起占了', risk: 'risk', eff: '灵气提一档', act: 'enc:oldCave:occupy' },
        { t: '报给宗门', risk: 'peace', eff: '贡献 +200', act: 'enc:oldCave:report' }
      ] },
    { id: 'snowLodge', name: '雪夜借宿', kind: 'common', poem: '雪夜迷路叩柴门，一床一粥皆热的。',
      text: '雪夜迷路，敲开一户猎户的门。屋里有一张多余的床，一碗热的粥。',
      opts: [
        { t: '给钱', risk: 'peace', eff: '道心 +1', act: 'enc:snowLodge:pay' },
        { t: '讲故事抵饭钱', risk: 'peace', eff: '悟性 +1', act: 'enc:snowLodge:tale' },
        { t: '夜里修行扰人', risk: 'risk', eff: '修为 +20，业力 +2', act: 'enc:snowLodge:cultivate' }
      ] },
    { id: 'noNameStele', name: '断香的名号', kind: 'common', poem: '荒庙无字碑一块，碑前三支断头香。',
      text: '荒庙里一块无字碑，碑前香炉断着三支香。有人来过，没敢留名。',
      opts: [
        { t: '补上三支香', risk: 'peace', eff: '道心 +2，悟性 +1', act: 'enc:noNameStele:incense' },
        { t: '刻自己的名号', risk: 'risk', eff: '声望 +3，机缘 −1', act: 'enc:noNameStele:carve' },
        { t: '拓印碑文', risk: 'chance', eff: '得符材', act: 'enc:noNameStele:rubbing' }
      ] },
    { id: 'riverBride', name: '河伯娶亲', kind: 'common', poem: '沿河村子办娶亲，花轿哭声细如丝。',
      text: '沿河村子在办娶亲，花轿往河边抬，轿里哭声很小。今日不是吉日。',
      opts: [
        { t: '掀轿', risk: 'risk', eff: '功德 +20，村里记恨', act: 'enc:riverBride:lift' },
        { t: '假扮神棍接这单', risk: 'chance', eff: '灵石 +40，信众 +40', act: 'enc:riverBride:sham' },
        { t: '转身走', risk: 'warn', eff: '道心 −1', act: 'enc:riverBride:leave' }
      ] },
    { id: 'escortRaid', name: '官道截杀', kind: 'common', poem: '官道镖车被截住，镖旗是祀部的旗。',
      text: '官道上，一队镖车被截。镖师们背靠背站着，镖旗是祀部的旗。',
      opts: [
        { t: '助镖师', risk: 'risk', eff: '灵石 +120，声望 +8', act: 'enc:escortRaid:help' },
        { t: '趁乱摸鱼', risk: 'risk', eff: '灵石 +150，业力 +10', act: 'enc:escortRaid:loot' },
        { t: '先救人再问是非', risk: 'peace', eff: '功德 +15，两头欠情', act: 'enc:escortRaid:save' }
      ] },
    { id: 'mirrorLake', name: '镜湖照影', kind: 'common', poem: '山间平湖无风纹，湖中照影慢半拍。',
      text: '一面山间平湖，无风自起纹。湖面照出的「你」，动作总比你慢半拍。',
      opts: [
        { t: '与影对坐一夜', risk: 'chance', eff: '悟性 +2，道心 +1', act: 'enc:mirrorLake:sit' },
        { t: '破湖', risk: 'risk', eff: '得古镜，可换重价', act: 'enc:mirrorLake:break' },
        { t: '走了别回头看', risk: 'peace', eff: '道心 +1', act: 'enc:mirrorLake:leave' }
      ] },

    /* ====== 2026-11-20 素材增补：五处奇遇（据《小说素材改编库》§3、§8.1~8.3）======
       取材：《我以机缘觅长生》的石液观机、《蛊真人》的三关与命灯、
            《白骨大圣》的伪箓、《黄昏分界》的三炷香。
       机缘不是随机，是应你此刻最急之事而现——所以三选一里没有一条是「稳赚」。 */
    { id: 'shiyeguanji', name: '石液观机', kind: 'xian', poem: '崖畔石瓶一旬滴，滴入目中见白青。',
      text: '崖畔有石瓶，每一旬凝一滴白液。滴入目中，可见天地间「机缘」——白光者微，青光者巨。所现之机，非随机，乃应你此刻最急之事。',
      opts: [
        { t: '滴液观洞府', risk: 'chance', eff: '机缘 +2，来月破境稳三分', act: 'enc:shiyeguanji:cave' },
        { t: '滴液观旧债', risk: 'risk', eff: '见银中带金一缕，闪烁不定', act: 'enc:shiyeguanji:debt' },
        { t: '封瓶不观', risk: 'peace', eff: '「百鸟在林，不如一鸟在手」', act: 'enc:shiyeguanji:seal' }
      ] },
    { id: 'sanguandanghun', name: '三关·荡魂', kind: 'xian', poem: '山摇其魂谷夺魄，逆流而上者逆天。',
      text: '入一古门，门后三关：荡魂山、落魄谷、逆流河。过关者留一句话：「山摇其魂，谷夺其魄，河逆其行。」',
      opts: [
        { t: '闯荡魂山', risk: 'risk', eff: '见平生所悔之事一一走过', act: 'enc:sanguandanghun:mountain' },
        { t: '绕谷而行', risk: 'chance', eff: '不夺其魄，然失一物', act: 'enc:sanguandanghun:valley' },
        { t: '逆流而上', risk: 'risk', eff: '逆河者，逆命', act: 'enc:sanguandanghun:river' }
      ] },
    { id: 'mingdengzhiwen', name: '命灯之问', kind: 'xian', poem: '两盏灯前一明灭，执事不答只推灯。',
      text: '石台上有两盏灯，一盏亮，一盏将灭。执事把亮的那盏往前推了半寸，什么也没说。',
      opts: [
        { t: '点亮自己的灯', risk: 'chance', eff: '命火燃起，成记名弟子', act: 'enc:mingdengzhiwen:light' },
        { t: '吹灭将熄之灯', risk: 'risk', eff: '灯灭时，听见远处有人笑', act: 'enc:mingdengzhiwen:blow' },
        { t: '不点灯，转身走', risk: 'peace', eff: '「命牌认牌不认人」', act: 'enc:mingdengzhiwen:leave' }
      ] },
    { id: 'weiluzhiwen', name: '伪箓之问', kind: 'common', poem: '黄符半厘画错了，月光底下字犹新。',
      text: '有人持黄符来投，说受了箓。月光下看那符，笔画错半厘——歪得很轻，像画的人手在抖。',
      opts: [
        { t: '指出其伪', risk: 'chance', eff: '「这不是符，是名籍」', act: 'enc:weiluzhiwen:point' },
        { t: '收下不戳破', risk: 'risk', eff: '假符也是符，糊弄鬼神未必不成', act: 'enc:weiluzhiwen:take' },
        { t: '焚符逐客', risk: 'risk', eff: '火起时，那人说了一句话', act: 'enc:weiluzhiwen:burn' }
      ] },
    { id: 'sanzhuxiang', name: '三炷香', kind: 'shen', poem: '香点三炷人未答，死人只认亲不认理。',
      text: '婆婆要为你结一门阴亲。「你媳妇在下面护你，你给她烧纸。」香已点了三炷，第三炷还没插正。',
      opts: [
        { t: '允', risk: 'chance', eff: '祠堂添一炷香，阴邪绕行', act: 'enc:sanzhuxiang:yes' },
        { t: '拒', risk: 'peace', eff: '「死人只认亲不认理」', act: 'enc:sanzhuxiang:no' },
        { t: '追问「我是谁」', risk: 'chance', eff: '婆婆不答，只把香插正', act: 'enc:sanzhuxiang:ask' }
      ] }
  ];

  /* 坊市四类货架（丹药 / 功法 / 法器 / 材料） */

  const GONGFA_TIERS = {
    huang: { name: '黄阶', mul: 1.0, color: '#B0A48C' },
    xuan:  { name: '玄阶', mul: 1.3, color: '#7FA8C9' },
    di:    { name: '地阶', mul: 1.7, color: '#8B6FA8' },
    tian:  { name: '天阶', mul: 2.2, color: '#C9A45C' },
    xian:  { name: '仙阶', mul: 3.0, color: '#C05F55' }
  };

  /* v10.5 P0·A1：role 是「修炼功法 dao / 杀伐术法 fa」的数据边界。
     下游不再靠 id/eff 特判——道基只认 dao，术法池只认 fa。 */
  const GONGFA = GONGFA_EXT.map(function (x) {
    return { id: x.id, name: x.name, tier: x.tier, el: x.el, role: x.role || 'dao', eff: x.eff };
  });

  /* ====== 体质 ====== */
  /* v8.1 P0 M2：体质从「创角选一次的文本」变成真读数。
     旧版只有 dao（修为/香火 ×1.5）与 chun（免疫首次反噬）有代码引用，
     其余六种的 eff 全是死文案——凡体与先天体质在数值上毫无差别。
     现在每种各给一个明确、可达的落点，字段含义见各自的键名。 */
  const BODIES = [
    { id: 'dao',   name: '先天道体', eff: '修为、香火之化 +50%', mul: 1.5 },
    { id: 'sword', name: '剑灵体',   eff: '斗法亲和：战力 +10%', mul: 1.0, pow: 1.10 },
    { id: 'nine',  name: '九阳圣体', eff: '火属法术 +30%', mul: 1.0, fire: 1.3 },
    { id: 'ice',   name: '冰魄灵体', eff: '冰属水：主修水时招式 +15%', mul: 1.0, ice: 1.15 },
    { id: 'xuan',  name: '玄阴体',   eff: '双修之益 +25%', mul: 1.0, both: 1.25 },
    { id: 'chun',  name: '纯阳体',   eff: '双修有益；首度反噬可免', mul: 1.0, both: 1.25 },
    { id: 'chaos', name: '混沌体',   eff: '世所罕有：五行皆通，不受反克', mul: 1.1, rare: true, keFloor: 1.15 },
    { id: 'plain', name: '凡体',     eff: '无所长：淬体之费三倍', mul: 1.0, quenchMul: 3 }
  ];

  /* ====== 淬体九阶（v8.1 P0 M2） ======
     凡体也能一路淬上去，只是花三倍（决策点 ①）。每一阶只按「增量倍率」写进气血，
     反复淬不会复利；block 是战斗卸力加成，累加到 deflectOf 里。 */
  /* ====== 固定开销（v8.1 P0 批次 2 前置） ======
     「不做事也要付钱」：宗门月课、家族口粮、庙宇修缮、洞府维护。
     数值刻意压低——目的是让「闲着」有成本，不是让玩家破产。 */
  /* ====== 天劫五类（v8.1 P0 批次 2） ======
     只在大境界突破时来。克法按仙/神分列：同一类劫，两条线各有各的活路。
     定向不再按主修五行——雷与风根本不在五行里，那一套没有可实现的映射。 */
  const TRIBULATION = [
    { id: 'lei',  name: '三问雷', test: '道心', line: '雷不问你修为，只问你怕不怕。' },
    { id: 'shui', name: '倒天河', test: '气海', line: '河从天上来，冲的是你气海里那点根。' },
    { id: 'huo',  name: '无灯焰', test: '神器', line: '灯灭之后，黑里有什么在看你。' },
    { id: 'feng', name: '折骨风', test: '肉身', line: '风过如刀，先削皮，再折骨。' },
    { id: 'gu',   name: '故人关', test: '恩义', line: '来的人你认得，他问你当年那句话。' }
  ];
  /* 权重：五类固定，合计 100；主修五行不参与（无雷/风映射） */
  const TRIB_WEIGHT = { lei: 22, shui: 20, huo: 20, feng: 18, gu: 20 };

  const FIXED_COST = {
    sectDueNeedDiv: 40,      // 月课贡献 = 本阶所需贡献 / 40（最低 10）
    sectCashPerContrib: 5,   // 贡献不够时，1 贡献折 5 灵石补缴
    sectArrearsMax: 3,       // 连欠三月降一阶
    clanFoodPerPop: 0.25,    // 每族人每月 0.25 灵石口粮
    templeBase: 30,          // 庙宇每月修缮基数（× 庙阶系数）
    caveBase: 15,            // 洞府每月维护（× 灵脉系数）
    cavePerFacility: 20,     // 每间作坊再加 20
    arrearsFloor: 0.7,       // 欠费时修行效率下限（每欠一月 -10%）
    arrearsStep: 0.10
  };

  const QUENCH = [
    { name: '淬皮', stones: 400,    herb: { id: 'lanyouCao', n: 2 },  hpMul: 1.10, block: 0.02 },
    { name: '淬肉', stones: 900,    herb: { id: 'lanyouCao', n: 3 },  hpMul: 1.20, block: 0.04 },
    { name: '淬筋', stones: 1800,   herb: { id: 'lanyouCao', n: 5 },  hpMul: 1.32, block: 0.06 },
    { name: '洗髓', stones: 3200,   herb: { id: 'lanyouCao', n: 8 },  hpMul: 1.45, block: 0.08 },
    { name: '换骨', stones: 5600,   herb: { id: 'lanyouCao', n: 12 }, hpMul: 1.60, block: 0.10 },
    { name: '凝血', stones: 9000,   herb: { id: 'lanyouCao', n: 18 }, hpMul: 1.76, block: 0.12 },
    { name: '锻脏', stones: 15000,  herb: { id: 'lanyouCao', n: 26 }, hpMul: 1.94, block: 0.14 },
    { name: '淬神', stones: 24000,  herb: { id: 'lanyouCao', n: 36 }, hpMul: 2.12, block: 0.16 },
    { name: '不漏', stones: 38000,  herb: { id: 'lanyouCao', n: 50 }, hpMul: 2.32, block: 0.18 }
  ];

  /* ====== 天赋 ====== */
  const TALENTS = [
    { id: 'smart',  name: '天资聪颖', cost: 1, apply: { qualify: 3 }, desc: '资质 +3' },
    { id: 'memory', name: '过目不忘', cost: 1, apply: { insight: 3 }, desc: '悟性 +3' },
    { id: 'light',  name: '身轻如燕', cost: 1, apply: { speed: 3 },   desc: '遁速 +3' },
    { id: 'heartT', name: '天生道心', cost: 1, apply: { heart: 3 },   desc: '道心 +3' },
    { id: 'luck',   name: '气运加身', cost: 1, apply: { fate: 3 },    desc: '仙缘 +3' },
    { id: 'senseT', name: '神识过人', cost: 1, apply: { sense: 3 },   desc: '神识 +3' },
    { id: 'merid',  name: '百脉俱通', cost: 1, apply: { mpFlat: 50 }, desc: '灵力上限 +50' },
    { id: 'iron',   name: '钢筋铁骨', cost: 1, apply: { hpFlat: 80 }, desc: '气血上限 +80' },
    { id: 'pill',   name: '药理通神', cost: 1, apply: { alchemy: 1 }, desc: '炼丹 +1 级' },
    { id: 'peach',  name: '桃花运',   cost: 1, apply: { love: 0.2 },  desc: '初始好感 +20%' },
    { id: 'weak',   name: '体弱多病', cost: -2, apply: { hpFlat: -50 }, desc: '负面：气血 -50，换回 2 点' }
  ];

  /* ====== 出身 ====== */
  const ORIGINS = [
    { id: 'farm',    name: '农家子',       desc: '道心 +2，孑然无依',             apply: { heart: 2 } },
    { id: 'hunt',    name: '猎户之后',     desc: '气血上限 +20，习于山林',        apply: { hpFlat: 20 } },
    { id: 'merch',   name: '商贾之家',     desc: '灵石 +300，仙缘 +1',             apply: { stones: 300, fate: 1 } },
    { id: 'office',  name: '官宦子弟',     desc: '声望 +20，可入大夏祀部',        apply: { fame: 20 } },
    { id: 'army',    name: '将门之后',     desc: '道心 +1、悟性 +1',               apply: { heart: 1, insight: 1 } },
    { id: 'fallen',  name: '没落世家',     desc: '怀先祖残卷（玄阶功法一，随机）', apply: { scroll: true } },
    { id: 'orphan',  name: '市井孤儿',     desc: '遁速 +2，三教九流皆识',          apply: { speed: 2 } },
    { id: 'scholar', name: '书香门第',     desc: '悟性 +3，过目成诵',             apply: { insight: 3 } },
    { id: 'monk',    name: '方外遗孤',     desc: '资质 +2，通科仪',               apply: { qualify: 2, ritual: true } },
    { id: 'demon',   name: '妖族后裔',     desc: '罕有：半妖之身',                apply: { halfDemon: true }, rare: true }
  ];

  /* ====== 法相（仅神道） ====== */
  const FAXIANG = [
    { id: 'g1',  zodiac: '龙', name: '山河障市真君', kw: '君，帝王，尊贵，龙，江山，地域，空间', opening: '香火易积，拓境速，然见效缓' },
    { id: 'g2',  zodiac: '狗', name: '市井江湖真君', kw: '民，九流，烟火，人，饮食，风俗，时间', opening: '信众易集，精微处难工' },
    { id: 'g3',  zodiac: '鸡', name: '关外北马真君', kw: '乱，村野，苦难，贼，畜生，动荡，迷信', opening: '起于乱世，世愈乱而势愈张' },
    { id: 'g4',  zodiac: '马', name: '侠武乱禁真君', kw: '侠，武术，劳力，镖，功夫，宗师，乱禁', opening: '斗法称雄，香火独薄' },
    { id: 'g5',  zodiac: '猴', name: '生死岐黄真君', kw: '医，诊病，医官，药，手术，接骨，济世', opening: '显圣最灵，济人即聚香火' },
    { id: 'g6',  zodiac: '蛇', name: '南洋邪灵真君', kw: '毒，诅咒，邪神，巫，蛊毒，灵媒，左道', opening: '灵验甚速，业力亦甚' },
    { id: 'g7',  zodiac: '虎', name: '西传密藏真君', kw: '佛，密宗，普渡，藏，皈依，因果，轮回', opening: '护身度亡，邪祟不侵' },
    { id: 'g8',  zodiac: '羊', name: '天师法道真君', kw: '道，五行，长生，天，无为，出世，自然', opening: '法脉至正，符箓称尊' },
    { id: 'g9',  zodiac: '牛', name: '神工百匠真君', kw: '匠，工艺，美，行，工业，造物，科学', opening: '造物生财，营庙最速' },
    { id: 'g10', zodiac: '猪', name: '百无禁忌真君', kw: '脏，邪祟，尸体，死，葬，风水，忌讳', opening: '阴事专精，正祀所不容' },
    { id: 'g11', zodiac: '鼠', name: '福宝衰运真君', kw: '命，生辰，商贾，运，八字，命理，玄学', opening: '财气独旺' },
    { id: 'g12', zodiac: '兔', name: '天外逐岁真君', kw: '妙，悖论，星宿，理，太空，哲学，神秘', opening: '权柄最奇' }
  ];

  /* ====== 家族（据《玄鉴仙族》：祠堂、族老、族运、收祖姓） ======
     家族是"实业"：有人口、有祠堂、有族产、有族老会。
     与宗门可并行，也可互斥；两头挂会被两边都当质子。 */
  const CLAN = {
    foundCost: 5000,          // 立族所需灵石
    foundRealm: 2,            // 需筑基
    hallRanks: [
      { lv: 0, name: '无祠',   pop: 0,    luck: 0,    gongfa: 'huang', cost: 0 },
      { lv: 1, name: '家祠',   pop: 200,  luck: 100,  gongfa: 'huang', cost: 2000 },
      { lv: 2, name: '族府',   pop: 800,  luck: 400,  gongfa: 'xuan',  cost: 6000 },
      { lv: 3, name: '宗祠',   pop: 2400, luck: 1200, gongfa: 'di',    cost: 20000 },
      { lv: 4, name: '世家',   pop: 6000, luck: 3600, gongfa: 'tian',  cost: 80000 }
    ],
    idents: [
      { id: 'di',   name: '嫡系',   desc: '血脉所在，可继任族长', mul: 1.2 },
      { id: 'pang', name: '旁支',   desc: '同姓不同房，话语权有限', mul: 1.0 },
      { id: 'ke',   name: '客卿',   desc: '外姓供奉，可「恢复祖姓」入族', mul: 0.9 }
    ],
    elders: [
      { id: 'shou', name: '守旧族老', stance: '保守', bias: '稳',   eff: '立族规时偏重「不惹事」' },
      { id: 'jin',  name: '进取族老', stance: '激进', bias: '扩张', eff: '主张收旁姓、抢灵脉' },
      { id: 'li',   name: '贪利族老', stance: '贪利', bias: '灵石', eff: '凡有利可图都想插一手' }
    ],
    /* 开局可定的族规 */
    rules: [
      { id: 'noKill',  name: '不得杀凡人',       eff: '违者族运 −300', karma: -300 },
      { id: 'guard',   name: '须护族人',         eff: '族人受欺不出头，族运 −200', karma: -200 },
      { id: 'noDemon', name: '不得入魔道',       eff: '与魔门往来，族运 −400', karma: -400 },
      { id: 'noTrade', name: '不得经商牟利',     eff: '坊市大额交易，族运 −100', karma: -100 },
      { id: 'keepRec', name: '须记族谱',         eff: '每十年不修谱，族运 −150', karma: -150 }
    ],
    /* 族人每月能产出的东西 */
    income: { stonePerPop: 0.35, luckPerPop: 0.02 }
  };

  const ZODIAC_CLASH = {
    '龙': '狗', '狗': '龙', '蛇': '猪', '猪': '蛇', '马': '鼠', '鼠': '马',
    '羊': '牛', '牛': '羊', '猴': '虎', '虎': '猴', '鸡': '兔', '兔': '鸡'
  };

  /* ====== 神道八柱 ====== */
  const PILLARS = [
    { idx: 0, name: '一柱', title: '立庙', need: 400,       power: 10,   life: 150,  miao: '野祀', coeff: 0.6 },
    { idx: 1, name: '二柱', title: '聚香', need: 1600,      power: 30,   life: 300,  miao: '私祀', coeff: 0.8 },
    { idx: 2, name: '三柱', title: '显灵', need: 7500,      power: 80,   life: 500,  miao: '乡祀', coeff: 1.0 },
    { idx: 3, name: '四柱', title: '分灵', need: 37000,     power: 200,  life: 900,  miao: '郡祀', coeff: 1.3 },
    { idx: 4, name: '五柱', title: '开府', need: 190000,    power: 500,  life: 1500, miao: '州祀', coeff: 1.6 },
    { idx: 5, name: '六柱', title: '司命', need: 900000,    power: 1200, life: 2500, miao: '国祀', coeff: 2.0 },
    { idx: 6, name: '七柱', title: '通天', need: 5000000,   power: 3000, life: 4000, miao: '天下祀', coeff: 2.5 },
    { idx: 7, name: '八柱', title: '真君', need: 25000000,  power: 8000, life: null, miao: '敕封', coeff: 3.0 }
  ];
  const POSITIONS = ['初位', '中位', '上位', '正位'];

  /* ====== 神通授予节奏（v10.5 P0·N1） ======
     当前 fromRealm=3 保持「紫府起可求」；后续改 2 即「筑基起赋予」，
     不需要改流程。shenTongLimit 仍管额度，这里只管入口何时开。 */
  const SHENTONG_GRANT = {
    xian: { fromRealm: 3, perBreak: 1, perStage: 1, pool: 'daotong' },
    shen: { fromPillar: 0, perBreak: 1, perStage: 1, pool: 'daotong' }
  };

  const PIETY = [{ v: 0.5, name: '半信半疑' }, { v: 1.0, name: '常来上香' }, { v: 1.5, name: '日日供奉' }, { v: 2.0, name: '生死相托' }];
  const MIAO_COEFF = { '野祀': 0.6, '私祀': 0.8, '乡祀': 1.0, '郡祀': 1.3, '州祀': 1.6, '国祀': 2.0, '天下祀': 2.5, '敕封': 3.0 };
  const QIHE = { benming: { v: 1.2, name: '本命法相线' }, guest: { v: 0.8, name: '客庙' }, clash: { v: 0.6, name: '相冲法相' } };
  const FOLLOW_LIMIT = [{ name: '村', max: 500 }, { name: '镇', max: 3000 }, { name: '城', max: 30000 }, { name: '州', max: 300000 }, { name: '天下', max: 3000000 }];

  const BREAK_BASE = [
    { from: 1, to: 2, self: 92, borrow: 82, seize: 65 },
    { from: 2, to: 3, self: 85, borrow: 74, seize: 55 },
    { from: 3, to: 4, self: 78, borrow: 66, seize: 45 },
    { from: 4, to: 5, self: 70, borrow: 58, seize: 38 },
    { from: 5, to: 6, self: 62, borrow: 50, seize: 30 },
    { from: 6, to: 7, self: 52, borrow: 40, seize: 22 },
    { from: 7, to: 8, self: 40, borrow: 30, seize: 12 }
  ];

  /* ====== 道途四印 ====== */
  const TIANJIANG = ['阏逢（甲）', '旃蒙（乙）', '柔兆（丙）', '强圉（丁）', '著雍（戊）', '屠维（己）', '上章（庚）', '重光（辛）', '玄黓（壬）', '昭阳（癸）'];
  const DIZHA = ['摄提格（寅）', '单阏（卯）', '执徐（辰）', '大荒落（巳）', '敦牂（午）', '协洽（未）', '涒滩（申）', '作噩（酉）', '阉茂（戌）', '大渊献（亥）', '困敦（子）', '赤奋若（丑）'];

  /* ====== 三十纳音果位 ====== */
  const GUOWEI = [
    { n: '海中金', gz: '甲子·乙丑', img: '沉于海底，宝而不可见', rank: '余位' },
    { n: '炉中火', gz: '丙寅·丁卯', img: '炉中之焰，炼物亦自焚', rank: '闰位' },
    { n: '大林木', gz: '戊辰·己巳', img: '林海遮天，独木与林', rank: '正统' },
    { n: '路旁土', gz: '庚午·辛未', img: '任人践踏，却能承万乘', rank: '闰位' },
    { n: '剑锋金', gz: '壬申·癸酉', img: '已成之刃，锋利而易折', rank: '正统' },
    { n: '山头火', gz: '甲戌·乙亥', img: '山巅之火，照远而不暖近', rank: '余位' },
    { n: '涧下水', gz: '丙子·丁丑', img: '石间细流，清而难蓄', rank: '余位' },
    { n: '城头土', gz: '戊寅·己卯', img: '城墙之土，护人亦困人', rank: '闰位' },
    { n: '白蜡金', gz: '庚辰·辛巳', img: '韧金可器，弱而不折', rank: '正统' },
    { n: '杨柳木', gz: '壬午·癸未', img: '随风而摆，柔极则断', rank: '余位' },
    { n: '泉中水', gz: '甲申·乙酉', img: '泉眼活水，细而不断', rank: '余位' },
    { n: '屋上土', gz: '丙戌·丁亥', img: '覆屋之瓦，遮雨不遮天', rank: '闰位' },
    { n: '霹雳火', gz: '戊子·己丑', img: '天雷落地，一击而尽', rank: '正统' },
    { n: '松柏木', gz: '庚寅·辛卯', img: '岁寒不凋，长得极慢', rank: '正统' },
    { n: '长流水', gz: '壬辰·癸巳', img: '不舍昼夜，去而不返', rank: '正统' },
    { n: '沙中金', gz: '甲午·乙未', img: '淘之乃得，弃之亦不惜', rank: '闰位' },
    { n: '山下火', gz: '丙申·丁酉', img: '夕照余晖，美而短', rank: '余位' },
    { n: '平地木', gz: '戊戌·己亥', img: '独木平地，无遮无靠', rank: '闰位' },
    { n: '壁上土', gz: '庚子·辛丑', img: '墙垣屏障，护而不进', rank: '正统' },
    { n: '金箔金', gz: '壬寅·癸卯', img: '贴于器物，光而薄', rank: '闰位' },
    { n: '覆灯火', gz: '甲辰·乙巳', img: '灯烛照夜，风一吹就灭', rank: '闰位' },
    { n: '天河水', gz: '丙午·丁未', img: '自天而降，润物无声', rank: '至尊' },
    { n: '大驿土', gz: '戊申·己酉', img: '通衢大道，万人走过', rank: '正统' },
    { n: '钗钏金', gz: '庚戌·辛亥', img: '饰于人身，为悦己者容', rank: '余位' },
    { n: '桑柘木', gz: '壬子·癸丑', img: '养蚕之木，为人作嫁', rank: '余位' },
    { n: '大溪水', gz: '甲寅·乙卯', img: '奔流成溪，可渡可溺', rank: '正统' },
    { n: '沙中土', gz: '丙辰·丁巳', img: '散沙难聚，聚则成洲', rank: '闰位' },
    { n: '天上火', gz: '戊午·己未', img: '日轮当空，普照无遗', rank: '至尊' },
    { n: '石榴木', gz: '庚申·辛酉', img: '繁茂多子，盛而易折', rank: '余位' },
    { n: '大海水', gz: '壬戌·癸亥', img: '万流归处，深不可测', rank: '至尊' }
  ];
  const GUOWEI_RANK = {
    '闰位': { mul: 2.5, power: 2000, rate: 60, cost: '每年「行泆」一次' },
    '余位': { mul: 4,   power: 3000, rate: 40, cost: '正位一唤必到' },
    '正统': { mul: 7,   power: 4200, rate: 20, cost: '一举一动皆为天心' },
    '至尊': { mul: 15,  power: 5400, rate: 5,  cost: '天下共抢' }
  };

  /* ====== 锚（v6.2 核心：无寿元者靠锚） ====== */
  const ANCHOR_TYPES = [
    { id: 'wu', name: '物锚', xian: '金性、本命法宝、道统信物', shen: '庙中塑像、神箓、神位黑箓',
      solid: '存在且完好，未被夺、未破损', fixStones: 500, fixCost: '重铸信物／重塑像：500 灵石' },
    { id: 'ren', name: '人锚', xian: '亲传弟子（在世且未叛）／道侣／护道者', shen: '信众达本柱门槛／守庙人／上级城隍',
      solid: '人在、未散、未叛', fixStones: 200, fixCost: '寻访亲传／重聚信众：200 灵石' },
    { id: 'shi', name: '事锚', xian: '未了的道（开道未成）或已立的法则', shen: '履职（牧民、镇灾、剿邪祀）',
      solid: '按期履职，未抗命、未弃职', fixStones: 300, fixCost: '了却一事／履职一回：300 灵石' },
    { id: 'yi', name: '仪锚', xian: '续灯仪（每甲子一次，独坐七日七夜，不可中断）', shen: '岁时大醮（每年一场）＋晨昏三炷香（每日）',
      solid: '按期举行，一场不落', fixStones: 400, fixCost: '备齐仪物、补办一场：400 灵石' }
  ];

  const ANCHOR_STATES = { solid: { v: 1, name: '固' }, loose: { v: 0.5, name: '松' }, broken: { v: 0, name: '断' } };

  const ANCHOR_STATUS = [
    { min: 3.0, max: 4.01, name: '稳', eff: '正常，战力满额' },
    { min: 2.0, max: 3.0,  name: '虚', eff: '战力 ×0.85；每月 1d100≤20「恍惚」，忘记一件事' },
    { min: 1.0, max: 2.0,  name: '将散', eff: '战力 ×0.6；每月显一次异象' },
    { min: -0.01, max: 1.0, name: '失锚', eff: '进入 3 个月崩解期' }
  ];

  /* ====== 箓 ====== */
  const LU = [
    { rank: '灰', name: '避死延生', eff: '致命一击前必得预警；每战可免一次突袭' },
    { rank: '灰', name: '力贯千钧', eff: '气血上限 +30%' },
    { rank: '灰', name: '持盈保泰', eff: '百艺判定 +10，机缘 +5' },
    { rank: '灰', name: '长空危雀', eff: '斗法伤害 +20%，先手 +2' },
    { rank: '灰', name: '延年长命', eff: '寿元 +40 年' },
    { rank: '灰', name: '竭命功成', eff: '耗 10 年寿元，三回合爆发数倍' },
    { rank: '白', name: '重海长鲸', eff: '灵力上限 +50%' },
    { rank: '白', name: '行气吞灵', eff: '修为/香火转化 +20%' },
    { rank: '白', name: '谷风引火', eff: '火系 +30%，炼丹 +1 级' },
    { rank: '白', name: '明霜松岭', eff: '看破幻术伪装，神识 +3' },
    { rank: '青', name: '明彰日月', eff: '斗法伤害 +40%，白昼升一档' },
    { rank: '青', name: '贪罟玄离', eff: '感应他人恶意、境界、寿元余量' },
    { rank: '青', name: '明晦道弦', eff: '阴阳两系皆通，双修 +50%' },
    { rank: '青', name: '彩彻云衢', eff: '全属性 +1' },
    { rank: '黄', name: '移时易世仪', eff: '借一寸光阴，可回退一回合' }
  ];

  /* ====== 道统（仙道，筑基时定） ====== */
  const DAOTONG = {
    'd6': ['太阳', '少阳', '明阳', '太阴', '少阴', '厥阴'],
    'jin': ['兑金', '逍金', '齐金', '库金', '庚金'],
    'mu': ['正木', '保木', '集木', '角木', '更木'],
    'shui': ['坎水', '府水', '合水', '牝水', '渌水'],
    'huo': ['离火', '真火', '并火', '牡火', '灴火'],
    'tu': ['艮土', '戊土', '归土', '宝土', '宣土', '青宣'],
    'qi12': ['清炁', '邃炁', '紫炁', '真炁', '寒炁', '晞炁', '瑞炁', '煞炁', '谪炁', '华炁', '上仪', '下仪'],
    'lei3': ['玄雷', '霄雷', '神雷'],
    'gudu': ['荒', '无相']
  };

  /* 道统归属：每个道统属于哪一大类（用于宗门/家族倾向与显示） */
  const DAOTONG_CLASS = {
    'd6': '六阳六阴', 'jin': '金行', 'mu': '木行', 'shui': '水行', 'huo': '火行',
    'tu': '土行', 'qi12': '十二炁', 'lei3': '雷', 'gudu': '孤独'
  };

  /* ====== 道统气质（v10.4 P1·S2） ======
     49 个道统归 7 支气质，只用来微调神通的「手感」，不决定强弱。
     为什么需要这一层：道统此前只决定「道统池里抽哪些神通名」，
     抽到之后所有术类神通长得一模一样——名字不同、用起来相同。
     接上气质后，「我是什么道统」第一次影响战斗手感，而玩家不需要
     重新学一套系统（气质只改 mul±0.10 / cost±5 与一个附加效果）。
     ------------------------------------------------------------
     为什么不写进 SHENTONG 原表：那是 178 条裸字符串，改造要迁移旧档。
     气质从 S.daotong 派生，旧存档零迁移。
     护栏（见方案第六章）：mul ±0.10、cost ±5，不许出现强弱碾压。 */
  const DAOTONG_TEMPER = {
    '刚烈': {
      daotong: ['太阳', '少阳', '明阳', '玄雷', '霄雷', '神雷'],
      mul: 0.10, cost: 5,
      desc: '杀伤更烈，灵力耗得也更多',
      text: '伤害 ×1.10，灵力 +5'
    },
    '幽微': {
      daotong: ['太阴', '少阴', '厥阴'],
      mul: -0.05, cost: 0,
      desc: '阴柔绵长，破绽多留一回合',
      text: '伤害 ×0.95，破绽 +1 回合'
    },
    '转换': {
      daotong: ['兑金', '逍金', '齐金', '库金', '庚金'],
      mul: 0, cost: 0,
      desc: '金性流转，出手后回一分灵力',
      text: '命中后回流 8 点灵力'
    },
    '生养': {
      daotong: ['正木', '保木', '集木', '角木', '更木'],
      mul: -0.05, cost: -5,
      desc: '生生不息，自愈更厚、耗损更省',
      text: '伤害 ×0.95，灵力 −5，自愈 ×1.3'
    },
    '润下': {
      daotong: ['坎水', '府水', '合水', '牝水', '渌水'],
      mul: 0, cost: 0,
      desc: '以柔克刚，削敌气势',
      text: '命中后敌方气势 −1 档'
    },
    '炎上': {
      daotong: ['离火', '真火', '并火', '牡火', '灴火'],
      mul: 0.05, cost: 3,
      desc: '火性上炎，余焰不熄',
      text: '伤害 ×1.05，灵力 +3，点燃灼烧 2 回合'
    },
    '虚空': {
      daotong: ['艮土', '戊土', '归土', '宝土', '宣土', '青宣',
        '清炁', '邃炁', '紫炁', '真炁', '寒炁', '晞炁', '瑞炁', '煞炁', '谪炁', '华炁', '上仪', '下仪',
        '荒', '无相'],
      mul: 0, cost: 0,
      desc: '不落形迹，位格压制看得淡些',
      text: '位格压制减轻一档'
    }
  };

  /* ====== 宗门（据《苟在初圣魔门当人材》内外门结构） ======
     外门四殿 → 内门四峰 → 真传。真正的上乘神通只在真传层，
     非真传不可学。叛门立过誓，代价是修为倾泻。 */
  const SECT = {
    name: '青云宗',
    halls: ['炼宝殿', '炼丹殿', '御兽殿', '合欢殿'],
    peaks: ['补天峰', '赤霄峰', '藏锋峰', '丹霞峰'],
    ranks: [
      { id: 0, name: '记名弟子', need: 0,     pay: 0,   due: 10,  lvl: ['wai'],              equip: 2,
        desc: '外门一殿的杂役，无月俸，任务繁重' },
      { id: 1, name: '外门弟子', need: 500,   pay: 20,  due: 10,  lvl: ['wai', 'nei'],       equip: 3,
        desc: '得上供，可入藏经阁外门层与内门层' },
      { id: 2, name: '内门弟子', need: 2000,  pay: 60,  due: 12,  lvl: ['wai', 'nei'],       equip: 4,
        desc: '独立洞府，听调于本峰' },
      { id: 3, name: '真传',     need: 8000,  pay: 200, due: 40,  lvl: ['wai', 'nei', 'zhen'], equip: 5,
        desc: '藏经阁全开——真正厉害的神通都在这一层' },
      { id: 4, name: '长老',     need: 30000, pay: 600, due: 120, lvl: ['wai', 'nei', 'zhen'], equip: 5,
        desc: '一峰之主，可收徒、可分配资源' }
    ],
    tasks: [
      { id: 'caoyao',  name: '采药',   contrib: 30,  risk: 0.04, desc: '往灵药圃采三味药，一月的活' },
      { id: 'liandan', name: '守炉',   contrib: 60,  risk: 0.05, desc: '替丹房守三日炉火，不能打盹' },
      { id: 'xunshan', name: '巡山',   contrib: 90,  risk: 0.10, desc: '巡山三日，清剿野兽与散修' },
      { id: 'lieyao',  name: '猎妖',   contrib: 200, risk: 0.28, desc: '围猎成形妖兽，或遇强敌' },
      { id: 'zhensou', name: '镇守',   contrib: 400, risk: 0.34, desc: '守一处灵脉口，遇邪修是常事' }
    ],
    /* 藏经阁：招式与功法各按 lvl / tier 分级开放 */
    lib: [
      { tier: 'huang', who: 'wai',  price: 0 },
      { tier: 'xuan',  who: 'nei',  price: 0 },
      { tier: 'di',    who: 'zhen', price: 0 },
      { tier: 'tian',  who: 'zhen', price: 0 }
    ],
    oath: '入我青云门，立玄景之誓：不叛、不欺、不害同门。违誓者玄景破碎，一身修为如同流水一般倾泻而出。',
    betray: { realm: -1, heart: -3, fame: -60 }
  };

  /* 招式价目（贡献点） */
  const SKILL_PRICE = { wai: 120, nei: 600, zhen: 2400 };

  const SANXUAN = {
    qing: { name: '青玄', eff: '转化 −10%，神通上限 +1，闭关不受流失惩罚' },
    tong: { name: '通玄', eff: '闰位/借位成功率 +10，借祀不折' },
    dou:  { name: '兜玄', eff: '信众增长 +20%，夺祀抵抗 −10' }
  };

  const SHENTONG = {
    '太阳': ['分阳钗（命）', '郁仪文'],
    '少阳': ['奉东君（命）', '目骋怀（目）', '邪绝求（命）', '相诀观', '赤断镞（术）'],
    '明阳': ['天下明（命）', '谒天门', '帝观元', '君蹈危（身）', '赤断镞（术）'],
    '太阴': ['结璘章（命）', '仪对影（身）', '湖月秋', '诣太素', '夜光府', '惊鹊乡', '不胜寒'],
    '少阴': ['太冲观', '香俱沉', '调杼柚'],
    '厥阴': ['不紫衣（身）', '不二舆', '利异臣'],
    '兑金': ['金窍心（命）', '位从孚', '君兑隅（术）', '杀收宫（术）', '不穷锋'],
    '逍金': ['望商锋', '逍遥游', '不穷锋'],
    '齐金': ['天齐满'],
    '库金': ['帑梁银', '金销洞'],
    '庚金': ['今去故（命）', '再折毁', '镂金石', '天金冑（身）', '墓门棘'],
    '正木': ['木成方（命）', '位从专', '见查语', '背南行（身）'],
    '保木': ['神在隰'],
    '集木': ['妄诞林', '祸延生', '隼就栖', '诸蓼会', '凌云木', '余养性'],
    '角木': ['余养性', '潇重林', '黎运春', '乙木全'],
    '更木': ['病前春（命）'],
    '坎水': ['溪上翁', '入坎窞', '浩瀚海', '长云暗', '恨江去', '位从险（命身）'],
    '府水': ['朝寒雨', '合黎渊', '宿穷冬', '广浚湖'],
    '合水': ['归流处', '谶在兹', '广准圣', '诸合还', '妖渎河'],
    '牝水': ['佞无晨', '往生泉（命身）', '谿谷会', '参玄臟'],
    '渌水': ['如重浊（命身）', '洞泉声（命身）', '清夕雨', '丑癸藏', '洗劫露（命身）'],
    '离火': ['顺平征（命术）', '位从罗', '大离书', '九重擭（术）', '折焚尽', '雉离行'],
    '真火': ['雉离行', '天兜火', '治命神'],
    '并火': ['乌从欲', '心期焚', '兼险夺', '至命除', '焰中乌'],
    '牡火': ['牡煞火', '韬无灾', '高陵父', '受灴龠'],
    '灴火': ['燔旧室', '白樆心', '布燥使', '秉灴夏'],
    '艮土': ['愚赶山', '正源谷'],
    '戊土': ['受抚顶', '仙无漏', '戊心岩'],
    '归土': ['狡落原', '庥命簋', '有常主', '养役母'],
    '宝土': ['高垒燕', '藏纳宫（身）', '膏泽治', '梭摩岭'],
    '宣土': ['朝社参', '神用命', '训浚明', '愚赶山'],
    '青宣': ['伏青山', '青宣岳', '玄羊子', '上岩神', '观地冥'],
    '清炁': ['洗尘', '澄心', '破秽'], '邃炁': ['沉渊', '远视', '藏形'],
    '紫炁': ['紫气临门', '贵不可言'], '真炁': ['返真', '祛妄', '见性'],
    '寒炁': ['冻绝', '噤声', '雪覆'], '晞炁': ['曝晒', '枯竭', '消融'],
    '瑞炁': ['赐福', '丰年', '解厄'], '煞炁': ['煞冲', '夺魄', '横死'],
    '谪炁': ['谪落', '革籍', '削位'], '华炁': ['华彩', '盛极', '锦绣'],
    '上仪': ['立规', '正名', '肃众'], '下仪': ['伏低', '屈人', '役使'],
    '玄雷': ['靖平敕', '至阳嘘', '神宫誓', '律演威', '伐封坛'],
    '霄雷': ['冬雷声', '春惊蛰', '轻雷落', '斡动紫'],
    '神雷': ['殛邪', '殄祟', '肃清'],
    '荒':   ['废墟立', '绝地行', '荒野呼'],
    '无相': ['扮相', '易形', '借面']
  };

  /* ====== 释修 ====== */
  const SHIXIU = [
    { pos: '僧侣', equal: '一~二柱', power: 8, special: '钢筋铁骨，不施法术，不吃毒' },
    { pos: '法师', equal: '三柱', power: 90, special: '本尊加持，可镇邪祟' },
    { pos: '怜愍', equal: '四柱', power: 150, special: '可解他人心魔（代价：共业）' },
    { pos: '摩诃', equal: '五~六柱', power: 400, special: '可轮回多世累修' },
    { pos: '法相', equal: '七柱', power: 2500, special: '一方法相即一方佛国' },
    { pos: '世尊', equal: '八柱以上', power: 7000, special: '比肩道胎' }
  ];

  /* ====== 魔门人材 ====== */
  const RENCAI = [
    { name: '下材', cond: '凡人', value: 1 },
    { name: '中材', cond: '有灵窍', value: 5 },
    { name: '上材', cond: '练气', value: 30 },
    { name: '绝材', cond: '筑基以上', value: 200 }
  ];

  /* ====== 地图 ====== */
  const REGIONS = [
    { id: 'qingyue', name: '东洲·青岳', danger: 0, suggest: '胎息~筑基', desc: '散修与凡人混居，青云宗、天机坊市坐落于此' },
    { id: 'nanyue', name: '南疆·赤炎', danger: 1, suggest: '练气~筑基', desc: '火系灵脉、妖兽横行，赤阳宗、万兽谷' },
    { id: 'xisha', name: '西漠·流沙', danger: 2, suggest: '紫府~金丹', desc: '上古遗迹与佛门净土，浮屠寺镇守魔渊' },
    { id: 'beiyuan', name: '北原·寒渊', danger: 3, suggest: '金丹~道胎', desc: '冰系灵脉，雪族领地，幽冥殿鬼修出没' },
    { id: 'zhongzhou', name: '中州·天阙', danger: 2, suggest: '筑基~道胎', desc: '修真界中心，诸道统林立' }
  ];

  /* ====== 道途 ====== */
  const PATHS = [
    { id: 'ascend', name: '问道飞升', desc: '自创功法、参悟天机，寻飞升之路' },
    { id: 'long',   name: '逍遥长生', desc: '护住所爱之人，渡百年千年' },
    { id: 'revenge',name: '快意恩仇', desc: '血亲故人旧怨，寻仇亦被仇寻' },
    { id: 'guard',  name: '守护所爱', desc: '挚友/道侣身负隐疾或寿元大限' },
    { id: 'rule',   name: '问鼎天下', desc: '从外门弟子爬到一宗之主' },
    { id: 'free',   name: '随心所欲', desc: '随机奇遇拼机缘，自由散修' }
  ];

  /* ====== 道途目标（v7.4） ======
     不另立主线剧情，只把「下一步该做什么」摆在主栏：
     沿境界/柱数走，一步一奖，完成即换下一张。
     kind: realm 看 S.xRealm；pillar 看 S.pillar；followers 看 S.followers */
  const GOALS = {
    xian: [
      { id: 'x1', name: '入练气', hint: '打坐采气，把胎息六轮走满', kind: 'realm', n: 1, reward: { stones: 50 } },
      { id: 'x2', name: '筑仙基', hint: '练气九层圆满，筑基。六轮散了，气海里多出一块东西', kind: 'realm', n: 2, reward: { stones: 120, pill: 'pillMp' } },
      { id: 'x3', name: '开紫府', hint: '紫府三关，过一关是一关', kind: 'realm', n: 3, reward: { stones: 260, pill: 'xiaoPo' } },
      { id: 'x4', name: '结金丹', hint: '三十个果位，先争一个', kind: 'realm', n: 4, reward: { stones: 600, pill: 'clear' } },
      { id: 'x5', name: '化道胎', hint: '以己心代天心。到此，天收不走你', kind: 'realm', n: 5, reward: { stones: 1500, pill: 'ningShen' } }
    ],
    shen: [
      { id: 's1', name: '聚信百人', hint: '施粥、请戏、显圣——先让一百个人记得你', kind: 'followers', n: 100, reward: { stones: 40 } },
      { id: 's2', name: '立庙受祀', hint: '一柱立庙。供桌上不能只有半个冷馒头', kind: 'pillar', n: 1, reward: { stones: 90 } },
      { id: 's3', name: '三柱显灵', hint: '乡祀三柱，神迹要让人看见', kind: 'pillar', n: 3, reward: { stones: 400, xianghuo: 200 } },
      { id: 's4', name: '五柱开府', hint: '开府分灵，香火成川', kind: 'pillar', n: 5, reward: { stones: 1200 } },
      { id: 's5', name: '八柱真君', hint: '八柱正位，三十个位里有一个是你的', kind: 'pillar', n: 7, reward: { stones: 4000 } }
    ]
  };

  /* ====== 情缘 ====== */
  /* ====== 情缘 NPC（文本版：三层台词 + 论道问答）======
     词条取自《玄鉴仙族》的白话古意腔：不用生僻典，写"家常话里的沧桑"。
     meet 初见 / stages 好感阶段 / ctx 情境 / ask 论道的一问三答 */
  const NPC_POOL = [
    {
      id: 'guqingxuan', name: '顾清玄', gender: '男', role: '青云宗真传', age: 22,
      look: '温润剑修，青衫缓带',
      likes: ['剑', '清茶', '山水'], approach: '切磋论剑、助他参悟剑意', taboo: '认死理，勿欺',
      realm: 2, inner: '守正到几近固执，认准的理绝不回头',
      meet: [
        '立演武场侧，青衫为风掀起一角。汝近前，不回首，惟将剑纳鞘半寸。',
        '「你的气不稳。」他说，「急着筑基的人，多半死在筑基前一夜。」'
      ],
      stages: [
        { min: 0, lines: ['「道友。」他点头，目光已经回到剑上。'] },
        { min: 20, lines: ['「你这口气，比我上回见时纯了些。」'] },
        { min: 40, lines: ['「我这一式练了七年。你若有兴趣，我拆开给你看。」', '他讲解的时候，会把手抬得很慢，让你看清每一寸力道。'] },
        { min: 70, lines: ['「若有一日我剑断了，你替我把这半截埋在青云峰上。」', '他说这话时很平静，像在交代一件早就想好了的事。'] }
      ],
      ctx: {
        break: ['他站在门外，没进来，只说了句「恭喜」，把一壶酒放在门槛上就走了。'],
        hurt: ['「谁伤的？」他问得很平，手已经按在剑上。'],
        part: ['「路远。」他把剑换到另一侧腰间，「若你三年不回，我去找你。」'],
        together: ['他与你并肩时话很少，但你的左后方始终有人。']
      },
      ask: {
        q: '汝道，剑宜快乎，宜稳乎',
        opts: [
          { t: '「快。迟则不及」', reply: '摇头：「既来不及，本不该出手。」', fav: 2 },
          { t: '「稳。俟其隙而后发」', reply: '视汝一眼：「此语类吾师所言。」', fav: 5 },
          { t: '「视君所惧者何」', reply: '愕然，良久乃笑：「……此未尝思及。」', fav: 8 }
        ]
      }
    },
    {
      id: 'yunqi', name: '云栖', gender: '女', role: '天机坊市老板娘', age: 25,
      look: '聪慧狡黠，眼底藏着算计',
      likes: ['灵石', '奇闻', '算计'], approach: '陪她做局、共享情报', taboo: '别在她面前说谎',
      realm: 1, inner: '把人情算成一笔账，却总留一格给自己',
      meet: [
        '坐账台后，算盘寂然，手指逐珠轻拨，若无所事。',
        '「新至此？」抬眼，「此处不问来历，只问君欲买，抑或欲卖。」'
      ],
      stages: [
        { min: 0, lines: ['「明码标价，童叟无欺。」她笑得很好看。'] },
        { min: 20, lines: ['「这单我不赚你。」她把东西推过来，「记着，你欠我一回。」'] },
        { min: 40, lines: ['「东边那家铺子昨儿关了张。」她拨了拨算珠，「我知道是谁做的。你要听，还是不要听？」'] },
        { min: 70, lines: ['「账我算了一辈子。」她忽然说，「只有你这一笔，我一直没算清。」'] }
      ],
      ctx: {
        break: ['她送来一张单子，上头写着「贺」，后头跟着三个问号。'],
        hurt: ['「命捡回来就好。」她替你换了药，「下回别死在外头，我还等着收账。」'],
        part: ['「走吧。」她把一小袋灵石塞给你，「路上别乱花——算了，你肯定会乱花。」'],
        together: ['她走在你侧边半步，一路上把遇见的每个人都在心里标了价。']
      },
      ask: {
        q: '汝道，人情重乎，灵石重乎',
        opts: [
          { t: '「灵石。人情至贱」', reply: '失笑：「痛快。吾喜与痛快人交易。」', fav: 3 },
          { t: '「人情。财散而复聚」', reply: '拨珠之手微顿：「……君非为巨贾之材。」', fav: 4 },
          { t: '「问此，欲闻真言，抑或甘言」', reply: '注视良久，忽合账册：「真言。止此一回。」', fav: 8 }
        ]
      }
    },
    {
      id: 'xiewujiu', name: '谢无咎', gender: '男', role: '血魔宗少主', age: 24,
      look: '亦正亦邪，眼底猩红',
      likes: ['烈酒', '杀戮', '真心'], approach: '以命相交、并肩作战', taboo: '忌惮背叛胜过死亡',
      realm: 4, inner: '杀人不眨眼，却记得每个替他挡过刀的人',
      meet: [
        '他坐在尸堆上喝酒，血顺着刀鞘一滴一滴落在土里。',
        '「过来坐。」他拍了拍身边的位置，「这酒不错，死人喝不着。」'
      ],
      stages: [
        { min: 0, lines: ['「你身上没有血味。」他嗅了一下，「生人。」'] },
        { min: 20, lines: ['「你还没变。」他把酒推过来，「挺好，别变。」'] },
        { min: 40, lines: ['「那年在断魂坡，有个替我挡刀的。」他顿了顿，「我连他叫什么都不知道。」'] },
        { min: 70, lines: ['「我这条命，欠过很多人。」他笑了笑，「你要是哪天要，就说一声。」'] }
      ],
      ctx: {
        break: ['他提着刀站在门口，刀上还在滴。「听说你成了。」他说，「我来看看是不是真的。」'],
        hurt: ['他一言不发地把你从地上拎起来，背在肩上走了三十里。'],
        part: ['「滚吧。」他转过身，「别回头，我这种人留不住谁。」'],
        together: ['他杀人时不看你在哪，但每次收刀，都会先确认你还在。']
      },
      ask: {
        q: '杀人的时候，你在想什么？',
        opts: [
          { t: '「什么都不想。」', reply: '「骗人。」他灌了一口酒，「不想的人，活不到我这个岁数。」', fav: 3 },
          { t: '「想他为什么挡在我前头。」', reply: '他的手停住了，很久才说：「……你倒是会问。」', fav: 8 },
          { t: '「想着快点结束。」', reply: '他点头：「这话实。实话说得少，我记你一回。」', fav: 5 }
        ]
      }
    },
    {
      id: 'bainingshuang', name: '白凝霜', gender: '女', role: '北原雪族圣女', age: 21,
      look: '清冷孤高，霜色长发',
      likes: ['雪', '冰系灵植', '独处'], approach: '以诚相待、勿油嘴', taboo: '雪原共看极光可升温',
      realm: 3, inner: '习惯了孤独，怕的是有人真的走进来',
      meet: [
        '雪落在她肩上，她不拂。',
        '「族里说不许外人上山。」她说，「我说了算。」'
      ],
      stages: [
        { min: 0, lines: ['她只朝你点了下头，转身走进风雪，没有留话。'] },
        { min: 20, lines: ['「你还来。」她说这话时没看你，但门前扫出了一条路。'] },
        { min: 40, lines: ['「北原的雪一落半年。」她递来一碗热汤，「喝。别死在雪里，难看。」'] },
        { min: 70, lines: ['「我从小一个人。」她说，「不是没人，是他们都怕冷。」'] }
      ],
      ctx: {
        break: ['她在极光下站了很久，才说：「你身上回暖了。」'],
        hurt: ['她把冰系灵植按在你伤口上，冷得你一抖。「忍着。」她说，「我只会这一种治法。」'],
        part: ['「北原的冬天很长。」她背对着你，「你要是不回来，我就当没见过你。」'],
        together: ['她不说冷，但走得离你近了一点。']
      },
      ask: {
        q: '一个人在雪原上，不寂寞吗？',
        opts: [
          { t: '「习惯了就不寂寞。」', reply: '她轻轻「嗯」了一声，像在答自己。', fav: 4 },
          { t: '「寂寞。所以我才来。」', reply: '她转过脸看你，眼神里有种被冒犯的怔忡。', fav: 6 },
          { t: '「你要是寂寞，我可以常来。」', reply: '「不必。」她答得很快，隔了一会儿又低声说，「……雪大的时候，路会封。」', fav: 8 }
        ]
      }
    },
    {
      id: 'mochen', name: '墨尘', gender: '男', role: '古妖山少主', age: 20,
      look: '傲娇少年相，化形妖族',
      likes: ['灵果', '肉食', '自由'], approach: '护他妖身秘密、带他逛人间', taboo: '口嫌体正直',
      realm: 4, inner: '嘴上说人类无趣，却偷偷学会了煮茶',
      meet: [
        '一少年踞枝啖灵果，果核坠汝足侧。',
        '「人类。」他嗤了一声，「你们走路真慢。」'
      ],
      stages: [
        { min: 0, lines: ['「又是你。」他抱臂，「我不是在等你，我在等果子熟。」'] },
        { min: 20, lines: ['「这果子分你一半。」他把大的那块塞给你，「别以为我大方。」'] },
        { min: 40, lines: ['「我煮了茶。」他说得漫不经心，「……苦的，你大概喝不惯。」'] },
        { min: 70, lines: ['「你们人类会死。」他忽然说，「真麻烦。」'] }
      ],
      ctx: {
        break: ['他从树上跳下来，「哦，成了。」转身又跳回去，半天才丢下一句，「……厉害。」'],
        hurt: ['他蹲在旁边看你包扎，一句话不说，尾巴尖一直在抖。'],
        part: ['「随便你。」他别过头，「反正我这儿也不缺你一个。」'],
        together: ['他一路抱怨人类的路难走，却始终没落下半步。']
      },
      ask: {
        q: '你们妖族，为什么不喜人类？',
        opts: [
          { t: '「因为我们弱，杀起来容易。」', reply: '他嗤地笑了，但笑得不太好看：「……也不全是。」', fav: 4 },
          { t: '「因为你们活得太短，记不住。」', reply: '他愣了一下：「谁跟你说的？」', fav: 8 },
          { t: '「那你呢？你也讨厌？」', reply: '「讨厌。」他答得干脆，顿了顿，「……也不算很讨厌。」', fav: 6 }
        ]
      }
    },
    {
      id: 'luoqianqian', name: '洛浅浅', gender: '女', role: '合欢宗弟子', age: 20,
      look: '魅惑多情，眼波流转',
      likes: ['甜食', '双修', '新鲜事'], approach: '认真待她，勿当玩物', taboo: '看似风流实则怕寂寞',
      realm: 2, inner: '把「不在意」练成了本能，怕一在意就输',
      meet: [
        '以一糖相递，汝未受，遂笑而折腰。',
        '「真有意思。」她说，「我还没见过你这样的人。」'
      ],
      stages: [
        { min: 0, lines: ['「来啦。」她连头都没抬，「坐，等下还有别人来。」'] },
        { min: 20, lines: ['「今天只有你。」她把帘子放下，「稀奇。我不常这样。」'] },
        { min: 40, lines: ['「你别对我这么好。」她说得半真半假，「我会当真的。」'] },
        { min: 70, lines: ['「我这个人啊，」她把脸埋在你肩上，「谁都能哄高兴，就是哄不好自己。」'] }
      ],
      ctx: {
        break: ['她送来一盒糖，纸笺上写：「恭喜，可惜我没见着。」'],
        hurt: ['她守了你三天，你醒来时她趴在床边，睫毛上还有泪痕，硬说是药熏的。'],
        part: ['「去吧。」她笑得很好，「我不等的，你别误会。」'],
        together: ['她一路有说有笑，只在你没看的时候才收起笑脸。']
      },
      ask: {
        q: '你为什么总是笑？',
        opts: [
          { t: '「笑起来好看，好看好办事。」', reply: '「这才是实话。」她笑得更好看了，眼睛却没跟上。', fav: 2 },
          { t: '「因为不笑的话，怕别人看见别的。」', reply: '她脸上的笑停住了两秒，然后笑得更用力：「你很烦。」', fav: 8 },
          { t: '「不知道。习惯了。」', reply: '她点头，很轻：「嗯，习惯了。」', fav: 5 }
        ]
      }
    },
    /* ====== 2026-11-17 素材增补：四个人 ======
       写法取「白描、家常话里带沧桑」：不解释性格，只让他们说一句自己的话。
       语境键对齐代码：break（你突破时）/ hurt（你受伤时）/ part（分别）/
       together（同行）。素材里其余情境（送茶、下雨）并进 stages 与论道。 */
    {
      id: 'shenqingheng', name: '沈青蘅', gender: '女', role: '丹殿执事', age: 126,
      look: '素色道袍袖口全是旧药渍，指甲缝里常年一点朱砂红',
      likes: ['火候稳的人', '不催丹的人', '新茶'],
      approach: '陪她守一次火，别催',
      taboo: '催丹与添火',
      realm: 3,
      inner: '炼废的丹比炼成的多。她记得每一炉废丹的价钱，所以从不许人浪费她的火',
      meet: [
        '丹房里她头也不回：「炉子在右边，炭在左边。站着别动，火候不能分心。」',
        '「别碰那三只炉。它们有名字，比你资历老。」',
        '她把你递来的药材翻了一遍，挑出两根：「晒的时候心不在，药性就心不在。」'
      ],
      stages: [
        { min: 0, lines: ['「论道去别处。丹房只谈丹。」'] },
        { min: 20, lines: ['「你这月废的丹，数目报我。不是罚你，是要知道你废在哪一步。」'] },
        { min: 40, lines: ['「新茶带了吗。带了就坐下。炉还有半个时辰，这半个时辰我教你看火。」'] },
        { min: 70, lines: ['「我这一炉成了，分你一枚。别谢我，谢你上月替我守了一夜火。」'] }
      ],
      ctx: {
        break: ['她从丹房探出头来：「突破后三日忌大荤忌大喜。大喜也别来丹房，火会分心。」'],
        hurt: ['「伤药在我这，比坊市的好，比坊市的贵。记账上。」'],
        part: ['「炉还有半个时辰。你要走就走，别把门关响。」'],
        together: ['她走在你半步之后，一路闻你身上的药味，说你这几日上火了。']
      },
      ask: {
        q: '一炉丹，火候到了九分，还差一分，等还是不等？',
        opts: [
          { t: '「等。丹如种，急不得。」',
            reply: '她点头：「答对了。九分的丹，等一日是圆满，催一时是炉渣。」', fav: 6 },
          { t: '「不等。九分也是成丹。」',
            reply: '「实用。」她把丹收了，「成丹归你，名声别挂我丹房。」', fav: 2 },
          { t: '「看这一炉丹要给谁。」',
            reply: '她第一次正眼看你：「你悟得比炉快。」', fav: 8 }
        ]
      }
    },
    {
      id: 'peizhao', name: '裴照', gender: '男', role: '叛刀客', age: 88,
      look: '左眉一道旧疤到鬓角，刀鞘缠布。布换过很多次，刀没换过',
      likes: ['痛快话', '不问来路的人', '脆枣'],
      approach: '说痛快话，别问他师门',
      taboo: '提「师门」二字',
      realm: 4,
      inner: '魔门教他刀，没教他回头。回头是他在人间市集看杀猪时学会的，猪都知道挣一下',
      meet: [
        '官道旁破亭里，他磨刀不看人：「坐可以，说话不行。刀听声。」',
        '「你身上有宗门的香火气。不是骂你，就是闻得出来。」',
        '他把枣核吐进路沟：「修行的人吃枣吐核么。」他自己先答，「我吐。」'
      ],
      stages: [
        { min: 0, lines: ['「让路。」两个字，用完了本月的客气。'] },
        { min: 20, lines: ['「你的剑比人慢半拍。改不改。不改也行，死的时候快些。」'] },
        { min: 40, lines: ['「我这刀上三条人命，都是该杀的。该不该，我判的。你要觉得我判错了，来讨。」'] },
        { min: 70, lines: ['「哪日我死在刀下，把我埋在杀猪巷口。我要听着那声儿走。」'] }
      ],
      ctx: {
        break: ['他把一枚碎枣核弹进你洞府：「贺礼。没毒，就是枣核。」'],
        hurt: ['「谁的刀。」他问完没等你答，已经起身了。'],
        part: ['「走了。」他背对着你摆手，「别送。送了像送葬。」'],
        together: ['你左我右。他走在侧前，刀鞘上的布被风掀起一角，底下的鞘磨得发亮。']
      },
      ask: {
        q: '魔门的刀法，一刀一命。这刀该不该传？',
        opts: [
          { t: '「该传。刀无罪。」',
            reply: '「刀无罪，刀客有。」他收刀，「传出去的每一刀，都算我教唆。挑个心硬的。」', fav: 6 },
          { t: '「不该传。一命换一命，太贵。」',
            reply: '「贵。你宗门的丹，哪一炉不是命换的。」', fav: 1 },
          { t: '「传之前，先教会收刀。」',
            reply: '他愣了很久：「我师父没教过这手。」', fav: 8 }
        ]
      }
    },
    {
      id: 'laomiao', name: '老庙祝', gender: '男', role: '村土地庙庙祝', age: 71,
      look: '洗得发白的青布袍，袖口磨出毛边，腰间挂一串旧钥匙',
      likes: ['香灰干净', '孩子', '修好的门槛'],
      approach: '替村里做一件事，别提神',
      taboo: '问他为什么信',
      realm: 1,
      inner: '他不是信神，他信「有人管」。庙里有神，村里有主，人就不慌',
      meet: [
        '他正扫庙前的雪，扫帚很旧：「进来吧。踩过的雪扫不净，踩踏点。」',
        '「香自己上。神不挑香，挑的是手干净。」',
        '「求什么。哦，你修仙的。仙不用求我，我倒要求仙，别把庙前这条路修飞了。」'
      ],
      stages: [
        { min: 0, lines: ['「香火钱随意。这庙三百岁，见过的修士比你见的庙多。」'] },
        { min: 20, lines: ['「你上回踩坏那块砖，我补了。补砖的泥里掺了香灰。神不计较，砖要计较。」'] },
        { min: 40, lines: ['「你帮村里挡过那回妖潮，孩子们给你立了个小木牌，就插在庙门口。别嫌小，木头比石头香。」'] },
        { min: 70, lines: ['「我死了以后，庙祝的钥匙给你。你嫌累就转给别人。钥匙不怕换人，怕没人接。」'] }
      ],
      ctx: {
        break: ['「突破是喜事。喜事上庙，添三炷香。不为你的，为村里看看你气色。」'],
        hurt: ['他端来一碗符水：「信不信随你，喝了总是暖的。」'],
        part: ['他送到庙门口就停了，说庙离不得人。'],
        together: ['他走得很慢，一路与人招呼，半个时辰才走出村口。']
      },
      ask: {
        q: '神要是不灵了，庙里的人怎么办？',
        opts: [
          { t: '「换一个灵的。」',
            reply: '「换神像容易。人心换不过来。他们跪的从来不是神，是那年那炷香。」', fav: 6 },
          { t: '「神灵不灵，人自己过。」',
            reply: '「话是这么讲。」他扫着香灰，「讲这话的人，后来都回庙里来了。」', fav: 4 },
          { t: '「那我就别让神不灵。」',
            reply: '他把扫帚放下，很郑重地朝你拱了拱手。', fav: 8 }
        ]
      }
    },
    {
      id: 'fanshu', name: '贩书人', gender: '男', role: '坊市书贩', age: 0,
      look: '只在雨天出摊，伞旧得看不出原色，一双手干燥干净',
      likes: ['读懂错字的人', '不砍价的人'],
      approach: '买一本错版书，别问真本',
      taboo: '不卖真本，不认错字',
      realm: 0,
      inner: '他自己不修行。他修的是书——每本错版书都是一个走岔的人，他替它们留着回头路',
      meet: [
        '「雨天出摊，晴天收书。仙长要买字，还是买漏。」',
        '他翻书页像翻人：「这本错了三处。错的那三处，才是原文。」'
      ],
      stages: [
        { min: 0, lines: ['「错版不还价。错也是工。」'] },
        { min: 20, lines: ['「你上回挑走那本，第三页折了个角。是你折的。好眼力，错就错在第三页。」'] },
        { min: 40, lines: ['「我进了一批真本。要不要。不要是对的，真本这东西，信一半。」'] },
        { min: 70, lines: ['「哪日我不出摊了，摊子留给雨。你若路过，替我看看伞下有没有书。有，就都是你的。」'] }
      ],
      ctx: {
        break: ['他抬头看了一眼：「突破了。恭喜。今日的书涨三文。」'],
        hurt: ['他把一本《疗伤杂录》推过来：「这本不要钱。伤好了再来付。」'],
        part: ['他把伞往书那边偏了偏：「落雨了，早些回。」'],
        together: ['他跟你走了一段，忽然说：「书不教人。人教人，书只是借口。」']
      },
      ask: {
        q: '书里的错字，是书的错，还是人的错？',
        opts: [
          { t: '「书的错。誊抄者手误。」',
            reply: '「手误也是心误。但你这么想，说明你还没被错字救过。」', fav: 3 },
          { t: '「人的错。写错的人心里有岔。」',
            reply: '「岔路里也有风景。你这话，我可以少收两文。」', fav: 5 },
          { t: '「错不是错，是路标。」',
            reply: '他合上书，沉默了很久：「这本送你。摊上二十本里，我等这个答案等了四十年。」', fav: 8 }
        ]
      }
    }
  ];
  NPC_POOL.push(
    {
      id: 'shenzhiyue', name: '沈知月', gender: '女', role: '游方丹师', age: 27, zodiac: '蛇',
      look: '青灰药囊不离身，指尖常留朱砂', likes: ['药膳', '古籍', '旧雨'], approach: '替她寻药、守丹炉',
      taboo: '厌恶拿人命试药', realm: 2, inner: '先救能救的人，再问值不值得',
      meet: ['她在破庙里煎药，窗纸漏风，炉火却稳。', '「坐远些。」她没抬头，「你身上的血气，会惊了药性。」'],
      stages: [
        { min: 0, lines: ['「药钱可以欠，医嘱不能不听。」'] },
        { min: 20, lines: ['「你上回那块伤，还疼不疼？别只说没事。」', '她把诊金写在纸背面，字很小。'] },
        { min: 40, lines: ['「这一炉你替我守半夜。火小了叫我，火大了也叫我。」'] },
        { min: 70, lines: ['「我见过太多人死在丹成以前。」她收好药囊，「你别来做下一个。」'] }
      ],
      ctx: {
        break: ['她送来一剂护脉汤，只留一句：「破境不是拿命去赌。」'],
        hurt: ['她看完伤口，先骂了一句，再把最苦的那碗药推过来。'],
        part: ['「雨季前回来。」她把药囊补满，「过季的药，我不给你留。」'],
        birthday: ['她煮了一碗没有药味的面，「今天只吃饭，不诊病。」'],
        together: ['你出手时她总在后头，炉上温着一锅止血汤。']
      },
      ask: { q: '若只能救一个人，你救亲者，还是救病重者？', opts: [
        { t: '「救亲者。人总有私。」', reply: '她点头：「承认有私，才配谈医者。」', fav: 5 },
        { t: '「救病重者。医者只看病情。」', reply: '「话说得正。」她看着你，「真到那一天，你别后悔。」', fav: 4 },
        { t: '「先想法子让两个人都活。」', reply: '她笑了：「这才是最难、也最该做的事。」', fav: 8 }
      ] }
    },
    {
      id: 'luoyin', name: '洛隐', gender: '男', role: '退役天机刺客', age: 34, zodiac: '鼠',
      look: '粗布短打，袖中藏一截无光薄刃', likes: ['沉默', '旧地图', '热酒'], approach: '守信、替他收尾',
      taboo: '不问旧主，不拿弱者作饵', realm: 3, inner: '杀过很多人，如今只想过能说真话的日子',
      meet: ['茶棚里他独自坐在最暗的一桌，面前两张地图，一张官道，一张死路。', '「你看了我三次。」他折起地图，「有事便说。」'],
      stages: [
        { min: 0, lines: ['「名字是假的，酒钱是真的。你请哪一样？」'] },
        { min: 20, lines: ['「你的脚步比上次轻了。」他没有夸人，只把靠背的位子让给你。'] },
        { min: 40, lines: ['「这一页地图送你。红圈别进，不是宝，是坟。」'] },
        { min: 70, lines: ['「我若哪天不认路了，你提醒我一声。」他顿了顿，「只提醒，不替我选。」'] }
      ],
      ctx: {
        break: ['他远远抬了抬酒碗，没有靠近，「活着登高，才算本事。」'],
        hurt: ['他替你把伤口重新扎了一遍，「仇家的名字，等你伤好再告诉我。」'],
        part: ['「走官道。」他把另一张地图收回袖里，「这回别学我。」'],
        birthday: ['他叫你吃了一顿热酒，「今日不杀人，也不谈旧事。」'],
        together: ['他总在你侧后方三步，灯影落不到他的刀上。']
      },
      ask: { q: '一条错路，走了很多年，要不要回头？', opts: [
        { t: '「要。错了便停。」', reply: '「说得容易。」他把酒杯放下，「但你说得对。」', fav: 6 },
        { t: '「不回头。走完才知道。」', reply: '「像从前的我。」他没有笑，「这答案不算好。」', fav: 2 },
        { t: '「先问路上还有没有要护的人。」', reply: '他沉默很久：「这句话，我十年前该听见。」', fav: 8 }
      ] }
    }
  );

  /* ====== 2026-11-20 素材增补：七位人物（据《小说素材改编库》§2、§7）======
     取材：《玄鉴仙族》的家常沧桑、《我师兄》的谨慎藏拙、《俗主》的河神磨损、
          《白骨大圣》的符与庙、《苟在初圣魔门》的命灯、《黄昏分界》的火塘。
     三层台词照旧：meet（初见）/ stages（好感四档）/ ctx（情境）。
     口吻一条准绳：长辈话短，道门话绕，魔门话冷，凡人话里带土。 */
  NPC_POOL.push(
    {
      id: 'laozuzhang', name: '老族长', gender: '男', role: '沧源村族长', age: 68,
      look: '背着手，鞋底带泥，指甲缝里嵌着土',
      likes: ['旱烟', '旧规矩', '实在话'], approach: '替他挑一担水，把话说明白',
      taboo: '莫当他的面说「读书出仕」是轻巧事',
      realm: 0, inner: '耕荒两百余年，认命，却不糊涂',
      meet: [
        '他背着手站在田埂上，将你上下打量半天。',
        '「哪天被仙法打死也是命。咱家耕荒两百多年了，娘移不得，爹动不得。」',
        '说罢转身，鞋底的泥甩在田埂上。'
      ],
      stages: [
        { min: 0, lines: ['「外来的？先去田上歇歇，别挡道。」'] },
        { min: 20, lines: ['「读书出仕，习武将兵——书上说得轻巧。你读了几本？」'] },
        { min: 40, lines: ['「我年轻时也想过。后来田里长出的东西，比书实在。」'] },
        { min: 70, lines: ['「你若真要走那条路，临行前来一趟。我不送，就给你盛碗饭。」'] }
      ],
      ctx: {
        break: ['「嗯。」他应了一声，继续锄地。半晌又补一句：「没塌就好。」'],
        hurt: ['「药在灶上，自己热。」——头也没回。'],
        part: ['他送到村口，站住不动：「路我不识。走岔了，回来还是这条。」'],
        together: ['他扛锄走在前头，一步一陷，从不回头看你跟不跟得上。']
      },
      ask: {
        q: '田里长出的东西，真比书实在',
        opts: [
          { t: '「实在。书不能吃」', reply: '他把烟锅在鞋底磕了两下：「这话，能听。」', fav: 5 },
          { t: '「书里也有田」', reply: '他怔了怔，问：「哪一页？」', fav: 3 },
          { t: '「两样都得有人守着」', reply: '他看你很久，才说：「你要走，走前把那碗饭吃了。」', fav: 8 }
        ]
      }
    },
    {
      id: 'shenyanzi', name: '慎言子', gender: '男', role: '青云宗道门师兄', age: 31,
      look: '灰袍洗得发白，袖口缝过三道',
      likes: ['清茶', '旧誓', '守时'], approach: '守约、把话说少',
      taboo: '莫在他面前夸口',
      realm: 2, inner: '小心谨慎，却非胆小怕事——两者有别',
      meet: [
        '他在廊下洗一只粗陶碗，洗得很慢。',
        '「立誓容易，守誓难。」他把碗扣在石阶上，「你说，什么誓最稳妥？」'
      ],
      stages: [
        { min: 0, lines: ['「师弟。」他点头，眼睛却看着你身后那条路。'] },
        { min: 20, lines: ['「你说话比上月谨慎。」他顿了顿，「不是坏事。」'] },
        { min: 40, lines: ['「我立过四个誓，守住了三个。」他把茶推过来，「第四个，我不说。」'] },
        { min: 70, lines: ['「若有一日我要破誓，你先走。」他说得很平，「别看着。」'] }
      ],
      ctx: {
        break: ['他递来一杯温水：「成了就好。别急着高兴，先坐一炷香。」'],
        hurt: ['「谁伤的？」他问完，又自己摇头，「问了也无用。先上药。」'],
        part: ['「路远。」他替你把行囊系紧，「到了捎个信。不捎也行，别死在外头。」'],
        together: ['他一路上话极少，只在岔口处停半步，等你选。']
      },
      ask: {
        q: '立誓容易，守誓难。你说，什么誓最稳妥',
        opts: [
          { t: '「不立」', reply: '点头：「连破誓的机会都不给，是稳妥。」', fav: 6 },
          { t: '「立无人听见的」', reply: '看你一眼：「天地听着呢。」', fav: 4 },
          { t: '「立了，再寻缝隙」', reply: '笑：「你我心知即可。」', fav: 8 }
        ]
      }
    },
    {
      id: 'laoshidui', name: '捞尸队长', gender: '男', role: '津平河神庙守庙人', age: 57,
      look: '身形如枯骨，背后的皮肉已与神像长在一处',
      likes: ['烈酒', '旧骨', '河灯'], approach: '替他捞一回尸、还一具遗骨',
      taboo: '莫问他还剩几年',
      realm: 1, inner: '熬走三代人，仍每日下水',
      meet: [
        '河神庙里蜷着一个人，气若游丝。他背后的皮肉骨骼，已长进神像里。',
        '「你身上，有我们一个人的骨头。」他说。'
      ],
      stages: [
        { min: 0, lines: ['「河里的事，岸上的人不懂。你要问，先下水。」'] },
        { min: 20, lines: ['「上个月我们折了一个。」他说得很轻，「名字我还记得。」'] },
        { min: 40, lines: ['「河神谢你。」他咳了两声，「可津平河神已被污染磨损，庇佑不再广泛。」'] },
        { min: 70, lines: ['「我这一身长在神像里，起不来了。」他抬眼看你，「你替我们走下去。」'] }
      ],
      ctx: {
        break: ['「河底也有路。」他说，「走的人少，不等于没有。」'],
        hurt: ['他把一碗黑糊糊的东西推过来：「喝。河水泡的，死不了人。」'],
        part: ['「刺河神符，避水中邪祟。」他顿了顿，「你，入不入？」'],
        together: ['他走不快，却从不肯让人扶。']
      },
      ask: {
        q: '河神既已磨损，为何还守',
        opts: [
          { t: '「守的是人，不是神」', reply: '他看你很久：「这话，我熬了三十年才想明白。」', fav: 8 },
          { t: '「守庙自有香火」', reply: '他笑了一声，像破风箱：「香火？你闻闻我身上。」', fav: 2 },
          { t: '「不守，又能去哪」', reply: '「问得好。」他闭上眼，「我也想问。」', fav: 5 }
        ]
      }
    },
    {
      id: 'dengshi', name: '灯使', gender: '男', role: '魔门执事', age: 46,
      look: '提一盏灯，灯芯是血色的',
      likes: ['命牌', '守时', '不死的人'], approach: '按时交牌、不问灯从哪来',
      taboo: '莫问灯灭了会怎样',
      realm: 3, inner: '在灯前看了三十年，见过太多天才先死',
      meet: [
        '他提着一盏灯，灯芯是血色的。',
        '「滴血入灯，点燃命火。往后，你们便是本宗的记名弟子。」',
        '顿了顿，又补一句：「命牌随身携带。哪日忘了带，死在宗里，别怪我没说。」'
      ],
      stages: [
        { min: 0, lines: ['「牌呢？」（伸手，不看人）'] },
        { min: 20, lines: ['「你这命火偏弱。活得久些，兴许有出头之日。」'] },
        { min: 40, lines: ['「资质好的，早死了。你平庸，所以还站着——这不是夸你。」'] },
        { min: 70, lines: ['「我在这灯前看了三十年。你是头一个问我『灯灭了会怎样』的人。」'] }
      ],
      ctx: {
        break: ['「命火旺了些。」他把灯往你面前挪半寸，「也离灭近了些。」'],
        hurt: ['「牌还在就好。人嘛，死不死不打紧。」'],
        part: ['「走罢。」他吹熄半盏灯，「出了这道门，就别提本宗。」'],
        together: ['他走在后头，灯照着他的脚，不照你的路。']
      },
      ask: {
        q: '灯灭了，会怎样',
        opts: [
          { t: '「人亡」', reply: '「反了。」他把灯举高，「灯先灭，人才亡。」', fav: 5 },
          { t: '「人亡则灯灭」', reply: '他不答，只把灯往你面前挪了半寸。', fav: 3 },
          { t: '「灯灭不灭，看谁提着」', reply: '他手一顿，灯焰晃了晃：「……你这话，我记下了。」', fav: 8 }
        ]
      }
    },
    {
      id: 'laodao', name: '棺材庙老道', gender: '男', role: '黑棺庙住持', age: 72,
      look: '一身洗旧青布道袍，指节因常年画符而变形',
      likes: ['黄纸', '旧符', '实话'], approach: '持伪箓来问、夜宿不倒',
      taboo: '莫说他的符不灵',
      realm: 1, inner: '画了一辈子符，没镇住一个鬼，倒劝走不少人',
      meet: [
        '庙里只一门无窗，梁两头高，中间矮。',
        '「邪东西最喜欢八字轻、属相小的人。」他头也不抬，「你没死在这庙里，是你命硬，不用谢我。」'
      ],
      stages: [
        { min: 0, lines: ['「天黑前离开。这庙只一门无窗，梁两头高中间矮。」'] },
        { min: 20, lines: ['「看出像什么了？——棺材。黑石砌的，是黑棺，镇枉死之人。」'] },
        { min: 40, lines: ['「符是假的不打紧，怕是真的。怕，才画得歪。」'] },
        { min: 70, lines: ['「我画了一辈子符，没镇住过一个鬼。倒是把活人劝走了不少。」'] }
      ],
      ctx: {
        break: ['「成了？」他眯眼看了看你的眉心，「嗯。命还在，就不算白修。」'],
        hurt: ['他把一张符按在你伤口上，符纸立刻洇黑：「别动。这不是治你的。」'],
        part: ['「走罢。」他往门框上贴了一张新符，「这张不是给你的。」'],
        together: ['他一路上不时回头，说是在数身后有没有多出一个人。']
      },
      ask: {
        q: '你画了一辈子符，镇住过什么',
        opts: [
          { t: '「镇住过活人」', reply: '他怔了很久，忽然笑出声：「……对。镇住过活人。」', fav: 8 },
          { t: '「什么都没镇住」', reply: '「诚实话。」他继续画符，「诚实的人，鬼不爱近。」', fav: 5 },
          { t: '「符是画给自己看的」', reply: '笔停住了：「你这话，比符狠。」', fav: 6 }
        ]
      }
    },
    {
      id: 'fengkou', name: '封口师兄', gender: '男', role: '青云宗同门师兄', age: 29,
      look: '眉眼寻常，衣裳寻常，站在人堆里就找不着',
      likes: ['旧书', '沉默', '后手'], approach: '话少、事稳、不逞能',
      taboo: '莫在人多处夸他',
      realm: 2, inner: '露出来的越多，别人算计你的路就越多',
      meet: [
        '他蹲在廊下修一只旧木匣，匣子外表平平。',
        '「所谓底牌，就是你藏起来的那些。」他抬眼看你，「你露出来的越多，别人算计你的路就越多。」'
      ],
      stages: [
        { min: 0, lines: ['「师弟，话少些。隔墙有耳。」'] },
        { min: 20, lines: ['「你那口气藏得还行，就是眼神太亮。」'] },
        { min: 40, lines: ['「底牌不是不露，是露给该露的人。」'] },
        { min: 70, lines: ['「我藏了一辈子，也就你见过我真的一招。」'] }
      ],
      ctx: {
        break: ['「嗯。」他替你把门掩上，「成了别嚷。嚷了，下一个来找你的就不是我。」'],
        hurt: ['他先关门，再看伤：「疼就叫。门外听不见。」'],
        part: ['「自己小心点，臭师兄。」他把旧匣塞给你，转身就走。'],
        together: ['他一路都在你半步之后，正好挡住来路。']
      },
      ask: {
        q: '藏到什么时候，才算够',
        opts: [
          { t: '「藏到死」', reply: '「那便白藏了。」他摇头，「藏，是为了有一天能露。」', fav: 4 },
          { t: '「藏到没人记得你」', reply: '他沉默一会：「这也是个法子。苦。」', fav: 6 },
          { t: '「藏到该露那日」', reply: '「嗯。这回像话。」', fav: 8 }
        ]
      }
    },
    {
      id: 'popo', name: '婆婆', gender: '女', role: '四姓族老', age: 80,
      look: '眼窝深陷，手里一串磨得发亮的旧铜钱',
      likes: ['火塘', '纸钱', '听话的后生'], approach: '守着夜禁、不问门外事',
      taboo: '莫在夜里往门外看',
      realm: 0, inner: '死人只认亲，不认理',
      meet: [
        '她坐在火塘边，火光照着半张脸，另半张在暗里。',
        '「起夜就尿墙根，千万别出门，也别往外看。」她盯着火，「那些东西，都还在呢。」'
      ],
      stages: [
        { min: 0, lines: ['「死人就是死人，只认亲不认理。」'] },
        { min: 20, lines: ['「祖宗不认你，怪不得他们。」'] },
        { min: 40, lines: ['「等进了火塘子，就认了。」'] },
        { min: 70, lines: ['「我这条命是借来的。借了，就得还。」'] }
      ],
      ctx: {
        break: ['她往火里添三张纸：「过了关，也别忘了给下面说一声。」'],
        hurt: ['她抓一把香灰按在伤口上，念了句听不清的话：「好了。别问是谁替你挡的。」'],
        part: ['「出门别回头。」她把门闩上，「回头看的，都被留下了。」'],
        together: ['她走得很慢，每过一道门槛都要停一停。']
      },
      ask: {
        q: '祖宗为何不认我',
        opts: [
          { t: '「因为我不是四姓的人」', reply: '「你跟四姓的人结了亲，就是四姓家的人。」她把铜钱一收，「理是这个理。」', fav: 6 },
          { t: '「因为他们早死了」', reply: '火塘里的火矮了半寸。她没说话。', fav: 2 },
          { t: '「不认，便不认」', reply: '「硬气。」她点头，「硬气的人，下面也敬三分。」', fav: 8 }
        ]
      }
    }
  );

  const FAVOR_TIERS = [
    { min: 0, max: 19, name: '陌生' }, { min: 20, max: 39, name: '相识' },
    { min: 40, max: 59, name: '知己' }, { min: 60, max: 79, name: '暧昧' },
    { min: 80, max: 99, name: '道侣' }, { min: 100, max: 999, name: '生死相许' }
  ];

  /* ====== 渐进解锁（v6 双线） ====== */
  const UNLOCK_XIAN = [
    { stage: 0, name: '创角', show: ['主修', '灵根', '资质', '出身', '道途'], phrase: '你可以修仙，也可以去当神', hide: ['道统', '仙基', '果位', '洞天'] },
    { stage: 1, name: '胎息·六轮', show: ['灵气', '打坐', '法术', '宗门入门', '坊市'], phrase: '气海里有了一点水声', hide: ['仙基', '道统', '神通', '洞天'] },
    { stage: 2, name: '练气·九层', show: ['采气', '功法', '技艺', '洞府'], phrase: '你采的这口气，有点像水', hide: ['仙基', '神通', '洞天'] },
    { stage: 3, name: '筑基', show: ['仙基', '道统', '道途四印', '箓气'], phrase: '六轮散了，气海里多了一块东西', hide: ['洞天', '果位'] },
    { stage: 4, name: '紫府', show: ['三关', '神通', '洞天'], phrase: '有人在另一头，喊你的名字', hide: ['果位'] },
    { stage: 5, name: '金丹', show: ['果位', '法仪', '护道', '位格压制'], phrase: '三十个位，都有人了', hide: ['上古十境'] },
    { stage: 6, name: '道胎', show: ['锚', '上古十境线索'], phrase: '你走到今法的尽头了', hide: [] }
  ];
  const UNLOCK_SHEN = [
    { stage: 0, name: '创角', show: ['法相', '出身', '六维', '天赋', '道途'], phrase: '你身上有一道法相', hide: ['道统', '仙基', '箓', '神通', '洞天', '四印', '果位'] },
    { stage: 1, name: '一柱·立庙', show: ['香火', '信众', '虔诚', '显圣', '权柄', '庙宇', '坊市', '灰箓'], phrase: '庙里有人来上香了', hide: ['道统名', '仙基', '神通', '洞天', '四印'] },
    { stage: 2, name: '二柱·聚香', show: ['道统', '地图', '宗门', '技艺', '托付守庙'], phrase: '你隐隐觉得，自己走的是某一条路', hide: ['仙基名', '神通', '洞天', '四印'] },
    { stage: 3, name: '三柱·显灵', show: ['神通', '白箓', '夺祀', '释修', '情缘'], phrase: '你的手能做出庙里做不出的事了', hide: ['洞天', '四印', '果位'] },
    { stage: 4, name: '四柱·分灵', show: ['洞天', '界门', '神位', '香火钱', '道途印'], phrase: '庙后那口枯井，今夜有香灰味', hide: ['果位'] },
    { stage: 5, name: '五柱·开府', show: ['第2枚印', '魔门线', '血奉'], phrase: '有人在暗处买卖人命', hide: ['果位'] },
    { stage: 6, name: '六柱·司命', show: ['第3枚印', '小法仪', '夺人仙基'], phrase: '有道位在你头顶空着', hide: ['果位名目'] },
    { stage: 7, name: '七柱·通天', show: ['第4枚印', '大法仪', '护道', '神名'], phrase: '有人开始念你的名字', hide: [] },
    { stage: 8, name: '八柱·真君', show: ['证果位', '开道', '百世书'], phrase: '三十个位，都有人了', hide: [] }
  ];

  /* ============================================================
     两套经济：仙道走坊市（只认灵石），神道走庙市（灵石计价，香火可兑）
     ------------------------------------------------------------
     铁律：
       1. 香火是神道本命资源，仙道一分也不该有——仙道打坐只出修为。
       2. 灵石是两界共用的通货：庙祝也要买香烛、修庙、养人。
       3. 香火能当钱花，但必须有明码等价与月限，不能白变。
     ============================================================ */

  /* 等价：官价 1 灵石 = 100 香火。
     兑出（香火→灵石）抽一成庙工香烛钱，实付 110 香火；
     兑入（灵石→香火）只卖香烛，成色 80~95 香火/石，且只能补到本柱需求的 80%，
     余下两成须得真信众来烧——免得有钱就能立庙。 */
  const EXCHANGE = {
    xiangPerStone: 100,     // 官价（只用于显示与换算）
    outPerStone: 110,       // 化香火钱：110 香火 → 1 灵石（含一成抽成）
    buyCapRatio: 0.8,       // 买香最多补到本柱 need 的八成
    outCapBase: 2,          // 每月至少可化 2 石
    outCapPer: 400,         // 每 400 信众 +1 石/月
    outCapBox: 2            // 每只功德箱 +2 石/月
  };

  /* 庙市 · 香供（灵石 → 香火） */
  const XIANG_GONG = [
    { id: 'xianXiang', name: '线香一把', price: 1,  xiang: 80,   desc: '黄纸裹香末，烟气直，燃得快' },
    { id: 'tanXiang',  name: '檀香一匣', price: 5,  xiang: 450,  desc: '香头稳，一炷能坐半日' },
    { id: 'xiangYou',  name: '香油一瓮', price: 20, xiang: 1900, desc: '添灯油，殿里能亮到天明' }
  ];

  /* 庙市 · 庙产（灵石买，一次买断，可叠） */
  const MIAO_UP = [
    { id: 'lu',    name: '铜香炉', price: 120,  max: 3, eff: '香火 +8% / 座',   desc: '三足，炉口有旧烟痕' },
    { id: 'xiang', name: '塑金身', price: 600,  max: 2, eff: '虔诚 +0.1 / 次',  desc: '贴金一层，眉眼要重描' },
    { id: 'box',   name: '功德箱', price: 300,  max: 3, eff: '月兑上限 +2 石',  desc: '木匣，锁在供桌下' },
    { id: 'ling',  name: '法铃',   price: 800,  max: 1, eff: '显圣耗香 −20%',   desc: '铃舌是旧的，声音却新' },
    { id: 'di',    name: '庙地契', price: 2000, max: 2, eff: '香火上限 +30%',   desc: '一张黄纸，盖着县印' }
  ];

  /* ====== 坊市（仙道专用） ====== */
  /* 信香是神道之物，已移出仙道货架——两套系统不互通货架 */
  const SHOP = PILL_EXT.filter(function (x) { return x.type !== 'xiang'; })
    .map(function (x) { return Object.assign({ cat: 'pill' }, x); })
    .concat(ARTIFACT_EXT.map(function (x) { return Object.assign({ cat: 'art', type: 'art' }, x); }))
    .concat(MATERIAL_EXT.map(function (x) { return Object.assign({ cat: 'mat', type: 'mat' }, x); })
      .concat([{ id: 'fudi', name: '灵脉契', price: 2400, type: 'land', cat: 'art', desc: '可升洞府灵气一档' }]));

  /* 功法货架（独立，因为要写进 ownedGongfa） */
  /* 地阶及以上不上市——改由「传法机缘」授予 */
  const SHOP_GONGFA = GONGFA_EXT.filter(function (x) { return x.tier === 'huang' || x.tier === 'xuan'; })
    .map(function (x) { return Object.assign({ cat: 'gongfa', type: 'gongfa' }, x); });

  const SHOP_CATS = { pill: '丹药', art: '法器', mat: '材料', gongfa: '功法', sell: '卖出' };

  /* ====== 两界 ====== */
  const GATE = [
    { id: 'natural', name: '天生界门', cost: 100, desc: '偶现荒野，来去无痕' },
    { id: 'well',    name: '庙后古井', cost: 200, desc: '自家庙后，稳定安全' },
    { id: 'post',    name: '驿门',     cost: 0,   desc: '免费，但留档' }
  ];
  const SHENWEI = [
    { rank: '从九品', name: '村土地', salary: 100 }, { rank: '正九品', name: '乡土地', salary: 160 },
    { rank: '从八品', name: '镇土地', salary: 260 }, { rank: '正八品', name: '县城隍佐', salary: 400 },
    { rank: '从七品', name: '府城隍佐', salary: 600 }, { rank: '正七品', name: '县城隍', salary: 800 },
    { rank: '从六品', name: '州城隍佐', salary: 1400 }, { rank: '正六品', name: '州城隍', salary: 2200 },
    { rank: '从五品', name: '郡判官', salary: 3600 }, { rank: '正五品', name: '郡城隍', salary: 5800 },
    { rank: '从四品', name: '府主', salary: 9500 }, { rank: '正四品', name: '府城隍', salary: 15000 },
    { rank: '从三品', name: '道录司', salary: 24000 }, { rank: '正三品', name: '按察使', salary: 38000 },
    { rank: '从二品', name: '布政使', salary: 60000 }, { rank: '正二品', name: '尚书', salary: 80000 },
    { rank: '从一品', name: '太傅', salary: 90000 }, { rank: '正一品', name: '金箓阴天子', salary: 100000 }
  ];

  /* ====== 随机事件 ====== */
  /* ====== 随机事件（含叙事文本）======
     旧版只有事件名，玩家收到的是「-25% 的惩罚」，而不是一群人跪在门外。 */
  const EVENTS = [
    { id: 'pilgrim', name: '有人来上香', kind: 'good', path: 'shen', followers: 20,
      text: '天色刚亮就有人来了。是个背着孩子的妇人，跪下去时膝盖先着地，声音很实。她没求什么大事，只求孩子能平安长到十岁。',
      after: '她走的时候又回头拜了一次。你忽然想，这大概就是「灵验」最朴素的样子。',
      log: '有人来上香，信众渐众。' },
    { id: 'drought', name: '大旱', kind: 'risk', path: 'shen',
      text: '三个月没下雨。田里的裂口能塞进一个拳头。有人跪在庙门外，从早上跪到日头偏西，一句话也不说。',
      after: '你看着他们走，忽然想起自己也曾这样求过谁。',
      log: '大旱。求雨者挤满庙门。' },
    { id: 'plague', name: '瘟疫', kind: 'risk', path: 'shen',
      text: '先是西头几户人家咳嗽，半个月后，抬棺的人开始不够用。夜里风把白幡吹得哗哗响。',
      after: '你闻得到那股味道，绕过去了。你不是医者，也救不了这么多人。',
      log: '瘟疫蔓延，信众散其大半。' },
    { id: 'neighbor', name: '邻庙更灵', kind: 'risk', path: 'shen',
      text: '有人在你庙门口站着，却不进来，转身往东边去了。东边那座庙这几个月很热闹，据说求什么都应。',
      after: '香火是会走的。它从来不留下来告别。',
      log: '邻庙更灵，香客改投他处。' },
    { id: 'prefect', name: '官府征调', kind: 'risk', path: 'shen',
      text: '差役带着文书来，说上头要修渠，各家各庙需出人出钱。他念得很慢，念完看你，等你表态。',
      after: '你签了。办事的人走后，你在门口站了很久。',
      log: '官府征调，既出人，又出钱。' },
    { id: 'donor', name: '富户捐灵石', kind: 'good', path: 'shen',
      text: '一个穿绸的胖子带着两个随从进来，供上一整袋灵石，磕头磕得很响。他求的不是长生，是明年那笔生意别出岔子。',
      after: '他走后，你把袋子倒出来数了数。数目不小，够修一整年屋顶。',
      log: '富户还愿，捐以灵石。' },
    { id: 'wander', name: '游方道士', kind: 'good', path: 'shen',
      text: '一个背桃木剑的道士路过，在庙前停下，看了很久那块旧匾。他说：「这地方的气，是活的。」',
      after: '他不要香火钱，只讨了一碗水。喝完把碗倒扣在门槛上，走了。',
      log: '游方道士过此，留一句评语。' },
    { id: 'demon', name: '邪祟作乱', kind: 'risk', path: 'shen',
      text: '夜里村东头的老槐树下有响动。第二天去看，树皮被剥了一整圈，露出里面发黑的白。',
      after: '你知道那不是野兽干的。野兽不会剥得这么齐整。',
      log: '邪祟作乱，人心惶惶。' },
    { id: 'draft', name: '朝廷册封', kind: 'good', path: 'shen',
      text: '使者捧着黄绫来，当众宣读。名字念出来的时候，人群里有人小声重复了一遍。',
      after: '册封只是几张纸。但没有这几张纸，你就永远是个「野祀」。',
      log: '朝廷降下册封。' },
    { id: 'theft', name: '庙产被盗', kind: 'risk', path: 'shen',
      text: '供桌下的暗格被人撬了。手法很稳，只拿值钱的，香炉铜器一件没动——是熟人，或者是熟人的熟人。',
      after: '你没有报官。这种事报官，丢的是脸，不是钱。',
      log: '庙产被盗，暗格见撬。' },
    { id: 'spirit', name: '灵脉异动', kind: 'good',
      text: '半夜地底传来一声闷响，像什么东西翻了个身。第二天你去看，井水清了半尺。',
      after: '灵气顺着地脉往上走。这一带的草木，接下来几年会长得比别处快。',
      log: '灵脉异动，采得一线好气。' },
    { id: 'storm', name: '暴雨毁庙', kind: 'risk', path: 'shen',
      text: '雨下了三天三夜，山洪从后坡下来，冲塌了庙墙的一角。泥水灌进殿里，把塑像的脚泡软了。',
      after: '雨停后你一个人和泥、垒墙、补瓦。修了整整两天，手上全是血泡。',
      log: '暴雨毁庙，墙塌一角。' },

    /* ---------- v8.0 新增：仙道与共通向 ----------
       上面十二条大半是神道的事（信众、香火、香客）。
       仙道玩家一个月里多半只等到一句「无事」，等于随机事件对他是关着的。
       以下十条不限道途，效果写在 eff 里，不再需要动 switch。 */
    { id: 'beastDown', name: '妖兽下山', kind: 'risk', eff: { hpPct: -0.12, stones: 60, fame: 2 },
      text: '山下来了一头独角的山猪，拱翻了半亩田，撞塌一堵矮墙。村里人拿着锄头围住它，谁也不敢先上。',
      after: '你出手的时候它正低头拱土。收手之后，村里人还是站了很久才敢靠近。' },
    { id: 'rivalVisit', name: '同门来访', when: { needSect: true, minRealm: 1 }, kind: 'good', eff: { fav: 6, insight: 1 },
      text: '一个同门师兄来了，带着一壶酒和一身尘土。他说是路过，可这条路并不通他要去的任何地方。',
      after: '喝到半夜，他才说：「听说你要破境了。我来看看。」' },
    { id: 'strayPurse', name: '路边拾遗', kind: 'good', eff: { stones: 90, karma: 2 },
      text: '官道边的草里有一只钱袋，鼓着。周围没有人，只有远处一头驴在啃树皮。',
      after: '你捡起来，掂了掂。这钱来得容易，用起来大概不会太踏实。' },
    { id: 'sickNeighbor', name: '邻人病重', kind: 'risk', eff: { merit: 10, stones: -60 },
      text: '隔壁家的老人咳了半个月，昨夜开始咳血。他儿子在门外站了很久，一直没敲门。',
      after: '你把人接过去，请了郎中，熬了三夜。他活下来了，但往后再干不了重活。' },
    { id: 'rainOnRoad', name: '山道遇雨', kind: 'risk', eff: { hp: -12, heart: 1 },
      text: '雨来得急，躲进一个石洞时衣裳已经湿透。洞里有人生过火的痕迹，灰还是温的。',
      after: '你把火重新点着，烘衣裳烘到天亮。那件衣裳后来一直有股烟味。' },
    { id: 'oldStele', name: '古碑残字', when: { maxRealm: 2 }, kind: 'good', eff: { insight: 2 },
      text: '坡上一块断碑，字被风雨磨得只剩几笔。你蹲下去看了半个时辰，认出了中间两个字。',
      after: '那两个字是「莫争」。你站起来的时候，膝头麻了，天也暗了。' },
    { id: 'beggarChild', name: '乞儿叩门', kind: 'risk', eff: { merit: 6, stones: -20 },
      text: '天没亮就有人敲门。开门是个孩子，赤着脚，手里捧着一只缺口的碗，不说话，只看着你。',
      after: '你给了他些吃的和几块灵石。他接过去，鞠了一躬，跑得很快，跑到街角就看不见了。' },
    { id: 'giftSword', name: '有人赠剑', kind: 'good', eff: { stones: 120, sense: 1 },
      text: '一个陌生人把一柄剑放在你门口，剑鞘上贴着张纸条：「受人之托，物归原主。」你没听说过这个人。',
      after: '剑是好剑，但刃口有过一次重铸。你不知道它上一任主人是谁，也不想知道了。' },
    { id: 'taxSeason', name: '税吏上门', kind: 'risk', eff: { stones: -120, fame: 2 },
      text: '税吏带着两个差役来，进门先看屋顶，再看供桌，最后才开口。他说今年加了两成。',
      after: '你交了。他走的时候倒是有礼，还回头说了一句：明年可能会减。' },
    { id: 'quietMonth', name: '无事之月', kind: 'good', eff: { heart: 1 },
      text: '这一个月什么也没发生。日头照着门槛，一寸一寸挪过去。你把该做的事都做了，剩下的时间就坐着。',
      after: '没有消息，也没有人来。这样的月份不多，你记着它。' },
    /* ====== 2026-11-17 素材扩写：日常十五事 ======
       旧事件几乎全是神道向（信众、香火、香客），仙道玩家多半只等到「无事」。
       这一批按「白描、家常话里带沧桑」写，把制度写成人话，不写感慨。 */
    { id: 'taxInspect', name: '坊市查税', kind: 'risk',
      text: '巡查署的人挨摊查税，动作很慢，慢得像故意让所有人看着。卖符老者多补了三文，手抖着数了两遍。',
      after: '查完那日，坊市静了三日。第四日吆喝声又起，比先前还响。',
      log: '坊市查税，物价暂稳。', eff: { stones: -20, fame: 1 } },
    { id: 'fieldBugs', name: '灵田虫害', when: { place: 'qingyue', minRealm: 2 }, kind: 'risk',
      text: '灵田的叶子被虫啃出一排排月牙口。那虫专挑最壮的苗啃，像懂行。',
      after: '你没用药，蹲在田里捉了三夜虫。手熟了，虫也少了。',
      log: '灵田虫害，手捉三夜。', eff: { hp: -10, insightXp: 1 } },
    { id: 'brotherLeaves', name: '师兄下山', kind: 'good', path: 'xian',
      text: '同峰师兄还俗去了，行李只一个包袱、一把伞。送行的人不多，都到了。',
      after: '他把藏经阁的借书牌留给你，说：没还的三本书，算我借你的。',
      log: '师兄还俗，赠牌三册。', eff: { insightXp: 1 } },
    { id: 'danFire', name: '丹房走水', kind: 'risk', path: 'xian',
      text: '丹房半夜走水。火不大，烟很大。救火的人排队传桶，桶传到最后只剩半桶。',
      after: '烧的是今岁第一炉丹。账房记损时，笔停了很久。',
      log: '丹房走水，一炉尽毁。', eff: { stones: -80 } },
    { id: 'looseCultivators', name: '散修结庐', kind: 'good',
      text: '山下多了三间草庐，散修住的。他们白日采药，夜里轮流守夜，规矩是自家的，比宗门的松。',
      after: '他们想换你一本《聚气诀》。你用一碗米就换了，他们说宗门的米香。',
      log: '散修结庐，以米换诀。', eff: { merit: 5, fame: 2 } },
    { id: 'sectTourney', name: '宗门大比', when: { needSect: true, minRealm: 2 }, kind: 'good', path: 'xian',
      text: '大比前夜，演武场的灯一直亮到三更。二十几人练同一招，谁的影子里都出剑。',
      after: '你赢了三场，输了两场。输的那两场，都输给同一个瘦子。',
      log: '宗门大比，三胜二败。', eff: { fame: 4, xiuweiMul: 0.3 } },
    { id: 'lostPermit', name: '路引丢了', kind: 'risk',
      text: '出山办事，路引丢了。守关书吏翻你三遍，末了盖一个补办的章，章印是歪的。',
      after: '补路引花了半月。这笔账你记下了，不记在灵石上。',
      log: '路引遗失，补办半月。', eff: { stones: -40, fame: -2 } },
    { id: 'oldMonkDies', name: '老修士坐化', kind: 'good',
      text: '东街的老修士坐化了，享年二百零七。他生前常输棋，输了爱悔，悔了没人让。',
      after: '他的棋盘被抬到茶棚。此后茶棚的棋，悔棋的人少了。',
      log: '老修坐化，留盘于茶棚。', eff: { heart: 1 } },
    { id: 'boarRaid', name: '妖兽下山', kind: 'risk',
      text: '一头独角野猪下了山，不伤人，专拱田。拱完在田里打滚，滚得一身泥，很受用。',
      after: '猎户追了七日。第八日它自己回山了。兽有兽的时令，人不与它争。',
      log: '妖猪拱田，七日自归。', eff: { stones: -30, fame: 1 } },
    { id: 'secretRealm', name: '秘境开禁', kind: 'good', path: 'xian',
      text: '城外秘境三年一开。今年开禁的名册上多了你的名字，是有人替你报的。',
      after: '你进去了三日，捡回两块符石、一场虚惊，另欠一份人情。',
      log: '秘境开禁，欠情一场。', eff: { stones: 100, insightXp: 1 } },
    { id: 'spiritBloom', name: '灵植开花', kind: 'good',
      text: '院里那株三年不开花的灵植开了。花白，只开一夜，夜里无人看见。',
      after: '花落结籽两粒。一粒收进玉盒，一粒被鸟叼走。',
      log: '灵植夜花，结籽两粒。', eff: { mat: ['buqiCao', 2] } },
    { id: 'oldGrudge', name: '旧怨上门', kind: 'good',
      text: '有人在你洞府外站了一日，不进门，也不走。日落时放下一坛酒，去了。',
      after: '酒是好酒。坛上贴一纸：先父与你有过节，账在他不在你。喝与不喝，都两清。',
      log: '旧怨寻至，留酒两清。', eff: { karma: -3, heart: 1 } },
    { id: 'templeFair', name: '庙会开锣', kind: 'good', path: 'shen',
      text: '庙会开了三日。戏台唱的是你显圣救火那段，戏里的你比本人高半头。',
      after: '信众听完戏，虔诚更甚。你想说戏有夸，话到嘴边，咽了。',
      log: '庙会三日，戏增虔诚。', eff: { piety: 0.05, followers: 60 } },
    { id: 'childVow', name: '童子还愿', kind: 'good', path: 'shen',
      text: '一个孩子来还愿，还的是去岁求的病愈。供品是三颗糖，摆在香案上摆得很正。',
      after: '糖你收了。神收糖不害臊，害臊的是神没把孩子的病提前治好。',
      log: '童子还愿，供糖三颗。', eff: { merit: 5, piety: 0.03 } },
    { id: 'incenseGuild', name: '香头行会', kind: 'risk', path: 'shen',
      text: '城里香头行会来谈供香专营。话说得客气，意思是：别处进的香，算私香。',
      after: '你签了一半。官香接了，私香未断。两头都得罪一点，两头都留一点。',
      log: '香头议价，各让一步。', eff: { stones: 60, fame: 1 } },
    { id: 'neighborGod', name: '邻神托梦', kind: 'good', path: 'shen',
      text: '邻乡的土地夜里托梦，说他的庙被排进了并祀名单，并完就没了名号。',
      after: '你替他递了一份陈情。批文没下来，名单暂缓。土地托梦谢你，梦里敬了一杯酒。',
      log: '邻神托梦，陈情暂缓。', eff: { merit: 10 } },

    /* ====== 2026-11-20 素材增补：七则叙事事件（据《小说素材改编库》§4、§8.4~8.6）======
       一律 eff 驱动，不再往 applyEvent 的 switch 里加 case。
       「火塘不认」落一个 flag，「阴亲之议」以它为前置——两件事本是一件事的两半：
       祖宗不认 → 才有人提阴亲。抽不到的因果，不算因果。 */
    { id: 'jisiShiQi', name: '祭祀失期', kind: 'risk', path: 'shen',
      text: '河神庙的香灰积了三年。今年你迟了一日，庙祝说：「河神不吃昨年祭。」——门外跪着的人，从早跪到日头偏西。',
      after: '你忽然想起，自己也曾这样求过谁。',
      log: '祭祀失期，香火折损。', eff: { xh: -80, heart: 1 } },
    { id: 'weiluShiFa', name: '伪箓事发', kind: 'risk',
      text: '有人持黄符来投，说是天师受箓。你借月光看那符——笔画错了半厘，是假道士的送子符。',
      after: '符是假的，怕是真的。那人为何要逃？',
      log: '识破伪箓，拾得符纸。', eff: { insight: 1, mat: ['fuZhi', 1] } },
    { id: 'huotangBuRen', name: '火塘不认', kind: 'risk', path: 'shen',
      text: '带了祭品入火塘，祖宗的牌位沉默。婆婆说：「死人就是死人，只认亲不认理的。」香烧到一半，灭了。',
      after: '你想起自己入山门那年，也是这样的沉默。',
      log: '宗族不认，香火折损。', eff: { xh: -100, heart: 1, flag: 'ancestor_reject' } },
    { id: 'yinqinYiYi', name: '阴亲之议', kind: 'risk', path: 'shen',
      when: { flag: 'ancestor_reject' },
      text: '婆婆要为你结一门阴亲。「那你媳妇在下面护你，你给她烧纸。」——活人的事，死人来办。',
      after: '你还没答，香已经点了三炷。',
      log: '阴亲之议，香已三炷。', eff: { xh: -30, karma: 2, flag: 'yin_qin_proposed' } },
    { id: 'tiancaiZhiShang', name: '天才之殇', kind: 'risk', path: 'xian',
      text: '三年前那孩子三月能言、五月能诗。如今他抱着酒坛睡在村口，醒来只说一句「我资质是丙等」。',
      after: '全村都曾以为他要飞黄腾达。你忽然懂了——摔得最响的，总是被捧得最高的。',
      log: '见证天才陨落。', eff: { heart: 1, insightXp: 1 } },
    { id: 'bugaoErbie', name: '不告而别', kind: 'good', path: 'xian',
      text: '师兄留下一件旧物，托人转交。没有信，只一句话：「自己小心点，臭师兄。」',
      after: '你把那东西收进袖里。有些情分，不写在信上。',
      log: '得旧物一件（传音符）。', eff: { heart: 2, art: 'jinchuan' } },
    { id: 'zhirenYeKu', name: '纸人夜哭', kind: 'risk', path: 'shen',
      when: { needTemple: true, minRealm: 1 },
      text: '庙里泥像在吃人。梦里小孩哭着喊痛，说「快逃」。醒来找遍寺庙，不见那孩子。',
      after: '香灰上有一行小字：不是梦，是你终于记起来了。',
      log: '纸人夜哭，香灰留字。', eff: { heart: -1, karma: 3, flag: 'paper_weep' } }

  ];

  /* ====== 结局 ====== */
  /* 结局：cond 为判定条件说明，test 决定是否命中（由 game.js 调用）
     12 个结局，按「先死而后生」的顺序判定 */
  const ENDINGS = [
    { id: 'sit', name: '坐化', kind: 'death', cond: '寿元尽',
      text: '你在蒲团上坐了很久。久到山下的村子换了三代人，久到没人再记得这座洞府住过谁。',
      after: '最后那口气散时，你还想再看一眼春天。',
      verse: '坐到最后，你其实还想再看一眼春天。' },
    { id: 'fall', name: '陨落', kind: 'death', cond: '死于战斗或渡劫',
      text: '来得很突然。你甚至没来得及看清那是什么。',
      after: '血落在土里，很快就被吸干了。修仙界一天要死很多人，多一个不多。',
      verse: '血溅当场。连一句遗言都没说完。' },
    { id: 'daohua', name: '道化', kind: 'death', cond: '失锚，意识散成山雾',
      text: '你先是忘了自己叫什么，然后忘了为什么站在这里。',
      after: '第二天山雾很浓。有个赶路的货郎在雾里迷了半日，说听见有人在他耳边叹气。',
      verse: '山雾里多了一缕，不属于任何人的气。' },
    { id: 'reinc', name: '百世书', kind: 'renew', cond: '烧一页重来',
      text: '你撕下一页，凑近烛火。纸边先卷起来，然后整页烧成一朵很小的红。',
      after: '火光散尽，你还在这里。只是那一页写的事，你一件也想不起来了。',
      verse: '纸页烧尽，你还在这里，只是又不记得了。' },
    { id: 'guowei', name: '证得果位', kind: 'great', cond: '设法仪、得护道、成位',
      text: '法仪做到第七日，天上没有异象，地上也没有。',
      after: '到第八日清晨，你忽然发现自己知道了一件从没人告诉过你的事——这个位，从此是你的了。',
      verse: '三十个位，终于有一个写了我的名字。' },
    { id: 'zhenjun', name: '法相归位', kind: 'great', cond: '八柱圆满',
      text: '你把最后一炷香插上。香灰没有落，一直烧到最后，整支化作一缕直烟。',
      after: '那一夜，这一方水土上所有庙里的神像，都朝同一个方向偏了偏头。',
      verse: '此方水土认了我，我便守着它。' },
    { id: 'daotai', name: '道胎', kind: 'great', cond: '以己心代天心',
      text: '你把自己看了一遍，像看一件旧衣裳，然后把它叠好放下。',
      after: '从此没有寿元这一栏了。取而代之的是：还有谁记得你。',
      verse: '我以我心，代天之心。' },
    { id: 'ascend', name: '登仙', kind: 'great', cond: '补回断掉的四境',
      text: '断掉的路，你一段一段接回来。最后一段接上的时候，天没有开，也没有雷。',
      after: '只是你抬头，发现云已经不是云了。',
      verse: '问道者不问归途。' },
    { id: 'xiaoyao', name: '逍遥', kind: 'good', cond: '寿元尽而道心未折、无罪业',
      text: '你活了很久。久到把想做的事都做完了，把想见的人都送走了。',
      after: '临了那天，你把窗推开，看了看外头，觉得这辈子没什么可后悔的。',
      verse: '活得比谁都久，且始终是自己在活。' },
    { id: 'xianzun', name: '一代仙尊', kind: 'good', cond: '金丹以上、声望 ≥ 500',
      text: '东洲现在提起你的名字，要先想一想，再压低声音。',
      after: '有人说你护过这一方，有人说你屠过一座城。两种说法都有人信。',
      verse: '东洲提起你的名字，要先停一停。' },
    { id: 'modao', name: '魔道至尊', kind: 'good', cond: '业力 ≥ 300 且仍在修行',
      text: '你走上这条路的时候没想过终点。走到了才发现，终点和你起步的地方长得一样。',
      after: '身后跟着很多人，没有一个人是笑着的。',
      verse: '走过的路上，没有一寸是干净的。' },
    { id: 'shizun', name: '世尊', kind: 'good', cond: '神道八柱、功德 ≥ 300',
      text: '八柱圆满的那天，你在庙里坐了一整夜。天亮时，来上香的人排到了山脚。',
      after: '他们求的你都听见了。有些能应，有些不能——你第一次明白，神也有做不了的事。',
      verse: '一方佛国，一念之间。' }
  ];

  /* ====== 开场：五个，各有各的来处 ======
     旧版一个 25 字，一句话就进创角。现在每个给一段"你为什么在这里"。 */
  /* ====== 场景描写：地点 × 季节 × 状态 ======
     旧版一年只有 4 句，玩家每月看到同一句话。现在按维度组合。 */
  const SCENES = {
    cave: {
      spring: ['春水渗壁，湿痕一片。移蒲半尺，避其潮。',
        '洞口花开，未曾出看，只听风里多了甜意。',
        '石缝里钻出一丛蕨，青得发亮。你没拔它，它自己往光里长。',
        '夜里听见过水声。白天找了一整日，没找着从哪儿来。',
        '蒲团底下潮了。掀起来晒，背面霉点连成一片，像幅山水。',
        '有燕子来檐下筑巢。你不动它，它也不怕你。'],
      summer: ['洞中比外凉。暑气最盛之日，修得反快。',
        '蝉声自洞口漫入。此境太静，一声蝉亦觉吵。',
        '壁上渗水，滴在石台上，一夜积了半盏。你喝了，是甜的。',
        '日头到正午才照进洞口三寸。那三寸地暖得能躺。',
        '蚊子多。你懒得拍，任它咬，反正吸不了多少。',
        '洞外晒得发白，唯洞口一圈青苔还是湿的。'],
      autumn: ['秋气清，宜采气。起身时石台已落薄尘。',
        '风卷落叶入洞。未曾扫，看其一日日干透。',
        '夜里凉了，把蒲团挪到里侧。挪过去才发觉里侧更潮。',
        '有松鼠把果子藏在石缝里。你没动，第二日它又搬走一半。',
        '洞口那棵树的影子，一日比一日长，长到够着门槛。',
        '拾了一捧落叶垫在身下，睡着有响声。'],
      winter: ['霜封洞口。吐纳时白气凝空，久不散。',
        '柴尽，懒去砍。修士不畏冷，唯余寂寞。',
        '手指冻得发僵，掐诀掐了三次才成。',
        '雪从缝隙里漏进来，在地上堆成一小堆，像谁特意放的。',
        '夜里听见冰裂，一声很长，像有人在远处叹气。',
        '把水囊抱在怀里睡，早上还是结了薄冰。']
    },
    market: {
      spring: ['开春头集，摊自街口摆至河边。有人认出，唤一声道号。',
        '卖花老妇换成年轻女子，言其母病，代一年。',
        '有人在墙上贴招工的纸，字被雨泡花了。',
        '新摊主不会喊价，一整日只卖出一件，脸色很难看。',
        '卖符的老头在打瞌睡。符纸被风吹走两张，他捡回来一张。',
        '河边的柳条被人折了一地，都是短的，像是够不着。'],
      summer: ['暑天无人愿挤。摊主移货树荫，懒声喊价。',
        '冰镇灵果卖得最好。买一颗，边走边食，凉至心底。',
        '肉铺的腥味飘过整条街，混着香粉味，说不出好闻难闻。',
        '两个修士在茶摊上争执，声音很大，谁也不动手。',
        '卖草鞋的收了摊，把剩下的挂在树上，写明「自取，随缘」。',
        '有妇人抱着孩子讨水。摊主给了，孩子喝完把碗摔了。'],
      autumn: ['新货下山时。灵材丹药堆满案，价却比往年高。',
        '有人低声兜售来路不明残卷。摆手，其人转瞬没入人群。',
        '收账的日子。几个摊主围着一个不还钱的人，那人一直笑。',
        '有人卖「刚打上来的河鱼」，鱼还活着，眼睛很亮。',
        '街角有个测字的，围了三层人。你挤进去，写的都是自己的名字。',
        '风起了。满街的纸钱、草屑、菜叶一起往同一个方向滚。'],
      winter: ['冬市开得早，散得也早。日头一斜，街便空了。',
        '雪落摊布，货主且扫且骂天。立于此，忽觉此地甚似人间。',
        '炭价涨了三成。卖炭老头说今年冷得早，明年还会更早。',
        '有孩子蹲在墙角，面前摆着一只死鸟，要卖一个铜板。',
        '酒楼二楼有人弹琵琶，弹错一个音，再弹一遍还是错。',
        '雪地上有两行脚印并排走，走了一段，只剩一行。']
    },
    wild: {
      spring: ['雪化泥软，嫩芽初出。行半日，只见一窝睁眼野兔。',
        '溪水涨了。石上歇脚，见水底细光一闪而过。',
        '一片新坟，土还是松的。碑上无字，只插了一根木牌。',
        '走了半日，回头看见自己的脚印，深一脚浅一脚。',
        '有鹿从林子里出来，看你一眼，又进去了。',
        '路边倒了半棵树，断面新，是这几日的事。'],
      summer: ['草木最盛，亦最毒。树下坐一炷香，起时衣角尽湿。',
        '蝉噪甚急。循声过去，只见一具被啃尽的兽骨。',
        '路边一口井，井壁长满青苔，水面上浮着一只死蝉。',
        '采药人留下的绳子还挂在崖上，人不见了。',
        '走了很久没有声音，连鸟都没有。你停下，声音才回来。',
        '草丛里有一窝蛋，还是温的。你没动，绕开了。'],
      autumn: ['山中秋来得急。上次所留记号，已被落叶盖尽。',
        '远处有人烧纸。灰飘过来，落在袖口。',
        '满山黄叶。风一过，整片山响了一下。',
        '有人在溪边洗一件血衣。见你来了，把衣服沉进水里。',
        '山道上有新踩出的岔路，通向一片没有名字的林子。',
        '野果熟透，落了一地。鸟吃剩的，你也捡了几颗。'],
      winter: ['雪埋山路。踩下陷至膝，行一步，须拔一次。',
        '冷得反常。手缩袖中，忽忆多年前某个冬日。',
        '雪地上有一行脚印，只有去的，没有回来的。',
        '树皮被剥了一圈，露出白木。是饿极了的人干的。',
        '走到半山，风突然停了。静得能听见雪落的声音。',
        '远处有狼嚎，一声，很短的。之后很久都没有第二声。']
    },
    sect: {
      spring: ['山门桃开。执事弟子树下点名，念到道号时抬了下头。',
        '钟响三下。春日里此声总显得比别季远。',
        '新入门的弟子在山门前排队，一个个冻得鼻尖发红。',
        '有人在后山偷偷哭。见你过来，把脸转了过去。',
        '执事换了人。新来的不认识你，问了两遍道号。',
        '药圃的雪化了，水漫过小径。有人拿锄头在挖沟。',
        '开春放榜，外门弟子围榜半日，散时有人欢喜，有人回去收拾包袱。',
        '灵药圃的雪化了，泥地里冒出药芽。看园老头蹲了一上午，没起身。',
        '演武场解冻，泥里能捡到去年输掉的那几招。',
        '讲经堂换了新帘子。风一过，满堂的经文都在动。'],
      summer: ['丹房炉火整日不熄。隔壁峰来借火种，走时顺走两块炭。',
        '演武场晒得发白。只余数人尚练，汗把衣衫浸成深色。',
        '药圃的草长得比药好，管事的骂了一下午。',
        '夜里有人翻墙出去，回来时天已亮，身上一股酒气。',
        '长老闭门不见客，说是「在悟」。已经悟了三个月。',
        '井水打上来是温的。没人抱怨，都拿它洗脸。',
        '丹房歇炉避暑。炉灰里埋着今年第一炉炸裂的丹渣，谁也不认。',
        '午后殿前晒药，药香混着蝉声。守药弟子站着睡着了。',
        '御兽殿的灵兽怕热，趴在水槽边，看谁都像看肉。',
        '夜里山门有条凉路。值夜弟子来回走，把月光踩得很碎。'],
      autumn: ['秋试将近，藏经阁一位难求。廊下立半日方得空。',
        '峰主路过停了一步，看一眼，什么也未说。',
        '藏经阁的书被人撕了几页。管事的挨个问，谁也没认。',
        '有人在比试中被打断了腿。抬下去的时候还在笑。',
        '山道上落满叶子。扫的人扫了一半，坐在旁边抽旱烟。',
        '分例发下来，比上月少。没人说话，各自拿了走。',
        '藏经阁晒书日，满阁纸页翻动，像一群白鸟要起飞。',
        '秋考将至，演武场夜里也有剑声。剑声里夹着心跳。',
        '采药队的背篓比人高，下山走得很慢，很稳。',
        '食堂换了秋日菜单，灵米粥里添两粒红枣，弟子们多排了一次队。'],
      winter: ['雪压殿顶。值夜弟子缩在檐下，见之行礼，手都在抖。',
        '冬日宗门最静。静得能听见心底那点算盘声。',
        '分例减了三成。执事说年景不好，没人信，也没人问。',
        '有个弟子在雪地里跪了一天，说要拜师。没人理他。',
        '钟楼的钟冻住了，敲出来的声音闷闷的。',
        '炭盆只有一个，围了七八个人。谁也没往中间挤。',
        '大雪封山，藏经阁借书的人多了一倍。雪天读书，还书的人却一个不少。',
        '炉房烧了整月的炭，火头老张的脸比炭还红。',
        '年关放月俸，账房先生的算盘声比钟声准时。',
        '除夕夜峰顶无人，只有雪落的声音，一层比一层厚。']
    },
    temple: {
      spring: ['庙前杏花开。上香者比上月多几个，供桌果子换了新的。',
        '有孩子在庙门口追跑，被娘拽回去按着磕头。',
        '供桌上的果子被鸟啄了。你没赶，它吃完就飞了。',
        '有个妇人天天来，只上香不说话。第七天她没来。',
        '墙上新添几道划痕，是用指甲划的，划的是一个人的名字。',
        '香灰里埋着半张纸，写着生辰，字迹是孩子的。',
        '春社日，村人抬着猪头进庙。神像前摆不下，就摆到门槛外。',
        '庙前老树抽了新芽。孩子们说树也信神，不然怎么活了一百年。',
        '赈粥三日，粥稀。排队的人却把队伍站得很直。'],
      summer: ['大暑。求雨者一日多过一日，香灰积了厚厚一层。',
        '庙里闷热。把供桌往前挪了挪，让穿堂风能过。',
        '香客的鞋摆在门槛外，摆得很整齐，像怕弄脏庙里的地。',
        '有个老人跪了很久，起来时腿麻，扶着柱子站了半天。',
        '夜里有人来撬功德箱。你没现身，他自己摔了一跤，跑了。',
        '蝉在庙后的树上叫。香客说这是神在应声。',
        '伏天香客少，庙里只留一盏灯，灯芯挑得很省。',
        '求雨的锣鼓响了一日。夜里云来了，全村没人睡。',
        '蛇进了殿，没人打。它绕着香炉走了一圈，从后门走了。'],
      autumn: ['秋收后来还愿者排至门外。有人放下半袋米，说声多谢便走。',
        '香火钱串成一条线。夜里数过，比上月多一百二十。',
        '有人送来一面锦旗，字写得歪，落款是三个村子的名字。',
        '庙后老树掉了一地果子，没人捡，踩上去黏脚。',
        '有个外乡人来问：你们这庙，灵不灵？你还没答，他先跪了。',
        '风把门吹开又合上，合上又吹开。你走过去，把它拴住了。',
        '秋收还愿的队伍从村口排到庙门。每人一炷香，香把炉插满了。',
        '祀部巡查。翻功德簿的手很白，翻页的声音很轻。',
        '夜里有人偷香灰，抓到是个药婆，说这灰能治小儿夜啼。放了，只罚她跪一炷香。'],
      winter: ['雪封庙门，只有三两人来。他们在门槛外跺脚，把雪跺化了才进来。',
        '半夜有人敲门。开门是个冻僵货郎，让其在灶边歇了一夜。',
        '供桌上的香灭了三次。第四次你守着它烧完。',
        '有个孩子把攒的糖放在神像前，说是「给神仙甜甜」。',
        '庙檐下的冰棱越长越长。有人来敲，敲断一根，笑得很响。',
        '夜里听见有人在庙外哭，哭了很久。你开门看，雪地上没有人。',
        '雪封庙门，庙祝扫出一条路来。扫得太勤，路上反倒不落一片雪。',
        '冬夜守灯，灯花爆了三声，像是回话。',
        '年末算香火账。账比去年厚，庙祝的手比账薄。']
    }
    ,dongtian: {
      spring: ['进洞天第一眼所见，不是宝，是时日之差。影子比人先动。',
        '洞天灵气浓得发甜。呼吸急了会醉，醉了会哭。'],
      summer: ['灵泉边不宜久坐。坐久了不想走，走了不想回来。',
        '洞天的鸟不怕人，也不看人。它看的是更久的东西。'],
      autumn: ['一株灵草活了两千年。被你踩过的地方，第二日又直了。',
        '一面旧石壁，摸上去是温的。上面全是前人刻的小字，最新的一条墨迹未干。'],
      winter: ['福地果树下不宜许愿。许了它真会给，给的东西都带着价。',
        '出洞天时回了一次头。洞口已经合拢，像从来没开过。']
    }
  };

  /* 特殊场景：优先级最高，命中时覆盖常规组合 */
  const SCENES_SPECIAL = {
    breakXian: ['天还没亮你就醒了。气海里那片东西在动，像有什么要出来。',
        '突破后三日不使力。力气大了，怕碰碎旧东西。',
        '看旧日的对手，忽然看得很清楚，清楚得有些可怜他。'],
    breakShen: ['香火一夜没断。你知道，今天有件事要成。'],
    hurt: ['伤口在阴天里发痒。你按了按，知道它还没长好。',
        '伤处夜里跳着疼，疼得有节奏，像另一个心跳。',
        '血渗进绷带的速度，比想的慢，比担心的快。',
        '静养第三日，数出天花板有十七道裂纹。第十八道是自己刻的。'],
    closure: ['出关的那天，你站在洞口，光刺得睁不开眼。原来外面已经换了季节。',
        '闭关前先把窗关好。不是怕人，是怕自己半途想看一眼天。',
        '出关第一件事是喝水，第二件才是问过了几年。',
        '闭关中偶有杂念。杂念是旧的，新的修为盖不上去。'],
    visitor: ['门外有人咳嗽了一声。',
        '门外有人叩了三下，力道很匀。是有事，不是有难。',
        '来客带了两斤茶，说是顺路。这条路不顺。'],
    drought: ['天旱了几个月。你抬头看，天上连云都没有。',
        '河底露了三个月，鱼骨白得很整齐。'],
    demon: ['最近夜里不太平。山那头有人见过不该见的东西。',
        '妖潮来的前夜，山里的鸟全飞了，都往人多的方向。'],
    enemy: ['你已经感觉到有人在跟着你。跟了三天了，不远不近。',
        '仇家进门不说话，先把门闩折断，放在桌上。',
        '他等着你拔剑。你没拔，这局就变了。']
  };

  /* ====== 道书典籍（《蛊真人·人祖传》模式）======
     「初读起来是故事，其实寓意深刻」——同一部书可反复读，每次读出不同的层。 */
  const DAOSHU = [
    {
      id: 'xuanjing', name: '《玄景残卷》', price: 800,
      intro: '残卷只剩十七页，纸边已经发脆。开篇四个字：誓由心动。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '一个少年在雪地里追一只白鹿，追了三年。最后他发现，鹿是他自己的影子。\n你不明所以，只觉得心里空了一下。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '你忽然注意到，故事里少年每次歇脚的地方，都有一株同样的草。\n你照着卷上画的图找了半日——那是补气草，在山阴处一长一大丛。',
          gain: '补气草采集点（采集量 +50%）' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '「鹿是他自己的影子」——原来说的不是鹿。\n你想起卷首那四个字：誓由心动。誓不是立给别人的，是立给自己的影子看的。',
          gain: '道心 +2' },
        { need: { realm: 2 }, needText: '筑基以上',
          text: '最后一页有批注，字迹和正文不同。\n只写了三个字：「我追到了。」\n——写这行字的人，后来怎样了？',
          gain: '线索：某处洞府（舆图上浮现一处遗迹）' }
      ]
    },
    {
      id: 'renzu', name: '《人祖传·残页》', price: 1200,
      intro: '只剩半卷，缺了中间几十页。开头说：人之祖，非一人。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '说的是一个人把自己的影子剪下来，养在坛子里。影子替他干活、替他受罪，最后替他死了。\n他把坛子埋了，从此再没影子。',
          gain: '阅历 +1' },
        { need: { insight: 11 }, needText: '悟性 ≥ 11',
          text: '你想了很久才明白：影子替他死，是因为影子本来就属于他。\n——那么替你挡刀的人，是不是也有一部分属于你？',
          gain: '道心 +1' },
        { need: { heart: 14 }, needText: '道心 ≥ 14',
          text: '缺的那几十页，你从别的残本里拼出了大意。讲的是「人祖如何把自己的名字分成七份」。\n名字分开，人就死不了——但也再不是一个人。',
          gain: '解锁：分灵之法的线索' },
        { need: { realm: 3 }, needText: '紫府以上',
          text: '你在卷末看到一行小字，是自己先前写的。\n笔迹是你自己的，可你从没写过这行字。',
          gain: '线索：身世（后续剧情）' }
      ]
    },
    /* ====== 2026-11-17 素材增补：《蛊真人·人祖传》式四读 ======
       同一部书，第一读是故事，第二读懂技法，第三读懂秘闻，第四读懂真意。
       每一层的收益都必须在 do_readbook 里能兑现——写着「寿元 +20」
       却什么都不发生的书，等于没有这本书。 */
    {
      id: 'jiuhuan', name: '《九寰天书·地字卷》', price: 1500,
      intro: '地字卷原该有七册，这一册的封皮是后换的，线脚很新。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '一个工匠修了一辈子桥。桥修了塌，塌了修。最后一段写：他没等到桥成那日，但后来过桥的人，都踩着他的手印。\n你不明所以，只觉得手心有些痒。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '你注意到书里每座桥的基座画法都不同，旁边注着小字：水怒则以沉锚，水缓则以浮桩。\n这是驭水筑基的门径。',
          gain: '悟性 +1' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '「后来过桥的人」五字，你读了三遍才明白：书里的工匠不叫工匠，叫基。桥是仙基，手印是道印。',
          gain: '道心 +2' },
        { need: { realm: 2 }, needText: '筑基以上',
          text: '最后一页有半枚脚印，不是刻的，是踏出来的。你把脚放上去，恰好合。\n此后再看桥，便知何处该沉锚。',
          gain: '道心 +3' }
      ]
    },
    {
      id: 'meihua', name: '《梅花易·残页》', price: 900,
      intro: '一页残卦，纸背有朱笔批注，字迹与卦辞不同。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '一页残卦，占的是一个书生赴考。卦辞只有四个字：路遇故人。\n书生后来考中没有，残页没有写。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '你试着给自己起了一卦。卦辞也是四个字：路遇故人。\n你笑了，同时脊背有些凉。',
          gain: '悟性 +1' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '故人不一定是人。你想起宗门志里那句：故物重逢，其价自现。',
          gain: '道心 +2' },
        { need: { realm: 3 }, needText: '紫府以上',
          text: '你终于看懂残页边缘那行蝇头小字：卦不算自己。算自己的，都是别人替你算好的。',
          gain: '道心 +3' }
      ]
    },
    {
      id: 'taiyin', name: '《太阴吐纳养轮经·注本》', price: 1800,
      intro: '注本与原典不同。原典讲轮，注本讲谁在读。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '注文第一条写：月圆夜读此书，不要出声。\n你照做了。那晚听见自己的轮，转得很慢，像在等人。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '注者批：轮有六，凡人只见其五。你数了数六轮之名：玄景、承明、周行、青元、玉京、灵初。\n正好六个。',
          gain: '悟性 +1' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '夹页里有一张舆图，标记了七处月圆之夜灵气最盛之地。其中三处画叉，一处画圈。\n画圈那处，你去过。',
          gain: '修为 +30' },
        { need: { realm: 4 }, needText: '金丹以上',
          text: '最后一页只有一行：我养轮三百年，轮最后养了我。\n你合上书，觉得这句话往上还有一层意思，等你到了道胎再看。',
          gain: '寿元 +20' }
      ]
    },
    {
      id: 'xianghuo', name: '《香火成神法·邪注本》', price: 1400, path: 'shen',
      intro: '正文讲神道正统，批注却句句反着来。批注者下落成谜。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '批注写：香火是债，显圣是还债。谁劝你多收香火，谁想让你多背债。\n你觉得批注者刻薄，但句句在理。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '批注教了三招省香火的显圣法：夜显一次抵日显三次，庙墙裂一道抵塑金一身。\n你试了第一招，灯下果然有成。',
          gain: '悟性 +1' },
        { need: { pillar: 4 }, needText: '神道四柱以上',
          text: '批注最后几页写了名字。你认得这个名字：县志里，它是三百年前一个被拆了庙的土地。',
          gain: '道心 +2' },
        { need: { pillar: 6 }, needText: '神道六柱以上',
          text: '你忽然懂了批注者为何下落成谜。他没有失踪，他被记成了账。\n从此你看香火簿，看的是人名，不是数目。',
          gain: '道心 +3' }
      ]
    },
    {
      id: 'bailian', name: '《百炼成仙道法·凡本》', price: 600,
      intro: '印工粗劣，错字连篇。第八页印着一行小字：本坊盗版，仙长海涵。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '错字太多，读来发笑。你把它买完了，就当看个话本。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '错字太多了，你改着改着发现：改对的那几处，居然都读得通，而且比原文更顺。',
          gain: '悟性 +1' },
        { need: { insight: 16 }, needText: '悟性 ≥ 16',
          text: '你对照真本比对：这凡本不是盗版，是有人故意改错再发的。改错之处，正是真本真正要紧之处。\n以错养真。',
          gain: '道心 +2' },
        { need: { realm: 4 }, needText: '金丹以上',
          text: '书末盖着一个闲章：贩书人也修道。\n你托坊市书商打听，书商笑而不语，只多送了你一本。',
          gain: '道心 +3' }
      ]
    },

    /* ====== 2026-11-20 素材增补：四部道书（据《小说素材改编库》§1、§9）======
       四读的规矩不变：一读故事，二读技法，三读秘闻，四读真意。
       需要「悟性够 或 道心够」的那几层，用 need.or 写——旧的 need 只能全要。 */
    {
      id: 'canxin', name: '《残心经》', price: 1100,
      intro: '薄薄一册，纸色发黄。卷首画着一只极丑的虫，画得比正文用心。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '昔有人祖，为群困所围，力量、智慧二蛊皆弃之。第三蛊至，曰：「供奉我，可脱此厄。」\n人祖泣曰：「我止余老年，供奉则立死。愿多活一刻。」\n蛊曰：「我所需至微——以心予我可也。」\n人祖乃以心予之。是蛊本最孱弱黯淡，然得心之顷，忽放光明。群困惊呼：「此希望蛊也，最畏希望！」遂仓皇退散。\n读罢，只觉胸中一空。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '再读，方注意：三蛊之中，力量、智慧皆金玉其外，唯希望蛊其貌不扬。\n识破「华美者未必可用」，此后翻残卷，先看纸背，不先看名头。',
          gain: '悟性 +1' },
        { need: { or: [{ insight: 14 }, { heart: 15 }] }, needText: '悟性 ≥ 14 或 道心 ≥ 15',
          text: '三读，「以心予之」四字忽有重量。所予者，非血肉之心，是「尚存一念」。\n困时不弃望者，其心可鉴——这话指向某处古洞，洞名守心。',
          gain: '道心 +2' },
        { need: { realm: 2 }, needText: '筑基以上',
          text: '四读，见页脚另有一行小字，笔迹迥异：「我追到了。」\n不知何人，于何时，亦曾在困中读此书。\n合上书，你觉得自己比方才稳了一线。',
          gain: '道心 +1', fx: { breakBonus: 0.02 } }
      ]
    },
    {
      id: 'mingtu', name: '《命途残章》', price: 900,
      intro: '残章只剩七页，讲的是一道门，门后有路二条。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '生死之门，有路二：死路与生路，皆宿命所踏。活人入死路，欲出则走生路。\n死路满忧患，生路有三关：荡魂山、落魄谷、逆流河。门中有安魂湖，有公平蛊。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '再读，留意三关的次序：先摇其魂，再夺其魄，最后才逆其行。\n三关不是三处地方，是三样你自己身上的东西。',
          gain: '悟性 +1' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '「公平蛊」居门内，言「万物有生有死，天地乃循环」——此非劝慰，是判词。\n判词面前，人人一样高。',
          gain: '道心 +2' },
        { need: { realm: 3 }, needText: '紫府以上',
          text: '你把残章读到最后，见页边有人用指甲刻了四字：走生路者，皆曾入死路。\n门不在别处。门在你走投无路那一日。',
          gain: '道心 +3' }
      ]
    },
    {
      id: 'mingdeng', name: '《命灯录》', price: 1500,
      intro: '宗门记名之物。封面不题书名，只烫一盏灯。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '宗门以命灯记名。灯亮，人活；命火旺者未必福，灯暗者未必夭。\n有弟子问：灯灭人亡，还是人亡灯灭？执事不答，只把灯往他面前挪了半寸。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '再读，注意「认牌不认人」四字。牌是死物，人才会跑；认死物，比认人省事。\n你顺手记下制牌的几处关节。',
          gain: '悟性 +1' },
        { need: { heart: 14 }, needText: '道心 ≥ 14',
          text: '三读，忽然明白执事那一挪：灯往前挪半寸，是要你看清灯芯，不是看灯。\n灯芯是血色的，血是别人的。',
          gain: '道心 +2' },
        { need: { realm: 4 }, needText: '金丹以上',
          text: '「资质好的，早死了；平庸的，活着创造价值。」\n这句话刻薄，但你在这行里活得越久，越难反驳它。',
          gain: '道心 +2' }
      ]
    },
    {
      id: 'guancai', name: '《棺材庙记》', price: 1000, path: 'xian',
      intro: '一册庙志，字是抄的。抄的人手很稳，只是最后几页越写越挤。',
      layers: [
        { need: {}, needText: '无忌讳',
          text: '山中有庙，只一门无窗，梁两头高中间矮。老道说：像棺材。\n黑石砌的，是黑棺，镇枉死之人。',
          gain: '阅历 +1' },
        { need: { insight: 10 }, needText: '悟性 ≥ 10',
          text: '再读，看懂了那几处营造：无窗者不留眼，中矮者压气，一门者只进不出。\n这不是庙，是坟。修庙的人知道。',
          gain: '悟性 +1' },
        { need: { insight: 14 }, needText: '悟性 ≥ 14',
          text: '棺色分五：红白黑黄金。黑为玄水镇煞——那庙，埋了一整村横死的人。\n庙志到此断了半页，断口是撕的，不是烂的。',
          gain: '道心 +2' },
        { need: { realm: 3 }, needText: '紫府以上',
          text: '最后几页挤着一行小字：庙在，人在；庙塌，人再死一次。\n你合上书，忽然想知道那座庙现在还在不在。',
          gain: '道心 +1' }
      ]
    }
  ];

  /* ====== 诗词歌诀：突破 / 地名 / 结局 / 功法题诗 ====== */
  const VERSES = {
    /* ============================================================
       诗词库（古体重订 · 2026-11-17）
       ------------------------------------------------------------
       旧版每境三句，句式参差（有七言、有五言、有半句），
       破境诗窗里两行一断，读起来气口是乱的。
       这一版全部换成整齐古体：七言四句成篇，邻韵通押，
       一境多首随机取，且避开上一句（S.lastVerse 真正开始起作用）。

       映射规则要特别注意：resolveXianBreak 是「先 S.xRealm++ 再取诗」，
       所以 reciteVerse 拿到的 realm 是「到达的境界」。
         realm 1 = 破入练气 → 用「练气」组
         realm 5 = 破入道胎 → 用「道胎」组
       「胎息」组写的是胎息圆满之象，破境时用不到，放到 breakStage 的
       realm 0（胎息期升小阶）——那里才是它该出现的地方。
       ============================================================ */
    breakXian: [
      /* realm 1 · 练气（采吞天地灵气，九层） */
      { realm: 1, line: '朝吞紫气暮吞霞，炼就灵台九朵花。莫笑皮囊浑似旧，此中已有海天涯。' },
      { realm: 1, line: '天地借吾一口气，吾还天地一炉香。九层楼阁凭虚起，立在虚空不用梁。' },
      { realm: 1, line: '夜半灵潮入海塘，周天运处百脉张。晨来照水惊相识，眉目之间有剑光。' },
      { realm: 1, line: '一层一境一层天，采尽灵光不觉年。回首白云低半尺，始知吾已在山巅。' },
      /* realm 2 · 筑基（六轮兵解，铸仙基） */
      { realm: 2, line: '六轮散作满天星，收得一颗照夜行。从此仙基根地立，八方风雨不能倾。' },
      { realm: 2, line: '昨夜雷声非是雷，隔窗惊起蛰龙回。皮骨换罢山河旧，一盏残灯照玉台。' },
      { realm: 2, line: '兵解原非向死行，拆身重铸候天明。旧轮散尽仙基立，踏碎青云第一程。' },
      { realm: 2, line: '四印集时基始牢，一印一劫一功劳。莫言筑基容易事，多少英才骨未销。' },
      { realm: 2, line: '天堑从头量此身，仙基一铸隔凡尘。同来问道人何在，笑指白云深处身。' },
      /* realm 3 · 紫府（升阳、破蒙昧、渡幻想三关） */
      { realm: 3, line: '推基入府叩重关，第一关前先自观。升阳一线破昏晓，照彻平生毫发端。' },
      { realm: 3, line: '蒙昧关头闻唤声，声声却是旧时名。低眉不应将心守，守得云开月自明。' },
      { realm: 3, line: '幻想如潮天际来，一潮一世一尘埃。潮头看尽千般我，只有初心不肯改。' },
      { realm: 3, line: '三关过尽气如虹，紫府沉沉夜正空。坐看灵光生万象，原来天地在吾胸。' },
      /* realm 4 · 金丹（煅出金性，设法仪引来果位） */
      { realm: 4, line: '炉火煅金三千夜，煅到无尘始见心。一点圆光凝不散，悬于气海照古今。' },
      { realm: 4, line: '丹成不必问天时，金性煅来自在兹。位上虚空原有意，三十缺一待吾之。' },
      { realm: 4, line: '设仪七日雨连宵，香火不熄风中烧。第八日来云破处，果位加身云自朝。' },
      { realm: 4, line: '丹成雷雨不相侵，性比金坚比玉深。从此寿元千二百，闲看沧海变桑林。' },
      /* realm 5 · 道胎（以己心代天心） */
      { realm: 5, line: '我以我心代天心，天心深处即吾心。长生自此无凭据，只看人间记到今。' },
      { realm: 5, line: '摘出吾心当玉衡，称量天地两无倾。苍天若问凭何据，笑指胸中一点明。' },
      { realm: 5, line: '昨日天尊我为客，今朝我坐与天平。一炉茶沸分宾主，同看人间万古晴。' },
      { realm: 5, line: '道胎一成寿字删，长生不系岁星间。四锚立定风波外，人记吾名天地闲。' }
    ],
    /* 小阶突破：胎息期用「胎息」组（八十一缕、玄景轮），
       其余境界用「坐忘偶得」的五言小句——小阶本就不是大关口，
       给一联刚好，给四句反而喧宾夺主。 */
    breakStage: [
      { realm: 0, line: '八十一缕会中宵，一点灵光自内烧。莫道凡胎无胜境，玄轮初转夜闻潮。' },
      { realm: 0, line: '八十一缕夜中缠，汇入丹田一线牵。凝作轮圆光自转，凡躯从此异从前。' },
      { realm: 0, line: '气海无声起夜潮，灵珠初孕伴星遥。从今吐纳通玄牝，静听风雷上碧霄。' },
      { realm: 0, line: '玄景初圆似玉盘，中宵自转夜光寒。凡尘呼吸从今改，一缕清气上眉端。' },
      { realm: 1, line: '杂念如客至，送到门即休。' },
      { realm: 1, line: '丹田微暖处，如抱一枚春。' },
      { realm: 1, line: '数息三百后，忘了数息人。' },
      { realm: 2, line: '出定时日斜，始觉一日短。' },
      { realm: 2, line: '悟不在坐中，在起坐一步。' },
      { realm: 2, line: '今夜无月色，气行三周天。' },
      { realm: 3, line: '呼吸与潮应，一坐忘江湖。' },
      { realm: 3, line: '听雨入定去，醒来雨满襟。' },
      { realm: 3, line: '静极闻心跳，原来是我声。' },
      { realm: 4, line: '心火压下处，远闻咳嗽声。' },
      { realm: 4, line: '一炉火候到，不必问天时。' }
    ],
    fail: [
      '气散如沙聚更难，一声长叹烛花残。关前只差三寸力，三寸便是万重山。',
      '心火焚身焚过头，烧残经脉骨中愁。坐看窗外春如旧，我去春前雪满头。',
      '井底捞月月自圆，捞来捞去总徒然。天不予时休强取，强取从来折少年。',
      '差之毫厘谬千里，关前一退退经年。重来未必输前度，且把残躯再着鞭。',
      '出关不遇雨兼风，一身尘土一身空。破境不成非绝路，炉中添淬铁添锋。',
      '强渡不成雷劫空，一身尘土一身风。洞前老树青如昨，笑我霜华两鬓中。'
    ],
    /* 神道八柱：pillar 即柱位。一柱立庙在起庙那夜，八柱真君是终局。 */
    breakShen: [
      { pillar: 1, line: '一梁一柱一炉香，从此荒村有主张。神不择庙庙择土，先安门槛后安梁。' },
      { pillar: 1, line: '头炷香来何姓客，原是不信叩门人。门开便有三分信，庙小从来敬字真。' },
      { pillar: 2, line: '香火如潮夜夜来，来时一句一尘埃。尘埃积处成丘壑，神位原来是债台。' },
      { pillar: 2, line: '千家灯火我分光，一炷香中一寸肠。愿大愿小心自量，量力而担莫强当。' },
      { pillar: 3, line: '显灵不必惊雷动，一盏灯挑夜雨中。众口相传神有应，应的从来是心通。' },
      { pillar: 3, line: '神迹原非凭空起，众心早铸一金身。吾来不过添眉目，从此人间有真神。' },
      { pillar: 4, line: '分魂一缕庙后井，井水照人亦照身。从此一身行两界，听香看路两平分。' },
      { pillar: 5, line: '阴司册上点吾名，九品衣冠自此荣。开府那宵无贺客，案头黄卷伴灯明。' },
      { pillar: 6, line: '一笔判生死，落笔先问心。命字如山重，不敢换千金。' },
      { pillar: 6, line: '掌了他人命，方知命字沉。朱笔轻落下，即是两世分。' },
      { pillar: 7, line: '通天非为上天行，天有低眉看我时。名号入人千百户，一声一念一香丝。' },
      { pillar: 7, line: '千家万户念吾名，名字随风到处行。行到香炉燃处歇，歇在人间烟火明。' },
      { pillar: 8, line: '香灰落定位格成，一方水土一盟城。从此旱涝皆吾事，守到人间忘姓名。' },
      { pillar: 8, line: '百年香火不熄处，方敢当真一个君。此方水土既认我，风雨与它共朝昏。' }
    ],
    /* 地名题咏：key 对齐 PLACES 的五个 id，供舆图面板与新地点的题咏用。 */
    places: {
      qingyue: '青岳雪千载，不言自有威。行人仰首处，一鸟破云飞。',
      nanyue: '荒原风一夜，抹尽万人踪。莫问路何在，路在无人中。',
      xisha: '潭深不知岁，投石问古今。半晌还一响，如答亦如吟。',
      beiyuan: '此山无名字，无人肯问津。苔痕石上厚，青过旧年春。',
      zhongzhou: '半郭半田舍，人间烟火稠。修人借一盏，灯下读春秋。'
    },
    /* 结局诗：一句定一局。key 对齐 ENDINGS。 */
    ending: {
      ascend: '身登云上路，眼落旧山川。仙路千万里，先看是人间。',
      daotai: '天心深似海，吾浅一泓清。疼处皆有故，知疼为何生。',
      zhenjun: '万家香火里，塑我万千身。塑到后来处，忘却本来人。',
      guowei: '位空三十座，一座越千年。今朝登座去，座上暖犹绵。',
      sit: '山中无历日，坐忘不知年。炉火冷成雪，蒲团凹旧痕。',
      daohua: '一身还与山，山默未曾言。雾里谁唤我，不应自安然。',
      fall: '剑热人先凉，遗言断半行。修真界一日，死个人寻常。',
      reinc: '百世书撕页，投火作深红。烧去前生事，留白待来生。',
      xiaoyao: '仙缘终未就，初心不曾亏。推窗看暮色，云自向山归。',
      xianzun: '人提我名姓，言语先一停。停罢低声处，敬畏自然生。',
      modao: '人言我辈逆苍天，我道苍天负我先。白骨铺成登顶路，顶上寒风似旧年。',
      shizun: '八柱圆满夜，佛前一坐深。晨光香客满，所求皆入心。'
    },
    /* 功法残页题诗：黄 → 仙，五阶。购书、拾卷、传法时抽。 */
    gongfa: [
      '引气先须学听风，风过耳时气自通。莫急莫贪莫妄想，一口一口是真功。',
      '金光一尺护身周，不为争锋为远游。夜路山高多魍魉，一点光里自无忧。',
      '引气如凿渠，凿凿不问成。一朝春水到，万壑自纵横。',
      '一字诀曰稳，稳中气自生。生时如春草，不觉满园青。',
      '剑藏匣底三十年，夜夜龙吟不得眠。今日出匣天欲雪，一泓秋水照人寒。',
      '气海须教似海深，千江浑水不嫌侵。潮来自有潮头去，堤筑心头不筑浔。',
      '雷起于静静于渊，渊深一寸雷一拳。出手只争一线势，收势须留三分怜。',
      '凌波径渡不须舟，足下无痕水自流。莫道身轻能踏浪，潮声早已让三筹。',
      '静坐如渊动如霆，雷霆九折各有声。一折问天二问地，三折问吾敢死生。',
      '天河倒泻剑光寒，一泻千山万水间。莫问此锋归何处，收锋如月照人还。',
      '玄光赶山不执鞭，山自逶迤到海边。御土如驱千顷浪，驱时心上自安闲。',
      '月阙悬空剑气清，影随月出夜无声。敌心先冷锋未至，及至锋时影已行。',
      '万剑藏虚不复踪，一锋出隙破千重。千剑归鞘声如雪，静里听来似晚钟。',
      '天生万物皆有漏，漏在吾心欲补时。承认有缺方开始，缺处开花花满枝。',
      '造化炉中无定方，一炉火候一炉量。文武增减凭心悟，悟到深处丹自芳。',
      '万法归宗宗可破，一缕鸿蒙不可分。收入丹田三寸暖，暖过世上万重云。',
      '百炼凡躯骨自坚，炉中岁月不知年。一朝出炉光满室，回头始信身是仙。',
      '半幅焚余字半篇，一联残句抵千言。山门奉作传家宝，三百年来火不眠。'
    ]
  };

  const SCRIPTS = [
    '仙路已绝三百年。\n' +
    '这三百年里，天上再没人上去过，地上的人却一代比一代多。有灵根的照样修行，修到练气九层就卡住，' +
    '然后老去，然后死。族谱上把这种人叫「止步」。\n' +
    '你十六岁那年，气海里第一次响起了水声。\n' +
    '那声音不大，像屋檐下滴水。可你娘听见了，碗掉在地上，摔成两半。她说：「你也要走那条路？」\n' +
    '你没有回答。你只是想知道，那水声是从哪儿来的。',

    '灵气潮汐将至的传言，第三次传进村里时，已经没人当回事了。\n' +
    '第一次传的时候，来了个游方道士，说潮汐一起，凡有灵窍者皆可筑基。村里凑了三百石给他，' +
    '他喝了两天酒，走了。第二次传的时候，族长把庙里的旧碑拓了一遍，说上头写着的确是「潮」字。\n' +
    '第三次，是你自己在后山采到一缕不该有的气。\n' +
    '那气在掌心里转了一圈，就不见了。你握了半天拳，怕它跑掉。',

    '上古十二真君的法相散落人间。\n' +
    '这话现在只剩下一句残碑上的刻文，没人能说清是哪十二位，也没人说得清法相长什么样。' +
    '有说是兽，有说是人，有说只是一团气。\n' +
    '你身上那道，昨夜第一次发烫。\n' +
    '烫的时候你在做梦。梦里有一座很大的庙，殿门开着，里头空无一人，供桌上摆着一碗水。' +
    '你走进去，那碗水就晃了一下——你怎么知道它认得你？',

    '老庙祝死了三天才被人发现。\n' +
    '死的时候是坐着的，手里还捏着半炷没点完的香。村里人说这是「得道」，' +
    '也有人说他是饿死的，那年冬天的确闹了荒。\n' +
    '火化那天，你在他枕头底下摸到一张庙契，纸边已经脆了。' +
    '庙契上写着这座野庙的名字、位置、香火归属——还有一行小字：「后来者，莫求大，先求活。」\n' +
    '他把庙契塞给谁不好，偏偏塞进了你的口袋里。\n' +
    '一句话没留下。',

    '你捡到一枚锈透了的玉牌，牌上刻着两个字：灵初。\n' +
    '字刻得很深，深到三百年过去，锈填满了凹槽，那两个字的形状还在。\n' +
    '村里识字的没几个，认得出「初」，认不出「灵」。' +
    '你拿去问学堂的老夫子，他推了推眼镜，看了一眼，把你赶出去了。\n' +
    '当天夜里，玉牌在你枕下发烫。你摸出来，看见边缘裂开一道缝，' +
    '缝里透出的光，和你有一次在后山见过的，是同一种颜色。'
  ];

  /* ====== 锚定仪式 ====== */
  const RITUALS = [
    { id: 'xudeng', name: '续灯仪', owner: '道胎', period: '每甲子一次', duration: '独坐七日七夜',
      note: '不可中断；不可托付，必须本人' },
    { id: 'dasui', name: '岁时大醮', owner: '八柱', period: '每年一场', duration: '信众百人以上到场',
      note: '必须本人到场' },
    { id: 'chenhun', name: '晨昏三炷香', owner: '八柱', period: '每日', duration: '—',
      note: '可托付守庙人，但需信众仍在' }
  ];

  /* ====== 功过格（成就系统 · v6.6）==========
     设计原则：零数值影响。不进任何公式，只记。
     档位按「被多少人记住」分级，不按难度——因为它同时是叙事。
     test 只读 S 的字段，不调用 engine 里的函数（data 先于 game 载入）。 */

  const ACH_TIERS = [
    { id: 'wen',  name: '传闻', color: '#8C8578' },
    { id: 'zai',  name: '载录', color: '#5E8FAE' },
    { id: 'li',   name: '立传', color: '#6FA698' },
    { id: 'dian', name: '入典', color: '#A87E2E' },
    { id: 'tian', name: '天书', color: '#8B6FA8' }
  ];

  /* poem = 题眼（一句诗），txt = 释义（叙事）。
     旧版只有 txt，108 条读下来像一本散文集，缺一句能记住的短句。
     现在每档都有一句诗：传闻/载录用一句，立传以上仍保留叙事，因为
     那几条（无人送终、孤证、一字不改）本身比任何诗都重。 */
  const ACHIEVEMENTS = [

    /* ---------- 道 · 境界与神位（21） ---------- */
    { id: 'dao_start', cat: '道', tier: 'wen', name: '灵初', cond: '踏入胎息',
      poem: '气海初生浪，凡人始识身。',
      txt: '气海初闻水声。以为水，其实是命。',
      test: s => !!s.started },
    { id: 'dao_taixi', cat: '道', tier: 'wen', name: '一气周天', cond: '胎息六轮圆满',
      poem: '六轮转尽处，方信有周天。',
      txt: '六轮转一周，还归原处。始知「周天」二字非虚设。',
      test: s => (s.xRealm || 0) >= 1 },
    { id: 'dao_lianqi', cat: '道', tier: 'zai', name: '九层不坠', cond: '练气九层圆满',
      poem: '九层行尽后，未曾坠一层。',
      txt: '九层行尽，未曾跌回一层。散修中已算难得。',
      test: s => (s.xRealm || 0) >= 2 },
    { id: 'dao_zhuji', cat: '道', tier: 'zai', name: '铸基', cond: '首次筑基、铸成仙基',
      poem: '骨烬余一石，夜半自鸣声。',
      txt: '六轮兵解时极痛。痛定之后，气海多一物，砸之不碎。',
      test: s => (s.xRealm || 0) >= 2 && !!s.xianji },
    { id: 'dao_zifu', cat: '道', tier: 'zai', name: '三关俱过', cond: '紫府三关全过',
      poem: '三关过后月，照见本来身。',
      txt: '升阳、蒙昧、幻想。最难者第三关——彼处无敌，唯有己身。',
      test: s => (s.xRealm || 0) >= 4 },
    { id: 'dao_jindan', cat: '道', tier: 'li', name: '金丹在握', cond: '结丹、得果位',
      poem: '三十位上坐，开口即天心。',
      txt: '三十位皆有人。夺其一，得之。自此开口即带天心。',
      test: s => !!s.guowei },
    { id: 'dao_daotai', cat: '道', tier: 'dian', name: '心外无天', cond: '化道胎',
      poem: '寿元栏已空，唯问何钉身。',
      txt: '寿元栏空。不复问能活几载，只问尚有何物钉身。',
      test: s => (s.xRealm || 0) >= 5 },
    { id: 'dao_ascend', cat: '道', tier: 'tian', name: '补天', cond: '补回上古断掉的四境，登仙',
      poem: '断处重相接，天始识其名。',
      txt: '四境断于久远之前。接上之时，天始知此名。',
      test: s => (s.xRealm || 0) >= 6 },
    { id: 'dao_4yin', cat: '道', tier: 'zai', name: '干支成对', cond: '四印集齐且配成一对',
      poem: '二干兼二支，是命是算术。',
      txt: '四印，二干二支，恰相对。是命是算，说不清。',
      test: s => !!s.daoyinOk },
    { id: 'dao_lu', cat: '道', tier: 'wen', name: '受箓', cond: '首次受箓',
      poem: '一纸薄如翼，无之即邪魔。',
      txt: '一纸甚薄，书明自此可入那道门。无之者，谓之邪魔。',
      test: s => !!s.lu },
    { id: 'dao_lu2', cat: '道', tier: 'zai', name: '换箓', cond: '换箓（同时进过格）',
      poem: '新箓覆旧箓，灰落手犹温。',
      txt: '新箓压旧箓。旧者焚，灰落手背。',
      test: s => (s.luHistory || []).length >= 2 },
    { id: 'dao_shentong', cat: '道', tier: 'li', name: '一线天', cond: '集齐 4 道神通',
      poem: '四道据气海，不言各让途。',
      txt: '四道各据气海一角。不言语，而彼此让路。',
      test: s => (s.shenTong || []).length >= 4 },
    { id: 'dao_guowei', cat: '道', tier: 'dian', name: '位有其名', cond: '证得任一果位',
      poem: '纳音既有名，天下知此位。',
      txt: '纳音有名，身有其位。自此天下皆知此位有谁。',
      test: s => !!s.guowei },
    { id: 'dao_zheng', cat: '道', tier: 'dian', name: '正统', cond: '证得正统位格',
      poem: '举手云随动，一动即天心。',
      txt: '一举一动皆天心。抬手，天上一块云随动。',
      test: s => !!s.guowei && s.guowei.rank === '正统' },
    { id: 'dao_zhi', cat: '道', tier: 'tian', name: '至尊', cond: '证得至尊位格（×15）',
      poem: '三位据其一，余二始生惧。',
      txt: '天下共争三位，据其一，余二者始生惧。',
      test: s => !!s.guowei && s.guowei.rank === '至尊' },
    { id: 'dao_alone', cat: '道', tier: 'tian', name: '孤证', cond: '无护道者设法仪，且成功',
      poem: '孤身设法仪，本不待人挡。',
      txt: '无人挡那一下。本亦未打算令人挡。',
      test: s => !!s.guowei && ((s.tally || {}).aloneCert || 0) >= 1 },
    { id: 'shen_1', cat: '道', tier: 'wen', name: '一柱擎天', cond: '立庙',
      poem: '供桌冷馒头，犹有跪诵者。',
      txt: '供桌唯余半个冷馒头。仍有人来，跪，诵其名。',
      test: s => !!s.started && s.cultivation !== 'xian' },
    { id: 'shen_5', cat: '道', tier: 'li', name: '香火不绝', cond: '五柱',
      poem: '五处烟五处，忘名独记烟。',
      txt: '五庙五处香火。地名渐忘，唯记烟之形状。',
      test: s => (s.pillar || 0) >= 4 },
    { id: 'shen_8', cat: '道', tier: 'dian', name: '八柱圆满', cond: '八柱',
      poem: '八柱立将满，天留一位待。',
      txt: '八柱立满，天留一位。留者非与，是待取。',
      test: s => (s.pillar || 0) >= 7 },
    { id: 'shen_folks', cat: '道', tier: 'li', name: '万民所望', cond: '信众 ≥ 30 万',
      poem: '卅万同声诵，不闻而知齐。',
      txt: '三十万人同诵一名。听不见，而知其齐。',
      test: s => (s.followers || 0) >= 300000 },
    { id: 'shen_qian', cat: '道', tier: 'dian', name: '香火百万', cond: '累计香火 ≥ 100 万',
      poem: '百万缕成线，线端是人间。',
      txt: '百万缕香火拧作一条长线。线之彼端，是人间。',
      test: s => (s.xianghuoQian || 0) >= 1000000 },

    /* ---------- 艺 · 四艺（15） ---------- */
    { id: 'art_first', cat: '艺', tier: 'wen', name: '初次开炉', cond: '首次制作（任一艺）',
      poem: '初开一炉火，所欠一口气。',
      txt: '第一炉。守炉不敢眨眼，恐火候差一口呼吸。',
      test: s => ((s.tally || {}).craft || 0) >= 1 },
    { id: 'art_zhong', cat: '艺', tier: 'wen', name: '中品', cond: '首次做出中品',
      poem: '中品纳于袖，未告一人知。',
      txt: '中规中矩。收入袖中，未告一人此为自手所出。',
      test: s => ((s.tally || {}).qZhong || 0) >= 1 },
    { id: 'art_shang', cat: '艺', tier: 'zai', name: '上品', cond: '首次上品',
      poem: '启盖室忽明，此物自知异。',
      txt: '启盖之际，屋中一亮。知此件不同。',
      test: s => ((s.tally || {}).qShang || 0) >= 1 },
    { id: 'art_ji', cat: '艺', tier: 'li', name: '极品', cond: '首次极品（天然 3%）',
      poem: '满室香不散，伸手恐其碎。',
      txt: '满室药香。立良久，不敢伸手——恐一触即碎。',
      test: s => ((s.tally || {}).qJi || 0) >= 1 },
    { id: 'art_9', cat: '艺', tier: 'dian', name: '九品炉火', cond: '任一技艺满级（6,500 熟练度）',
      poem: '九品火候熟，手先眼而知。',
      txt: '九品。手比眼先知其当翻当停。',
      test: s => { const c = s.craftLv || {}; return Math.max(c.dan || 1, c.qi || 1, c.fu || 1, c.zhen || 1) >= 9; } },
    { id: 'art_all', cat: '艺', tier: 'li', name: '四艺俱全', cond: '四项技艺均 ≥ 三级',
      poem: '丹器符阵备，问门答不能。',
      txt: '丹器符阵。人问属哪一门，答不出——只会做事。',
      test: s => { const c = s.craftLv || {}; return (c.dan || 1) >= 3 && (c.qi || 1) >= 3 && (c.fu || 1) >= 3 && (c.zhen || 1) >= 3; } },
    { id: 'art_100', cat: '艺', tier: 'zai', name: '百炉不悔', cond: '累计制作 ≥ 100 次',
      poem: '百炉烬堆墙，如话未说尽。',
      txt: '百炉。废者亦未弃，堆于墙角，如未尽之言。',
      test: s => ((s.tally || {}).craft || 0) >= 100 },
    { id: 'art_fu10', cat: '艺', tier: 'wen', name: '符满乾坤', cond: '同时持有符 ≥ 10',
      poem: '十符贴内衫，不知先用谁。',
      txt: '十符贴满内衫。不知哪张先派用场，故尽带之。',
      test: s => { const t = s.talismans || {}; let n = 0; for (const k in t) n += (t[k] || 0); return n >= 10; } },
    { id: 'art_zhen', cat: '艺', tier: 'zai', name: '阵成', cond: '首次布下阵盘',
      poem: '阵盘沉入土，四角一时明。',
      txt: '阵盘沉土，四角皆明。洞府自此不只一洞。',
      test: s => (s.disks || []).length >= 1 },
    { id: 'art_sell1', cat: '艺', tier: 'wen', name: '第一桶金', cond: '首次卖出成品',
      poem: '初将手艺卖，如卖此身力。',
      txt: '初次以手艺换灵石。其感略如卖却自身之力。',
      test: s => ((s.tally || {}).sell || 0) >= 1 },
    { id: 'art_1000', cat: '艺', tier: 'zai', name: '日进斗金', cond: '单月净入 ≥ 1,000',
      poem: '月入千不觉，唯觉可长行。',
      txt: '月净千石，不喜。唯觉此活可长做。',
      test: s => ((s.tally || {}).bestMonthNet || 0) >= 1000 },
    { id: 'art_3000', cat: '艺', tier: 'li', name: '一单千金', cond: '单笔成交 ≥ 3,000',
      poem: '三千不还价，反觉此心虚。',
      txt: '一单三千。对方未还价，反觉心虚。',
      test: s => ((s.tally || {}).sellMax || 0) >= 3000 },
    { id: 'art_auct', cat: '艺', tier: 'zai', name: '槌下', cond: '首次拍卖成交',
      poem: '槌落声初定，价非由己论。',
      txt: '槌落之声既定，方知「价」之一字由他人定。',
      test: s => ((s.tally || {}).auctionWin || 0) >= 1 },
    { id: 'art_black', cat: '艺', tier: 'li', name: '不问来路', cond: '首次黑市成交',
      poem: '但问干净否，答毕两无言。',
      txt: '彼只问一句「干净否」，答干净，便不再问。',
      test: s => ((s.tally || {}).blackSell || 0) >= 1 },
    { id: 'art_master', cat: '艺', tier: 'dian', name: '一艺通神', cond: '一艺满级且靠它单月净入 ≥ 5,000',
      poem: '艺至无言处，手中物先声。',
      txt: '一门手艺至尽头，其自能言，无须自陈。',
      test: s => { const c = s.craftLv || {}; return Math.max(c.dan || 1, c.qi || 1, c.fu || 1, c.zhen || 1) >= 9 && ((s.tally || {}).bestMonthNet || 0) >= 5000; } },

    /* ---------- 争 · 战斗（12） ---------- */
    { id: 'war_first', cat: '争', tier: 'wen', name: '初战', cond: '首胜',
      poem: '初赢立喘久，方忆当行时。',
      txt: '初胜。立于原地喘甚久，方忆当行。',
      test: s => ((s.tally || {}).warWin || 0) >= 1 },
    { id: 'war_over', cat: '争', tier: 'li', name: '越境', cond: '击败高自己一个大境者',
      poem: '彼高一境倒，非幸算之也。',
      txt: '彼高一大境，犹倒。非幸，算之也。',
      test: s => ((s.tally || {}).warOver || 0) >= 1 },
    { id: 'war_escape', cat: '争', tier: 'zai', name: '全身而退', cond: '从「绝境」档成功遁走',
      poem: '不战抽身去，逃名亦胜名。',
      txt: '未战，唯走。走比胜难，脸皮须厚。',
      test: s => ((s.tally || {}).escapeDesperate || 0) >= 1 },
    { id: 'war_one', cat: '争', tier: 'zai', name: '一击', cond: '一回合击杀',
      poem: '一合血未落，对此手生疏。',
      txt: '一合。收剑时血未落地。自此对己手略觉生疏。',
      test: s => ((s.tally || {}).warOne || 0) >= 1 },
    { id: 'war_20', cat: '争', tier: 'wen', name: '手不抖', cond: '累计胜 20 场',
      poem: '廿战忘生死，此非吉兆也。',
      txt: '二十场后，出手不复思「会不会死」。此非佳事。',
      test: s => ((s.tally || {}).warWin || 0) >= 20 },
    { id: 'war_king', cat: '争', tier: 'li', name: '屠妖王', cond: '击杀化形大妖',
      poem: '百年气尽散，皮毛下无骨。',
      txt: '山中那物倒下。皮毛之下无骨，唯百年所积之气。',
      test: s => ((s.tally || {}).kingKill || 0) >= 1 },
    { id: 'war_miao', cat: '争', tier: 'zai', name: '砸庙', cond: '首次夺祀成功',
      poem: '香灰扬处面，灰中视来人。',
      txt: '砸人庙。香灰扬起时，灰中有一面视人。',
      test: s => ((s.tally || {}).seizeWin || 0) >= 1 },
    { id: 'war_ji', cat: '争', tier: 'dian', name: '断人道途', cond: '夺人仙基',
      poem: '取其气海石，彼活止练气。',
      txt: '取走彼气海之石。彼犹活，止活至练气。',
      test: s => ((s.tally || {}).takeXianji || 0) >= 1 },
    { id: 'war_master', cat: '争', tier: 'li', name: '杀师', cond: '击杀曾授业于你的 NPC',
      poem: '授业者倒手，终不一呼名。',
      txt: '授业者终倒于手。彼未呼名。',
      test: s => ((s.tally || {}).killMaster || 0) >= 1 },
    { id: 'war_hold', cat: '争', tier: 'zai', name: '十合不倒', cond: '单场撑过 10 回合且获胜',
      poem: '十合两人抖，先坐即认输。',
      txt: '十合。至后两人皆抖，先坐者算输。',
      test: s => ((s.tally || {}).warHold || 0) >= 1 },
    { id: 'war_nopill', cat: '争', tier: 'zai', name: '不假外物', cond: '未用丹药赢下一场越境战',
      poem: '全场未进丹，信气不信药。',
      txt: '全场未进一丹。信气海，不信药。',
      test: s => ((s.tally || {}).overNoPill || 0) >= 1 },
    { id: 'war_zhenjun', cat: '争', tier: 'dian', name: '弑神', cond: '击杀八柱或果位者',
      poem: '杀不需寿者，天亦未表态。',
      txt: '杀一不需寿元之物。其倒时，天未表态。',
      test: s => ((s.tally || {}).godKill || 0) >= 1 },

    /* ---------- 缘 · 人际（10） ---------- */
    { id: 'ren_first', cat: '缘', tier: 'wen', name: '初见', cond: '结识第一个 NPC',
      poem: '客来先启齿，目在别枝头。',
      txt: '彼先开口。已不记己所言，唯记彼当时目在别处。',
      test: s => { let n = 0; const g = s.npcs || {}; for (const k in g) if (g[k] && g[k].met) n++; return n >= 1; } },
    { id: 'ren_zhi', cat: '缘', tier: 'zai', name: '知己', cond: '任一 NPC 好感 ≥ 80',
      poem: '肯当面言惧，难于说信人。',
      txt: '有人肯当面言惧。此比一句「我信你」难得多。',
      test: s => { const g = s.npcs || {}; for (const k in g) if ((g[k] || {}).fav >= 80) return true; return false; } },
    { id: 'ren_daolv', cat: '缘', tier: 'li', name: '道侣', cond: '与一人好感至 100',
      poem: '未行合卺礼，一宵不归府。',
      txt: '未行礼。唯某一夜之后，彼未再归己洞府。',
      test: s => { const g = s.npcs || {}; for (const k in g) if ((g[k] || {}).fav >= 100) return true; return false; } },
    { id: 'ren_tu', cat: '缘', tier: 'zai', name: '收徒', cond: '收第一个弟子',
      poem: '授尔无他语，勿循吾旧途。',
      txt: '教彼第一事非法诀，是「勿学我」。',
      test: s => { const g = s.npcs || {}; for (const k in g) if ((g[k] || {}).disciple) return true; return false; } },
    { id: 'ren_song', cat: '缘', tier: 'zai', name: '送终', cond: '一位好感 ≥ 60 的人老死',
      poem: '代合其眼，手犹温而不动。',
      txt: '代为合眼。手犹温，然不复动。',
      test: s => ((s.tally || {}).npcFuneral || 0) >= 1 },
    { id: 'ren_100y', cat: '缘', tier: 'li', name: '故人', cond: '同一 NPC 相识逾 100 年',
      poem: '百年双鬓白，彼故不曾问。',
      txt: '百年。彼鬓已白，己犹如此。彼从未问其故。',
      test: s => { const g = s.npcs || {}; for (const k in g) if (g[k] && g[k].since != null && (s.turn || 0) - g[k].since >= 1200) return true; return false; } },
    { id: 'ren_talk100', cat: '缘', tier: 'wen', name: '论道百回', cond: '与同一 NPC 论道 100 次',
      poem: '一问翻百遍，彼此未能服。',
      txt: '百回。同一问翻覆百遍，谁亦未服谁。',
      test: s => { const tk = (s.tally || {}).talk || {}; for (const k in tk) if (tk[k] >= 100) return true; return false; } },
    { id: 'ren_enemy', cat: '缘', tier: 'wen', name: '死仇', cond: '与 NPC 好感 ≤ −60',
      poem: '彼见即绕路，路狭两难避。',
      txt: '彼见即绕。己亦欲绕，然路止此宽。',
      test: s => { const g = s.npcs || {}; for (const k in g) if ((g[k] || {}).fav <= -60) return true; return false; } },
    { id: 'ren_hu', cat: '缘', tier: 'li', name: '化敌', cond: '死仇转为好感 ≥ 40',
      poem: '一日彼先颔，两皆作不觉。',
      txt: '一日彼先颔首。两皆装作未觉那一瞬。',
      test: s => ((s.tally || {}).enemyToFriend || 0) >= 1 },
    { id: 'ren_all', cat: '缘', tier: 'zai', name: '满座', cond: '同时 5 人好感 ≥ 60',
      poem: '五人坐满案，忽觉无话可。',
      txt: '五人坐满一桌。忽不知当言何，唯坐。',
      test: s => { let n = 0; const g = s.npcs || {}; for (const k in g) if ((g[k] || {}).fav >= 60) n++; return n >= 5; } },

    /* ---------- 势 · 宗门与家族（10） ---------- */
    { id: 'shi_join', cat: '势', tier: 'wen', name: '入门', cond: '入宗门',
      poem: '立玄景之誓，长词记三字。',
      txt: '立玄景之誓。誓词甚长，唯记末三字：不得叛。',
      test: s => !!s.sect },
    { id: 'shi_zhen', cat: '势', tier: 'zai', name: '真传', cond: '晋升真传',
      poem: '藏经最上层，架上唯四书。',
      txt: '藏经阁最上一层开。登之，架上唯四书。',
      test: s => !!s.sect && (s.sect.rank || 0) >= 3 },
    { id: 'shi_feng', cat: '势', tier: 'li', name: '峰主', cond: '成为峰主 / 长老',
      poem: '一峰归所掌，卅七记十一。',
      txt: '一峰归己。峰上三十七弟子，记得其中十一人之名。',
      test: s => !!s.sect && (s.sect.rank || 0) >= 4 },
    { id: 'shi_found', cat: '势', tier: 'dian', name: '开宗', cond: '自立门户',
      poem: '刻名于山门，刻深恐后磨。',
      txt: '刻名于山门，刻之极深，恐后人磨去。',
      test: s => ((s.tally || {}).foundedSect || 0) >= 1 },
    { id: 'shi_clan', cat: '势', tier: 'zai', name: '立族', cond: '建立家族',
      poem: '祠堂头炷香，此姓始有归。',
      txt: '祠堂第一炷香为己所点。自此此姓有处可归。',
      test: s => !!s.clan },
    { id: 'shi_bigclan', cat: '势', tier: 'li', name: '大族', cond: '家族升至最高级',
      poem: '六千族人里，半识半闻名。',
      txt: '世家。六千族人。行于族中，半识己，半唯闻其名。',
      test: s => !!s.clan && (s.clan.lv || 0) >= 4 },
    { id: 'shi_fame300', cat: '势', tier: 'zai', name: '名动一州', cond: '声望 ≥ 300',
      poem: '茶楼讲其事，错两处不纠。',
      txt: '茶楼有人讲其事。讲错两处，未去正之。',
      test: s => (s.fame || 0) >= 300 },
    { id: 'shi_fame800', cat: '势', tier: 'li', name: '天下知', cond: '声望 ≥ 800',
      poem: '不修者亦知，此非佳事也。',
      txt: '八百。连不修此道者亦知道号。此非佳事。',
      test: s => (s.fame || 0) >= 800 },
    { id: 'shi_leave', cat: '势', tier: 'wen', name: '叛门', cond: '叛出宗门',
      poem: '去时无人拦，此比拦更苦。',
      txt: '去时无人拦。此比有人拦更难受。',
      test: s => ((s.tally || {}).leftSect || 0) >= 1 },
    { id: 'shi_both', cat: '势', tier: 'zai', name: '双身', cond: '同时为真传与族中嫡系',
      poem: '宗唤师弟，族唤少主，两皆应。',
      txt: '宗中师兄唤师弟，族中族老唤少主。两边皆应。',
      test: s => !!s.sect && (s.sect.rank || 0) >= 3 && !!s.clan && s.clan.ident === 'di' },

    /* ---------- 秘 · 探索（7） ---------- */
    { id: 'mi_first', cat: '秘', tier: 'wen', name: '初遇', cond: '首次奇遇',
      poem: '道旁有人食，欲过终复过。',
      txt: '山道旁有人食饼。不知当否往，终往。',
      test: s => ((s.tally || {}).enc || 0) >= 1 },
    { id: 'mi_12', cat: '秘', tier: 'li', name: '十处皆到', cond: '走遍全部十处奇遇',
      poem: '十处皆已到，识石识待人。',
      txt: '十处皆到。渐识每处之石，与每处等人之状。',
      test: s => { const m = (s.tally || {}).encIds || {}; return Object.keys(m).length >= 10; } },
    { id: 'mi_book2', cat: '秘', tier: 'zai', name: '读到技法', cond: '道书读至第二层',
      poem: '同字二遍读，方知书未尽。',
      txt: '同字，二遍读出别物。方知书非一遍可尽。',
      test: s => { const b = s.bookRead || {}; for (const k in b) if ((b[k] || 0) >= 2) return true; return false; } },
    { id: 'mi_book4', cat: '秘', tier: 'dian', name: '读到真意', cond: '道书读至第四层',
      poem: '末页前人批，识三字手抖。',
      txt: '末页有前人批注。认出那三字里手之一抖。',
      test: s => { const b = s.bookRead || {}; for (const k in b) if ((b[k] || 0) >= 4) return true; return false; } },
    { id: 'mi_gate', cat: '秘', tier: 'zai', name: '过界', cond: '首次入洞天',
      poem: '门开彼无风，却有香灰气。',
      txt: '门开。彼处无风，却有香灰之气。抬脚时迟疑一瞬。',
      test: s => ((s.tally || {}).gate || 0) >= 1 },
    { id: 'mi_9zhou', cat: '秘', tier: 'li', name: '走遍五域', cond: '青岳之外四处也全到过',
      poem: '五域行方觉，气浓人迹稀。',
      txt: '五域皆行。方知灵气最浓处，人最少。',
      test: s => { const m = (s.tally || {}).places || {}; return Object.keys(m).length >= 5; } },
    { id: 'mi_relic', cat: '秘', tier: 'zai', name: '遗迹', cond: '首次发现上古遗迹',
      poem: '断墙字古道，立至日西沉。',
      txt: '断墙之字，比当今道典更早。立于彼处至天黑。',
      test: s => ((s.tally || {}).relic || 0) >= 1 },

    /* ---------- 过格（18）· 墓志铭的另一半 ---------- */
    { id: 'guo_first', cat: '过', tier: 'wen', name: '初次陨落', cond: '首次身死',
      poem: '到死方知，此处之死为真。',
      txt: '初死。至死方知，此处之死为真。',
      test: s => ((s.tally || {}).deaths || 0) >= 1 },
    { id: 'guo_same', cat: '过', tier: 'zai', name: '同阶而死', cond: '被同位格者杀死',
      poem: '等高者杀之，无奇唯手快。',
      txt: '同阶者杀己。无奇迹，无意外，唯彼手快。',
      test: s => ((s.tally || {}).deathBySame || 0) >= 1 },
    { id: 'guo_crush', cat: '过', tier: 'zai', name: '不知深浅', cond: '胜算 < 0.4 仍强行开战并死',
      poem: '知不可敌而斗，非勇乃不甘。',
      txt: '知不可敌，仍动手。非勇，是不甘。',
      test: s => ((s.tally || {}).deathCrush || 0) >= 1 },
    { id: 'guo_hunger', cat: '过', tier: 'zai', name: '一文钱', cond: '灵石为 0 连续 3 月',
      poem: '囊中无一石，饮凉三月。',
      txt: '囊中无一灵石，连三月，以凉水度之。',
      test: s => ((s.tally || {}).stones0 || 0) >= 3 },
    { id: 'guo_sit', cat: '过', tier: 'wen', name: '蒲团', cond: '寿元耗尽坐化',
      poem: '坐至风吹袍干，无人收骨。',
      txt: '坐于蒲团，至风把道袍吹干。无人收尸。',
      test: s => ((s.tally || {}).deathSit || 0) >= 1 },
    { id: 'guo_daohua', cat: '过', tier: 'li', name: '忘了自己', cond: '失锚道化',
      poem: '意散作山雾，犹在已非人。',
      txt: '意识散作山雾。犹在，然不复为己。',
      test: s => ((s.tally || {}).deathDaohua || 0) >= 1 },
    { id: 'guo_miao', cat: '过', tier: 'wen', name: '庙破', cond: '庙被砸 / 夺祀失败',
      poem: '墙塌一角，塑像裂自左眼。',
      txt: '庙墙塌一角。塑像自左眼至下巴裂一缝。',
      test: s => !!s.templeBroken || ((s.tally || {}).templeBroken || 0) >= 1 },
    { id: 'guo_karma300', cat: '过', tier: 'li', name: '业力缠身', cond: '业力 ≥ 300',
      poem: '三百，味自闻，小儿不敢哭。',
      txt: '三百。身有气味，己亦闻之。小儿见之不敢哭。',
      test: s => (s.karma || 0) >= 300 },
    { id: 'guo_fanren', cat: '过', tier: 'zai', name: '手上有人血', cond: '单次杀凡人 ≥ 10',
      poem: '十人皆非修士，数时手不抖。',
      txt: '十人，无一修士。数时手不抖。',
      test: s => ((s.tally || {}).killMortals || 0) >= 10 },
    { id: 'guo_xueji', cat: '过', tier: 'dian', name: '血祭', cond: '献 99 绝材开血祭',
      poem: '九十九物陈地，血渗三层土。',
      txt: '九十九物铺地。血渗至第三层土。闻底下有物应。',
      test: s => ((s.tally || {}).bloodRite || 0) >= 1 },
    { id: 'guo_reinc', cat: '过', tier: 'li', name: '烧尽', cond: '百世书页数用尽',
      poem: '末页亦焚，来世无物可带。',
      txt: '末页亦焚。来世无所带，包括所应之事。',
      test: s => s.pages === 0 && !!s.tally },
    { id: 'guo_yi', cat: '过', tier: 'zai', name: '走火', cond: '心魔失控两次',
      poem: '气逆行，闻己语而不欲言。',
      txt: '气逆经行。闻己在言，然不欲言那些。',
      test: s => ((s.tally || {}).heartBreak || 0) >= 2 },
    { id: 'guo_pill3', cat: '过', tier: 'wen', name: '药石无灵', cond: '连续 3 月靠丹药续命',
      poem: '三月方知，非疗疾乃买时。',
      txt: '第三月方知：非在治病，是以灵石买时。',
      test: s => ((s.tally || {}).pillStreak || 0) >= 3 },
    { id: 'guo_zifu', cat: '过', tier: 'zai', name: '三关俱失', cond: '紫府幻想关渡败（修为全散）',
      poem: '幻中已登仙，醒时修为尽。',
      txt: '幻中见己成仙。醒时修为尽散——那一下最痛。',
      test: s => ((s.tally || {}).zifuFail || 0) >= 1 },
    { id: 'guo_lu', cat: '过', tier: 'zai', name: '换箓', cond: '换箓（献出一条本命权柄）',
      poem: '新箓相认，旧箓识其少何。',
      txt: '新箓认己，旧箓却识其所少。',
      test: s => (s.luHistory || []).length >= 2 },
    { id: 'guo_quan', cat: '过', tier: 'li', name: '权柄尽失', cond: '本命权柄全被夺',
      poem: '权柄一无余，庙在而无事。',
      txt: '一条权柄亦无。庙犹在，然不再有事发生。',
      test: s => ((s.tally || {}).quanbingLost || 0) >= 1 },
    { id: 'guo_lonely', cat: '过', tier: 'li', name: '无人送终', cond: '死时无一人好感 ≥ 40',
      poem: '无人哭此，香自他人手中。',
      txt: '死时无人哭。庙中那炷香犹燃，他人所点。',
      test: s => ((s.tally || {}).deathLonely || 0) >= 1 },
    { id: 'guo_never', cat: '过', tier: 'wen', name: '一生未战', cond: '300 回合未进行任何战斗',
      poem: '刀未出鞘，亦是活法一种。',
      txt: '一次未战。非不能，是不必——非讥，是一种活法。',
      test: s => (s.turn || 0) >= 300 && ((s.tally || {}).warFight || 0) === 0 },

    /* ---------- 隐格（15）· 条件一律显示「？」 ---------- */
    { id: 'ach_edge', cat: '隐', tier: 'wen', hidden: true, name: '命悬一线', cond: '寿元余 1 年内突破成功',
      poem: '数日之月，竟成。',
      txt: '数日度月，竟成。',
      test: s => ((s.tally || {}).edgeBreak || 0) >= 1 },
    { id: 'ach_zero', cat: '隐', tier: 'wen', hidden: true, name: '空囊', cond: '灵石恰为 0 时买下一样东西',
      poem: '末石置柜上，恰够。',
      txt: '最后一块灵石置于柜台，恰够。',
      test: s => ((s.tally || {}).buyAtZero || 0) >= 1 },
    { id: 'ach_tu', cat: '隐', tier: 'wen', hidden: true, name: '逆徒', cond: '收一个好感 ≤ −40 的人为徒',
      poem: '彼恨之，亦知其恨。',
      txt: '彼恨己。己亦知彼恨己。',
      test: s => ((s.tally || {}).badDisciple || 0) >= 1 },
    { id: 'ach_both1', cat: '隐', tier: 'wen', hidden: true, name: '一日两事', cond: '同一月内既救人又杀人',
      poem: '此月救一人，亦埋一人。',
      txt: '此月救一人，亦埋一人。',
      test: s => ((s.tally || {}).saveAndKill || 0) >= 1 },
    { id: 'ach_dt', cat: '隐', tier: 'wen', hidden: true, name: '宿在洞天', cond: '跨月时人仍在洞天',
      poem: '彼宿一夜，此庙空一夜。',
      txt: '宿彼处一夜。这边庙，空一夜。',
      test: s => ((s.tally || {}).dongtianMonth || 0) >= 1 },
    { id: 'ach_name', cat: '隐', tier: 'wen', hidden: true, name: '僭越', cond: '庙号与某位真君同名',
      poem: '跪于庙前，口呼他人名。',
      txt: '有人跪于庙前，所呼是他人之名。',
      test: s => ((s.tally || {}).nameBorrow || 0) >= 1 },
    { id: 'ach_pure', cat: '隐', tier: 'tian', hidden: true, name: '一字不改', cond: '300 回合以上，全程未读档、未烧页',
      poem: '此生未回头，身后故无路。',
      txt: '此生未曾回头一步。',
      test: s => (s.turn || 0) >= 300 && ((s.tally || {}).cheated || 0) === 0 },
    { id: 'ach_white', cat: '隐', tier: 'wen', hidden: true, name: '白头', cond: '同一人从初见走到老死，你从未破境',
      poem: '始终是彼所识之人。',
      txt: '始终为彼所识之人。',
      test: s => ((s.tally || {}).npcFuneralSameRealm || 0) >= 1 },
    { id: 'ach_nopill', cat: '隐', tier: 'wen', hidden: true, name: '全无', cond: '一局内从未用任何丹药（≥100 回合）',
      poem: '一粒未进，唯此气耳。',
      txt: '一丹未进。信己气海，不信丹。',
      test: s => (s.turn || 0) >= 100 && !!s.tally && ((s.tally || {}).pillUsed || 0) === 0 },
    { id: 'ach_survive', cat: '隐', tier: 'wen', hidden: true, name: '借来的命', cond: '崩解期撑过 3 月且未道化',
      poem: '数至九十日，犹在。',
      txt: '数至第九十日，犹在。',
      test: s => ((s.tally || {}).collapseSurvive || 0) >= 1 },
    { id: 'ach_king3', cat: '隐', tier: 'wen', hidden: true, name: '屠龙者', cond: '击杀妖王 ≥ 3',
      poem: '山中物始绕道行。',
      txt: '山中之物始绕道。',
      test: s => ((s.tally || {}).kingKill || 0) >= 3 },
    { id: 'ach_empty', cat: '隐', tier: 'wen', hidden: true, name: '无字碑', cond: '死时年谱不足 10 条',
      poem: '人不知其所为，亦无遗言。',
      txt: '人不知其所为。亦未留话。',
      test: s => ((s.tally || {}).deathEmpty || 0) >= 1 },
    { id: 'ach_reverse', cat: '隐', tier: 'wen', hidden: true, name: '反向', cond: '从「绝境」档反杀成功',
      poem: '彼算错一事：本不图活。',
      txt: '彼算错一事：己本未图活。',
      test: s => ((s.tally || {}).reverseWin || 0) >= 1 },
    { id: 'ach_old', cat: '隐', tier: 'wen', hidden: true, name: '旧账', cond: '击杀 20 年前结仇的 NPC',
      poem: '彼已忘之，此心未忘。',
      txt: '彼忘之。己未忘。',
      test: s => ((s.tally || {}).oldGrudge || 0) >= 1 },
    { id: 'ach_1gf', cat: '隐', tier: 'wen', hidden: true, name: '一炁', cond: '从未换过功法，一路修到金丹',
      poem: '一册黄阶，读尽此生。',
      txt: '一册黄阶，读尽此生。',
      test: s => (s.xRealm || 0) >= 4 && (s.gongfa || [])[0] === 'juqi' && ((s.tally || {}).gfChanged || 0) === 0 }
  ];

  /* 前世残忆：由「入典」及「天书」成就解锁，每局只能带 1 项。
     给的是「信息」，不是「力量」——知道秘境在哪，不等于打得过秘境。 */
  const ACH_MEMORY = [
    { from: 'dao_daotai',   id: 'm_light', name: '记得一线天光',   eff: '开局洞府灵气 +1 档' },
    { from: 'mi_book4',     id: 'm_word',  name: '记得一句真意',   eff: '开局悟性 +2' },
    { from: 'art_9',        id: 'm_fire',  name: '记得火候',       eff: '开局选定一艺直入三品' },
    { from: 'shen_8',       id: 'm_xiang', name: '记得香火的味道', eff: '立庙时初始信众 +50' },
    { from: 'war_over',     id: 'm_hand',  name: '记得那一手',     eff: '开局气血上限 +20' },
    { from: 'shi_feng',     id: 'm_gate',  name: '记得山门的方位', eff: '开局声望 +30' },
    { from: 'dao_guowei',   id: 'm_wei',   name: '记得位格的重量', eff: '开局灵石 +500' },
    { from: 'shen_qian',    id: 'm_qian',  name: '记得怎么求人',   eff: '传教所得信众 +10%' },
    { id: 'm_sha', from: 'war_king', name: '记得它怎么死的', eff: '对高境敌人首击伤害 +20%（一次性）' },
    { from: 'guo_karma300', id: 'm_xue',   name: '记得血的味道',   eff: '开局功德 +30、业力 +20' }
  ];



  /* ====== 恩义·钩子（v6.7）======
     设定铁律：恩的纯度与施恩者的境界成反比。
       樵夫的半块饼是真的（他没能力布局）；化神老怪给的天阶功法基本是钩子。
     每条钩子四字段：given（恩）/ due（期）/ claim（索）/ refuse（拒）。
     「期」是灵魂——设在三十年后、破境成功那一夜、证位动不了那一刻。 */
  const HOOK_DEBUFF = [
    { id: 'karma_tangle', name: '因果缠身',
      sign: '夜里总觉得有人在数你的呼吸',
      eff: '破境 −8%　历练遇人 +30%' },
    { id: 'debt_weight', name: '人情压身',
      sign: '你开始记不清自己欠了谁',
      eff: '道心 −1/年　好感增速 −30%' },
    { id: 'borrowed_luck', name: '借来的运',
      sign: '气海里有一缕不属你的气，很听话',
      eff: '修炼 +20%　破境 15% 走火' },
    { id: 'marked_rich', name: '被人惦记',
      sign: '走过坊市时，有三道目光跟着你',
      eff: '遇袭 +50%　来者战力 +15%' },
    { id: 'soul_lien', name: '神魂暗契',
      sign: '有人在叫你的名字，用的不是你的道号',
      eff: '每月 10% 被窥视　不可在洞天过夜' }
  ];

  const HOOKS = [
    { id: 'hook_umbrella', from: '柳姓散修', fromRank: 3, given: '地阶功法一册',
      hint: '伞面上的墨迹干得太快了，像是昨夜才写的',
      known: true, due: { kind: 'realm', at: 4 },
      claim: { text: '「那半篇法诀，你练到第几层了？」他笑着问，手按在你丹田的位置。',
        want: '你三成修为',
        effect: { xiuweiPct: -0.3 },
        refuse: { karma: 30, hpPct: -0.5, debuff: 'soul_lien' } } },

    { id: 'hook_sword', from: '无名（雪中留剑）', fromRank: 4, given: '天阶剑意',
      hint: '剑柄上缠的布是新的，却没有落雪',
      known: true, due: { kind: 'kill', at: 3 },
      claim: { text: '剑忽然自己响了。你听见一个声音说：「该了的事了。」',
        want: '代杀一人',
        effect: { karma: 25 },
        refuse: { karma: 20, hpPct: -0.4, debuff: 'borrowed_luck' } } },

    { id: 'hook_voice', from: '洞天深处的念诵声', fromRank: 5, given: '天阶功法',
      hint: '你跟着念的时候，听见自己的声音慢了半拍',
      known: false, due: { kind: 'realm', at: 5 },
      claim: { text: '你在镜子里看见自己的脸，正在笑——而你并没有笑。',
        want: '汝之身',
        effect: { die: '道化：那缕声音念完了最后一句，用的是你的嗓子。' },
        refuse: { karma: 0, hpPct: -0.7, debuff: 'soul_lien' } } },

    { id: 'hook_tablet', from: '残碑下的那个人', fromRank: 3, given: '地阶功法',
      hint: '碑上的字是新的，切口还很利',
      known: false, due: { kind: 'year', at: 30 },
      claim: { text: '碑底传来敲击声。很轻，很有耐心。',
        want: '你的寿元（两成）',
        effect: { lifePct: -0.2 },
        refuse: { karma: 25, hpPct: -0.3, debuff: 'karma_tangle' } } },

    { id: 'hook_pill', from: '路过的丹师', fromRank: 2, given: '一颗救命丹',
      hint: '丹上有极细的一道金线，不像药，像针',
      known: true, due: { kind: 'weak' },
      claim: { text: '他在你最虚弱的那个夜里推门进来：「该取利息了。」',
        want: '一滴心头血',
        effect: { hpPct: -0.5, merit: -10 },
        refuse: { karma: 15, hpPct: -0.6, debuff: 'borrowed_luck' } } },

    { id: 'hook_sect_feed', from: '宗门', fromRank: 4, given: '丹药·功法·庇护',
      hint: '长老们对你太好了，好得不像对弟子',
      known: false, due: { kind: 'guowei' },
      claim: { text: '掌门亲自来了，身后站着四位长老。「宗门的果位，该还给宗门了。」',
        want: '你的果位',
        effect: { takeGuowei: true },
        refuse: { karma: 40, hpPct: -0.4, debuff: 'karma_tangle' } } },

    { id: 'hook_clan_raise', from: '族老会', fromRank: 3, given: '族运倾斜',
      hint: '祠堂给你单开了一炉香',
      known: true, due: { kind: 'realm', at: 3 },
      claim: { text: '族老把族谱摊开，指着空着的那一页。',
        want: '承汝道统之后',
        effect: { lifePct: -0.1, merit: 20 },
        refuse: { karma: 10, hpPct: -0.2, debuff: 'debt_weight' } } },

    { id: 'hook_dowry', from: '联姻之家', fromRank: 3, given: '资源与人情',
      hint: '送来的礼单上，写的是「聘」不是「贺」',
      known: true, due: { kind: 'year', at: 10 },
      claim: { text: '媒人带着庚帖上门，笑得比十年前还热络。',
        want: '履行婚约',
        effect: { fame: 60 },
        refuse: { karma: 20, hpPct: -0.2, debuff: 'debt_weight' } } },

    /* ====== 2026-11-20 素材增补：四条钩子（据《小说素材改编库》§3.1、§7.4、§8.1~8.2）======
       三条暗钩各应一处奇遇，一条明钩应「债主·索恩人」。
       铁律照旧：恩的纯度与施恩者的境界成反比——石液照出的旧债、被吹灭的灯、
       画反了的符，都不是真恩，全是线头。 */
    { id: 'hook_old_debt', from: '银中带金的那一缕', fromRank: 2, given: '一处旧债的方位',
      hint: '石液照出的那缕金光，越近越暗',
      known: false, due: { kind: 'year', at: 8 },
      claim: { text: '「旧债约期到了。」门外那人叫得出你的名字，你却不认得他。',
        want: '替他了结一笔旧账',
        effect: { karma: 10, fame: -20 },
        refuse: { karma: 30, hpPct: -0.3, debuff: 'karma_tangle' } } },

    { id: 'hook_lamp_out', from: '那盏被吹灭的灯', fromRank: 3, given: '一个死人的余荫',
      hint: '你吹灯那一夜，远处有人笑了',
      known: false, due: { kind: 'kill', at: 3 },
      claim: { text: '有人在你门前放了一盏新灯。灯芯是新的，油是旧的。',
        want: '替他把没烧完的烧完',
        effect: { lifePct: -0.15 },
        refuse: { karma: 25, hpPct: -0.35, debuff: 'borrowed_luck' } } },

    { id: 'hook_false_register', from: '画反了的那张符', fromRank: 2, given: '一句「你也没真懂」',
      hint: '符灰是黑的，你没扫',
      known: false, due: { kind: 'realm', at: 3 },
      claim: { text: '你在一卷道门名籍上看见自己的名字。墨迹是新的，你从未受过箓。',
        want: '一份你没受过的箓',
        effect: { karma: 12, merit: -15 },
        refuse: { karma: 20, hpPct: -0.25, debuff: 'karma_tangle' } } },

    { id: 'hook_grace', from: '债主（不言其名）', fromRank: 3, given: '一次不该有的援手',
      hint: '他救你时，手上没有兵器',
      known: true, due: { kind: 'year', at: 6 },
      claim: { text: '「我救过你一次。如今轮到你了。」他站在门外，没带兵器，也没带人。',
        want: '一件他此刻说不出的事',
        effect: { karma: 5, merit: -10 },
        refuse: { karma: 25, hpPct: -0.3, debuff: 'debt_weight' } } }
  ];

  /* ====== v8.0 神道神器 / 愿物 / 家族产业 / 新手引导 ====== */
  const DIVINE_ARTIFACTS = [
    { id: 'staff', name: '摄心神杖', price: 1200, max: 3, upkeep: 60,
      eff: '显圣所得信众每级 +20%', desc: '杖头悬一枚旧铃，响时只让愿听的人听见。' },
    { id: 'mirror', name: '照愿法镜', price: 1800, max: 3, upkeep: 80,
      eff: '显圣香火消耗每级 −8%，并照见来访者来意', desc: '镜面不照人，只照人跪在蒲团上时想的那件事。' },
    { id: 'seal', name: '牧土神印', price: 2600, max: 3, upkeep: 110,
      eff: '香火上限每级 +15%，权柄斗法每级 +12%', desc: '印面刻山川河道，落印之处，便是你要担的责。' }
  ];
  const VOTIVE_ITEMS = [
    { id: 'xiangHui', name: '净香灰', price: 8, out: 3, stones: 5, xianghuo: 20, mats: {},
      eff: '平安符的底料，也可直接卖给香客', desc: '取晨课时第一炉冷灰，筛去木骨。' },
    { id: 'fuShui', name: '清净符水', price: 24, out: 2, stones: 12, xianghuo: 40, mats: {},
      eff: '香客求去小病小灾；每卖一份另积功德 1', desc: '符纸化在水中，澄清三次，只留一点淡金。' },
    { id: 'pingAn', name: '平安符', price: 42, out: 2, stones: 18, xianghuo: 55, mats: { xiangHui: 1 },
      eff: '香客最常求的小物，不沾染黑市业力', desc: '不写真君全号，只写一个「安」字，免得凡人受不住。' }
  ];
  const CLAN_INDUSTRIES = [
    { id: 'farm', name: '药圃', eff: '每 40 人每月产蓝幽草 1，守旧族老增产两成' },
    { id: 'work', name: '帮工', eff: '每人月产灵石 1，并为四艺提供助力' },
    { id: 'trade', name: '跑商', eff: '每人月产灵石 2，贪利族老增产五成，但可能损族运' },
    { id: 'study', name: '修行', eff: '每 20 人每月为家族后辈积累悟道 1' }
  ];
  const TUTORIAL_STEPS = [
    { id: 'cultivate', name: '先活过第一年',
      text: '一月三旬，每旬只够做一件事。A 打坐推进一旬，得三分之一个月的修为；修为满后，B 会变成破境。做事就少修行，这是这一局里最要紧的账。' },
    { id: 'goal', name: '看清下一步', text: '境界条下的「道途」会告诉你当前目标和奖励。点开可看完整路线。' },
    { id: 'craft', name: '让资源转起来', text: '坊市买材料，四艺做丹符，再到坊市「卖出」。炼一炉丹要占一旬，别在修为将满时开炉。' },
    { id: 'save', name: '给自己留退路', text: '系统里有五个存档位和 JSON 导出。浏览器清缓存前，请先导出文件。' }
  ];

  /* ============================================================
     v8.0 自由行动意图表（文字修仙的核心）
     ------------------------------------------------------------
     旧版「自由输入」只有 6 个正则分支，其余全部掉进
     「做了一月，没落下什么」——玩家写什么都是同一句话，
     等于告诉他「你的字没用」。
     这里把常见行为拆成 30 类意图，每类给 3~4 种结果：
       · w    权重（同一意图内的概率分布）
       · eff  实际影响（修为/材料/好感/业力…）
       · text 正文（一句到三句，写具体细节，不写总结）
       · minT 最低阶（胎息0 练气1 筑基2 紫府3 金丹4），让高境界读到不同的字
     写法上守三条：
       1) 只写看得见听得见的东西，不写「你感到很充实」这类旁白结论
       2) 每个结果都要有代价或落空，不能全是好事
       3) 境界变了，同一件事的感受就要变——这是修仙文的「质变」
     ============================================================ */
  const INTENTS = [
    /* ---------- 修行 ---------- */
    { id: 'meditate', name: '打坐', keys: ['打坐', '采气', '吐纳', '入定', '静坐', '调息', '运功', '炼气', '行功'], soft: ['坐', '息'], outs: [ { w: 3, eff: { xiuweiMul: 1.0 }, text: '气自鼻端入，凉。过三寸便分不清，是血在行，抑或山气在行。睁眼时香已过半，窗外有鸟，不知其叫了几时。' }, { w: 2, eff: { xiuweiMul: 1.1, heart: 1 }, text: '坐至第二炷香，忽闻自己心跳。一下，一下，似有人在极远处叩门。数至第七下，声散矣。' }, { w: 1, eff: { xiuweiMul: 0.6, heart: -1 }, text: '今日心浮。数息至四十即断，从头再数，复断。三度断时遂不复数，但坐视香灰寸长。' }, { minT: 4, w: 2, eff: { xiuweiMul: 1.35 }, text: '入定后身如空坛，天地之气自灌。你不敢动，恐一动即满。坛满何如，无人说过。' } ] },
    { id: 'seclusion', name: '闭关', keys: ['闭关', '死关', '长闭关', '闭死关'], soft: ['闭'], outs: [ { w: 3, eff: { xiuweiMul: 3.2, hpPct: -0.15 }, text: '封洞口，只留一线通气。前三日最难，第七日以后便不知日子。出关那日剃须，刀钝三次。' }, { w: 2, eff: { xiuweiMul: 2.2, heart: -1, hpPct: -0.1 }, text: '闭至第二月，气走岔一回。黑暗里坐了整夜方捋顺，后背尽湿，天明才知自己一直在抖。' }, { w: 1, eff: { xiuweiMul: 0.8, heart: -2 }, text: '闭得太急，入了岔路。醒来时天已换两季，修为未动多少。石壁上尽是抓痕，深处嵌着指甲。' }, { w: 2, eff: { xiuweiMul: 2.6, insight: 1 }, text: '洞中无昼夜，只数呼吸。数至十万，忽分不清是你在呼吸，还是洞在呼吸。' } ] },
    { id: 'practice', name: '练功', keys: ['练剑', '试剑', '磨剑', '练功', '演练', '修习', '练刀', '打拳', '练拳', '演武'], soft: ['剑', '刀', '拳', '功'], outs: [ { w: 3, eff: { xiuweiMul: 0.7, sense: 1 }, text: '一招劈三百遍。前百遍尚问对否，后二百遍手自运。收势时臂酸难举，心中却静。' }, { w: 2, eff: { xiuweiMul: 0.5, insight: 1 }, text: '剑尖点石七下，七点连成一弧。你盯着看了许久，忽明师父当年为何只教这一招：他也只会这一招。' }, { w: 1, eff: { hpPct: -0.08, xiuweiMul: 0.4 }, text: '收势太急，气未归位，喉头一甜。扶树立了片刻，把血咽回去。地上那口血，用脚蹭进土里。' }, { minT: 2, w: 2, eff: { xiuweiMul: 0.9, sense: 1 }, text: '剑意出三丈即散。你知该到五丈，身却记不住那个分寸。练至天黑，散九次，第十次近了半尺。' } ] },

    /* ---------- 采集与行走 ---------- */
    { id: 'gatherHerb', name: '采药', keys: ['采药', '采草', '寻药', '挖药', '摘药', '采芝', '找草药'], soft: ['药', '草'], outs: [ { w: 3, eff: { mat: ['lanyouCao', 1] }, text: '崖下湿滑。掐一株三年生，根须完整，抖去土，以布裹好塞进囊中。指甲缝里留一道草汁的青。' }, { w: 2, eff: { mat: ['lanyouCao', 1] }, text: '背阴石缝里有一小丛，叶背发紫。年份不足。摘一半，留一半，留的那半明年还长。' }, { w: 1, eff: { hp: -8 }, text: '转半日只得几株寻常野草。归途脚下一滑，膝头磕破，坐在石上掀开裤腿，血已把布浸透。' }, { minT: 3, w: 2, eff: { mat: ['lanyouCao', 2] }, text: '已不必蹲身去找。立于崖上，哪片叶子含着灵气，一眼可见。看中哪株，那株也知自己要被人采。' } ] },
    { id: 'gatherOre', name: '采矿', keys: ['挖矿', '采矿', '寻矿', '采石', '砍柴', '挖玉', '采铁'], soft: ['矿', '石', '柴'], outs: [ { w: 3, eff: { mat: ['tieMu', 1] }, text: '矿脉露头只巴掌大。敲半个时辰，得一小块，断面有细密银星。手震得发麻，虎口裂开一道。' }, { w: 2, eff: { stones: 40 }, text: '未得正经矿，倒捡了几块品相尚可的碎石。背到镇上，收石的老者掂了掂，给了些灵石，未还价。' }, { w: 1, eff: { hp: -12, xiuweiMul: 0.3 }, text: '洞顶塌了一角。滚出来时满身是灰，肩被砸青。躺在洞口喘了半日，才想起囊中之物还在不在。' }, { w: 2, eff: { hp: -5, xiuweiMul: 0.2 }, text: '挖到底，一层青灰岩。锤下只留一个白点，换三个角度皆然。这层岩底下有何物，你不知。' } ] },
    { id: 'hunt', name: '猎妖', keys: ['猎妖', '杀妖', '除妖', '打猎', '寻妖', '狩猎', '捕兽'], soft: ['猎', '妖', '兽'], outs: [ { w: 3, eff: { stones: 120, mat: ['mudanYao', 1], fame: 3 }, text: '一只三尾山狐被堵在石缝。杀它只用两剑，剥皮却费小半个时辰。皮子完整，摊开有一人长。' }, { w: 2, eff: { hpPct: -0.25, stones: 60 }, text: '遇一头成形的黑獾，力气比预想的大。压住它时手臂被撕开一道深口。它死时仍在挣。' }, { w: 1, eff: { hpPct: -0.08, karma: 2, xiuweiMul: 0.3 }, text: '跟了三日，才觉那不是妖，是个在山中迷路的樵夫。收剑，他跪着磕头。你未扶，转身去了。' }, { minT: 3, w: 2, eff: { stones: 200, mat: ['mudanYao', 1] }, text: '不必追。伸手一引，林中鸟尽飞，它自草里出来。此等手段用久了，便觉无味。' } ] },
    { id: 'travel', name: '远行', keys: ['游历', '远行', '下山', '出门', '走走', '游山', '赶路', '云游'], soft: ['游', '走', '路'], outs: [ { w: 3, eff: { xiuweiMul: 0.4, insight: 1 }, text: '行四十里，见一条无名之河。河上有老者补网，网破三处，补了大半日。问他此河通向何处，他说不知。' }, { w: 2, eff: { stones: 30, fame: 2 }, text: '路过小集，替人看了一场病。人家硬塞一包干粮与几块碎灵石。干粮硬，硌牙，你还是吃完。' }, { w: 1, eff: { hpPct: -0.15, xiuweiMul: 0.3 }, text: '走错路，绕进一片沼地。鞋陷泥中拔不出，最后光着一只脚走了半日。脚底划破，不知被何物所划。' }, { w: 2, eff: { insight: 1 }, text: '路上遇一队赶车的，跟了两日。他们说话你听不懂，却学会他们歇脚时先喂牲口、后自己饮水。' } ] },

    /* ---------- 人 ---------- */
    { id: 'visit', name: '探望', keys: ['拜访', '探望', '去看', '寻访', '求见', '登门'], soft: ['访', '找'], outs: [ { w: 3, eff: { fav: 5 }, text: '门未关。她正筛药，头也未抬，只说一个「坐」字。你坐了一下午，一句话未说。将行，始问：伤瘳否。' }, { w: 2, eff: { fav: 3, stones: -20 }, text: '提两斤酒上门。他接了酒，却先问你身上之伤从何而来。汝称不小心，彼微哂，不复问。' }, { w: 1, eff: { fav: -2 }, text: '等了半日，人未见到。门房说主人出门了，可你分明看见窗里有灯，灯下人影动了一动。' }, { w: 2, eff: { fav: 4, insight: 1 }, text: '去时他正劈柴。你接过斧子劈了半垛，手上茧磨破了。他递一碗水，说：你从前不做这个。' } ] },
    { id: 'discuss', name: '论道', keys: ['论道', '请教', '问道', '求教', '辩论', '辩法'], soft: ['论', '问'], outs: [ { w: 3, eff: { fav: 4, insight: 1 }, text: '你问筑基之后气当往何处走。他想许久，说：你先把筑基之前走完，再来问。此话听似推托，实是实话。' }, { w: 2, eff: { fav: 6, insight: 1 }, text: '说到第三炷香，两人皆不再言。有些话说到尽头便是如此，不是谁说服了谁，是说倦了。' }, { w: 1, eff: { fav: -3, heart: -1 }, text: '言过其实。彼微哂，不复读。归途上始想起错在何处，想通亦不欲返而言。' }, { w: 2, eff: { insight: 2 }, text: '彼述一故事，讲竟问曰：解否。曰解。彼曰：吾再述一遍。第二遍既竟，始知己实未解。' } ] },

    /* ---------- 闲事 ---------- */
    { id: 'drink', name: '饮酒', keys: ['喝酒', '饮酒', '买醉', '独酌', '小酌', '喝一杯'], soft: ['酒'], outs: [ { w: 3, eff: { heart: 1, stones: -10 }, text: '酒是酸的，不算好。你还是喝完，因为杯子是旁人留下的。杯沿有一道缺口，你喝时正好绕开。' }, { w: 2, eff: { heart: 2, xiuweiMul: 0.3, stones: -20 }, text: '饮至第三杯，忽想起许久以前一件小事。想完又觉没什么可想的，再倒一杯。' }, { w: 1, eff: { heart: -1, hp: -5, stones: -30 }, text: '醉了一场。醒来躺在门口，身上少了半袋灵石，谁拿的不知。首痛甚，痛极反笑。' }, { w: 2, eff: { heart: 1 }, text: '独饮至半夜。店家要打烊，来问要不要收。你说再坐一会儿。他便把灯留了一半，自去睡了。' } ] },
    { id: 'read', name: '读书', keys: ['读书', '看书', '翻阅', '研读', '读经', '温书'], soft: ['书', '卷'], outs: [ { w: 3, eff: { insight: 1 }, text: '纸上讲「气行如织」。你读二十遍，忽想起幼时看母亲织布的样子：线是断的，接起来才成布。' }, { w: 2, eff: { insight: 1, xiuweiMul: 0.4 }, text: '书里有一页被人撕去。你猜了许久撕去的是什么，猜不出，反把前面几页记住了。' }, { w: 1, eff: { insightXp: 6 }, text: '读到眼涩，抬头才知天黑。今日读了什么，一时竟想不起，只记得页边有一处批注，字拙。' }, { minT: 3, w: 2, eff: { insight: 2 }, text: '书上的字你早认全了，今日这一句却忽然不同。不是字变了，是你站到了能读懂它的地方。' } ] },
    { id: 'fish', name: '垂钓', keys: ['钓鱼', '垂钓', '溪边', '下钩'], soft: ['钓', '鱼'], outs: [ { w: 3, eff: { heart: 1 }, text: '一日无鱼咬钩。你也不急，收竿，把饵给了岸边的野狗。嗅之，不食，伏足而寐。' }, { w: 2, eff: { heart: 1, merit: 2 }, text: '钓上一条，太小，又放了。它在水里打了个转，没走。你看了一会儿，收竿归去。' }, { w: 1, eff: { heart: 2, insight: 1 }, text: '浮子动了一下便无动静。你忽明白，它不是来吃饵，是在看你的影子。影子落在水面，比人还长。' }, { w: 2, eff: { heart: 1, hp: -3 }, text: '钓得一条半斤的，鳞是青的。你不舍得放，也不舍得杀，用竹篓养着带回。第二日它死了，你还是煮了汤。' } ] },
    { id: 'chess', name: '下棋', keys: ['下棋', '对弈', '棋'], soft: ['棋', '弈'], outs: [ { w: 3, eff: { insight: 1 }, text: '输七目。收官时他指着棋盘一处说：你早看见了，只是舍不得。' }, { w: 2, eff: { insight: 1, heart: 1 }, text: '至中盘，两人皆停。盘上那条大龙，谁也不敢先动。末了是他先伸手，把子收了。' }, { w: 1, eff: { heart: -1 }, text: '棋未下完。对局者被人叫走，棋留在石桌上，黑白子被山风吹乱两处。你未去摆正。' }, { w: 2, eff: { insight: 2, heart: -1 }, text: '让三子仍是输。他一边收子一边说：你下得太急。急不是坏事，急了便看不见旁人在等什么。' } ] },
    { id: 'scenery', name: '看景', keys: ['看雪', '观星', '赏月', '看云', '看海', '听雨', '赏花', '看日出', '听风'], soft: ['雪', '月', '星', '云', '雨', '花', '海'], outs: [ { w: 3, eff: { heart: 1 }, text: '云自西来，一层压一层。你一直站到它把整座山罩住，才想起该收衣裳。' }, { w: 2, eff: { heart: 2, insight: 1 }, text: '星子极密。数至一百七十余便不数了，总有新的在暗处亮起，数不完。' }, { w: 1, eff: { heart: 1, hp: -5 }, text: '看雪太久，脚冻僵了。回屋时鞋底粘一层冰，敲了半日才落，敲下的冰里夹着草屑。' }, { w: 2, eff: { heart: 1, insight: 1 }, text: '月自东边上来时是红的，后来才白。你不明白为何如此，也未去问。' } ] },
    { id: 'tea', name: '煮茶', keys: ['煮茶', '烹茶', '泡茶', '喝茶', '煎茶'], soft: ['茶'], outs: [ { w: 3, eff: { heart: 1 }, text: '水开三回。第二回最宜，头回太嫩，三回已老。这些是旁人教的，你记了许多年，教的人已不在了。' }, { w: 2, eff: { heart: 2, insight: 1 }, text: '茶里有一点松针气。你没放松针，是水自松林那边流过来。' }, { w: 1, eff: { stones: -5 }, text: '火太旺，壶裂了。你看着那道裂纹，把剩下的水倒进土里。水渗下去，土色深了一块。' }, { w: 2, eff: { heart: 2 }, text: '为自己倒一杯，又为对面倒一杯。对面的杯子一直无人端起，凉透了才收。' } ] },
    { id: 'scripture', name: '抄经', keys: ['抄经', '写经', '临帖', '写经卷', '抄书'], soft: ['经', '帖'], outs: [ { w: 3, eff: { heart: 1, insightXp: 4 }, text: '抄至第七卷，手不抖了。字仍不好看，但每一笔都落在该落之处。' }, { w: 2, eff: { heart: 2, merit: 3 }, text: '抄错一字。你没有撕掉重来，只在旁点了三点：错便错了，留着。' }, { w: 1, eff: { heart: -1, hp: -3 }, text: '抄到一半伏案睡去。醒来时墨干在笔上，一纸尽糊，糊得看不出写的是哪一卷。' }, { w: 2, eff: { heart: 1, insight: 1 }, text: '抄完最后一卷，把笔洗净，晾在笔架上。忽然不知道明日该做什么。' } ] },
    { id: 'vow', name: '问心', keys: ['立誓', '自省', '问心', '反省', '叩问', '静心'], soft: ['誓', '省'], outs: [ { w: 3, eff: { heart: 1 }, text: '你把这一路所做的事一件件想过。有几件不愿想，还是想完了。想完也没得出什么结论。' }, { w: 2, eff: { heart: 2, karma: -2 }, text: '对空山说了一句话，说完便悔。可话说出去，山已经听见。' }, { w: 1, eff: { heart: -1 }, text: '你想起许久以前一件事，越想越觉当时做得不对。这一夜没睡好，第二日眼是肿的。' }, { w: 2, eff: { heart: 2, xiuweiMul: 0.3 }, text: '在纸上写下三字，看了很久，烧了。灰飘起时，你觉得轻了一点。' } ] },

    /* ---------- 生计 ---------- */
    { id: 'trade', name: '买卖', keys: ['摆摊', '做买卖', '卖东西', '开店', '跑商', '做生意', '贩'], soft: ['摊', '卖', '买'], outs: [ { w: 3, eff: { stones: 80 }, text: '在集口支一个摊。一日卖出三样，收八十块灵石，还被人顺走一把符纸。收摊时天已黑。' }, { w: 2, eff: { stones: 40, fame: 3 }, text: '货不好卖。倒有人看上你手上的剑穗，问能不能做一条一样的。你说不能，意颇怏怏，终市丹二瓶。' }, { w: 1, eff: { stones: -30, karma: 2 }, text: '纳伪石三，中实以铅。捏碎一块，碎屑在指缝里发亮。捏毕，掌有余腥。' }, { w: 2, eff: { stones: 20, merit: 3 }, text: '一日只来两拨人。第二拨是个孩子，看了半天，什么也没买，走时你塞给他一颗糖。' } ] },
    { id: 'inquire', name: '打听', keys: ['打听', '询问', '探听', '消息', '问路', '了解'], soft: ['打听', '消息'], outs: [ { w: 3, eff: { insight: 1 }, text: '茶棚里坐半日，听三件事，两件是假的。第三件无人提，但有人听见时把手缩了一下。' }, { w: 2, eff: { stones: -20 }, text: '花几块灵石，问到一个地名。那人收了钱，又补一句：毋独往。' }, { w: 1, eff: { fame: -2 }, text: '问得太直，被人当成探子。你走时，背后有两道目光一直跟着，跟过一条街才散。' }, { w: 2, eff: { insight: 1 }, text: '问了一圈，都说不知。最后一个扫地的老者抬头看你一眼，说了半句，又低头去扫。' } ] },
    { id: 'craft', name: '炼丹制符', keys: ['炼丹', '炼药', '制符', '画符', '布阵', '配药', '开炉'], soft: ['丹', '符', '阵'], outs: [ { w: 3, eff: { xiuweiMul: 0.3, mat: ['lanyouCao', 1] }, text: '守一夜炉。丹未成，火候却摸熟了，炉底结一层薄薄的药霜，可以刮下来。' }, { w: 2, eff: { stones: 100 }, text: '成两枚下品丹。颜色不正，药效约莫七成，镇上药铺肯收，他们什么药都收。' }, { w: 1, eff: { hpPct: -0.1, stones: -40 }, text: '炉炸。眉燎其一截，炉坼，材料尽成焦渣。你坐在灰里笑了半日，笑完把灰扫了。' }, { w: 2, eff: { insight: 1, xiuweiMul: 0.3 }, text: '炼丹讲文武火。你今日才明白，文火不是火小，是火一直在。' } ] },
    { id: 'forge', name: '炼器', keys: ['炼器', '打铁', '铸剑', '锻造', '铸兵'], soft: ['铁', '铸', '锻'], outs: [ { w: 3, eff: { mat: ['tieMu', 1], sense: 1 }, text: '锤四百下。铁块从黑变红，从红变白，末了成一条。插入水桶，那声「嗤」听得人心里一松。' }, { w: 2, eff: { stones: 60 }, text: '替人修一把断刀。刀主是猎户，说这刀杀过熊。他没谢你，只把刀往腰上一别，去了。' }, { w: 1, eff: { hp: -10 }, text: '火候没看住，一块好铁烧成了渣。你把手伸进水里，水立刻红了，过了一会儿才开始疼。' }, { w: 2, eff: { sense: 1, stones: 30 }, text: '打三日，成一把无名短刀。不好看，但顺手。你把它收进鞘里，没打算卖。' } ] },

    /* ---------- 邪道 ---------- */
    { id: 'steal', name: '偷窃', keys: ['偷', '夜探', '潜入', '摸进', '行窃', '扒'], soft: ['偷', '窃', '潜'], outs: [ { w: 3, eff: { stones: 150, karma: 4 }, text: '后窗未栓。你摸走柜上一只匣子，出门时踩到一只猫，它没叫。' }, { w: 2, eff: { stones: 60, karma: 6 }, text: '得手一半。东西不贵重，主人家却醒了，隔窗喝了一声。你翻墙走了，墙头碎瓦扎破了手。' }, { w: 1, eff: { karma: 10, fame: -10, hp: -20 }, text: '被撞见。三人围上来，你打翻两个跑掉，肩上挨了一棍。跑出两条街才敢回头。' }, { w: 2, eff: { karma: 3, insight: 1 }, text: '什么也没偷到。屋里穷得只有一张床、一口锅。你走时把门替他带上了。' } ] },
    { id: 'rob', name: '劫掠', keys: ['劫', '抢', '夺宝', '杀人', '打劫', '灭口'], soft: ['抢', '杀', '劫', '夺'], outs: [ { w: 3, eff: { stones: 300, karma: 15, fame: -5 }, text: '路边一个落单的行商。你出手极快，快到他没来得及喊。钱袋里有一张写了字的纸，你没看。' }, { w: 2, eff: { stones: 120, karma: 10, hpPct: -0.2 }, text: '对方有备。缠了三合，你在其腿上留一剑才脱身，自己肋下也见了血。走出半里便蹲下了。' }, { w: 1, eff: { karma: 20, hpPct: -0.45, fame: -15 }, text: '你看错了人。那不是什么行商，是扮作行商的执事。这一场几乎没能走掉，肋下衣裳被血浸透一片。' }, { w: 2, eff: { stones: 200, karma: 12, heart: -1 }, text: '得了手，走出很远才觉手在抖。你把手按在石头上，按下一个血印。' } ] },

    /* ---------- 德行 ---------- */
    { id: 'charity', name: '行善', keys: ['救', '济', '施药', '施粥', '善事', '帮人', '扶'], soft: ['救', '济', '善'], outs: [ { w: 3, eff: { merit: 8, fame: 4, stones: -20 }, text: '你把那人救下，自己反倒先喘不上气。他家里人要把最后一只鸡塞给你，你没要，追半里，乃抱鸡返。' }, { w: 2, eff: { merit: 12, fame: 6 }, text: '背那人走了六里山路。他一路上都在说话，说到后来你不知他在说什么，只是应着。' }, { w: 1, eff: { merit: 5, stones: -50, karma: -3 }, text: '你救了一个不该救的人。事后才知他做过什么。你什么也没说，人已经救活。' }, { w: 2, eff: { merit: 10, hpPct: -0.08 }, text: '事情办完时天已黑。你浑身湿透，他们在后头喊你先歇一歇，你摆摆手去了。' } ] },

    /* ---------- 神道 ---------- */
    { id: 'divine', name: '显圣', keys: ['显圣', '显灵', '降妖', '求雨', '治病', '托梦', '赐福'], soft: ['显灵', '神迹'], outs: [ { w: 3, eff: { followers: 80, merit: 6 }, text: '村东那个孩子烧了三日。你在庙前立了半夜，第二日早晨他母亲来还愿，说能下地跑了。' }, { w: 2, eff: { followers: 40 }, text: '求雨求到第七日，云来又散。第八日下了半个时辰。这半个时辰，成了方圆十里的传话。' }, { w: 1, eff: { followers: -60, piety: -0.1 }, text: '有人来问一件不在你权柄内的事。你答得含糊，他回去便把香炉搬走了。' }, { w: 2, eff: { followers: 120, piety: 0.05 }, text: '为一个不肯跪的人显了一次灵。他没跪，但他记住了。这样的人，一个顶一百个。' } ] },
    { id: 'preach', name: '传教', keys: ['传教', '收香客', '化缘', '劝善', '讲经', '布道'], soft: ['传', '布道'], outs: [ { w: 3, eff: { followers: 50, stones: -20 }, text: '讲了半日因果。散场时有人问：不为恶，亦不为善，可乎。汝不能答。' }, { w: 2, eff: { followers: 90, piety: 0.05 }, text: '一个老妇把攒了半年的铜钱全倒进功德箱。你要还她，她不肯，说还了就不灵了。' }, { w: 1, eff: { followers: -30 }, text: '有人在人群里问庙里收的钱去了何处。你没有答，人群便散了。' }, { w: 2, eff: { followers: 60, heart: 1 }, text: '讲到最后，你自己也动了念头：这些话，你自己信几分。' } ] },

    /* ---------- 什么都不干 ---------- */
    { id: 'rest', name: '休息', keys: ['睡', '休息', '躺', '歇', '养伤', '静养'], soft: ['睡', '歇', '养'], outs: [ { w: 3, eff: { hpPct: 0.22 }, text: '酣眠竟日。醒来时天已黑，屋有潮气。伤势稍纾，然转侧犹痛。' }, { w: 2, eff: { hpPct: 0.12, heart: 1 }, text: '半睡半醒之间，听见外面落雨。你没有起来关窗，雨丝飘进来一些，落在脸上。' }, { w: 1, eff: { hpPct: 0.05, heart: -1 }, text: '躺了一日也没睡着。脑中过了一遍又一遍不相干的事，天亮时比睡前还累。' }, { w: 2, eff: { hpPct: 0.18 }, text: '睡到半夜醒一次。屋外风把门吹得响，你起来拴好，回来时睡意没了，就坐着等天亮。' } ] },
    { id: 'idle', name: '闲度', keys: ['发呆', '闲逛', '晃', '无所事事', '愣', '坐着', '走走'], soft: ['呆', '逛', '闲'], outs: [ { w: 3, eff: {}, text: '在门口坐一日。看蚂蚁搬一粒米，搬了三个时辰，中间掉下去两回。' }, { w: 2, eff: { heart: 1 }, text: '什么也没做。日头从东挪到西，你看影子转过去，忽然觉得这样也好。' }, { w: 1, eff: { heart: -1 }, text: '闲甚。检行囊三过，陈物复收，收而复陈。' }, { w: 2, eff: { heart: 1 }, text: '坐在树下想事情，想到一半忘了在想什么。回过神，树上掉下一只虫，落在膝头。' } ] },
    { id: 'compose', name: '题诗', keys: ['写诗', '题字', '作诗', '题诗', '写字', '吟'], soft: ['诗', '题', '吟'], outs: [ { w: 3, eff: { heart: 1, insight: 1 }, text: '凑了两句，第三句怎么也接不上。你把它刻在洞口，第二日再看，觉得不好，也没去磨掉。' }, { w: 2, eff: { fame: 3, insight: 1 }, text: '写在客栈墙上。老板本要骂，读完，端一碗热汤过来，没收钱。' }, { w: 1, eff: { heart: -1 }, text: '写了半日，尽揉了。满地废纸，末了一张也没留下。' }, { w: 2, eff: { insight: 1, heart: -1 }, text: '只有一句是自己满意的。念一遍觉得好，再念一遍，就觉得一般了。' } ] },
    { id: 'mourn', name: '祭拜', keys: ['祭', '上坟', '烧纸', '祭拜', '扫墓', '磕头'], soft: ['祭', '坟', '纸'], outs: [ { w: 3, eff: { heart: 1, merit: 4 }, text: '坟头草长得比去年高。你拔了半日，手指磨破，才把碑上的字看清。' }, { w: 2, eff: { heart: 2, merit: 6 }, text: '烧了纸，火很小。你蹲着看它一张张卷起，直到最后一点火星灭掉。' }, { w: 1, eff: { heart: -2, karma: 3 }, text: '你去了，但没说话。立了一刻便走。走出很远才想起，忘了磕头。' }, { w: 2, eff: { heart: 1, merit: 5 }, text: '带一壶酒，倒在坟前。剩下的自己喝了，喝完把壶也留在那里。' } ] }
  ];

  /* ============================================================
     战斗描写：按「谁打谁、是打实了还是被卸了」分开写
     旧版战斗只有「造成 12」四个字，敌方回合干脆什么都不写——
     玩家看得见自己的数字，看不见自己挨了多少。
     这里每条都不写数字，数字由代码接在后面，字只负责画面。
     ============================================================ */
  const COMBAT_TEXT = {
    pHit: [
      '剑锋擦过他肩头，衣裂，皮下翻出一道白',
      '他一让，你顺势进半步，拳至其肋',
      '这一下结实，闻骨闷响一声',
      '你抢在他抬手之前出手，正中心口',
      '刃自下撩上，他退得急，脚跟石上滑了一下',
      '他从你影子里看出要打何处，仍慢了半分'
    ],
    pDefl: [
      '他手腕一沉，卸去大半',
      '你的力道打在他袖上，如打在浸水的棉里',
      '他退半步，以肩背化了这一下',
      '刃落时偏一寸，只划破外层护气'
    ],
    fHit: [
      '他一掌拍在你胸口，气闷一瞬',
      '先闻耳畔风声，痛乃至',
      '他指节擦过你额角，眼前白了一白',
      '你挡住兵器，未挡住他随后一膝',
      '他自侧面切入，你转得太慢',
      '这一下打得你退半步，脚跟磕在石上'
    ],
    fDefl: [
      '你沉肘护住要害，把这一击卸到旁边石上',
      '力道顺你脊背滑下，落进地里',
      '你侧身让开大半，只余一点余劲',
      '他的劲进来，被你一节一节卸掉'
    ],
    guard: [
      '你沉肩收肘，把气提到胸口，什么都不做',
      '你把剑横在身前，等他自己撞上来',
      '你退到崖边，背后是空，身前守得住'
    ],
    observe: [
      '你不看他的手，看他的脚。脚动之前，手已想好了',
      '他每次出手前，左肩先沉半分',
      '你退开两步，把整场架看了一遍',
      '他呼吸在第三下之后会乱半拍'
    ],
    kill: [
      '他倒下去时还睁着眼',
      '末一击不御，殆不能御',
      '他松了手，兵器落地，声音比人还响',
      '你收手，他已不动',
      '血自石罅徐渗'
    ],
    down: [
      '眼前一黑，最后看见的是天',
      '欲举手，手不从命',
      '声音先远，然后才是光'
    ],
    foeFlee: [
      '窜入林中，衣角一闪遂杳',
      '却步三舍，回身而遁，状甚狼狈'
    ]
  };

  /* ====== 御兽（v8.1 P0 批次 3） ======
     设计口径三条：
     一、妖物来源不新开玩法，复用既有的「负伤妖物」奇遇与猎妖；
     二、养成两条轴——亲密（会不会护主）与妖力（能打多少），互不替代；
     三、兽栏挂在洞府，上限按灵脉档位——灵脉越旺才养得起更多，这是洞府投资的正反馈。 */
  const BEAST_STOCK = [
    { id: 'huyao',  name: '狐妖',   el: 'wood',  desc: '尾多一条，心多一窍。',        atk: 0.85, hp: 0.9,  gated: 0 },
    { id: 'jiaolong', name: '蛟',   el: 'water', desc: '未化龙，先有龙脾气。',        atk: 1.10, hp: 1.15, gated: 2 },
    { id: 'shixiong', name: '石熊', el: 'earth', desc: '走一步，地响一声。',          atk: 1.00, hp: 1.45, gated: 1 },
    { id: 'yanque', name: '焰雀',   el: 'fire',  desc: '落在肩上，羽毛烫人。',        atk: 1.20, hp: 0.75, gated: 2 },
    { id: 'xuangui', name: '玄龟',  el: 'water', desc: '一年长一寸，活得比谁都久。',  atk: 0.70, hp: 1.60, gated: 3 },
    { id: 'leiying', name: '雷鹰',  el: 'metal', desc: '翅展开时，云里有响声。',      atk: 1.30, hp: 0.85, gated: 4 }
  ];
  /* 兽栏上限：按灵脉档（LINGQI 下标）取，灵脉越旺养得越多 */
  const BEAST_BARN = [1, 2, 2, 3, 3];
  /* 亲密分档：护主概率与反噬概率都从这里读，不在战斗里写魔法数 */
  const BEAST_BOND = [
    { min: -99, name: '野',   guard: 0.10, bite: 0.30, note: '它只是还没走。' },
    { min: 0,   name: '认',   guard: 0.30, bite: 0.12, note: '它认得你的气味。' },
    { min: 30,  name: '亲',   guard: 0.50, bite: 0.04, note: '你出门它会跟到门口。' },
    { min: 60,  name: '契',   guard: 0.70, bite: 0.00, note: '它替你挡过一回，没退。' }
  ];
  /* 喂养与调教：两条轴各自的道具与代价，走洞府兽栏面板 */
  const BEAST_CARE = {
    feedStone: 120,        // 喂一次：灵石
    feedBond: 6,           // 喂一次：亲密
    trainXun: 1,           // 调教：占一旬
    trainPower: 0.06,      // 调教：妖力 +6%（乘法，收益递减）
    trainBond: -2,         // 调教：亲密小跌（被逼着练）
    powerCap: 1.80         // 妖力上限，防反噬/输出失控
  };

  /* ====== 师徒（v8.1 P0 批次 4） ======
     刻意不复用 FOLLOW_LIMIT——那是信众上限，量级差四个数量级，
     混用会让「收一个徒弟」变成「收三万信众」。 */
  const DISCIPLE_LIMIT = 2;
  /* 四条出路：授业→出师→（叛师 | 先死）。每条都要能结算，不能只写文案。 */
  const DISCIPLE_TEACH = [
    { id: 'gongfa', name: '授功法', cost: 1, need: '有可授功法', gain: '弟子修为大涨，亲密 +8' },
    { id: 'art',    name: '授技艺', cost: 1, need: '已通一门四艺', gain: '弟子技艺入门，亲密 +6，将来可代做' },
    { id: 'heart',  name: '点道心', cost: 1, need: '道心 ≥ 10', gain: '弟子道心 +2，亲密 +10（他记你一句）' }
  ];
  const DISCIPLE_STAGE = [
    { key: 'ru',  name: '入门', need: 0,  note: '刚磕过头，还不敢抬头看你。' },
    { key: 'cheng', name: '承教', need: 40, note: '会自己抄书了。' },
    { key: 'cheng2', name: '登堂', need: 90, note: '能替你回一封帖子。' },
    { key: 'chu', name: '出师', need: 150, note: '可以走了。' }
  ];

  /* ====== 属性分档（v8.1 P0 第 6 项） ======
     目的不是加数值，是让属性决定「你能看到什么」。
     三档：低（看不清）/中（看得出）/高（看得透）。
     门槛取 8 为中线——创角默认 8，所以「不堆属性=看不出」，
     堆了才会在同一段文字里多出一行线索。 */
  const STAT_TIER = [
    { key: 'low',  min: 0,  label: '不见' },
    { key: 'mid',  min: 8,  label: '可见' },
    { key: 'high', min: 13, label: '洞见' }
  ];
  /* 线索表：每条挂一个属性与门槛，同一处地/人/物在不同档位露出不同信息。
     这是「属性进入文本」的最小实现——不改任何公式，只多给一行字。 */
  const INSIGHT_LINES = [
    { id: 'ins_link',  stat: 'insight', min: 13, text: '你看出此地灵脉有一处断口，像是被人截过。' },
    { id: 'ins_gf',    stat: 'insight', min: 10, text: '这套功法的第三步与第一步暗中相冲，练久了要出事。' },
    { id: 'ins_sense', stat: 'sense',   min: 13, text: '屋里有第三个人的气息，比你来得早，也还没走。' },
    { id: 'ins_heart', stat: 'heart',   min: 13, text: '你压住了心里那点跃跃欲试——那不是你的念头。' },
    { id: 'ins_fate',  stat: 'fate',    min: 13, text: '这名字你听过，在你还不知道自己在修行的时候。' },
    { id: 'ins_speed', stat: 'speed',   min: 13, text: '他的步法右重左轻，右腿有旧伤。' }
  ];

  /* ====== 导出 ====== */
  G.WXCS3_DATA = {
    STATS, CULTIVATION,
    XIAN_REALMS, XIANJI, QI_TO_DAOTONG,
    LINGQI, ROOTS, ELEMENTS, MUT_ELEMENTS,
    GONGFA_TIERS, GONGFA, BODIES, TALENTS, ORIGINS,
    FAXIANG, ZODIAC_CLASH,
    PILLARS, POSITIONS, PIETY, CAP_BASE, CAP_STAGE_STEP, SHENTONG_GRANT, MIAO_COEFF, QIHE, FOLLOW_LIMIT, BREAK_BASE, QUENCH, FIXED_COST, TRIBULATION, TRIB_WEIGHT,
    BEAST_STOCK, BEAST_BARN, BEAST_BOND, BEAST_CARE,
    DISCIPLE_LIMIT, DISCIPLE_TEACH, DISCIPLE_STAGE,
    STAT_TIER, INSIGHT_LINES,
    TIANJIANG, DIZHA, GUOWEI, GUOWEI_RANK,
    ANCHOR_TYPES, ANCHOR_STATES, ANCHOR_STATUS, RITUALS,
    LU, DAOTONG, SANXUAN, SHENTONG, SHENTONG_GRANT, DAOTONG_TEMPER,
    SHIXIU, RENCAI, REGIONS, PATHS, GOALS, NPC_POOL, FAVOR_TIERS,
    UNLOCK_XIAN, UNLOCK_SHEN,
    SHOP, SHOP_GONGFA, SHOP_CATS, GATE, SHENWEI, EVENTS, ENDINGS, SCRIPTS,
    EXCHANGE, XIANG_GONG, MIAO_UP,
    GONGFA_EXT, PILL_EXT, ARTIFACT_EXT, MATERIAL_EXT, SKILLS, ENCOUNTERS,
    LITURGY, TRANSMISSIONS,
    DAOGONG_CAP, SHENG, SECT, SKILL_PRICE, CLAN, DAOTONG_CLASS,
    RECIPES, TALISMANS, ARRAY_DISKS, CRAFT_LEVELS, CRAFT_REALM_GATE, CRAFT_BOOKS, CRAFT_ARTS,
    QUALITY, SELL_CHANNELS,
    SCENES, SCENES_SPECIAL, DAOSHU, VERSES,
    ACH_TIERS, ACHIEVEMENTS, ACH_MEMORY,
    HOOK_DEBUFF, HOOKS,
    DIVINE_ARTIFACTS, VOTIVE_ITEMS, CLAN_INDUSTRIES, TUTORIAL_STEPS,
    INTENTS, COMBAT_TEXT,
    ZHENJUN
  };
})(window);
