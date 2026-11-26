/**
 * 一条命令起前后端：node scripts/dev.mjs
 * 不引 concurrently：两个子进程 + 前缀输出，二十行足够，少一个依赖。
 */
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const jobs = [
  { name: 'api', color: '\x1b[36m', args: ['-w', '@wendao/api', 'run', 'dev'] },
  { name: 'web', color: '\x1b[35m', args: ['-w', '@wendao/web', 'run', 'dev'] },
];

const reset = '\x1b[0m';
const children = [];
let closing = false;

for (const job of jobs) {
  /* Windows 上 npm 是 .cmd，直接 spawn 会 ENOENT/ErrnoException，必须过 shell。
     参数都是简单字符串（无空格无引号），过 shell 没有注入风险。 */
  const child = spawn(npm, job.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  children.push(child);

  const pipe = (stream, isErr) => {
    let buf = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        process.stdout.write(`${job.color}[${job.name}]${reset} ${line}\n`);
      }
      void isErr;
    });
  };
  pipe(child.stdout, false);
  pipe(child.stderr, true);

  child.on('error', err => {
    console.error(`${job.color}[${job.name}]${reset} 启动失败：${err.message}`);
    shutdown(1);
  });

  child.on('exit', code => {
    if (closing) return;
    if (code !== 0) {
      console.error(`${job.color}[${job.name}]${reset} 退出，代码 ${code}`);
      shutdown(code ?? 1);
    }
  });
}

function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const c of children) {
    if (!c.killed) c.kill();
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('前后端启动中…… 前端 http://127.0.0.1:5173 ｜ 服务端 http://127.0.0.1:8787');
