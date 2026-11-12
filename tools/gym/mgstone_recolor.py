import numpy as np, colorsys, sys
from PIL import Image
new=open('/tmp/sc/new.txt').read().split()
T=Image.open('/tmp/sc/tmpl.png').convert('RGBA')  # venusaurite original 20x20
tp={(49,49,49):'A',(25,132,132):'B',(189,74,140):'C',(255,82,197):'D',(99,173,206):'E',(156,197,173):'F',(181,156,189):'G',(181,132,206):'H',(255,255,255):'I',(16,107,74):'J',(41,148,189):'K',(123,222,222):'L'}
tb=np.array([99,173,206.]); t1=np.array([255,82,197.]); t2=np.array([16,107,74.]); W=np.array([255,255,255.])
spec={'E':('b','b',0),'L':('b','b',0),'K':('b','b',0),'B':('b','2',.5),'D':('1','1',0),'C':('1','1',0),'H':('b','1',.5),'J':('2','2',0),'F':('b','w',.5),'G':('1','w',.5)}
def L(c): return colorsys.rgb_to_hls(*(np.clip(c,0,255)/255))
def km(X,k,it=20):
    rng=np.random.default_rng(0); C=X[rng.choice(len(X),k,replace=False)]
    for _ in range(it):
        d=((X[:,None]-C[None])**2).sum(2); a=d.argmin(1)
        C=np.array([X[a==i].mean(0) if (a==i).any() else C[i] for i in range(k)])
    return C,np.bincount(a,minlength=k)
def colors(p):
    im=np.array(Image.open(p).convert('RGBA')).astype(float); H,Wd=im.shape[:2]; ys,xs=np.mgrid[0:H,0:Wd]
    a=im[...,3]>200; cy,cx=ys[a].mean(),xs[a].mean(); r=np.sqrt(((ys-cy)**2+(xs-cx)**2)); R=r[a].max()
    ring=a&(r>.55*R)&(r<.85*R)&(ys>cy)   # 아래쪽 바깥 = 바탕
    body=np.median(im[ring][:,:3],0)
    cen=a&(np.abs(xs-cx)<.35*R)&(r<.6*R)
    X=im[cen][:,:3]; C,n=km(X,4)
    o=np.argsort(-n); hel=[C[i] for i in o if np.linalg.norm(C[i]-body)>60][:2]
    while len(hel)<2: hel.append(hel[0] if hel else body*0.6)
    return body,hel[0],hel[1]
def mix(a,b,t): return a*(1-t)+b*t
def rec(b,h1,h2):
    G={'b':(tb,b),'1':(t1,h1),'2':(t2,h2),'w':(W,W)}
    o=Image.new('RGBA',T.size)
    for y in range(T.height):
        for x in range(T.width):
            p=T.getpixel((x,y))
            if p[3]==0: continue
            k=tp[p[:3]]
            if k not in spec: o.putpixel((x,y),p); continue
            g1,g2,t=spec[k]; base0=mix(G[g1][0],G[g2][0],t); base1=mix(G[g1][1],G[g2][1],t)
            h0,l0,s0=L(base0); hp,lp,sp=L(np.array(p[:3],float)); hn,ln,sn=L(base1)
            l=min(1,max(0,ln+(lp-l0))); s=sn
            c=colorsys.hls_to_rgb(hn,l,s); o.putpixel((x,y),tuple(int(v*255+.5) for v in c)+(255,))
    return o
for k in new:
    b,h1,h2=colors(f'/tmp/sc/zaorig/{k}.png'); rec(b,h1,h2).save(f'/tmp/sc/rc/{k}.png')
print('ok')
