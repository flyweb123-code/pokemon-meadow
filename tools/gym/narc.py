import struct,sys
def lz10(d):
    assert d[0]==0x10; n=d[1]|d[2]<<8|d[3]<<16; o=bytearray(); i=4
    while len(o)<n:
        f=d[i]; i+=1
        for b in range(8):
            if len(o)>=n: break
            if f&(0x80>>b):
                a,c=d[i],d[i+1]; i+=2; ln=(a>>4)+3; dist=((a&15)<<8|c)+1
                for _ in range(ln): o.append(o[-dist])
            else: o.append(d[i]); i+=1
    return bytes(o)
def lz11(d):
    n=d[1]|d[2]<<8|d[3]<<16; o=bytearray(); i=4
    while len(o)<n:
        f=d[i]; i+=1
        for b in range(8):
            if len(o)>=n: break
            if f&(0x80>>b):
                a=d[i]; t=a>>4
                if t==0: ln=(((a&15)<<4)|(d[i+1]>>4))+0x11; dist=(((d[i+1]&15)<<8)|d[i+2])+1; i+=3
                elif t==1: ln=(((a&15)<<12)|(d[i+1]<<4)|(d[i+2]>>4))+0x111; dist=(((d[i+2]&15)<<8)|d[i+3])+1; i+=4
                else: ln=t+1; dist=(((a&15)<<8)|d[i+1])+1; i+=2
                for _ in range(ln): o.append(o[-dist])
            else: o.append(d[i]); i+=1
    return bytes(o)
def unz(d):
    if d[:1]==b'\x10':
        try: return lz10(d)
        except Exception: return d
    if d[:1]==b'\x11':
        try: return lz11(d)
        except Exception: return d
    return d
def narc(path):
    d=open(path,'rb').read(); assert d[:4]==b'NARC'
    p=16; assert d[p:p+4]==b'BTAF'; sz=struct.unpack_from('<I',d,p+4)[0]; n=struct.unpack_from('<H',d,p+8)[0]
    ent=[struct.unpack_from('<II',d,p+12+8*k) for k in range(n)]; p+=sz
    sz=struct.unpack_from('<I',d,p+4)[0]; p+=sz  # BTNF
    assert d[p:p+4]==b'GMIF'; base=p+8
    return [unz(d[base+a:base+b]) for a,b in ent]
if __name__=='__main__':
    for i,f in enumerate(narc(sys.argv[1])): print(i,f[:4],len(f))
