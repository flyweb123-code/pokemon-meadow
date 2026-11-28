# 크리스마스 트리 — PixelLab 후보 (2026-11-29)

PixelLab 웹 > Create image > **Pro**, 출력 64×64 (한 번에 4×4 = 16칸 판), Remove background 켬.
참고 그림: Reference image 1 = `../ref/winter_field_tree_x4.png`, 쓰임 칸에 "use colours, outline and pixel size from this (style only, not the shape)".
(Style image 칸은 출력 크기를 참고 그림 크기로 바꿔 버려서 쓰지 않음)

## 쓴 생성 횟수
Pro 4번 × 10 = **40 generations** (XMT1 1번, XMT2 2번, XMT3 1번)

## 문구
공통: "Pixel art game prop sprite for a cozy Pokemon-style top-down field, same style as a chunky 16-bit field tree: dark teal-green foliage (#415e50, #334a3f, #273830, #1a251f) with soft blue-white snow caps (#e4ebef, #d7e0e7) on top of each layer, crisp near-black #121717 one-pixel outline, light from the top-left, large readable pixel clusters, no dithering noise. The object is about 50 pixels wide and 60 pixels tall, centered, transparent background, no ground, no grass, no shadow, no text. Match the colours, outline and pixel size of reference image 1 (a snowy field tree), but draw a different object: A decorated Christmas fir tree with 4 layered tiers, a golden star on top, a string of small colorful light bulbs (red, yellow, blue, pink) wrapping around, a few red and gold ornament balls, and a short brown trunk with slightly spread roots at the bottom (no pot)."
(맨 앞에 "XMT1." / "XMT2." / "XMT3." 표시)

- XMT1: 공통 그대로 → `raw/XMT1_run1.png` (눈이 하늘색으로 진하고 잎이 밝음 — 참고 색과 가장 멂)
- XMT2: + "Snow-covered branches, the light bulbs are tiny single bright pixels, the trunk is visible below the lowest branches." → `raw/XMT2_run1.png`, `raw/XMT2_run2.png` (참고 색과 가장 가까움)
- XMT3: + "Rounder, chunkier branch clumps like a cartoon fir tree, thick snow on each tier, warm golden star." → `raw/XMT3_run1.png` (덩어리 모양은 참고 나무와 비슷, 눈이 많음)

참고 나무 색과의 거리(불투명 픽셀 중앙값, 낮을수록 비슷): XMT2 ≈ 12, XMT3 ≈ 18, XMT1 ≈ 44.
결과 크기: 대부분 46~48 × 61~62 px (참고 나무 50×58).

## 고른 것 (칸 번호는 판에서 왼쪽 위 0, 오른쪽으로 0~3, 다음 줄 4~7 …)
| 파일 | 판 | 칸 | 크기 | 메모 |
|---|---|---|---|---|
| pick_1.png | XMT2_run2 | 0 | 47×62 | 전구+빨강/금 공, 뿌리 퍼진 밑동 |
| pick_2.png | XMT2_run2 | 1 | 48×62 | 알록달록 전구 줄 가장 선명 |
| pick_3.png | XMT2_run2 | 8 | 48×62 | 눈 많음, 전구 줄 + 공 |
| pick_4.png | XMT2_run2 | 10 | 48×62 | 전구 + 금색 공, 균형 좋음 |
| pick_5.png | XMT2_run1 | 12 | 45×61 | 잎 진하고 공 많음 |
| pick_6.png | XMT3_run1 | 9 | 48×61 | 둥근 덩어리형, 눈 두꺼움 |

`picks_preview_x4.png`: 맨 왼쪽 겨울 열매나무(참고)와 pick_1~6 을 나란히 4배로 놓은 비교 그림.
게임에는 아직 연결하지 않음.
