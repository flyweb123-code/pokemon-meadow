#!/usr/bin/env python3
"""
포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
"""
# pokefirered 레이아웃의 풀숲 칸(행동 2)을 g 로 뽑는다. 쓰는 법: python3 tools/gym/grass.py LAYOUT_ROUTE3 > route3_grass.json  (FR 소스 경로는 root)
import sys,json,struct,re,os
root='/tmp/claude-0/fr'
L=next(l for l in json.load(open(f'{root}/data/layouts/layouts.json'))['layouts'] if l.get('id')==sys.argv[1])
def at(p):
    b=open(p,'rb').read();return [struct.unpack_from('<I',b,i)[0] for i in range(0,len(b),4)]
def tsdir(n):
    s=re.sub(r'(?<!^)([A-Z])',r'_\1',n.replace('gTileset_','')).lower()
    for k in('primary','secondary'):
        for c in(s,re.sub(r'(\D)(\d)',r'\1_\2',s)):
            if os.path.isdir(f'{root}/data/tilesets/{k}/{c}'):return f'{root}/data/tilesets/{k}/{c}'
AP=at(tsdir(L['primary_tileset'])+'/metatile_attributes.bin');AS=at(tsdir(L['secondary_tileset'])+'/metatile_attributes.bin')
W,H=L['width'],L['height'];blk=struct.unpack(f'<{W*H}H',open(f"{root}/{L['blockdata_filepath']}",'rb').read()[:W*H*2])
rows=[]
for y in range(H):
    r=''
    for x in range(W):
        m=blk[y*W+x]&0x3ff;a=AP[m] if m<640 else AS[m-640];b=a&0x1ff
        r+='g' if b==2 else '.'
    rows.append(r)
print(json.dumps(rows))
