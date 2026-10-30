/* v12.01 경완 '바로 가능한 다른 세대 곡 상점에': 4세대(하트골드·소울실버, 다이아몬드·펄) 필드 곡.
   pret 저장소의 원본 소리 데이터(sdat)에서 곡·악기·소리 묶음만 바이트 범위로 받아 이 기기(IndexedDB pk-music)에 넣고,
   gym/sseq.js(DS 소리 엔진)로 일꾼에서 연주한다. 저장소엔 곡 파일을 올리지 않는다. 체육관 곡(gym/bgm.js)과 같은 방식.
   NDSMus.get(id, ctx, cache) → AudioBuffer (gbLoop = [반복 시작, 끝] 초) — gbm.js 의 GBSynth.get 과 같은 모양 */
(function () {
'use strict';
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
// 커밋을 고정해 두어 바이트 위치가 바뀌지 않는다 (다이아몬드·펄 곡은 플라티나 sdat 에 같이 들어 있다)
const SRC = {
  hg: { u: 'https://raw.githubusercontent.com/pret/pokeheartgold/3fea383f5a229391d12ef3429f8095177638a44d/files/data/sound/gs_sound_data.sdat', n: 8660096 },
  pt: { u: 'https://raw.githubusercontent.com/pret/pokeplatinum/6eeb1b04c6433761f3049811b7e1383619c59743/res/prebuilt/data/sound/sound_data.sdat', n: 7484768 },
};
// id → [sdat, 원래 이름, 악보 [시작, 길이], 곡 볼륨, 악기 [번호, 시작, 길이], 소리 묶음 4칸 [번호, 시작, 길이] | null]
const T = {"hg_wakaba":["hg","GS_T_WAKABA",[258432,7884],80,[702,1770400,4612],[[700,6937120,431288],[702,7368480,29316],null,null]],"hg_r29":["hg","GS_R_1_29",[135616,9428],63,[702,1770400,4612],[[700,6937120,431288],[702,7368480,29316],null,null]],"hg_yoshino":["hg","GS_C_YOSHINO",[266336,6808],68,[702,1770400,4612],[[700,6937120,431288],[702,7368480,29316],null,null]],"hg_kikyou":["hg","GS_C_KIKYOU",[273152,13064],78,[703,1775040,4516],[[700,6937120,431288],[703,7397824,11284],null,null]],"hg_kogane":["hg","GS_C_KOGANE",[296224,5124],72,[705,1784064,4508],[[700,6937120,431288],[705,7413728,10200],null,null]],"hg_enju":["hg","GS_C_ENJU",[301376,11816],54,[706,1788576,4580],[[700,6937120,431288],[706,7423936,27116],null,null]],"hg_kouen":["hg","GS_D_KOUEN",[498656,12104],87,[732,1905760,4600],[[700,6937120,431288],[732,7831136,30552],null,null]],"hg_surf":["hg","GS_NAMINORI",[204960,12408],85,[700,1764256,4288],[[700,6937120,431288],null,null,null]],"hg_bike":["hg","GS_BICYCLE",[198016,6932],85,[700,1764256,4288],[[700,6937120,431288],null,null,null]],"hg_masara":["hg","GS_T_MASARA",[378080,7712],80,[718,1843264,4464],[[700,6937120,431288],[718,7575008,3476],null,null]],"hg_tamamushi":["hg","GS_C_TAMAMUSHI",[372544,5528],63,[715,1829568,4528],[[700,6937120,431288],[715,7543968,13640],null,null]],"hg_tokiwa":["hg","GS_C_TOKIWA",[354464,6804],59,[710,1806784,4508],[[700,6937120,431288],[710,7485344,10200],null,null]],"dp_futaba":["pt","TOWN01_D",[145216,6232],125,[1001,1628096,3984],[[1000,6573184,458564],[1001,7031776,30836],null,null]],"dp_kotobuki":["pt","CITY01_D",[190080,6060],96,[1001,1628096,3984],[[1000,6573184,458564],[1001,7031776,30836],null,null]],"dp_r201":["pt","ROAD_A_D",[290560,4420],127,[1001,1628096,3984],[[1000,6573184,458564],[1001,7031776,30836],null,null]],"dp_snow":["pt","ROAD_SNOW_D",[347424,14720],100,[1001,1628096,3984],[[1000,6573184,458564],[1001,7031776,30836],null,null]]};

const mem = {}, whole = {};
async function wholeOf(s) {
  if (!whole[s]) whole[s] = fetch(SRC[s].u).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(b => { if (b.byteLength !== SRC[s].n) throw new Error('size'); return b; }).catch(e => { whole[s] = null; throw e; });
  return whole[s];
}
async function part(s, o, n, cache) {
  const k = 'nds:' + s + ':' + o + ':' + n;
  if (mem[k]) return mem[k];
  return (mem[k] = (async () => {
    let b = null; try { b = await cache.get(k); } catch (e) {}
    if (b instanceof Blob) b = await b.arrayBuffer();
    if (b && b.byteLength === n) return b;
    b = null;
    try {
      const r = await fetch(SRC[s].u, { headers: { Range: `bytes=${o}-${o + n - 1}` } });
      if (r.status === 206) { b = await r.arrayBuffer(); if (b.byteLength !== n) b = null; }
      else if (r.ok) { const all = await r.arrayBuffer(); b = all.byteLength === SRC[s].n ? all.slice(o, o + n) : null; }
    } catch (e) { b = null; }
    if (!b) b = (await wholeOf(s)).slice(o, o + n);
    try { cache.put(k, new Blob([b])); } catch (e) {}
    return b;
  })().catch(e => { delete mem[k]; throw e; }));
}

let worker = null, wid = 0;
const waits = new Map(), sent = new Set();
function work(msg) {
  if (!worker) {
    worker = new Worker(`gym/sseq.js?v=${VER}`);
    worker.onmessage = e => { const w = waits.get(e.data.id); if (!w) return; waits.delete(e.data.id); e.data.err ? w.no(new Error(e.data.err)) : w.ok(e.data); };
    worker.onerror = e => { waits.forEach(w => w.no(e)); waits.clear(); try { worker.terminate(); } catch (x) {} worker = null; sent.clear(); };
  }
  const id = ++wid; return new Promise((ok, no) => { waits.set(id, { ok, no }); worker.postMessage(Object.assign({ id }, msg)); });
}
async function get(id, ctx, cache) {
  const t = T[id]; if (!t) return null;
  const [s, , q, vol, bk, ws] = t, bKey = s + 'b' + bk[0], wKeys = ws.map(w => w ? s + 'w' + w[0] : null);
  const [seq, bank, ...wars] = await Promise.all([part(s, q[0], q[1], cache), part(s, bk[1], bk[2], cache), ...ws.map(w => w ? part(s, w[1], w[2], cache) : null)]);
  const r = await work({ seq: seq.slice(0), bankKey: bKey, bank: sent.has(bKey) ? null : bank.slice(0), warKeys: wKeys, wars: wars.map((w, i) => !w || sent.has(wKeys[i]) ? null : w.slice(0)), vol });
  sent.add(bKey); wKeys.forEach(k => k && sent.add(k));
  const b = ctx.createBuffer(2, r.L.length, r.rate); b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R);
  if (r.loop) b.gbLoop = [r.loopStart / r.rate, b.duration];
  return b;
}
window.NDSMus = { has: id => !!T[id], get, ids: Object.keys(T) };
})();
