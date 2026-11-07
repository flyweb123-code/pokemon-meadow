# 알 뽑기 기계 PixelLab 시안

도구: PixelLab 웹 Create image, Pro 모델(Pro 모드), Remove background 켬, 색 수 제한 없음.
참고 그림: ref/guide_empty.png (게임 CSS 치수대로 그린 빈 기계, 208x256).
생성: Pro 9번 x 10 generations = 90 generations.

- machine_red_1 (raw/run2_red): 돔 옆 겹선을 스크립트로 지움
- machine_orange_1 (raw/run6_orange): 돔 맨 위가 잘려서 원에 맞춰 위로 8px 늘려 복원
- machine_blue_1 (raw/run7_blue): 원본 그대로
- machine_gold_1 (raw/run8_gold): 돔 위 8px, 아래 3px 늘려 복원
- knob_1~3: 손잡이 전용 생성(raw/run9_knob_grid, 64x64 16개 중 3개). knob_2, knob_3은 90도 돌려 세움
- knob_<색>: 각 기계에서 원으로 잘라낸 손잡이. layout.json의 knob_center에 올리면 원래 자리와 맞음
- shine_<색>: 돔 안 밝은 부분만 뽑은 겹침 그림(기계와 같은 캔버스, 알파 200). 알 위에 올림
- layout.json: 캔버스 좌표. dome_inner(알 범위), knob_center, outlet(배출구)
- 돔 유리는 #d8f0ff 불투명. 안은 비어 있음
- 크기를 바꿀 때는 nearest-neighbor만 사용

## machine_ball_1 (몬스터볼 색, 1번 기반)
machine_red_1을 스크립트로 수정. PixelLab 생성 0번.
- 점수 딱지 제거. 게임의 점수 표시(.ga-pl)는 다른 자리로 옮겨야 함
- 위 빨강, 아래 하양, 가운데 검은 띠(y 204~208)가 손잡이 중심을 지남
- 돔 테두리 4px에서 2px로. 돔 안쪽 172x153
- knob_ball, shine_ball 함께 사용. 좌표는 layout.json의 ball

손잡이: machine_ball_1, knob_ball의 크림색을 흰색으로 교체 (면 #ffffff, 테두리 음영 #e2e7f0).

## layout_mock/
알 뽑기 화면 시안. 게임의 실제 CSS로 그린 390px 폭 화면이고 알 그림은 임시. cur=현재, A/B/C=시안, _f=알 있음, _e=빈 상태.

## bg/ 알 뽑기 화면 배경
PixelLab Create image, Pixen 모델, Side view, Highly detailed, Lineless, 불투명, 196x392 (2배로 쓰면 392x784, nearest만).
bg_festival(축제 거리), bg_toyshop(장난감 가게), bg_tile(체크 타일 코너). raw/는 쓰지 않은 첫 시도.
시안에서는 폭 390px에 맞춰 세로 위치를 위로 옮김: 2배 기준 toyshop 109px, festival 100px, tile 90px. 기계 밑면이 바닥이나 선반에 닿는 위치.
layout_mock/D_*: 박스 없앤 배치 + 배경 시안.

## 방사형 배경 (경완이 고른 방향, 그림 파일 없이 CSS)
bg/의 그림 대신 쓰는 시안. 기계를 화면 정중앙에 두고 그 중심에서 퍼짐. 388px는 시안 기준 값이라 실제 화면에서는 기계 중심 좌표로 바꿀 것.
layout_mock/E_<gold|blue|red>_<f|e>.png

gold:
background:repeating-conic-gradient(from 0deg at 50% 388px,rgba(255,255,255,.17) 0 9deg,transparent 9deg 18deg),radial-gradient(circle at 50% 388px,#fff8cf 0,#ffdc6a 30%,#f7a12a 62%,#c9551c 100%);
blue:
background:repeating-conic-gradient(from 0deg at 50% 388px,rgba(255,255,255,.13) 0 9deg,transparent 9deg 18deg),radial-gradient(circle at 50% 388px,#f2fcff 0,#9fe0f7 30%,#3f95dc 64%,#1e3f94 100%);
red:
background:radial-gradient(circle at 50% 388px,#fff0dc 0,#ffb27a 26%,#e0483a 60%,#701226 100%);
