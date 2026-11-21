# 동굴 v3 PixelLab 결과

- 출발 그림: `../init_cave3.png` (180x300)
- PixelLab 웹 > Create image > Pixen, 180x300, View = High top-down, Detail = Highly detailed, Outline = Lineless, Direction = None, Transparent background 끔
- 프롬프트: underground cave floor, stalactite ceiling wall, glowing gem crystal veins in the cave wall, mine tunnel entrance with wooden frame, mine cart rail track, still underground lake with rocky shore and stepping stones, glowing purple mushrooms, soft light beam from a hole in the ceiling, pokemon style pixel art, top-down
- Init Image Strength 200 / 280 / 350 → `cave3_200.png`, `cave3_280.png`, `cave3_350.png` (PixelLab 원본 그대로, 손대지 않음)
- 생성 횟수: 3 generations

## 동굴 v5 (공간감 버전)
- 출발 그림 `../init_cave5.png` (커밋 b2a30e4d), Pixen 180x300, High top-down, Highly detailed, Lineless, 투명 배경 끔
- 프롬프트: top-down pixel art RPG cave field, 16-bit SNES style like Pokemon. Top band: a huge deep underground cavern seen in the distance — layered rock pillars fading into purple haze, stalactites hanging from the ceiling in front, tiny glowing crystals, a long wooden trestle bridge with a narrow mine-cart rail crossing the whole width far away over a dark chasm. Bottom: flat walkable cracked stone floor with a rocky ledge edge at the back, a dark blue underground lake in the bottom-left corner. No rail on the floor, no tunnel, no characters, no carts. Strong sense of depth and atmospheric perspective.
- 세기 250 → `cave5_250.png`, 350 → `cave5_350.png` (원본 그대로, raw/ 에 같은 파일). 250 한 번 더 돌렸지만 PixelLab 이 새까만 그림을 돌려줘 버림.
- 생성 횟수: 3 generations
- 먼 다리 레일 줄: 250 은 다리가 청록 난간 띠(y44~51)로 바뀌고 가운데(x≈85)에 사람 같은 형체가 섞임. 350 은 진한 붉은 나무다리 상판이 y41~45 에 가로로 곧게 이어지지만, x≈106~125 에 노란 광차 비슷한 것이 그려져 있음.
