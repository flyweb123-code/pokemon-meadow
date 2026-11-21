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

## 동굴 v6 (위에서 내려다보는 원근)
- 출발 그림 `../init_cave6.png` (커밋 70da1f23), Pixen 180x300, High top-down, Highly detailed, Lineless, 투명 배경 끔
- 프롬프트: high-angle top-down pixel art RPG cave field, 16-bit like Pokemon, looking down into a vast lower cavern that recedes into the distance: cave walls on both sides converge toward a vanishing point at the top, stepped rock terraces and stalagmites get smaller, darker and hazier with distance, a narrow mine-cart rail winds in an S-curve from the bottom of the cliff up into the far distance getting thinner, tiny glowing crystals. Bottom part: flat walkable cracked grey stone floor ending at a cliff rim, dark blue underground lake in the bottom-left. Strong 3D depth and perspective. No characters, no carts.
- 세기 200 → `cave6_200.png`, 300 → `cave6_300.png` (원본 그대로, raw/ 에 같은 파일). 검은 그림 없음.
- 생성 횟수: 2 generations
- 레일: 200 은 S 자 레일이 먼 굴 입구(x≈100, y≈45)에서 바닥 가운데(x≈130, y≈165)까지 내려와, 출발 그림의 위쪽 띠(y≈0~95)보다 아래 바닥까지 들어옴. 300 은 위쪽 S 자 레일이 사라지고, 바닥에 돌길 곡선과 광차 하나(x≈103, y≈148)가 그려짐.

## 동굴 v7 위 띠만 (cave7band, 180x72)
- 출발 그림 `../init_cave7_band.png` (커밋 946130aa), Pixen 180x72, High top-down, Highly detailed, Lineless, 투명 배경 끔
- 프롬프트: pixel art, 16-bit SNES Pokemon style. Standing at a cliff edge (bottom of image) and looking down and out over a vast underground cave landscape spreading below: far away at the top a hazy dark horizon, closer toward the bottom bigger stepped rock terraces and stalagmites, a glowing turquoise underground river winding into the distance, a thin mine-cart rail on small wooden trestles winding from the right side into the distance, tiny glowing crystals. Strong depth: things get smaller, bluer and hazier with distance. No characters, no carts, no text.
- 세기 200 → `cave7band_200.png`, 300 → `cave7band_300.png` (원본 그대로, raw/ 에 같은 파일)
- 생성 횟수: 2 generations
- 200: 계단식 바위 단이 겹겹이, 강은 가운데로 옮겨 굽이짐, 레일은 오른쪽 끝(x≈155~178)에서 세로로 구불구불. 아래 가운데(x≈88, y≈66)에 작은 사람 형체.
- 300: 강(왼쪽 가운데 위→아래)과 레일(왼쪽 위→오른쪽 아래 대각선)이 출발 그림 자리와 거의 같음. 종유석·석순이 앞에 크게. 아래 가운데(x≈85, y≈52~60)에 사람 형체.
