# v22.19 경완 '지도를 띄워줄 수 있나 → 1번 도트 지도': 이벤트 자리 작은 도트 지도를 미리 그려 둔다 (게임은 인터넷 지도를 안 부름).
# OpenStreetMap(Overpass) 에서 물·녹지·큰길·철길만 받아 W×H 칸 그림으로 → config/ev-map/<id>.png + <id>.json {la0,lo0,la1,lo1,w,h}
# 쓰는 법: python3 tools/ev-map.py [spawn-ev.json]   (기본 config/spawn-ev.json, 이미 그린 id 는 건너뜀, --force 다시)
import json, math, os, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw
W, H, OUT = 96, 72, 'config/ev-map'
PAL = {'bg': (236, 226, 190), 'green': (150, 200, 110), 'green2': (120, 176, 90), 'water': (104, 168, 232), 'water2': (82, 140, 210),
       'road': (255, 250, 236), 'road2': (214, 196, 150), 'rail': (150, 130, 120), 'bld': (222, 208, 170)}
def overpass(q):
    for url in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
        for k in range(3):
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'pokemon-meadow-evmap/1'})
                return json.load(urllib.request.urlopen(req, timeout=90))
            except Exception as e: print('overpass', url, e); time.sleep(5 * (k + 1))
    raise SystemExit('overpass 실패')
def draw(e, force=False):
    os.makedirs(OUT, exist_ok=True); p = f"{OUT}/{e['id']}.png"
    if os.path.exists(p) and not force: return
    la, lo, r = e['la'], e['lo'], e['r']
    half = r * 1.45; dla = half / 111320; dlo = dla * W / H / math.cos(math.radians(la))   # 원이 그림 가운데 70% 쯤
    la0, la1, lo0, lo1 = la - dla, la + dla, lo - dlo, lo + dlo; bb = f'{la0},{lo0},{la1},{lo1}'
    q = f'''[out:json][timeout:60];(
      way["natural"="water"]({bb}); relation["natural"="water"]({bb}); way["waterway"="riverbank"]({bb}); way["landuse"="reservoir"]({bb}); way["waterway"~"river|canal"]({bb});
      way["leisure"~"park|garden|golf_course|pitch|stadium"]({bb}); way["landuse"~"grass|forest|meadow|recreation_ground|farmland"]({bb}); way["natural"~"wood|scrub|grassland"]({bb});
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]({bb}); way["railway"="rail"]({bb}); way["building"]({bb}););out geom;'''
    d = overpass(q)
    S = 4; im = Image.new('RGB', (W * S, H * S), PAL['bg']); g = ImageDraw.Draw(im)
    xy = lambda pt: ((pt['lon'] - lo0) / (lo1 - lo0) * W * S, (la1 - pt['lat']) / (la1 - la0) * H * S)
    def geoms(el):
        if el['type'] == 'way' and el.get('geometry'): yield el['geometry']
        for m in el.get('members', []):
            if m.get('geometry') and m.get('role') != 'inner': yield m['geometry']
    def kind(t):
        if t.get('building'): return 'bld'
        if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('landuse') == 'reservoir': return 'water'
        if t.get('waterway'): return 'river'
        if t.get('highway'): return 'road'
        if t.get('railway'): return 'rail'
        return 'green'
    E = d.get('elements', []); order = ['green', 'bld', 'water', 'river', 'rail', 'road']
    for k in order:
        for el in E:
            if kind(el.get('tags', {})) != k: continue
            for gm in geoms(el):
                P = [xy(pt) for pt in gm]
                if len(P) < 2: continue
                if k in ('green', 'water', 'bld') and len(P) > 2: g.polygon(P, fill=PAL[k])
                elif k == 'river': g.line(P, fill=PAL['water'], width=int(S * 2.5))
                elif k == 'rail': g.line(P, fill=PAL['rail'], width=S)
                elif k == 'road':
                    big = el['tags']['highway'] in ('motorway', 'trunk', 'primary'); g.line(P, fill=PAL['road2'], width=S * (4 if big else 3)); g.line(P, fill=PAL['road'], width=S * (2 if big else 1))
    sm = im.resize((W, H), Image.NEAREST)   # 그린 색이 PAL 뿐이라 그대로 도트
    px = sm.load()   # 도트 느낌: 녹지·물 가장자리 아래쪽 한 칸 진하게 (작은 그림자)
    for y in range(H - 1, 0, -1):
        for x in range(W):
            a, b = px[x, y], px[x, y - 1]
            if b != a and a == PAL['bg'] and b in (PAL['green'], PAL['water']): px[x, y] = PAL['green2'] if b == PAL['green'] else PAL['water2']
    sm.save(p, optimize=True)
    json.dump({'la0': la0, 'lo0': lo0, 'la1': la1, 'lo1': lo1, 'w': W, 'h': H, 'src': '© OpenStreetMap contributors'}, open(f"{OUT}/{e['id']}.json", 'w'))
    print('ok', e['id'], len(E))
if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; f = a[0] if a else 'config/spawn-ev.json'
    for e in json.load(open(f))['ev']: draw(e, '--force' in sys.argv); time.sleep(2)
