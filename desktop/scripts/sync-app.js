// 把 mobile/dist 的单文件产物搬进 desktop/app，供 Electron 直接 file:// 加载。
//
// 为什么复制而不是直接指向 ../mobile/dist：
//   打包后 app 目录是 asar 里的一份只读副本，跨目录相对路径会失效；
//   复制一次，dev 与打包后用同一套路径解析，少一类排查。
// 为什么只搬 index.html 与 icons：
//   sw.js / manifest 是 PWA 的东西，file:// 下用不到，搬过去只是徒增 404。

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.dirname(__dirname);                 // desktop/
const SRC = path.join(ROOT, '..', 'mobile', 'dist');  // mobile/dist/
const DST = path.join(ROOT, 'app');
const PROJECT = path.join(ROOT, '..');

const COPY_FILES = ['index.html'];
const COPY_DIRS = ['icons'];

/* v10.3 P1：产物新鲜度闸门。
   2026-11-18 踩过：exe 打包于 23:15，而 preload/main/页面在 23:52~00:01 才改完，
   于是发出去的包里没有 IO 桥、没有菜单，页面也是旧的 —— 全程无任何提示。
   sync 时比对「dist 的 mtime」与「源码最大 mtime」，产物更旧就中止。 */
function sourceFiles() {
  const out = [];
  for (const name of fs.readdirSync(PROJECT)) {
    if (/^wxcs3-.*\.js$/.test(name)) out.push(path.join(PROJECT, name));
  }
  out.push(path.join(PROJECT, '问道长生v6.html'));
  out.push(path.join(PROJECT, 'mobile', 'mobile.css'));
  return out.filter(function (f) { return fs.existsSync(f); });
}

function assertFresh() {
  const entry = path.join(SRC, 'index.html');
  const distM = fs.statSync(entry).mtimeMs;
  const stale = sourceFiles().filter(function (f) { return fs.statSync(f).mtimeMs > distM; });
  if (!stale.length) return;
  console.error('✗ 产物已过期：下列源码比 mobile/dist/index.html 新');
  stale.forEach(function (f) {
    console.error('    - ' + path.relative(PROJECT, f));
  });
  console.error('  先执行：python mobile/build.py（再回来 npm run sync）');
  process.exit(1);
}

function cpFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function cpDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const s = path.join(from, name);
    const d = path.join(to, name);
    if (fs.statSync(s).isDirectory()) cpDir(s, d);
    else cpFile(s, d);
  }
}

function main() {
  if (!fs.existsSync(path.join(SRC, 'index.html'))) {
    console.error('缺少 mobile/dist/index.html，先执行：python mobile/build.py');
    process.exit(1);
  }
  assertFresh();

  fs.rmSync(DST, { recursive: true, force: true });
  fs.mkdirSync(DST, { recursive: true });

  for (const f of COPY_FILES) cpFile(path.join(SRC, f), path.join(DST, f));

  /* 桌面壳给页面补一条 CSP：页面本身是内联脚本，所以只放 unsafe-inline，不放 unsafe-eval。
     Electron 没 CSP 会在控制台刷一条红色安全警告；补上之后控制台干净，外链也一并掐掉。 */
  const entry = path.join(DST, 'index.html');
  let html = fs.readFileSync(entry, 'utf8');
  const CSP = '<meta http-equiv="Content-Security-Policy" content="' +
    "default-src 'self' data: blob:; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' data: blob:; " +
    "object-src 'none'; base-uri 'none'" +
    '">';
  if (!html.includes('Content-Security-Policy')) {
    html = html.replace('<head>', '<head>' + CSP, 1);
    fs.writeFileSync(entry, html, 'utf8');
  }
  for (const d of COPY_DIRS) {
    const from = path.join(SRC, d);
    if (fs.existsSync(from)) cpDir(from, path.join(DST, d));
  }

  const bytes = fs.statSync(path.join(DST, 'index.html')).size;
  console.log('已同步 app/index.html　' + (bytes / 1024).toFixed(1) + ' KB');
}

main();