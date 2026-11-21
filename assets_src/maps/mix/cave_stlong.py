# 동굴 종유석 두 개 길게 (경완 '종유석 몇 개 길게 늘이기' — 박쥐 매달리기 자리).
# 날짜 박스(위 ~y75 스테이지) 밑으로 끝이 보이게, 보석 사이 틈 x 158·250(스테이지) 에 새로 그린다.
# 모양은 맵의 x65~75 종유석(0~22줄)을 세로로 늘여 씀. 다시 돌리면 원본(/tmp 사본 또는 git)에서 시작할 것.
import sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else 'maps/cave_st.png'
st = Image.open(src).convert('RGBA')
base = st.crop((64, 0, 77, 23))          # 13×23 원본 종유석
W, H = base.size
def long(h):
    # 위 4줄·끝 7줄은 그대로, 가운데를 늘여 h 줄로
    top, tip = base.crop((0, 0, W, 4)), base.crop((0, H - 7, W, H))
    mid = base.crop((0, 4, W, H - 7)).resize((W, h - 11), Image.NEAREST)
    o = Image.new('RGBA', (W, h)); o.paste(top, (0, 0)); o.paste(mid, (0, 4)); o.paste(tip, (0, h - 7)); return o
out = st.copy()
for cx, h in ((79, 43), (125, 38)):      # 맵 칸(스테이지의 1/2): 끝 y 43·38 → 스테이지 86·76 (왼쪽은 날짜 박스 밑으로 끝이 보이게 더 길게)
    s = long(h); out.alpha_composite(s, (cx - 6, 0))
out.save('maps/cave_st.png', optimize=True)
