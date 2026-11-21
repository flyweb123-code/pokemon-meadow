# 동굴 소품 스프라이트 (PixelLab Pro)

PixelLab 웹 > Create image > **Pro**, 출력 32x32 (한 번에 8x8 = 64가지), Remove background 켬, 참고 그림 없음. 한 번에 10 generations.
공통 문구: "Pixel art game prop sprite for a Pokemon Scarlet style cave field, high top-down 3/4 view, light from the top-left, crisp dark #1c1426 one-pixel outline around the whole object, the object fills about 65% of the canvas and is centered, transparent background, no ground, no grass, no shadow, no text."

| 파일 | 앞 문구 | 64칸 중 고른 번호 |
|---|---|---|
| gem_water_1/2 | A cluster of 5 sharp pointed light-blue Water Stone crystals rising from a small grey rock base, each crystal face shaded in 4 tones of blue with bright white highlights and a soft inner glow. | 4, 36 |
| gem_moon_1/2 | ... pink Moon Stone crystals ... 4 tones of pink and magenta ... | 0, 21 |
| gem_thunder_1/2 | ... yellow Thunder Stone crystals ... 4 tones of yellow and amber ... | 19, 44 |
| mush_big_1/2 | A cluster of glowing cave mushrooms: one large mushroom and two small ones, purple and teal glowing caps with bright luminous spots, thin pale stems. | 0, 25 |
| mush_small_1/2 | A small cluster of 2 to 3 little glowing cave mushrooms, purple and teal glowing caps with bright luminous spots, thin pale stems. | 8, 2 |
| cart_front_1/2 | A wooden mine cart with iron rim edges, a little grey ore and gems loaded inside, all four wheels visible, front view of the cart coming toward the viewer down a vertical track, no rails drawn. | 4, 44 |
| cart_back_1/2 | ... back view of the cart moving away from the viewer up a vertical track ... | 1, 24 |

(각 프롬프트 맨 앞에 갤러리에서 찾기 쉽게 CVG1~3 / CVM1~2 / CVC1~2 표시를 붙였음)

- 생성 횟수: 7번 x 10 = **70 generations**
- raw/grid_*.png: 64칸 전체 (다른 후보를 고를 때 칸 번호 = 왼쪽 위부터 가로로 0~63)
- preview.png: 고른 14장을 4배로
- 메모: 광차는 정면·뒷면이라 바퀴는 아래쪽 2~4개만 보임. 버섯 일부는 줄기가 아래 칸 끝까지 닿음.

## 2차: 작은 야광 버섯 16x16 (mush16_1~4)
Pro, Custom size 16x16 (8x8 = 64가지), Remove background 켬. 공통 문구는 위와 같고 "fills about 60% of the canvas".
- mush16_1, mush16_2: "Two tiny glowing cave mushrooms side by side, one slightly taller, purple and teal glowing caps with bright luminous dots, thin pale stems, small and delicate" — raw/grid_mush16_two.png 칸 2, 17
- mush16_3, mush16_4: "Three tiny glowing cave mushrooms in a little clump, ..." — raw/grid_mush16_three.png 칸 5, 9
- 생성 횟수: 2번 x 10 = 20 generations. (48x32 보석 무리는 경완 '이미 만든 보석을 겹쳐 쓰면 된다'로 만들지 않음)
