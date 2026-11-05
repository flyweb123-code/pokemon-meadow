// 닉네임 비속어 가리기 (2026-11-05 경완): 본인에게는 그대로, 다른 유저에게는 비속어 부분 글자를 * 로.
// 서버가 남의 카드를 내줄 때(get·top·mgtop)와 놀러가기 방 이름표(visitTicket)에서 가린다. 저장된 카드는 그대로 둔다.
// 가리는 모양: 2글자는 뒤 글자, 3글자 이상은 처음·끝만 남기고 가운데 (씨발 → 씨*, 개새끼 → 개*끼, fuck → f**k).
// 찾을 땐 사이에 넣은 띄어쓰기·숫자·기호는 건너뛰고 본다 (씨1발, 씨.발, f u c k).

// 한 글자씩 비교용으로: 전각 → 반각, 영문 소문자 (한글 자모는 NFKC 하면 다른 글자가 되니 그대로)
const norm = c => /[\u3130-\u318f\uac00-\ud7a3]/.test(c) ? c : ([...c.normalize('NFKC').toLowerCase()][0] || c);

const WORDS = [
  // 욕
  '씨발', '시발', '씨빨', '시빨', '씨바', '씨팔', '시팔', '쉬발', '쉬바', '슈발', '쓔발', '씌발', '띠발', '띠바', '싸발', '십발', '씹발', '시벌', '씨벌', '십팔놈', '십새', '씹새', '씹', '썅', '쌍년', '쌍놈',
  // ㅂㅅ·ㅅㅂ 같은 자음 줄임말은 가리지 않음 (2026-11-05 경완 '그 정도는 괜찮아')
  '병신', '븅신', '빙신', '병쉰', '등신', '머저리',
  '좆', '좃', '졷', '존나', '졸라', '조낸', '좆밥', '좆같', '좃같',
  '지랄', '염병', '옘병', '얨병',
  '개새끼', '개새기', '개색끼', '개색기', '개세끼', '개쉐이', '개쉑', '개섀끼', '개년', '개놈', '개같은', '개자식', '개좆',
  '새끼', '색끼', '쌔끼', '쌔기', '쉐끼', '섀끼', '시끼',
  '미친놈', '미친년', '미친새', '미친', '미췬', '또라이', '똘추',
  '엠창', '니미', '니애미', '니앰', '느금', '느개비', '니애비', '애미', '애비', '앰뒤', '호로', '후레자식', '창녀', '창년', '걸레년',
  '닥쳐', '꺼져', '뒤져', '뒈져', '죽어라', '자살',
  // 성적인 말
  '섹스', '쎅스', '섹쓰', '보지', '자지', '잠지', '꼬추', '딸딸이', '자위', '야동', '강간', '성교', '빠구리', '오나홀',
  // 혐오
  '한남충', '김치녀', '틀딱', '장애인새', '흑형', '똥꼬충',
  // 영어
  'fuck', 'fuk', 'fck', 'fxck', 'shit', 'sh1t', 'bitch', 'btch', 'asshole', 'dick', 'pussy', 'cunt', 'sex', 'porn', 'nigger', 'nigga', 'fag', 'bastard', 'slut', 'whore', 'penis', 'vagina', 'motherfucker', 'wtf', 'stfu',
].map(w => [...w.replace(/\s+/g, '')].map(norm).join(''));
// 긴 말부터 찾아서 '개새끼' 를 '새끼' 보다 먼저 잡는다
const SORTED = [...new Set(WORDS)].sort((a, b) => b.length - a.length);
// 사이에 끼워 넣어도 건너뛸 글자: 띄어쓰기·숫자·기호 (한글·영문·자모만 본다)
const SKIP = /[^\p{L}]/u;

const hideSpan = n => n <= 1 ? [0] : n === 2 ? [1] : Array.from({ length: n - 2 }, (_, i) => i + 1);

// 채팅·방명록 글 (문장): 띄어쓰기로 나눈 낱말마다 본다. 문장에 흔히 섞이는 말은 따로 다룬다.
// EXACT = 낱말 전체가 그 말일 때만 (가보지·여자지·성교육·자위대 안 가림), START = 낱말 앞에 올 때만 (시발점·미친듯이 정도만 가림)
// SKIP_CHAT = 문장에선 안 봄 (불 꺼져·뒤져 봐 같은 보통 말)
const EXACT = new Set(['보지', '자지', '잠지', '성교', '자위', '야스']);
const START = new Set(['미친', '미췬', '새끼', '색끼', '시발', '애미', '애비', '호로', '니미', '졸라', '조낸', '꼬추', '등신', 'dick', 'fag', 'sex', '느금', '씹']);
const SKIP_CHAT = new Set(['꺼져', '뒤져', '죽어라', '자살', '머저리', '또라이', '똘추']);

export function maskText(text) {
  if (typeof text !== 'string' || !text) return text;
  return text.split(/(\s+)/).map(t => /^\s*$/.test(t) ? t : maskNick(t, true)).join('');
}

export function maskNick(name, chat = false) {
  if (typeof name !== 'string' || !name) return name;
  const ch = [...name.normalize('NFC')];
  const pos = [], low = [];   // 건너뛸 글자를 뺀 글자들과 원래 자리
  ch.forEach((c, i) => { if (!SKIP.test(c)) { pos.push(i); low.push(norm(c)); } });
  const s = low.join(''), hide = new Set();
  const used = new Array(low.length).fill(false);
  for (const w of SORTED) {
    if (chat && SKIP_CHAT.has(w)) continue;
    const L = [...w].length;
    let from = 0;
    while (true) {
      const at = s.indexOf(w, from); if (at < 0) break;
      const a = [...s.slice(0, at)].length;   // 글자 단위 자리
      from = at + w.length;
      if (used.slice(a, a + L).some(Boolean)) continue;
      if (chat && EXACT.has(w) && (a !== 0 || L !== low.length)) continue;
      if (chat && START.has(w) && a !== 0) continue;
      for (let k = a; k < a + L; k++) used[k] = true;
      const span = pos.slice(a, a + L);   // 원래 이름에서의 자리 (사이 기호 포함 구간)
      const full = [];
      for (let i = span[0]; i <= span[span.length - 1]; i++) full.push(i);
      for (const k of hideSpan(L)) hide.add(span[k]);
      // 사이에 끼운 숫자·기호도 가린다 (씨1발 → 씨**)
      for (const i of full) if (!span.includes(i)) hide.add(i);
    }
  }
  if (!hide.size) return name;
  return ch.map((c, i) => hide.has(i) ? '*' : c).join('');
}

// 카드(JSON 글자) 속 이름들: 트레이너 이름 n, 짝꿍·대표 포켓몬 별명 bn·rp.nm·rp.p.nm
export function maskCard(card) {
  if (typeof card !== 'string') return card;
  let c; try { c = JSON.parse(card); } catch (e) { return card; }
  if (!c || typeof c !== 'object') return card;
  let ch = false;
  const fix = (o, k) => { if (o && typeof o[k] === 'string') { const m = maskNick(o[k]); if (m !== o[k]) { o[k] = m; ch = true; } } };
  fix(c, 'n'); fix(c, 'bn'); fix(c.rp, 'nm'); fix(c.rp?.p, 'nm');
  return ch ? JSON.stringify(c) : card;
}

// 서버가 내주는 줄들({code, card, ...}) — 내 카드는 그대로
export const maskRows = (rows, me) => (rows || []).map(r => r && r.code !== me && typeof r.card === 'string' ? { ...r, card: maskCard(r.card) } : r);
