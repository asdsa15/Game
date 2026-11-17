#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
act 前缀自检：扫描 data.js 与 game.js 里所有可点击动作，
比对 dispatch() 实际支持的解析前缀，找出"点了没反应"的死链。

背景：v6.2 新增奇遇系统时，data.js 写成 act: 'enc:xxx:yyy'，
      但 dispatch() 只认 do; / act: 等前缀，导致机缘弹窗全部点不动。
      这类问题静态读代码极难发现，用脚本一扫就出来。

用法：
    python check_actions.py
返回码：0 全部匹配 / 1 发现不匹配
"""
import io
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent   # 脚本在 tools/，源码在上一级
DATA = ROOT / 'wxcs3-data.js'
GAME = ROOT / 'wxcs3-game.js'


def main() -> int:
    data = io.open(DATA, encoding='utf-8').read()
    game = io.open(GAME, encoding='utf-8').read()

    # 1) dispatch 认识的前缀
    known = set(re.findall(r"act\.startsWith\('([^']+)'\)", game))
    known.add('do;')          # do; 是 split(':') 特殊处理，不在 startsWith 里
    # act === 'xxx' 这种精确匹配（create-next 等）
    exact = set(re.findall(r"act === '([^']+)'", game))

    # 2) data.js 里所有 act
    acts = re.findall(r"act\s*:\s*'([^']+)'", data)

    print(f'dispatch 支持的前缀：{", ".join(sorted(known))}')
    print(f'精确匹配的指令：{", ".join(sorted(exact)) or "（无）"}')
    print(f'data.js 中可点击动作：{len(acts)} 个')
    print()

    bad = []
    for a in acts:
        if a in exact:
            continue
        if a.startswith('do;'):
            continue
        if ':' in a:
            if a.split(':')[0] + ':' in known:
                continue
        bad.append(a)

    if not bad:
        print('✔ 全部动作都有对应的分发分支')
        return 0

    c = Counter(b.split(':')[0] + ':' for b in bad)
    print('✘ 以下前缀没有对应的 dispatch 分支（点击会静默失败）：')
    for k, v in c.most_common():
        print(f'   {k:12s} ×{v}')
    print()
    print('样例：')
    for b in bad[:8]:
        print('   ' + b)
    print()
    print('修法二选一：')
    print('  A. 在 dispatch() 里加该前缀的分支')
    print("  B. 把 data.js 里的 act 改成 do; 开头（如 'do;enc:x:y'）")
    return 1


if __name__ == '__main__':
    sys.exit(main())
