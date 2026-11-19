# 目录结构（2026-11-18 整理 · 源码分层后更新）

一句话：**根目录只留入口、运行源码与总入口文档；素材、文档、工具、构建壳、归档各有各的家。**

```
03_v6.2_仙道为主/
├─ 问道长生v6.html          入口页（只含 CSS 与骨架，脚本外链）
│
├─ ── 运行源码（加载顺序即下方顺序）──
├─ wxcs3-data.js            数据层：全部表 107 张（境界/功法/事件/NPC/插画键…）
├─ wxcs3-art.js             插画层：ART_DATA 优先，缺图回落 art/scenes/*.jpg
├─ wxcs3-rules.js           纯规则层：34 个不碰 DOM、不写 S 的函数（含 SAVE_VER；v9.0 第2步新增）
├─ wxcs3-game.js            规则与 UI：约 390 函数 / 175 个 ACT 入口（M1 后只留薄缝）
├─ wxcs3-icons.js           图标层：内联 SVG（48 行 / 12KB）
├─ wxcs3-ext-10-fate.js        扩展：道痕命格（v9.0 M1）——六系命格、进阶、重悟
├─ wxcs3-ext-20-trib.js        扩展：五类天劫增强（v9.0 M1）——行为权重、劫类失败余波、破境预览
├─ wxcs3-ext-30-build.js       扩展：构筑面板（v9.0 M1）——命格/天劫/功法/开销一页汇总
├─ wxcs3-ext-40-benming.js     扩展：本命法器四阶（v9.0 M2）——认主/通灵/共命/合道、法技、器损反噬
├─ wxcs3-ext-50-beast.js       扩展：灵兽第四位（v9.0 M2）——亲密/妖力两轴、听令/护主/叛逃、封兽官
├─ wxcs3-ext-60-gongfa.js      扩展：功法个体差异（v10.1 第二梯队）——eff 结构化、施法乘区、常驻修正
├─ wxcs3-ext-70-root.js        扩展：灵根差异（v10.1 第二梯队）——战力出口、多系副属、香火五档
├─ wxcs3-ext-80-gate.js        扩展：破境瓶颈（v10.1 第三梯队）——表驱动条件门槛 + 解法说明
├─ wxcs3-ext-90-revive.js      扩展：死表盘活（v10.1 第三梯队）——PIETY 档位/QIHE 三态/法相五行/悟道点
├─ wxcs3-ext-91-disciple.js    扩展：师徒四出路（v9.0 M3）——留山执事/遣出历练/先亡葬礼/结构式叛师
├─ wxcs3-ext-92-school.js      扩展：轻量道统（v9.0 M3）——道号/三门规/讲道/迁山门/声望与维护费
├─ wxcs3-ext-93-timed.js       扩展：时限事件与属性分档（v9.0 M3）——五类约期、神识/道心/仙缘/遁速出口
├─ wxcs3-ext-94-ruin.js        扩展：上古遗迹（v9.0 M4）——7 处遗址、5~7 节点、机关守关、三选一、遗物乘区
├─ wxcs3-ext-95-fruit.js       扩展：百世道果（v9.0 M4）——六类来世信息、旧庙月账、血债命格候选
├─ wxcs3-ext-demo.js        扩展模板：新玩法照抄改名（v9.0 第1步新增）
│
├─ README.md                项目总说明（玩法、版本、构建）
├─ STRUCTURE.md             本文件
│
├─ art/                     插画素材与管线（原始大图不入库）
│  ├─ scenes/               交付用 JPEG 33 张 5.6MB（构建时转 base64 内嵌 dist）
│  ├─ generated/            生成原图 36 张（含样张与 art/ 子目录）
│  ├─ vibe/                 风格探索图
│  └─ pipeline/             art_batch1~4.json、compress_art.py
│
├─ docs/                    文档，按主题分号
│  ├─ 00_项目地图.md         文件体量与函数定位（改代码前先读）
│  ├─ 01_审查与诊断/         评审、诊断、落地记录、变更记录
│  ├─ 02_平台部署/           APK / Electron / 部署依赖
│  ├─ 03_玩法设计/           玩法方案、行动预算分档表
│  ├─ 04_叙事与文本/         文本素材与文风规矩
│  ├─ 05_架构方案/           后端化、架构评审、源码拆分
│  ├─ 06_界面视觉/           插画规格、方案、生成进度
│  └─ 99_归档/               过期文档
│
├─ tools/                   测试与检查
│  ├─ test_*.js             断言：v80 / play / econ / hooks / loops / text / m1 / m2 / m3 / m4 / beast_disciple / rank / tier2 / tier3 / gate_e2e / reachability / save / p1 / p0_v104 / p1_v104 / p2_v104
│  ├─ smoke_econ.js         DOM 桩真跑运行时（经济面 32 项，含四渠道无套利）
│  ├─ check_ach.js         成就可达性
│  ├─ check_actions.py     动作分发覆盖
│  ├─ check_time.py        行动预算口径（读 docs/03 分档表）
│  └─ sim_*.js             模拟：战斗 / 信众 / 天劫
│
├─ mobile/                  移动端
│  ├─ build.py              HTML+四个 JS → 单文件（含插画 base64 注入、自动收 ext）
│  ├─ sync_apk.py           同步到 D:\wendao-apk（HBuilderX 工程）
│  ├─ apk/wendao/           随仓库走的 HBuilderX 模板
│  ├─ mobile.css / icons / splash.png
│  └─ dist/                 构建产物（gitignore）
│
├─ desktop/                 Electron 桌面版
│  ├─ main.js / preload.js  主进程与预加载
│  ├─ scripts/sync-app.js   把 dist 页面搬进 app/ 并补 CSP
│  ├─ assets/icon.ico       程序图标
│  ├─ release_v10.3_final/ 当前打包产物（v10.3 P0 修复版，gitignore）
│  ├─ release_v10.3/        v10.3 中途产物（gitignore；被占用删不掉，勿分发）
│  ├─ release_m4/           上一轮产物（gitignore；含存档 bug，勿再分发）
│  └─ release*/            历史中间包（gitignore；含体积异常与占用锁的旧目录，可自行清理）
│
├─ _archive/                归档：只增不删
│  ├─ shots/                历史截图
│  ├─ tmp/                  临时产物
│  ├─ loomy-attachments/    会话附件
│  ├─ docs-duplicates/      与 docs 重复的副本
│  └─ 小说参考/              165MB 参考文本（不入库）
│
└─ _backup/                 每次开工前的手工快照（不入库）
```

## 源码分层约定（v9.0 第1、2 步）

三层职责固定，加新东西时对号入座：

| 层 | 文件 | 放什么 | 判据 |
|---|---|---|---|
| 数据 | `wxcs3-data.js` | 纯表：数值、文案、词库 | 被引用而从不主动调函数 |
| 规则 | `wxcs3-rules.js` | 纯计算与查表 | **不碰 DOM、不写 `S`、不产 HTML** |
| 表现 | `wxcs3-game.js` | 状态、渲染、ACT | 其余全部 |

**新玩法一律写 `wxcs3-ext-<名字>.js`，不要再往 `game.js` 里堆。**
`build.py` 自动扫描该模式并按文件名排序内联；开发页 `问道长生v6.html` 也直接列出 `<script>` 标签，
**新增扩展要同时改构建扫描与 HTML 两处**，否则 dev 页面加载不到。

扩展骨架的四条约定（详见 `wxcs3-ext-demo.js` 文件头）：

1. **不要缓存 `S`**。`G.WXCS3.S` 是 getter，读档时内部会换成新对象；缓存后在函数外持有旧引用，写操作会静默写到废对象上，且不报错。
2. 动作注册到 `G.WXCS3_EXT_ACT`，沿用 `data-act="do;名字:参数"` 写法，`dispatch` 会自动转发。
3. 占不占旬自己负责，并在 `docs/03_玩法设计/行动预算_分档表.md` 登记，否则 `check_time.py` 会报未分类。
4. 只做加法。要改老玩法，回 `game.js` 改，不在扩展里打猴补丁。

### M1 扩展协作模式一：乘区注册表

多个扩展要改同一处数值时，用 `EXT.registerMul(kind, fn)` / `EXT.registerAdd(kind, fn)` 注册，
`game.js` 里只留一行薄缝 `fateMul(kind)` / `fateAdd(kind)`（wxcs3-game.js 导出块）逐个询问注册者并连乘/累加。
目前 kind：`pill / cult / sword / tal / xs / dmg / loot / venv / book / flee / defl`。
谁注册了什么见 `wxcs3-ext-10-fate.js`（命格效果）与 `wxcs3-ext-20-trib.js`（风劫淬体削伤）。

### M2 扩展协作模式二：钩子注册数组

M2 发现：单个函数槽位（`EXT.fightRows = ...`）会被后加载的扩展覆盖——多个扩展同时挂战斗 UI 就得排队。
所以 M2 起凡是「多方都要发言」的位置一律用注册数组，`game.js` 薄缝只负责遍历：

| 数组 | 语义 | 返回 |
|---|---|---|
| `EXT.preFightRowsHooks` | 战前准备页追加选项 | HTML 串 |
| `EXT.fightInfoHooks` | 战斗我方面板追加状态行 | HTML 串 |
| `EXT.fightRowsHooks` | 战斗回合按钮追加 | optRow HTML 串数组 |
| `EXT.combatActHooks` | `do;cbt:ext:*` 动作认领 | `{dmg,note}` / `'stop'` / null |
| `EXT.foeHooks` | 敌方回合拦截（在扣玩家血**之前**） | true＝已结算 |
| `EXT.onMonthHooks` | 月结追加（扩展内部自保 `phase !== 'play'`） | — |

注册者：40-benming（本命出鞘/血条/法技/挡击/反噬）与 50-beast（兽血条/兽令/护主反噬/叛逃）。
顺序即加载序（文件名前缀），数组下标可测：foeHooks[0]=本命、[1]=灵兽。
另有两个单件口不属于数组：`EXT.fixedCosts2()`（月账第二条缝，benming 温养 + beast 兽官俸禄）与
`EXT.benmingArtBonus(kind)`（认主加持翻倍，game.js `artBonus` 里加回一遍）。

### M3 扩展协作模式三：薄缝 + 链式包装

M3 的四个玩法（师徒/道统/时限/属性）都只往既有面板与结算上「补一行」，game.js 继续收薄：

| 缝 | 扩展出口 | 用在哪 |
|---|---|---|
| 收徒门槛 | `EXT.schoolAdmitFav()` | 候选筛选 + `do_dpadd` 二次把关 |
| 门下面板行 | `EXT.discipleRows(d)` | 留山/免差/遣出历练 |
| 出师结算 | `EXT.schoolOnGraduate(d)` | 道统声望 |
| 论道 | `EXT.schoolOnTalk(n,id)` | 每人每月一次声望 |
| 问心选项 | `EXT.askExtraRows(n,id)` | 道心 ≥13 |
| 来意/拍品暗线 | `EXT.npcIntentLine` / `EXT.auctionHint` | 神识 ≥13 |
| 月账 | `EXT.fixedCosts2()` 链式包一层 | 91 弟子供奉、92 山门维护 |
| 指令坞 | `EXT.dockItems()` 链式包一层 | 92「统」、93「急」 |
| 月结 | `EXT.onMonthHooks` | 弟子月结/欠缴预警 |

名字避让：`S.daotong` 是五行道统字符串，组织状态用 `S.school`；时限事件 `S.timed` + `S.timedDone`。
扩展文件名用 91/92/93：`build.py` 用 Python `sorted()` 字典序，`100-*` 会排到 `10-*` 前面。

### M4 扩展协作模式四：状态迁移 + 创角结算

遗迹与道果不改既有结算，只加新的状态块与几个一次性接缝：

| 缝 | 扩展出口 | 用在哪 |
|---|---|---|
| 舆图 | `EXT.mapRows()` | 已知/已探尽遗址 |
| 历练 | `EXT.exploreRows()` | 「访古」入口 |
| 线索 | `EXT.onBookRead` / `EXT.onAuctionWin` / `EXT.onNpcTalk` | 道书二读 / 拍卖残图 / 故人高好感 |
| 遗物乘区 | `EXT.registerMul(kind, fn)` + `S.relics` | 七件遗物各加一处，不另开战斗数值 |
| 月账 | `EXT.fixedCosts2()` 链式包一层 | 旧庙残香每月 −15 香火（仅神道/双修且带庙） |
| 创角 | `EXT.fruitBanner()` / `EXT.applyFruit()` | 第一屏展示道果；创角完成时兑现一次 |
| 轮回 | `EXT.fruitSnapshot()` | `do_legacy` / `do_rebor` 重置前取快照 |

名字避让：遗迹探索进度用 `S.ruin`，已知/已探尽用 `S.ruinsKnown` / `S.ruinsCleared`，
遗物收藏用 `S.relics`，道果用 `S.daoFruit`。`S.ruin` 只存当前一趟，读档可续；
已探尽按 id 永久记。扩展文件名 94/95，仍遵守 100 以下前缀。

### 判断一个函数能否搬进 `rules.js`

不看它自己写了什么，**看它调用链上还有谁在读 `S`**。实测例子：

| 函数 | 看起来 | 实际 | 结论 |
|---|---|---|---|
| `currentGoal` | 只调 `goalsForLine` | `goalDone` 读 `S.goals` | 留 game |
| `dArtUpkeep` | 只是求和 | `dArtRaw` 读 `S.dArt` | 留 game |
| `fmtNum` | 格式化 | 只依赖参数 | ✅ 可搬 |

## 常用命令

```bash
# 断言与检查（全绿 = 886 条断言 + 三项检查）
node tools/test_v80.js && node tools/test_play.js && node tools/test_loops.js
node tools/test_hooks.js && node tools/test_econ.js && node tools/test_text.js
node tools/test_beast_disciple.js && node tools/smoke_econ.js
node tools/test_m1.js && node tools/test_m2.js && node tools/test_m3.js && node tools/test_m4.js
node tools/test_reachability.js && node tools/test_tier2.js && node tools/test_tier3.js
node tools/test_gate_e2e.js && node tools/test_save.js && node tools/test_p1.js
node tools/test_p0_v104.js && node tools/test_p1_v104.js && node tools/test_p2_v104.js
python tools/check_actions.py && python tools/check_time.py && node tools/check_ach.js

# 网页单文件
python mobile/build.py            # → mobile/dist/index.html（插画已 base64 内嵌）

# APK 工程
python mobile/sync_apk.py         # → D:\wendao-apk，HBuilderX 里云打包

# 桌面版
cd desktop && npm run pack        # → desktop/release_m4/（v10.3 起因旧包被占用，成品在 release_v10.3_final/）

# 插画压缩（原图 → 交付图）
python art/pipeline/compress_art.py
```

## 放置约定

- **新插画原图** → `art/generated/art/<键名>.png`，压缩后进 `art/scenes/<键名>.jpg`；键名与 `wxcs3-art.js` 的 `KEYS`、`compress_art.py` 的 `KEYS` 三处必须一致。
- **新文档** → `docs/` 下对应主题号，不在根目录新增散文档。
- **过期/重复文档** → `_archive/docs-duplicates/`，不直接删。
- **临时文件** → `_archive/tmp/` 或系统临时目录，不在根目录建 `.tmp`。
- **构建产物**（dist / release_m4 / app）→ 各自目录内，已 gitignore。
- **打包忽略规则**：`package.json` 的 `pack` 里有一串 `--ignore`，必须挡住 `art/`、`_archive/`、`_backup/`、`docs/`、`mobile/`、`tools/` 等。漏了会把 1.5 GB 素材塞进 `app.asar`（本轮踩过）。

## 本轮搬迁对照（只移动，未删除任何文件）

| 原位置 | 新位置 |
|---|---|
| `assets/scenes/` | `art/scenes/` |
| `generated-images/` | `art/generated/` |
| `vibe_images/` | `art/vibe/` |
| `tools/art_batch*.json`、`tools/compress_art.py` | `art/pipeline/` |
| `_shots/` | `_archive/shots/` |
| `.tmp/` | `_archive/tmp/` |
| `.loomy-attachments/` | `_archive/loomy-attachments/` |
| `小说参考/` | `_archive/小说参考/` |
| `项目地图.md` | `docs/00_项目地图.md` |
| 根目录重复的 `项目进度与优化方向_20261118.md` | `_archive/docs-duplicates/` |
| 根目录重复的 `v9.0_下一版方案_道承百世_20261118.md` | `_archive/docs-duplicates/`（与 `docs/03` 内容 MD5 一致） |

搬迁后素材零丢失：69 个图片文件的 MD5 在移动前后逐一比对，全部一致。
