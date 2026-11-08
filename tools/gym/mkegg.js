// 훈련장 '특별한 기술' = 포켓로그(PokeRogue) 알 기술 → gym/egg.json
// node tools/gym/mkegg.js <pokerogue src/data/balance/moves/egg-moves.ts> <pokeapi data/v2/csv>
// 우리 data.json 에 없는 기술(레츠고 전용·토크 기술 등, 쇼다운 gen9customgame 에선 다 돌아감)은 data.json mv 끝에 덧붙인다 (번호 안 바뀜).
// mkdata.js 를 다시 돌리면 덧붙인 게 빠지니 그 뒤에 이것도 다시 돌릴 것.
// 포켓로그는 진화 전 첫 모습에만 4개(4번째 = 레어)가 있어서, 진화한 포켓몬은 첫 모습 것을 따라간다.
// 결과: { 종 번호: [기술 id ×4] } (우리 배틀 데이터에 없는 기술은 null)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(path.join(ROOT, 'gym', 'psim.js'), 'utf8'));
const { Dex } = globalThis.PSim;
const DP = path.join(ROOT, 'gym', 'data.json'), D = JSON.parse(fs.readFileSync(DP, 'utf8'));
const id = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const rd = f => { const t = fs.readFileSync(path.join(process.argv[3], f), 'utf8'), rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [k, ...r] = rows; return r.map(v => Object.fromEntries(k.map((x, i) => [x, v[i]]))); };
const mvId = Object.fromEntries(rd('moves.csv').map(r => [r.id, id(r.identifier)]));
const KO = {}; rd('move_names.csv').forEach(r => { if (r.local_language_id == 3 && mvId[r.move_id]) KO[mvId[r.move_id]] = r.name; });
const DS = {}; rd('move_flavor_text.csv').forEach(r => { const k = mvId[r.move_id]; if (!k || r.language_id != 3 || /사용할 수 없는 기술/.test(r.flavor_text)) return; if (!DS[k] || +r.version_group_id > DS[k][0]) DS[k] = [+r.version_group_id, r.flavor_text.replace(/\s+/g, ' ').trim()]; });
const TYPES = ['', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
KO.nihillight ??= '니힐라이트'; DS.nihillight ??= [0, '상대의 회피율과 방어 능력 변화를 무시하고 공격한다.'];   // Z-A 기술이라 PokeAPI 에 한국어가 아직 없음
const has = new Set(D.mv.map(m => m[0])), added = [];
const addMv = m => { const d = Dex.moves.get(m); if (!d.exists || d.isZ || d.isMax) return false; D.mv.push([m, KO[m] || d.name, TYPES.indexOf(d.type), d.category === 'Physical' ? 0 : d.category === 'Special' ? 1 : 2, d.basePower || 0, d.accuracy === true ? 0 : d.accuracy, d.pp, d.priority || 0, (DS[m] || [0, ''])[1]]); has.add(m); added.push(m + ':' + (KO[m] || '?')); return true; };
const REG = { ALOLA: 'alola', GALAR: 'galar', HISUI: 'hisui', PALDEA: 'paldea', ETERNAL: 'eternal', BLOODMOON: 'bloodmoon' };
const key = k => { const [a, ...r] = k.split('_'); if (REG[a] && r.length) return id(r.join('')) + REG[a]; return id(k); };
const PR = {};
for (const m of fs.readFileSync(process.argv[2], 'utf8').matchAll(/\[SpeciesId\.(\w+)\]: \[([^\]]*)\]/g))
  PR[key(m[1])] = [...m[2].matchAll(/MoveId\.(\w+)/g)].map(x => id(x[1]));
PR.taurospaldeacombat = PR.taurospaldea;
const BASE = { melmetal: 'meltan', basculegion: 'basculinhisui' };   // 쇼다운에 이전 모습이 안 이어진 것   // 켄타로스 팔데아 세 모습 모두
const out = {}, none = [], drop = {};
for (const [num, s] of Object.entries(D.sp)) {
  let sp = Dex.species.get(s.id), chain = [];
  while (sp?.exists) { chain.unshift(id(sp.name)); sp = sp.prevo ? Dex.species.get(sp.prevo) : null; }
  if (/^taurospaldea/.test(s.id)) chain = ['taurospaldeacombat'];
  if (BASE[s.id]) chain = [BASE[s.id]];
  const b = chain.find(c => PR[c]); if (!b) { none.push(s.id); continue; }
  out[num] = PR[b].map(m => { if (has.has(m) || addMv(m)) return m; drop[m] = (drop[m] || 0) + 1; return null; });
}
fs.writeFileSync(path.join(ROOT, 'gym', 'egg.json'), JSON.stringify(out));
if (added.length) fs.writeFileSync(DP, JSON.stringify(D));
console.log('added to data.json', added.join(' '));
console.log('species', Object.keys(out).length, '/', Object.keys(D.sp).length, 'no egg moves', none.length, none.slice(0, 40).join(' '));
console.log('moves not in data.json', Object.entries(drop).map(([k, v]) => k + ':' + v).join(' '));
