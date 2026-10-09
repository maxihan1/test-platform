# 소유 경로 가드를 걷어낸다

등급: 2 · 갈래: 없음 (하네스) · 2026-09-18

## 도메인 정리

**제품 도메인 건드리지 않음.** 계약 넷 전부 무관하고 `docs/spec/**` 12장에
`ownership` · `WORKSTREAM` 이 한 번도 안 나온다.

`docs/spec/공통/7-데모와-완료.md:53` 과 `docs/SPEC.md:181` 이 `WORKSTREAMS.md` 를
**문서로** 가리키는데, 그 문서는 남기므로 고칠 것이 없다.

## 왜

**한 번도 켜진 적이 없다.** 소유 경로 검사는 `WORKSTREAM` 환경변수로 갈래를 알려 줘야 도는데,
`tpx-start` 가 안내하던 `export WORKSTREAM=C` 가 훅에 안 닿는다 — 훅은 별도 프로세스다.
`docs/HOOKS.md:114` 가 같은 말을 이미 적고 있었고 `:133` 이 반대로 적고 있었다.

**전제도 사라졌다.** 이 모델은 여러 세션이 동시에 도는 것을 막으려던 것이다 —
`WORKSTREAMS.md` 에 「각 세션에 하나씩」·「세션 수 조절」이 그대로 있다.
`/tpx` 는 한 세션에서 순차로 돈다. **막을 충돌이 없다.**

**산문만 남기면 안 된다.** `CLAUDE.md §1.2` 가 적어 뒀다 — 「계약이라 적혀 있는데 장치가
없으면, 장치를 더하거나 산문을 고쳐 둘을 맞춘다」. 그래서 §1.1 을 같이 낮춘다.

### 관찰 — `protected` 모드도 아무것도 안 막는다 (이번 범위 밖)

`LOCKED = []` 라 `protected` 모드와 bash 모드의 잠금 분기가 둘 다 빈 배열을 순회한다.

**이건 사고가 아니라 결정이다.** `CLAUDE.md §1.3` 이 「2026-09-17 잠금 목록을 비웠다.
이제 막는 장치가 없다」고 적었고 `spec-review A1~A3` 이 사후 검사를 맡는다.
목록을 다시 채울 수 있는 구조라 **이번에 걷어내지 않는다.** 판단이 필요하면 별건으로 연다.

## Plan

### 할 일 1. 배선과 구현이 맞는지 보는 판별식을 더한다

지금은 `settings.json` 이 부르는 모드와 `guard.mjs` 가 구현한 모드를 **대조하는 것이 없다.**
한쪽만 지우면 훅이 조용히 아무 일도 안 하거나, 구현이 죽은 채 남는다.

- **RED** — 없음. 지금은 양쪽이 5개로 같아서 추가하면 바로 초록이다.
  **할 일 2 가 이 테스트를 빨갛게 만든다** — 그것이 이 판별식의 비-공허 증거다
- **GREEN** — `settings.json` 을 **`JSON.parse` 로 읽어** 훅 명령에서 모드를 뽑고,
  `guard.mjs` 에서 `mode === '<이름>'` 을 뽑아 **차집합이 양방향 0** 인지 단언.
  **양쪽 개수가 0 이 아닌지를 먼저 단언한다** — 없으면 파싱이 빗나가도 초록이다 (검토 주의 2)
- **REFACTOR** — 파일 머리에 「무엇을 맡는가」 한 줄. `hook-contract` 는 pre-push 훅,
  이 파일은 `settings.json` 배선을 본다 (검토 주의 3)

**files**: `.claude/scripts/guard-wiring.test.mjs`
**depends-on**: []
**검증**: `node --test .claude/scripts/guard-wiring.test.mjs` 종료 코드 `0`

### 할 일 2. `settings.json` 에서 ownership 훅 배선을 뺀다

- **RED** — 할 일 1 의 판별식이 빨강. 구현에는 `ownership` 이 있는데 배선에 없다
- **GREEN** — 없음. 이 할 일은 일부러 빨강을 만든다. 할 일 3 이 초록으로 돌린다
- **REFACTOR** — 없음

**files**: `.claude/settings.json`
**depends-on**: [1]
**검증**: `node --test .claude/scripts/guard-wiring.test.mjs` 가 **빨강** ·
`grep -c ownership .claude/settings.json` 이 `0`

### 할 일 3. `guard.mjs` 에서 소유 경로 판정을 들어낸다

- **RED** — 할 일 2 에서 이미 빨강
- **GREEN** — 여섯을 지운다 — `OWNED` 표 · `SHARED` · `ownershipMsg()` · `ownedPaths()` ·
  bash 모드의 `if (wsInfo && wsInfo[1])` 분기 · `if (mode === 'ownership')` 블록
- **REFACTOR** — `lockedMsg()` 와 `LOCKED` 는 **남긴다.** `protected` 모드가 아직 쓴다

**files**: `.claude/scripts/guard.mjs`
**depends-on**: [2]
**검증**: `node --test .claude/scripts/guard-wiring.test.mjs` 초록 ·
`node --test .claude/scripts/guard.test.mjs` 초록 (기존 5건이 안 깨졌는지) ·
`grep -c "mode === 'ownership'" .claude/scripts/guard.mjs` 가 `0`
(**낱말 전체를 세지 않는다** — 왜 지웠는지를 주석으로 남기면 그 순간 조건이 깨진다.
개명 PR 에서 같은 덫에 한 번 걸렸다. 실행 경로만 본다 — 검토 주의 1)

### 할 일 4. `CLAUDE.md §1.1` 을 절대 규칙에서 빼 범위 안내로 낮춘다

지금 §1 의 제목이 「절대 규칙 (어기면 병렬 작업이 깨진다)」인데 병렬 작업이 없다.

- **RED** — 없음 (문서). `npm run check:spec` 이 절 번호·링크를 본다
- **GREEN** — §1.1 을 「담당 폴더 밖을 수정하지 않는다」에서
  **「한 번에 한 갈래만 — 범위가 번지지 않게」** 로 바꾸고, 기계가 안 막는다는 사실을 명시
- **REFACTOR** — 없음. **절 번호 `1.1` 은 그대로 둔다** (영구 주소, §2.7 ③)

**files**: `CLAUDE.md`
**depends-on**: []
**검증**: `npm run check:spec` 종료 코드 `0` ·
`grep -c '어기면 병렬 작업이 깨진다' CLAUDE.md` 가 `0`

### 할 일 5. 안내 문서 셋에서 사라진 장치를 지운다

초록불이 거짓말하지 않게 맞춘다 (§2.7 ④).

- **RED** — 없음 (문서)
- **GREEN** — **일곱 자리**를 고친다 (검토 BLOCKER 1 로 넷이 늘었다)
  - `docs/HOOKS.md` — 「워크스트림 지정」 절과 훅 목록의 `ownership` 행
  - `.claude/skills/tpx-start/SKILL.md` — Step 2 의 `WORKSTREAM` 블록과 출력 서식의 잠금 줄
  - `.claude/skills/spec-review/SKILL.md` — C1 을 「기계가 안 본다, 눈으로 본다」로
  - **`CLAUDE.md:199`** (§2.7 ④) — 「소유 밖이면 그 갈래 킥오프에 넘긴다(§1.1)」
  - **`.claude/skills/tpx-plan/SKILL.md:34`** — 분해 규칙 6번 「**멈춘다**」
  - **`.claude/skills/tpx-plan/SKILL.md:135`** — 엣지 「소유 경로 밖 파일이 필요하다 — 멈춘다」
  - **`.claude/skills/tpx-spec/SKILL.md:111,138`** — 「그 갈래 킥오프에 넘긴다」
- **REFACTOR** — 없음

**★ 이 넷이 BLOCKER 였던 이유.** `tpx-plan` 규칙 6번은 **계획 단계를 실제로 멈추라는 지시**다.
§1.1 만 낮추고 이 줄을 두면 다음 `/tpx` 가 지도에 불과한 표를 보고 멈춘다.

**`§1.1` 을 일괄 치환하지 않는다.** 문서마다 다른 것을 가리킨다 —
`CLAUDE.md §1.1` 은 소유 경로, **`SPEC §1.1` 은 「나중에 하는 것」**이다.
`docs/SETUP.md:171` 과 `docs/spec/도메인/리포팅.md:57` 의 `§1.1` 은 SPEC 쪽이라 **건드리지 않는다.**

**files**: `docs/HOOKS.md` `.claude/skills/tpx-start/SKILL.md` `.claude/skills/spec-review/SKILL.md`
`CLAUDE.md` `.claude/skills/tpx-plan/SKILL.md` `.claude/skills/tpx-spec/SKILL.md`
**depends-on**: []
**검증**: `npm run check:workflow` 종료 코드 `0` ·
`grep -rn '소유 경로 밖' .claude/skills/ CLAUDE.md` 에 **「멈춘다」·「넘긴다」가 없다** ·
`grep -c 'WORKSTREAM=' docs/HOOKS.md` 가 `0`

## 안 고치는 것

| 무엇 | 왜 |
|---|---|
| `docs/WORKSTREAMS.md` 소유 경로 표 | **어디가 무슨 일을 하는지 지도다.** `tpx-plan` 의 작업 원천이고 `docs/spec/**` 두 곳이 가리킨다 |
| `guard.mjs` 의 `protected` · `LOCKED` · `lockedMsg` | 의도적으로 비운 것이지 죽은 것이 아니다 (`CLAUDE.md §1.3`). 다시 채울 수 있다 |
| 옛 계획서·검사 기록의 `WORKSTREAM` 언급 | 끝난 일의 기록이다. 소급해 고치지 않는다 |

## SPEC 동반 수정 (§2.7)

**해당 없음 — SPEC 안 건드림.** `docs/spec/**` 와 `docs/SPEC.md` 가 diff 에 없다.

§2.7 ④ 목록 중 `docs/HOOKS.md` 와 `spec-review` 는 §2.7 때문이 아니라
**이번 작업 자체의 대상**이라 할 일 5 에 넣었다.

## Plan 메타

할 일 5개 · 예상 묶음 3개 · 구현 규율: TDD ·
추가 검증: `npm run check:workflow && npm run check:spec && npm test`

묶음 1 — 할 일 1 · 4 (`files` 안 겹침)
묶음 2 — 할 일 2 (1 에 의존) · 할 일 5 (**`CLAUDE.md` 가 할 일 4 와 겹쳐 자동 직렬화**)
묶음 3 — 할 일 3 (2 에 의존)

게이트 1 에서 `지적 반영하고 진행` 을 골랐다 (2026-09-18). 반영한 것 셋 —
할 일 5 에 참조 네 곳 추가(BLOCKER 1) · 할 일 3 합격 조건을 실행 경로로 좁힘(주의 1) ·
할 일 1 을 `JSON.parse` 로 못 박고 개수 0 단언 추가(주의 2·3).
**재검토하지 않는다.** 결과는 게이트 2 가 본다.

## 리뷰 결과

**렌즈**: `plan-eng-review` (2등급 = 1종) · 2026-09-18
**판정**: BLOCKER 1건 · 주의 3건

### BLOCKER 1 — 「소유 경로 밖이면 멈춘다」고 지시하는 자리 넷을 할 일이 안 잡았다

할 일 5 가 `tpx-start` · `spec-review` · `HOOKS.md` 셋만 본다. 실측하니 **넷이 더 있다.**

| 어디 | 무엇이라 적혀 있나 |
|---|---|
| `CLAUDE.md:199` (§2.7 ④) | 「소유 밖이면 고치지 말고 그 갈래 킥오프에 항목으로 넘긴다(§1.1)」 |
| `.claude/skills/tpx-plan/SKILL.md:34` | 「소유 경로 밖이 `files` 에 있으면 **멈춘다**」 (분해 규칙 6번) |
| `.claude/skills/tpx-plan/SKILL.md:135` | 「소유 경로 밖 파일이 필요하다 — 멈춘다」 |
| `.claude/skills/tpx-spec/SKILL.md:111,138` | 「소유 밖이면 고치지 말고 그 갈래 킥오프에 넘긴다」 |

**나중에 무엇이 잘못되나.** `tpx-plan` 의 규칙 6번은 **계획 단계를 실제로 멈추라는 지시**다.
§1.1 을 낮춰 놓고 이 줄을 그대로 두면, 다음 `/tpx` 가 지도에 불과한 표를 보고 멈춘다.
이번 개명 PR 에서 `code-review` 가 「기억 파일을 빠뜨렸다」로 잡은 것과 **같은 유형**이다 —
장치를 지우면서 그것을 가리키는 자리를 다 훑지 않았다.

### 주의 1 — 할 일 3 의 합격 조건이 주석을 못 쓰게 만든다

`grep -c 'WORKSTREAM\|ownership\|OWNED\|SHARED' .claude/scripts/guard.mjs` 가 `0`.

**왜 문제인가.** 「왜 지웠는지」를 주석으로 남기면 그 순간 조건이 깨진다.
이 저장소는 되돌린 결정에 근거를 남기는 쪽이다 (`CLAUDE.md §2.7 ②`,
`LOCKED = []` 위의 「2026-09-17 비움 —」 주석이 실제 사례다).
**바로 이 PR 에서 같은 덫에 한 번 걸렸다** — 개명 때 할 일 6 의 `grep '/tp'` 조건이
영원히 통과 못 했다. 조건을 **실행 경로**(`mode === 'ownership'` 이 없다)로 좁혀야 한다.

### 주의 2 — 배선 대조를 정규식으로 하면 JSON escaping 에 묶인다

할 일 1 이 `settings.json` 에서 모드를 뽑는 방법을 안 정했다. 문자열 매칭으로 하면
`\"` escaping 이나 줄바꿈이 바뀔 때 조용히 0개를 뽑고 **차집합이 0 이라 초록**이 된다.

**`JSON.parse` 로 읽어야 한다.** 그리고 양쪽에서 뽑은 개수가 **0 이 아닌지**를 먼저 단언한다 —
그게 없으면 공허하게 통과하는 길이 남는다.

### 주의 3 — 새 파일 대신 기존 판별식에 넣을 자리가 있는지 보지 않았다

`hook-contract.test.mjs` 가 이미 훅 계약을 맡는다. 실측하니 **`settings.json` 은 안 본다**
(pre-push 훅만 본다) — 그래서 새 파일이 중복은 아니다.

다만 이름이 갈린다. 훅 배선을 보는 판별식이 둘(`hook-contract` · `guard-wiring`)이 되고
**어느 쪽에 새 단언을 넣을지가 다음 세션에 모호해진다.** 파일을 새로 만들 거면
각 파일 머리에 「무엇을 맡는가」 한 줄을 적어 가른다.

### 통과한 것

- **배선과 구현이 지금 5:5 로 같다** (`bash` `ownership` `protected` `review` `tests`).
  할 일 1 이 초록으로 들어오고 할 일 2 가 빨갛게 만든다는 계획의 전제가 참이다
- **`protected` 를 이번 범위에서 뺀 판단이 옳다.** `CLAUDE.md §1.3` 이 비운 이유와
  대체 검사(`spec-review A1~A3`)를 적어 뒀다 — 죽은 코드가 아니라 비운 목록이다
- **`lockedMsg` 를 남기는 것이 맞다.** `protected` 모드가 아직 쓴다
- **`docs/WORKSTREAMS.md` 를 남기는 판단이 옳다.** `docs/spec/공통/7-데모와-완료.md:53` 과
  `docs/SPEC.md:181` 이 가리킨다 — 지우면 SPEC 링크가 깨져 3등급이 됐을 것이다
- **손으로 적은 훅 개수가 없다** (§2.7 ⑤ 해당 없음). `HOOKS.md` · `CLAUDE.md` 둘 다 0건
- **절 번호 `1.1` 을 유지하는 판단이 옳다.** 다만 아래 참고 — `§1.1` 은 **문서마다 다른 것**을
  가리킨다 (`CLAUDE.md §1.1` = 소유 경로 / `SPEC §1.1` = 나중에 하는 것).
  `docs/SETUP.md:171` 과 `docs/spec/도메인/리포팅.md:57` 의 `§1.1` 은 SPEC 쪽이라 **건드리면 안 된다**
