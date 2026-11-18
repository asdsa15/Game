#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
问道长生 · 移动端构建脚本

作用：把「HTML + 两个 JS」打成单文件，并自动完成移动端所需的全部注入：
  1. 内联 wxcs3-data.js / wxcs3-game.js
  2. 注入 mobile.css（触控、安全区、dvh、单列顺序、对战双栏压缩）
  3. viewport 加 viewport-fit=cover（刘海屏）
  4. 加 PWA meta、manifest、apple-touch-icon
  5. 加 Service Worker 注册（仅 https/localhost 生效）

用法：
    python build.py            # 构建到 dist/
之后：
    本地测试   python -m http.server 8000 --directory dist
    部署      把 dist/ 整个目录上传到任意静态托管
"""
import shutil
import sys
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent
DIST = ROOT / 'dist'

HTML_SRC = SRC / '问道长生v6.html'
DATA_SRC = SRC / 'wxcs3-data.js'
GAME_SRC = SRC / 'wxcs3-game.js'
CSS_SRC = ROOT / 'mobile.css'


def read(p: Path) -> str:
    if not p.exists():
        sys.exit(f'缺少文件：{p}')
    return p.read_text(encoding='utf-8')


def main() -> None:
    html = read(HTML_SRC)
    css = read(CSS_SRC)
    scripts = [('wxcs3-data.js', read(DATA_SRC)), ('wxcs3-game.js', read(GAME_SRC))]

    # ---- 1. 内联脚本 ----
    for name, code in scripts:
        tag = f'<script src="{name}"></script>'
        if tag not in html:
            sys.exit(f'找不到脚本标签：{tag}（HTML 结构变了？）')
        if '</script' in code.lower():
            sys.exit(f'{name} 里含 </script 字样，无法安全内联')
        html = html.replace(tag, '<script>\n' + code + '\n</script>', 1)

    # ---- 2. 注入移动端补丁 ----
    if '</style' in css.lower():
        sys.exit('mobile.css 里出现了 style 结束标签，会提前闭合样式块；请改写该注释')
    if '</style>' not in html:
        sys.exit('找不到 </style>')
    html = html.replace('</style>', css + '\n</style>', 1)

    # ---- 3. viewport ----
    old_vp = '<meta name="viewport" content="width=device-width, initial-scale=1">'
    new_vp = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    if old_vp in html:
        html = html.replace(old_vp, new_vp, 1)
    elif 'viewport-fit=cover' not in html:
        html = html.replace('<meta charset="utf-8">',
                            '<meta charset="utf-8">\n' + new_vp, 1)

    # ---- 4. PWA 头（清单只在 http(s) 下挂：file:// 直开会让 Chromium 以 ERR_FAILED 拉清单） ----
    pwa_head = (
        '<meta name="theme-color" content="#5E9689">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="问道长生">\n'
        '<meta name="format-detection" content="telephone=no">\n'
        '<link rel="icon" href="./icons/icon-192.png">\n'
        '<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">\n'
        '<script>(function(){if(!/^https?:$/.test(location.protocol))return;var l=document.createElement("link");l.rel="manifest";l.href="./manifest.webmanifest";document.head.appendChild(l);})();</script>\n'
    )
    html = html.replace('</head>', pwa_head + '</head>', 1)

    # ---- 5. Service Worker 注册 ----
    sw_block = """<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var ok = location.protocol === 'https:' ||
           location.hostname === 'localhost' ||
           location.hostname === '127.0.0.1';
  if (!ok) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
})();
</script>
</body>"""
    html = html.replace('</body>', sw_block, 1)

    # ---- 6. 落盘 ----
    DIST.mkdir(exist_ok=True)
    (DIST / 'index.html').write_text(html, encoding='utf-8')
    (DIST / '问道长生.html').write_text(html, encoding='utf-8')

    shutil.copy2(ROOT / 'manifest.webmanifest', DIST / 'manifest.webmanifest')
    # SW 缓存名带本次 index.html 指纹：内容一变，旧缓存自动失效。
    # 之前写死 'wdcs-v6.2.1' 且页面走缓存优先，PWA 装过一次就永远停在旧版。
    build_id = hashlib.md5(html.encode('utf-8')).hexdigest()[:8]
    sw = (ROOT / 'sw.js').read_text(encoding='utf-8').replace('__BUILD__', build_id)
    (DIST / 'sw.js').write_text(sw, encoding='utf-8')

    icons_dst = DIST / 'icons'
    if icons_dst.exists():
        shutil.rmtree(icons_dst)
    shutil.copytree(ROOT / 'icons', icons_dst)

    size = len(html.encode('utf-8')) / 1024
    print(f'构建完成：dist/')
    print(f'  index.html        {size:7.1f} KB   （单文件，双击即玩）')
    print(f'  manifest.webmanifest')
    print(f'  sw.js')
    print(f'  icons/            4 个尺寸')
    print()
    print('本地预览： python -m http.server 8000 --directory dist')
    print('手机访问： 与电脑同 Wi-Fi，打开 http://<电脑局域网IP>:8000')


if __name__ == '__main__':
    main()
