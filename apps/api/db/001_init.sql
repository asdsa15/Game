-- 问道长生 · 服务端 schema v1
-- 目标库：PostgreSQL 14+
-- 约定：
--   1) 主键由应用层生成（crypto.randomUUID），DDL 不依赖 pgcrypto 扩展，便于测试库与托管库一致。
--   2) 所有时间列用 timestamptz，禁止 timestamp（时区丢失会污染榜单排序）。
--   3) 玩家状态整体存 jsonb：规则内核尚未定稿，服务端不做字段级解析，
--      只校验信封（format/version/seed/savedAt）与体积上限。等 core 落地后再加生成列与索引。
--   4) 唯一性一律走显式 unique index，便于后续 CONCURRENTLY 重建。

-- ---------------------------------------------------------------- 账号
create table if not exists users (
  id          uuid        primary key,
  email       text        not null,
  pass_hash   text        not null,
  nickname    text        not null,
  role        text        not null default 'player',
  created_at  timestamptz not null default now(),
  constraint users_role_chk check (role in ('player', 'editor', 'admin'))
);

-- 邮箱大小写不敏感：应用层统一小写写入，这里再兜一道
create unique index if not exists users_email_uq on users (lower(email));

-- ---------------------------------------------------------------- 刷新令牌
-- 存 sha256，不存明文。轮换时写 replaced_by，便于追一条链。
create table if not exists refresh_tokens (
  id          uuid        primary key,
  user_id     uuid        not null references users (id) on delete cascade,
  token_hash  text        not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  replaced_by uuid,
  created_at  timestamptz not null default now()
);

create unique index if not exists refresh_tokens_hash_uq on refresh_tokens (token_hash);
create index if not exists refresh_tokens_user_idx on refresh_tokens (user_id);

-- ---------------------------------------------------------------- 云存档
create table if not exists saves (
  id              uuid        primary key,
  user_id         uuid        not null references users (id) on delete cascade,
  slot            integer     not null,
  version         integer     not null default 1,
  content_version text        not null,
  seed            text        not null,
  state           jsonb       not null,
  meta            jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint saves_slot_chk check (slot >= 0 and slot <= 9)
);

create unique index if not exists saves_user_slot_uq on saves (user_id, slot);
create index if not exists saves_user_updated_idx on saves (user_id, updated_at desc);

-- ---------------------------------------------------------------- 结局记录
-- 一次完整人生。score 由服务端计算（见 services/score.ts），不信客户端。
create table if not exists runs (
  id         uuid        primary key,
  user_id    uuid        not null references users (id) on delete cascade,
  seed       text        not null,
  ending     text        not null,
  realm      integer     not null,
  age        integer     not null,
  score      integer     not null,
  verified   boolean     not null default false,
  ended_at   timestamptz not null default now(),
  constraint runs_realm_chk check (realm >= 0 and realm <= 12),
  constraint runs_age_chk   check (age >= 0 and age <= 2000),
  constraint runs_score_chk check (score >= 0)
);

create index if not exists runs_score_idx  on runs (score desc, ended_at asc);
create index if not exists runs_realm_idx  on runs (realm desc);
create index if not exists runs_age_idx    on runs (age desc);
create index if not exists runs_ending_idx on runs (ending, score desc);
create index if not exists runs_user_idx   on runs (user_id, ended_at desc);

-- ---------------------------------------------------------------- 内容版本
create table if not exists content_releases (
  id           uuid        primary key,
  version      text        not null,
  payload      jsonb       not null,
  note         text,
  published_at timestamptz not null default now()
);

create unique index if not exists content_releases_version_uq on content_releases (version);
