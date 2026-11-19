# 항구 도시 시연 페이지 만들기: 게임(beta.html) 하늘 엔진 원본 줄을 잘라 붙이고 + 바다 파도 코드
# (경완 '이제 이거 파도 움직임 좀 넣어줘 하늘도 초원 필드랑 동일하게 엔진 넣어주고')
# 쓰는 법: python3 build_harbor.py beta.html harbor.png 출력.html
import sys, base64, re
L = open(sys.argv[1], encoding='utf-8').read().split('\n')
ln = lambda a, b: '\n'.join(L[a-1:b])
def find(pat, start=0):
  for i in range(start, len(L)):
    if re.search(pat, L[i]): return i+1
  raise SystemExit('못 찾음: '+pat)
def block(pat):            # pat 줄에서 시작해 맨 앞 '}' 줄까지
  a = find(pat); b = a
  while L[b-1] != '}': b += 1
  return ln(a, b)
src = []
src.append(block(r'^function sprCanvas\('))
src.append(L[find(r'^  SPR\.sun = sprCanvas')-1].strip())
src.append(L[find(r'^  SPR\.cloud = sprCanvas')-1].strip())
src.append(L[find(r'^  SPR\.cloudG = sprCanvas')-1].strip())
src.append(L[find(r'^const SKYC = ')-1]); src.append(L[find(r'^const hex = ')-1]); src.append(L[find(r'^let skyKey')-1])
src.append(block(r'^function drawSky\('))
a = find(r'^const MOON_C'); src.append(ln(a, find(r'^let moonSt', a)))
sb = block(r'^function skyBodies\(')
# 항구는 하늘 띠가 낮아서(지붕이 y 40px 쯤) 해·달 길·구름 높이만 맵 값으로 (나머지는 원본 그대로)
sb = sb.replace('y = 92 - Math.sin(Math.PI * t) * 46', 'y = MAP_SKY.y0 - Math.sin(Math.PI * t) * MAP_SKY.dy')
sb = sb.replace('(2 + Math.random() * 56)', '(2 + Math.random() * MAP_SKY.cl)')
assert 'MAP_SKY.y0' in sb and 'MAP_SKY.cl' in sb
src.append(sb)
src.append(L[find(r'^const SKY = ')-1])
GAME = '\n'.join(src)
css = '\n'.join(l for l in L if re.match(r'^(\.stage #skyC|#skyFx|#night\{position)', l))
img = 'data:image/png;base64,' + base64.b64encode(open(sys.argv[2], 'rb').read()).decode()
html = open(sys.argv[0].replace('build_harbor.py', 'harbor_tpl.html'), encoding='utf-8').read()
zimg = 'data:image/png;base64,' + base64.b64encode(open(sys.argv[2].replace('harbor.png', 'harbor_zones.png'), 'rb').read()).decode()
html = html.replace('ZONES_IMG', zimg).replace('/*GAME_CSS*/', css).replace('/*GAME_JS*/', GAME).replace('HARBOR_IMG', img)
open(sys.argv[3], 'w', encoding='utf-8').write(html)
print(len(html))
