# -*- coding: utf-8 -*-
"""
行动预算守卫：确保每个会改变状态的动作，要么花时间，要么在分档表里写明为什么不用花。

背景
----
v8.0 之前，155 个 ACT 动作里只有 30 个会推进时间，其余 125 个是免费外挂。
后果是「做什么都没有成本」，所以没有取舍，所有系统退化成点着玩的菜单。

现在规则是：一月三旬，每旬一次行动。凡是产出的动作都要 advanceXun()。
必须免时间的（面板入口、中间步骤、买卖），写进 docs/03_玩法设计/行动预算_分档表.md。

这个脚本读那份文档，逐条比对。以后新增动作时：
  · 占时间的  → 自动通过
  · 免时间的  → 必须在文档里出现，否则红
两个都不做，就说明作者没想过「这件事要不要时间」——那多半是漏了。

用法
----
    python tools/check_time.py
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'wxcs3-game.js')
DOC = os.path.join(ROOT, 'docs', '03_玩法设计', '行动预算_分档表.md')


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def strip_comments(src):
    """去掉行注释与块注释——注释里提到 advanceXun 不算真的调用。"""
    src = re.sub(r'/\*[\s\S]*?\*/', '', src)
    src = re.sub(r'(?<![:\'"])//[^\n]*', '', src)
    return src


def block_of(lines, start):
    """从定义行开始，按花括号配平取出函数体。"""
    depth, out, started = 0, [], False
    for i in range(start, len(lines)):
        line = lines[i]
        for ch in line:
            if ch == '{':
                depth += 1
                started = True
            elif ch == '}':
                depth -= 1
        out.append(line)
        if started and depth <= 0:
            break
        if len(out) > 1500:      # 防御：别把整个文件吞进来
            break
    return '\n'.join(out)


def collect_actions(src):
    """抓 ACT.xxx = (...) => { 形式的动作。"""
    lines = src.split('\n')
    out = []
    pat = re.compile(r'^\s*ACT\.([A-Za-z_][\w]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_][\w]*)\s*=>\s*\{')
    for i, line in enumerate(lines):
        m = pat.match(line)
        if m:
            out.append((m.group(1), block_of(lines, i), i + 1))
    return out


def doc_names(doc):
    """文档里用反引号包起来的动作名；带 * 的按前缀通配（如 open*）。"""
    raw = re.findall(r'`([A-Za-z_][\w]*\*?)`', doc)
    exact = set(x for x in raw if not x.endswith('*'))
    prefix = [x[:-1] for x in raw if x.endswith('*')]
    return exact, prefix


def archived(name, exact, prefix):
    if name in exact:
        return True
    return any(name.startswith(p) for p in prefix)


def main():
    if not os.path.exists(GAME):
        print('找不到 wxcs3-game.js')
        return 2
    if not os.path.exists(DOC):
        print('找不到分档表：' + DOC)
        return 2

    src = strip_comments(read(GAME))
    actions = collect_actions(src)
    exact, prefix = doc_names(read(DOC))

    paid, free, unknown = [], [], []
    for name, body, ln in actions:
        # 时间推进必须出现在函数体里（含 advanceXun / advanceMonth）
        if re.search(r'\badvance(Xun|Month)\s*\(', body):
            paid.append(name)
        elif archived(name, exact, prefix):
            free.append(name)
        else:
            unknown.append((name, ln))

    print('动作总数 %d ｜ 占时间 %d ｜ 已归档为免时间 %d ｜ 未分类 %d'
          % (len(actions), len(paid), len(free), len(unknown)))

    if unknown:
        print('\n以下动作既没有推进时间，也没有在分档表里说明——')
        print('要么给它加 advanceXun(1)，要么写进 docs/03_玩法设计/行动预算_分档表.md：')
        for name, ln in unknown:
            print('  · %-18s (wxcs3-game.js:%d)' % (name, ln))
        return 1

    print('\n✔ 每个动作都有明确的时间口径。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
