#!/usr/bin/env node
/**
 * 内容校验 CLI：`npm -w @wendao/content run validate`
 *
 * 退出码：0 = 全绿；1 = 有 issue（CI 直接红）。
 * 打印前三类问题的前 20 条，够定位；剩下的看总数。
 */
import { CONTENT_DIGEST, CONTENT_TABLE_NAMES, CONTENT_VERSION, validateContent } from './index.ts';

const { issues, stats } = validateContent();

console.log(
  `内容包 ${CONTENT_VERSION}｜${stats.tables} 表 / ${stats.records} 条 / 文本 ${stats.textChars} 字 / 指纹 ${CONTENT_DIGEST}`,
);
console.log(`表名清单：${CONTENT_TABLE_NAMES.length} 个`);

if (!issues.length) {
  console.log('✔ 116 张表全部通过：类型快照、id 唯一、数值域、交叉引用。');
  process.exit(0);
}

const byTable = new Map<string, number>();
for (const issue of issues) byTable.set(issue.table, (byTable.get(issue.table) ?? 0) + 1);

console.error(`✘ ${issues.length} 个问题，涉及 ${byTable.size} 张表：`);
for (const [table, n] of [...byTable.entries()].sort((a, b) => b[1] - a[1])) {
  console.error(`  · ${table}：${n}`);
}
console.error('\n前 20 条：');
for (const issue of issues.slice(0, 20)) {
  console.error(`  - [${issue.table}] ${issue.path}：${issue.message}`);
}
process.exit(1);
