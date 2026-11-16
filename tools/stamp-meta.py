#!/usr/bin/env python3
"""그림·효과음 파일 메타데이터에 저작권·면책 문구를 넣는다 (경완 2026-11-17 '응 다 넣어줘').

픽셀·소리 데이터는 그대로 두고 메타데이터만 더한다. 이미 넣은 파일은 건너뛴다.
  PNG  : IHDR 뒤에 iTXt 'Copyright' 덩어리
  GIF  : 끝(0x3B) 앞에 주석 확장(21 FE, 영어만 — GIF 주석은 ASCII)
  JPG  : APPn 뒤에 COM 구간
  WEBP : VP8X 확장 형식으로 바꾸고 'XMP ' 덩어리
  MP3  : ID3v2.3 TCOP·COMM (mutagen 필요: pip install mutagen)

쓰는 법: python3 tools/stamp-meta.py            (git 에 올라간 파일 전부)
         python3 tools/stamp-meta.py a.png b.mp3 (몇 개만)
새 그림·효과음을 넣은 뒤 다시 돌리면 새 파일에만 들어간다.
"""
import struct, subprocess, sys, zlib

MARK = 'PokeEgg'
KO = ('포켓에그 게임 자료. 원저작권은 각 권리자에게 있음(LICENSE 참고). '
      '무단 사용·복제·재배포·AI 학습 금지. 이 자료를 내려받아 활용해서 생기는 모든 법적 책임은 '
      '내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.')
EN = ('PokeEgg game asset. Rights belong to their respective owners (see LICENSE). '
      'No unauthorized use, copying, redistribution or AI training. '
      'Anyone who downloads and uses this material bears all legal responsibility for that use; '
      'the author accepts no liability.')
TEXT = KO + ' / ' + EN
EXTS = ('.png', '.gif', '.jpg', '.jpeg', '.webp', '.mp3')


def png(b):
    if b[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    if MARK.encode() in b[:4096] and b'iTXt' in b[:4096]:
        return 'skip'
    ihdr_len = struct.unpack('>I', b[8:12])[0]
    end = 8 + 12 + ihdr_len
    data = b'Copyright\x00\x00\x00\x00\x00' + TEXT.encode('utf-8')
    chunk = struct.pack('>I', len(data)) + b'iTXt' + data + struct.pack('>I', zlib.crc32(b'iTXt' + data) & 0xffffffff)
    return b[:end] + chunk + b[end:]


def gif(b):
    if b[:3] != b'GIF' or b[-1:] != b';':
        return None
    if MARK.encode() in b[-600:]:
        return 'skip'
    t = EN.replace('PokeEgg', MARK).encode('ascii')
    ext = b'\x21\xfe'
    for i in range(0, len(t), 255):
        part = t[i:i + 255]
        ext += bytes([len(part)]) + part
    ext += b'\x00'
    return b[:-1] + ext + b';'


def jpg(b):
    if b[:2] != b'\xff\xd8':
        return None
    if MARK.encode() in b[:4096]:
        return 'skip'
    i = 2
    while i + 4 <= len(b) and b[i] == 0xff and 0xe0 <= b[i + 1] <= 0xef:
        i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
    t = TEXT.encode('utf-8')
    return b[:i] + b'\xff\xfe' + struct.pack('>H', len(t) + 2) + t + b[i:]


def _chunk(tag, data):
    return tag + struct.pack('<I', len(data)) + data + (b'\x00' if len(data) & 1 else b'')


def webp(b):
    if b[:4] != b'RIFF' or b[8:12] != b'WEBP':
        return None
    if MARK.encode() in b:
        return 'skip'
    chunks, i = [], 12
    while i + 8 <= len(b):
        tag, n = b[i:i + 4], struct.unpack('<I', b[i + 4:i + 8])[0]
        chunks.append([tag, b[i + 8:i + 8 + n]])
        i += 8 + n + (n & 1)
    first = chunks[0][0]
    if first == b'VP8X':
        d = bytearray(chunks[0][1]); d[0] |= 0x04; chunks[0][1] = bytes(d)
    else:
        data, flags = chunks[0][1], 0
        if first == b'VP8L':
            v = struct.unpack('<I', data[1:5])[0]
            w, h = (v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1
            if (v >> 28) & 1:
                flags |= 0x10
        elif first == b'VP8 ':
            w = struct.unpack('<H', data[6:8])[0] & 0x3fff
            h = struct.unpack('<H', data[8:10])[0] & 0x3fff
        else:
            return None
        flags |= 0x04
        vp8x = bytes([flags, 0, 0, 0]) + (w - 1).to_bytes(3, 'little') + (h - 1).to_bytes(3, 'little')
        chunks.insert(0, [b'VP8X', vp8x])
    xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:rights><rdf:Alt>'
           '<rdf:li xml:lang="x-default">' + TEXT + '</rdf:li></rdf:Alt></dc:rights></rdf:Description>'
           '</rdf:RDF></x:xmpmeta>').encode('utf-8')
    chunks.append([b'XMP ', xmp])
    body = b'WEBP' + b''.join(_chunk(t, d) for t, d in chunks)
    return b'RIFF' + struct.pack('<I', len(body)) + body


def mp3(path):
    from mutagen.id3 import ID3, ID3NoHeaderError, TCOP, COMM
    try:
        tag = ID3(path)
    except ID3NoHeaderError:
        tag = ID3()
    if any(MARK in str(f) for f in tag.getall('TCOP')):
        return 'skip'
    tag.add(TCOP(encoding=1, text=[TEXT]))
    tag.add(COMM(encoding=1, lang='kor', desc='license', text=[TEXT]))
    tag.save(path, v2_version=3)
    return 'ok'


def main(paths):
    fn = {'.png': png, '.gif': gif, '.jpg': jpg, '.jpeg': jpg, '.webp': webp}
    cnt = {}
    for p in paths:
        ext = p[p.rfind('.'):].lower()
        if ext not in EXTS:
            continue
        if ext == '.mp3':
            r = mp3(p)
        else:
            with open(p, 'rb') as f:
                b = f.read()
            out = fn[ext](b)
            if isinstance(out, bytes):
                with open(p, 'wb') as f:
                    f.write(out)
                r = 'ok'
            else:
                r = out or 'bad'
        cnt[r] = cnt.get(r, 0) + 1
        if r == 'bad':
            print('건너뜀(형식 다름):', p)
    print(cnt)


if __name__ == '__main__':
    args = sys.argv[1:] or subprocess.check_output(['git', 'ls-files'], text=True).split('\n')
    main([a for a in args if a.lower().endswith(EXTS)])
