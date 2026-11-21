#!/usr/bin/env python3
"""
포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.

체육관 문 밖 모험 1단계 시연(2026-11-21, 경완 '엉 만들어봐') 묶기.
  python3 tools/ow-demo/build.py OUT_DIR
OUT_DIR 에 시연 index.html + page.html(Artifact 용, beta.html <style>·gym.css·ev.js 를 넣음) + 쓰는 그림을 모은다.
로컬 확인: cd OUT_DIR && python3 -m http.server → index.html
"""
import os, re, shutil, sys, json
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
src = open(f'{R}/tools/ow-demo/index.html', encoding='utf-8').read()
beta = open(f'{R}/beta.html', encoding='utf-8').read()
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', beta, re.S))
open(f'{out}/beta.css', 'w', encoding='utf-8').write(css)
def cp(p):
    d = f'{out}/{p}'; os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy(f'{R}/{p}', d)
for p in ['gym/gym.css', 'gym/ev.js']: cp(p)
for p in sorted(set(re.findall(r'gym/img/[\w/.-]+\.(?:png|json)', src))): cp(p)
for n in ['pewter', 'mart', 'center', 'house', 'museum']:
    for e in ['.png', '_o.png', '.json']:
        if os.path.exists(f'{R}/gym/img/ev/rocket/{n}{e}'): cp(f'gym/img/ev/rocket/{n}{e}')
for p in os.listdir(f'{R}/gym/img/ev/out'): cp(f'gym/img/ev/out/{p}')
for p in ['door_pewter', 'door_sliding_double', 'door_sliding_single', 'ow_little_boy']: cp(f'gym/img/ev/rocket/{p}.png')
for p in ['boy', 'clerk', 'kang', 'lass', 'man', 'nurse', 'old_man_1', 'old_woman', 'pt_f', 'pt_m']: cp(f'gym/img/ow/{p}.png')
for p in [16, 19, 21, 23, 25, 27, 29, 32, 39, 41, 56, 74]: cp(f'gym/img/pk/{p}.png')
for p in ['bug_catcher', 'camper', 'hiker', 'lass', 'picnicker', 'youngster']: cp(f'gym/img/pt/ow/{p}.png')
os.makedirs(f'{out}/pal', exist_ok=True)
json.dump(json.load(open(f'{R}/s0.json'))['25'], open(f'{out}/pal/25.json', 'w'))
open(f'{out}/index.html', 'w', encoding='utf-8').write(src)
gcss = open(f'{R}/gym/gym.css', encoding='utf-8').read().replace('url(../gym/img', 'url(gym/img')
page = src.replace('<link rel="stylesheet" href="beta.css">', '<style>' + css + '</style>')
page = page.replace('<link rel="stylesheet" href="gym/gym.css">', '<style>' + gcss + '</style>')
page = re.sub(r'<script src="gym/ev.js[^"]*"></script>', lambda m: '<script>' + open(f'{R}/gym/ev.js', encoding='utf-8').read() + '</script>', page)
t = re.search(r'<title>.*?</title>', page).group(0)
page = t + re.sub(r'<!doctype html>|</?html[^>]*>|</?head>|</?body[^>]*>|<title>.*?</title>', '', page)
open(f'{out}/page.html', 'w', encoding='utf-8').write(page)
print('ok', out)
