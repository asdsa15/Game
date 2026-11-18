#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
问道长生 · 水墨插画压缩管线
================================
对应《水墨插画层方案_20261118.md》§5.2 压缩规格：

    生成原图 2048×1152 PNG  →  裁 1320×570（21:9）  →  JPEG q80
    单张约 180~280KB，14 张合计约 3MB

用法
----
    python art/pipeline/compress_art.py                       # 默认读 art/generated/art/ 写 art/scenes/
    python art/pipeline/compress_art.py <输入目录> <输出目录>    # 自定义
    python art/pipeline/compress_art.py <输入目录> <输出目录> --only cave,wild

处理规则
--------
* 源图文件名即键名：cave.png → art/scenes/cave.jpg
* 裁切：目标比例 21:9（1320×570 = 2.31579）。源图比目标"矮"时（宽 > 高×比例），
  宽度不动，高度裁到 round(宽/比例)，纵向取景偏上（下方留白多留一点），
  以配合 CSS 里 .sceneart img 的 object-position: 居中偏上。
* 源图比目标"高"时（宽 < 高×比例），高度不动，横向居中裁切。
* 缩放：LANCZOS 重采样到 1320×570。
* 输出：JPEG quality=80、optimize、progressive、subsampling=4:2:0，米白底色不参与。
* 逐张打印源/产物体积与压缩比；结束后给总量，并对照方案的 3MB 预算给出结论。

依赖：Pillow（已在环境中）
"""

import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("需要 Pillow：pip install Pillow")

# ---- 方案 §5.2 的目标规格 ----
# 横幅类：21:9 裁切 → 1320×570，JPEG q80
# 衬底类：16:9 直接缩放 → 1600×900，JPEG q78（整页铺底，0.25 不透明度 + 去饱和）
# 图标类：1:1 不裁 → 256×256，JPEG q82（宣纸底，不抠图；靠 mix-blend-mode:multiply 融进面板）
CLASSES = {
    "banner":  {"w": 1320, "h": 570, "q": 80, "crop": True},
    "backdrop": {"w": 1600, "h": 900, "q": 78, "crop": True},
    "icon":    {"w": 256,  "h": 256, "q": 82, "crop": False},
}
DEFAULT_CLASS = "banner"
# 纵向取景偏上：多出的裁切量按 45% 从上、55% 从下切
TOP_BIAS = 0.45

DEFAULT_IN = os.path.join("art", "generated", "art")
DEFAULT_OUT = os.path.join("art", "scenes")
ICON_IN = os.path.join("art", "generated", "icons")
ICON_OUT = os.path.join("art", "icons")

# 插画需求规格书 §四 的 P0 清单
KEYS = [
    "cave", "wild", "sect", "market", "temple", "dongtian",
    "break", "combat", "create", "dying",
    "over", "hurt", "visitor", "closed",
    # P1 补强
    "drought",
    "zhou_qingyue", "zhou_nanyue", "zhou_xisha", "zhou_beiyuan", "zhou_zhongzhou",
    "map",
    "end_sit", "end_fall", "end_daohua", "end_reinc", "end_guowei", "end_zhenjun",
    "end_daotai", "end_ascend", "end_xiaoyao", "end_xianzun", "end_modao", "end_shizun",
]

# 衬底类键名：整页铺底，不做 21:9 裁切
BACKDROP_KEYS = {"dying", "over", "map"} | {
    "end_sit", "end_fall", "end_daohua", "end_reinc", "end_guowei", "end_zhenjun",
    "end_daotai", "end_ascend", "end_xiaoyao", "end_xianzun", "end_modao", "end_shizun",
}

# ===== 图标类（《图形体系规格_20261118.md》§3.2 / §3.3）=====
# 基础图标：按语义类别归并，覆盖全部 ≈285 个条目级资产
ICON_BASE_KEYS = [
    # A 元素意象（8）
    "el_metal", "el_wood", "el_water", "el_fire",
    "el_earth", "el_ice", "el_thunder", "el_wind",
    # B 符与法宝功能（8）—— 法宝 slot 有 move/body/once/atk 四值，
    #   once（一次性消耗品）单列 fn_talisman；技能 kind 里 poison/
    #   control/blood 三类非元素招式各需独立图标。
    "fn_atk", "fn_def", "fn_escape", "fn_buff",
    "fn_poison", "fn_control", "fn_blood", "fn_talisman",
    # C 丹药（8）
    "pill_hp", "pill_hp_big", "pill_cure", "pill_life",
    "pill_mp", "pill_heart", "pill_break", "pill_cult",
    # D 材料（7）
    "mat_alchemy", "mat_herb", "mat_artifact", "mat_talisman",
    "mat_array", "mat_beast", "mat_spirit",
    # E 技艺 4（CRAFT_ARTS: dan/qi/fu/zhen）+ 阵法 4（ARRAY_DISKS），一一对应
    "craft_dan", "craft_qi", "craft_fu", "craft_zhen",
    "array_zhenJuLing", "array_zhenMiZong", "array_zhenSuoLing", "array_zhenWuXing",
    # F 通用与氛围（6）
    "icon_scroll",
    "amb_enc_common", "amb_enc_xian", "amb_enc_shen",
    "amb_ev_risk", "amb_ev_good",
    # G 愿物与显圣神器（2）—— 条目少但身份独立，不与材料/法宝混用
    "item_votive", "item_divine",
]

# 身份图标：一项一图，不归并
# 法相 fx_g1~g12 与真君 zhenjun_g1~g12 是同一批 12 个实体
# （game.js:3116 用 ZHENJUN.find(z => z.id === fx) 互取），故只画一套 fx_*。
ICON_IDENTITY_KEYS = (
    ["fx_g%d" % i for i in range(1, 13)]
    + ["body_dao", "body_sword", "body_nine", "body_ice",
       "body_xuan", "body_chun", "body_chaos", "body_plain"]
    + ["path_ascend", "path_long", "path_revenge",
       "path_guard", "path_rule", "path_free"]
    + ["org_farm", "org_hunt", "org_merch", "org_office", "org_army",
       "org_fallen", "org_orphan", "org_scholar", "org_monk", "org_demon"]
)

ICON_KEYS = ICON_BASE_KEYS + ICON_IDENTITY_KEYS


def crop_to_ratio(img, ratio):
    """裁成目标比例。返回裁切框 (left, top, right, bottom)。

    源图 4:3、目标 21:9/16:9，即源图"偏高"：保宽度、裁高度，
    纵向取景偏上（TOP_BIAS）；源图"偏宽"时反向，横向居中。
    """
    w, h = img.size
    cur = w / h
    if abs(cur - ratio) < 1e-3:
        return (0, 0, w, h)
    if cur < ratio:
        new_h = int(round(w / ratio))
        new_h = max(1, min(new_h, h))
        excess = h - new_h
        top = int(round(excess * TOP_BIAS))
        top = max(0, min(top, h - new_h))
        return (0, top, w, top + new_h)
    new_w = int(round(h * ratio))
    new_w = max(1, min(new_w, w))
    excess = w - new_w
    left = excess // 2
    return (left, 0, left + new_w, h)


def compress_one(src, dst, cls):
    """压缩单张。cls ∈ CLASSES。返回 (源字节, 产物字节) 或 None（失败）。"""
    spec = CLASSES[cls]
    try:
        with Image.open(src) as img:
            img = img.convert("RGB")           # PNG 可能带 alpha，JPEG 不支持
            if spec["crop"]:
                img = img.crop(crop_to_ratio(img, spec["w"] / spec["h"]))
            if img.size != (spec["w"], spec["h"]):
                img = img.resize((spec["w"], spec["h"]), Image.LANCZOS)
            img.save(dst, "JPEG", quality=spec["q"], optimize=True,
                     progressive=True, subsampling="4:2:0")
        return os.path.getsize(src), os.path.getsize(dst)
    except Exception as e:                      # noqa: BLE001
        print(f"    ! 失败：{e}")
        return None


def main():
    ap = argparse.ArgumentParser(
        description="水墨插画压缩：横幅裁 21:9 / 衬底缩 16:9 / 图标缩 1:1")
    ap.add_argument("src", nargs="?", default=None,
                    help=f"原图目录（默认 {DEFAULT_IN}）")
    ap.add_argument("dst", nargs="?", default=None,
                    help=f"输出目录（默认 {DEFAULT_OUT}）")
    ap.add_argument("--only", help="只处理这些键，逗号分隔")
    ap.add_argument("--icons", action="store_true",
                    help=f"处理图标类（默认 {ICON_IN} → {ICON_OUT}）")
    ap.add_argument("--class", dest="cls", choices=sorted(CLASSES),
                    default=None,
                    help="强制指定规格类；默认按键名自动判定"
                         "（end_*/dying/over/map → backdrop，--icons → icon）")
    args = ap.parse_args()

    if args.icons:
        src_dir = args.src or ICON_IN
        dst_dir = args.dst or ICON_OUT
        keys = ICON_KEYS
    else:
        src_dir = args.src or DEFAULT_IN
        dst_dir = args.dst or DEFAULT_OUT
        keys = KEYS
    if args.only:
        keys = [k.strip() for k in args.only.split(",") if k.strip()]

    if not os.path.isdir(src_dir):
        sys.exit(f"找不到原图目录：{src_dir}")

    os.makedirs(dst_dir, exist_ok=True)

    print(f"源目录  {src_dir}")
    print(f"输出    {dst_dir}")
    print("规格    横幅 1320×570 (21:9) q80 · 衬底 1600×900 (16:9) q78 · "
          "图标 256×256 (1:1) q82")
    print("-" * 66)

    total_src = total_dst = 0
    done = missing = failed = 0

    for key in keys:
        src = os.path.join(src_dir, f"{key}.png")
        dst = os.path.join(dst_dir, f"{key}.jpg")
        if not os.path.exists(src):
            print(f"  {key:<9} 跳过（无源图）")
            missing += 1
            continue
        if args.cls:
            cls = args.cls
        elif args.icons:
            cls = "icon"
        elif key in BACKDROP_KEYS:
            cls = "backdrop"
        else:
            cls = DEFAULT_CLASS
        spec = CLASSES[cls]
        r = compress_one(src, dst, cls)
        if r is None:
            failed += 1
            continue
        s, d = r
        total_src += s
        total_dst += d
        done += 1
        kb = d / 1024
        if cls == "icon":
            band = f"图标 {spec['w']}×{spec['h']} q{spec['q']}"
        elif cls == "backdrop":
            band = f"衬底 {spec['w']}×{spec['h']} q{spec['q']}"
        elif kb < 180:
            band = "低于区间下限（画面留白多/笔触简，不影响使用）"
        elif kb > 280:
            band = "高于区间上限（细节密，需复核是否降采样）"
        else:
            band = "在方案区间内"
        print(f"  {key:<9} {s/1024:8.1f} KB  →  {kb:7.1f} KB   {band}")

    print("-" * 66)
    print(f"完成 {done} 张，失败 {failed} 张，缺源图 {missing} 张")
    if done:
        print(f"源图合计  {total_src/1024/1024:6.2f} MB")
        print(f"产物合计  {total_dst/1024/1024:6.2f} MB")
        print(f"平均单张  {total_dst/done/1024:.1f} KB")
        if args.icons:
            budget = 1.8
            verdict = "在" if total_dst / 1024 / 1024 <= budget else "超出"
            print(f"图标预算 {budget:.1f} MB（89 张）→ {verdict}")
        elif done == len(KEYS):
            budget = 8.0
            verdict = "在" if total_dst / 1024 / 1024 <= budget else "超出"
            print(f"P0+P1 预算 {budget:.1f} MB（33 张）→ {verdict}")


if __name__ == "__main__":
    main()
