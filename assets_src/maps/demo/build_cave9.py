# 동굴 필드 시연 페이지 만들기 (경완 '지금 있는 필드 테마들 수준으로 동굴 맵 좀 만들어줘봐')
# 쓰는 법: python3 build_cave.py 바탕.png 설정.json 포켓몬.json 출력.html
import sys, json, base64, io
from PIL import Image
bgp, cfgp, monp, out = sys.argv[1:5]; basep = sys.argv[5] if len(sys.argv) > 5 else bgp
cfg = json.load(open(cfgp))
im = Image.open(bgp).convert('RGBA'); W, H = im.size; p = im.load()
iw = eval('lambda r,g,b,x,y: ' + cfg['isWaterPy'])
z = Image.new('RGBA', (W, H)); q = z.load()
for y in range(H):
  for x in range(W):
    r, g, b, a = p[x, y]
    q[x, y] = (0, 120, 255, 255) if iw(r, g, b, x, y) else (192, 64, 255, 255) if y < cfg['wallY'] else (90, 90, 90, 255)
def durl(img):
  b = io.BytesIO(); img.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
mons = []
if monp != '-':
  sp = json.load(open(monp))['sp']
  for m in cfg.get('mons', []):
    s = sp[str(m['sp'])]; mons.append({**m, 'v': m.get('sp_w', .4), 'f': s['walk'], 'w': s['ww'], 'h': s['wh']})
js = dict(cfg); js.pop('isWaterPy'); js['mons'] = mons
import os
for k, v in cfg.get('sprites', {}).items(): js['sprites'][k] = durl(Image.open(os.path.join(os.path.dirname(cfgp), v)).convert('RGBA'))
cj = json.dumps(js, ensure_ascii=False)
cj = cj[:-1] + ', "isWater": (r, g, b, x, y) => ' + cfg['isWaterJs'] + '}'
html = open(sys.argv[0].replace('build_cave9.py', 'cave9_tpl.html'), encoding='utf-8').read()
html = html.replace('/*CFG*/{}', cj).replace('MAP_IMG', durl(im)).replace('ZONES_IMG', durl(z)).replace('BASE_IMG', durl(Image.open(basep).convert('RGBA')))
cartp = sys.argv[6] if len(sys.argv) > 6 else None
if cartp: html = html.replace('CART_IMG', durl(Image.open(cartp).convert('RGBA')))
open(out, 'w', encoding='utf-8').write(html); print(len(html))
# v13 층 그림·게임 HUD (cave9_layers.py)
d = os.path.dirname(cfgp)
html = open(out, encoding='utf-8').read()
for k, f in [('BAND_IMG', 'layer_band.png'), ('STAL_IMG', 'layer_stal.png'), ('FLOOR_IMG', 'layer_floor.png'), ('HUD_IMG', 'hud_ip17p.png')]: html = html.replace(k, durl(Image.open(os.path.join(d, f)).convert('RGBA')))
open(out, 'w', encoding='utf-8').write(html); print(len(html))
