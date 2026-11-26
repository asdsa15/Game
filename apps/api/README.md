# @wendao/api · 问道长生服务端

账号、云存档、结局榜、内容版本。**第一批（P4a）已落地并通过 53 项测试**，第 6 节列出还没做的。

```
Fastify 5 + TypeScript  →  PostgreSQL 16
                          (Redis 暂不引入，理由见 §5)
运行时：Node 22（原生跑 .ts，无构建产物）
```

---

## 一、快速开始

### 用 Docker（推荐，库和 API 一起起）

```bash
cd apps/api
cp .env.example .env
# 生成一个像样的密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # 填进 .env 的 JWT_SECRET

docker compose up -d --build
curl -s localhost:8787/healthz
```

`db/001_init.sql` 已经挂到 Postgres 的 `docker-entrypoint-initdb.d`，首次启动自动建表。

### 用本机 Postgres

```bash
cp .env.example .env          # 改 DATABASE_URL
npm install
npm run db:init               # 建表（可重复执行）
npm run db:seed               # 造演示账号 demo@wendao.local / demo12345
npm run dev                   # http://127.0.0.1:8787
```

### 测试

```bash
npm test        # 53 项：账号/存档/结局/榜单/纯函数
npm run typecheck
```

测试库用 **PGlite**（真正的 Postgres 编译成 WASM，进程内运行）。
不用 pg-mem：`jsonb`、表达式唯一索引、`for update`、`interval` 运算它都只支持一部分，
用不完整的模拟库测出来的"通过"没有意义；PGlite 是同一个引擎，语义一致，且不需要 Docker。

---

## 二、接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/healthz` | — | 探活（含数据库连通性） |
| POST | `/auth/register` | — | `{email, password, nickname}` → 201 |
| POST | `/auth/login` | — | `{email, password}` |
| POST | `/auth/refresh` | cookie | 轮换 refresh，旧令牌立即作废 |
| POST | `/auth/logout` | cookie | 撤销并清 cookie → 204 |
| GET | `/me` | Bearer | 当前账号 |
| GET | `/saves` | Bearer | 槽位列表（只回 meta，不回 state） |
| GET | `/saves/:slot` | Bearer | 单档（含 state） |
| PUT | `/saves/:slot` | Bearer + `If-Match` | 只收 `wendao-save` v2；版本冲突 409 |
| POST | `/saves/:slot/import` | Bearer | 旧档导入（`wxcs3-save` 信封或裸 state） |
| DELETE | `/saves/:slot` | Bearer | 删档 |
| POST | `/runs` | Bearer | 上报一次结局，分数由服务端算 |
| GET | `/runs/mine` | Bearer | 自己的历史（最近 20 条） |
| GET | `/leaderboard?board=score\|realm\|age` | — | 榜单，每人只取最好那条 |

错误统一为：

```json
{ "error": { "code": "SAVE_CONFLICT", "message": "存档版本冲突：服务器上是第 3 版",
             "details": { "currentVersion": 3 } } }
```

前端只认 `code`，不认 `message`（消息会改，code 不会）。

---

## 三、云存档的三条约定

1. **服务端不解析游戏状态**。`state` 存 `jsonb`，服务端只校验信封（format / version / seed / savedAt）与体积。
   规则内核（`packages/core`）还没定稿，此刻强校验 210 个字段，等于每加一个玩法就改一次服务端。
2. **并发用版本号**。`PUT` 带 `If-Match: <version>`，不一致返回 409 并把当前版本号回给客户端，
   由玩家决定"覆盖"还是"另存"——而不是服务端替他选。
3. **旧档显式迁移**。旧版靠"字段已兜底"容忍未知版本，结果是玩家以为存上了、其实读不回来。
   现在 `POST /saves/:slot/import` 收旧信封，规整成 v2 并回报 `migratedFrom`；认不出来就 400。

导入示例：

```bash
curl -s -X POST localhost:8787/saves/1/import \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  --data-binary @旧存档.json
# → { "slot":1, "version":1, "migratedFrom":"legacy/10.2", "meta":{"dao":"陈玄","realm":3} }
```

---

## 四、账号与令牌

| | access token | refresh token |
|---|---|---|
| 形态 | JWT HS256 | 32 字节随机串 |
| 有效期 | 15 分钟 | 30 天 |
| 存放 | 前端内存 | httpOnly cookie（`Path=/auth`, `SameSite=Lax`） |
| 可撤销 | 否 | 是（库里存 sha256，可轮换、可全端撤销） |

不用"长效 JWT"是刻意的：JWT 签出去就撤不回来，登出等于没登出。
口令散列用标准库 `scrypt`（RFC 7914），不引 argon2——后者要原生编译，CI 上装不上就整条链路卡死。

---

## 五、两处刻意的"不"

**不引 ORM。** 全服务查询不到 20 条，都是一表一句；schema 就是 `db/001_init.sql`，评审一眼看完。
表超过 15 张或需要回滚脚本时再引迁移框架，那时才划算。

**不引 Redis。** 榜单直接走 PostgreSQL：单机文字游戏榜单读 QPS 极低，`runs` 上的复合索引足够。
多引一个 Redis 只是多一份运维和一致性负担。切换点写在 `src/routes/leaderboard.ts` 注释里：
reads > 50 QPS 或 runs > 500 万行时改 Redis zset。

**防作弊现状。** `POST /runs` 不收客户端分数，服务端按 `lib/score.ts` 的公式算（境界×1000 + 寿元×10 + 结局档次），
客户端改分无效。但这只是"改分无用"，还不是"过程可信"——完整做法是用 `{seed, commands}` 重放一遍，
等 `packages/core` 落地后替换，那时 `verified` 才会置 true。新增结局必须先在 `ENDING_BONUS` 登记档次，否则接口会 400。

---

## 六、还没做（按方案排期）

| 项 | 批次 |
|---|---|
| 用 core 重放校验结局（`verified` 置 true） | P4b |
| 内容版本下发 `/content/version` `/content/:table` | P5 |
| 运营后台的表编辑、diff、灰度发布 | P5 |
| Sentry、结构化审计日志、备份演练 | P6 |
| 限流上 Redis（多实例部署时） | P6 |

---

## 七、目录

```
apps/api/
├─ db/001_init.sql        建表（可重复执行）
├─ scripts/db-init.ts     建表命令
├─ scripts/db-seed.ts     演示数据
├─ src/
│  ├─ env.ts              配置唯一真源（zod 启动即校验）
│  ├─ db.ts               查询/事务唯一入口
│  ├─ app.ts              组装 Fastify（可注入 db，便于测试）
│  ├─ server.ts           启动与优雅关闭
│  ├─ lib/{password,tokens,save,score,errors}.ts
│  ├─ repo/{users,refresh,saves,runs}.ts
│  └─ routes/{health,auth,saves,runs,leaderboard}.ts
└─ test/{helpers,auth,saves,runs,leaderboard,unit}.test.ts
```
