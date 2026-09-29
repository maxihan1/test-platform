# 보류 케이스도 코드로 — 작성 화면에서 사람이 값 입력·제거

등급: 3 · 갈래: WS-작성 (+ KIT · WS-A · WS-E) · 2026-09-29 · PR #108

## 도메인 정리

- BC: 작성(§3.6) 중심. 공유 타입(kit §5.1) · 명세 선언 K표(공통/2 §4) · 데이터모델(공통/4 §6) · 작성 화면(WS-E)을 같이 흔든다
- 게이트 0 승인 계약 (2026-09-29)
  - kit `CaseSpec.held?: string` — 보류 사유 한 문장. 있으면 실행 때 건너뛴다
  - K10 은 `held` 케이스의 기본값 없는 칸을 허용 · 새 K13 = `held` 는 비지 않은 글자 리터럴
  - `authoring_request.held_input` JSONB — `{ <tcId>: { params?, expected?, removed?, by, at } }`
  - finish `result.held[]` = `{ tcId, file, kind: UNDECIDABLE|ON_HOLD, reason, fields[{ side, key, description, type }] }` — fields 는 에이전트 스크립트가 코드에서 계산, 비밀값 칸 제외
  - `PUT|DELETE /api/authoring/requests/:id/held/:tcId` (작성 write) · 상세 `held[]`·`heldOpen` · merges `409 HELD_OPEN` · claim(MERGE) 에 held 입력 + 원본 target
  - 머지 에이전트 — 값 적기(`.default(값)`) · `held` 빼기 · 제거분 삭제 + `docs/cases` 표 「제거함」 → typecheck·check:tests → 채운 케이스 3회 → 자기 `author-<뿌리>` 브랜치 push → CI → 병합. `held` 가 남거나 3회 중 실패면 FAILED
- 사용자 결정: 값은 코드의 params·expected **기본값**(실행 때 바꿀 수 있음, 하드코딩 아님) · 반영 전 3회 실행

## 왜

5877(데모마켓 대조)에서 요구 15건이 「판정 불가·보류」로 빠졌다. 그 목록은 PR 본문 글로만 남아 누구도 이어받지 못하고,
병합되면 사라진다. 대부분은 기대값 기준이 기획서에 없거나(판정 불가) 전제 값(관리자 계정·대기 시간)이 없어서다 —
사람이 값 하나만 주면 케이스가 된다. 사람이 판정한 값이므로 「기대값은 사람이 판정한 것에서만」 규칙 안이다.

## Plan

### 할 일 1. 명세 — 보류 케이스 절과 통로·칸·K표

- **RED** — `npm run check:spec` 은 새 절·링크를 모른다 (명세 할 일이라 TDD 대신 검사기)
- **GREEN** — 작성.md §3.6 에 「★ 보류 케이스 — 사람이 값을 채운다」 신설(정본) · §7 통로 넷(finish held · PUT/DELETE · 상세 · merges 409 · claim) · 공통/2 §4 K10 예외·K13 · 공통/3 §5.1 `held` · 공통/4 §6 `held_input`. 계약 블록 `상태: 반영 완료`
- **REFACTOR** — 다른 장은 새 절을 가리키기만

**files**: docs/spec/도메인/작성.md, docs/spec/공통/2-명세선언.md, docs/spec/공통/3-공유계약.md, docs/spec/공통/4-데이터모델.md
**depends-on**: []
**검증**: `npm run check:spec`

### 할 일 2. kit — `held` 선언과 실행 건너뛰기

- **RED** — `defineCase({ held: '보류 — 사유' })` 가 spec.held 를 싣고, 공백 사유는 키를 안 싣고, `test(spec)` 이 held 면 건너뛴다는 검사가 실패한다
- **GREEN** — `types.ts` `held?: string` · `defineCase.ts` 가 unconfirmed 와 같은 규칙으로 싣기 · `test.ts` 가 held 면 `test.skip`(사유)
- **REFACTOR** — 없음

**files**: packages/kit/src/types.ts, packages/kit/src/runtime/defineCase.ts, packages/kit/src/runtime/test.ts, packages/kit/src/runtime/defineCase.test.ts
**depends-on**: []
**검증**: `npx vitest run packages/kit`

### 할 일 3. 검사기 — K10 예외 · K13

- **RED** — held 케이스의 기본값 없는 칸이 K10 위반으로 잡히는 검사 · `held: ''`/변수/축약이 K13 으로 안 잡히는 검사가 실패
- **GREEN** — `catalog/rules.ts` K10 에서 held 면 건너뛰기 · K13 을 K11 과 같은 모양 검사로
- **REFACTOR** — K11·K13 공통 모양 검사를 한 함수로

**files**: apps/admin/src/catalog/rules.ts, apps/admin/src/catalog/rules.test.ts
**depends-on**: [2]
**검증**: `npx vitest run apps/admin/src/catalog/rules.test.ts`

### 할 일 4. DB 칸과 저장 — `held_input`

- **RED** — 값 넣기·제거·되돌리기가 `held_input` 에 남고 by·at 이 붙는다는 DB 검사가 실패 (fixture 접두사 `XWL`(XWH 와 겹치지 않게), 자기 service_id 로만 지움)
- **GREEN** — 마이그레이션 `20260929000001_authoring_held.sql` · `authoring/held.ts` 저장 함수(넣기 · 지우기 · 남은 수)
- **REFACTOR** — 없음

**files**: db/migrations/20260929000001_authoring_held.sql, apps/admin/src/authoring/held.ts, apps/admin/src/authoring/held.test.ts, CLAUDE.md(접두사 줄)
**depends-on**: [1]
**검증**: `npx vitest run apps/admin/src/authoring/held.test.ts`

### 할 일 5. 서버 통로 — finish 검사 · 값 넣기 · 상세 · 머지 막기 · 집기

- **RED** — ① finish `result.held` 모양이 틀리면 400 ② PUT 이 모르는 칸·타입 틀림·비밀값 칸에 400 ③ 상세 `held[]`·`heldOpen` ④ 남은 보류가 있으면 merges 409 `HELD_OPEN` ⑤ MERGE 집기 응답에 held 입력과 원본 target ⑥ 권한 — 읽기 전용 계정은 PUT 403
- **GREEN** — `held.ts` 에 라우트 · `routes.ts`·`agentRoutes.ts` 에 한 줄씩 · `auth/gate.ts` 등급표 · `auth/scope.ts` 라우트표
- **REFACTOR** — 300줄 넘는 파일이 생기면 떼기

**files**: apps/admin/src/authoring/held.ts, apps/admin/src/authoring/held-routes.test.ts, apps/admin/src/authoring/routes.ts, apps/admin/src/authoring/agentRoutes.ts, apps/admin/src/authoring/agentStore.ts, apps/admin/src/auth/gate.ts, apps/admin/src/auth/scope.ts
**depends-on**: [4]
**검증**: `npx vitest run apps/admin/src/authoring apps/admin/src/auth`

### 할 일 6. 에이전트 — 끝낼 때 `result.held` 를 코드에서 계산

- **RED** — 케이스 파일 둘(held 하나·정식 하나)을 주면 held 쪽만 `{ tcId, kind, reason, fields }` 로 나오고, 비밀값 칸·기본값 있는 칸은 fields 에서 빠진다는 검사가 실패
- **GREEN** — `scripts/authoring-held.ts` 순수 함수(스키마 → fields, 사유 머리 「판정 불가 —」/「보류 —」 → kind) · `authoring-run.ts` 가 finish 에 싣기
- **REFACTOR** — 없음

**files**: scripts/authoring-held.ts, scripts/authoring-held.test.ts, scripts/authoring-run.ts
**depends-on**: [2]
**검증**: `npx vitest run scripts/authoring-held.test.ts`

### 할 일 7. 에이전트 — 반영 때 값 적기 · 제거 · 3회 실행

- **RED** — ① 소스 글에 `.default(값)` 을 적고 `held:` 줄을 빼면 K10·K13 이 통과 ② 이미 `.default` 가 있는 칸은 건드리지 않음 ③ 제거한 tcId 는 표 칸이 「제거함」 ④ held 가 남으면 병합 거부 사유 — 넷이 실패
- **GREEN** — `scripts/authoring-held-apply.ts`(TypeScript AST 로 적기 — 새 패키지 없음, `typescript` 이미 있음) · `authoring-merge.ts` 가 held 입력이 있으면 작업방 → 적기 → 검사 → 3회(`--repeat-each=3`, 원본 target 환경) → push → 기존 CI·병합
- **REFACTOR** — 없음

**files**: scripts/authoring-held-apply.ts, scripts/authoring-held-apply.test.ts, scripts/authoring-merge.ts
**depends-on**: [5, 6]
**검증**: `npx vitest run scripts/authoring-held-apply.test.ts scripts/authoring-merge.test.ts`

### 할 일 8. 자식 스킬 — 보류도 코드로 쓴다

- **RED** — 스킬 파일 줄 수 검사(≤200) · `grep -n "케이스를 만들지 않는다\|케이스로 안 만든다" .claude/skills/tpx-cases` 가 보류 자리에서 아직 나온다
- **GREEN** — tpx-cases 2-requirements·4-selector·6-gates·7-finish 와 tpx-author SKILL: 판정 불가·보류도 `held: '판정 불가 — …'|'보류 — …'` 를 단 케이스로 쓰고, 사람이 채울 칸은 `.default()` 없이 `.describe()` 만 · 관문 3 은 held 를 건너뛴 채 통과 · 결과 요약 모양
- **REFACTOR** — 없음

**files**: .claude/skills/tpx-cases/references/2-requirements.md, .claude/skills/tpx-cases/references/4-selector.md, .claude/skills/tpx-cases/references/6-gates.md, .claude/skills/tpx-cases/references/7-finish.md, .claude/skills/tpx-author/SKILL.md
**depends-on**: [1]
**검증**: `npm run check:skills 2>/dev/null || wc -l .claude/skills/tpx-*/SKILL.md .claude/skills/tpx-cases/references/*.md`

### 할 일 9. 화면 — 시안 먼저, 그다음 보류 칸

- **RED** — (시안 승인 뒤) 상세에 보류 목록이 그려지고, 값 넣기·제거·되돌리기가 통로를 부르고, `heldOpen > 0` 이면 「반영」이 막히고 이유가 보인다는 jsdom 검사가 실패
- **GREEN** — 시안 A·B·C Artifact → 고른 안으로 `web/AuthoringHeld.tsx` · `api.ts` 두 함수 · `AuthoringTodo.tsx` 반영 버튼 막기
- **REFACTOR** — 입력 칸은 `Form.tsx`·`schema.ts` 재사용

**files**: apps/admin/src/web/AuthoringHeld.tsx, apps/admin/src/web/AuthoringHeld.test.tsx, apps/admin/src/web/api.ts, apps/admin/src/web/AuthoringTodo.tsx, apps/admin/src/web/AuthoringDetail.tsx
**depends-on**: [5]
**검증**: `npx vitest run apps/admin/src/web/AuthoringHeld.test.tsx apps/admin/src/web/AuthoringDetail.test.tsx`

### 할 일 10. §2.7 동반 수정

- **RED** — `grep -rn "판정 불가\|보류" docs/spec/ docs/SPEC.md docs/*.md` 결과 중 새 절을 안 가리키는 자리
- **GREEN** — 아래 SPEC 동반 수정 표대로
- **REFACTOR** — 없음

**files**: docs/SPEC.md, docs/WORKSTREAMS.md, docs/DESIGN.md, docs/HOOKS.md, .claude/skills/spec-review/SKILL.md, docs/progress/WS-작성.md
**depends-on**: [1]
**검증**: `npm run check:spec`

## SPEC 동반 수정 (§2.7)

| 무엇 | 어디 | 할 일 |
|---|---|---|
| 같은 규칙 찾기 | `grep -rn "판정 불가\|보류\|K10\|기본값" docs/spec/` — 지금 명세에는 「판정 불가」「보류」가 0건(스킬에만 있다). K10 은 공통/2 §4 한 곳 + 정기 실행 §9.2 가 근거로 부른다 → §9.2 는 held 가 main 에 없으므로 바뀔 것 없음, 확인만 | 1 |
| 색인 네 곳 | 라우터 표에 「보류 케이스에 사람이 값을 채운다」 줄 · 장 목록 줄 수는 check:spec · 절 번호 표·표 주인(`held_input` 은 authoring_request 칸이라 주인 그대로) | 10 |
| SPEC 밖 | WORKSTREAMS 작성 갈래 줄 · spec-review 체크리스트(K13·held 가 main 에 들어가는지) · DESIGN.md 「작성 상태」(보류 칸) · HOOKS.md(해당 없음 확인 — CI 가벼운 길은 check:tests 로 K13 을 본다) · WORKFLOW(해당 없음) · design-mockup.html(해당 없음 — 시안은 Artifact) · **코드 상수** `catalog/rules.ts` 의 `RuleId`·`WHY` | 3 · 10 |
| 숫자 빼기 | 「K1~K13」 같은 범위 표기를 새로 쓰지 않는다 | 1 |

## Plan 메타

할 일 10개 · 예상 묶음 4개 ([1,2] → [3,4,6,8,10] → [5] → [7,9]) · 구현 규율: TDD · 추가 검증: `npm run typecheck && npm test && npm run check:tests`

## 리뷰 결과

(계획 검토가 채운다)
