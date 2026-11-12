# minimal safe Ruby Marshal 4.8 reader: builds plain python data only
import sys
class Obj:
    def __init__(s,c): s.cls=c; s.iv={}
class Raw:
    def __init__(s,c,b): s.cls=c; s.data=b
class R:
    def __init__(s,b): s.b=b; s.p=2; s.syms=[]; s.objs=[]
    def by(s): v=s.b[s.p]; s.p+=1; return v
    def i(s):
        c=s.by(); c=c-256 if c>127 else c
        if c==0: return 0
        if 4<c<128: return c-5
        if -129<c<-4: return c+5
        n=abs(c); v=int.from_bytes(s.b[s.p:s.p+n],'little'); s.p+=n
        return v if c>0 else v-(1<<(8*n))
    def bytes_(s): n=s.i(); v=s.b[s.p:s.p+n]; s.p+=n; return v
    def sym(s):
        t=chr(s.by())
        if t==':': v=s.bytes_().decode('latin1'); s.syms.append(v); return v
        if t==';': return s.syms[s.i()]
        if t=='I': v=s.sym(); n=s.i(); [ (s.sym(), s.r()) for _ in range(n)]; return v
        raise ValueError('sym '+t)
    def r(s):
        t=chr(s.by())
        if t=='0': return None
        if t=='T': return True
        if t=='F': return False
        if t=='i': return s.i()
        if t in ':;': s.p-=1; return s.sym()
        if t=='@': return s.objs[s.i()]
        if t=='I':
            v=s.r(); n=s.i(); ivs={}
            for _ in range(n):
                k=s.sym(); ivs[k]=s.r()
            if isinstance(v,list) and ivs: v=Obj('ArrayIv'); v.list=s._last; v.iv=ivs
            if isinstance(v,bytes):
                try: v=v.decode('utf8')
                except: pass
                idx=[k for k,o in enumerate(s.objs) if o is v]
            return v
        if t=='"': v=s.bytes_(); s.objs.append(v); return v
        if t=='f': v=s.bytes_(); v=float(v) if v not in (b'inf',b'-inf',b'nan') else 0.0; s.objs.append(v); return v
        if t=='l': sg=s.by(); n=s.i(); v=int.from_bytes(s.b[s.p:s.p+2*n],'little'); s.p+=2*n; v=v if sg==43 else -v; s.objs.append(v); return v
        if t=='[':
            a=[]; s.objs.append(a); n=s.i()
            for _ in range(n): a.append(s.r())
            s._last=a; return a
        if t in '{}':
            h={}; s.objs.append(h); n=s.i()
            for _ in range(n):
                k=s.r(); v=s.r()
                try: h[k]=v
                except TypeError: h[str(k)]=v
            if t=='}': s.r()
            return h
        if t=='o':
            c=s.sym(); o=Obj(c); s.objs.append(o); n=s.i()
            for _ in range(n): k=s.sym(); o.iv[k]=s.r()
            return o
        if t=='u': c=s.sym(); v=Raw(c,s.bytes_()); s.objs.append(v); return v
        if t=='U': c=s.sym(); o=Obj(c); s.objs.append(o); o.iv['data']=s.r(); return o
        if t=='C': c=s.sym(); v=s.r(); s._last=v; return v
        if t=='e': s.sym(); return s.r()
        if t=='S':
            c=s.sym(); o=Obj(c); s.objs.append(o); n=s.i()
            for _ in range(n): k=s.sym(); o.iv[k]=s.r()
            return o
        if t=='/': v=s.bytes_(); s.by(); s.objs.append(v); return v
        if t in 'cm': v=s.bytes_(); s.objs.append(v); return v
        raise ValueError('tok %r at %d'%(t,s.p))
def load(path): return R(open(path,'rb').read()).r()
