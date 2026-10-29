// 체육관 배틀 데이터: 쇼다운(pkmn/ps) 배울 수 있는 기술 + PokeAPI 한국어 이름 → gym/data.json
// node tools/gym/mkdata.js <psim 전체 번들(배울 기술 포함)> <pokeapi data/v2/csv>
const fs = require('fs'), path = require('path');
const [, , simPath, csv] = process.argv;
(0, eval)(fs.readFileSync(simPath, 'utf8'));
const { Dex } = globalThis.PSim;
// CSV (따옴표 안 줄바꿈 포함)
const rd = f => { const t = fs.readFileSync(path.join(csv, f), 'utf8'), rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [k, ...r] = rows; return r.map(v => Object.fromEntries(k.map((x, i) => [x, v[i]]))); };
const id = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const KO = 3;
const nameMap = (rows, names, key) => { const ident = Object.fromEntries(rows.map(r => [r.id, id(r.identifier)])); const o = {}; names.filter(n => n.local_language_id == KO).forEach(n => { if (ident[n[key]]) o[ident[n[key]]] = n.name; }); return o; };
const mvKo = nameMap(rd('moves.csv'), rd('move_names.csv'), 'move_id'); mvKo.visegrip = mvKo.vicegrip;
const abKo = nameMap(rd('abilities.csv'), rd('ability_names.csv'), 'ability_id');
const ntKo = nameMap(rd('natures.csv'), rd('nature_names.csv'), 'nature_id');
// 기술 설명: 가장 최근 판의 한국어 설명
const mvRows = rd('moves.csv'), mvIdent = Object.fromEntries(mvRows.map(r => [r.move_id || r.id, id(r.identifier)]));
const desc = {}; rd('move_flavor_text.csv').filter(r => r.language_id == KO).forEach(r => { let k = mvIdent[r.move_id]; if (!k) return; if (k === 'vicegrip') k = 'visegrip'; if (/사용할 수 없는 기술입니다/.test(r.flavor_text)) return; if (!desc[k] || +r.version_group_id > desc[k][0]) desc[k] = [+r.version_group_id, r.flavor_text.replace(/\s+/g, ' ').trim()]; });
const growth = Object.fromEntries(rd('pokemon_species.csv').map(r => [+r.id, +r.growth_rate_id]));
const TYPES = ['', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const MV = [], mvIx = {};
const ix = m => { if (mvIx[m] == null) { mvIx[m] = MV.length; MV.push(m); } return mvIx[m]; };
const SP = {};
const base = Dex.species.all().filter(s => s.num >= 1 && s.num <= 1025 && !s.forme && s.exists !== false);
for (const s of base) {
  if (SP[s.num]) continue;
  // 리전폼 없는 기본 모습의 배울 기술. 세대가 여럿이면 가장 최근 세대 레벨업
  let ls = Dex.species.getLearnsetData ? null : null;
  let L = Dex.data.Learnsets[s.id]?.learnset;
  if (!L && s.changesFrom) L = Dex.data.Learnsets[id(s.changesFrom)]?.learnset;
  if (!L) { console.error('no learnset', s.id); continue; }
  let gmax = 0; for (const m in L) for (const e of L[m]) if (e[1] === 'L') gmax = Math.max(gmax, +e[0]);
  const lv = [], tm = [], ex = [];
  for (const m in L) {
    const mv = Dex.moves.get(m); if (!mv.exists || (mv.isNonstandard && mv.isNonstandard !== 'Past') || mv.isZ || mv.isMax) continue;
    const es = L[m];
    const l = es.filter(e => +e[0] === gmax && e[1] === 'L').map(e => +e.slice(2));
    if (l.length) l.forEach(x => lv.push([x, ix(m)]));
    else if (es.some(e => e[1] === 'M')) tm.push(ix(m));
    else if (es.some(e => e[1] === 'E' || e[1] === 'T')) ex.push(ix(m));
  }
  lv.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  SP[s.num] = { id: s.id, g: growth[s.num] || 2, ab: Object.values(s.abilities).filter((a, i, A) => A.indexOf(a) === i).map(a => id(a)), lv: lv.flat(), tm, ex };
}
const mv = MV.map(m => { const d = Dex.moves.get(m); return [m, mvKo[m] || d.name, TYPES.indexOf(d.type), d.category === 'Physical' ? 0 : d.category === 'Special' ? 1 : 2, d.basePower || 0, d.accuracy === true ? 0 : d.accuracy, d.pp, d.priority || 0, (desc[m] || [0, ''])[1]]; });
const ab = {}; Object.values(SP).forEach(s => s.ab.forEach(a => { ab[a] = abKo[a] || Dex.abilities.get(a).name; }));
const nt = {}; Dex.natures.all().forEach(n => { nt[n.id] = [ntKo[n.id] || n.name, n.plus || '', n.minus || '']; });
const out = { v: 1, mv, ab, nt, sp: SP };
const dst = path.join(__dirname, '..', '..', 'gym', 'data.json');
fs.writeFileSync(dst, JSON.stringify(out));
console.log('species', Object.keys(SP).length, 'moves', MV.length, 'bytes', fs.statSync(dst).size, 'missing ko', MV.filter(m => !mvKo[m]).slice(0, 20));
