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

const COPY_FILES = ['index.html'];
const COPY_DIRS = ['icons'];

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