#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
act 动作自检：扫描 data.js 与 game.js 里所有可点击动作，
比对 dispatch() 实际支持的解析前缀与 ACT 实际存在的方法，
找出「点了没反应」的死链。

背景：v6.2 新增奇遇系统时，data.js 写成 act: 'enc:xxx:yyy'，
      但 dispatch() 只认 do; / act: 等前缀，导致机缘弹窗全部点不动。
      这类问题静态读代码极难发现，用脚本一扫就出来。

v8.0 扩展：原来只扫 data.js，游戏层（game.js 里拼出来的 data-act）完全没查。
      现在两类都查：
        1) 前缀 —— 有没有对应的 dispatch 分支
        2) do;xxx —— ACT 里到底有没有 do_xxx / xxx 这个方法
      第 2 条能直接抓住「写错方法名」这种只会在运行时提示「无此指令」的错。

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


def act_names(game: str):
    """ACT 上实际挂载的方法名。"""
    names = set()
    # ACT.foo = ...   ACT['do_foo'] = ...
    for m in re.finditer(r"ACT\.([a-zA-Z_][\w]*)\s*=", game):
        names.add(m.group(1))
    for m in re.finditer(r"ACT\[['\"]([a-zA-Z_][\w]*)['\"]\]\s*=", game):
        names.add(m.group(1))
    return names


def collect_do_targets(text: str, source: str, out: list):
    """收集所有 do;xxx 里的 xxx（只取字面前缀，模板插值部分忽略）。"""
    pats = [
        r'data-act="do;([a-zA-Z_][\w]*)',     # 模板里的 data-act
        r"'do;([a-zA-Z_][\w]*)",              # 字符串拼接
        r'"do;([a-zA-Z_][\w]*)',
        r"act\s*:\s*'do;([a-zA-Z_][\w]*)"     # data.js 的 act 字段
    ]
    for p in pats:
        for m in re.finditer(p, text):
            out.append((m.group(1), source))


def main() -> int:
    data = io.open(DATA, encoding='utf-8').read()
    game = io.open(GAME, encoding='utf-8').read()

    # 1) dispatch 认识的前缀
    known = set(re.findall(r"act\.startsWith\('([^']+)'\)", game))
    known.add('do;')          # do; 是 split(':') 特殊处理，不在 startsWith 里
    exact = set(re.findall(r"act === '([^']+)'", game))

    # 2) ACT 实际方法
    methods = act_names(game)

    # 3) 两处来源的动作
    acts = [(a, 'data.js') for a in re.findall(r"act\s*:\s*'([^']+)'", data)]
    do_targets = []
    collect_do_targets(data, 'data.js', do_targets)
    collect_do_targets(game, 'game.js', do_targets)

    print(f'dispatch 支持的前缀：{", ".join(sorted(known))}')
    print(f'精确匹配的指令：{", ".join(sorted(exact)) or "（无）"}')
    print(f'ACT 方法数：{len(methods)}')
    print(f'data.js 中可点击动作：{len(acts)} 个')
    print(f'do; 型动作引用：{len(do_targets)} 处（含 game.js 模板）')
    print()

    bad_prefix, bad_method = [], []
    for a, src in acts:
        if a in exact or a.startswith('do;'):
            continue
        if ':' in a:
            if a.split(':')[0] + ':' in known:
                continue
        bad_prefix.append((a, src))

    for name, src in do_targets:
        # dispatch 用 ACT['do_' + parts[0]] || ACT[parts[0]]
        if ('do_' + name) not in methods and name not in methods:
            bad_method.append((name, src))

    ok = True
    if bad_prefix:
        ok = False
        c = Counter(b.split(':')[0] + ':' for b, _ in bad_prefix)
        print('✘ 以下前缀没有对应的 dispatch 分支（点击会静默失败）：')
        for k, v in c.most_common():
            print(f'   {k:12s} ×{v}')
        for b, src in bad_prefix[:8]:
            print(f'   · {b}  （{src}）')
        print()

    if bad_method:
        ok = False
        c = Counter(n for n, _ in bad_method)
        print('✘ 以下 do; 动作在 ACT 里找不到方法（点到会提示「无此指令」）：')
        for k, v in c.most_common():
            print(f'   do;{k:14s} ×{v}')
        for n, src in bad_method[:10]:
            print(f'   · do;{n}  （{src}）')
        print()

    if ok:
        print('✔ 全部动作都有对应的分发分支与 ACT 方法')
        return 0

    print('修法：')
    print('  A. 前缀问题 → 在 dispatch() 里加该前缀的分支，或把动作改成 do; 开头')
    print('  B. 方法问题 → 补上 ACT.do_xxx，或把模板里的名字改成实际方法名')
    return 1


if __name__ == '__main__':
    sys.exit(main())
