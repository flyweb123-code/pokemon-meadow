/* 체육관 모드 (경완 기획 2026-10-27): 내 포켓몬으로 나만의 체육관을 운영한다.
   index.html·beta.html 의 체육관 훅이 필드의 체육관 버튼을 누를 때 이 파일을 불러 Gym.prepare() → Gym.enter() 를 부른다.
   저장은 S.gym (본 게임 저장에 같이 들어감). 그림은 본가 파이어레드(pret/pokefirered)에서 tools/gym/mkassets.py 로 뽑은 gym/img/ */
(() => {
'use strict';
// 게임 본체가 꺼내 준 것 (index.html·beta.html 의 체육관 훅 window.GA)
const GA = window.GA, { tyIcon, sfx, save, trOf, esc, menuDots } = GA;
const SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO;
const S = GA.S;
const IMG = 'gym/img/';
// 4세대 플라티나 그림 (경완 2026-10-27 'npc들도 4세대 pt에 맞춰야'): 있으면 pt/ 에서, 걸음 그림은 32칸
const PT_TR = new Set('artist battle_girl beauty bird_keeper black_belt bug_catcher camper champion_cynthia channeler cool_trainer_f cool_trainer_m cyclist_m dragon_tamer elite_four_aaron elite_four_bertha elite_four_flint elite_four_lucian fisherman gentleman hiker jogger lass leader_byron leader_candice leader_fantina leader_gardenia leader_maylene leader_roark leader_volkner leader_wake ninja_boy picnicker poke_kid pokemaniac psychic_m rival_barry rocker ruin_maniac sailor skier_f super_nerd swimmer_f youngster'.split(' ')), PT_OW = new Set('aaron artist barry bird_keeper battle_girl beauty bertha black_belt boy bug_catcher byron camper candice channeler cooltrainer_f cooltrainer_m crasher_wake cyclist_m cynthia dragon_tamer fantina fisher flint gardenia gentleman gym_guy hiker jogger lass lucian man maylene ninja_boy picnicker poke_kid poke_maniac roark rocker ruin_maniac sailor scientist skier_f swimmer_f_land volkner youngster'.split(' '));
const trSrc = k => `${IMG}${PT_TR.has(k) ? 'pt/' : ''}tr/${k}.png`, owSrc = k => `${IMG}${PT_OW.has(k) ? 'pt/' : ''}ow/${k}.png`, owW = k => PT_OW.has(k) || /^pt_/.test(k || '') ? 32 : 16;
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const loadJs = (src, g) => window[g] ? Promise.resolve() : new Promise(ok => { const x = document.createElement('script'); x.src = `${src}?v=${VER}`; x.onload = x.onerror = () => ok(); document.head.appendChild(x); });
const bgmPlay = n => { try { window.GymBGM?.play(n); } catch (e) {} };
const $g = s => root.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 체육관 디자인 (본가 관동 체육관 맵) ----------
// 좌표는 16px 칸. leader: 관장(나) 자리, door: 문, path: 문 → 관장 앞까지 도전자가 걷는 길(꺾이는 점들),
// slots: 고용 트레이너 자리 [x, y, 보는 방향] (도전자는 그 트레이너가 보는 칸에 멈춰서 배틀), guy: 체육관 안내원
// 4세대 플라티나 체육관 (본가 3D 맵을 위에서 비스듬히 본 그림으로 뽑음). old: 예전 칸토 디자인 id
const DESIGNS_PT = [
  { id: 'oreburgh', old: 'pewter', n: '탄광 계단', sub: '무쇠시티 체육관', w: 16, h: 34, leader: [7, 7], door: [7, 32], guy: [8, 31],
    deco: [[12, 29], [3, 10], [3, 30], [12, 12], [3, 18], [12, 23], [5, 12], [9, 28]],
    path: [[7, 32], [7, 29], [4, 29], [4, 23], [10, 23], [10, 18], [9, 18], [9, 15], [7, 15], [7, 8]], slots: [[6, 26, 'r'], [8, 8, 'l'], [11, 18, 'l'], [8, 32, 'l'], [6, 15, 'r']],
    free: ['0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000', '0000011111000000', '0001111011111000', '0001111011111000', '0001100000111000', '0001100000111000', '0001111011111000', '0001100000111000', '0001100000111000', '0001111000111000', '0000011110000000', '0000011110000000', '0001111110011000', '0000000000011000', '0000000000011000', '0000000000011000', '0000000000011000', '0001000000011000', '0001011111111000', '0000000000000000', '0000001111000000', '0000001111000000', '0000001111000000', '0001000011111000', '0001101010111000', '0001101010111000', '0001111011111000', '0000000000000000'] },
  { id: 'eterna', old: 'celadon', n: '꽃시계 정원', sub: '영원시티 체육관', w: 21, h: 33, leader: [10, 6], door: [10, 31], guy: [8, 29],
    deco: [[1, 15], [19, 15], [19, 25], [4, 9], [1, 24], [16, 10], [5, 20], [16, 31]],
    path: [[10, 31], [10, 7]], slots: [[9, 31, 'r'], [11, 7, 'l'], [11, 22, 'l'], [11, 28, 'l'], [9, 25, 'r']],
    free: ['000000000000000000000', '000000000000000000000', '000000000000000000000', '000000000000000000000', '000000000000000000000', '000000000000000000000', '000000000111000000000', '000000100101001000000', '000011100101001110000', '000011100000001110000', '010011011101110110000', '111110100000001011100', '111101000000000101100', '111010000000000010111', '111010000000000010111', '111010000000000010111', '111011000000000110111', '111010000000000010111', '111010000000000010111', '001010000000000010111', '001001000000000100111', '001000100000001000111', '111100011101110001111', '111110000000000011111', '111111000000000111111', '111111111101111111111', '001000111101111000100', '001100111101111001100', '001100111101111001100', '000000101101101000000', '000001111101111100000', '000011111101111110000', '000000000000000000000'] },
  { id: 'veilstone', old: 'fuchsia', n: '격투 링', sub: '베일시티 체육관', w: 26, h: 34, leader: [12, 5], door: [12, 32], guy: [13, 31],
    deco: [[24, 5], [24, 30], [1, 27], [8, 4], [23, 20], [5, 20], [15, 7], [21, 12]],
    path: [[12, 32], [12, 6]], slots: [[15, 24, 'r'], [16, 15, 'l'], [2, 11, 'd'], [11, 15, 'l'], [11, 32, 'r']],
    free: ['00000000000000000000000000', '00000000000000000000000000', '00000000000000000000000000', '00000000000000000000000000', '00000001111111111111111000', '00010000011000110000000110', '00010000011000110111111110', '00010000111101111111011110', '00011000000000000000101110', '01011111100000000000100110', '01111000101001111111100110', '00111111100000111101100110', '01101110000000000000110110', '01101100100100111101110100', '00111111110100111101110110', '01111100100101111110110110', '00011000101100111100010110', '00111111110100000001010110', '01111111111100000001010110', '00001000000101111111010110', '01101111001101011110010110', '01100111001001100000010110', '00000000000100011110110110', '01110000000000111111100110', '00010000000100011110000110', '01110000000001011110000110', '00010000000101000000100010', '01100000000001000000100010', '00011000000100000000000010', '01100000000101111111110010', '01111111111101111111111010', '01111111110101011111111010', '01111111111101111111110000', '00000000000000000000000000'] },
  { id: 'snowpoint', old: 'cerulean', n: '얼음 언덕', sub: '선단시티 체육관', w: 21, h: 32, leader: [10, 4], door: [10, 30], guy: [11, 29],
    deco: [[12, 30], [1, 29], [19, 27], [8, 12], [7, 26], [14, 24], [8, 4], [12, 15]],
    path: [[10, 30], [10, 5]], slots: [[16, 5, 'd'], [20, 11, 'l'], [2, 8, 'r'], [17, 18, 'd'], [4, 19, 'u']],
    free: ['000000000000000000000', '000000000000000000000', '000000000000000000000', '000000000000000000000', '000000001111100000000', '111111101101101111111', '111111100000001111111', '111111100000001111111', '111111111101111111111', '110000000000000000011', '110000000000000000011', '110111111101111111011', '110111111101111111011', '110110000000000011011', '110110000000000011011', '110110111101111011011', '110110111101111011011', '110110110000011011011', '110110110000011011011', '110110110101011011011', '110110110101011011011', '110110110101011011011', '110110111101111011011', '110110111101111011011', '110111111101111111011', '110111111101111111011', '111111111101111111111', '111111111101111111111', '111111111101111111111', '111111110101011111111', '111111111101111111111', '000000000000000000000'] },
  { id: 'pastoria', old: 'vermilion', n: '물길 미로', sub: '늪지시티 체육관', w: 25, h: 45, leader: [12, 5], door: [12, 43], guy: [14, 41],
    deco: [[14, 4], [15, 43], [1, 38], [22, 11], [14, 27], [2, 17], [2, 29], [22, 25]],
    path: [[12, 43], [12, 6]], slots: [[10, 34, 'd'], [6, 23, 'd'], [20, 34, 'l'], [4, 9, 'l'], [18, 19, 'l']],
    free: ['0000000000000000000000000', '0000000000000000000000000', '0000000000000000000000000', '0000000000000000000000000', '1000000000100010000000001', '1000000000100010000000001', '1011100000100010000000001', '1011100000000000000000001', '1011100000000000000000001', '1011100000000000000000001', '1011100111110111110000001', '1011111111110111110011101', '1000011111110111111111101', '1000011000000000000011101', '1000000000000000001111101', '1000011000000000001111101', '1011111111110111111111101', '1011111000110111111100001', '1000011000100011111100001', '1000011000000001111100001', '1000011000000001111100001', '1000011000000001111111101', '1000000000000001110111101', '1000011111110111110011101', '1011111110000000000011101', '1011111110000000001011101', '1000010000000000000111101', '1000000001110111111111101', '1000010000000001001111101', '1011111111110111111111101', '1011110000000001001111101', '1011110000000000001111101', '1011110000000001001111101', '1011110000000000001100001', '1001111111110111111111101', '1011111111110111111111101', '0000000000010100000000000', '1000000000000000000000001', '1111111111000001111111111', '0000000011000001100000000', '0000000011110111100000000', '0000000011110111100000000', '1000000011110111100000001', '0000000011110111100000000', '0000000000000000000000000'] },
];
const DESIGNS_FR = [
  { id: 'pewter', pt: 'oreburgh', n: '바위 계단', sub: '회색시티 체육관', w: 13, h: 16, leader: [6, 5], door: [6, 14], guy: [8, 13],
    deco: [[2, 5], [10, 5], [3, 9], [9, 9], [2, 11], [10, 11], [2, 13], [10, 13]],
    path: [[6, 14], [6, 6]], slots: [[7, 10, 'l'], [5, 9, 'r'], [7, 8, 'l'], [5, 8, 'r'], [8, 6, 'l'], [4, 6, 'r'], [9, 8, 'l']], inY: 10, tiny: [[7, 11], [[2, 3], [10, 11]]], cuts: [[9, 11], [9, 11], [9, 11], [9, 11], [9, 11]] },
  { id: 'cerulean', pt: 'snowpoint', n: '물 위 다리', sub: '블루시티 체육관', w: 17, h: 20, leader: [8, 6], door: [8, 18], guy: [7, 18],
    deco: [[2, 3], [14, 3], [1, 8], [15, 8], [1, 13], [15, 13], [5, 18], [11, 18]],
    path: [[8, 18], [8, 16], [9, 16], [9, 10], [8, 10], [8, 7]], slots: [[8, 13, 'r'], [10, 10, 'l'], [6, 10, 'r'], [9, 8, 'l'], [7, 8, 'r'], [11, 7, 'l'], [5, 7, 'r']], inY: 15, tiny: [[8, 16], [[3, 5], [12, 14]]],
    fix: { t: [[3, 7, 4, 7, 1, 1], [9, 7, 4, 7, 1, 1, 1], [5, 8, 7, 17, 3, .5]], 0: [[9, 8.5, 9, 8, 1, .5], [12, 7, 4, 7, 1, 1, 1], [12, 8, 4, 8, 1, 1, 1], [13, 7, 11, 12, 1, 2]], 1: [[9, 8.5, 9, 8, 1, .5], [12, 7, 4, 7, 1, 1, 1], [12, 8, 4, 8, 1, 1, 1], [13, 7, 11, 12, 1, 2]],
      2: [[4, 10.5, 4, 7.5, 1, .5], [4, 11, 4, 8, 1, 1], [5, 11, 6, 8, 1, 1]], 3: [[4, 10.5, 4, 7.5, 1, .5], [4, 11, 4, 8, 1, 1], [5, 11, 6, 8, 1, 1]] }, cuts: [[9, 15], [9, 15], [12, 15], [12, 15], [15, 16]] },
  { id: 'vermilion', pt: 'pastoria', n: '번개 관문', sub: '갈색시티 체육관', w: 11, h: 21, leader: [5, 2], door: [5, 19], guy: [4, 18],
    deco: [[1, 3], [9, 3], [1, 9], [9, 9], [1, 13], [9, 13], [1, 18], [9, 18]],
    path: [[5, 19], [5, 3]], slots: [[6, 15, 'l'], [3, 13, 'r'], [6, 11, 'l'], [6, 8, 'l'], [4, 8, 'r'], [6, 4, 'l'], [4, 4, 'r'], [2, 3, 'r'], [8, 3, 'l']], inY: 15, tiny: [[4, 16]], fix: { t: [0, 10].flatMap(x => [4, 5, 6, 7].map(y => [x, y, x, 4, 1, 1])) }, iv: 2, /* iv 2: 가운데 줄 쓰레기통을 바닥으로 칠한 그림 → 도전자가 문에서 관장까지 곧게 (경완 2026-10-29) */ cuts: [[9, 15], [9, 13], [9, 13], [9, 11], [9, 11]] },
  { id: 'celadon', pt: 'eterna', n: '꽃 정원', sub: '무지개시티 체육관', w: 13, h: 20, leader: [6, 4], door: [6, 18], guy: [5, 17],
    deco: [[3, 10], [9, 10], [1, 16], [11, 16], [2, 17], [10, 17], [1, 12], [11, 12]],
    path: [[6, 18], [6, 5]], slots: [[7, 13, 'l'], [5, 12, 'r'], [7, 11, 'l'], [5, 10, 'r'], [7, 9, 'l'], [5, 14, 'r'], [7, 14, 'l'], [5, 5, 'r'], [7, 5, 'l']], inY: 14, tiny: [[6, 15], [[2, 3], [10, 11]]], fix: { t: [[2, 5, 5, 4, 1, 1]] }, cuts: [[6, 14], [9, 14], [9, 14], [6, 8], [13, 14]] },
  { id: 'fuchsia', pt: 'veilstone', n: '넓은 무대', sub: '연분홍시티 체육관', w: 15, h: 16, leader: [7, 6], door: [7, 14], guy: [8, 13],
    deco: [[2, 3], [12, 3], [2, 7], [12, 7], [3, 10], [11, 10], [2, 13], [12, 13]],
    path: [[7, 14], [7, 8]], slots: [[8, 10, 'l'], [6, 10, 'r'], [8, 8, 'l'], [6, 8, 'r'], [9, 9, 'l'], [5, 9, 'r'], [9, 7, 'l'], [5, 7, 'r']], inY: 10, tiny: [[8, 11], [[1, 6], [9, 14]]], cuts: [[8, 11, [[1, 5], [10, 14]]], [9, 11, [[1, 4], [11, 14]]], [9, 10, [[1, 4], [11, 14]]], [9, 10]] },   // 경완 2026-10-28 '넓은 무대는 줄어든 느낌이 없네': 기둥 사이 칸도 잘라 좁게
];
// 꾸미기 놓을 수 있는 칸 (경완 2026-10-29 '기둥처럼 입체적인 소품 위에는 못 올리게'): pokefirered 맵 충돌·물 칸 + 석상 머리 칸은 막음. '1' = 놓을 수 있음
const FR_FREE = {"pewter":["0000000000000","0000111110000","0000000000000","0111101011110","0111111111110","0111011101110","0111111111110","0110101010110","0011111111100","0111011101110","0011111111100","0111011101110","0111011101110","0111111111110","0111111111110","0000000000000"],"cerulean":["00000000000000000","00000000100000000","00000000000000000","01111111111111110","01111110001111110","01000000000000010","01000001110000010","01001111111110010","01000001110010010","01000000000010010","01001111111110010","01001000010000010","01001000010000010","01001111110000010","01000000010000010","01000000010000010","01000011101000010","01000001110000010","01111111111111110","00000000000000000"],"vermilion":["00000000000","00000000000","01101110110","01111111110","01111111110","01111111110","00000000000","00000000000","11111111111","11111111111","10101110101","11111111111","10101110101","11111111111","10101110101","11111111111","11101110111","11101110111","11111111111","11111111111","00000000000"],"celadon":["0000001000000","0000000000000","0111111111110","0110000000110","0010011110100","0111111110110","0110111111110","0110111110110","0110001000110","0110011100110","0111111111100","0011111111110","0111111111110","0110011100110","0110011100110","0111011101110","0111011101110","0111111111110","0111111111110","0000000000000"],"fuchsia":["000000000000000","000000000000000","111111111111111","111111111111111","111111111111111","111111000111111","111111000111111","111111000111111","111111111111111","111111111111111","111111111111111","111101111101111","111101111101111","111111111111111","111111101111111","000000000000000"]};
DESIGNS_FR.forEach(d => { if (FR_FREE[d.id]) d.free = FR_FREE[d.id]; });
// 맵 묶음: 'fr' 파이어레드 칸토 체육관 / 'pt' 플라티나 (경완 2026-10-27 '맵은 이전 버전으로 바꿔줘봐 지금 캐릭터랑 묻는지 함 보게')
const MAP_SET = 'fr';
const DESIGNS = MAP_SET === 'fr' ? DESIGNS_FR : DESIGNS_PT;
const dzBase = id => DESIGNS.find(d => d.id === id) || DESIGNS.find(d => d.old === id || d.pt === id) || DESIGNS[0];
// 체육관은 처음엔 관장 주변 + 입구만 작게, 평판(등급)이 오를수록 가운데 홀이 열린다 (경완 2026-10-27).
// 닫힌 줄은 맵 그림에서 잘라 내고 위아래를 붙인다. 저장하는 칸(꾸미기·트레이너 자리)은 원래 맵 좌표(toF), 화면은 줄인 좌표(toV)
const OPEN = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
// cuts[등급] = [a, b]: 위아래 줄 그림이 이어지는 자리를 골라 둠 (경완 2026-10-27 '맵 줄인거 티나지 않게')
// tiny = 새내기(등급 0) 체육관: [줄 [a, b], 칸 [[a, b], …]] 나·입구 기둥·안내원만 겨우 들어가게 (경완 2026-10-27 '맨 처음은 진짜 겁나 좁아야')
// 체육관 크기 7단계 (경완 2026-10-29 '단계마다 확실히 다르게, 1단계는 훨씬 작게, 넓은 무대는 정사각형으로, 모든 단계에 입구 기둥'):
// STEPS[맵][단계 0~5] = [남길 줄, 남길 칸('' = 전부), 이음매 패치?]. 단계 6 = 다 열림. 예전 tiny/cuts/fix 는 이걸로 바뀌어 안 쓴다
const STEPS = {
  pewter: [['0-2,5-6,11-12,14-15', '0-1,4-8,11-12'], ['0-6,11-12,14-15', '0-1,4-8,11-12'], ['0-6,11-12,14-15', '0-1,3-9,11-12'], ['0-6,11-15', '0-1,3-9,11-12'], ['0-8,11-15', '0-1,3-9,11-12'], ['0-8,11-15', '']],
  cerulean: [['0-7,16-19', '0-2,5-11,14-16', [[3, 7, 4, 7, 1, 1], [9, 7, 4, 7, 1, 1, 1], [5, 8, 7, 17, 3, .5]]], ['0-8,15-19', '0-2,5-11,14-16'], ['0-8,15-19', '', [[12, 7, 4, 7, 1, 2, 1], [13, 7, 3, 7, 1, 2, 1]]], ['0-10,14,16-19', ''], ['0-11,13-14,16-19', ''], ['0-14,16-19', '']],
  vermilion: [['0-3,16-20', '0,3-7,10', [0, 6].flatMap((x, i) => [4, 5, 6, 7].map(y => [x, y, i * 10, 4, 1, 1]))], ['0-3,16-20', '', [0, 10].flatMap(x => [4, 5, 6, 7].map(y => [x, y, x, 4, 1, 1]))], ['0-9,15-20', ''], ['0-11,15-20', ''], ['0-11,14-20', ''], ['0-8,10-20', '']],
  celadon: [['0-5,15-19', '0-1,4-8,11-12'], ['0-5,15-19', '0-1,3-9,11-12', [[2, 5, 5, 4, 1, 1]]], ['0-5,14-19', '', [[3, 5, 2, 5, 1, 1], [5, 6, 5, 9, 3, 1], ...[3, 4, 8, 9].map(x => [x, 6, 2, 14, 1, 1])]], ['0-8,14-19', '', [[5, 9, 5, 9, 3, 1]]], ['0-5,8-19', ''], ['0-12,14-19', '']],
  // 넓은 무대: 정사각형으로 커지고 왼쪽 그늘 줄(0)·양끝 기둥(14)은 늘 남긴다. 13칸 단계는 반쪽 창문 대신 민벽(4·10번 칸)으로 덮음 (경완 2026-10-29 '이음새 안 보이게')
  fuchsia: [['0-2,5-7,10-12,14-15', '0,4-10,14'], ['0-2,5-8,10-12,14-15', '0,3-11,14'], ['0-2,4-8,10-12,14-15', '0,3-11,14'], ['0-2,4-12,14-15', '0,2-12,14', [[1, 0, 4, 0, 1, 2], [11, 0, 10, 0, 1, 2]]], ['0-12,14-15', '0,2-12,14', [[1, 0, 4, 0, 1, 2], [11, 0, 10, 0, 1, 2]]], ['0-2,4-15', '']],
};
// '0-2,5' 처럼 남길 번호 → 잘라 낼 구간 [[a, b), …]
const keepR = (s, n) => { if (!s) return []; const K = new Set(); s.split(',').forEach(p => { const [a, b = a] = p.split('-').map(Number); for (let i = a; i <= b; i++) K.add(i); });
  const R = []; for (let i = 0; i < n; i++) if (!K.has(i)) { const l = R[R.length - 1]; if (l && l[1] === i) l[1] = i + 1; else R.push([i, i + 1]); } return R; };
const yList = y => !y ? [] : Array.isArray(y[0]) ? y : [y];
function cutOf(D, gi) { if (gi == null) { const g = st(); if (!g) return null; gi = bigOf(g); }
  const S7 = STEPS[D.id]; if (S7) { const s = S7[gi]; return s ? { y: keepR(s[0], D.h), x: keepR(s[1], D.w), f: s[2] } : null; }
  const f = D.fix?.[gi === 0 && D.tiny ? 't' : gi - 1];   // 7단계: 0 = tiny, 1~5 = cuts[0~4], 6 = 다 열림 (fix 숫자 키는 cuts 번호)
  if (gi === 0 && D.tiny) return { y: D.tiny[0], x: D.tiny[1] || [], f };
  if (D.cuts) { const c = D.cuts[gi - 1]; return c ? { y: [c[0], c[1]], x: c[2] || [], f } : null; }   // [a, b, 칸 자르기?]
  const a0 = D.leader[1] + 3, b0 = D.door[1] - 3; if (b0 - a0 < 2) return null;
  const a = a0 + Math.round((b0 - a0) * OPEN[gi]); return a < b0 ? { y: [a, b0], x: [] } : null; }
// 잘라 낸 구간 R([[a, b], …], 오름차순)에 대해 원래 좌표 → 보이는 좌표(잘린 곳은 null), 그 반대
const cutV = R => z => { let d = 0; for (const [a, b] of R) { if (z >= b) d += b - a; else if (z >= a) return null; } return z - d; };
const cutF = R => z => { for (const [a, b] of R) if (z >= a) z += b - a; return z; };
const keepSeg = (R, n) => { const out = []; let s = 0; for (const [a, b] of R) { if (a > s) out.push([s, a]); s = b; } if (s < n) out.push([s, n]); return out; };
const dzCache = {};
function dzOf(id, gi) {
  const D = dzBase(id), c = cutOf(D, gi), k = D.id + JSON.stringify(c); if (dzCache[k]) return dzCache[k];
  const id0 = z => z;
  if (!c) return (dzCache[k] = Object.assign({}, D, { base: D, cut: null, toV: id0, toF: id0, toVx: id0, toFx: id0 }));
  const RY = yList(c.y), RX = c.x, v = cutV(RY), vx = cutV(RX), ok = p => v(p[1]) != null && vx(p[0]) != null, pt = p => [vx(p[0]), v(p[1]), ...p.slice(2)];
  const near = (f, R) => z => f(z) ?? ((r => r ? (f(r[0] - 1) ?? -1) + 1 : 0)(R.find(([a, b]) => z >= a && z < b)));   // 잘린 줄 위의 길 점은 바로 아래 남은 줄로
  const ny = RY.reduce((t, [a, b]) => t + b - a, 0), nx = RX.reduce((t, [a, b]) => t + b - a, 0);
  const pn = p => [near(vx, RX)(p[0]), near(v, RY)(p[1]), ...p.slice(2)];   // 관장·문·안내원은 잘린 줄에 걸려도 가까운 남은 칸으로
  const path = D.path.map(p => [near(vx, RX)(p[0]), near(v, RY)(p[1])]).filter((p, i, L) => !i || p[0] !== L[i - 1][0] || p[1] !== L[i - 1][1]);
  return (dzCache[k] = Object.assign({}, D, { base: D, cut: c, h: D.h - ny, w: D.w - nx, leader: pn(D.leader), door: pn(D.door), guy: pn(D.guy), path,
    deco: D.deco.filter(ok).map(pt), slots: D.slots.filter(ok).map(pt), free: D.free && D.free.filter((_, y) => v(y) != null).map(r => [...r].filter((_, x) => vx(x) != null).join('')),
    toV: v, toF: cutF(RY), toVx: vx, toFx: cutF(RX) }));
}
// 미리보기 그림을 지금 크기(data-gi 가 있으면 그 등급, 처음 열 때는 0 = 새내기)의 잘라 붙인 맵으로 (경완 2026-10-27)
// 디자인 썸네일을 미리 그려 둔다 (경완 2026-10-28 '맵 썸네일이 바로 안 나오고 박스 텍스트 먼저')
const preMs = gi => DESIGNS.forEach(d => mapSrc(dzOf(d.id, gi)).then(u => { const im = new Image(); im.src = u; im.decode?.().catch(() => {}); }));
function fillMs(el) { el.querySelectorAll('img[data-ms]').forEach(im => { const gi = im.dataset.gi === '' || im.dataset.gi == null ? undefined : +im.dataset.gi; mapSrc(dzOf(im.dataset.ms, gi)).then(u => { im.src = u; }); }); }
// 잘라 붙인 맵 그림 (이음매 없이)
const mapCache = {};
function mapSrc(D) { const u = `${IMG}map/${D.id}.png${D.iv ? `?v=${D.iv}` : ""}`; if (!D.cut) return Promise.resolve(u); const k = D.id + JSON.stringify(D.cut); if (mapCache[k]) return mapCache[k];
  return (mapCache[k] = new Promise(res => { const im = new Image(); im.onerror = () => res(u);
    im.onload = () => { const c = document.createElement('canvas'); c.width = D.w * 16; c.height = D.h * 16; const g = c.getContext('2d');
      const SY = keepSeg(yList(D.cut.y), Math.ceil(im.height / 16)), SX = keepSeg(D.cut.x, Math.ceil(im.width / 16));
      let dy = 0; for (const [y0, y1] of SY) { let dx = 0; const hh = Math.min(y1 * 16, im.height) - y0 * 16;
        for (const [x0, x1] of SX) { const ww = Math.min(x1 * 16, im.width) - x0 * 16; g.drawImage(im, x0 * 16, y0 * 16, ww, hh, dx, dy, ww, hh); dx += ww; } dy += hh; }
      // 이음매 메우기: [보이는 x, y, 원래 x, y, 너비, 높이(칸), 좌우 뒤집기] (경완 2026-10-27 '좁혔을 때 경계선 안 보이게')
      (D.cut.f || []).forEach(([vx, vy, sx, sy, w, h, fl]) => { const W = w * 16, Hh = h * 16; g.save(); g.translate(vx * 16 + (fl ? W : 0), vy * 16); if (fl) g.scale(-1, 1); g.drawImage(im, sx * 16, sy * 16, W, Hh, 0, 0, W, Hh); g.restore(); });
      res(c.toDataURL()); }; im.src = u; })); }

// ---------- 평판·등급 ----------
const REP_MAX = 500;
// 평판 ≈ 막은 도전자 수 (경완 2026-10-29). 등급마다 배지 그림: 동 테 · 은 테 · 금 테 · 동 월계수 · 은 · 금 · 프리즘
const GRADES = [[0, '새내기 체육관'], [30, '동네 체육관'], [60, '떠오르는 체육관'], [100, '이름난 체육관'], [200, '인기 체육관'], [300, '명문 체육관'], [500, '전설의 체육관']];
// 체육관 크기·트레이너·훈련장 단계 (6단계 그대로): 떠오르는 체육관은 동네와 같은 단계
const STAGE = [0, 1, 1, 2, 3, 4, 5], STAGES = 7;   // STAGE = 트레이너·훈련장 단계. 체육관 크기는 등급마다 한 단계씩 7단계 (경완 2026-10-29 '체육관 크기 7단계')
const GRADES_OLD = [0, 100, 250, 450, 700, 1000];   // 10.87 까지의 평판 문턱 (예전 저장 옮기기)
// 체육관 크기 단계: 평판으로 등급이 오르면 체육관 정보에서 넓힌다 (경완 2026-10-28 '돈 내고 넓히는 것보다 평판 오르면'). g.big 없으면 예전 저장 = 등급 그대로
const bigOf = (g = st()) => { const gi = gradeOf(g?.rep || 0).i; return g?.big == null ? gi : Math.min(g.big, gi); };
const canBig = (g = st()) => !!g?.d && gradeOf(g.rep || 0).i > bigOf(g);
// 등급 배지 = 지금 체육관 타입의 그 등급 배지 그림 (경완 2026-10-29 '이 배지를 체육관 등급 배지로')
const gEmb = i => bdHtml(st().ty, i + 1);
const gradeOf = rep => { let i = 0; GRADES.forEach(([v], k) => { if (rep >= v) i = k; }); return { i, s: STAGE[i], n: GRADES[i][1], lo: GRADES[i][0], hi: GRADES[i + 1]?.[0] ?? REP_MAX }; };

// ---------- 저장 ----------
const st = () => S.gym;
const myTypes = () => { const c = Array(19).fill(0); S.box.forEach(p => (SPECIES[p.sp]?.t || []).forEach(t => c[t]++)); return c; };
const trName = () => (trOf().n || '').trim();
const defName = ty => `${trName() || '나'}의 ${TYPE_KO[ty]} 체육관`;

// ---------- 화면 ----------
let root = null, open = false, tab = null, ents = [], sc = 2;
function build() {
  root = document.createElement('div'); root.id = 'gym'; root.hidden = true; root.setAttribute('role', 'application'); root.setAttribute('aria-label', '체육관');
  root.innerHTML = `
    <div class="gy-main">
      <div class="gy-stage"><div class="gy-map"><img alt=""><div class="gy-ents"></div></div></div>
      <div class="gy-top">
        <button class="gy-plate" type="button" aria-label="체육관 정보"><span class="gy-wing l"><span class="gy-nm"></span></span><span class="gy-bd"></span><span class="gy-wing r"><span class="gy-grade"></span></span><span class="gy-rpa"><i class="gy-bar"><i></i></i><b><em>평판</em><span class="gy-repn"></span></b></span></button>
      </div>
      <!-- 필드와 같은 자리 (경완 2026-10-28): 꾸미기 = 맵 편집 자리(왼쪽 위), 창고 = 가방 자리(오른쪽) -->
      <button class="gy-deco" type="button" aria-label="꾸미기"><svg viewBox="0 0 17 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M1 0h3v1H1zM13 0h3v1H13zM0 1h17v1H0zM0 2h3v1H0zM14 2h3v1H14zM1 3h2v1H1zM14 3h2v1H14zM2 4h1v1H2zM14 4h1v1H14zM2 5h1v1H2zM6 5h1v1H6zM10 5h1v1H10zM14 5h1v1H14zM2 6h1v1H2zM8 6h1v1H8zM14 6h1v1H14zM2 7h1v1H2zM7 7h1v1H7zM9 7h1v1H9zM14 7h1v1H14zM3 8h1v1H3zM13 8h1v1H13zM2 9h1v1H2zM14 9h1v1H14zM2 10h1v1H2zM14 10h1v1H14zM2 11h1v1H2zM14 11h1v1H14zM2 12h1v1H2zM14 12h1v1H14zM3 13h1v1H3zM13 13h1v1H13zM4 14h1v1H4zM7 14h3v1H7zM12 14h1v1H12zM5 15h2v1H5zM10 15h2v1H10z"/><path fill="#ffd520" d="M3 2h1v1H3zM13 2h1v1H13zM3 3h2v1H3zM6 3h5v1H6zM12 3h2v1H12zM4 4h9v1H4zM4 5h2v1H4zM7 5h3v1H7zM11 5h2v1H11zM6 6h2v1H6zM9 6h2v1H9zM8 7h1v1H8zM5 8h1v1H5zM11 8h1v1H11zM4 9h2v1H4zM11 9h2v1H11z"/><path fill="#6a3908" d="M4 2h9v1H4zM5 3h1v1H5zM11 3h1v1H11zM3 4h1v1H3zM13 4h1v1H13zM3 5h1v1H3zM13 5h1v1H13zM3 6h1v1H3zM13 6h1v1H13zM3 7h1v1H3zM13 7h1v1H13zM4 8h1v1H4zM12 8h1v1H12zM3 9h1v1H3zM6 9h1v1H6zM10 9h1v1H10zM13 9h1v1H13zM3 10h1v1H3zM5 10h2v1H5zM10 10h2v1H10zM13 10h1v1H13zM3 11h1v1H3zM13 11h1v1H13zM3 12h1v1H3zM5 12h2v1H5zM10 12h2v1H10zM13 12h1v1H13zM4 13h1v1H4zM7 13h3v1H7zM12 13h1v1H12zM5 14h2v1H5zM10 14h2v1H10z"/><path fill="#e65262" d="M4 6h2v1H4zM11 6h2v1H11zM4 7h2v1H4zM11 7h2v1H11z"/><path fill="#de9c10" d="M6 7h1v1H6zM10 7h1v1H10zM6 8h5v1H6zM7 9h3v1H7zM4 10h1v1H4zM7 10h3v1H7zM12 10h1v1H12zM4 11h9v1H4zM4 12h1v1H4zM7 12h3v1H7zM12 12h1v1H12zM5 13h2v1H5zM10 13h2v1H10z"/></svg></button>
      <button class="gy-store gy-sq" type="button" aria-label="창고"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M2 3h12v1H2zM1 4h1v3H1zM14 4h1v3h-1zM2 7h12v1H2zM2 8h1v6H2zM13 8h1v6h-1zM3 14h10v1H3zM6 9h4v1H6zM6 10h1v1H6zM9 10h1v1H9zM6 11h4v1H6z"/><path fill="#c8783c" d="M2 4h12v3H2zM3 8h10v6H3z"/><path fill="#e8a060" d="M2 4h12v1H2zM3 8h10v1H3z"/><path fill="#f0c040" d="M7 10h2v1H7z"/><path fill="#8a4a24" d="M3 13h10v1H3zM7 4h2v3H7z"/></svg></button>
      <button class="gy-qbtn" type="button" aria-label="도전자 받기"><i class="gy-qdot" hidden></i></button><p class="gy-qcap" hidden></p>
      <button class="win gy-simb" type="button">시뮬</button>
      <div class="win blue gy-dlg" aria-live="polite"></div>
      <section class="gy-sheet" hidden></section>
      <div class="win gy-dtit"><b>체육관 꾸미기</b><span>꾸미기를 눌러서 옮겨요</span></div>
    </div>
    <nav class="gy-menu" aria-label="체육관 메뉴">
      <button type="button" data-t="battle">배틀</button><button type="button" data-t="train">훈련장</button><button type="button" data-t="staff">트레이너</button><button type="button" data-t="shop">상점</button><button type="button" class="gy-out" data-t="out">퇴근</button>
    </nav>
    <div class="gy-dbar"><div class="db-head"><b>창고</b><span>골라서 체육관에 놓아요</span></div><div class="db-list"></div>
      <div class="db-keys"><button type="button" data-a="cancel">취소</button><button type="button" class="ok" data-a="save">저장</button></div></div>`;
  document.body.appendChild(root);
  $g('.gy-plate').onclick = () => { sfx('tap'); infoPop(); };
  $g('.gy-store').onclick = () => { sfx('tap'); if (ded) ded.end?.(); storePop(); };
  $g('.gy-deco').onclick = () => { sfx('tap'); root.querySelectorAll('.gy-infos').forEach(x => x.remove()); if (!ded) decoEdit(); };
  $g('.gy-simb').onclick = () => { sfx('tap'); simPop(); };
  $g('.gy-menu').onclick = e => { const b = e.target.closest('button'); if (!b) return; const t = b.dataset.t; if (t === 'out') return exit(); sfx('tap');
    root.querySelectorAll('.gy-pop').forEach(x => x.remove());   // 다른 메뉴를 누르면 포켓몬 정보 카드 같은 팝업도 닫힘 (경완 2026-10-29)
    const cov = root.querySelectorAll('.gy-boxw,.gy-infos'); if (cov.length) { cov.forEach(x => x.remove()); return openTab(t); }   // 포켓몬 고르기·정보 화면 위에서 메뉴를 누르면 그 화면을 닫고 그 메뉴로 (경완 2026-10-28)
    openTab(tab === t ? null : t); };
  // 퇴근은 손가락이 닿는 순간 로딩 화면부터 (click 을 기다리지 않음, 경완 2026-10-27 '여전히 바로 안 뜸')
  $g('.gy-menu .gy-out').addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); exit(); });
  addEventListener('resize', () => { if (open) layout(st()?.d ? undefined : DESIGNS[0]); });
  // 홈 화면엔 일지창이 없다 (경완 2026-10-28 '체육관 일지창 없애주고'): 대화창은 알림이 있을 때만 뜨고, 누르면 닫힌다
  const dlg = $g('.gy-dlg');
  dlg.addEventListener('click', e => { if (e.target.closest('button') || root.classList.contains('ded') || busy || root.classList.contains('dhide')) return; e.stopPropagation(); sfx('tap'); homeSay(); });
  // 도전자 명단 아이콘 → 새 화면 (도전자 / 체육관 일지)
  $g('.gy-qbtn').onclick = () => { const g = st(); if (!g?.q?.length) return; sfx('tap'); if (ded) ded.end?.(); g.qSeen = Math.max(g.qSeen | 0, ...g.q.map(c => c.id)); save(); $g('.gy-qdot').hidden = true; qPop(); };
  [['.gy-deco', '꾸미기'], ['.gy-store', '창고'], ['.gy-qbtn', '도전자 받기']].forEach(([c, n]) => $g(c).insertAdjacentHTML('beforeend', `<small class="ga-l">${n}</small>`));   // 홈 레이아웃 C: 메뉴 위 행동 줄 (경완 2026-10-29)
  // 빈 곳을 한 번 누르면 이름판·버튼을 다 숨겨 메뉴만 남김, 다시 누르면 다 펼침 (경완 2026-10-28, 필드 fview 와 같음)
  $g('.gy-stage').addEventListener('click', e => { if (ded || busy || root.classList.contains('pre') || root.querySelector('.gy-kang,.gy-pop,.gy-setup') || e.target.closest('.tap,.gy-prop.tap')) return;
    root.classList.toggle('gview'); sfx('tap'); });
}

// 맵 크기: 화면 폭에 맞추고, 너무 길면 세로로 넘겨 본다
const ACT_H = 72;   // 홈 레이아웃 C (경완 2026-10-29): 메뉴 위 행동 줄(꾸미기·창고·도전자 명단) 높이만 비우고 지도는 크게
function layout(D = dzOf(st().d)) {
  const stg = $g('.gy-stage'), map = $g('.gy-map'), img = map.querySelector('img');
  const mw = D.w * 16, mh = D.h * 16, aw = stg.clientWidth - 16, ah = stg.clientHeight - 104 - 140;
  const bw = (D.base || D).w * 16, bh = (D.base || D).h * 16;   // 배율은 다 열린 맵 기준: 좁은 체육관은 화면에서도 작게 보인다
  sc = Math.min(3.5, aw / bw, Math.max(ah / bh, aw / bw * .8)); sc = Math.round(Math.max(1.75, Math.floor(sc * 8) / 8) * 1.32 * 8) / 8;   // 레이아웃 C (경완 2026-10-29): 예전보다 1.32배 크게, 넘치면 넘겨 보기   // 너무 작아지지 않게 (넘치면 스크롤)   // 플라티나 맵은 넓어서 1배보다 작아질 수 있다
  map.style.width = mw * sc + 'px'; map.style.height = mh * sc + 'px';
  const mk = D.id + JSON.stringify(D.cut); if (img.dataset.k !== mk) { img.dataset.k = mk; mapSrc(D).then(u => { if (img.dataset.k === mk) img.src = u; }); }
  img.style.width = mw * sc + 'px'; img.style.height = mh * sc + 'px';
  // 관장(나)이 보이는 칸의 가운데에 오게: 맵 둘레에 여백을 두고 그만큼 넘겨 둔다 (경완 2026-10-27 '내 캐릭터 있는 곳이 가운데에 오게')
  const W = stg.clientWidth, H = stg.clientHeight, T = parseFloat(getComputedStyle(stg).paddingTop) || 104, B = ACT_H + 8, cy = T + (H - T - B) / 2;
  const lx = (D.leader[0] + .5) * 16 * sc, ly = (D.leader[1] + .5) * 16 * sc, pl = Math.max(8, W / 2 - lx), pr = Math.max(8, W / 2 - (mw * sc - lx));
  stg.style.paddingLeft = pl + 'px'; stg.style.paddingRight = pr + 'px';
  // 체육관이 화면에 다 들어올 만큼 작으면 위 타이틀·버튼과 아래 도전자 받기 사이 가운데에 (경완 2026-10-29 '위아래 여백 정렬')
  const sr = stg.getBoundingClientRect(), bot = q => { const r = $g(q)?.getBoundingClientRect(); return r && r.height ? r.bottom - sr.top : 0; };
  const t0 = Math.max(bot('.gy-rpa'), bot('.gy-deco'), bot('.gy-store'), bot('.gy-plate')) + 8, qr = $g('.gy-qbtn')?.getBoundingClientRect(), b0 = (qr?.height ? qr.top - sr.top : H - B) - 8, fits = t0 > 0 && mh * sc <= b0 - t0;
  map.style.marginTop = (fits ? Math.max(0, t0 + (b0 - t0 - mh * sc) / 2 - T) : Math.max(0, cy - T - ly)) + 'px'; map.style.marginBottom = (fits ? 0 : Math.max(0, (H - cy) - (mh * sc - ly) - B)) + 'px';
  const vk = mk + '|' + sc + '|' + W + 'x' + H + '|' + fits; stg.classList.toggle('fit', fits);   // 화면에 다 들어오면 위아래·좌우 스크롤 막기 (경완 2026-10-29)
  if (fits) { stg.dataset.vk = vk; stg.scrollTop = 0; stg.scrollLeft = pl + lx - W / 2; } else if (stg.dataset.vk !== vk) { stg.dataset.vk = vk; requestAnimationFrame(() => { const mt = parseFloat(map.style.marginTop), s1 = T + mt + ly - cy, s2 = T + mt + mh * sc - (H - B);   // 레이아웃 C: 관장이 보이면 문(아래 끝)이 행동 줄 바로 위에 오게
      stg.scrollTop = s2 > s1 && ly - (s2 - mt) > 24 ? s2 : s1; stg.scrollLeft = pl + lx - W / 2; }); }
  ents.forEach(place);
}

// ---------- 필드 걸음 그림 (본가 16x32 프레임: 0 아래 1 위 2 왼쪽 3·4 아래 걷기 5·6 위 걷기 7·8 왼쪽 걷기) ----------
const FR = { d: [0, 3, 4], u: [1, 5, 6], l: [2, 7, 8], r: [2, 7, 8] };
function ent(o) {
  const e = Object.assign({ x: 0, y: 0, f: 'd', st: 0, n3: false, fw: owW(o.ow) }, o); e.el = document.createElement('i'); e.el.className = 'gy-ow' + (o.onTap ? ' tap' : '');
  e.el.style.backgroundImage = `url(${o.src || owSrc(o.ow)})`; if (o.onTap) e.el.onclick = ev => { ev.stopPropagation(); o.onTap(e); };
  $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); return e;
}
function place(e) {
  if (e.prop) { const s = e.el.style; s.width = e.w * sc + 'px'; s.height = e.h * sc + 'px'; s.left = e.x * 16 * sc + 'px'; s.top = (e.y * 16 + 16 - e.h) * sc + 'px'; s.zIndex = Math.round(e.y * 10) + 9; return; }
  const s = e.el.style, fr = e.n3 ? ({ d: 0, u: 1, l: 2, r: 2 })[e.f] : FR[e.f][e.st];
  s.width = e.fw * sc + 'px'; s.height = 32 * sc + 'px'; s.left = (e.x * 16 - (e.fw - 16) / 2) * sc + 'px'; s.top = (e.y * 16 - 16) * sc + 'px';
  s.backgroundSize = `auto ${32 * sc}px`; s.backgroundPosition = `${-fr * e.fw * sc}px 0`; s.zIndex = Math.round(e.y * 10) + 10;
  e.el.classList.toggle('flip', e.f === 'r');
}
function prop(k, x, y) { const o = DECO[k]; if (!o) return; const e = { prop: 1, k, x, y, w: o.w, h: o.h, el: document.createElement('i') }; e.el.className = 'gy-prop'; e.el.style.backgroundImage = `url(${IMG}deco/t/${k}.png)`; $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); return e; }
function clearEnts() { ents.forEach(e => e.el.remove()); ents = []; }
// 칸을 따라 걷기 (한 칸 0.26초, 걸음 프레임 번갈아)
async function walk(e, pts, spd = 260) {
  for (const [tx, ty] of pts) {
    while (e.x !== tx || e.y !== ty) {
      const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y); e.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u';
      const x0 = e.x, y0 = e.y, t0 = performance.now(); e.stepN = (e.stepN || 0) + 1;
      await new Promise(done => { const tick = now => { const k = Math.min(1, (now - t0) / spd); e.x = x0 + (dx ? dx : 0) * k; e.y = y0 + (dx ? 0 : dy) * k; e.st = k < .5 ? (e.stepN % 2 ? 1 : 2) : 0; place(e); k < 1 ? requestAnimationFrame(tick) : done(); }; requestAnimationFrame(tick); });
      e.x = Math.round(e.x); e.y = Math.round(e.y);
    }
  }
  e.st = 0; place(e);
}

// ---------- 관장 의상 (상점): 얼굴·머리는 그대로 두고 옷 색만 바꾼다 (경완 2026-10-27 '얼굴은 그대로고 옷만').
// a 윗옷(모자·상의), b 아래옷 색. 내 기본 그림(레드/리프)의 옷 색 묶음을 이 색으로 칠한다. g 값, lv 필요한 체육관 등급
const OUTFITS = {
  red: { n: '빨간 재킷', a: '#d83a30', b: '#34449a', g: 800 }, leaf: { n: '하늘 셔츠', a: '#4aa0e0', b: '#d84848', g: 800 },
  brendan: { n: '호연 모험복', a: '#e85030', b: '#383840', g: 2500 }, may: { n: '호연 반다나', a: '#e04850', b: '#3a7a48', g: 2500 },
  cooltrainer_m: { n: '엘리트 제복', a: '#3870c8', b: '#383848', g: 1500 }, cooltrainer_f: { n: '엘리트 드레스', a: '#e05878', b: '#383848', g: 1500 },
  black_belt: { n: '도복', a: '#f2f2f2', b: '#303034', g: 1500 }, beauty: { n: '분홍 원피스', a: '#f088b8', b: '#f6a0c8', g: 1500 }, gentleman: { n: '정장', a: '#3a3a4c', b: '#2c2c38', g: 1500 },
  blue: { n: '라이벌 스타일', a: '#7050a8', b: '#404050', g: 3000, lv: 1 }, brock: { n: '바위 관장 옷', a: '#b07840', b: '#5e7a3a', g: 3000, lv: 1 }, misty: { n: '물 관장 옷', a: '#f0d040', b: '#e05050', g: 3000, lv: 1 },
  lt_surge: { n: '군복', a: '#6a8440', b: '#585e44', g: 3500, lv: 2 }, erika: { n: '꽃 기모노', a: '#e8a040', b: '#c84868', g: 3500, lv: 2 }, koga: { n: '닌자복', a: '#5a4a80', b: '#2e2838', g: 4000, lv: 3 },
  sabrina: { n: '초능력 드레스', a: '#c03060', b: '#24242c', g: 4000, lv: 3 }, blaine: { n: '연구 가운', a: '#f4f4f4', b: '#e04420', g: 4500, lv: 4 }, giovanni: { n: '보스 정장', a: '#d06830', b: '#2e2e30', g: 5000, lv: 4 },
  lorelei: { n: '얼음 정장', a: '#7ab8f0', b: '#303848', g: 6000, lv: 5 }, lance: { n: '드래곤 망토', a: '#30303e', b: '#d03030', g: 6000, lv: 5 },
};
const myF = () => trOf().sex === 'f';
const myOw = () => myF() ? 'pt_f' : 'pt_m';   // 경완 2026-10-27: 주인공은 플라티나 광휘·빛나 (32x32 걸음 칸)
// 그림마다 옷 색 묶음 (a 윗옷, b 아래옷). 이 색만 바꾸고 피부·머리·모자는 그대로. 빛나는 a 비니·목도리, b 치마·부츠
const CLOTH = {
  'ow/pt_m': { a: ['#5a84e7', '#39638c', '#394252'], b: [] },
  'ow/pt_f': { a: ['#efefff', '#cecede', '#ada5ce'], b: ['#ef94c6', '#c66b9c'] },
  'tr/pt_m': { a: ['#628bd5', '#39628b', '#394152'], b: ['#5a5a6a', '#737b7b'] },
  'tr/pt_f': { a: ['#eeeeff', '#cdcdde', '#9c9cbd'], b: ['#ff94c5', '#c56a9c'] },
  'trb/pt_m': { a: ['#7bacde', '#628bd5', '#4a6283'], b: [] },
  'trb/pt_f': { a: ['#eeeeff', '#cdcdde', '#aca4cd'], b: ['#f6a4c5', '#c56a9c'] },
};
const hx = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0;
  if (M !== m) { const d = M - m; s = l > .5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { if (!s) return [l, l, l].map(v => Math.round(v * 255)); const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); }
// 옷 색 묶음의 밝기 차이는 그대로, 색·채도·가운데 밝기는 옷 색으로
function clothMap(list, to) { const T = rgb2hsl(hx(to)), L = list.map(c => rgb2hsl(hx(c))), mid = L.reduce((a, x) => a + x[2], 0) / L.length, M = new Map();
  list.forEach((c, i) => M.set(c, hsl2rgb([T[0], T[1], clampN(L[i][2] + (T[2] - mid) * .9, .06, .97)]))); return M; }
const fitCache = {};
// 옷을 칠한 그림 (dataURL). kind: ow 맵 걸음 그림 / tr 전신 / trb 배틀 뒷모습. 옷이 없으면 원래 그림
function fitSrc(kind, fit = st()?.fit) {
  const base = myOw(), key = `${kind}/${base}`, url = `${IMG}${key}.png`, O = OUTFITS[fit];
  if (!O || !CLOTH[key]) return Promise.resolve(url);
  // 앞모습(전신 카드·상점)은 옷 모양까지 새로 그린 그림 (Figma 이미지 모델, 경완 2026-10-27 '색 바꾸기 수준이 아니라 옷 좀 바꿔줘')
  if (kind === 'tr') return Promise.resolve(`${IMG}fit/${fit}_${myF() ? 'f' : 'm'}.png`);
  const ck = key + '|' + fit; if (fitCache[ck]) return fitCache[ck];
  return (fitCache[ck] = new Promise(ok => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), A = clothMap(CLOTH[key].a, O.a), B = clothMap(CLOTH[key].b, O.b);
    for (let i = 0; i < d.data.length; i += 4) { if (!d.data[i + 3]) continue; const h = '#' + [0, 1, 2].map(k => d.data[i + k].toString(16).padStart(2, '0')).join(''), n = A.get(h) || B.get(h); if (n) { d.data[i] = n[0]; d.data[i + 1] = n[1]; d.data[i + 2] = n[2]; } }
    x.putImageData(d, 0, 0); ok(c.toDataURL()); }; im.onerror = () => ok(url); im.src = url; }));
}
// ---------- 꾸미기 (상점): 인형·쿠션·석상. w 크기(16·32), g 값 ----------
const DECO = {};
[['pikachu_doll', '피카츄 인형', 800], ['pichu_doll', '피츄 인형', 800], ['marill_doll', '마릴 인형', 800], ['jigglypuff_doll', '푸린 인형', 800], ['clefairy_doll', '삐삐 인형', 800], ['togepi_doll', '토게피 인형', 800], ['meowth_doll', '나옹 인형', 800], ['ditto_doll', '메타몽 인형', 800],
 ['chikorita_doll', '치코리타 인형', 1000], ['cyndaquil_doll', '브케인 인형', 1000], ['totodile_doll', '리아코 인형', 1000], ['treecko_doll', '나무지기 인형', 1000], ['torchic_doll', '아차모 인형', 1000], ['mudkip_doll', '물짱이 인형', 1000],
 ['smoochum_doll', '뽀뽀라 인형', 900], ['azurill_doll', '루리리 인형', 900], ['skitty_doll', '에나비 인형', 900], ['swablu_doll', '파비코 인형', 900], ['wynaut_doll', '마자 인형', 900], ['duskull_doll', '해골몽 인형', 900], ['kecleon_doll', '켈리몬 인형', 900], ['gulpin_doll', '꼴깍몬 인형', 900], ['lotad_doll', '연꽃몬 인형', 900], ['seedot_doll', '도토링 인형', 900], ['baltoy_doll', '오뚝군 인형', 900],
 ['pika_cushion', '피카 쿠션', 500], ['round_cushion', '둥근 쿠션', 500], ['kiss_cushion', '키스 쿠션', 500], ['zigzag_cushion', '지그재그 쿠션', 500], ['spin_cushion', '빙글 쿠션', 500], ['diamond_cushion', '다이아 쿠션', 500], ['ball_cushion', '볼 쿠션', 500], ['grass_cushion', '풀 쿠션', 500], ['fire_cushion', '불꽃 쿠션', 500], ['water_cushion', '물 쿠션', 500],
 ['statue', '체육관 석상', 2000, 1],
 ['big_snorlax_doll', '큰 잠만보 인형', 6000, 2], ['big_rhydon_doll', '큰 코뿌리 인형', 6000, 2], ['big_lapras_doll', '큰 라프라스 인형', 6000, 2], ['big_venusaur_doll', '큰 이상해꽃 인형', 8000, 3], ['big_charizard_doll', '큰 리자몽 인형', 8000, 3], ['big_blastoise_doll', '큰 거북왕 인형', 8000, 3], ['big_wailmer_doll', '큰 고래왕자 인형', 6000, 2],
 ['big_regirock_doll', '큰 레지락 인형', 12000, 4], ['big_regice_doll', '큰 레지아이스 인형', 12000, 4], ['big_registeel_doll', '큰 레지스틸 인형', 12000, 4]].forEach(([k, n, g, lv]) => { DECO[k] = { n, g, lv: 0, w: /^big_/.test(k) ? 32 : 16, h: /^big_/.test(k) ? 32 : 16 }; });   // 작은 건 1칸, 큰 인형은 2×2칸 (경완 2026-10-28 '격자 한칸 다 채우게', '큰 인형들은 최소 4칸')
Object.values(OUTFITS).forEach(o => { o.lv = 0; });   // 꾸미기·관장 의상은 등급 제한 없음 (경완 2026-10-28)
// 꾸미기는 개수 제한 없음 (경완 2026-10-28): 기본 자리가 다 차면 맵의 아무 빈 칸에
const anyFree = (D, used, k) => { for (let y = D.h - 1; y >= 0; y--) for (let x = 0; x < D.w; x++) if (fitAt(D, k, x, y, used)) return [x, y]; return null; };
// 꾸미기가 차지하는 칸: [x, y] 는 왼쪽 아래 칸, 큰 인형은 오른쪽·위로 한 칸씩 더
const dSz = k => [(DECO[k]?.w || 16) / 16, (DECO[k]?.h || 16) / 16];
const dCells = (k, x, y) => { const [w, h] = dSz(k), out = []; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([x + i, y - j]); return out; };
const fitAt = (D, k, x, y, used) => dCells(k, x, y).every(([a, b]) => freeTile(D, a, b, used));
const decoUsed = (L, skip) => new Set(L.filter(z => z[0] !== skip).flatMap(z => dCells(...z).map(c => c[0] + ',' + c[1])));
// 꾸미기 자리: g.dp 놓은 것(순서), g.dpos {꾸미기: [x, y]} 직접 놓은 칸 (경완 2026-10-27 '산 거 직접 놓을 수 있게'). 칸이 없으면 맵의 기본 자리
function decoList(g = st(), D = dzOf(g.d)) { const pos = g.dpos || {}, used = new Set(sfList(g, D).map(z => z[1] + ',' + z[2])), out = [];
  (g.dp || []).filter(Boolean).forEach((k, i) => { let p = pos[k] && pos[k][2] === D.id && D.toV(pos[k][1]) != null && D.toVx(pos[k][0]) != null ? [D.toVx(pos[k][0]), D.toV(pos[k][1])] : null; if (p && !fitAt(D, k, p[0], p[1], used)) p = null;
    if (!p) p = D.deco.find(q => fitAt(D, k, q[0], q[1], used)) || anyFree(D, used, k); if (!p) return; dCells(k, p[0], p[1]).forEach(c => used.add(c[0] + ',' + c[1])); out.push([k, p[0], p[1]]); });
  return out; }
// 놓을 수 있는 칸: 맵 안쪽, 관장·문·안내원·길·트레이너 자리·관장 옆 포켓몬 자리가 아닌 곳
function freeTile(D, x, y, used) {
  if (x < 1 || y < 2 || x > D.w - 2 || y > D.h - 2 || used?.has(x + ',' + y)) return false;
  if (D.free && D.free[y]?.[x] !== '1') return false;
  const bad = [[D.leader[0], D.leader[1]], [D.leader[0] + 1, D.leader[1]], [D.leader[0] - 1, D.leader[1]], [D.leader[0], D.leader[1] - 1], [D.leader[0], D.leader[1] + 1], D.door, [D.door[0], D.door[1] - 1], D.guy, ...D.slots];
  if (bad.some(q => q[0] === x && q[1] === y)) return false;
  for (let i = 1; i < D.path.length; i++) { const [a, b] = [D.path[i - 1], D.path[i]]; if (Math.min(a[0], b[0]) <= x && x <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= y && y <= Math.max(a[1], b[1])) return false; }
  return true;
}
// 꾸미기 모드 (경완 2026-10-28 '필드 맵 편집이랑 비슷하게'): 왼쪽 위 제목 카드 + 아래 창고 창(창고 · 취소/저장).
// 놓인 꾸미기를 누르면 고르기(초록 점선 칸 + 빨간 ✕ = 창고로), 끌면 격자 따라 옮기기. 창고 꾸미기는 끌어다 놓거나 골라서 빈 칸을 누르기. 취소 = 들어오기 전으로
let ded = null;
const XSVG = '<svg viewBox="0 0 7 7" width="14" height="14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 0h2v1h1v1h1V1h1V0h2v2H6v1H5v1h1v1h1v2H5V6H4V5H3v1H2v1H0V5h1V4h1V3H1V2H0z"/></svg>';
function decoEdit() {
  const g = st(), D = dzOf(g.d); g.own = g.own || {}; g.dp = (g.dp || []).filter(Boolean); g.dpos = g.dpos || {};
  openTab(null); root.querySelectorAll('.gy-pop.gy-note').forEach(x => x.remove()); root.classList.remove('gview');
  root.classList.add('ded', 'dedc'); ded = { sel: null, pick: null, snap: JSON.stringify([g.dp, g.dpos]) };
  const map = $g('.gy-map'), bar = $g('.gy-dbar'), list = bar.querySelector('.db-list'), tit = $g('.gy-dtit span'), stage = $g('.gy-stage');
  let grid = map.querySelector('.gy-grid'); if (!grid) { grid = document.createElement('div'); grid.className = 'gy-grid'; map.appendChild(grid); }
  const T = () => 16 * sc;
  const warn = t => { clearTimeout(warn.t); tit.textContent = t; tit.classList.add('warn'); warn.t = setTimeout(() => { tit.textContent = '꾸미기를 눌러서 옮겨요'; tit.classList.remove('warn'); }, 2400); };
  const hitAt = (L, x, y) => L.find(z => dCells(...z).some(c => c[0] === x && c[1] === y));
  const okAt = (k, x, y) => fitAt(D, k, x, y, decoUsed(decoList(g, D), k));
  // 손가락 위치 → 꾸미기의 왼쪽 아래 칸 (큰 인형은 손가락이 가운데). off = 집어 든 자리와의 차이
  const anchor = (k, cx, cy, off = [0, 0]) => { const r = map.getBoundingClientRect(), [w, h] = dSz(k); return [Math.round((cx - r.left) / T() - w / 2 - off[0]), Math.round((cy - r.top) / T() + h / 2 - off[1]) - 1]; };
  const draw = () => {
    renderHome(true); const L = decoList(g, D), on = new Set(L.map(z => z[0])); if (ded.sel && !on.has(ded.sel)) ded.sel = null;
    ents.forEach(e => { if (e.prop && e.k) e.el.classList.toggle('dsel', e.k === ded.sel); }); root.classList.toggle('dhas', !!ded.sel);
    grid.style.setProperty('--t', T() + 'px');
    const z = ded.sel && L.find(q => q[0] === ded.sel), [w, h] = z ? dSz(z[0]) : [1, 1];
    grid.innerHTML = z ? `<i class="gg-foot" style="left:${z[1] * T()}px;top:${(z[2] - h + 1) * T()}px;width:${w * T()}px;height:${h * T()}px"></i><button class="gg-x" type="button" aria-label="창고에 넣기" style="left:${(z[1] + w) * T() + 12 > stage.scrollLeft + stage.clientWidth - map.offsetLeft ? z[1] * T() : (z[1] + w) * T()}px;top:${Math.max(z[2] - h + 1, .4) * T()}px">${XSVG}</button>` : '';
    const bag = Object.keys(g.own).filter(k => g.own[k] && DECO[k] && !on.has(k)); if (ded.pick && !bag.includes(ded.pick)) ded.pick = null;
    list.innerHTML = bag.length ? bag.map(k => `<button class="db-it" type="button" data-k="${k}" aria-pressed="${ded.pick === k}"><img alt="" src="${IMG}deco/t/${k}.png"><span>${DECO[k].n}</span></button>`).join('')
      : '<p class="db-none">창고에 놓을 꾸미기가 없어요.<br>체육관의 꾸미기를 빼면 여기로 들어와요.</p>';
  };
  const put = (k, x, y) => { if (!okAt(k, x, y)) { sfx('no'); warn('여기엔 놓을 수 없어요'); return draw(); }
    if (!g.dp.includes(k)) g.dp.push(k); g.dpos[k] = [D.toFx(x), D.toF(y), D.id]; ded.sel = k; ded.pick = null; sfx('tap'); draw(); };
  const end = keep => { if (!ded) return; if (!keep) { const [dp, dpos] = JSON.parse(ded.snap); g.dp = dp; g.dpos = dpos; } save(); decoDone(); };
  ded.draw = draw; ded.end = () => end(true);
  // 끌기: 놓인 꾸미기나 창고 꾸미기를 끌면 칸에 맞춰 따라오고, 놓으면 그 칸에. 빈 곳을 끌면 맵 넘기기
  let drag = null, noClick = 0;
  const ghost = (k, x, y) => { let gh = grid.querySelector('.gg-gh'), tl = grid.querySelector('.gg-tile'); const [w, h] = dSz(k), ok = okAt(k, x, y);
    if (!gh) { gh = document.createElement('i'); gh.className = 'gg-gh'; tl = document.createElement('i'); tl.className = 'gg-tile'; grid.append(tl, gh); }
    const box = `left:${x * T()}px;top:${(y - h + 1) * T()}px;width:${w * T()}px;height:${h * T()}px`;
    gh.style.cssText = `background-image:url(${IMG}deco/t/${k}.png);${box}`; tl.style.cssText = box; tl.classList.toggle('bad', !ok); return ok; };
  const dim = (k, on) => ents.forEach(e => { if (e.prop && e.k === k) e.el.style.opacity = on ? .3 : ''; });
  const move = e => { if (!drag || e.pointerId !== drag.pid) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on) { if (Math.hypot(dx, dy) < 8) return; if (drag.pal && Math.abs(dx) > Math.abs(dy)) { drag = null; return; } drag.on = true; if (drag.k) { dim(drag.k, true); grid.classList.add('drag'); } }
    if (!drag.k) { stage.scrollLeft = drag.sl - dx; stage.scrollTop = drag.st - dy; return; }
    e.preventDefault(); drag.t = anchor(drag.k, e.clientX, e.clientY, drag.off); drag.ok = ghost(drag.k, ...drag.t);
    const r = stage.getBoundingClientRect(); if (e.clientY < r.top + 48) stage.scrollTop -= 10; else if (e.clientY > r.bottom - 48 && e.clientY < r.bottom) stage.scrollTop += 10; };
  const up = e => { if (!drag || e.pointerId !== drag.pid) return; const d = drag; drag = null; removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    grid.classList.remove('drag'); grid.querySelectorAll('.gg-gh,.gg-tile').forEach(x => x.remove()); if (d.k) dim(d.k, false);
    if (!d.on || e.type === 'pointercancel' || !ded) return; noClick = Date.now(); if (!d.k) return;
    if (!d.t) return draw(); put(d.k, ...d.t); };
  const begin = (k, e, pal, off) => { if (!ded || e.button) return; drag = { k, pal, off, pid: e.pointerId, x0: e.clientX, y0: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up); };
  const tile = e => { const r = map.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / T()), Math.floor((e.clientY - r.top) / T())]; };
  map.onpointerdown = e => { if (!ded || e.target.closest('.gg-x')) return; const hit = hitAt(decoList(g, D), ...tile(e));
    if (!hit) return begin(null, e); const r = map.getBoundingClientRect(), [w, h] = dSz(hit[0]);
    begin(hit[0], e, false, [(e.clientX - r.left) / T() - (hit[1] + w / 2), (e.clientY - r.top) / T() - (hit[2] + 1 - h / 2)]); };
  // 그냥 누르기: ✕ = 창고로, 놓인 꾸미기 = 고르기, 빈 칸 = 창고에서 고른 꾸미기를 거기에, 아니면 고르기 풀기
  map.onclick = e => { if (!ded || Date.now() - noClick < 400) return;
    if (e.target.closest('.gg-x')) { sfx('tap'); g.dp = g.dp.filter(k => k !== ded.sel); delete g.dpos[ded.sel]; ded.sel = null; return draw(); }
    const hit = hitAt(decoList(g, D), ...tile(e)); if (hit) { sfx('tap'); ded.sel = ded.sel === hit[0] ? null : hit[0]; ded.pick = null; return draw(); }
    if (ded.pick) return put(ded.pick, ...anchor(ded.pick, e.clientX, e.clientY));
    if (ded.sel) { ded.sel = null; draw(); } };
  bar.onpointerdown = e => { const b = e.target.closest('.db-it'); if (b) begin(b.dataset.k, e, true); };
  bar.onclick = e => { const b = e.target.closest('button'); if (!b || !ded) return; e.stopPropagation(); if (b.dataset.k && Date.now() - noClick < 400) return; sfx('tap');
    if (b.dataset.k) { ded.pick = ded.pick === b.dataset.k ? null : b.dataset.k; ded.sel = null; if (ded.pick) warn('놓을 칸을 누르세요'); return draw(); }
    if (b.dataset.a) end(b.dataset.a === 'save'); };
  draw();
}
function decoDone() { if (!ded) return; ded = null; root.classList.remove('ded', 'dedc', 'dhas'); $g('.gy-map .gy-grid')?.remove(); $g('.gy-map').onclick = null; $g('.gy-map').onpointerdown = null; $g('.gy-dbar').onclick = null; $g('.gy-dbar').onpointerdown = null; renderHome(); }
// 고용 트레이너 자리 (경완 2026-10-27 '훈련장 배치랑 체육관 배치 둘 다', '체육관 배치 위치는 내가 고를 수 있게'):
// s.gym 체육관에 서 있음(도전자 상대), s.yard 훈련장 코치. 둘 다 켤 수 있다. s.gp [x, y, 맵] 직접 고른 칸 (없으면 맵의 기본 자리)
const inGym = s => s.gym ?? (s.yard ? 0 : 1);
function trTile(D, x, y, used) {
  if (x < 1 || y < 2 || x > D.w - 2 || y > D.h - 2 || used?.has(x + ',' + y)) return false;
  if (D.free && D.free[y]?.[x] !== '1' && !D.slots.some(q => q[0] === x && q[1] === y)) return false;
  if (D.inY != null && D.toF(y) > D.inY) return false;   // 입구 기둥보다 안쪽만 (경완 2026-10-27)
  const bad = [[D.leader[0], D.leader[1]], [D.leader[0] + 1, D.leader[1]], [D.leader[0] - 1, D.leader[1]], [D.leader[0], D.leader[1] - 1], [D.leader[0], D.leader[1] + 1], D.door, [D.door[0], D.door[1] - 1], D.guy];
  if (bad.some(q => q[0] === x && q[1] === y)) return false;
  for (let i = 1; i < D.path.length; i++) { const [a, b] = [D.path[i - 1], D.path[i]]; if (Math.min(a[0], b[0]) <= x && x <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= y && y <= Math.max(a[1], b[1])) return false; }
  return true;
}
// 길(도전자가 걷는 줄)에서 가장 가까운 칸 쪽을 본다
function faceTo(D, x, y) { let best = null, bd = 1e9;
  for (let i = 1; i < D.path.length; i++) { const [a, b] = [D.path[i - 1], D.path[i]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let k = 0; k <= n; k++) { const px = a[0] + Math.round((b[0] - a[0]) * k / n), py = a[1] + Math.round((b[1] - a[1]) * k / n), d = Math.abs(px - x) + Math.abs(py - y); if (d < bd) { bd = d; best = [px - x, py - y]; } } }
  if (!best) return 'd'; return Math.abs(best[0]) >= Math.abs(best[1]) ? (best[0] > 0 ? 'r' : 'l') : best[1] > 0 ? 'd' : 'u'; }
// 체육관에 선 트레이너와 자리 [[s, x, y, 방향]]: 직접 고른 칸 먼저, 나머지는 기본 자리 순서대로
function sfList(g = st(), D = dzOf(g.d)) {
  const L = g.sf.filter(inGym), used = new Set(), out = new Map();
  for (const s of L) { const p = s.gp && s.gp[2] === D.id && D.toV(s.gp[1]) != null && D.toVx(s.gp[0]) != null ? [D.toVx(s.gp[0]), D.toV(s.gp[1])] : null; if (p && trTile(D, p[0], p[1], used)) { used.add(p[0] + ',' + p[1]); out.set(s, [s, p[0], p[1], faceTo(D, p[0], p[1])]); } }
  for (const s of L) { if (out.has(s)) continue; const q = D.slots.find(q => trTile(D, q[0], q[1], used)); if (!q) continue; used.add(q[0] + ',' + q[1]); out.set(s, [s, q[0], q[1], q[2]]); }
  return L.filter(s => out.has(s)).map(s => out.get(s));
}
// 트레이너 자리 고르기 모드: 맵의 칸을 누르면 그 트레이너가 거기 선다 (꾸미기 놓기와 같은 방식)
function sfPlace(s, back) {
  const g = st(), D = dzOf(g.d);
  openTab(null); root.classList.add('ded'); ded = { sel: null };
  const map = $g('.gy-map'); let grid = map.querySelector('.gy-grid'); if (!grid) { grid = document.createElement('div'); grid.className = 'gy-grid'; map.appendChild(grid); }
  const draw = () => {
    renderHome(true); const me = sfList(g, D).find(z => z[0] === s);
    grid.style.setProperty('--t', 16 * sc + 'px'); grid.innerHTML = me ? `<i class="gg-sel" style="left:${me[1] * 16 * sc}px;top:${me[2] * 16 * sc}px;width:${16 * sc}px;height:${16 * sc}px"></i>` : '';
    $g('.gy-dlg').innerHTML = `<span class="gy-who">${sfName(s)} 자리 정하기</span><span class="gy-dsub">맵에서 설 칸을 누르세요. 길 옆에 서면 지나가는 도전자를 막아요.</span>
      <div class="gy-dyn">${inGym(s) ? '<button class="gy-dbtn2" type="button" data-a="rm">체육관에서 빼기</button>' : ''}<button class="gy-dbtn2 main" type="button" data-a="ok">완료</button></div>`;
  };
  ded.draw = draw;
  const done = (quiet) => { ded = null; root.classList.remove('ded'); $g('.gy-map .gy-grid')?.remove(); map.onclick = null; $g('.gy-dlg').onclick = null; renderHome(); if (!quiet) back?.(); };
  ded.end = () => done(true);
  $g('.gy-dlg').onclick = e => { const b = e.target.closest('button'); if (!b || !ded) return; e.stopPropagation(); sfx('tap');
    if (b.dataset.a === 'rm') { s.gym = 0; delete s.gp; glog('sf', `${sfName(s)}${jong(s.nm) ? '을' : '를'} 체육관 자리에서 뺐다.`); save(); return done(); }
    if (b.dataset.a === 'ok') return done(); };
  map.onclick = e => { if (!ded) return; const r = map.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / (16 * sc)), y = Math.floor((e.clientY - r.top) / (16 * sc));
    const used = new Set([...sfList(g, D).filter(z => z[0] !== s).map(z => z[1] + ',' + z[2]), ...decoUsed(decoList(g, D))]);
    if (!trTile(D, x, y, used)) { sfx('no'); return; }
    const was = inGym(s); s.gym = 1; s.gp = [D.toFx(x), D.toF(y), D.id]; if (!was) glog('sf', `${sfName(s)}${jong(s.nm) ? '을' : '를'} 체육관에 배치했다.`); sfx('tap'); save(); draw(); };
  draw();
}

// ---------- 운영: 도전자 방문·고용 트레이너·평판·일지·주간 보고 (3·6·7단계) ----------
// 저장(S.gym): day 시간표를 만든 날, sch 오늘 남은 방문 시각, q 관장을 기다리는 도전자, at 필드 체육관 버튼 빨간 점이 뜰 시각,
//   log 일지 [[시각, 종류, 글]], w/l 내 전적, blk 막은 도전자, bk {타입: 막은 수}, bdg {타입: 배지 받은 시각}, nt {이름 있는 트레이너: {s 단계, n 다시 올 수 있는 시각}},
//   wk 이번 주 기록, rpt 지난주 보고서, sf 고용 트레이너, cand 면접 지원자, candN 다음 지원자 시각
const H = 3600e3, DAY = 24 * H;
const rnd = (a, b) => a + Math.random() * (b - a), rndI = (a, b) => Math.floor(rnd(a, b + 1)), pick = L => L[Math.floor(Math.random() * L.length)];
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const nextDay = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() + 1); return d.getTime(); };
const weekStart = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const seeded = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; };
const jong = w => { const c = String(w || '').trim().slice(-1); const k = c.charCodeAt(0); if (k >= 0xac00 && k <= 0xd7a3) return (k - 0xac00) % 28; if (/[013678]/.test(c)) return 1; if (/[a-zA-Z]/.test(c)) return /[lmnr]/i.test(c) ? 1 : 0; return 0; };
const J = (w, a, b) => w + (jong(w) ? a : b), iga = w => J(w, '이', '가'), eul = w => J(w, '을', '를'), eun = w => J(w, '은', '는');
const hhmm = t => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const GB = () => window.GymBattle;

// 도전자 종류: 걸음 그림, 성별, 잘 쓰는 타입, e = 쉬움(1)/보통 (경완 기획 밸런스 표)
const CLS = {
  youngster: { ow: 'youngster', f: 0, t: [1, 7, 4, 5], e: 1 }, lass: { ow: 'lass', f: 1, t: [1, 18, 12], e: 1 }, bug_catcher: { ow: 'bug_catcher', f: 0, t: [7], e: 1 },
  camper: { ow: 'camper', f: 0, t: [5, 6, 10, 1], e: 1 }, picnicker: { ow: 'picnicker', f: 1, t: [12, 1, 18], e: 1 }, fisherman: { ow: 'fisher', f: 0, t: [11], e: 1 },
  swimmer_f: { ow: 'swimmer_f_land', f: 1, t: [11, 15], e: 1 }, bird_keeper: { ow: 'bird_keeper', f: 0, t: [3], e: 1 },
  hiker: { ow: 'hiker', f: 0, t: [6, 5, 2] }, super_nerd: { ow: 'scientist', f: 0, t: [13, 4, 10, 9] }, psychic_m: { ow: 'man', f: 0, t: [14] }, black_belt: { ow: 'black_belt', f: 0, t: [2] },
  cool_trainer_m: { ow: 'cooltrainer_m', f: 0, t: [] }, cool_trainer_f: { ow: 'cooltrainer_f', f: 1, t: [] }, beauty: { ow: 'beauty', f: 1, t: [12, 18, 11, 1] },
  gentleman: { ow: 'gentleman', f: 0, t: [1, 10, 17] }, rocker: { ow: 'rocker', f: 0, t: [13, 4] }, sailor: { ow: 'sailor', f: 0, t: [11, 2] }, channeler: { ow: 'channeler', f: 1, t: [8] },
  pokemaniac: { ow: 'poke_maniac', f: 0, t: [16, 5, 6] },
  // 4세대에서 새로 온 트레이너
  poke_kid: { ow: 'poke_kid', f: 1, t: [1, 13, 18], e: 1 }, jogger: { ow: 'jogger', f: 0, t: [1, 2, 3], e: 1 }, cyclist_m: { ow: 'cyclist_m', f: 0, t: [13, 3, 1], e: 1 },
  battle_girl: { ow: 'battle_girl', f: 1, t: [2] }, ninja_boy: { ow: 'ninja_boy', f: 0, t: [4, 7, 17] }, ruin_maniac: { ow: 'ruin_maniac', f: 0, t: [5, 6, 9] },
  dragon_tamer: { ow: 'dragon_tamer', f: 0, t: [16] }, skier_f: { ow: 'skier_f', f: 1, t: [15] }, artist: { ow: 'artist', f: 0, t: [18, 14, 1] },
};
const N3 = new Set(['agatha', 'blaine', 'brock', 'bruno', 'erika', 'koga', 'lance', 'lt_surge', 'misty', 'sabrina']);   // 걸음 프레임이 없는 그림(3칸)
const CHAL_LINES = [
  ['관장님! 저랑 배틀해 주세요!', '오늘은 꼭 배지를 받아 갈 거예요!', '제 포켓몬도 많이 컸어요. 봐 주세요!', '떨리지만… 승부예요!'],
  ['소문 듣고 왔어요. 실력 좀 보여 주시죠.', '이 체육관을 넘어서 더 위로 갈 겁니다!', '준비는 끝났어요. 진지하게 부탁드려요.', '제 전략을 막을 수 있을까요?'],
];
const WIN_LINES = ['으으… 졌다! 더 연습하고 올게요!', '역시 관장님은 강하네요.', '다음엔 꼭 이길 거예요!', '좋은 배틀이었어요. 고맙습니다!'];
const LOSE_LINES = ['해냈다! 제가 이겼어요!', '관장님한테 이기다니… 꿈 같아요!', '좋은 승부였어요, 관장님!'];
const REW0 = [{ g: 40, r: 1, rl: -1, fr: 1 }, { g: 100, r: 1, rl: -1, fr: 2 }, { g: 300, r: 2, rl: -1, fr: 4 }];   // 평판은 막은 도전자 1명 ≈ 1 (경완 2026-10-29)
const GYMB = () => GA.GYMB || { GYM_G: REW0.map(o => o.g), GYM_SF_PCT: 60, WAGE_BASE: 150, WAGE_LV: 5, WAGE_MAX: 600 };   // 골드·월급 값은 작업실 밸런스 (게임 10.78)
const REW = d => ({ ...REW0[d], g: GYMB().GYM_G[d] ?? REW0[d].g });
// 연승 보너스 (경완 2026-10-29 '연승하면 평판 더 오르게'): 막을 때마다 g.stk +1, 내가 지면 0. 3연승부터 +1, 6연승 +2, 10연승 +3
const stkBonus = n => n >= 10 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0;
const rewOf = c => { const R = REW(c.diff); return c.boss ? { ...R, g: R.g * (1 + c.boss), r: R.r * 2 } : R; };
const DIFF_KO = ['쉬움', '보통', '어려움'];
// 체육관 등급 배지 (경완 2026-10-29 '배지 개념을 체육관 등급이랑 통합'): 다음 등급 문턱 바로 앞에서 '승급 심사' 보스를 이겨야 올라간다.
// g.gmax = 심사를 통과한 가장 높은 등급 (그 아래로 떨어졌다 다시 오를 땐 심사 없음), g.bdl[타입] = 그 타입으로 올라 본 가장 높은 등급 + 1 (= 배지 그림 번호, 0 = 아직)
const BD_MID = [35, 70, 135, 170, 235, 270, 340, 380, 420, 460];   // 평판이 이 자리를 지날 때마다 이름 있는 트레이너가 한 번 온다
const bdLv = (g, t) => (g.bdl || {})[t] | 0;
const bdImg = (t, L) => `${IMG}badge/${Math.max(1, L)}/${t}.png?v=11`;
// 배지 그림 + 빛 지나가기(모든 등급 같게) + 반짝이(동까지 0 · 은 1 · 금 2 · 프리즘 4, 경완 2026-10-29 '갈수록 반짝이는 느낌')
const BD_TW = [0, 0, 0, 0, 0, 1, 2, 4];
const bdHtml = (t, L, cls = '') => { const u = bdImg(t, L); return `<span class="bdw t${L}${cls ? ' ' + cls : ''}" style="--m:url('${u}')"><img alt="" src="${u}">${L ? '<i class="bd-sw"></i>' + '<i class="bd-tw"></i>'.repeat(BD_TW[L] || 0) : ''}</span>`; };
const gShort = i => GRADES[i][1].replace(/ 체육관$/, '');
const bdPh = rep => Math.min(1, (rep || 0) / REP_MAX);   // 평판이 오를수록 도전자가 어려워짐 (0~1)
const repCap = g => { const nx = GRADES[(g.gmax | 0) + 1]; return nx ? nx[0] - 1 : REP_MAX; };   // 승급 심사 전에는 문턱 바로 앞까지만
const RIVAL_GYMS = ['무쇠시티 체육관', '영원시티 체육관', '베일시티 체육관', '늪지시티 체육관', '연고시티 체육관', '운하시티 체육관', '선단시티 체육관', '물가시티 체육관'];
let NAMED = [];
const loadNamed = () => NAMED.length ? Promise.resolve() : fetch(`gymb/named.json?v=${VER}`).then(r => r.ok ? r.json() : []).then(j => { NAMED = j || []; }).catch(() => {});

function gInit() {
  const g = st(); if (!g) return null;
  for (const [k, v] of Object.entries({ sch: [], q: [], log: [], w: 0, l: 0, blk: 0, bk: {}, bdg: {}, nt: {}, sf: [], cid: 0, bdl: {}, ms: {}, bsN: {}, gmax: 0 })) if (g[k] == null) g[k] = v;
  for (const t of Object.keys(g.bdg)) if (!g.bdl[t]) g.bdl[t] = 1;   // 예전 배지(100명) = 동
  if (g.rv !== 3) {   // 10.90: 평판 문턱을 막은 도전자 수에 맞춰 줄이고(예전 등급 → 새 등급 0·1·3·4·5·6), 타입 배지(동~프리즘 1~4)를 등급 배지 번호(4~7)로
    const NEW = [0, 30, 100, 200, 300, 500], r = g.rep || 0, i = GRADES_OLD.findLastIndex(v => r >= v), lo = GRADES_OLD[i], hi = GRADES_OLD[i + 1];
    g.rep = hi ? Math.round(NEW[i] + (r - lo) / (hi - lo) * (NEW[i + 1] - NEW[i])) : REP_MAX;
    g.gmax = gradeOf(g.rep).i; for (const t of Object.keys(g.bdl)) if (g.bdl[t]) g.bdl[t] += 3;
    if (g.ty && g.gmax) { g.bdl[g.ty] = Math.max(bdLv(g, g.ty), g.gmax + 1); g.bdg[g.ty] = g.bdg[g.ty] || Date.now(); }
    g.q = g.q.filter(c => !c.boss); g.bsN = {}; g.ms = {}; g.rv = 3;
  }
  // 칸토 디자인에서 플라티나 체육관으로: 같은 분위기 맵으로 옮기고, 직접 놓은 장식 자리는 새로 잡는다
  if (g.d && !DESIGNS.some(d => d.id === g.d)) g.d = dzBase(g.d).id;   // 맵 묶음이 바뀌면 짝 맵으로 (자리는 맵 id 로 저장돼 있어 그대로 둔다)
  if (g.d && g.big == null) g.big = gradeOf(g.rep || 0).i;   // 지금 크기에서부터 직접 넓히기
  if (g.big != null && !g.bz) { if (g.big > 0) g.big++; g.bz = 1; }   // 6단계 → 7단계: 1단계 위는 한 칸씩 밀림 (보이는 크기는 그대로)
  if (!g.cands) g.cands = g.cand ? [g.cand] : []; delete g.cand;   // 지원서는 여러 장 (경완 2026-10-28 '카드 슬라이드해서 넘기는')
  return g;
}
const luOf = i => { const g = st(), L = (g.lu || [])[i] || []; return L.map(id => S.box.find(p => p.id === id)).filter(P => P && (SPECIES[P.sp]?.t || []).includes(g.ty)).slice(0, 6); };
const luNow = () => luOf(st().luI | 0);
// 배틀 시작 전에 라인업 고르기 (경완 2026-10-29): 라인업 1~3 중 하나, 빈 라인업은 못 고름, 처음엔 지금 라인업
function luPick() {
  const g = st(), L = [0, 1, 2].map(luOf); let sel = L[g.luI | 0]?.length ? g.luI | 0 : L.findIndex(l => l.length);
  return new Promise(ok => {
    const p = pop(`<h4>어떤 라인업으로 싸울까요?</h4><div class="lp-list">${L.map((l, i) => `<button type="button" class="lp-row" data-a="L${i}" ${l.length ? '' : 'disabled'}><b>라인업 ${i + 1}<small>${l.length}/6</small></b><span class="lp-th">${l.length ? l.map(P => `<img alt="" data-th="${P.id}">`).join('') : '<em>비어 있어요</em>'}</span></button>`).join('')}</div>
      <div class="gy-btns one"><button class="main" data-a="go">배틀 시작</button></div>`, (a, close) => {
      if (a[0] === 'L') { sel = +a.slice(1); draw(); return; }
      if (a === 'go') { close(); g.luI = sel; save(); ok(sel); } });
    const draw = () => p.querySelectorAll('.lp-row').forEach((b, i) => b.setAttribute('aria-pressed', i === sel));
    p.onclick = (f => e => { if (e.target === p) return; f(e); })(p.onclick);   // 바깥을 눌러도 안 닫힘
    GB().fillTh(p); draw(); });
}
function myAvg() { const g = st(), L = luNow().map(P => g.mon?.[P.id]?.lv).filter(Boolean); return L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length) : 10; }
// 레벨에 맞는 종 고르기: 종족값 합이 레벨에 어울리는 포켓몬 (전설·환상·아기 빼고), 타입 맞추기
let spCache = null;
const spOff = sp => !!GA.SP_OFF?.has(+sp);   // 작업실에서 끈 포켓몬은 도전자·지원자 팀에 안 나옴 (경완 2026-10-28)
function pickSp(types, lv) {
  if (!spCache) spCache = Object.entries(SPECIES).filter(([n, o]) => +n <= 1025 && !o.leg && !o.my && !o.baby && o.bs).map(([n, o]) => ({ n: +n, t: o.t || [], b: o.bs.reduce((a, c) => a + c, 0) }));
  const tgt = Math.min(530, 230 + lv * 6.5);
  for (const w of [55, 90, 140, 400]) { const L = spCache.filter(x => !spOff(x.n) && Math.abs(x.b - tgt) <= w && (!types.length || x.t.some(t => types.includes(t)))); if (L.length) return pick(L).n; }
  return 19;
}
function mkTeam(types, lvB, n) {
  const T = types.length ? types : [rndI(1, 18), rndI(1, 18)];
  return Array.from({ length: n }, (_, i) => { const lv = clampN(lvB + rndI(-2, 1) + (i === n - 1 ? 1 : 0), 2, 100); return [pickSp([pick(T)], lv), lv]; });
}
const teamLv = T => T.reduce((a, m) => a + m[1], 0) / T.length;
function mkChal(t) {
  const g = st(), G = gradeOf(g.rep || 0), avg = myAvg();
  const rep = g.rep || 0, L = clampN((g.gmax | 0) - 2, 0, 3), f = bdPh(rep), nx = GRADES[(g.gmax | 0) + 1];
  // 다음 등급 문턱 바로 앞(평판 49·99·199·299·499): 승급 심사 보스. 지면 몇 시간 뒤 다시 온다
  if (nx && rep >= nx[0] - 1 && !g.q.some(c => c.boss) && t >= (g.bsN.r || 0)) { const b = mkBoss((g.gmax | 0) + 1, t); if (b) return b; }
  // 중간 이름 있는 트레이너 (자리마다 한 번)
  const ms = g.ms.r || (g.ms.r = []), mid = BD_MID.find(a => rep >= a && a < (nx ? nx[0] : 1e9) && !ms.includes(a));
  if (mid != null && !g.q.some(c => c.named)) { const c = mkScripted(L, t, 0); if (c) { ms.push(mid); return c; } }
  const nm = pickNamed(avg, t); if (nm && Math.random() < .12) return nm;
  // 보통 도전자: 막은 수가 늘수록 어려운 도전자가 많고, 레벨·마리 수·개체값이 오른다
  const diff = Math.random() < [.75, .6, .5, .4, .3, .2, .15][G.i] * (1 - f * .8) ? 0 : 1;
  const k = pick(Object.keys(CLS).filter(x => !!CLS[x].e === !diff)), C = CLS[k];
  const n = diff ? rndI(2, clampN(luNow().length + 1 + (f > .4) + (f > .8), 2, 6)) : rndI(1, 2) + (f > .5);
  return { id: ++g.cid, t, k, cls: GB()?.TR_KO[k] || '트레이너', tr: k, ow: C.ow, nm: pick(C.f ? GB()?.NAMES_F || ['영희'] : GB()?.NAMES_M || ['철수']), diff, ivm: Math.round(f * 20), team: mkTeam(C.t, Math.max(3, avg + (diff ? -2 + Math.round(f * 5) : -8 + Math.round(f * 6))), n) };
}
// 이름 있는 트레이너 팀을 지금 내 라인업에 맞춰 (레벨 = 내 평균 + bonus). 가장 가까운 단계 팀을 골라 레벨만 옮긴다
function nmTeam(n, tgt) {
  const S0 = n.st.map(T => T.filter(m => !spOff(m[0]))).filter(T => T.length); if (!S0.length) return null;
  const T = S0.reduce((a, b) => Math.abs(teamLv(b) - tgt) < Math.abs(teamLv(a) - tgt) ? b : a), d = Math.round(tgt - teamLv(T));
  return T.map(m => [m[0], clampN(m[1] + d, 5, 100), m[2]]);
}
const NM_POOL = L => NAMED.filter(n => L < 2 ? /관장|라이벌/.test(n.cls) : L < 3 ? /관장|사천왕/.test(n.cls) : /사천왕/.test(n.cls));
function mkScripted(L, t, bonus, n0) {
  const g = st(), n = n0 || pick(NM_POOL(L).filter(x => !g.q.some(c => c.named === x.id))); if (!n) return null;
  const team = nmTeam(n, myAvg() + bonus + L + rndI(-1, 1)); if (!team) return null;
  return { id: ++g.cid, t, named: n.id, sc: 1, cls: n.cls, tr: n.tr, ow: n.ow, nm: n.nm, diff: 2, music: n.music, team };
}
// 승급 심사 보스 (gi = 올라갈 등급 1~6): 동네·떠오르는·이름난 = 관장, 인기 = 라이벌·관장, 명문 = 사천왕, 전설 = 챔피언. 내 평균 +2/+3/+4/+6/+8/+11, 개체값 최고
function mkBoss(gi, t) {
  const g = st(), r = seeded('bs' + g.ty + gi), q = [/관장/, /관장/, /관장/, /라이벌|관장/, /사천왕/, /챔피언/][gi - 1], P = q && NAMED.filter(n => q.test(n.cls));
  if (!P?.length) return null;
  const c = mkScripted(0, t, [2, 3, 4, 6, 8, 11][gi - 1], P[Math.floor(r() * P.length)]); if (c) { c.boss = gi; c.music = gi >= 5 ? 'champ' : c.music; }
  return c;
}
// 이름 있는 트레이너: 본가 팀 단계. 그 단계 평균 레벨이 내 라인업 평균 + 6 이하일 때부터 온다
function pickNamed(avg, t) {
  const g = st(), busy = new Set(g.q.filter(c => c.named).map(c => c.named));
  const ok = NAMED.filter(n => { const x = g.nt[n.id] || { s: 0, n: 0 }; if (busy.has(n.id) || x.s >= n.st.length || t < (x.n || 0) || !n.st[x.s].some(m => !spOff(m[0]))) return false; return avg >= teamLv(n.st[x.s]) - 6; });
  if (!ok.length) return null;
  const n = pick(ok), s = (g.nt[n.id] || {}).s || 0;
  return { id: ++g.cid, t, named: n.id, s, cls: n.cls, tr: n.tr, ow: n.ow, nm: n.nm, diff: 2, music: n.music, team: n.st[s].filter(m => !spOff(m[0])).map(m => [m[0], m[1], m[2]]) };
}
// 하루 시간표: 등급이 오를수록 많이 온다 (2~5명, 오전 8시 ~ 밤 10시 사이 아무 때나)
function mkSch(d0, from = 0) {
  const n = 3 + (Math.random() < .5);   // 하루 3~4명, 등급 상관없음 (경완 2026-10-28)
  return Array.from({ length: n }, () => d0 + rnd(8, 22) * H).filter(t => t > from).sort((a, b) => a - b);
}
function glog(k, html, t = Date.now()) { const g = st(); g.log.unshift([t, k, html]); if (g.log.length > 80) g.log.length = 80; }
function addRep(n) { const g = st(); const r0 = g.rep || 0; g.rep = clampN(r0 + n, 0, Math.max(r0, repCap(g))); if (g.wk) g.wk.r += g.rep - r0; }
function addG(n) { const v = GA.addGold(n) || 0; if (st().wk) st().wk.g += v; renderGoldG(); return v; }
// 막은 도전자 (내가 이기거나 트레이너가 막음). 승급 심사 보스를 이기면 등급이 오르고 그 등급 배지를 받는다
function blocked(c) {
  const g = st(), ty = g.ty; g.blk++; if (g.wk) g.wk.b++; g.bk[ty] = (g.bk[ty] || 0) + 1;
  if (!c?.boss) return;
  const gi = c.boss, r0 = g.rep || 0; g.gmax = Math.max(g.gmax | 0, gi); g.rep = Math.max(r0, GRADES[gi][0]); if (g.wk) g.wk.r += g.rep - r0;
  g.bdl[ty] = Math.max(bdLv(g, ty), gi + 1); g.bdg[ty] = g.bdg[ty] || Date.now(); g.newBdg = ty; g.newG = gi;
  glog('bdg', `승급 심사 통과! <b>${GRADES[gi][1]}</b> 배지를 받았다!`);
}
const sfName = s => `${s.cls} ${esc(s.nm)}`;
const TRAITS = {
  train: { n: '훈련광', d: '훈련장 포켓몬 경험치 +20%' }, star: { n: '인기인', d: '도전자를 막으면 평판 +50%' }, money: { n: '수완가', d: '도전자를 막으면 골드 +50%' },
  guts: { n: '근성', d: '배틀에 강하다' }, grow: { n: '성장형', d: '이길수록 포켓몬 레벨이 빨리 오른다' }, thrift: { n: '검소함', d: '월급이 적다' }, lazy: { n: '느긋함', d: '가끔 배틀을 쉬지만 월급이 아주 적다' },
};
// 고용 트레이너가 차례로 도전자와 싸운다 (자동, 레벨·마릿수로 승패 확률)
function staffFight(c) {
  const g = st(), lost = [];
  for (const s of g.sf) {
    if (s.rest || !inGym(s) || (s.trait === 'lazy' && Math.random() < .2)) continue;   // 체육관에 서 있는 트레이너만 도전자를 상대한다 (훈련장 코치를 겸해도 된다)
    const z = (teamLv(s.team) - teamLv(c.team)) / 3 + (s.team.length - c.team.length) * .35 + (s.trait === 'guts' ? .6 : 0) + .3;
    if (Math.random() < 1 / (1 + Math.exp(-z))) {
      s.w = (s.w || 0) + 1; s.xp = (s.xp || 0) + 1;
      if (s.xp >= (s.trait === 'grow' ? 2 : 3)) { s.xp = 0; s.team.forEach(m => { m[1] = Math.min(100, m[1] + 1); }); }
      return { s, lost };
    }
    s.l = (s.l || 0) + 1; lost.push(s);
  }
  return { s: null, lost };
}
function arrive(c) {
  const g = st(), cn = `${c.cls} <b>${esc(c.nm)}</b>`;
  let beat = 0;
  if (!c.named && g.sf.length) {
    const { s, lost } = staffFight(c); beat = lost.length;
    if (s) {
      const R = REW(c.diff), r0 = g.rep || 0;
      const gold = addG(Math.round(R.g * GYMB().GYM_SF_PCT / 100 * (s.trait === 'money' ? 1.5 : 1))); g.stk = (g.stk | 0) + 1; addRep(Math.max(1, Math.round(R.r * (s.trait === 'star' ? 1.5 : 1))) + stkBonus(g.stk)); const rep = (g.rep || 0) - r0;
      blocked(c);
      glog('sf', `${sfName(s)}${jong(s.nm) ? '이' : '가'} ${cn}${jong(c.nm) ? '을' : '를'} 막아 냈다! <small>+${gold}G · 평판 +${rep}</small>`, c.t); return;
    }
    if (lost.length) glog('in', `${cn}${jong(c.nm) ? '이' : '가'} 트레이너 ${lost.length}명을 이기고 올라왔다!`, c.t);
  }
  if (g.q.length >= 5) { glog('out', `${cn}${jong(c.nm) ? '은' : '는'} 기다리는 사람이 많아 그냥 돌아갔다.`, c.t); return; }
  g.q.push(c); if (!beat || c.named) glog('in', `${cn}${jong(c.nm) ? '이' : '가'} 도전하러 왔다!${c.boss ? ` <small>${GRADES[c.boss][1]} 승급 심사</small>` : c.named ? ' <small>이름 있는 트레이너</small>' : ''}`, c.t);
}
// 지난주 보고서 (월요일): 전적·막은 도전자·번 골드, 가상 체육관들과 점수 순위
function rollWeek(now) {
  const g = st(), k = weekStart(now);
  if (!g.wk) { g.wk = { k, w: 0, l: 0, b: 0, g: 0, r: 0 }; return; }
  if (g.wk.k === k) return;
  const o = g.wk, sc = o.w * 3 + o.b * 2 + Math.max(0, o.r), G = gradeOf(g.rep || 0), r = seeded('wk' + o.k), base = 6 + G.i * 14;
  const L = RIVAL_GYMS.map(n => ({ n, s: Math.round(base * (.3 + r() * 1.6)) })); L.push({ n: g.nm, s: sc, me: 1 }); L.sort((a, b) => b.s - a.s || (b.me ? 1 : -1));
  g.rpt = { ...o, sc, rank: L.findIndex(x => x.me) + 1, of: L.length, top: L.slice(0, 3).map(x => [x.n, x.s, x.me ? 1 : 0]), seen: 0 };
  glog('wk', `지난주 보고서: ${o.w}승 ${o.l}패 · 막은 도전자 ${o.b}명 · ${o.g.toLocaleString()}G · 랭킹 ${g.rpt.rank}위`, k);
  g.wk = { k, w: 0, l: 0, b: 0, g: 0, r: 0 };
}
// 월급 (7일마다). 골드가 모자라면 그 트레이너는 쉰다(배틀 안 함). 골드가 생기면 다음에 바로 낸다
function payDay(now) {
  const g = st();
  for (const s of g.sf) {
    let k = 0;
    while (now >= s.pay && k++ < 20) {
      if (S.gold >= s.wage) { S.gold -= s.wage; s.pay += 7 * DAY; if (s.rest) glog('sf', `${sfName(s)}에게 밀린 월급 ${s.wage}G를 줬다. 다시 체육관을 지킨다.`); else glog('pay', `${sfName(s)} 월급 ${s.wage}G`); s.rest = 0; }
      else { if (!s.rest) glog('sf', `골드가 모자라 ${sfName(s)}에게 월급(${s.wage}G)을 못 줬다. 월급을 줄 때까지 쉰다.`); s.rest = 1; break; }
    }
  }
  try { GA.renderGold(); } catch (e) {} renderGoldG();
}
// 면접 지원자 (하루~이틀에 한 명, 30시간 동안 기다린다)
function mkCand(now) {
  const k = pick(Object.keys(CLS)), C = CLS[k], avg = myAvg(), lv = Math.max(5, avg + rndI(-6, 3)), n = rndI(2, 4), trait = pick(Object.keys(TRAITS));
  const W = GYMB(), wage = Math.round(clampN((W.WAGE_BASE + lv * W.WAGE_LV + n * 35) * (trait === 'thrift' ? .7 : trait === 'lazy' ? .55 : trait === 'guts' ? 1.15 : 1), W.WAGE_BASE, Math.max(W.WAGE_BASE, W.WAGE_MAX)) / 10) * 10;
  return { id: ++st().cid, t: now, exp: now + 30 * H, k, cls: GB()?.TR_KO[k] || '트레이너', tr: k, ow: C.ow, nm: pick(C.f ? GB()?.NAMES_F || ['영희'] : GB()?.NAMES_M || ['철수']), f: C.f, trait, wage, team: mkTeam(C.t, lv, n) };
}
const staffMax = () => Math.min(5, gradeOf(st().rep || 0).s);   // 새내기 체육관은 고용 못 함 (경완 2026-10-27)
function tick(now = Date.now()) {
  const g = gInit(); if (!g || !g.d) return;
  [...(g.q || []), ...(g.cands || [])].forEach(c => { if (c.team?.some(m => spOff(m[0]))) c.team = c.team.map(m => spOff(m[0]) ? [pickSp(SPECIES[m[0]]?.t || [], m[1]), m[1]] : m); });   // 이미 와 있는 도전자·지원자도 끈 포켓몬은 바꿈
  rollWeek(now);
  const today = dayStart(now);
  if (!g.day) { g.day = today; g.sch = mkSch(today, now); g.sch.unshift(now + 90e3); }   // 처음: 1분 반 뒤 첫 도전자
  let guard = 0;
  while (g.day < today && guard++ < 14) {   // 지난 날: 남은 방문을 다 처리하고, 자정까지 안 받은 도전자는 돌아간다
    const end = nextDay(g.day);
    while (g.sch.length && g.sch[0] < end) arrive(mkChal(g.sch.shift()));
    for (const c of g.q) glog('out', `${c.cls} <b>${esc(c.nm)}</b>${jong(c.nm) ? '은' : '는'} 기다리다 돌아갔다.`, end - 1);   // 평판은 깎지 않는다 (경완 2026-10-28)
    g.q = []; g.day = end; g.sch = mkSch(end);
  }
  if (g.day < today) { g.day = today; g.sch = mkSch(today, now); }
  while (g.sch.length && g.sch[0] <= now) arrive(mkChal(g.sch.shift()));
  payDay(now);
  g.cands = g.cands.filter(c => { if (now <= c.exp) return true; glog('sf', `면접 지원자 ${c.cls} <b>${esc(c.nm)}</b>${jong(c.nm) ? '은' : '는'} 다른 체육관으로 갔다.`, c.exp); return false; });
  if (g.cands.length < 3 && now >= (g.candN || 0) && g.sf.length < 5) { g.cands.push(mkCand(now)); g.candSeen = 0; g.candN = now + rnd(14, 30) * H; }
  try { window.GymManage?.tickTrain(now); } catch (e) { console.error(e); }
  setAt(now); save();
}
// 필드 체육관 버튼의 빨간 점 (gym.js 없이도 훅이 S.gym.at 만 보고 띄운다)
function setAt(now = Date.now()) {
  const g = st(); let a = g.q.length ? g.q[0].t : (g.sch[0] || nextDay(now) + 9 * H);
  if (g.cands?.length && !g.candSeen) a = Math.min(a, Math.max(...g.cands.map(c => c.t)));
  a = Math.min(a, weekStart(now) + 7 * DAY + 7 * H);
  g.at = a;
}

// ---------- 도전 받기: 도전자가 문으로 들어와 관장 앞까지 걸어오고, 한마디 → 배틀 → 결과 ----------
let busy = false;
function talk(html, btn = '다음', sub = '') {
  return new Promise(ok => { $g('.gy-dlg').innerHTML = `${html}${sub ? `<span class="gy-dsub">${sub}</span>` : ''}<button class="gy-dbtn" type="button">${btn} ▶</button>`;
    $g('.gy-dbtn').onclick = e => { e.stopPropagation(); sfx('tap'); ok(); }; });
}
const doorSe = () => { try { window.GymBGM?.se('DP_DOOR', { gain: 2.4 }); } catch (e) {} };   // 도전자가 드나들 때 철컥 문 소리 (플래티넘 SEQ_SE_DP_DOOR, 경완 2026-10-28 '자동문 말고 철컥')
async function challenge() {
  const g = st(), c = g.q[0]; if (!c || busy) return;
  if (![0, 1, 2].some(i => luOf(i).length)) { say('라인업이 비어 있어요.', '배틀 메뉴에서 라인업을 먼저 짜 주세요'); openTab('battle'); return; }
  busy = true; openTab(null); root.classList.add('busy');
  try {
    await loadJs('gymb/battle.js', 'GymBattle'); await GB().loadData();
    // 문 소리 → 문 앞 카펫에 나타나 잠깐 섰다가 → 관장 앞까지 걸어온다 (경완 2026-10-28 '소리랑 타이밍 맞춰서, 카펫 위에 잠깐 멈췄다가')
    const D = dzOf(g.d), bm = c.music || (c.named && NAMED.find(n => n.id === c.named)?.music) || (c.named ? 'gymBattle' : 'train');
    try { window.GymBGM?.prep(bm); if (c.named) window.GymBGM?.play(bm === 'champ' ? 'eyeChamp' : 'eyeElite', { fade: .1 }); } catch (e) {}   // 이름 있는 트레이너는 들어올 때부터 등장 곡 (배틀 곡과 다름, 경완 2026-10-28)
    doorSe(); await wait(180);
    const e = ent({ ow: c.ow, x: D.door[0], y: D.door[1], f: 'u', n3: N3.has(c.ow) });
    dlg(`${esc(c.cls)} <b>${esc(c.nm)}</b>${jong(c.nm) ? '이' : '가'} 들어온다!`); await wait(650);
    await walk(e, D.path.slice(1)); e.f = 'u'; place(e);
    const N = c.named && NAMED.find(n => n.id === c.named), me = trName() || '관장';
    const line = N ? N.ln[0].replace('{me}', me) : pick(CHAL_LINES[c.diff] || CHAL_LINES[1]);
    if (c.boss) await talk(`<span class="gy-who">승급 심사</span><b>${GRADES[c.boss][1]}</b> 승급을 걸고<br>${esc(c.cls)} ${esc(c.nm)}${jong(c.nm) ? '이' : '가'} 심사하러 왔다!<br>이기면 등급이 오르고 배지를 받는다.`);   // 등급 문턱마다 (경완 2026-10-29)
    await talk(`<span class="gy-who">${esc(c.cls)} ${esc(c.nm)}</span>${esc(line)}`, '라인업 고르기');   // 난이도·마리 수는 안 보여 줌 (경완 2026-10-28)
    await luPick(); const my = luNow();
    const team = c.team.map(([sp, lv, mv]) => { const o = GB().foeEntry(sp, lv); if (mv && mv.length) o.mv = mv; if (c.boss) o.iv = o.iv.map(() => 31); else if (c.named) o.iv = o.iv.map(() => rndI(22, 31)); else if (c.ivm) o.iv = o.iv.map(v => Math.max(v, c.ivm)); return o; });
    // 배틀이 끝나면 배틀 화면에서 상대가 한마디 (경완 2026-10-28)
    const sayEnd = { win: N ? N.ln[1].replace('{me}', me) : pick(WIN_LINES), lose: N ? N.ln[2].replace('{me}', me) : pick(LOSE_LINES) };
    document.body.classList.add('gymBattle');
    let res;
    try { res = await GB().run({ my, foe: { tr: c.tr, cls: c.cls, nm: c.nm, team, say: sayEnd }, rew: { g: rewOf(c).g, r: rewOf(c).r + stkBonus((g.stk | 0) + 1), rl: Math.max(-(g.rep || 0), rewOf(c).rl) }, diff: c.diff, bg: pick(['in1', 'in2', 'in3']), music: bm, meBackUrl: await fitSrc('trb') }); }
    finally { document.body.classList.remove('gymBattle'); dlg(''); root.classList.add('dhide'); }   // 배틀 끝나고 돌아오면 아래 대화창은 숨김 (경완 2026-10-29)
    g.q.shift(); const R = rewOf(c), won = !!res?.won, now = Date.now();
    let gold = 0, rep = 0;
    const r0 = g.rep || 0;
    if (won) { g.stk = (g.stk | 0) + 1; gold = addG(R.g); addRep(R.r + stkBonus(g.stk)); g.w++; if (g.wk) g.wk.w++; blocked(c); res.used.forEach(id => GA.addFr(id, R.fr)); }
    else { g.stk = 0; if (c.boss) g.bsN.r = now + rnd(2, 4) * H; addRep(R.rl); g.l++; if (g.wk) g.wk.l++; }   // 승급 심사에서 지면 몇 시간 뒤 다시 온다
    rep = (g.rep || 0) - r0;
    if (N && !c.sc) { const x = g.nt[N.id] || { s: 0 }; g.nt[N.id] = won ? { s: x.s + 1, n: now + rnd(2, 3.5) * DAY } : { s: x.s, n: now + rnd(.8, 1.5) * DAY }; }
    glog(won ? 'win' : 'lose', `${esc(c.cls)} <b>${esc(c.nm)}</b>${won ? `에게 이겼다! <small>+${gold}G · 평판 +${rep}</small>` : `에게 졌다… <small>평판 ${rep}</small>`}`);
    setAt(); save(); renderTop();
    await resultPop(c, res, gold, rep, R);
    if (g.newBdg) await badgeGet(g.newBdg);
    // 배웅하기 창 없이, 알림을 다 닫으면 도전자가 걸어 나간다 (경완 2026-10-28)
    dlg(''); root.classList.add('dhide'); await walk(e, D.path.slice(0, -1).reverse()); await wait(250); doorSe(); await wait(120); e.el.remove(); ents = ents.filter(x => x !== e);
  } catch (err) { console.error(err); GA.toast?.('배틀을 시작하지 못했어요'); }
  finally { busy = false; root.classList.remove('busy'); if (open) renderHome(); }
}
// 배틀 결과: 골드·평판, 나간 포켓몬이 받은 경험치·레벨업·새 기술
function resultPop(c, res, gold, rep, R) {
  const won = !!res?.won, xr = res?.xr || {};
  const rows = (res?.used || []).map(id => { const P = S.box.find(p => p.id === id); if (!P) return ''; const x = xr[id], m = st().mon?.[id];
    return `<div class="rs-mon"><img alt="" data-th="${P.id}"><b>${esc(SPECIES[P.sp]?.n || '')}</b><span>Lv.${m?.lv || '?'}${x && x.lv > x.lv0 ? ` <em>▲${x.lv - x.lv0}</em>` : ''}</span><small>${x ? `경험치 +${x.n.toLocaleString()}` : '경험치 없음'}${won ? ` · 친밀도 +${R.fr}` : ''}</small>${x?.learned?.length ? `<small class="nw">새 기술: ${x.learned.map(([id]) => esc(GB().mvKo(id))).join(', ')}</small>` : ''}</div>`; }).join('');
  return new Promise(ok => { const p = pop(`<h4>${won ? '승리!' : res?.quit ? '기권했다' : '패배…'}</h4>
      <div class="rs-sum">${won ? `<span><i class="coin"></i> +${gold}G</span>` : ''}${won && stkBonus(st().stk | 0) ? `<span class="rs-stk">${st().stk}연승! 평판 +${stkBonus(st().stk)}</span>` : ''}</div>${repBox(rep)}
      <div class="rs-mons">${rows}</div><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => { close(); ok(); });
    GB()?.fillTh(p); repAnim(p, rep); });
}
// 평판 오르내림 연출 (경완 2026-10-28 '평판 오르고 떨어지는 거 연출'): 숫자 세기 + 막대 + 튀는 +N/-N, 등급이 바뀌면 배지 반짝
const repBox = rep => { const r1 = st().rep || 0, r0 = Math.max(0, r1 - rep), G = gradeOf(r0), pc = r => clampN((r - gradeOf(r).lo) / Math.max(1, gradeOf(r).hi - gradeOf(r).lo), 0, 1) * 100;
  return `<div class="rs-rep ${rep > 0 ? 'up' : rep < 0 ? 'dn' : ''}" data-r0="${r0}" data-r1="${r1}"><div class="rr-top"><span>평판</span><b class="rr-n">${r0}</b><em class="rr-d">${rep >= 0 ? '+' : ''}${rep}</em></div>
    <div class="rr-g"><span class="rr-bd">${gEmb(G.i)}</span><span class="rr-gn">${G.n}</span><i class="gy-bar"><i style="width:${pc(r0)}%"></i></i></div></div>`; };
async function repAnim(p, rep) {
  const el = p?.querySelector('.rs-rep'); if (!el || !rep) return;
  const r0 = +el.dataset.r0, r1 = +el.dataset.r1, n = el.querySelector('.rr-n'), bar = el.querySelector('.gy-bar>i'), g0 = gradeOf(r0).i;
  await wait(380); if (!el.isConnected) return;
  el.classList.add('go'); window.GymBGM?.se?.(rep > 0 ? 'DP_EXP' : 'DP_KOUKA_L');
  const t0 = performance.now(), T = clampN(Math.abs(r1 - r0) * 90, 500, 1100);
  await new Promise(done => { const f = now => { if (!el.isConnected) return done(); const k = Math.min(1, (now - t0) / T), r = Math.round(r0 + (r1 - r0) * (1 - (1 - k) ** 2)), G = gradeOf(r);
    n.textContent = r; bar.style.width = clampN((r - G.lo) / Math.max(1, G.hi - G.lo), 0, 1) * 100 + '%';
    if (G.i !== +el.dataset.gi) { el.dataset.gi = G.i; el.querySelector('.rr-bd').innerHTML = gEmb(G.i); el.querySelector('.rr-gn').textContent = G.n; }
    k < 1 ? requestAnimationFrame(f) : done(); }; el.dataset.gi = g0; requestAnimationFrame(f); });
  el.classList.add('end');
  if (gradeOf(r1).i !== g0 && el.isConnected) { el.classList.add(gradeOf(r1).i > g0 ? 'gup' : 'gdn'); window.GymBGM?.se?.(gradeOf(r1).i > g0 ? 'DP_PINPON' : 'DP_KOUKA_L'); }
}
function badgeGet(ty) {
  const g0 = st(), gN = g0.newG; g0.newBdg = 0; delete g0.newG; save();   // 방금 오른 등급 (없으면 지금 등급)
  return new Promise(ok => { sfx('tap'); const gi = gN ?? gradeOf(g0.rep || 0).i, L = gi + 1, nx = GRADES[gi + 1]; pop(`<h4>${GRADES[gi][1]} 배지를 받았다!</h4><div class="bd-get t${L}">${bdHtml(ty, L)}</div><p class="gy-msg" style="text-align:center">승급 심사를 통과해서 체육관 등급이<br><b>${GRADES[gi][1]}</b>으로 올랐어요.<br>배지는 홈 화면과 프로필에서 볼 수 있어요.${nx ? `<br><small>평판 ${nx[0]}을 채우면 ${nx[1]} 승급 심사가 열려요.</small>` : ''}</p><div class="gy-btns one"><button class="main" data-a="x">좋아!</button></div>`, (a, close) => { close(); ok(); }); });
}

// ---------- 홈 ----------
// 안내원: 먼저 물어보고, 들으면 체육관 전체 설명을 튜토리얼처럼 (경완 2026-10-27)
const GUY_OW = 'gym_guy';
const GUY_TOUR = () => [
  `어서 와요, 관장님!\n${st().nm}의 안내원이에요.\n체육관 일을 차근차근 알려 드릴게요.`,
  '도전자는 하루에 몇 번\n아무 때나 찾아와요.\n오면 필드의 체육관 버튼에\n빨간 점이 떠요.',
  '아래 상태창의 [도전 받기]를\n누르면 배틀이 시작돼요.\n도전자는 그날 밤 12시까지\n기다려 줘요.',
  `배틀에는 ${TYPE_KO[st().ty]} 타입 포켓몬만\n낼 수 있어요. [배틀] 메뉴에서\n라인업을 3개까지 짜 둘 수 있어요.`,
  '도전자를 이기면 골드와 평판을\n받아요. 평판이 쌓이면\n체육관 등급이 올라요.',
  '등급이 오르면 도전자가 더 자주\n오고, 트레이너를 더 고용하고,\n체육관을 넓힐 수 있어요.',
  '[트레이너] 메뉴의 지원서 탭에\n가끔 지원자가 와요. 지원서를 보고\n고용하면 도전자를 먼저 막아 줘요.',
  '고용 관리 탭에서 트레이너를\n훈련장 코치로 보낼 수도 있어요.\n코치는 훈련 경험치를 올려 줘요.',
  '[훈련장]에 포켓몬을 보내 두면\n앱을 꺼도 경험치가 쌓여요.\n하루 8시간까지 훈련해요.',
  '[상점]에서는 기술머신,\n꾸미기, 관장 의상을\n살 수 있어요. 평판이 오르면\n체육관이 저절로 넓어져요.',
  '이름판을 누르면 체육관 정보와\n등급 배지를 볼 수 있어요.',
  '평판이 다음 등급 문턱에 닿으면\n승급 심사가 와요. 이기면\n등급 배지를 받아요.\n그럼 힘내세요, 관장님!',
];
function guyAsk() {
  root.classList.remove('dhide');   // 홈은 대화창을 숨겨 두니 물음 띄울 때 보이게 (경완 2026-10-29 '안내원 눌러도 안 뜸')
  $g('.gy-dlg').innerHTML = `<span class="gy-who">안내원</span>관장님, 체육관 설명을 처음부터 들어 보실래요?<div class="gy-dyn"><button class="gy-dbtn2" type="button" data-a="n">괜찮아요</button><button class="gy-dbtn2 main" type="button" data-a="y">들을래요</button></div>`;
  $g('.gy-dyn').onclick = async e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); sfx('tap');
    off(); const guy = { lit: true, nm: '안내원', pic: owSrc(GUY_OW), ow: 1 };
    if (b.dataset.a === 'n') return homeSay();   // 괜찮아요 = 말 없이 창만 닫힘 (경완 2026-10-29)
    await kang(GUY_TOUR(), guy); homeSay(); };
  // 물음 밖(대화창·빈 곳)을 누르면 박사 창처럼 닫힌다 (경완 2026-10-27)
  const shut = e => { if (e.target.closest('.gy-dyn button, .gy-kang')) return; off(); if ($g('.gy-dyn')) { e.stopPropagation(); homeSay(); } };   // 빈 곳을 눌러도 이 창만 닫히고 화면 숨기기(gview)는 안 됨 (경완 2026-10-29)
  const off = () => root.removeEventListener('click', shut, true);
  setTimeout(() => root.addEventListener('click', shut, true));
}
function renderTop() {
  const g = st(), G = gradeOf(g.rep || 0);
  { const n = $g('.gy-nm'); n.innerHTML = `<span>${esc(g.nm)}</span>`; const t = n.firstChild; t.style.fontSize = ''; requestAnimationFrame(() => { let f = parseFloat(getComputedStyle(t).fontSize); while (t.scrollWidth > t.clientWidth + 1 && f > 11) t.style.fontSize = (--f) + 'px'; }); }   // 타입 아이콘 빼고 이름만, 예전에 길게 지은 이름은 글자를 줄여 맞춤 (경완 2026-10-29)
  $g('.gy-grade').textContent = G.n;
  { const b = $g('.gy-bd'), k = `${g.ty}.${G.i}`; if (b.dataset.k !== k) { b.dataset.k = k; b.innerHTML = gEmb(G.i); } }   // 등급 배지를 타이틀 박스 가운데에 (경완 2026-10-29)
  $g('.gy-bar>i').style.width = (G.hi > G.lo ? clampN(((g.rep || 0) - G.lo) / (G.hi - G.lo), 0, 1) : 1) * 100 + '%';
  $g('.gy-repn').textContent = `${g.rep || 0}${G.hi > G.lo && G.hi < REP_MAX + 1 ? `/${G.hi}` : ''}`; $g('.gy-grade').dataset.g = G.i; $g('.gy-plate').dataset.g = G.i; $g('.gy-plate').classList.toggle('canup', canBig(g));
  renderGoldG(); menuDot();
}
function menuDot() { const g = st(), b = $g('.gy-menu [data-t="staff"]'); if (!b) return; const on = !!(g?.cands?.length && !g.candSeen); let d = b.querySelector('.mdot'); if (on && !d) b.insertAdjacentHTML('beforeend', '<i class="mdot"></i>'); if (!on && d) d.remove(); }
function renderHome(quiet) {
  if (ded && !quiet) return ded.draw();
  const g = gInit(), D = dzOf(g.d);
  renderTop();
  clearEnts(); layout();
  // 꾸미기 → 고용 트레이너(자리마다 보는 방향) → 관장(나) → 안내원
  decoList(g, D).forEach(([k, x, y]) => prop(k, x, y));
  sfList(g, D).forEach(([s, x, y, f]) => { ent({ ow: s.ow, x, y, f, n3: N3.has(s.ow), onTap: () => { sfx('tap'); sfCard(s);  } }); });
  const meE = ent({ ow: myOw(), x: D.leader[0], y: D.leader[1], f: 'd', n3: N3.has(myOw()), onTap: () => { sfx('tap'); meCard();  } });
  if (g.fit) fitSrc('ow').then(u => { if (meE.el.isConnected) meE.el.style.backgroundImage = `url(${u})`; });
  palEnt(D);
  ent({ ow: GUY_OW, x: D.guy[0], y: D.guy[1], f: 'd', onTap: () => { sfx('tap'); guyAsk(); } });
  if (!quiet) homeSay();
}
// 관장 뒤 포켓몬 (경완 2026-10-27): 기본은 지금 라인업에서 레벨이 가장 높은 포켓몬, 눌러서 바꿀 수 있다 (g.pal)
// 경완 2026-10-27 '관장 옆 포켓몬은 라인업에서 고를 수 있게': 고른 포켓몬이 지금 라인업에 없으면 기본으로
const luAll = () => { const g = st(), ids = [...new Set((g.lu || []).flat())]; return ids.map(id => S.box.find(p => p.id === id)).filter(P => P && (SPECIES[P.sp]?.t || []).includes(g.ty)); };   // 관장 옆 포켓몬은 라인업 전체에서 (경완 2026-10-28)
function palPick() { const g = st(), L = luNow(), P = g.pal && luAll().find(p => p.id === g.pal); if (P) return P;
  return L.slice().sort((a, b) => GB().gm(b).lv - GB().gm(a).lv || GA.ivSum(b) - GA.ivSum(a))[0] || null; }
let palRaf = 0;
function palEnt(D) {
  cancelAnimationFrame(palRaf); const P = GB()?.gm && palPick(); if (!P) return;
  const e = { prop: 1, x: D.leader[0] + .85, y: D.leader[1] - .35, w: 16, h: 16, el: document.createElement('i'), pal: 1 }; e.el.className = 'gy-pal tap';
  e.el.innerHTML = '<i class="gp-sh"></i><i class="gp-sp"></i>'; e.el.onclick = ev => { ev.stopPropagation(); sfx('tap'); palChoose(); };
  $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); e.el.style.zIndex = Math.round(D.leader[1] * 10) + 8;   // 내 캐릭터보다 뒤
  GA.pmd(P.sp, P.sex).then(M => { if (!e.el.isConnected) return; const sp = e.el.querySelector('.gp-sp'), k = sc / 2;
    if (P.shiny) sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`;
    if (!M.P) { sp.classList.add('one'); sp.style.backgroundImage = `url("${M.img}")`; return; }
    const s = M.s * k, A = M.P.a, a = A.Idle || Object.values(A)[0], durs = a[6], tot = durs.reduce((x, d) => x + d, 0) / 60, lift = (GA.lift?.(P.sp) || 0) * k;
    Object.assign(sp.style, { backgroundImage: `url("${M.P.i}")`, backgroundSize: `${M.wh[0] * s}px ${M.wh[1] * s}px`, width: a[1] * s + 'px', height: a[2] * s + 'px', left: (8 * sc - a[4] * s) + 'px', top: (16 * sc - (a[5] + (M.P.fy || 0)) * s - lift) + 'px' });
    let f0 = -1; const t0 = performance.now(); const tick = now => { if (!e.el.isConnected) return; let t = ((now - t0) / 1000) % tot, f = durs.length - 1; for (let i = 0, c = 0; i < durs.length; i++) { c += durs[i] / 60; if (t < c) { f = i; break; } }
      if (f !== f0) { f0 = f; sp.style.backgroundPosition = `${-f * (a[1] + (M.P.G || 0)) * s}px ${-a[0] * s}px`; } sp.style.translate = lift > 2 * k ? `0 ${(Math.sin(now / 260) * 4 * k).toFixed(1)}px` : ''; palRaf = requestAnimationFrame(tick); };
    palRaf = requestAnimationFrame(tick); }).catch(() => {});
}
function palChoose() {
  const g = st(), cur = palPick(), L = luAll();
  if (!L.length) return say('라인업이 비어 있어요. 배틀 메뉴에서 라인업을 먼저 짜 주세요.');
  const p = pop(`<h4>관장 옆 포켓몬</h4><div class="lu-pick">${L.map(P => `<button data-a="${P.id}" class="${cur && cur.id === P.id ? 'on' : ''}">${GB().thumb(P)}<b>${esc(SPECIES[P.sp]?.n || "")}</b><span>Lv.${GB().gm(P).lv}</span></button>`).join('')}</div><div class="gy-btns"><button data-a="x">닫기</button></div>`,
    (a, close) => { close(); if (a === 'x') return; g.pal = +a || a; save(); renderHome(); });
  GB().fillTh?.(p);
}
// 아래 상태창: 기다리는 도전자가 있으면 '도전 받기', 없으면 다음 방문 예고
function homeSay() {
  const g = st(); if (busy) return;
  if (!ded) { root.classList.add('dhide'); $g('.gy-dlg').innerHTML = ''; }   // 꾸미기·자리 정하기 중엔 그대로 (20초마다 불려서 창이 비던 버그, 경완 2026-10-28)
  // 도전자 받기 (경완 2026-10-29): 기다리는 도전자가 없으면 비활성, 있으면 'N명의 도전자가 기다리고 있어요' + 새로 온 도전자가 있으면 빨간 점 (누르면 사라짐)
  const n = g.q.length, qb = $g('.gy-qbtn'), cap = $g('.gy-qcap'), dot = $g('.gy-qdot'), nw = g.q.some(c => c.id > (g.qSeen | 0));
  if (qb) { qb.disabled = !n; qb.classList.toggle('has', !!n); } if (cap) { cap.hidden = false; cap.classList.toggle('none', !n); cap.textContent = n ? `${n}명의 도전자가 기다리고 있어요` : '아직 도전자가 없어요'; }   // 없을 때도 안내 (경완 2026-10-29) if (dot) dot.hidden = !(n && nw);
  const pw = root.querySelector('.gy-qw'); if (pw) pw.redraw?.();
}
// 도전자 명단 (경완 2026-10-28 '화면 하단에 도전자 명단 아이콘, 누르면 새 화면에서'): 기다리는 도전자만 (체육관 일지는 없앰, 경완 2026-10-28)
function qPop() {
  root.querySelectorAll('.gy-infos').forEach(x => x.remove()); openTab(null);
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-qw'; root.appendChild(el);
  const draw = el.redraw = () => { const g = st(), Q = g.q;
    let body;
    body = Q.length ? `<div class="qw-list">${Q.map((c, i) => `<div class="qw-row"><span class="qw-pic${c.named ? ' qw-sil' : ''}"><img alt="" src="${trSrc(c.tr)}"></span><div class="qw-tx"><small>${c.boss ? `<em class="qw-bs">${gShort(c.boss)} 승급 심사</em>` : c.named ? '<em>이름 있는 트레이너</em>' : esc(c.cls)}</small><b>${c.named ? '???' : esc(c.nm)}</b><span>${hhmm(c.t)}에 왔어요</span></div><button class="gy-key main" type="button" data-c="${i}">도전 받기</button></div>`).join('')}</div>`
      : '<p class="qw-none">지금 기다리는 도전자가 없어요.</p>';
    el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">도전자 명단</b></div>
      <div class="gy-body">${body}</div>`; };
  draw();
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.a === 'x') return el.remove();
    if (b.dataset.c) { const g = st(), c = g.q[+b.dataset.c]; if (!c) return draw(); g.q.splice(+b.dataset.c, 1); g.q.unshift(c); el.remove(); challenge(); } };
}
function renderGoldG() { const e = root && $g('.gy-goldn'); if (e) e.textContent = /[?&]studio/.test(location.search) ? '∞' : S.gold.toLocaleString(); }   // 홈 화면 골드는 뺐다 (경완 2026-10-27). 상점 등에서 쓰면 그대로
function dlg(html, sub = '') { root.classList.remove('dhide'); $g('.gy-dlg').innerHTML = html + (sub ? `<span class="gy-dsub">${sub}</span>` : ''); }   // 아래 대화창 (도전자 입장 등 연출 중에만)
// 알림은 아래 상태창 대신 가운데 팝업 (경완 2026-10-28 '상태창 하단에 뜨는 것들 다 가운데 중앙 팝업창으로')
function say(html, sub = '') { if (!html) return dlg('', ''); root.querySelector('.gy-pop.gy-note')?.remove();
  const p = pop(`<p class="gy-msg gy-notem">${html}${sub ? `<small>${sub}</small>` : ''}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => close()); p?.classList?.add('gy-note'); }

// ---------- 메뉴 창 ----------
const SOON = {
  battle: { t: '배틀', ic: 'tr/red', d: '도전자와 본가처럼 턴제 배틀을 해요.', li: ['체육관 타입 포켓몬으로 6마리까지 라인업', '라인업 저장해 두고 골라 쓰기', '이기면 골드·친밀도·경험치'] },
  train: { t: '훈련장', ic: 'tr/black_belt', d: '포켓몬을 풀어 두면 천천히 경험치가 쌓여요.', li: ['지푸라기 타격대·샌드백을 치는 모션', '새 포켓몬은 날기 장치, 물 포켓몬은 물 위 장치', '가끔 특별한 기술을 배워요'] },
  staff: { t: '트레이너', ic: 'tr/cool_trainer_f', d: '체육관에 트레이너를 5명까지 고용해요.', li: ['가끔 오는 면접 제안', '트레이너마다 특성 (예: 훈련광)', '도전자를 먼저 상대해 주고, 월급은 7일마다'] },
  shop: { t: '체육관 상점', ic: 'tr/gentleman', d: '체육관 운영에 필요한 것을 사요.', li: ['기술머신으로 포켓몬에게 기술 가르치기', '체육관 꾸미기 아이템', '관장 의상'] },
};
function openTab(t) {
  // 꾸미기·자리 정하기 중에 다른 메뉴를 열면 그 모드를 끝낸다 (경완 2026-10-27 '꾸미기 하고 나서 맵에 그리드 안 사라지는 오류')
  if (t && ded) ded.end?.();
  tab = t; root.querySelectorAll('.gy-menu button[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
  const sh = $g('.gy-sheet'); sh.classList.remove('ty-on'); if (!t) { sh.hidden = true; return; }
  if (t === 'battle') { sh.hidden = false; sh.scrollTop = 0; sh.innerHTML = '<h3>배틀</h3><p class="gy-lead">불러오는 중…</p>'; loadJs('gymb/battle.js', 'GymBattle').then(() => { if (tab === 'battle' && window.GymBattle) GymBattle.tab(sh); }); return; }
  if (t === 'train' || t === 'staff' || t === 'shop') { sh.hidden = false; sh.scrollTop = 0; sh.innerHTML = `<h3>${SOON[t].t}</h3><p class="gy-lead">불러오는 중…</p>`;
    loadJs('gymb/battle.js', 'GymBattle').then(() => GB()?.loadData()).then(() => loadJs('gymb/manage.js', 'GymManage')).then(() => { if (tab === t && window.GymManage) GymManage.tab(t, sh); }); return; }
  const o = SOON[t];
  sh.innerHTML = `<h3>${o.t}</h3><p class="gy-lead">${o.d}</p><div class="gy-soon"><i class="gy-soon-ic" style="background-image:url(${IMG}${o.ic}.png)"></i><b>준비 중이에요</b><p>이 메뉴는 다음 단계에서 열려요.</p><ul>${o.li.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  sh.hidden = false; sh.scrollTop = 0;
}

// ---------- 팝업 ----------
function pop(html, onClick) {
  const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) { close(); return; } const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, close, p); } };
  const close = () => p.remove(); $g('.gy-main').appendChild(p); return p;
}
// 전신 카드 (경완 2026-10-27: 홈에서 나·트레이너를 누르면 전신 그림). src 그림, h 이름, sub 아랫줄, btn 단추 html
function bodyCard(src, h, sub = '', btn = '', onClick, more = '') {
  return pop(`<div class="gy-body"><div class="bd-pic"><img alt="" src="${src}" onload="this.style.width=this.naturalWidth*2+'px';this.style.height=this.naturalHeight*2+'px'"></div><h4>${h}</h4>${sub ? `<p>${sub}</p>` : ''}${more}</div>${btn || '<div class="gy-btns one"><button data-a="x">닫기</button></div>'}`, (a, close, p) => { if (a === 'x') close(); else onClick?.(a, close, p); });
}
// 타입별 등급 배지는 체육관 정보에서 빼고 내 프로필 카드에 (경완 2026-10-29 '배지랑 타입 이름 정도만')
async function meCard() { const g = st(), O = OUTFITS[g.fit];
  const bd = `<div class="gy-bdgs me-bdgs">${TYPE_KO.map((nm, t) => { if (!t) return ''; const L = bdLv(g, t); return `<div class="${L ? 'on' : ''}${g.ty === t ? ' cur' : ''}">${bdHtml(t, L)}<b>${nm}</b></div>`; }).join('')}</div>`;
  bodyCard(await fitSrc('tr'), `관장 ${esc(trName() || '나')}`, `${g.w}승 ${g.l}패 · 막은 도전자 ${g.blk}명${O ? `<br>입은 옷: ${O.n}` : ''}`, '', null, bd); }
function sfCard(s) { bodyCard(trSrc(s.tr), sfName(s), `${TRAITS[s.trait]?.n || ''} · ${s.w || 0}승 ${s.l || 0}패${s.rest ? '<br>월급을 못 받아서 쉬고 있어요' : ''}`); }
// 체육관 정보: 팝업이 아니라 자세한 새 화면 (경완 2026-10-27 '새로운 창으로 더 자세하게')
function infoPop() {
  root.querySelector('.gy-infos')?.remove();
  const g = st(), D = dzOf(g.d), G = gradeOf(g.rep || 0), d0 = new Date(g.t0 || Date.now()), days = Math.max(1, Math.floor((dayStart(Date.now()) - dayStart(g.t0 || Date.now())) / DAY) + 1);
  const wl = (g.w || 0) + (g.l || 0), wr = wl ? Math.round((g.w || 0) / wl * 100) : 0, w = g.wk || {}, nb = Object.keys(g.bdg || {}).length, bL = bdLv(g, g.ty), exam = nx0 => nx0 && (g.gmax | 0) <= G.i && (g.rep || 0) >= nx0[0] - 1;
  const pct = G.hi > G.lo ? Math.min(100, ((g.rep || 0) - G.lo) / (G.hi - G.lo) * 100) : 100, nx = GRADES[G.i + 1];
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos'; root.appendChild(el);
  el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">체육관 정보</b></div>
    <div class="gy-body">
      <div class="if-hero"><img alt="" data-ms="${g.d}"><div><span class="if-ty">${tyIcon(g.ty)}${TYPE_KO[g.ty]} 타입</span><h3>${esc(g.nm)} <button class="gy-chg gy-pen" type="button" data-a="nm" aria-label="이름 바꾸기"><svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M8 0h2v1H8zM7 1h1v1H7zM10 1h1v1h-1zM6 2h1v1H6zM11 2h1v1h-1zM5 3h1v1H5zM10 3h1v1h-1zM4 4h1v1H4zM9 4h1v1H9zM3 5h1v1H3zM8 5h1v1H8zM2 6h1v1H2zM7 6h1v1H7zM1 7h1v2H1zM6 7h1v1H6zM5 8h1v1H5zM0 9h1v3H0zM4 9h1v1H4zM1 11h3v1H1zM2 10h1v1H2z"/><path fill="#f0c040" d="M7 2h1v1H7zM6 3h2v1H6zM5 4h2v1H5zM4 5h2v1H4zM3 6h2v1H3zM2 7h2v1H2zM2 8h3v1H2zM1 9h3v1H1zM3 10h1v1H3z"/><path fill="#e86070" d="M8 1h2v1H8zM8 2h3v1H8zM8 3h2v1H8zM8 4h1v1H8z"/></svg></button></h3></div></div>
      <button class="if-grade" type="button" data-a="perk" data-g="${G.i}">${gEmb(G.i)}<div class="ig-tx"><div class="ig-top"><small>지금 등급</small><em>${nx ? `다음 ${nx[1]}` : '가장 높은 등급'} ›</em></div><b class="ig-gr" data-g="${G.i}">${G.n}</b><i class="gy-bar"><i style="width:${pct}%"></i></i><span class="ig-rep">평판 <b>${g.rep || 0}</b>${nx ? ` / ${nx[0]}` : ''}${exam(nx) ? ' <span class="if-sim">승급 심사 대기</span>' : ''}</span></div></button>
      <div class="if-two">
        <div class="if-staff"><small>고용할 수 있는 트레이너</small><b>${staffMax()}<em>명</em></b></div>
        <div class="if-big"><small>체육관 크기</small><b>${bigOf(g) + 1}<em>/ ${STAGES}단계</em></b>${canBig(g) ? '<button class="gy-key main" type="button" data-a="big">넓히기</button>' : ''}</div>
      </div>
      <button class="if-re" type="button" data-a="re">폐업하고 새로 세우기</button>
    </div>`;
  fillMs(el);
  el.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; sfx('tap'); const a = b.dataset.a;
    if (a === 'x') return el.remove(); if (a === 'perk') return perkPop(); if (a === 'big') return bigUp(el); if (a === 'bdg') return badgePop();
    if (a === 'nm') { el.remove(); return setup('nm'); }
    if (a === 're') return pop(`<h4>체육관 폐업</h4><p class="gy-msg" style="text-align:center">정말 폐업하시겠습니까?</p><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="ok">폐업하기</button></div>`,
      (k, close) => { close(); if (k === 'ok') { el.remove(); closeFx().then(() => { if (open) setup(['d', 'ty', 'nm'], true); }); } });
  };
}
// 체육관 등급 (경완 2026-10-28, 이름은 2026-10-29 '등급별 혜택 > 체육관 등급')
function perkPop() {
  const g = st(), gi = gradeOf(g.rep || 0).i;
  const row = ([v, n], i) => { const k = STAGE[i];
    const L = [`체육관 크기 ${i + 1}단계`, `트레이너 ${Math.min(5, k)}명 고용`, `훈련장 ${2 + Math.min(4, k)}칸`];   // 도전자 수·꾸미기·의상은 등급 차등 없음 (경완 2026-10-28)
    return `<li class="${i === gi ? 'cur' : i < gi ? 'done' : ''}">${i > gi ? `<span class="bdw sil"><img alt="" src="${bdImg(g.ty, i + 1)}"></span>` : gEmb(i)}<div><b>${n}</b><small>평판 ${v}</small>${i === gi ? '<em>지금</em>' : ''}</div><ul>${L.map(t => `<li>${t}</li>`).join('')}</ul></li>`; };
  pop(`<h4>체육관 등급</h4><ol class="gy-perk">${GRADES.map(row).join('')}</ol><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => close());
}
// 체육관 넓히기: 한 단계씩, 평판 등급까지 (공짜)
// 넓히기 (경완 2026-10-28 '팝업이 아니고 홈 화면에서 넓어지는 연출, 효과음·bgm 같이 > 그 다음 축하 메시지')
async function bigUp(el) {
  const g = st(); if (!canBig(g) || busy) return; const prev = bigOf(g), A = dzOf(g.d, prev);
  el?.remove(); root.querySelectorAll('.gy-infos,.gy-pop').forEach(x => x.remove()); openTab(null); root.classList.remove('gview');
  busy = true; root.classList.add('busy', 'dhide');
  const M = window.GymBGM, map = $g('.gy-map'), r0 = map.getBoundingClientRect();
  try {
    try { M?.sePrep?.(['ME_FANFA5', 'DP_KON']); M?.stop(.4); } catch (e) {}
    await wait(500);
    g.big = prev + 1; save(); glog('in', `체육관을 ${g.big + 1}단계로 넓혔다!`);
    try { M?.se('ME_FANFA5'); M?.se('DP_KON'); } catch (e) {}
    renderHome(true); const B = dzOf(g.d), r1 = map.getBoundingClientRect();
    const ox = (B.leader[0] + .5) * 16 * sc, oy = (B.leader[1] + .5) * 16 * sc;
    map.style.transformOrigin = `${ox}px ${oy}px`;
    const an = map.animate([{ transform: `scale(${r0.width / r1.width},${r0.height / r1.height})`, filter: 'brightness(1.7)' }, { transform: 'scale(1)', filter: 'brightness(1.15)', offset: .85 }, { transform: 'scale(1)', filter: 'none' }], { duration: 1800, easing: 'steps(9, end)' });
    $g('.gy-stage').animate([{ translate: '0 0' }, { translate: '0 -3px' }, { translate: '0 3px' }, { translate: '0 -2px' }, { translate: '0 0' }], { duration: 480, iterations: 3 });
    await an.finished.catch(() => {}); await wait(2500);
    try { M?.play('gym'); } catch (e) {}
    busy = false; root.classList.remove('busy'); renderHome(true);
    say('체육관이 넓어졌어요!', `+${B.w * B.h - A.w * A.h}칸 넓어졌어요 · 훈련장 칸도 늘었어요`);
  } finally { busy = false; root.classList.remove('busy'); }
}
// 창고 (경완 2026-10-28 '꾸미기 모드 가방처럼'): 상점에서 산 기술머신·꾸미기·관장 의상을 한곳에서 본다
let storeT = 'tm', stPow = 1;
function storePop() {
  root.querySelectorAll('.gy-infos').forEach(x => x.remove()); openTab(null);
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-storew'; root.appendChild(el);
  const draw = () => { const g = st(); g.tms = g.tms || {}; g.own = g.own || {}; g.fits = g.fits || {}; g.dp = (g.dp || []).filter(Boolean);
    const nTm = Object.values(g.tms).reduce((a, n) => a + (n || 0), 0), dk = Object.keys(g.own).filter(k => g.own[k] && DECO[k]), fk = Object.keys(g.fits).filter(k => g.fits[k] && OUTFITS[k]);
    const T = [['tm', '기술머신', nTm], ['deco', '꾸미기', dk.length], ['fit', '의상', fk.length + 1]];
    let body = '';
    if (storeT === 'tm') { const D = GB()?.D, L = Object.entries(g.tms).filter(([, n]) => n > 0).map(([id, n]) => [GB()?.mvOf?.(id), n, id]).filter(([x]) => x);
      L.sort((a, b) => (a[0][2] - b[0][2]) || ((b[0][4] || 0) - (a[0][4] || 0)) * stPow);   // 타입별로 묶고 그 안에서 위력순 (경완 2026-10-29)   // 위력순 (경완 2026-10-29), 안내 문구 없음
      body = !D ? '<p class="gy-lead">불러오는 중…</p>' : L.length ? `<div class="tm-row"><button class="tm-sort" type="button" data-pow="1">위력순 ${stPow > 0 ? '▼' : '▲'}</button></div><div class="sp-list">${L.map(([x, n, id]) => GB().tmRow(x, n, id)).join('')}</div>` : '<p class="sf-none">가진 기술머신이 없어요. 상점에서 사 오세요.</p>'; }
    if (storeT === 'deco') body = dk.length ? `<div class="dc-grid">${dk.map(k => `<button type="button" data-dc="${k}" class="${g.dp.includes(k) ? 'own' : ''}"><span class="dc-pic"><img alt="" src="${IMG}deco/${k}.png" class="${DECO[k].w > 16 ? 'big' : ''}"></span><b>${DECO[k].n}</b><em>${g.dp.includes(k) ? '놓여 있음' : '창고에 있음'}</em></button>`).join('')}</div>` : '<p class="sf-none">가진 꾸미기가 없어요. 상점에서 사 오세요.</p>';
    if (storeT === 'fit') body = `<div class="ft-grid">${['', ...fk].map(k => `<button type="button" data-fit="${k}" class="${(g.fit || '') === k ? 'on' : ''}"><i class="ft-pic"><img alt="" data-fk="${k}"></i><b>${k ? OUTFITS[k].n : '기본 옷'}</b><em>${(g.fit || '') === k ? '입는 중' : '입기'}</em></button>`).join('')}</div>`;
    el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">창고</b></div>
      <div class="gy-body"><div class="sp-tabs st-tabs" role="tablist">${T.map(([k, n, c]) => `<button type="button" role="tab" data-st="${k}" aria-selected="${storeT === k}">${n} <small>${c}</small></button>`).join('')}</div>${body}</div>`;
    el.querySelectorAll('img[data-fk]').forEach(im => fitSrc('tr', im.dataset.fk).then(u => { im.src = u; }));
    if (storeT === 'tm' && !GB()?.D) loadJs('gymb/battle.js', 'GymBattle').then(() => GB()?.loadData()).then(() => { if (el.isConnected && storeT === 'tm') draw(); });
  };
  draw();
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); const g = st();
    if (b.dataset.a === 'x') return el.remove();
    if (b.dataset.st) { storeT = b.dataset.st; return draw(); }
    if (b.dataset.pow) { stPow = -stPow; return draw(); }
    // 기술머신 누르면 기술 상세 → 기술 가르치기 → 포켓몬 박스 화면에서 고르기 (경완 2026-10-29)
    if (b.dataset.tm) { const id = b.dataset.tm; return GB().mvInfo(id, () => { el.remove(); GB().teachPick(id, () => storePop()); }); }
    if (b.dataset.a === 'place') { el.remove(); return decoEdit(); }
    if (b.dataset.dc) { const k = b.dataset.dc, i = g.dp.indexOf(k); if (i >= 0) { g.dp.splice(i, 1); delete g.dpos?.[k]; } else g.dp.push(k); save(); renderHome(true); return draw(); }
    if (b.dataset.fit != null) { g.fit = b.dataset.fit; save(); renderHome(true); return draw(); } };
}
// 체육관 시뮬레이터 (운영자, 경완 2026-10-28): 기다려야 볼 수 있는 것을 바로 불러 본다. 나오면 원래 체육관으로 되돌아간다 (beta.html gymSim)
function simPop() {
  const g = st(); if (!g?.d) return say('체육관을 먼저 세워 주세요.');
  const B = [['cand1', '지원자 1명 부르기'], ['cand3', '지원자 3명 부르기'], ['chal', '도전자 부르기'], ['named', '이름 있는 도전자'], ['rep+', '평판 +50'], ['rep-', '평판 -50'], ['gold', '골드 +10만'], ['bdg', '등급 배지 받기 연출'], ['new', '처음 세우기부터']];
  pop(`<h4>체육관 시뮬레이터</h4><p class="gy-msg">퇴근하면 들어오기 전 체육관으로 되돌아가요.</p><div class="gy-sim">${B.map(([a, n]) => `<button type="button" data-a="${a}">${n}</button>`).join('')}</div><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => {
    close(); if (a === 'x') return; const now = Date.now();
    if (a === 'cand1' || a === 'cand3') { for (let i = a === 'cand1' ? 1 : 3; i--;) g.cands.push(mkCand(now)); g.candSeen = 0; save(); menuDot(); return say(`지원자가 왔어요! (지원서 ${g.cands.length}장)`, '트레이너 메뉴 › 지원서'); }
    if (a === 'chal' || a === 'named') { let c = mkChal(now); if (a === 'named') { for (let i = 0; i < 30 && !c.named; i++) c = mkChal(now); } arrive(c); save(); return homeSay(); }
    if (a === 'rep+' || a === 'rep-') { g.rep = clampN((g.rep || 0) + (a === 'rep+' ? 50 : -50), 0, REP_MAX); g.gmax = Math.max(g.gmax | 0, gradeOf(g.rep).i); save(); renderTop(); return say(`평판 ${g.rep} (${gradeOf(g.rep).n})`); }
    if (a === 'gold') { S.gold += 100000; save(); renderGoldG(); return say(`골드 ${S.gold.toLocaleString()}G`); }
    if (a === 'rpt') { g.rpt = g.rpt || { w: 3, l: 1, b: 12, g: 4200, rank: 7, seen: 0 }; return reportPop(true); }
    if (a === 'bdg') return badgeGet(g.ty);
    if (a === 'new') { S.gym = null; save(); clearEnts(); return intro(); }
  });
}
// 타입별 등급 배지 18칸: 그 타입 체육관으로 올라 본 가장 높은 등급. 아직이면 실루엣
function badgePop() {
  const g = st();
  pop(`<h4>등급 배지</h4>
    <div class="gy-bdgs">${TYPE_KO.map((nm, t) => { if (!t) return ''; const L = bdLv(g, t); return `<div class="${L ? 'on' : ''}${g.ty === t ? ' cur' : ''}">${bdHtml(t, L)}<b>${nm}</b><small>${L ? gShort(L - 1) : '아직'}</small></div>`; }).join('')}</div>
    <p class="bd-tiers">${GRADES.map(([v], i) => `<span class="t${i + 1}">${gShort(i)} ${v}</span>`).join('')}</p>
    <div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => close());
}
// 주간 보고서·랭킹 (월요일): 지난주 기록 / 이번 주 진행
function reportPop(any) {
  const g = st(), r = g.rpt, w = g.wk || {};
  if (!r && !any) return;
  const cur = `<div class="rk-now"><b>이번 주</b><span>${w.w || 0}승 ${w.l || 0}패 · 막은 도전자 ${w.b || 0}명 · ${(w.g || 0).toLocaleString()}G</span></div>`;
  const body = r ? `<div class="rk-big"><span>지난주 랭킹</span><b>${r.rank}<small>위 / ${r.of}곳</small></b></div>
      <ol class="rk-top">${r.top.map(([n, sc, me]) => `<li class="${me ? 'me' : ''}"><span>${esc(n)}</span><b>${sc}점</b></li>`).join('')}</ol>
      <dl class="gy-info rk-dl"><dt>전적</dt><dd><span>${r.w}승 ${r.l}패 (방어율 ${r.w + r.l ? Math.round(r.w / (r.w + r.l) * 100) : 0}%)</span></dd><i></i><dt>막은 도전자</dt><dd><span>${r.b}명</span></dd><i></i><dt>번 골드</dt><dd><span>${(r.g || 0).toLocaleString()}G</span></dd><i></i><dt>평판</dt><dd><span>${r.r >= 0 ? '+' : ''}${r.r}</span></dd><i></i></dl>` : '<p class="gy-msg">첫 주간 보고서는 다음 주 월요일에 와요.</p>';
  if (r) r.seen = 1; setAt(); save();
  return new Promise(ok => pop(`<h4>주간 보고서</h4>${body}${cur}<p class="gy-msg rk-how">점수 = 이긴 배틀 ×3 + 막은 도전자 ×2 + 올린 평판</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => { close(); ok(); }));
}

// ---------- 처음 설정: 디자인 → 타입 → 이름 (바꾸기는 그 단계 하나만) ----------
function setup(only, re) {
  const g = st(), first = !g?.d;
  const dr = { d: g?.d || DESIGNS[0].id, ty: g?.ty || 0, nm: g?.nm || '' };
  if (re && dr.nm === defName(dr.ty)) dr.nm = '';
  const steps = Array.isArray(only) ? only : only ? [only] : ['d', 'ty', 'nm'];
  let i = 0;
  const el = document.createElement('section'); el.className = 'gy-setup'; root.appendChild(el);
  const counts = myTypes();
  const draw = () => {
    const k = steps[i], last = i === steps.length - 1;
    const head = `<div class="gy-sh">${i === 0 && re ? '' : i === 0 && first ? '<button class="gy-back" type="button" data-x aria-label="체육관 나가기">✕</button>' : '<button class="gy-back" type="button" aria-label="뒤로">◀</button>'}${steps.length > 1 ? `<span class="gy-steps">${steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>`;
    let body = '', btn = last ? (first ? '체육관 열기' : re ? '새로 세우기' : '저장') : '다음';
    if (k === 'd') {
      const D = dzBase(dr.d), di = DESIGNS.indexOf(D);
      body = `<h3>${re ? '새 체육관 디자인' : '체육관 디자인'}</h3><p class="gy-lead">${re ? '새로 세울 체육관 모양을 골라요.' : '본가 관동 지방 체육관이에요. 나중에 바꿀 수 있어요.'}</p>
        <div class="gy-dz"><div class="gy-dz-view"><img data-ms="${D.id}" data-gi="${first ? 0 : ''}" alt=""><button class="gy-dz-arw l" type="button" data-m="-1" aria-label="이전">◀</button><button class="gy-dz-arw r" type="button" data-m="1" aria-label="다음">▶</button></div>
        <div class="gy-dz-nm">${D.n}</div><div class="gy-dz-sub">${D.sub}</div><div class="gy-dots">${DESIGNS.map((_, j) => `<i class="${j === di ? 'on' : ''}"></i>`).join('')}</div></div>`;
    } else if (k === 'ty') {
      body = `<h3>체육관 타입</h3><p class="gy-lead">배틀에는 이 타입 포켓몬만 낼 수 있어요. 등급이 오를 때마다 이 타입의 등급 배지를 받아요.</p>
        <div class="gy-types">${TYPE_KO.map((n, t) => t ? `<button type="button" class="gy-ty${counts[t] ? '' : ' none'}" data-ty="${t}" aria-pressed="${dr.ty === t}">${tyIcon(t)}<span>${n}<small>${counts[t] ? `내 포켓몬 ${counts[t]}` : '아직 없어요'}</small></span></button>` : '').join('')}</div>`;
      if (!dr.ty) btn = '타입을 골라 주세요';
    } else {
      if (!dr.nm) dr.nm = defName(dr.ty);
      body = `<h3>체육관 이름</h3><p class="gy-lead">도전자들이 보는 이름이에요.</p>
        <div class="gy-name"><input type="text" maxlength="8" value="${esc(dr.nm)}" aria-label="체육관 이름"><span class="gy-cnt"></span></div>
        ${first || re ? `<div class="gy-sum"><div class="sm-map"><img data-ms="${dr.d}" data-gi="${first ? 0 : ''}" alt=""></div><div class="sm-row"><b>${dzBase(dr.d).n}</b><span class="sm-ty" style="--tc:${GA.TYPE_C?.[dr.ty] || '#888'}">${tyIcon(dr.ty)}${TYPE_KO[dr.ty]} 타입</span></div></div>` : ''}`;
    }
    el.innerHTML = `${head}<div class="gy-body">${body}</div><button class="gy-key main gy-next" type="button" ${k === 'ty' && !dr.ty ? 'disabled' : ''}>${btn}</button>`;
    fillMs(el); const inp = el.querySelector('input');
    if (inp) { const cnt = () => { el.querySelector('.gy-cnt').textContent = `${inp.value.length}/8`; }; cnt(); inp.oninput = () => { dr.nm = inp.value; cnt(); el.querySelector('.gy-next').disabled = !inp.value.trim(); }; }
  };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.hasAttribute('data-x')) { exit(); return; }
    if (b.classList.contains('gy-back')) { if (i > 0) { i--; draw(); } else el.remove(); return; }
    if (b.dataset.m) { const n = DESIGNS.length, j = DESIGNS.findIndex(D => D.id === dr.d); dr.d = DESIGNS[(j + +b.dataset.m + n) % n].id; draw(); return; }
    if (b.dataset.ty) { const t = +b.dataset.ty, auto = !dr.nm || dr.nm === defName(dr.ty); dr.ty = t; if (auto) dr.nm = ''; draw(); return; }
    if (b.classList.contains('gy-next')) {
      if (steps[i] === 'ty' && !dr.ty) return;
      if (steps[i] === 'nm') { dr.nm = (el.querySelector('input').value || '').trim().slice(0, 8) || defName(dr.ty); }
      if (i < steps.length - 1) { i++; draw(); return; }
      finish();
    }
  };
  // 디자인 미리보기는 옆으로 밀어서도 넘긴다
  let sx = null; el.addEventListener('pointerdown', e => { if (e.target.closest('.gy-dz-view')) sx = e.clientX; });
  el.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) el.querySelector(`.gy-dz-arw.${dx < 0 ? 'r' : 'l'}`)?.click(); });
  const finish = () => {
    if (first) S.gym = { v: 1, d: dr.d, ty: dr.ty, nm: dr.nm, rep: 0, t0: Date.now() };
    else if (re) { el.remove(); return refound(dr); }
    else { if (only === 'ty' && dr.ty !== g.ty) { g.tyLog = g.tyLog || []; g.tyLog.push([g.ty, Date.now()]); } Object.assign(g, { d: dr.d, ty: dr.ty, nm: dr.nm }); }
    save(); el.remove(); renderHome();
    if (first) { tick(); renderHome(); opened(); }
  };
  draw();
}
function opened() {
  sfx('tap'); const fx = document.createElement('div'); fx.className = 'gy-fx'; const C = ['#e04838', '#ffd84a', '#58a8e0', '#6ab84a', '#f8f8f8'];
  for (let k = 0; k < 46; k++) { const i = document.createElement('i'); i.style.left = Math.random() * 100 + '%'; i.style.background = C[k % C.length]; i.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); i.style.animationDelay = Math.random() * .6 + 's'; i.style.animationDuration = 1.6 + Math.random() * 1.2 + 's'; fx.appendChild(i); }
  root.appendChild(fx); setTimeout(() => fx.remove(), 3600);
  say(`<b>${esc(st().nm)}</b>의 문을 열었다!`);   // '안내원을 눌러 보세요' 문구 없앰 (경완 2026-10-28)
  setTimeout(() => { root.querySelector('.gy-note')?.remove(); kang(KANG_OPEN(), { lit: true }); }, 1400);
}

// 폐업 → 공사 → 새 체육관 개장 연출 (경완 2026-10-27 '손바닥 뒤집듯 바꾸는게 아니라 폐업하고 다시 새로 설립하는 연출')
// 폐업 (경완 2026-10-28 '폐업하기 누르면 바로 폐업 연출 → 오픈 연출 → 새 디자인 정하기')
const confetti = () => { const cf = document.createElement('div'); cf.className = 'gy-fx'; const C = ['#e04838', '#ffd84a', '#58a8e0', '#6ab84a', '#f8f8f8'];
  for (let k = 0; k < 46; k++) { const i = document.createElement('i'); i.style.left = Math.random() * 100 + '%'; i.style.background = C[k % C.length]; i.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); i.style.animationDelay = Math.random() * .6 + 's'; i.style.animationDuration = 1.6 + Math.random() * 1.2 + 's'; cf.appendChild(i); }
  root.appendChild(cf); setTimeout(() => cf.remove(), 3600); };
async function closeFx() {
  const g = st(), oldNm = g.nm; openTab(null); preMs();
  const fx = document.createElement('div'); fx.className = 'gy-re'; root.appendChild(fx);
  fx.innerHTML = `<div class="re-shut"><i></i></div><div class="re-sign"><b>폐 업</b><span>${esc(oldNm)}</span><small>그동안 찾아 주셔서 고맙습니다</small></div>`;
  say(`<b>${esc(oldNm)}</b>의 문을 닫았다…`); sfx('tap');
  requestAnimationFrame(() => fx.classList.add('down')); await wait(2600);
  fx.querySelector('.re-sign').innerHTML = `<b>새 단 장</b><span>새 체육관이 문을 열어요</span><small>어떤 체육관으로 열지 골라 주세요</small>`;
  sfx('tap'); await wait(1400); fx.classList.remove('down'); fx.classList.add('up'); confetti(); await wait(900); fx.remove();
}
async function refound(dr) {
  const g = st(), oldNm = g.nm;
  if (dr.ty !== g.ty) { g.tyLog = g.tyLog || []; g.tyLog.push([g.ty, Date.now()]); }
  Object.assign(g, { d: dr.d, ty: dr.ty, nm: dr.nm }); glog('in', `<b>${esc(oldNm)}</b>을 닫고 <b>${esc(dr.nm)}</b>을 새로 세웠다.`); save();
  renderHome(); renderTop(); confetti();
  say(`<b>${esc(dr.nm)}</b>의 문을 새로 열었다!`, `${TYPE_KO[dr.ty]} 타입 체육관`);
}

// ---------- 강박사 안내 (처음 체육관에 올 때, 체육관을 연 뒤) ----------
const KANG_HI = () => [
  '오, 왔구나!\n기다리고 있었단다.',
  '여기는 오랫동안 문을 닫아 둔\n빈 체육관이란다.',
  trName() ? `${trName()}, 오늘부터 네가\n이 체육관의 관장이다!` : '오늘부터 네가\n이 체육관의 관장이다!',
  '관장은 찾아오는 도전자와\n배틀해서 실력을 보여 주는\n사람이지.',
  '먼저 체육관을 꾸며 보자.\n체육관 모양과 타입을\n고르렴.',
  '타입을 정하면 그 타입\n포켓몬만 배틀에 낼 수 있단다.\n잘 고르렴!',
];
const KANG_OPEN = () => [
  '멋진 체육관이구나!',
  '도전자는 하루에 몇 번,\n아무 때나 찾아온단다.',
  '누가 오면 필드의 체육관\n버튼에 빨간 점이 뜨지.',
  '도전자를 이기면 골드를 받고\n평판이 오른단다. 평판이 오르면\n체육관도 커지지.',
  '훈련장에서 포켓몬을 키우고,\n트레이너를 고용해 함께\n체육관을 지킬 수도 있단다.',
  '평판이 등급 문턱에 닿으면\n승급 심사가 오지. 이기면\n등급 배지를 준단다!',
  '모르는 게 있으면 안내원에게\n물어보렴. 그럼 힘내라,\n관장님!',
];
// lines 를 강박사가 한 줄씩 말한다 (화면을 누르면 다음). lit: 처음부터 밝게 / 아니면 어두운 체육관에 불이 켜지며 시작
function kang(lines, { lit = false, nm = '강박사', pic = GA.KANG, ow = 0 } = {}) {
  return new Promise(done => {
    const k = document.createElement('div'); k.className = 'gy-kang' + (lit ? ' lit' : '') + (ow ? ' guide' : '');
    k.innerHTML = `<i class="gy-k-veil"></i>${ow ? `<i class="gy-k-pic ow${/\/pt\/|pt_/.test(pic) ? ' w32' : ''}" style="background-image:url(${pic})"></i>` : `<img class="gy-k-pic" alt="${nm}" src="${pic}">`}<button class="gy-k-skip" type="button">건너뛰기</button><div class="win gy-k-box" aria-live="polite"><span class="gy-k-nm">${nm}</span><span class="gy-k-t"></span><b class="gy-k-cur" hidden>▼</b></div>`;
    root.appendChild(k);
    const talk = GA.inTyper(k, k.querySelector('.gy-k-t'), k.querySelector('.gy-k-cur'));
    let stop = false; const end = async () => { if (k.classList.contains('bye')) return; stop = true; k.classList.add('bye'); await wait(450); k.remove(); done(); };
    k.querySelector('.gy-k-skip').onclick = e => { e.stopPropagation(); sfx('tap'); end(); };
    (async () => {
      if (!lit) { await wait(500); for (const o of [.55, .9, .25, .6, 0]) { k.style.setProperty('--veil', o); await wait(o ? 110 : 0); } k.classList.add('lit'); await wait(500); }
      k.classList.add('in'); await wait(650);
      for (const t of lines) { if (stop) return; await talk(t); }
      end();
    })();
  });
}


// ---------- 들어가기·나가기 ----------
const preload = src => new Promise(ok => { const i = new Image(); i.onload = i.onerror = () => ok(); i.src = src; });
async function prepare() {
  if (!root) build();
  const g = st(); const L = [preload(`${IMG}ow/${myOw()}.png`), preload(owSrc(GUY_OW))];
  if (g?.d) L.push(preload(`${IMG}map/${dzOf(g.d).id}.png${dzOf(g.d).iv ? `?v=${dzOf(g.d).iv}` : ""}`)); else DESIGNS.forEach(D => L.push(preload(`${IMG}map/${D.id}.png`)));
  L.push(loadJs('gymb/bgm.js', 'GymBGM').then(() => { try { window.GymBGM?.prep('gym'); window.GymBGM?.sePrep?.(['DP_DOOR', 'DP_REGI']); } catch (e) {} }));   // 출근 로딩 동안 체육관 곡을 미리 만든다
  L.push(loadNamed(), loadJs('gymb/battle.js', 'GymBattle').then(() => GB()?.loadData()).then(() => loadJs('gymb/manage.js', 'GymManage')).catch(() => {}));   // 도전자 방문·훈련장 계산에 배틀 자료가 필요
  if (g?.fit) L.push(fitSrc('ow'), fitSrc('trb'), fitSrc('tr'));   // 옷 칠한 그림을 미리
  await Promise.all(L);
}
// 처음: 빈 체육관(회색시티 모양)에 불이 켜지고, 내가 문으로 들어오면 강박사가 설명 → 디자인·타입·이름 정하기
async function intro() {
  const D = DESIGNS[0]; clearEnts(); layout(D); dlg('', ''); root.classList.add('pre'); preMs(0);
  const me = ent({ ow: myOw(), x: D.door[0], y: D.door[1], f: 'u' });
  const k = kang(KANG_HI());
  await wait(1500); await walk(me, [[D.door[0], D.door[1] - 4]]);
  await k; root.classList.remove('pre'); if (!open) return; setup();
}
function enter() {
  open = true; tab = null; root.hidden = false; root.classList.remove('gview'); root.classList.toggle('sim', !!window.gymSimOn); GA.gymIn(); openTab(null); bgmPlay('gym');   // 체육관 곡: 처음이면 플래티넘 원본 소리를 받아 오는 동안 잠깐 조용하다
  requestAnimationFrame(() => root.classList.add('on'));
  if (st()?.d) { tick(); renderHome(); later(); } else intro();
  setTimeout(() => gymLoad.hide(), 120);
  clearInterval(tickT); tickT = setInterval(() => { if (!open || busy || !st()?.d) return; const n0 = st().q.length; tick(); renderTop(); if (st().q.length > n0) { sfx('tap'); homeSay(); } else if (!st().q.length) homeSay(); }, 20e3);
}
let tickT = 0;
// 들어온 뒤: 지난주 보고서 → 새 배지 → 면접 지원자 알림 (하나씩)
async function later() {
  await wait(700); if (!open) return; const g = st();
  if (g.newBdg) await badgeGet(g.newBdg);
}
let leaving = false;
async function exit() {
  if (leaving || !open) return; leaving = true;
  // 퇴근 누르면 로딩 화면부터 바로 (서서히 나타나지 않게, 경완 2026-10-27)
  const L = document.getElementById('gymLoad'); L?.classList.add('inst'); gymLoad.show('퇴근하는 중', '', true); void L?.offsetWidth; L?.classList.remove('inst');
  // 로딩 화면이 실제로 그려진 다음에 정리한다: 체육관 화면은 곧바로 숨겨 휴대폰이 더 그리지 않게 (경완 2026-10-28 '화면 먼저 띄우고 뒤에서 로딩')
  const t0 = Date.now(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  root.style.visibility = 'hidden'; clearInterval(tickT); cancelAnimationFrame(palRaf); try { openTab(null); } catch (e) {}
  root.querySelectorAll('.gy-pop,.gy-setup,.gy-kang').forEach(x => x.remove()); ded?.end?.();
  await wait(0); try { window.GymBGM?.free(); } catch (e) {}
  await wait(Math.max(0, 2800 - (Date.now() - t0)));
  clearInterval(tickT); if (st()?.d) { tick(); setAt(); save(); }
  open = false; root.classList.remove('on'); root.hidden = true; root.style.visibility = ''; root.querySelectorAll('.gy-kang').forEach(x => x.remove()); root.classList.remove('pre'); GA.gymOut(); clearEnts();
  try { menuDots(); } catch (e) {}
  await wait(200); gymLoad.hide(); leaving = false;
}

window.Gym = { prepare, enter, exit, isOpen: () => open, renderGold: renderGoldG, DESIGNS, _walk: walk, _ent: ent, _tick: tick, _mapSrc: D => mapSrc(D),
  // gym/manage.js (훈련장·트레이너·상점)이 쓰는 것
  k: { GRADES, homeSay, bigOf, trSrc, owSrc, owW, fitSrc, myF, bodyCard, sfPlace, sfList: () => sfList(), inGym, sfCard, openTab: t => openTab(t), decoEdit, decoList, st, glog, addG, addRep, save, pop, say, renderHome, renderTop, menuDot, setAt, gradeOf, luNow, myAvg, TRAITS, OUTFITS, DECO, staffMax, sfName, N3, IMG, H, DAY, dayStart, nextDay, hhmm, jong, eul, iga, eun, rndI, pick, mkCand, mkTeam, teamLv, dzOf, renderGoldG, resultPop, mkChal, blocked, badgeGet, infoPop, badgePop, challenge, luPick } };
// 필드 체육관 버튼 빨간 점: 기다리는 도전자·새 소식(at 이 지남)
window.gymDot = () => { const g = S.gym; return !!(g && g.d && ((g.q && g.q.length) || (g.at && Date.now() >= g.at))); };
})();
