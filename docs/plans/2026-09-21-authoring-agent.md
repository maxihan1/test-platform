# 작성 에이전트 — 명령 한 줄에 기획서에서 초안 PR 까지

등급: 2 · 갈래: 없음 (GUARD·DOC) · 2026-09-21

## 도메인 정리

**제품 도메인을 건드리지 않는다.** 계약 넷(kit 타입 · 러너 HTTP · DB 표 · Admin API) 어느 것도
바뀌지 않는다. `docs/spec/**` 는 한 줄도 안 고친다.

게이트 0 에서 **대기줄 API · 새 표 · 새 도메인 장을 이번 범위에서 뺐다.** 이유는
「대기줄을 지금 만들면 거기에 요청을 넣을 사람이 없다」였다 — 화면이 다음 단계라서다.
그 SPEC 작업 10곳은 **대기줄·화면 작업으로 통째로 넘어갔다.**

만드는 것은 `scripts/` 에 껍데기 하나와 그 안의 순수 함수 셋이다.

## 왜

1단계(`tpx-cases` 스킬)가 병합됐고 2회차 실측까지 끝났다. 하지만 **그것을 돌리려면
사람이 Claude Code 앞에 앉아 체인을 몰아야 한다.** 이 작업은 그 몰이를 명령 한 줄로 바꾼다.

```
npm run authoring-agent -- docs/cases/TODO-기획서.md
```

### 어디까지 자동이고 어디부터 사람인가 — 이 경계가 설계의 중심이다

```
기획서 → [자동] 요구사항 표 → 케이스 → .spec.ts → 관문 넷 → 초안 PR
                                                              ↓
                                                    🛑 [사람] 게이트 2 → 병합
```

**병합은 구조적으로 사람 몫이다.** `claude -p` 는 비대화형이고 체인에는 사람 게이트가 셋 있다.
계획서 원안은 「CI·머지까지」라고 적었지만 **머지를 자동으로 만들려면 게이트를 없애야 하고,
게이트는 이 저장소가 사고 뒤에 세운 장치다** (2026-09-17 에 두 번, 먼저 병합돼 뒤 커밋이 누락).
없애지 않는다. 자동화의 끝은 **초안 PR** 이다.

### 과금이 기능이 아니라 안전 요건이다

사용자 요구는 **「추가 비용이 하나도 없어야 한다」**. `claude -p` 는 평소 구독 한도를 쓰지만
**환경에 API 키가 있으면 OAuth 를 건너뛰고 무조건 실비 청구**된다
(이틀에 $1,800 청구 사례 — anthropics/claude-code#37686).

**실측으로 더 나쁜 것을 하나 더 찾았다.** `claude --bare` 는 도움말이 이렇게 적었다.

> Anthropic auth is **strictly ANTHROPIC_API_KEY** or apiKeyHelper via --settings
> (**OAuth and keychain are never read**)

**깃발 하나가 구독을 실비로 바꾼다.** 환경변수만 막으면 안 되고 **우리가 거는 인자도 막아야 한다.**
그래서 인자를 만드는 함수 자체를 검사 대상으로 둔다.

### 단위 검사를 어디에 두나 — ① 을 고른다

`npm test`(vitest)는 `apps/**` 와 `packages/**` 만 본다 (`vitest.config.ts:7`).
`scripts/**` 에 검사를 둬도 안 돈다. 선택지 셋 중 **① vitest include 에 `scripts/**` 를 더한다.**

| | 왜 고르거나 버렸나 |
|---|---|
| **① vitest include 확장** | **고른다.** `vitest.config.ts` 는 이미 GUARD 표면이라 등급이 안 오른다. **CI 가 `npm test` 를 3회 돌리므로 새 CI 줄이 필요 없다** |
| ② `node --test` + `check:workflow` | 버린다. **CI 에 줄을 이어야 하는데 그것을 빠뜨리는 사고가 이미 있었다** — LEARNINGS 253줄 3회차가 바로 「CI 파일이 미분류라 검사가 영영 안 돌 뻔했다」다 |
| ③ 알맹이를 `apps/admin/src/**` 로 | 버린다. **서버에서 절대 안 도는 코드**를 서버 폴더에 둔다. 컨텍스트 경계가 흐려진다 |

### 비대화형에서 게이트는 「막히는」 게 아니라 「거부된다」

`claude --help` 실측 — `--permission-prompts none` 은
「anything that would prompt is **denied automatically**」다.
그래서 `tpx-cases` §3 의 내부 게이트(`AskUserQuestion`)는 **조용히 멈추지 않고 거부로 돌아온다.**
스킬을 고치지 않는다. **프롬프트가 「게이트 대신 표를 PR 본문에 싣고 계속하라」고 지시**하고,
`--disallowedTools` 로 그 도구를 아예 막아 거부가 오가는 왕복도 없앤다.

## Plan

### 할 일 1. `npm test` 가 `scripts/` 의 검사를 보게 한다

- **RED** — `scripts/authoring-agent.test.ts` 에 `it('검사 자리가 잡혔다', () => expect(1).toBe(1))`
  하나를 두고 `npm test` 를 돌리면 **그 파일이 아예 안 잡힌다.** 통과도 실패도 아닌 「0건」이 RED 다
- **GREEN** — `vitest.config.ts` 의 `include` 에 `scripts/**/*.test.ts` 를 더한다
- **REFACTOR** — CLAUDE.md §3 「단위 테스트 위치」에 이 자리를 한 줄 더한다.
  CLAUDE.md §2.5 표가 「규칙 추가는 직접」으로 지정한 자리다

**files**: `vitest.config.ts` · `scripts/authoring-agent.test.ts` · `CLAUDE.md`
**depends-on**: []
**검증**: `npm test -- scripts` 가 그 파일을 잡고 통과한다

### 할 일 2. 과금 위험 환경변수를 보면 거부한다

- **RED** — `과금위험({ ANTHROPIC_API_KEY: 'sk-x' })` 이 `['ANTHROPIC_API_KEY']` 를 돌려주길
  단언한다. `ANTHROPIC_AUTH_TOKEN` 도, 둘 다 있으면 둘 다. **빈 환경이면 빈 배열.**
  **빈 문자열은 위험이 아니다** — `ANTHROPIC_API_KEY=''` 로 지운 환경을 막으면 못 쓴다
- **GREEN** — `export function 과금위험(env: NodeJS.ProcessEnv): string[]`
- **REFACTOR** — 없음

**files**: `scripts/authoring-agent.ts` · `scripts/authoring-agent.test.ts`
**depends-on**: [1]
**검증**: `npm test -- scripts`

### 할 일 3. 인자를 읽고 기획서가 실제로 있는지 본다

- **RED** — `인자읽기([])` 가 쓰는 법을 담은 오류를 내고, `인자읽기(['없는파일.md'])` 가
  「그 파일이 없다」를 내고, `인자읽기(['docs/cases/TODO-기획서.md'])` 가
  `{ 기획서: '...', 서비스: undefined }` 를 돌려주길 단언한다.
  `--service TODO` 를 붙이면 `서비스: 'TODO'` 다
- **GREEN** — `export function 인자읽기(argv: string[]): { 기획서: string; 서비스?: string }`.
  없는 파일은 던진다
- **REFACTOR** — 없음

**files**: `scripts/authoring-agent.ts` · `scripts/authoring-agent.test.ts`
**depends-on**: [1]
**검증**: `npm test -- scripts`

### 할 일 4. `claude` 에 거는 인자를 만든다 — 여기가 과금 안전핀의 둘째 문이다

- **RED** — `클로드인자({ 기획서: 'x.md' })` 가 돌려주는 배열에 대해 넷을 단언한다.
  ① **`--bare` 가 들어 있지 않다** (그 깃발 하나가 구독을 실비로 바꾼다)
  ② `-p` 가 있다 (비대화형)
  ③ `--disallowedTools` 로 `AskUserQuestion` 을 막는다
  ④ 마지막 원소인 프롬프트에 기획서 경로와 **「초안 PR 까지만」** 지시가 들어 있다
- **GREEN** — `export function 클로드인자(입력): string[]`. 프롬프트 본문은 같은 파일의 상수
- **REFACTOR** — 프롬프트가 길어 파일이 300줄에 가까워지면 `scripts/authoring-prompt.ts` 로 가른다

**files**: `scripts/authoring-agent.ts` · `scripts/authoring-agent.test.ts`
**depends-on**: [1]
**검증**: `npm test -- scripts`

### 할 일 5. 껍데기를 잇고 `npm run authoring-agent` 로 부를 수 있게 한다

- **RED** — 없다. **여기는 I/O 껍데기라 단위 검사를 쓰지 않는다** — `scripts/run-scheduled.ts`
  선례와 같다(알맹이는 검사된 함수에 있고 껍데기에는 검사가 없다).
  대신 **연기 확인**으로 판정한다. `ANTHROPIC_API_KEY=sk-가짜` 를 준 채 돌리면
  **claude 를 부르기 전에 0 이 아닌 코드로 죽어야 한다**
- **GREEN** — argv 읽기 → 과금위험 검사 → 클로드인자 → `spawn('claude', 인자, { stdio: 'inherit' })`
  → 그 종료 코드로 끝낸다. 파일 머리에 한국어 한 줄 주석 (무엇을·왜 이 모양인지)
- **REFACTOR** — 없음

**files**: `scripts/authoring-agent.ts` · `package.json`
**depends-on**: [2, 3, 4]
**검증**: `ANTHROPIC_API_KEY=sk-가짜 npm run authoring-agent -- docs/cases/TODO-기획서.md` 가
**0 이 아닌 코드**로 끝나고 거부 사유를 찍는다. 그다음 키 없이 `--help` 격으로 인자 없이 돌리면
쓰는 법을 찍는다

### 할 일 6. 사람이 쓰는 법을 적는다

- **RED** — 없음 (문서)
- **GREEN** — `docs/SETUP.md` 에 절 하나 — 무엇을 하는 명령인지 · 무엇이 자동이고
  **어디부터 사람인지** · 과금 안전핀이 무엇을 막는지. `docs/progress/WS-C.md` 에 진행 기록
- **REFACTOR** — 없음

**files**: `docs/SETUP.md` · `docs/progress/WS-C.md`
**depends-on**: [5]
**검증**: `npm run check:spec` EXIT=0 · 문서를 읽고 그대로 따라 할 수 있는지 눈으로

## SPEC 동반 수정 (§2.7)

**해당 없음 — SPEC 을 안 건드린다.** 게이트 0 에서 계약 변경을 통째로 뺐다.

넘긴 것 10곳(새 장 · §6 새 표 · 색인 네 곳 · 컨텍스트 지도 · 유비쿼터스 언어 ·
`도메인/인증` §7 최소 등급 · WORKSTREAMS 킥오프 · WORKFLOW · `surfaces.mjs` 미분류)은
**대기줄·화면 작업이 받는다.** PR #41 의 [2] 코멘트에 목록이 그대로 있다.

**`surfaces.mjs` 미분류 건은 이번엔 안 샌다** — `apps/admin/src/authoring/` 을 안 만들게 됐다.

## Plan 메타

할 일 6개 · 예상 묶음 3개 (1 → 2·3·4 병렬 → 5 → 6) · 구현 규율: TDD ·
추가 검증: `npm run typecheck` · `npm run check:deps` · `npm test` 3회 연속

## 리뷰 결과

**렌즈**: 독립 엔지니어링 검토 (2등급 지정 렌즈 `gstack:/plan-eng-review` 는 **이 기계에 설치돼 있지 않다** — 같은 몫의 독립 검토로 대신했고 부재를 게이트 1 에 싣는다) · 2026-09-21
**판정**: **BLOCKER 3건 · 주의 3건 · 참고 1건**

### BLOCKER 1 — 자식 세션의 권한을 아무도 안 정했다. 그 세션은 파일을 한 줄도 못 쓴다

할 일 4 의 단언 넷에 **권한 깃발이 하나도 없다.** 터미널에서 `spawn('claude', ...)` 로 띄우면
물어볼 상대가 없어 Write·Edit 이 **자동 거부**된다. 상속되는 사용자 설정의 `permissions.allow` 에도
쓰기 관련 항목이 **0개**다.

**나중에 무엇이 잘못되나** — 첫 실전 실행이 케이스 파일을 **한 개도 못 만들고**,
`claude -p` 가 「권한이 없어 못 했습니다」를 찍은 뒤 **종료 코드 0** 으로 끝난다.
스크립트는 그 0 을 성공으로 보고한다. **한도만 태우고 산출물 0.**

### BLOCKER 2 — 여섯 할 일을 다 끝내도 이 도구가 제 일을 한 적이 한 번도 없다

할 일 5 의 검증 둘은 **`claude` 에 닿기 전**에 끝나고(가짜 키로 죽기 · 쓰는 법 찍기),
1~4 는 순수 함수 검사, 6 은 문서다. **끝에서 끝까지 한 번 돌려 보는 검증이 계획에 없다.**

**나중에 무엇이 잘못되나** — BLOCKER 1·3 이 전부 「완료」 보고를 통과해 사람 손에 넘어간다.
사용자가 확인 방법대로 **처음 돌리는 그 순간이 첫 통합 검사**가 된다 (CLAUDE.md §8 위반).

### BLOCKER 3 — pre-push 훅이 무인 실행의 첫 push 를 막는다 (실측 확인)

`.claude/hooks/pre-push` 가 오늘 날짜의 `docs/reviews/<오늘>-*.md` 를 요구한다.

```
$ ls docs/reviews/ | grep 2026-09-21
2026-09-21-실행상태.md · 2026-09-21-여러건실행.md · 2026-09-21-청사진스킨.md
```

**오늘 통과하는 것은 다른 세션들이 오늘 만들어 둔 파일 덕이다.** 내일 아침 무인 실행에는 없다.
`tpx-start` 가 초안 PR 을 열려면 `git push` 를 먼저 해야 하는데 거기서 막힌다.
게다가 `npm test` 도 훅이 돌리는데 그 안에 **실제 Postgres 를 쓰는 검사**가 있다 — 안 떠 있으면 역시 막힌다.

**나중에 무엇이 잘못되나** — 무인 실행이 관문 넷까지 초록을 내고 **push 에서 죽는다.**
결과가 작업방에 갇히고 PR 이 안 열려 **사람이 볼 것이 없다.**
더 나쁜 쪽 — 훅이 에러 문구에 `git push --no-verify` 를 친절히 적어 두었다.
**에이전트가 그대로 따라 하면 저장소가 사고 뒤에 세운 검사를 무인으로 건너뛴다.**
계획에는 `push` 라는 낱말이 한 번도 안 나온다.

### 주의 1 — 과금 안전핀이 `process.env` 만 본다

설정 파일의 `apiKeyHelper` 와 `env` 블록, 그리고 3P 제공자(`CLAUDE_CODE_USE_BEDROCK`·`_VERTEX`·`_FOUNDRY`)가
사각지대다. **지금은 잠재 위험이다** — 사용자 설정에 그 키들이 없는 것을 확인했다.

**나중에 무엇이 잘못되나** — 반년 뒤 누가 편의로 `apiKeyHelper` 한 줄을 넣는다.
환경변수가 깨끗하니 안전핀은 초록불을 내고, 그때부터 모든 실행이 **조용히 실비로** 돈다.

**처방이 서로 부딪친다** — `--setting-sources project` 로 사용자 설정을 끊으면 이 구멍이 막히지만
**BLOCKER 1 이 필요로 하는 `permissions.allow` 도 같이 끊긴다.** 골라야 한다.

### 주의 2 — 「`--bare` 가 없다」는 부정 단언은 다음 편집을 못 막는다

인자가 **늘어나도 그대로 초록**이다. `--settings /tmp/x.json` 을 뒤에 붙이면 검사는 안 깨지고
그 파일의 `apiKeyHelper` 가 주의 1 을 현실로 만든다.
**배열 전체를 기대 배열과 통째로 비교하는 편이 더 짧고 더 세다** — 인자가 하나라도 늘면 깨져서
고치는 사람이 과금 규칙을 반드시 다시 읽는다.

### 주의 3 — 연기 확인이 「우리가 막았다」와 「claude 가 가짜 키로 실패했다」를 못 가른다

막고 싶은 것은 **순서**(과금 검사 → spawn)가 뒤집히는 것인데, 뒤집혀도 가짜 키로 불린 `claude` 가
0 아닌 코드를 낸다. **같은 초록이다.** 누가 리팩터링하다 spawn 을 검사 위로 올리면 통과하고,
**진짜 키가 있는 환경에서 그 요청은 실제로 나간다.**
→ 종료 코드가 아니라 **거부 사유 문구를 `grep`** 한다.

### 참고 — 「2·3·4 병렬」은 성립하지 않는다. 할 일 1 은 없애는 편이 낫다

2·3·4 의 `files` 가 셋 다 같은 두 파일이라 **동시에 못 고친다.** 「묶음 3개」는 틀렸다.
그리고 할 일 1 의 RED 는 무늬를 오타 내도 똑같이 빨강이라 **원인을 구분 못 하는 빨강**이고
`expect(1).toBe(1)` 자리지킴이를 남긴다.
→ **할 일 1 을 없애고 할 일 2 의 진짜 검사를 첫 RED 로 쓴다.** 빨강이 두 단계로 난다 —
「파일을 못 찾는다」(→ `include` 를 고친다) → 「`과금위험` 이 없다」(→ 함수를 만든다).

**곁다리** — 할 일 1 의 REFACTOR 가 CLAUDE.md §3 을 고치는데, 기존 문장이
「플랫폼 코드의 단위 테스트는 **각 앱 안에** 둔다」라서 **규칙 추가가 아니라 수정**으로 읽힐 수 있다.
§2.5 표상 수정은 승인이 필요하다.

### 통과한 것

- **등급 2 판정이 실측과 맞다** — 계획의 `files` 전부로 `detect-tier` 를 돌려
  `등급 2 · GUARD·TESTS·HARNESS·DOC` 확인. 미분류 안 샌다
- **선택지 ① 의 근거가 사실이다** — CI 가 `npm test` 를 3회 돌리므로 `include` 만 넓히면 새 CI 줄이 필요 없다
- **계약 변경 0 건이 사실이다** — 계약 넷 어느 것도 `files` 에 없다. 「SPEC 동반 수정 해당 없음」이 맞다
- **자동화를 초안 PR 에서 끊은 판단이 옳다** — `gh pr ready` 는 `tpx-merge` 한 곳뿐이고
  판별식 `pr-draft-guard` 가 강제한다. 더 가려면 2026-09-17 사고 둘을 되돌려야 한다.
  **다만 지금 그려진 경계는 도달 자체가 안 된다**(BLOCKER 3) — 경계를 옮길 게 아니라 길을 뚫어야 한다
- `--disallowedTools` 로 `AskUserQuestion` 을 막아 거부 왕복을 없앤 판단은 정확하다
- 할 일 5 에 단위 검사를 안 두는 **예외 자체는 정당하다** (선례와 같은 모양, 고정할 판단이 없다).
  부족한 것은 대체물이다 (주의 3)
