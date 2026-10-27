import struct
def blocks(d):
    hs=struct.unpack_from('<H',d,12)[0]; n=struct.unpack_from('<H',d,14)[0]; p=hs; out={}
    for _ in range(n):
        m=d[p:p+4]; sz=struct.unpack_from('<I',d,p+4)[0]; out[m]=d[p:p+sz]; p+=sz
    return out
def ncgr(d):
    c=blocks(d)[b'RAHC']; h,w,bd=struct.unpack_from('<HHI',c,8); sz=struct.unpack_from('<I',c,0x18)[0]; off=struct.unpack_from('<I',c,0x1c)[0]
    data=c[8+off:8+off+sz]; bpp=8 if bd==4 else 4
    tiles=[]; ts=64 if bpp==8 else 32
    for t in range(len(data)//ts):
        b=data[t*ts:(t+1)*ts]
        tiles.append(list(b) if bpp==8 else [x for y in b for x in (y&15,y>>4)])
    return tiles,bpp,(w,h)
def nclr(d):
    c=blocks(d)[b'TTLP']; bd=struct.unpack_from('<I',c,8)[0]; sz=struct.unpack_from('<I',c,0x10)[0]; off=struct.unpack_from('<I',c,0x14)[0]
    raw=c[8+off:8+off+sz]; cols=[]
    for i in range(0,len(raw),2):
        v=raw[i]|raw[i+1]<<8; cols.append(((v&31)*255//31,((v>>5)&31)*255//31,((v>>10)&31)*255//31))
    return cols
def nscr(d):
    c=blocks(d)[b'NRCS']; w,h=struct.unpack_from('<HH',c,8); sz=struct.unpack_from('<I',c,0x10)[0]
    m=struct.unpack_from('<%dH'%(sz//2),c,0x14); return m,w,h
def render(tiles,bpp,pal,scr=None,size=None):
    from PIL import Image
    if scr:
        m,w,h=scr; im=Image.new('RGB',(w,h)); px=im.load(); tw=w//8
        for i,e in enumerate(m):
            t=e&0x3ff; hf=e>>10&1; vf=e>>11&1; pn=e>>12
            if t>=len(tiles): continue
            T=tiles[t]; bk,j=divmod(i,1024); bw=max(1,w//256); ox,oy=((bk%bw)*32+j%32)*8,((bk//bw)*32+j//32)*8
            for y in range(8):
                for x in range(8):
                    v=T[(7-y if vf else y)*8+(7-x if hf else x)]; idx=v if bpp==8 else pn*16+v
                    px[ox+x,oy+y]=pal[idx] if idx<len(pal) else (255,0,255)
        return im
    w,h=size; im=Image.new('RGB',(w*8,h*8)); px=im.load()
    for i,T in enumerate(tiles[:w*h]):
        ox,oy=(i%w)*8,(i//w)*8
        for y in range(8):
            for x in range(8):
                v=T[y*8+x]; px[ox+x,oy+y]=pal[v] if v<len(pal) else (255,0,255)
    return im
