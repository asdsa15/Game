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
    { id: 'juqi',     name: '聚气诀',     tier: 'huang', el: null,    price: 120,  eff: '入门内功，最稳的引气法门' },
    { id: 'liehuo',   name: '烈火掌',     tier: 'huang', el: 'fire',  price: 160,  eff: '火系小威力法术' },
    { id: 'yufeng',   name: '御风术',     tier: 'huang', el: 'wind',  price: 140,  eff: '遁速 +5%' },
    { id: 'lianqi',   name: '敛气诀',     tier: 'huang', el: null,    price: 180,  eff: '收敛气机，不易被窥探' },
    { id: 'daoahai',  name: '蹈海诀',     tier: 'huang', el: 'water', price: 200,  eff: '水系步法，涉水如履平地' },
    { id: 'guixi',    name: '龟息延年诀', tier: 'huang', el: 'earth', price: 220,  eff: '吐纳绵长，寿元 +10' },
    { id: 'jinguang', name: '金光咒',     tier: 'huang', el: 'metal', price: 190,  eff: '护身金光，减伤一成' },
    /* 玄阶 */
    { id: 'changchun',name: '长春功',     tier: 'xuan',  el: 'wood',  price: 520,  eff: '气血回复，疗伤本钱' },
    { id: 'liuhuo',   name: '流火剑诀',   tier: 'xuan',  el: 'fire',  price: 560,  eff: '火系剑法，可灼烧' },
    { id: 'bingpo',   name: '冰魄诀',     tier: 'xuan',  el: 'ice',   price: 600,  eff: '冰系，减速' },
    { id: 'tunhai',   name: '吞海功',     tier: 'xuan',  el: 'water', price: 640,  eff: '气海容量 +15%，最扎实的玄阶' },
    { id: 'bihai',    name: '碧海功',     tier: 'xuan',  el: 'water', price: 660,  eff: '水系常法，绵长不绝' },
    { id: 'zhenlei',  name: '震雷诀',     tier: 'xuan',  el: 'thunder', price: 680, eff: '雷系起手，破防' },
    { id: 'lingbo',   name: '凌波仙经',   tier: 'xuan',  el: 'water', price: 700,  eff: '身法：遁速 +12%' },
    { id: 'meihua',   name: '梅花易',     tier: 'xuan',  el: null,    price: 720,  eff: '占卜之术，机缘 +6，可窥因果一线' },
    { id: 'xumai',    name: '续脉决',     tier: 'xuan',  el: 'wood',  price: 700,  eff: '经脉受损可自愈，疗伤效率 +30%' },
    /* 地阶 */
    { id: 'zixiao',   name: '紫霄雷法',   tier: 'di',    el: 'thunder', price: 2400, eff: '雷系大威力，需雷灵根' },
    { id: 'xuanyuan', name: '玄元剑经',   tier: 'di',    el: 'metal', price: 2600, eff: '剑系威力 +40%' },
    { id: 'tianhe',   name: '天河剑诀',   tier: 'di',    el: 'metal', price: 2800, eff: '剑势如天河倒泻，伤害 +50%' },
    { id: 'tianli',   name: '天遁剑诀',   tier: 'di',    el: 'metal', price: 2900, eff: '攻遁一体，遁走成功率 +15' },
    { id: 'jiuhuan',   name: '九寰天书',   tier: 'di',    el: null,    price: 3100, eff: '包罗九寰，诸法皆可入' },
    { id: 'jujing',   name: '九变化龙诀', tier: 'di',    el: null,    price: 3200, eff: '九变之身，攻守俱佳（魔门正统）' },
    { id: 'jixing',  name: '剑君谈玄执金秘章', tier: 'di', el: 'metal', price: 3000, eff: '执金执剑，双绝之章' },
    { id: 'wuling',   name: '万灵归墟道经', tier: 'di', el: null,    price: 3300, eff: '万灵归墟，可借众物之气' },
    /* 天阶 */
    { id: 'taixu',    name: '太虚剑典',   tier: 'tian',  el: 'metal', price: 12000, eff: '剑系大成，一念千剑' },
    { id: 'zaohua',   name: '造化丹经',   tier: 'tian',  el: null,    price: 13000, eff: '炼丹大宗师之路' },
    { id: 'butian',   name: '补天真经',   tier: 'tian',  el: null,    price: 14000, eff: '补天之缺，寿元上限 +80' },
    { id: 'xuanrong', name: '乾天一元统摄诸天神法', tier: 'tian', el: null, price: 15000, eff: '统摄诸天，位格压制 +1 档' },
    { id: 'xianghuo', name: '香火成神法', tier: 'tian',  el: null,    price: 14500, eff: '以香火铸神，神道正统' },
    { id: 'datie',    name: '天语焜烨龙章', tier: 'tian', el: null,  price: 15500, eff: '龙章凤姿，威压自生' },
    /* 仙阶 */
    /* 玄鉴仙族取材 */
    { id: 'jianghe',   name: '江河一气诀',     tier: 'di',    el: 'water', price: 0, eff: '一气贯江河，修为绵长不绝' },
    { id: 'zilei',     name: '紫雷秘元功',     tier: 'di',    el: 'thunder', price: 0, eff: '雷元内蕴，破境时抗反噬' },
    { id: 'jindian',   name: '金殿煌元诀',     tier: 'tian',  el: 'metal', price: 0, eff: '金殿煌煌，护体不破' },
    { id: 'minghua',   name: '明华煌元经',     tier: 'tian',  el: null,   price: 0, eff: '明华照世，威压自生' },
    { id: 'yingyue',   name: '月阙剑典',       tier: 'di',    el: 'metal', price: 0, eff: '月阙悬空，剑出无影' },
    { id: 'xuanShui',  name: '玄水剑诀',       tier: 'xuan',  el: 'water', price: 640, eff: '水凝为剑，柔中带刚' },
    { id: 'chaoXia',   name: '朝霞采露诀',     tier: 'huang', el: 'wood', price: 210, eff: '采朝露之气，入门最稳' },
    { id: 'yueHu',     name: '月湖映秋诀',     tier: 'xuan',  el: 'water', price: 700, eff: '月湖映秋，心境不扰' },
    { id: 'taixuDou',  name: '太虚斗转诀',     tier: 'di',    el: null,   price: 0, eff: '斗转星移，可易位躲避' },
    { id: 'taiyinTuna',name: '太阴吐纳养轮经', tier: 'tian',  el: null,   price: 0, eff: '养轮之法，寿元上限 +60' },
    { id: 'baishou',   name: '白首叩庭经',     tier: 'di',    el: null,   price: 0, eff: '白首叩庭，道心不堕' },
    { id: 'xuanguang', name: '玄光赶山经',     tier: 'di',    el: 'earth', price: 0, eff: '玄光赶山，御土如驱畜' },
    { id: 'hongmeng', name: '鸿蒙紫气诀', tier: 'xian',  el: null,    price: 68000, eff: '万法归宗，需天道机缘' },
    { id: 'taiyin',   name: '太阴蜕形尸解真法', tier: 'xian', el: null, price: 72000, eff: '形蜕而神存，死生不再受形所囿' },
    { id: 'bailian',  name: '百炼成仙道法', tier: 'xian', el: null, price: 75000, eff: '百炼凡骨，终成仙体' }
  ];

  /* ====== 丹药（扩充） ====== */
  const PILL_EXT = [
    /* 回气血 */
    { id: 'pillHp',   name: '回春丹',     price: 50,    tier: 'huang', type: 'hp',   v: 50,    desc: '回血 50' },
    { id: 'xiaoSheng',name: '生肌续骨丹', price: 140,   tier: 'xuan',  type: 'hp',   v: 160,   desc: '回血 160，接骨生肌' },
    { id: 'shengji',  name: '复原丹',     price: 480,   tier: 'xuan',  type: 'hpPct', v: 0.5,  desc: '回血 50%（按上限算）' },
    { id: 'fuYuan',   name: '大还丹',     price: 1600,  tier: 'di',    type: 'hpFull', desc: '气血全满，重伤立愈' },
    { id: 'huichun',  name: '九转回春散', price: 3600,  tier: 'di',    type: 'hpFull', desc: '气血全满，并清除一切伤势异常' },
    /* 疗伤 / 续命 */
    { id: 'heal',     name: '疗伤药',     price: 80,    tier: 'huang', type: 'cure', desc: '治轻/重伤' },
    { id: 'xuming',   name: '续命丹',     price: 2200,  tier: 'di',    type: 'life', v: 20,   desc: '寿元 +20 年（只在此刻续，不再增长）' },
    { id: 'jiebang',  name: '接骨膏',     price: 260,   tier: 'xuan',  type: 'cure', desc: '断肢续接，重伤转轻' },
    /* 回灵 */
    { id: 'pillMp',   name: '聚气丹',     price: 40,    tier: 'huang', type: 'mp',   v: 40,    desc: '回灵 40' },
    { id: 'huiLing',  name: '回灵散',     price: 180,   tier: 'xuan',  type: 'mpPct', v: 0.4,  desc: '灵力回 40%' },
    { id: 'yuhuaShui',name: '玉华灵水',   price: 760,   tier: 'di',    type: 'mpFull', desc: '灵力全满（补气草+合神花+玉华宝鱼汁所炼）' },
    /* 道心 / 修为 */
    { id: 'clear',    name: '清心丹',     price: 120,   tier: 'huang', type: 'heart', v: 2,  desc: '道心 +2' },
    { id: 'ningShen', name: '凝神散',     price: 320,   tier: 'xuan',  type: 'heart', v: 4,  desc: '道心 +4，渡关前必服' },
    { id: 'xiaoPo',   name: '小破障丹',   price: 900,   tier: 'xuan',  type: 'break', v: 0.12, desc: '破境成功率 +12%' },
    { id: 'zhuji',    name: '筑基丹',     price: 1500,  tier: 'xuan',  type: 'break', v: 0.15, desc: '筑基辅助，成功率 +15%' },
    { id: 'daPo',     name: '大破障丹',   price: 6800,  tier: 'di',    type: 'break', v: 0.28, desc: '破境成功率 +28%' },
    { id: 'ningYing', name: '凝婴丹',     price: 12000, tier: 'di',    type: 'break', v: 0.35, desc: '金丹→元婴一关成功率 +35%' },
    /* 增益 */
    { id: 'xiaoXuan', name: '日月玄浆',   price: 2400,  tier: 'di',    type: 'cult', desc: '服用后闭关效率 +30%（一个月）' },
    { id: 'xiang',    name: '信香',       price: 30,    tier: 'huang', type: 'xiang', v: 20, desc: '+20 香火（神道用）' }
  ];

  /* ====== 符箓（制符产物，战斗中一次性消耗） ====== */
  const TALISMANS = [
    { id: 'fuHuo',  name: '火符',   tier: 'huang', price: 110, eff: '一次性火伤，相当于一记免费大招', kind: 'atk', v: 0.9,  el: 'fire' },
    { id: 'fuJin',  name: '金刚符', tier: 'huang', price: 130, eff: '抵挡一次攻击（减伤 60%）',      kind: 'def', v: 0.6 },
    { id: 'fuDun',  name: '遁符',   tier: 'huang', price: 150, eff: '必逃，无视境界压制',            kind: 'escape' },
    { id: 'fuZeng', name: '增益符', tier: 'xuan',  price: 240, eff: '下三回合伤害 +30%',             kind: 'buff', v: 0.30 },
    { id: 'fuLei',  name: '雷符',   tier: 'xuan',  price: 320, eff: '必中且无视一半护甲，雷伤',      kind: 'atk', v: 1.3, el: 'thunder' }
  ];

  /* ====== 法器 / 法宝（扩充） ====== */
  const ARTIFACT_EXT = [
    { id: 'qingyezhou', name: '青叶舟',     price: 400,   tier: 'huang', slot: 'move',  eff: '遁走成功率 +10，赶路不耗灵力' },
    { id: 'guixibao',   name: '护身玉符',   price: 600,   tier: 'huang', slot: 'body',  eff: '斗法减伤 8%（常驻）' },
    { id: 'duzuo',      name: '破宝锥',     price: 1200,  tier: 'xuan',  slot: 'once',  eff: '一次性：无视境界压制，必然切开一条生路（可遁走）' },
    { id: 'wanyePiu',    name: '百魂幡',     price: 2400,  tier: 'xuan',  slot: 'atk',   eff: '斗法时伤害 +15%，消耗气血 5' },
    { id: 'jiuzhuan',    name: '九转飞剑',   price: 3200,  tier: 'di',    slot: 'atk',   eff: '本命飞剑，攻击 +25%' },
    { id: 'taiyinBao',   name: '太阴宝鉴',   price: 4600,  tier: 'di',    slot: 'body',  eff: '照见虚妄，命中 +10，看破幻术' },
    { id: 'huoyuyuan',   name: '火云符',     price: 180,   tier: 'huang', slot: 'once',  eff: '一次性符箓：斗法首击火伤 +60%' },
    { id: 'jinchuan',    name: '传音符',     price: 90,    tier: 'huang', slot: 'once',  eff: '一次性：向任意认识的人传讯，好感 +5' },
    { id: 'wanlingfan',  name: '万灵幡',     price: 8600,  tier: 'tian',  slot: 'atk',   eff: '万灵归幡，斗法伤害 +40%，可收妖物' },
    { id: 'wuyun',       name: '五雷符',     price: 520,   tier: 'xuan',  slot: 'once',  eff: '一次性：斗法首击必定命中且 +80% 伤害' },
    { id: 'hanhuo',      name: '祈雨符箓',   price: 160,   tier: 'huang', slot: 'once',  eff: '神道：一场显圣不耗香火' },
    { id: 'juxian',      name: '拘仙敕神符', price: 2800,  tier: 'di',    slot: 'body',  eff: '神道：位格压制 +1 档，限一场' }
  ];

  /* ====== 炼器 / 炼丹材料 ====== */
  const MATERIAL_EXT = [
    { id: 'buqiCao',    name: '补气草',     price: 60,  tier: 'huang', eff: '炼丹主材：回灵类丹药' },
    { id: 'heshenHua',  name: '合神花',     price: 90,  tier: 'huang', eff: '炼丹主材：宁神类丹药' },
    { id: 'yuhuaYu',    name: '玉华宝鱼汁', price: 220, tier: 'xuan',  eff: '炼丹主材：玉华灵水' },
    { id: 'gulingHua',  name: '骨灵花',     price: 380, tier: 'xuan',  eff: '疗伤类丹药引子' },
    { id: 'tianying',   name: '天婴果',     price: 900, tier: 'di',    eff: '凝婴丹主材' },
    { id: 'jidaoGuo',   name: '剑道果',     price: 1100, tier: 'di',   eff: '剑修大成之果，剑系功法效率 +20%' },
    { id: 'wuxingling', name: '五行灵果',   price: 660, tier: 'xuan',  eff: '五行俱全，补灵根偏废' },
    { id: 'starSand',   name: '天璇星砂',   price: 1500, tier: 'di',   eff: '炼器主材：法器品阶 +1' },
    { id: 'mudanYao',   name: '妖丹',       price: 800, tier: 'xuan',  eff: '妖兽内丹，炼器炼丹通用' },
    { id: 'qunfangSui', name: '群芳髓',     price: 420, tier: 'xuan',  eff: '双修与容颜之物' },
    { id: 'wulianXue',  name: '万炼血',     price: 1300, tier: 'di',   eff: '魔门血炼主材，业力 +5 但威力可观' },
    { id: 'lanyouCao',  name: '蓝幽草',     price: 140, tier: 'huang', eff: '最常见的疗伤草药' },
    /* —— 四艺专用材料（符纸/符墨/阵材/器料）—— */
    { id: 'fuZhi',      name: '符纸',       price: 20,  tier: 'huang', eff: '制符承载之物，一张一符' },
    { id: 'zhuSha',     name: '朱砂',       price: 30,  tier: 'huang', eff: '制符定属性，赤色最灵' },
    { id: 'zhenQi',     name: '阵旗',       price: 260, tier: 'xuan',  eff: '布阵必须，可重复使用' },
    { id: 'huanShi',    name: '幻属石',     price: 180, tier: 'xuan',  eff: '迷踪阵主材' },
    { id: 'jinLing',    name: '金灵砂',     price: 200, tier: 'xuan',  eff: '炼器刻阵用，导灵' },
    { id: 'tieMu',      name: '铁木心',     price: 150, tier: 'huang', eff: '器胚主材，坚韧' },
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
      note: '最基础的疗伤丹，会做的人一辈子不愁药钱' },
    { id: 'dan_juhui',   kind: 'dan', name: '聚气丹',   tier: 'huang', lv: 1,
      mats: { buqiCao: 2 }, out: 'pillMp', need: 1, base: 0.75, risk: 'explode',
      note: '补灵之物，散修最先学会的就是这个' },
    { id: 'dan_qingxin', kind: 'dan', name: '清心丹',   tier: 'huang', lv: 2,
      mats: { heshenHua: 1, lanyouCao: 1 }, out: 'clear', need: 1, base: 0.70, risk: 'explode',
      note: '道心不稳时服一丸' },
    { id: 'dan_shengji', kind: 'dan', name: '生肌续骨丹', tier: 'xuan', lv: 3,
      mats: { lanyouCao: 2, gulingHua: 1 }, out: 'xiaoSheng', need: 1, base: 0.65, risk: 'explode',
      note: '接骨生肌，重伤也拉得回来' },
    { id: 'dan_yuhua',   kind: 'dan', name: '玉华灵水', tier: 'di', lv: 5,
      mats: { buqiCao: 1, heshenHua: 1, yuhuaYu: 1 }, out: 'yuhuaShui', need: 1, base: 0.55, risk: 'explode',
      note: '三味合炼，灵力可一时全满' },
    /* —— 制符 —— */
    { id: 'fu_huo',  kind: 'fu', name: '火符',   tier: 'huang', lv: 1,
      mats: { fuZhi: 1, zhuSha: 1 }, out: 'fuHuo', need: 3, base: 0.72, risk: 'ruin',
      note: '一炉三张，链条最短，周转最快' },
    { id: 'fu_jin',  kind: 'fu', name: '金刚符', tier: 'huang', lv: 2,
      mats: { fuZhi: 1, zhuSha: 2 }, out: 'fuJin', need: 3, base: 0.70, risk: 'ruin',
      note: '贴一张，抵一次' },
    { id: 'fu_dun',  kind: 'fu', name: '遁符',   tier: 'huang', lv: 2,
      mats: { fuZhi: 2, zhuSha: 1 }, out: 'fuDun', need: 3, base: 0.68, risk: 'ruin',
      note: '打不过就跑，跑得掉才活得久' },
    { id: 'fu_zeng', kind: 'fu', name: '增益符', tier: 'xuan', lv: 3,
      mats: { fuZhi: 2, zhuSha: 2, heshenHua: 1 }, out: 'fuZeng', need: 3, base: 0.60, risk: 'ruin',
      note: '三回合伤害三成，越阶杀人的本钱' },
    { id: 'fu_lei',  kind: 'fu', name: '雷符',   tier: 'xuan', lv: 4,
      mats: { fuZhi: 3, zhuSha: 3, jinLing: 1 }, out: 'fuLei', need: 3, base: 0.55, risk: 'ruin',
      note: '必中、破甲，最贵的一张' },
    /* —— 炼器 —— */
    { id: 'qi_qingye', kind: 'qi', name: '青叶舟', tier: 'huang', lv: 2,
      mats: { tieMu: 2, jinLing: 1 }, out: 'qingyezhou', need: 1, base: 0.65, risk: 'ruin',
      note: '器胚一次成型，刻阵可重来' },
    { id: 'qi_hushen', kind: 'qi', name: '护身玉符', tier: 'huang', lv: 3,
      mats: { tieMu: 1, jinLing: 2, huanShi: 1 }, out: 'guixibao', need: 1, base: 0.60, risk: 'ruin',
      note: '常驻减伤，最实用的一件' },
    { id: 'qi_jiuzhuan', kind: 'qi', name: '九转飞剑', tier: 'di', lv: 5,
      mats: { longYan: 1, jinLing: 3, starSand: 1 }, out: 'jiuzhuan', need: 1, base: 0.50, risk: 'ruin',
      note: '本命飞剑，攻击 +25%' },
    /* —— 阵法（阵盘，布在洞府持续生效）—— */
    { id: 'zhen_juling', kind: 'zhen', name: '聚灵阵', tier: 'huang', lv: 2,
      mats: { jinLing: 2, buqiCao: 2 }, out: 'zhenJuLing', need: 1, base: 0.70, risk: 'ruin',
      note: '洞府灵气 +1 档，需灵石维持' },
    { id: 'zhen_mizong', kind: 'zhen', name: '迷踪阵', tier: 'xuan', lv: 3,
      mats: { huanShi: 3, zhenQi: 1 }, out: 'zhenMiZong', need: 1, base: 0.62, risk: 'ruin',
      note: '洞府不被窥探' },
    { id: 'zhen_wuxing', kind: 'zhen', name: '五行轮杀阵', tier: 'di', lv: 5,
      mats: { jinLing: 1, buqiCao: 1, huanShi: 1, zhenQi: 1, longYan: 1 }, out: 'zhenWuXing', need: 1, base: 0.52, risk: 'ruin',
      note: '五行各一份，洞府防御，可伤来犯者' },
    { id: 'zhen_suoling', kind: 'zhen', name: '锁灵阵', tier: 'xuan', lv: 4,
      mats: { zhenQi: 1, jinLing: 2, huanShi: 1 }, out: 'zhenSuoLing', need: 1, base: 0.58, risk: 'ruin',
      note: '战斗中限制敌人遁走' }
  ];

  /* 阵盘（阵地产物，与法宝分开存） */
  const ARRAY_DISKS = [
    { id: 'zhenJuLing', name: '聚灵阵',     tier: 'huang', eff: '洞府灵气 +1 档',       upkeep: 20 },
    { id: 'zhenMiZong', name: '迷踪阵',     tier: 'xuan',  eff: '洞府不被窥探',         upkeep: 40 },
    { id: 'zhenSuoLing',name: '锁灵阵',     tier: 'xuan',  eff: '战斗中禁敌遁走',       upkeep: 50 },
    { id: 'zhenWuXing', name: '五行轮杀阵', tier: 'di',    eff: '洞府防御，可伤来犯者', upkeep: 90 }
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
    { id: 'dan',  name: '炼丹', stat: 'insight', desc: '自用省药钱，外卖需求刚性' },
    { id: 'qi',   name: '炼器', stat: 'qualify', desc: '单笔最贵，法宝词条更强' },
    { id: 'fu',   name: '制符', stat: 'sense',   desc: '链条最短，越阶杀人的手段' },
    { id: 'zhen', name: '阵法', stat: 'insight', desc: '资产而非消耗品，改变胜负' }
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
    { id: 'sect',  name: '交宗门', mul: 0.70, need: 'sect',  desc: '稳定量大，可换贡献' },
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
    { id: 'zhiquan',   name: '直取',       cost: 0,   mul: 1.0,  kind: 'normal',  lvl: 'wai',  desc: '朴实一击，无消耗' },
    { id: 'jianqi',    name: '剑气纵横',   cost: 20,  mul: 1.35, kind: 'sword',   lvl: 'wai',  desc: '剑修常法，耗灵力' },
    { id: 'liehuo',    name: '焚山掌',     cost: 25,  mul: 1.45, kind: 'fire',    lvl: 'wai',  desc: '火系一掌，可灼烧' },
    { id: 'hanshui',   name: '寒水箭',     cost: 22,  mul: 1.30, kind: 'water',   lvl: 'wai',  desc: '凝水成箭，克制火属' },
    { id: 'mumin',     name: '缠木根',     cost: 28,  mul: 1.20, kind: 'wood',    lvl: 'nei',  desc: '缠绕束缚，敌方一回合伤害减半' },
    { id: 'luoshi',    name: '落石诀',     cost: 26,  mul: 1.40, kind: 'earth',   lvl: 'nei',  desc: '沉重一击，破防' },
    { id: 'dugu',      name: '毒火丝',     cost: 30,  mul: 1.15, kind: 'poison',  lvl: 'nei',  desc: '真伤持续三回合' },
    { id: 'zhentian',  name: '镇压八方',   cost: 50,  mul: 1.60, kind: 'control', lvl: 'nei',  desc: '压制敌方下一回合不能攻击' },
    { id: 'liuJian',   name: '流转剑罡',   cost: 35,  mul: 1.50, kind: 'sword',   lvl: 'nei',  desc: '剑罡绕身，攻守两便' },
    { id: 'leiming',   name: '惊雷引',     cost: 40,  mul: 1.75, kind: 'thunder', lvl: 'zhen', desc: '雷系，必定命中且无视一半护甲' },
    { id: 'baigu',     name: '白骨飞剑',   cost: 45,  mul: 1.80, kind: 'sword',   lvl: 'zhen', desc: '白骨凝剑，锋利易折（命中低）' },
    { id: 'xueLian',   name: '血炼神光',   cost: 0,   mul: 1.55, kind: 'blood',   lvl: 'zhen', desc: '魔门常法：以自身气血十成换伤害' },
    { id: 'xuanZhu',   name: '玄珠坠月',   cost: 55,  mul: 1.90, kind: 'water',   lvl: 'zhen', desc: '玄珠压顶，水滴石穿' },
    { id: 'shenying',  name: '神霄御剑',   cost: 60,  mul: 2.10, kind: 'thunder', lvl: 'zhen', desc: '雷剑相合，大威力但耗灵极巨' }
  ];

  /* ====== 道基功法的境界上限（修炼功法 / 杀伐招式 分家后最重的一条） ======
     品阶不够，修到本境圆满就再也上不去了 —— 必须去换更高阶的道基功法
     依据《苟在初圣魔门当人材》：「七品以下无缘筑基，三品以下无缘金丹」 */
  const DAOGONG_CAP = {
    huang: { cap: 1, to: '练气圆满', why: '散修烂大街的引气法，修到头就是练气' },
    xuan:  { cap: 2, to: '筑基圆满', why: '小宗门外门水平' },
    di:    { cap: 3, to: '紫府三关', why: '大宗门内门/真传' },
    tian:  { cap: 4, to: '金丹',     why: '峰主级、世家嫡系' },
    xian:  { cap: 5, to: '道胎',     why: '传说，只在秘境' }
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
    }
  ];

  /* 坊市四类货架（丹药 / 功法 / 法器 / 材料） */

  const GONGFA_TIERS = {
    huang: { name: '黄阶', mul: 1.0, color: '#B0A48C' },
    xuan:  { name: '玄阶', mul: 1.3, color: '#7FA8C9' },
    di:    { name: '地阶', mul: 1.7, color: '#8B6FA8' },
    tian:  { name: '天阶', mul: 2.2, color: '#C9A45C' },
    xian:  { name: '仙阶', mul: 3.0, color: '#C05F55' }
  };

  const GONGFA = GONGFA_EXT.map(function (x) { return { id: x.id, name: x.name, tier: x.tier, el: x.el, eff: x.eff }; });

  /* ====== 体质 ====== */
  const BODIES = [
    { id: 'dao',   name: '先天道体', eff: '修为/香火转化 +50%', mul: 1.5 },
    { id: 'sword', name: '剑灵体',   eff: '斗法亲和', mul: 1.0 },
    { id: 'nine',  name: '九阳圣体', eff: '火系法术 +30%', mul: 1.0 },
    { id: 'ice',   name: '冰魄灵体', eff: '冰系法术 +30%', mul: 1.0 },
    { id: 'xuan',  name: '玄阴体',   eff: '双修增益', mul: 1.0 },
    { id: 'chun',  name: '纯阳体',   eff: '双修增益；免疫首次反噬', mul: 1.0 },
    { id: 'chaos', name: '混沌体',   eff: '传说：五行皆通', mul: 1.1, rare: true },
    { id: 'plain', name: '凡体',     eff: '无特殊', mul: 1.0 }
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
    { id: 'farm',    name: '农家子',       desc: '道心+2，无依无靠',             apply: { heart: 2 } },
    { id: 'hunt',    name: '猎户之后',     desc: '气血上限+20，熟悉山林',        apply: { hpFlat: 20 } },
    { id: 'merch',   name: '商贾之家',     desc: '灵石+300，仙缘+1',             apply: { stones: 300, fate: 1 } },
    { id: 'office',  name: '官宦子弟',     desc: '声望+20，可走大夏祀部线',      apply: { fame: 20 } },
    { id: 'army',    name: '将门之后',     desc: '道心+1、悟性+1',               apply: { heart: 1, insight: 1 } },
    { id: 'fallen',  name: '没落世家',     desc: '携先祖残卷（随机玄阶功法）',    apply: { scroll: true } },
    { id: 'orphan',  name: '市井孤儿',     desc: '遁速+2，三教九流皆识',          apply: { speed: 2 } },
    { id: 'scholar', name: '书香门第',     desc: '悟性+3，过目不忘',             apply: { insight: 3 } },
    { id: 'monk',    name: '方外遗孤',     desc: '资质+2，识科仪',               apply: { qualify: 2, ritual: true } },
    { id: 'demon',   name: '妖族后裔',     desc: '稀有：半妖之身',               apply: { halfDemon: true }, rare: true }
  ];

  /* ====== 法相（仅神道） ====== */
  const FAXIANG = [
    { id: 'g1',  zodiac: '龙', name: '山河障市真君', kw: '君，帝王，尊贵，龙，江山，地域，空间', opening: '香火最易做大局，扩张快，慢热' },
    { id: 'g2',  zodiac: '狗', name: '市井江湖真君', kw: '民，九流，烟火，人，饮食，风俗，时间', opening: '信众易得，精细处难' },
    { id: 'g3',  zodiac: '鸡', name: '关外北马真君', kw: '乱，村野，苦难，贼，畜生，动荡，迷信', opening: '乱世起家，越乱越强' },
    { id: 'g4',  zodiac: '马', name: '侠武乱禁真君', kw: '侠，武术，劳力，镖，功夫，宗师，乱禁', opening: '斗法最强，香火最薄' },
    { id: 'g5',  zodiac: '猴', name: '生死岐黄真君', kw: '医，诊病，医官，药，手术，接骨，济世', opening: '显圣最灵验，救人即聚香' },
    { id: 'g6',  zodiac: '蛇', name: '南洋邪灵真君', kw: '毒，诅咒，邪神，巫，蛊毒，灵媒，左道', opening: '灵验极快，业力极重' },
    { id: 'g7',  zodiac: '虎', name: '西传密藏真君', kw: '佛，密宗，普渡，藏，皈依，因果，轮回', opening: '护身超度，抗邪祟' },
    { id: 'g8',  zodiac: '羊', name: '天师法道真君', kw: '道，五行，长生，天，无为，出世，自然', opening: '最正统，符箓最强' },
    { id: 'g9',  zodiac: '牛', name: '神工百匠真君', kw: '匠，工艺，美，行，工业，造物，科学', opening: '造物生财，庙宇营建最快' },
    { id: 'g10', zodiac: '猪', name: '百无禁忌真君', kw: '脏，邪祟，尸体，死，葬，风水，忌讳', opening: '阴事专精，正祀不容' },
    { id: 'g11', zodiac: '鼠', name: '福宝衰运真君', kw: '命，生辰，商贾，运，八字，命理，玄学', opening: '财运最旺' },
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
    '闰位': { mul: 2.5, power: 3750,  rate: 60, cost: '每年「行泆」一次' },
    '余位': { mul: 4,   power: 6000,  rate: 40, cost: '正位一唤必到' },
    '正统': { mul: 7,   power: 10500, rate: 20, cost: '一举一动皆为天心' },
    '至尊': { mul: 15,  power: 22500, rate: 5,  cost: '天下共抢' }
  };

  /* ====== 锚（v6.2 核心：无寿元者靠锚） ====== */
  const ANCHOR_TYPES = [
    { id: 'wu', name: '物锚', xian: '金性、本命法宝、道统信物', shen: '庙中塑像、神箓、神位黑箓',
      solid: '存在且完好，未被夺、未破损', fixCost: '重铸金性需 10 年修为；重塑像需 1 万香火' },
    { id: 'ren', name: '人锚', xian: '亲传弟子（在世且未叛）／道侣／护道者', shen: '信众达本柱门槛／守庙人／上级城隍',
      solid: '人在、未散、未叛', fixCost: '收一名亲传要 20 年；信众散了要重走传教' },
    { id: 'shi', name: '事锚', xian: '未了的道（开道未成）或已立的法则', shen: '履职（牧民、镇灾、剿邪祀）',
      solid: '按期履职，未抗命、未弃职', fixCost: '把没做完的事做完' },
    { id: 'yi', name: '仪锚', xian: '续灯仪（每甲子一次，独坐七日七夜，不可中断）', shen: '岁时大醮（每年一场）＋晨昏三炷香（每日）',
      solid: '按期举行，一场不落', fixCost: '补办需双倍代价＋道心 −1，且不算按期' }
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

  /* ====== 宗门（据《苟在初圣魔门当人材》内外门结构） ======
     外门四殿 → 内门四峰 → 真传。真正的上乘神通只在真传层，
     非真传不可学。叛门立过誓，代价是修为倾泻。 */
  const SECT = {
    name: '青云宗',
    halls: ['炼宝殿', '炼丹殿', '御兽殿', '合欢殿'],
    peaks: ['补天峰', '赤霄峰', '藏锋峰', '丹霞峰'],
    ranks: [
      { id: 0, name: '记名弟子', need: 0,     pay: 0,   lvl: ['wai'],              equip: 2,
        desc: '外门一殿的杂役，无月俸，任务繁重' },
      { id: 1, name: '外门弟子', need: 500,   pay: 20,  lvl: ['wai', 'nei'],       equip: 3,
        desc: '得上供，可入藏经阁外门层与内门层' },
      { id: 2, name: '内门弟子', need: 2000,  pay: 60,  lvl: ['wai', 'nei'],       equip: 4,
        desc: '独立洞府，听调于本峰' },
      { id: 3, name: '真传',     need: 8000,  pay: 200, lvl: ['wai', 'nei', 'zhen'], equip: 5,
        desc: '藏经阁全开——真正厉害的神通都在这一层' },
      { id: 4, name: '长老',     need: 30000, pay: 600, lvl: ['wai', 'nei', 'zhen'], equip: 5,
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
        '他站在演武场边，青衫被风掀起来一角。你走近时，他没有回头，只把剑往鞘里送了半寸。',
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
        q: '你说，剑是快的好，还是稳的好？',
        opts: [
          { t: '「快。慢了就来不及。」', reply: '他摇头：「来不及的，本就不该出手。」', fav: 2 },
          { t: '「稳。稳到最后才出手。」', reply: '他看了你一眼：「这话，像我师父说的。」', fav: 5 },
          { t: '「看你怕什么。」', reply: '他愣住，很久才笑：「……这倒没想过。」', fav: 8 }
        ]
      }
    },
    {
      id: 'yunqi', name: '云栖', gender: '女', role: '天机坊市老板娘', age: 25,
      look: '聪慧狡黠，眼底藏着算计',
      likes: ['灵石', '奇闻', '算计'], approach: '陪她做局、共享情报', taboo: '别在她面前说谎',
      realm: 1, inner: '把人情算成一笔账，却总留一格给自己',
      meet: [
        '她坐在账台后头，面前的算盘没响，手指在珠子上一颗一颗地按着玩。',
        '「新来的？」她抬眼，「我这儿不问出处，只问你要买，还是要卖。」'
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
        q: '你说，这世上是人情重，还是灵石重？',
        opts: [
          { t: '「灵石。人情最不值钱。」', reply: '她笑出声：「痛快。我就喜欢跟痛快人做买卖。」', fav: 3 },
          { t: '「人情。钱花完了还能再挣。」', reply: '她拨算珠的手停了一下：「……你这人，做不成大生意。」', fav: 4 },
          { t: '「你问这个，是想听真话还是好话？」', reply: '她盯了你很久，忽然把账本合上：「真话。就这一次。」', fav: 8 }
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
        '一个少年蹲在树杈上啃灵果，果核往你脚边丢。',
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
        '她把一颗糖递到你嘴边，你没接，她就笑弯腰。',
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
    }
  ];
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
    { id: 'pilgrim', name: '有人来上香', kind: 'good', followers: 20,
      text: '天色刚亮就有人来了。是个背着孩子的妇人，跪下去时膝盖先着地，声音很实。她没求什么大事，只求孩子能平安长到十岁。',
      after: '她走的时候又回头拜了一次。你忽然想，这大概就是「灵验」最朴素的样子。',
      log: '有人来上香，信众渐众。' },
    { id: 'drought', name: '大旱', kind: 'risk',
      text: '三个月没下雨。田里的裂口能塞进一个拳头。有人跪在庙门外，从早上跪到日头偏西，一句话也不说。',
      after: '你看着他们走，忽然想起自己也曾这样求过谁。',
      log: '大旱。求雨者挤满庙门。' },
    { id: 'plague', name: '瘟疫', kind: 'risk',
      text: '先是西头几户人家咳嗽，半个月后，抬棺的人开始不够用。夜里风把白幡吹得哗哗响。',
      after: '你闻得到那股味道，绕过去了。你不是医者，也救不了这么多人。',
      log: '瘟疫蔓延，信众散其大半。' },
    { id: 'neighbor', name: '邻庙更灵', kind: 'risk',
      text: '有人在你庙门口站着，却不进来，转身往东边去了。东边那座庙这几个月很热闹，据说求什么都应。',
      after: '香火是会走的。它从来不留下来告别。',
      log: '邻庙更灵，香客改投他处。' },
    { id: 'prefect', name: '官府征调', kind: 'risk',
      text: '差役带着文书来，说上头要修渠，各家各庙需出人出钱。他念得很慢，念完看你，等你表态。',
      after: '你签了。办事的人走后，你在门口站了很久。',
      log: '官府征调，既出人，又出钱。' },
    { id: 'donor', name: '富户捐灵石', kind: 'good',
      text: '一个穿绸的胖子带着两个随从进来，供上一整袋灵石，磕头磕得很响。他求的不是长生，是明年那笔生意别出岔子。',
      after: '他走后，你把袋子倒出来数了数。数目不小，够修一整年屋顶。',
      log: '富户还愿，捐以灵石。' },
    { id: 'wander', name: '游方道士', kind: 'good',
      text: '一个背桃木剑的道士路过，在庙前停下，看了很久那块旧匾。他说：「这地方的气，是活的。」',
      after: '他不要香火钱，只讨了一碗水。喝完把碗倒扣在门槛上，走了。',
      log: '游方道士过此，留一句评语。' },
    { id: 'demon', name: '邪祟作乱', kind: 'risk',
      text: '夜里村东头的老槐树下有响动。第二天去看，树皮被剥了一整圈，露出里面发黑的白。',
      after: '你知道那不是野兽干的。野兽不会剥得这么齐整。',
      log: '邪祟作乱，人心惶惶。' },
    { id: 'draft', name: '朝廷册封', kind: 'good',
      text: '使者捧着黄绫来，当众宣读。名字念出来的时候，人群里有人小声重复了一遍。',
      after: '册封只是几张纸。但没有这几张纸，你就永远是个「野祀」。',
      log: '朝廷降下册封。' },
    { id: 'theft', name: '庙产被盗', kind: 'risk',
      text: '供桌下的暗格被人撬了。手法很稳，只拿值钱的，香炉铜器一件没动——是熟人，或者是熟人的熟人。',
      after: '你没有报官。这种事报官，丢的是脸，不是钱。',
      log: '庙产被盗，暗格见撬。' },
    { id: 'spirit', name: '灵脉异动', kind: 'good',
      text: '半夜地底传来一声闷响，像什么东西翻了个身。第二天你去看，井水清了半尺。',
      after: '灵气顺着地脉往上走。这一带的草木，接下来几年会长得比别处快。',
      log: '灵脉异动，采得一线好气。' },
    { id: 'storm', name: '暴雨毁庙', kind: 'risk',
      text: '雨下了三天三夜，山洪从后坡下来，冲塌了庙墙的一角。泥水灌进殿里，把塑像的脚泡软了。',
      after: '雨停后你一个人和泥、垒墙、补瓦。修了整整两天，手上全是血泡。',
      log: '暴雨毁庙，墙塌一角。' }
  ];

  /* ====== 结局 ====== */
  /* 结局：cond 为判定条件说明，test 决定是否命中（由 game.js 调用）
     12 个结局，按「先死而后生」的顺序判定 */
  const ENDINGS = [
    { id: 'sit', name: '坐化', kind: 'death', cond: '寿元尽',
      text: '你在蒲团上坐了很久。久到山下的村子换了三代人，久到没人再记得这座洞府住过谁。',
      after: '最后那口气散的时候，你其实还想再看一眼春天。',
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
               '洞口花开，未曾出看，只听风里多了甜意。'],
      summer: ['洞中比外凉。暑气最盛之日，修得反快。',
               '蝉声自洞口漫入。此境太静，一声蝉亦觉吵。'],
      autumn: ['秋气清，宜采气。起身时石台已落薄尘。',
               '风卷落叶入洞。未曾扫，看其一日日干透。'],
      winter: ['霜封洞口。吐纳时白气凝空，久不散。',
               '柴尽，懒去砍。修士不畏冷，唯余寂寞。']
    },
    market: {
      spring: ['开春头集，摊自街口摆至河边。有人认出，唤一声道号。',
               '卖花老妇换成年轻女子，言其母病，代一年。'],
      summer: ['暑天无人愿挤。摊主移货树荫，懒声喊价。',
               '冰镇灵果卖得最好。买一颗，边走边食，凉至心底。'],
      autumn: ['新货下山时。灵材丹药堆满案，价却比往年高。',
               '有人低声兜售来路不明残卷。摆手，其人转瞬没入人群。'],
      winter: ['冬市开得早，散得也早。日头一斜，街便空了。',
               '雪落摊布，货主且扫且骂天。立于此，忽觉此地甚似人间。']
    },
    wild: {
      spring: ['雪化泥软，嫩芽初出。行半日，只见一窝睁眼野兔。',
               '溪水涨了。石上歇脚，见水底细光一闪而过。'],
      summer: ['草木最盛，亦最毒。树下坐一炷香，起时衣角尽湿。',
               '蝉噪甚急。循声过去，只见一具被啃尽兽骨。'],
      autumn: ['山中秋来得急。上次所留记号，已被落叶盖尽。',
               '远处有人烧纸。灰飘过来，落在袖口。'],
      winter: ['雪埋山路。踩下陷至膝，行一步，须拔一次。',
               '冷得反常。手缩袖中，忽忆多年前某个冬日。']
    },
    sect: {
      spring: ['山门桃开。执事弟子树下点名，念到道号时抬了下头。',
               '钟响三下。春日里此声总显得比别季远。'],
      summer: ['丹房炉火整日不熄。隔壁峰来借火种，走时顺走两块炭。',
               '演武场晒得发白。只余数人尚练，汗把衣衫浸成深色。'],
      autumn: ['秋试将近，藏经阁一位难求。廊下立半日方得空。',
               '峰主路过停了一步，看一眼，什么也未说。'],
      winter: ['雪压殿顶。值夜弟子缩在檐下，见之行礼，手都在抖。',
               '冬日宗门最静。静得能听见心底那点算盘声。']
    },
    temple: {
      spring: ['庙前杏花开。上香者比上月多几个，供桌果子换了新的。',
               '有孩子在庙门口追跑，被娘拽回去按着磕头。'],
      summer: ['大暑。求雨者一日多过一日，香灰积了厚厚一层。',
               '庙里闷热。把供桌往前挪了挪，让穿堂风能过。'],
      autumn: ['秋收后来还愿者排至门外。有人放下半袋米，说声多谢，便走。',
               '香火钱串成一条线。夜里数过，比上月多一百二十。'],
      winter: ['雪封庙门，只有三两人来。他们在门槛外跺脚，把雪跺化了才进来。',
               '半夜有人敲门。开门是个冻僵货郎，让其在灶边歇了一夜。']
    }
  };

  /* 特殊场景：优先级最高，命中时覆盖常规组合 */
  const SCENES_SPECIAL = {
    breakXian: ['天还没亮你就醒了。气海里那片东西在动，像有什么要出来。'],
    breakShen: ['香火一夜没断。你知道，今天有件事要成。'],
    hurt: ['伤口在阴天里发痒。你按了按，知道它还没长好。'],
    closure: ['出关的那天，你站在洞口，光刺得睁不开眼。原来外面已经换了季节。'],
    visitor: ['门外有人咳嗽了一声。'],
    drought: ['天旱了几个月。你抬头看，天上连云都没有。'],
    demon: ['最近夜里不太平。山那头有人见过不该见的东西。'],
    enemy: ['你已经感觉到有人在跟着你。跟了三天了，不远不近。']
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
    }
  ];

  /* ====== 诗词歌诀：突破 / 地名 / 结局 / 功法题诗 ====== */
  const VERSES = {
    /* 破境诗句：同一境界给三句，每次随机一句——旧版每境只有一句，
       玩家二周目会发现「怎么还是这句」，惊喜立刻变成例行公事。 */
    breakXian: [
      { realm: 1, line: '气海初生一寸波，凡人到此始知身。' },
      { realm: 1, line: '六轮转过无人见，忽有一声出骨中。' },
      { realm: 1, line: '未曾问道先问气，气到深时道自来。' },
      { realm: 2, line: '九层踏尽无阶梯，回首方知路是身。' },
      { realm: 2, line: '一身凡骨烧成灰，灰里拾得一块石。' },
      { realm: 2, line: '铸基是夜无风起，唯闻身内有物沉。' },
      { realm: 3, line: '石沉海底无人问，三关过后月当门。' },
      { realm: 3, line: '升阳蒙昧连幻想，第三关内唯己身。' },
      { realm: 3, line: '推门入府四壁空，空处始为吾有。' },
      { realm: 4, line: '一点金性凝不散，三十位上添一名。' },
      { realm: 4, line: '自此天地皆为客，独留此身作主。' },
      { realm: 4, line: '天心假手其一用，用得其道不复收。' },
      { realm: 5, line: '形蜕而神存，死生不复为形役。' },
      { realm: 5, line: '寿元栏下空如也，不问生年问钉者。' },
      { realm: 5, line: '不问天许几寒暑，只问此身犹认谁。' }
    ],
    breakStage: [
      { realm: 0, line: '一轮一转一呼吸，六轮转尽是胎息。' },
      { realm: 1, line: '层层皆是骨，行至第九层，骨自成梯。' },
      { realm: 2, line: '印未满时路未尽，一步一印皆自证。' },
      { realm: 3, line: '三关之外复有关，无人为汝数。' }
    ],
    fail: [
      '气机逆冲玉京碎，此关汝过不去。',
      '弦断无声，坐久方忆当喘。',
      '所差者，一口炁耳。',
      '炉倾无火，经走逆行，血响耳后。',
      '天门开一线，复合，未及窥其中。',
      '非输于天，输于自多想半息。'
    ],
    breakShen: [
      { pillar: 1, line: '一炷香起于草野，八方风来入此门。' },
      { pillar: 1, line: '供桌冷馒头，犹有跪诵者。' },
      { pillar: 2, line: '香不在多，在有人雨中立一夜。' },
      { pillar: 3, line: '人有求处即有神，神无应时便作泥。' },
      { pillar: 4, line: '分灵四方，地名渐忘，独记烟形。' },
      { pillar: 5, line: '州郡之祀非所求，所求者，记得之人。' },
      { pillar: 6, line: '司命不掌生死，只掌记得二字。' },
      { pillar: 7, line: '法相立处山河静，此身已是此方。' }
    ],
    places: {
      qingyue: '青岳不言，雪落其上，千年如一日。',
      nanyue: '赤炎之南，火脉如蛇行地底，昼伏夜出。',
      xisha: '流沙吞过城，也吞过名字。',
      beiyuan: '北原的雪落半年，剩下的半年，是等它落。',
      zhongzhou: '天阙之下，三十个位，都有人了。'
    },
    ending: {
      ascend: '问道者不问归途。',
      daotai: '我以我心，代天之心。',
      zhenjun: '此方水土认了我，我便守着它。',
      guowei: '三十个位，终于有一个写了我的名字。',
      sit: '坐到最后，你其实还想再看一眼春天。',
      daohua: '山雾里多了一缕，不属于任何人的气。',
      fall: '血溅当场。连一句遗言都没说完。',
      reinc: '纸页烧尽，你还在这里，只是又不记得了。',
      xiaoyao: '活得比谁都久，且始终是自己在活。',
      xianzun: '东洲提起你的名字，要先停一停。',
      modao: '走过的路上，没有一寸是干净的。',
      shizun: '一方佛国，一念之间。'
    },
    gongfa: [
      '剑在匣中鸣三十年，无人知是血磨成。',
      '一炉火候三年候，丹成那日人不归。',
      '水到渠成处，才知渠是自己挖的。',
      '符成三张，命只一条。',
      '阵在人在，阵亡人亡。',
      '雷落九霄不问因，只问此身可敢立。',
      '月照寒潭，潭中有个月亮，比天上的旧。',
      '山不动，我动；山若动，我已在此。'
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
        want: '替它杀一个人',
        effect: { karma: 25 },
        refuse: { karma: 20, hpPct: -0.4, debuff: 'borrowed_luck' } } },

    { id: 'hook_voice', from: '洞天深处的念诵声', fromRank: 5, given: '天阶功法',
      hint: '你跟着念的时候，听见自己的声音慢了半拍',
      known: false, due: { kind: 'realm', at: 5 },
      claim: { text: '你在镜子里看见自己的脸，正在笑——而你并没有笑。',
        want: '你的身体',
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
        want: '一个继承你道统的后代',
        effect: { lifePct: -0.1, merit: 20 },
        refuse: { karma: 10, hpPct: -0.2, debuff: 'debt_weight' } } },

    { id: 'hook_dowry', from: '联姻之家', fromRank: 3, given: '资源与人情',
      hint: '送来的礼单上，写的是「聘」不是「贺」',
      known: true, due: { kind: 'year', at: 10 },
      claim: { text: '媒人带着庚帖上门，笑得比十年前还热络。',
        want: '履行婚约',
        effect: { fame: 60 },
        refuse: { karma: 20, hpPct: -0.2, debuff: 'debt_weight' } } }
  ];

  /* ====== 导出 ====== */
  G.WXCS3_DATA = {
    STATS, CULTIVATION,
    XIAN_REALMS, XIANJI, QI_TO_DAOTONG,
    LINGQI, ROOTS, ELEMENTS, MUT_ELEMENTS,
    GONGFA_TIERS, GONGFA, BODIES, TALENTS, ORIGINS,
    FAXIANG, ZODIAC_CLASH,
    PILLARS, POSITIONS, PIETY, MIAO_COEFF, QIHE, FOLLOW_LIMIT, BREAK_BASE,
    TIANJIANG, DIZHA, GUOWEI, GUOWEI_RANK,
    ANCHOR_TYPES, ANCHOR_STATES, ANCHOR_STATUS, RITUALS,
    LU, DAOTONG, SANXUAN, SHENTONG,
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
    ZHENJUN
  };
})(window);
