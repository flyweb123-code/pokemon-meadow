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

## 방사형 배경 (그림 파일 없이 CSS)
기계를 화면 정중앙에 두고 그 중심에서 퍼짐. 값은 radial_bg_css.json. 중심 195px 388px은 시안 기준이라 실제 화면의 기계 중심으로 바꿀 것. 반짝이(spark)는 red에 작은 흰 점을 더한 것.
layout_mock/F_<red|rings|steps|dots|spark|purple|navy|green|pink>.png, 알은 게임의 실제 그림.

## 뽑기 버튼 색 시안 (금색 1 배경, 게이지 14px 내림)
layout_mock/F_btn_<red|blue|green>_<f|e>.png
red 면 #d8352c 아래 음영 #a81f1c / blue #2f7fd8, #1f5aa8 / green #2fa45e, #1d7a44

## shiny_mock/ 이로치 알 효과 시안
shiny_eggs.html. CSS만 사용. 알 모양 마스크는 게임의 EGG_SVG 픽셀로 만든 SVG. 효과: 1 빛 훑기, 2 진주 광택, 3 반점 무지개(@property로 --es 색을 돌림), 4 픽셀 반짝, 5 금빛 테두리(--eo), 6 색 바뀐 알. 게임의 .shx 클래스에 붙이면 됨.
맨 위 A~D는 이로치 포켓몬 등장 효과(shinyFx: 별 8개+6개 두 겹이 퍼짐, 두 번 번쩍)를 알에 반복한 것. A 2.8초, B 4초, C 작게 2초, D 퍼짐+잔별. 알마다 --o로 시작 시점을 어긋나게 함.
경완이 C(작게 자주)를 고름. 맨 위는 C의 별 색 6종: 금(지금), 흰·은, 분홍, 하늘, 무지개(별마다 다름), 알 색 맞춤(등급별 반점 색). 별 SVG의 #ffd84a만 바꿈.
경완이 금색으로 결정. shiny_screens.html: 알림창·알 가방·알 정보 카드에 넣은 모습(게임 CSS 그대로). 적용 CSS는 파일 끝의 "proposal" 블록: .egg.shx .shb를 숨기고 .bur(별 4+4)를 넣음, --k는 알 크기/42.

## step_mock/ 뽑기 흔들림 단계 시안 (파칭코 시안 대신)
gacha_steps.html. 손잡이가 돌고 기본 흔들림 0.9초 뒤, 등급이 하나 오를 때마다 기계가 그 등급 색(우수 주황, 레어 파랑, 에픽 보라, 전설 금)으로 번쩍이고 흔들림이 세짐. 우수 1단계, 레어 2, 에픽 3, 전설 4. 단계마다 머무는 시간 우수 1.1초, 레어 1.5초, 에픽 1.8초, 전설 2.1초로 점점 길어짐(경완: 에픽에서 레어 단계가 너무 빨리 지나감). 결과 창까지 일반 약 1.9초, 우수 3.1, 레어 4.6, 에픽 6.4, 전설 8.7초(계산값). 진동(navigator.vibrate)도 단계마다 길어짐: 20 / 30 / 40x3 / 60x3 / 90x3+160ms. 게임에서는 haptic()으로 바꿔 쓰면 됨. 흔들림 세기 .35/.6/.95/1.35/1.85.

## thanks_mock/ 친구 선물 고마워 버튼 시안
thanks.html. 지금 게임(v18.86 분홍 .frg-ok.ty)과 A 하트 버튼, B 말풍선 버튼, C 빛 훑기 분홍. 누르면 하트가 날아가고 "고마움을 전했어요"로 바뀜(시안 안 스크립트).
