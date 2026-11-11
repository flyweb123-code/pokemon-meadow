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
PAL2 = {'bg': (243, 240, 232), 'green': (198, 228, 176), 'water': (166, 208, 242), 'road': (255, 255, 255), 'road2': (222, 216, 204), 'big': (255, 236, 186), 'big2': (232, 196, 130), 'rail': (190, 184, 176), 'bld': (232, 227, 216)}
def draw(e, force=False, smooth=False):
    os.makedirs(OUT, exist_ok=True); p = f"{OUT}/{e['id']}.png"
    if smooth: p = f"{OUT}/{e['id']}.png"
    if os.path.exists(p) and not force: return
    la, lo, r = e['la'], e['lo'], e['r']
    half = r * 1.45; dla = half / 111320; dlo = dla * W / H / math.cos(math.radians(la))   # 원이 그림 가운데 70% 쯤
    la0, la1, lo0, lo1 = la - dla, la + dla, lo - dlo, lo + dlo; bb = f'{la0},{lo0},{la1},{lo1}'
    q = f'''[out:json][timeout:60];(
      way["natural"="water"]({bb}); relation["natural"="water"]({bb}); way["waterway"="riverbank"]({bb}); way["landuse"="reservoir"]({bb}); way["waterway"~"river|canal"]({bb});
      way["leisure"~"park|garden|golf_course|pitch|stadium"]({bb}); way["landuse"~"grass|forest|meadow|recreation_ground|farmland"]({bb}); way["natural"~"wood|scrub|grassland"]({bb});
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]({bb}); way["railway"="rail"]({bb}); way["building"]({bb}););out geom;'''
    d = overpass(q)
    C = PAL2 if smooth else PAL; S = 24 if smooth else 4; im = Image.new('RGB', (W * S, H * S), C['bg']); g = ImageDraw.Draw(im)
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
                u = S / 4 if smooth else S
                if k in ('green', 'water', 'bld') and len(P) > 2: g.polygon(P, fill=C[k])
                elif k == 'river': g.line(P, fill=C['water'], width=int(u * 2.5), joint='curve')
                elif k == 'rail': g.line(P, fill=C['rail'], width=int(u * (1.5 if smooth else 1)), joint='curve')
                elif k == 'road':
                    big = el['tags']['highway'] in ('motorway', 'trunk', 'primary')
                    if smooth: g.line(P, fill=C['big2' if big else 'road2'], width=int(u * (5 if big else 3.4)), joint='curve'); g.line(P, fill=C['big' if big else 'road'], width=int(u * (3.4 if big else 2)), joint='curve')
                    else: g.line(P, fill=PAL['road2'], width=S * (4 if big else 3)); g.line(P, fill=PAL['road'], width=S * (2 if big else 1))
    if smooth:   # v22.19 경완 '글자 없이 그래픽 형태로': 크게 그려 부드럽게 줄임 (576×432)
        im.resize((W * 6, H * 6), Image.LANCZOS).save(p, optimize=True)
        json.dump({'la0': la0, 'lo0': lo0, 'la1': la1, 'lo1': lo1, 'w': W * 6, 'h': H * 6}, open(f"{OUT}/{e['id']}.json", 'w')); print('ok vec', e['id'], len(E)); return
    sm = im.resize((W, H), Image.NEAREST)   # 그린 색이 PAL 뿐이라 그대로 도트
    px = sm.load()   # 도트 느낌: 녹지·물 가장자리 아래쪽 한 칸 진하게 (작은 그림자)
    for y in range(H - 1, 0, -1):
        for x in range(W):
            a, b = px[x, y], px[x, y - 1]
            if b != a and a == PAL['bg'] and b in (PAL['green'], PAL['water']): px[x, y] = PAL['green2'] if b == PAL['green'] else PAL['water2']
    sm.save(p, optimize=True)
    json.dump({'la0': la0, 'lo0': lo0, 'la1': la1, 'lo1': lo1, 'w': W, 'h': H, 'src': '© OpenStreetMap contributors'}, open(f"{OUT}/{e['id']}.json", 'w'))
    print('ok', e['id'], len(E))

def tile_map(e, force=False):   # v22.19 경완 '도트 느낌 말고 그냥 지도 형태': OSM 기본 지도 타일을 이어 붙여 한 장으로 (이벤트마다 한 번만 받음)
    import io
    os.makedirs(OUT, exist_ok=True); p = f"{OUT}/{e['id']}.jpg"
    if os.path.exists(p) and not force: return
    la, lo, r = e['la'], e['lo'], e['r']
    half = r * 1.45; c = math.cos(math.radians(la))   # 그림 세로 = 반경 × 2.9 (원이 세로 69%), 가로:세로 = 4:3
    z = max(10, min(17, math.ceil(math.log2(156543.03 * c * 380 / (half * 2)))))   # 세로가 타일 픽셀로 380 쯤 되는 줌 (늘리지 않고 원래 글자 크기)
    mpp = 156543.03 * c / 2 ** z; PH = round(half * 2 / mpp); PW = round(PH * 4 / 3)
    n = 2 ** z; tw = 256; fx = (lo + 180) / 360 * n; fy = (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * n
    x0 = fx * tw - PW / 2; y0 = fy * tw - PH / 2
    im = Image.new('RGB', (PW, PH), (240, 236, 228))
    for tx in range(int(x0 // tw), int((x0 + PW) // tw) + 1):
        for ty in range(int(y0 // tw), int((y0 + PH) // tw) + 1):
            url = f'https://tile.openstreetmap.org/{z}/{tx % n}/{ty}.png'
            for k in range(3):
                try: t = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'pokemon-meadow-evmap/1 (github.com/flyweb123-code/pokemon-meadow)'}), timeout=30).read())).convert('RGB'); break
                except Exception as x: print('tile', url, x); time.sleep(2)
            else: continue
            im.paste(t, (round(tx * tw - x0), round(ty * tw - y0))); time.sleep(.3)
    im.save(p, quality=82, optimize=True)
    dla = half / 111320; dlo = dla * PW / PH / math.cos(math.radians(la))
    json.dump({'la0': la - dla, 'lo0': lo - dlo, 'la1': la + dla, 'lo1': lo + dlo, 'w': PW, 'h': PH, 'src': '© OpenStreetMap contributors'}, open(f"{OUT}/{e['id']}.json", 'w'))
    print('ok tile', e['id'], z)
def geo(name):   # 이름으로 자리 찾기 (루틴이 좌표 확인용): python3 tools/ev-map.py --geo 포천아트밸리
    d = overpass(f'[out:json][timeout:60];area["ISO3166-1"="KR"]->.k;(nwr["name"="{name}"](area.k););out center 5;')
    for el in d.get('elements', []): c = el.get('center') or el; print(name, el['type'], c.get('lat'), c.get('lon'), el.get('tags', {}).get('name'))
if __name__ == '__main__':
    if '--geo' in sys.argv: [geo(n) for n in sys.argv[sys.argv.index('--geo') + 1:]]; sys.exit()
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; f = a[0] if a else 'config/spawn-ev.json'
    for e in json.load(open(f))['ev']: (tile_map(e, '--force' in sys.argv) if '--tile' in sys.argv else draw(e, '--force' in sys.argv, smooth='--dot' not in sys.argv)); time.sleep(2)
