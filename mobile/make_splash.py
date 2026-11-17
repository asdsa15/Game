#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 APK 启动图（1080x1920）：宣纸底 + 居中青玉环金山纹。
HBuilderX 打包时若不上传启动图，会默认用 IDE 的 logo，很出戏。
"""
import zlib, struct, os, math

BG = (250, 246, 238)
JADE = (94, 150, 137)
GOLD = (184, 145, 47)
LIGHT = (255, 254, 251)

W, H = 1080, 1920
CX, CY = W // 2, H // 2 - 60      # 略微上移，视觉更稳
S = 460                            # 图标区域边长

r_ring, w_ring = S * 0.330, S * 0.052
r_in,   w_in   = S * 0.252, S * 0.010
stroke         = S * 0.046

A = (CX - S / 2 + S * 0.312, CY - S / 2 + S * 0.612)
B = (CX - S / 2 + S * 0.500, CY - S / 2 + S * 0.356)
D = (CX - S / 2 + S * 0.688, CY - S / 2 + S * 0.612)
BL = (CX - S / 2 + S * 0.330, CY - S / 2 + S * 0.700)
BR = (CX - S / 2 + S * 0.670, CY - S / 2 + S * 0.700)


def dist_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def color_at(px, py):
    d = math.hypot(px - CX, py - CY)
    if abs(d - r_ring) <= w_ring / 2:
        return JADE
    if d < r_ring - w_ring / 2:
        if abs(d - r_in) <= w_in / 2:
            return GOLD
        ds = min(dist_seg(px, py, *A, *B), dist_seg(px, py, *B, *D), dist_seg(px, py, *BL, *BR))
        if ds <= stroke / 2:
            return GOLD
        return LIGHT
    return BG


def main():
    rows = bytearray()
    for y in range(H):
        rows.append(0)
        for x in range(W):
            # 只在图标包围盒内做精细计算，其余直接填底色
            if abs(x - CX) > S * 0.42 or abs(y - CY) > S * 0.42:
                rows += bytes(BG) + b'\xff'
            else:
                r = g = b = 0
                for sx, sy in ((0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)):
                    c = color_at(x + sx, y + sy)
                    r += c[0]; g += c[1]; b += c[2]
                rows += bytes((r // 4, g // 4, b // 4, 255))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    png = (b'\x89PNG\r\n\x1a\n' +
           chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)) +
           chunk(b'IDAT', zlib.compress(bytes(rows), 6)) +
           chunk(b'IEND', b''))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'splash.png')
    with open(out, 'wb') as f:
        f.write(png)
    print(f'splash.png  {W}x{H}  {len(png)/1024:.1f} KB')


if __name__ == '__main__':
    main()
