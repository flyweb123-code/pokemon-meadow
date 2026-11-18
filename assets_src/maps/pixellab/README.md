# PixelLab 필드 맵 4종 (화산 · 동굴 · 항구 도시 · 놀이공원)

모두 180x300 (초원 필드 바탕과 같은 크기, 게임의 360x600 필드에 2배로 그림).
출발 그림 = `../init/init_<맵>.png` (항구 도시는 `init_beach.png`).

## 설정 (4종 공통, 가을 필드 때와 같은 방식)
- PixelLab 웹 > Create image > **Pixen**, 180x300 (init 그림 크기를 그대로 씀)
- View = High top-down, Detail = Highly detailed, Outline = Lineless, Direction = None
- Transparent background = 끔
- Init image = 그 맵의 init 그림, Init Image Strength = **250** 한 번, **350** 한 번

## 프롬프트
| 맵 | 프롬프트 |
|---|---|
| volcano | volcanic crater field, basalt cliffs, lava falls and lava river along the cliff base, ash ground, pokemon style pixel art, top-down |
| cave | underground cave floor, stalactite ceiling, glowing blue crystals, small underground pool, dark stone, pokemon style pixel art, top-down |
| beach (항구 도시) | harbor town waterfront, row of colorful houses, stone-paved promenade, quay wall with bollards, wooden pier, lighthouse on breakwater, sandy beach on the right, sea in the lower half, pokemon style pixel art, top-down |
| park | amusement park plaza, paving tiles, snack stall awnings, bunting flags, street lamps, flower bed, no rides, pokemon style pixel art, top-down |

## 생성 횟수
맵마다 2번(250·350) x 4 = **Pixen 8번 = 8 generations**. 다시 돌린 것 없음.

## 파일
- `<맵>_250.png`, `<맵>_350.png`: 위쪽 하늘 줄의 평평한 회색을 투명으로 바꾼 것 (`sky_clear.py`: init 그림의 투명 칸 +2px 안에서, 맨 윗줄 회색과 비슷한 무채색만 위에서부터 채우기로 지움). 동굴은 하늘이 없어 그대로.
- `raw/<맵>_250.png`, `raw/<맵>_350.png`: PixelLab 원본 그대로.
- `raw/old_*.png`: 앞선 세션이 옛 밑그림으로 만든 후보 (PixelLab 갤러리에 남아 있던 것; 화산 2, 동굴 2, 해변 2, 놀이공원 3). 참고용.
- `preview_sheet.png`: 맵별 세로줄 = init / 250 / 350.

## 항구 도시 합성본 `beach_mix.png` (경완 고름)
- 도시(집 줄·돌 산책길·계선주)와 오른쪽 모래 해변·파도 = **250**, 등대를 포함한 왼쪽 아래 바닷가(등대·부두·옆 선착장·바다) = **350**. 250 의 모래 위 등대는 지움.
- 만든 방법 `harbor_mix.py`: 350 은 물이 y162 부터라 21px 올려 250 축대 끝(y141)에 붙임. 경계는 250 의 얕은 물·거품이 시작되는 곳까지라 깊은 물끼리 이어짐. 등대 꼭대기(축대 위로 솟은 부분)는 등대 색만 골라 얹음. 모래 위 등대 자리는 계선주 간격(24px) 옆 칸으로 덮음.
- PixelLab 생성은 더 쓰지 않음.

## 보고 메모
- 항구 도시: 두 장 다 집 줄·돌 부둣가·부두·등대·모래사장·바다가 잘 나옴. 250 은 집이 크고 등대가 모래 위, 350 은 집이 작고 등대가 방파제 위(출발 그림에 가까움).
- 놀이공원: 250 은 매점 차양·만국기·가로등·화단이 나옴(큰 놀이기구 없음, 위쪽에 야자수 두 그루). 350 은 울타리+만국기만 있고 바닥이 거의 빈 벽돌.
- 화산: 250 은 현무암 절벽+용암 줄, 바닥이 거의 단색 재. 350 은 용암 폭포 두 줄이 바닥까지 흘러내리고 바닥이 큰 자갈 무늬. 용암 강은 절벽 밑 띠 정도로만 나옴.
- 동굴: 두 장 다 어둡고 밋밋함. 250 은 종유석 천장+파란 수정 몇 개+작은 웅덩이, 350 은 바닥이 타일처럼 보이고 웅덩이가 사라짐. 손보기가 가장 필요함.
