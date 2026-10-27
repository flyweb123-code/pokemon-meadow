# 기술 파티클: 플래티넘 원본 파티클 파일(res/graphics/battle/particles/*.spa, SPL 형식)을
# gym/img/spl/<이름>.json (방출기 설정) + <이름>.png (그림 띠) 로 바꾼다. 브라우저 엔진은 gymb/spl.js.
# python3 tools/gym/mkspl.py <pokeplatinum 폴더> [이름...]
# 구조는 pret/pokeplatinum lib/spl/include/spl_resource.h 를 그대로 따른다.
import sys, os, struct, json
from PIL import Image

def u16(b, o): return struct.unpack_from('<H', b, o)[0]
def s16(b, o): return struct.unpack_from('<h', b, o)[0]
def u32(b, o): return struct.unpack_from('<I', b, o)[0]
def s32(b, o): return struct.unpack_from('<i', b, o)[0]
def bits(x, lo, n): return (x >> lo) & ((1 << n) - 1)
FX = 4096.0
def rgb(v): return [v & 31, (v >> 5) & 31, (v >> 10) & 31]

def c555(v, a=255):
    r, g, b = v & 31, (v >> 5) & 31, (v >> 10) & 31
    return ((r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2), a)

def decode_tex(fmt, w, h, data, pal, c0):
    px = []
    pc = lambda i, a=255: c555(u16(pal, 2 * i), a) if 2 * i + 2 <= len(pal) else (0, 0, 0, a)
    if fmt in (2, 3, 4):
        bp = {2: 2, 3: 4, 4: 8}[fmt]; per = 8 // bp
        for n in range(w * h):
            u = (data[n // per] >> ((n % per) * bp)) & ((1 << bp) - 1)
            px.append(pc(u, 0 if (u == 0 and c0) else 255))
    elif fmt == 1:
        for n in range(w * h): x = data[n]; a3 = x >> 5; px.append(pc(x & 31, (((a3 << 2) | (a3 >> 1)) * 255) // 31))
    elif fmt == 6:
        for n in range(w * h): x = data[n]; px.append(pc(x & 7, ((x >> 3) * 255) // 31))
    elif fmt == 7:
        for n in range(w * h): v = u16(data, 2 * n); px.append(c555(v, 255 if v & 0x8000 else 0))
    else:
        raise ValueError('tex format %d' % fmt)
    im = Image.new('RGBA', (w, h)); im.putdata(px); return im

def parse(b):
    assert b[:4] == b' APS', b[:4]
    nres, ntex = u16(b, 8), u16(b, 10); o = 32; R = []
    for _ in range(nres):
        f = u32(b, o); h = b[o:o + 88]
        r = dict(
            et=bits(f, 0, 4), dt=bits(f, 4, 2), ca=bits(f, 6, 2), rot=bits(f, 12, 1), ria=bits(f, 13, 1), sm=bits(f, 14, 1),
            fe=bits(f, 15, 1), pra=bits(f, 17, 2), prp=bits(f, 19, 1), rla=bits(f, 20, 1), dcf=bits(f, 21, 1), hp=bits(f, 22, 1), vs=bits(f, 23, 1),
            pos=[s32(h, 4) / FX, s32(h, 8) / FX, s32(h, 12) / FX], n=s32(h, 16) / FX, rad=s32(h, 20) / FX, len=s32(h, 24) / FX,
            ax=[s16(h, 28) / FX, s16(h, 30) / FX, s16(h, 32) / FX], col=rgb(u16(h, 34)), vp=s32(h, 36) / FX, va=s32(h, 40) / FX,
            sc=s32(h, 44) / FX, asp=s16(h, 48) / FX, dly=u16(h, 50), rmin=s16(h, 52), rmax=s16(h, 54), ang=u16(h, 56),
            elt=u16(h, 60), plt=u16(h, 62))
        ra = u32(h, 64); r['raS'], r['raL'], r['raV'] = bits(ra, 0, 8), bits(ra, 8, 8), bits(ra, 16, 8)
        m0, m1, m2 = u32(h, 68), u32(h, 72), u32(h, 76)
        r.update(iv=max(1, bits(m0, 0, 8)), alpha=bits(m0, 8, 8), air=bits(m0, 16, 8), tex=bits(m0, 24, 8), loop=max(1, bits(m1, 0, 8)),
                 dbb=bits(m1, 8, 16) / FX, tS=bits(m1, 24, 2), tT=bits(m1, 26, 2), sad=bits(m1, 28, 3), dfe=bits(m1, 31, 1), fS=bits(m2, 0, 1), fT=bits(m2, 1, 1),
                 px=s16(h, 80) / FX, py=s16(h, 82) / FX)
        o += 88
        if bits(f, 8, 1):  # scale anim
            r['sa'] = [s16(b, o) / FX, s16(b, o + 2) / FX, s16(b, o + 4) / FX, b[o + 6], b[o + 7], u16(b, o + 8) & 1]; o += 12
        if bits(f, 9, 1):  # color anim
            cf = u16(b, o + 8)
            r['cl'] = [rgb(u16(b, o)), rgb(u16(b, o + 2)), b[o + 4], b[o + 5], b[o + 6], cf & 1, (cf >> 1) & 1, (cf >> 2) & 1]; o += 12
        if bits(f, 10, 1):  # alpha anim
            a = u16(b, o); fl = u16(b, o + 2)
            r['al'] = [a & 31, (a >> 5) & 31, (a >> 10) & 31, fl & 255, (fl >> 8) & 1, b[o + 4], b[o + 5]]; o += 8
        if bits(f, 11, 1):  # texture anim
            p = u32(b, o + 8); r['ta'] = [list(b[o:o + 8]), bits(p, 0, 8), bits(p, 8, 8), bits(p, 16, 1), bits(p, 17, 1)]; o += 12
        if bits(f, 16, 1):  # child
            cf = u16(b, o); m = u32(b, o + 12); m2c = u32(b, o + 16)
            r['ch'] = dict(beh=cf & 1, sa=(cf >> 1) & 1, aa=(cf >> 2) & 1, rt=(cf >> 3) & 3, fe=(cf >> 5) & 1, uc=(cf >> 6) & 1, dt=(cf >> 7) & 3, pra=(cf >> 9) & 3, prp=(cf >> 11) & 1,
                           rv=s16(b, o + 2) / FX, es=s16(b, o + 4) / FX, lt=u16(b, o + 6), vr=b[o + 8], sr=b[o + 9], col=rgb(u16(b, o + 10)),
                           n=bits(m, 0, 8), dly=bits(m, 8, 8), iv=max(1, bits(m, 16, 8)), tex=bits(m, 24, 8), tS=bits(m2c, 0, 2), tT=bits(m2c, 2, 2),
                           fS=bits(m2c, 4, 1), fT=bits(m2c, 5, 1), dfe=bits(m2c, 6, 1))
            o += 20
        bh = []
        if bits(f, 24, 1): bh.append(['g', s16(b, o) / FX, s16(b, o + 2) / FX, s16(b, o + 4) / FX]); o += 8
        if bits(f, 25, 1): bh.append(['r', s16(b, o) / FX, s16(b, o + 2) / FX, s16(b, o + 4) / FX, max(1, u16(b, o + 6))]); o += 8
        if bits(f, 26, 1): bh.append(['m', s32(b, o) / FX, s32(b, o + 4) / FX, s32(b, o + 8) / FX, s16(b, o + 12) / FX]); o += 16
        if bits(f, 27, 1): bh.append(['s', u16(b, o), u16(b, o + 2)]); o += 4
        if bits(f, 28, 1): bh.append(['p', s32(b, o) / FX, s16(b, o + 4) / FX, u16(b, o + 6) & 3]); o += 8
        if bits(f, 29, 1): bh.append(['c', s32(b, o) / FX, s32(b, o + 4) / FX, s32(b, o + 8) / FX, s16(b, o + 12) / FX]); o += 16
        if bh: r['bh'] = bh
        R.append(r)
    T = []; ims = []
    for _ in range(ntex):
        p = u32(b, o + 4); tsz = u32(b, o + 8); po = u32(b, o + 12); psz = u32(b, o + 16); rs = u32(b, o + 28)
        fmt, w, h = bits(p, 0, 4), 8 << bits(p, 4, 4), 8 << bits(p, 8, 4)
        shared = bits(p, 17, 1); sid = bits(p, 18, 8)
        T.append(dict(w=w, h=h, rep=bits(p, 12, 2), flip=bits(p, 14, 2), shared=shared, sid=sid))
        ims.append(None if shared else decode_tex(fmt, w, h, b[o + 32:o + 32 + tsz], b[o + po:o + po + psz], bits(p, 16, 1)))
        o += rs
    for i, t in enumerate(T):
        if t['shared']: ims[i] = ims[t['sid']]
    return R, T, ims

def build(path, out_json, out_png):
    R, T, ims = parse(open(path, 'rb').read())
    W = sum(im.width for im in ims) or 1; H = max([im.height for im in ims] or [1])
    sheet = Image.new('RGBA', (W, H)); x = 0
    for t, im in zip(T, ims):
        sheet.paste(im, (x, 0)); t['x'] = x; x += im.width
        for k in ('shared', 'sid'): t.pop(k)
    sheet.save(out_png, optimize=True)
    json.dump(dict(r=R, t=T), open(out_json, 'w'), separators=(',', ':'))

if __name__ == '__main__':
    PL = sys.argv[1]; SRC = PL + '/res/graphics/battle/particles/'; OUT = 'gym/img/spl/'
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[2:] or sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.spa'))
    bad = 0
    for n in names:
        try: build(SRC + n + '.spa', OUT + n + '.json', OUT + n + '.png')
        except Exception as e: bad += 1; print('skip', n, e)
    print(len(names) - bad, 'particle files')
