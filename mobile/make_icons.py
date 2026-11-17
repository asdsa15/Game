#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 PWA 图标（无第三方依赖，手写 PNG 编码）
设计：宣纸底 · 青玉环 · 金色「山」形 —— 呼应「问道长生」的仙山意象
"""
import zlib, struct, os, math

BG    = (250, 246, 238)
JADE  = (94, 150, 137)
GOLD  = (184, 145, 47)
LIGHT = (255, 254, 251)


def _dist_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def _mix(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


def make_pixel(S):
    """返回 (x,y)->(r,g,b,a)，S 为画布边长，内部按 S 比例绘制"""
    c = S / 2.0
    r_ring, w_ring = S * 0.330, S * 0.052          # 青玉外环
    r_in,   w_in   = S * 0.252, S * 0.010          # 内细金环
    stroke         = S * 0.046                     # 山形线宽

    # 山形两笔（Λ）＋ 一道地基横线（不闭合），取「山门」意象
    a = (S * 0.312, S * 0.612)
    b = (S * 0.500, S * 0.356)
    d = (S * 0.688, S * 0.612)
    base_l, base_r = (S * 0.330, S * 0.700), (S * 0.670, S * 0.700)

    def pixel(x, y):
        # 2x2 超采样抗锯齿
        acc = [0.0, 0.0, 0.0, 0.0]
        for sx in (0.25, 0.75):
            for sy in (0.25, 0.75):
                px, py = x + sx, y + sy
                col = BG
                alpha = 1.0

                # 外环
                dist_c = math.hypot(px - c, py - c)
                if abs(dist_c - r_ring) <= w_ring / 2:
                    col = JADE
                elif dist_c < r_ring - w_ring / 2:
                    col = LIGHT
                    # 内细金环
                    if abs(dist_c - r_in) <= w_in / 2:
                        col = GOLD
                    # 山形
                    else:
                        ds = min(
                            _dist_seg(px, py, a[0], a[1], b[0], b[1]),
                            _dist_seg(px, py, b[0], b[1], d[0], d[1]),
                            _dist_seg(px, py, base_l[0], base_l[1], base_r[0], base_r[1]),
                        )
                        if ds <= stroke / 2:
                            col = GOLD
                        elif ds <= stroke / 2 + S * 0.006:
                            # 极窄的柔和边，避免锯齿
                            k = 1.0 - (ds - stroke / 2) / (S * 0.006)
                            col = _mix(LIGHT, GOLD, max(0.0, min(1.0, k)))
                acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]; acc[3] += alpha
        return (int(acc[0] / 4), int(acc[1] / 4), int(acc[2] / 4), int(acc[3] / 4 * 255))

    return pixel


def write_png(path, size):
    fn = make_pixel(size)
    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filter type 0
        for x in range(size):
            r, g, b, a = fn(x, y)
            rows += bytes((r, g, b, a))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n' +
           chunk(b'IHDR', ihdr) +
           chunk(b'IDAT', zlib.compress(bytes(rows), 9)) +
           chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, 'icons')
    os.makedirs(out, exist_ok=True)
    for name, size in [('icon-192.png', 192), ('icon-512.png', 512),
                       ('apple-touch-icon.png', 180), ('icon-maskable-512.png', 512)]:
        n = write_png(os.path.join(out, name), size)
        print(f'{name:26s} {size}x{size}  {n/1024:.1f} KB')
