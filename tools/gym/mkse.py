# 체육관 배틀 효과음 목록: 플래티넘 sound_data.sdat 에서 배틀·기본 효과음(SEQ_SE_DP_*) 위치를 뽑아 gym/se.json 에 둔다.
# python3 tools/gym/mkse.py <sound_data.sdat>   (gym/bgm.js 가 이 위치로 효과음 묶음을 한 번에 받는다)
import sys, struct, json
d = open(sys.argv[1], 'rb').read()
u32 = lambda o: struct.unpack_from('<I', d, o)[0]; u16 = lambda o: struct.unpack_from('<H', d, o)[0]
symb, info, fat = u32(0x10), u32(0x18), u32(0x20)
cstr = lambda o: d[o:d.index(b'\0', o)].decode()
def names(k): r = symb + u32(symb + 8 + 4 * k); return [cstr(symb + u32(r + 4 + 4 * i)) if u32(r + 4 + 4 * i) else None for i in range(u32(r))]
def recs(k): r = info + u32(info + 8 + 4 * k); return [info + u32(r + 4 + 4 * i) if u32(r + 4 + 4 * i) else None for i in range(u32(r))]
fe = lambda i: (u32(fat + 12 + 16 * i), u32(fat + 12 + 16 * i + 4))
sq, S, bk = names(0), recs(0), names(2)
BK = {'BANK_SE_BATTLE': 'S', 'BANK_BASIC': 'B'}
L = {}
for i, nm in enumerate(sq):
    if nm and nm.startswith('SEQ_SE_DP') and S[i] and bk[u16(S[i] + 4)] in BK:
        o, n = fe(u16(S[i])); L[nm[7:]] = [o, n, BK[bk[u16(S[i] + 4)]], d[S[i] + 6]]
lo = min(v[0] for v in L.values()); hi = max(v[0] + v[1] for v in L.values())
for v in L.values(): v[0] -= lo
json.dump({'block': [lo, hi - lo], 'se': L}, open('gym/se.json', 'w'), separators=(',', ':'))
print(len(L), lo, hi - lo)
