#!/usr/bin/env python3
"""Z크리스탈 모양 타입별 마름모 마크 (경완 2026-11-14) -> gym/img/dbk/Z-Power/zc/<타입번호>.svg
타입 번호 = battle.js TY_EN 순서 (1 노말 ... 18 페어리). 무늬는 직접 그린 단순 도형."""
import os
OUT = os.path.join(os.path.dirname(__file__), '../../gym/img/dbk/Z-Power/zc')
# (이름, 바탕색, 밝은 면, 어두운 면)
T = {1:('Normal','#e9e9e4','#ffffff','#c9c9c2'),2:('Fighting','#ee7a2e','#ffa65e','#c85a18'),3:('Flying','#3d93e6','#7cbcf6','#2470c0'),
 4:('Poison','#8f52b8','#b880dc','#6c3a92'),5:('Ground','#bd6a2e','#e0925a','#934c1a'),6:('Rock','#b2a48c','#d2c6ae','#8e806a'),
 7:('Bug','#93c83e','#bce46e','#6fa024'),8:('Ghost','#a982bd','#cfaee0','#84609a'),9:('Steel','#8f9fc8','#bcc8e6','#6d7ca6'),
 10:('Fire','#e03a3a','#ff7464','#b02222'),11:('Water','#38a6e2','#7cd0f8','#1f80bc'),12:('Grass','#3aa040','#72cc6e','#237a2a'),
 13:('Electric','#f6dc1e','#fff06a','#d4b400'),14:('Psychic','#ea5c9c','#ff92c2','#c23a78'),15:('Ice','#7fd6ec','#bcf0fc','#4fb4d0'),
 16:('Dragon','#2c98a0','#5cc4c8','#18747c'),17:('Dark','#4a4446','#7a7274','#2a2628'),18:('Fairy','#f294b4','#ffc2d6','#d46c92')}
D = 'rgba(20,16,20,.62)'
G = {  # 무늬: 가운데 (60,36), 대략 반지름 15
 1:f'<circle cx="60" cy="36" r="13" fill="none" stroke="{D}" stroke-width="3.2" stroke-dasharray="14 4"/><circle cx="60" cy="36" r="6.5" fill="none" stroke="{D}" stroke-width="3"/>',
 2:f'<path d="M50 28q0-4 4-4h12q4 0 4 4v9q0 6-5 9l-1 4h-10l-1-4q-3-2-3-6z" fill="{D}"/><path d="M53 31h14M53 35h12" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/>',
 3:f'<path d="M60 40q-10-14-24-14q6 6 8 12q8 0 16 6zM60 40q10-14 24-14q-6 6-8 12q-8 0-16 6z" fill="{D}"/><path d="M60 30v14" stroke="{D}" stroke-width="3"/>',
 4:f'<circle cx="60" cy="31" r="8" fill="{D}"/><circle cx="51" cy="43" r="4" fill="{D}"/><circle cx="69" cy="44" r="3" fill="{D}"/><circle cx="57" cy="30" r="2" fill="#fff" fill-opacity=".35"/>',
 5:f'<path d="M42 32q9-6 18 0t18 0v5q-9 6-18 0t-18 0zM46 42q7-5 14 0t14 0v4q-7 5-14 0t-14 0z" fill="{D}"/>',
 6:f'<path d="M47 44l3-13 8-6 9 3 6 9-3 7z" fill="{D}"/><path d="M58 25l-2 11 11 2" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" fill="none"/>',
 7:f'<ellipse cx="60" cy="37" rx="7" ry="9" fill="{D}"/><circle cx="60" cy="26" r="4" fill="{D}"/><path d="M53 33l-8-4M53 38h-9M54 43l-7 5M67 33l8-4M67 38h9M66 43l7 5M58 23l-3-4M62 23l3-4" stroke="{D}" stroke-width="2.4" stroke-linecap="round"/>',
 8:f'<path d="M48 48V34q0-12 12-12t12 12v14l-4-3-4 3-4-3-4 3-4-3z" fill="{D}"/><circle cx="56" cy="33" r="2.2" fill="#fff" fill-opacity=".6"/><circle cx="64" cy="33" r="2.2" fill="#fff" fill-opacity=".6"/>',
 9:f'<path d="M60 22l13 7v14l-13 7-13-7V29z" fill="{D}"/><path d="M47 29l13 7 13-7M60 36v14" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none"/>',
 10:f'<path d="M60 20q4 8 10 13q4 5 1 11q-4 6-11 6q-8 0-11-6q-3-6 2-11q1 5 4 6q-1-9 5-19z" fill="{D}"/><path d="M60 37q4 4 2 8q-2 2-4 0q-2-3 2-8z" fill="#fff" fill-opacity=".35"/>',
 11:f'<path d="M60 20q11 13 11 21a11 11 0 0 1-22 0q0-8 11-21z" fill="{D}"/><path d="M55 40q0 5 5 6" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none" stroke-linecap="round"/>',
 12:f'<path d="M45 46q0-22 26-24q2 22-22 24z" fill="{D}"/><path d="M47 45q9-9 20-19" stroke="#fff" stroke-opacity=".35" stroke-width="1.8" fill="none"/>',
 13:f'<path d="M64 20l-14 19h9l-4 14 15-20h-9z" fill="{D}"/>',
 14:f'<path d="M42 36q18-16 36 0q-18 16-36 0z" fill="{D}"/><circle cx="60" cy="36" r="5.5" fill="#fff" fill-opacity=".45"/><circle cx="60" cy="36" r="2.6" fill="{D}"/>',
 15:f'<g stroke="{D}" stroke-width="3" stroke-linecap="round"><path d="M60 21v30M47 28.5l26 15M47 43.5l26-15"/><path d="M56 23l4 4 4-4M56 49l4-4 4 4" fill="none" stroke-width="2.2"/></g>',
 16:f'<path d="M46 24q14 2 18 12l8-4-3 8q5 2 7 6q-10-2-14-1q-8-1-11-7q6 1 9-1q-8-5-14-13z" fill="{D}"/>',
 17:f'<path d="M64 21a15 15 0 1 0 8 27a12 12 0 1 1-8-27z" fill="{D}"/>',
 18:f'<path d="M60 20l3 11 11-3-8 8 8 8-11-3-3 11-3-11-11 3 8-8-8-8 11 3z" fill="{D}"/><circle cx="60" cy="36" r="3" fill="#fff" fill-opacity=".45"/>',
}
os.makedirs(OUT, exist_ok=True)
for n, (nm, c, li, dk) in T.items():
    s = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72" width="120" height="72"><!-- {nm} -->
<path d="M60 3L117 36 60 69 3 36z" fill="{c}"/>
<path d="M60 3L117 36H3z" fill="{li}" fill-opacity=".55"/><path d="M60 3L3 36l57 33z" fill="#fff" fill-opacity=".18"/>
<path d="M3 36l57 33 57-33z" fill="{dk}" fill-opacity=".35"/><path d="M60 3L117 36 60 69z" fill="#000" fill-opacity=".08"/>
<path d="M60 9L20 32" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>
<g transform="translate(60 36) scale(1.3) translate(-60 -36)">{G[n]}</g>
<path d="M60 3L117 36 60 69 3 36z" fill="none" stroke="#231c1e" stroke-width="4.5" stroke-linejoin="round"/>
</svg>'''
    open(os.path.join(OUT, f'{n}.svg'), 'w').write(s)
print('ok', len(T))
