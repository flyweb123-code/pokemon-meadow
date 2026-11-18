# 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
import sys,os,random
from PIL import Image,ImageFilter,ImageDraw,ImageChops
C={'Normal':'#e8f0ff','Fire':'#ff6a2a','Water':'#3aa0ff','Grass':'#7ae040','Electric':'#ffd21e','Ice':'#8ae8ff','Fighting':'#ff5a3a','Poison':'#c070ff','Ground':'#ffb040','Flying':'#9ab8ff','Psychic':'#ff68b0','Bug':'#c8e030','Rock':'#ffc060','Ghost':'#a080ff','Dragon':'#ff5a6a','Dark':'#ff6a7a','Steel':'#e0e8ff','Fairy':'#ff8ad8','Stellar':'#8ad0ff'}
os.makedirs('out',exist_ok=True)
for t,c in C.items():
    if not os.path.exists(f'raw/{t}_c.png'): continue
    im=Image.open(f'raw/{t}_c.png').convert('RGBA'); im.putalpha(Image.open(f'raw/{t}_m.png').split()[3]); W,H=im.size
    a=im.split()[3]
    # 빛 번짐: 모양 둘레 타입 색 + 밝은 곳 흰 번짐
    glow=Image.new('RGBA',im.size,c); g=a.filter(ImageFilter.GaussianBlur(9)).point(lambda v:int(v*.6)); glow.putalpha(g)
    lum=im.convert('L').point(lambda v:255 if v>248 else 0); lum=ImageChops.multiply(lum,a).filter(ImageFilter.GaussianBlur(5)).point(lambda v:min(255,int(v*1.4)))
    wg=Image.new('RGBA',im.size,'#ffffff'); wg.putalpha(lum)
    out=Image.alpha_composite(glow,im); out=Image.alpha_composite(out,wg.point(lambda v:v) if False else wg)
    # 반짝이
    random.seed(t); sp=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(sp)
    px=a.load(); pts=[(x,y) for x in range(0,W,6) for y in range(0,int(H*.8),6) if px[x,y]>200]
    for _ in range(6):
        if not pts: break
        x,y=random.choice(pts); r=random.randint(7,14); q=r*.16
        d.polygon([(x,y-r),(x+q,y-q),(x+r,y),(x+q,y+q),(x,y+r),(x-q,y+q),(x-r,y),(x-q,y-q)],fill=(255,255,255,255))
    spg=sp.filter(ImageFilter.GaussianBlur(2.2)); out=Image.alpha_composite(out,spg); out=Image.alpha_composite(out,sp)
    out.save(f'out/{t}.png')
# 한 장 보기
T=list(C); cw,ch=240,200; S=Image.new('RGB',(cw*5,ch*4),'#1a1626')
for i,t in enumerate(T):
    im=Image.open(f'out/{t}.png').resize((cw,ch)); S.paste(im,((i%5)*cw,(i//5)*ch),im)
S.save('sheet.png')
