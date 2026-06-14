#!/usr/bin/env python3
"""アイコンを透過 PNG で書き出す。

icons/icon-16/32/48/128/512.png を生成する(角丸プレート + 図柄)。
角丸の外側は透過なので、ツールバー・拡張一覧・ストアのどこでも崩れない。

qlmanage は書き出し時に白背景を焼き込んでしまうため、Pillow で直接描画する。
高解像度で描いて縮小(スーパーサンプリング)し、エッジを滑らかにする。

使い方: python3 scripts/render-icons.py  (要 Pillow)
"""
import os
from PIL import Image, ImageDraw

S = 8            # スーパーサンプリング倍率
BASE = 128       # 基準キャンバス(128x128 の座標系)
ICONS_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")


def rgba(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


BLUE = rgba("#3b82f6")
GREEN = rgba("#22c55e")
PINK = rgba("#ec4899")
PLATE = rgba("#17181b")

# 体(ピル): x, y, w, h, color  / 頭(丸): cx, cy, color(半径は HEAD_R)
BARS = [(12, 62, 22, 50, BLUE), (53, 44, 22, 68, GREEN), (94, 62, 22, 50, PINK)]
HEADS = [(23, 44, BLUE), (64, 26, GREEN), (105, 44, PINK)]
HEAD_R = 11


def render():
    size = BASE * S
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=28 * S, fill=PLATE)
    for x, y, w, h, color in BARS:
        d.rounded_rectangle(
            [x * S, y * S, (x + w) * S - 1, (y + h) * S - 1],
            radius=(w / 2) * S,
            fill=color,
        )
    for cx, cy, color in HEADS:
        d.ellipse(
            [(cx - HEAD_R) * S, (cy - HEAD_R) * S, (cx + HEAD_R) * S, (cy + HEAD_R) * S],
            fill=color,
        )
    return img


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(ICONS_DIR, name))


def main():
    img = render()
    for s in (16, 32, 48, 128, 512):
        save(img, f"icon-{s}.png", s)
    print("icons written to", os.path.normpath(ICONS_DIR))


if __name__ == "__main__":
    main()
