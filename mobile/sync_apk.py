#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 dist/index.html 同步进 APK 工程，并递增 Android versionCode。

会同时写入两处：
  1. mobile/apk/wendao/      —— 项目内源副本（跟代码一起备份）
  2. D:/wendao-apk/          —— 纯英文路径副本（给 HBuilderX 打包用，避开中文路径报错）

用法：
    python sync_apk.py           # versionCode 自动 +1
    python sync_apk.py --code 630
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST_HTML = ROOT / 'dist' / 'index.html'
APK_DIR = ROOT / 'apk' / 'wendao'
PUBLISH_DIR = Path('D:/wendao-apk')      # 英文路径打包副本


def sync_one(target: Path, html_src: Path, code: int) -> None:
    shutil.copy2(html_src, target / 'index.html')
    mf_path = target / 'manifest.json'
    mf = json.loads(mf_path.read_text(encoding='utf-8'))
    mf['plus']['distribute']['google']['versionCode'] = code
    mf['version']['code'] = str(code)
    mf_path.write_text(json.dumps(mf, ensure_ascii=False, indent=4) + '\n', encoding='utf-8')


def source_files() -> list:
    """参与「新鲜度」判定的全部输入。

    v10.3 P1：原来只盯 game/data/html 三个文件，漏了 rules、14 个 ext-*.js、
    移动端样式与素材——于是「改了扩展却没重建 dist」这种分叉永远查不出来。
    现在一律按实际输入全量收：根目录所有 wxcs3-*.js、入口 HTML、mobile.css、
    art/scenes 交付图、icons。
    """
    root = ROOT.parent
    files = sorted(root.glob('wxcs3-*.js'))
    files.append(root / '问道长生v6.html')
    files.append(ROOT / 'mobile.css')
    files += sorted((root / 'art' / 'scenes').glob('*.jpg'))
    files += sorted((ROOT / 'icons').glob('*.png'))
    return [f for f in files if f.exists()]


def check_fresh() -> None:
    """产物比源码旧就中止。

    2026-11-08 踩过：四艺写完了，dist 与 apk 还是三小时前的版本，
    玩家双击打开的是"没有四艺"的游戏，而且没有任何提示。
    静默分叉比报错难查一百倍，所以这里宁可拦下来。
    """
    dist_m = DIST_HTML.stat().st_mtime
    stale = [f for f in source_files() if f.stat().st_mtime > dist_m]
    if stale:
        sys.exit('✗ 产物已过期，源码比 dist/index.html 新：\n    '
                 + '\n    '.join(str(f.relative_to(ROOT.parent)) for f in stale)
                 + '\n  先跑：python build.py')


def main() -> None:
    if not DIST_HTML.exists():
        sys.exit('缺少 dist/index.html，先跑 python build.py')
    check_fresh()
    if not (APK_DIR / 'manifest.json').exists():
        sys.exit(f'缺少 {APK_DIR}/manifest.json')

    mf = json.loads((APK_DIR / 'manifest.json').read_text(encoding='utf-8'))
    cur = int(mf['plus']['distribute']['google'].get('versionCode', 620))
    if '--code' in sys.argv:
        code = int(sys.argv[sys.argv.index('--code') + 1])
    else:
        # 内容没变就不要涨版本号：调试期反复同步会把 versionCode 抬到没意义的数，
        # 而 Android 只要求递增，不要求每次构建都变。
        old_html = APK_DIR / 'index.html'
        same = old_html.exists() and \
            hashlib.md5(old_html.read_bytes()).hexdigest() == \
            hashlib.md5(DIST_HTML.read_bytes()).hexdigest()
        code = cur if same else cur + 1
        if same:
            print(f'· 内容未变，versionCode 保持 {code}')

    sync_one(APK_DIR, DIST_HTML, code)
    print(f'✔ {APK_DIR}')

    # 英文路径副本：不存在就整目录复制一份
    try:
        if not PUBLISH_DIR.exists():
            PUBLISH_DIR.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(APK_DIR, PUBLISH_DIR)
        sync_one(PUBLISH_DIR, DIST_HTML, code)
        print(f'✔ {PUBLISH_DIR}   ← HBuilderX 打开这个')
    except OSError as e:
        print(f'! 英文副本写入失败（{e}），只同步了项目内副本')

    size = (APK_DIR / 'index.html').stat().st_size / 1024
    print()
    print(f'index.html {size:.1f} KB · versionCode → {code}')
    print('下一步：HBuilderX 打开 D:\\wendao-apk → 发行 → 原生App-云打包')


if __name__ == '__main__':
    main()
