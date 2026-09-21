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
