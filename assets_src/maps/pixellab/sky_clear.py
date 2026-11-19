# clear flat grey sky: flood from top row, only inside init's transparent area (+2px), low-saturation pixels near the top-row grey
import sys
from PIL import Image
from collections import Counter, deque
init, src, dst = sys.argv[1:4]
ini=Image.open(init).convert('RGBA'); im=Image.open(src).convert('RGBA'); W,H=im.size
p=im.load(); q=ini.load()
mask=[[q[x,y][3]==0 for x in range(W)] for y in range(H)]
for _ in range(2):
    m2=[r[:] for r in mask]
    for y in range(H):
        for x in range(W):
            if mask[y][x]:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    X,Y=x+dx,y+dy
                    if 0<=X<W and 0<=Y<H: m2[Y][X]=True
    mask=m2
greys=[c for c,n in Counter(p[x,y][:3] for x in range(W) for y in range(0,3)).most_common(4) if max(c)-min(c)<20]
def ok(c):
    if max(c[:3])-min(c[:3])>22: return False
    return any(sum(abs(a-b) for a,b in zip(c[:3],g))<40 for g in greys)
seen=set(); dq=deque((x,0) for x in range(W) if ok(p[x,0]))
n=0
while dq:
    x,y=dq.popleft()
    if (x,y) in seen: continue
    seen.add((x,y))
    if not (mask[y][x] and ok(p[x,y])): continue
    p[x,y]=(0,0,0,0); n+=1
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        X,Y=x+dx,y+dy
        if 0<=X<W and 0<=Y<H and (X,Y) not in seen: dq.append((X,Y))
im.save(dst); print(dst, 'cleared', n, 'greys', greys)
