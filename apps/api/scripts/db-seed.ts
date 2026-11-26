/**
 * 造一个能立刻登录的演示账号 + 一份存档 + 几条结局记录。
 * 用途：前端联调、榜单页面不至于永远是空的。
 * 可重复执行：账号已存在就跳过创建，不会覆盖密码。
 */
import { loadConfig } from '../src/env.ts';
import { openDatabase } from '../src/open-db.ts';
import { hashPassword } from '../src/lib/password.ts';
import { users } from '../src/repo/users.ts';
import { saves } from '../src/repo/saves.ts';
import { runs } from '../src/repo/runs.ts';
import { computeScore } from '../src/lib/score.ts';

const EMAIL = 'demo@wendao.local';
const PASSWORD = 'demo12345';

const config = loadConfig();
const opened = await openDatabase(config);
const db = opened.db;
console.log(`库：${opened.driver} @ ${opened.location}`);

try {
  let user = await users.byEmail(db, EMAIL);
  if (user) {
    console.log(`账号已存在，跳过创建：${EMAIL}`);
  } else {
    user = await users.create(db, {
      email: EMAIL,
      passHash: await hashPassword(PASSWORD),
      nickname: '试道者',
    });
    console.log(`已创建账号：${EMAIL} / ${PASSWORD}`);
  }

  const existing = await saves.list(db, user.id);
  if (!existing.length) {
    await saves.upsert(db, {
      userId: user.id,
      slot: 0,
      expected: null,
      save: {
        format: 'wendao-save',
        version: 2,
        contentVersion: '0.1.0',
        savedAt: Date.now(),
        seed: 'demo-seed-1',
        state: { seed: 'demo-seed-1', xRealm: 1, xStage: 2, dao: '试道者', age: 24, turn: 18, cultivation: 'xian' },
        meta: { dao: '试道者', realm: 1, age: 24, turn: 18, cultivation: 'xian' },
      },
    });
    console.log('已写入自动存档槽 0');
  }

  if ((await runs.countByUser(db, user.id)) === 0) {
    const samples = [
      { ending: 'guowei', realm: 5, age: 137 },
      { ending: 'ascend', realm: 6, age: 210 },
      { ending: 'sit', realm: 3, age: 96 },
    ];
    for (const s of samples) {
      await runs.insert(db, {
        userId: user.id,
        seed: `demo-${s.ending}`,
        ending: s.ending,
        realm: s.realm,
        age: s.age,
        score: computeScore(s),
      });
    }
    console.log(`已写入 ${samples.length} 条结局记录`);
  }

  console.log('完成。可用 curl 验证登录：');
  console.log(`  curl -s -X POST localhost:${config.port}/auth/login -H 'content-type: application/json' \\`);
  console.log(`    -d '{"email":"${EMAIL}","password":"${PASSWORD}"}'`);
} finally {
  await opened.close();
}
