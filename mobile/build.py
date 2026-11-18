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
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent
DIST = ROOT / 'dist'

HTML_SRC = SRC / '问道长生v6.html'
DATA_SRC = SRC / 'wxcs3-data.js'
RULES_SRC = SRC / 'wxcs3-rules.js'
GAME_SRC = SRC / 'wxcs3-game.js'
CSS_SRC = ROOT / 'mobile.css'
ART_TAG = '<script src="wxcs3-art.js"></script>'

# 扩展文件命名约定：wxcs3-ext-*.js
# 注入顺序＝文件名排序，所以需要「先加载」的用 10-、20- 前缀，
# 不必改 HTML、也不必改这个脚本。
EXT_GLOB = 'wxcs3-ext-*.js'


def read(p: Path) -> str:
    if not p.exists():
        sys.exit(f'缺少文件：{p}')
    return p.read_text(encoding='utf-8')


def art_data_script() -> str:
    """art/scenes/*.jpg → base64 → window.ART_DATA（dist 单文件用）。
    目录为空或缺图不报错：wxcs3-art.js 兜底独立文件路径，渲染层再兜底纯文字。"""
    art_dir = SRC / 'art' / 'scenes'
    data = {}
    if art_dir.is_dir():
        for jpg in sorted(art_dir.glob('*.jpg')):
            b64 = base64.b64encode(jpg.read_bytes()).decode('ascii')
            data[jpg.stem] = 'data:image/jpeg;base64,' + b64
    return ('<script>window.ART_DATA=' +
            json.dumps(data, separators=(',', ':'), ensure_ascii=False) +
            '</script>\n' + ART_TAG)


def main() -> None:
    html = read(HTML_SRC)
    css = read(CSS_SRC)
    # v9.0 第2步：rules 必须排在 game 之前——
    # game.js 在文件开头就把 RULES.* 绑成局部常量，缺了就 throw。
    scripts = [('wxcs3-data.js', read(DATA_SRC)),
               ('wxcs3-rules.js', read(RULES_SRC)),
               ('wxcs3-game.js', read(GAME_SRC))]

    # ---- 0. 插画 base64 注入（在 ART_TAG 还未被内联替换之前插入） ----
    art_inline = read(SRC / 'wxcs3-art.js')
    if ART_TAG not in html:
        sys.exit(f'找不到脚本标签：{ART_TAG}（HTML 结构变了？）')
    html = html.replace(ART_TAG, art_data_script(), 1)
    scripts.insert(1, ('wxcs3-art.js', art_inline))

    # ---- 0.5 扩展文件：wxcs3-ext-*.js 自动收集 ----
    # 目的：新玩法一律写在独立文件里，不再往 10k 行的 game.js 里堆。
    # 约定：文件名排序即加载顺序；HTML 不需要出现这些 <script> 标签。
    # 注入点放在 game.js 之后——扩展要读 window.WXCS3 / WXCS3_DATA，
    # 必须在它们已经建立之后再执行。
    ext_files = sorted(SRC.glob(EXT_GLOB))
    ext_scripts = [(p.name, p.read_text(encoding='utf-8')) for p in ext_files]
    for name, code in ext_scripts:
        if '</script' in code.lower():
            sys.exit(f'{name} 里含 </script 字样，无法安全内联')

    # ---- 1. 内联脚本 ----
    for name, code in scripts:
        tag = f'<script src="{name}"></script>'
        if tag not in html:
            sys.exit(f'找不到脚本标签：{tag}（HTML 结构变了？）')
        if '</script' in code.lower():
            sys.exit(f'{name} 里含 </script 字样，无法安全内联')
        html = html.replace(tag, '<script>\n' + code + '\n</script>', 1)

    # 扩展紧跟 game.js 之后一次性插入
    if ext_scripts:
        block = '\n'.join('<script>\n' + code + '\n</script>' for _n, code in ext_scripts)
        anchor = '<script>\n' + read(GAME_SRC) + '\n</script>'
        if anchor not in html:
            # 兜底：game.js 内容被其他步骤改过时，退到「最后一个内联 script 之后」
            idx = html.rfind('</script>')
            if idx < 0:
                sys.exit('无法定位 game.js 注入点')
            html = html[:idx + len('</script>')] + '\n' + block + html[idx + len('</script>'):]
        else:
            html = html.replace(anchor, anchor + '\n' + block, 1)

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
