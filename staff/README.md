# 작업실 직원 (포켓몬 키우기)

경완(게임 만든 사람)이 작업실에 둔 가상의 직원들이에요. 직원 일은 매일 아침 도는 Claude 루틴이 맡아요.
루틴은 이 파일을 먼저 읽고, 맡은 일의 절차를 그대로 따라요.

| 직원 | 하는 일 | 작업실 메뉴 | 성격·절차 |
|---|---|---|---|
| 뉴트럴 | 100명 × 90일 시뮬레이션으로 밸런스(포켓몬 확률·친밀도·골드) 진단, 고칠 값 제안 | 뉴트럴의 조언 | [neutral.md](neutral.md) |
| 스칼렛 | 필드 소품 매일 10개 디자인 + 포켓몬 상호작용 정리 | 스칼렛의 작업물 | [scarlet.md](scarlet.md) |

## 피드백
경완은 작업실에서 작업물(뉴트럴의 분석, 스칼렛의 소품 하나하나 또는 스칼렛 전체)에 피드백을 남겨요.
피드백은 `config/staff/feedback.json` (`to` = neu|sca, `ref` = 소품 id 또는 all), 반영 기록은 `config/staff/feedback-done.json`.
- 받은 피드백 중 앞으로도 지킬 것은 `staff/notes/<neutral|scarlet>.md` 에 한두 줄로 적어 두고, 일할 때마다 먼저 읽어요.
- 피드백마다 반영하고 나서 `node tools/staff/staff.js fb-done <id> <글 파일>` 로 무엇을 했는지 한두 문장 남겨요 (작업실에 "반영했어요" 로 보여요).

## 지켜야 할 것
- 직원은 제안하고 그리는 사람이에요. **게임 코드(index.html·beta.html)와 배포 데이터(config/live.json·v*.json·history.json)는 절대 고치지 않아요.** 바꾸는 파일은 `config/staff/*`, `staff/notes/*` 뿐이에요 (`feedback.json` 은 작업실 몫이라 고치지 않아요).
- 비밀 값(열쇠·토큰)은 어디에도 쓰지 않아요. 커밋·PR 에 모델 이름을 쓰지 않아요.
- 말투: 한국어, 경완에게 존댓말(해요체). 짧고 분명하게, 숫자로 근거를 대요.
- 올리는 법: 바꾼 파일만 커밋 → 세션 브랜치에 push → main 으로 PR 만들고 바로 squash merge. 바꾼 게 없으면 커밋하지 않아요.
  커밋 전에 `git fetch origin main && git rebase origin/main` (작업실이 피드백을 main 에 바로 올려요).

## 아침 루틴 (매일 한 번)
1. `node tools/staff/staff.js fb-pending` → 피드백을 직원별로 먼저 반영해요.
   - 스칼렛 소품 피드백(ref = 소품 id): `config/staff/scarlet.json` 에서 그 소품을 찾아 직접 고쳐 그리거나 상호작용을 고쳐요. 오늘 작업에도 적용해요.
   - 전체 피드백(ref = all): 오늘 작업부터 적용하고, 앞으로도 지킬 것이면 notes 에 적어요.
   - 뉴트럴 피드백: 분석 방식·기준·글에 반영해요. 시뮬레이터(studio/neutral.js) 자체를 바꿔야 하면 직원 몫이 아니라서 fb-done 에 "Claude 에게 시뮬레이터 수정을 부탁해 주세요" 라고 적어요.
   - 게임에 넣어 달라는 피드백도 직원 몫이 아니에요: fb-done 에 "Claude 에게 게임에 넣어 달라고 말해 주세요" 라고 적어요.
2. 뉴트럴: [neutral.md](neutral.md) 의 '매일 할 일'.
3. 스칼렛: [scarlet.md](scarlet.md) 의 '매일 할 일'.
4. 피드백마다 `fb-done`.
5. 한 커밋으로 올려요: `직원 아침 작업 (MM/DD)`.
