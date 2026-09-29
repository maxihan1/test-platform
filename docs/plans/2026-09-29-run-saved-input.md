# 실행 입력값 저장 — 케이스마다 한 벌 · 여러 건 실행 창 빈 값 버그

등급: 3 · 갈래: WS-B(실행) · WS-A(카탈로그) · 화면 · 2026-09-29 · PR #113

## 도메인 정리

- BC: 실행(`param_set` 옆에 `case_input` 을 더한다) · 카탈로그(케이스 응답에 `savedInput` 을 싣는다) · 화면(실행 설정 · 여러 건 실행 창 · 목록 줄)
- 게이트 0 승인 계약 (2026-09-29)
  - 표 `case_input (tc_id PK → test_case, params JSONB, expected JSONB, saved_by TEXT, saved_at TIMESTAMPTZ)` — 케이스마다 한 벌, 팀이 같이 쓴다
  - `PUT /api/cases/:tcId/saved-input { params, expected }` — 명세로 검증 후 덮어쓴다 · `DELETE` — 코드 기본값으로 되돌린다. 둘 다 (케이스, write)
  - `GET /api/catalog/cases` 줄 · `GET /api/catalog/cases/:tcId` 에 `savedInput: { params, expected, savedBy, savedAt } | null`
  - 칸을 채우는 순서: 저장값 → 코드 기본값. 상세 실행 화면 · 여러 건 실행 창 · 목록 줄이 같다
  - 화면을 안 거치는 실행(정기 실행)도 요청에 없는 칸은 저장값으로 채운다 → `createRun` 한 곳에서 한다
- 관련 절: 도메인/실행 §3.2 · §7 · §8.2 · §8.10 · 도메인/카탈로그 §7 · §8.1 · 공통/4-데이터모델 §6 · 공통/6-인프라 §9.2

## 왜

2026-09-29 MKT 실행 20386 에서 48건 중 12건이 실패했다. 케이스는 멀쩡했다 — 목록 줄에서 `loginId` 를 적자
여러 건 실행 창이 그 케이스의 **고친 칸 조각만** 받아 나머지를 기본값이 아니라 `""`·`false` 로 보냈다
(`RunPickModal.tsx` 의 `글자of`·`고친값` 이 `채운글자` 를 안 거친다). 기대값 `/` 가 `""` 가 되니 실제 `/` 와 어긋났다.
로그인 계정은 매 실행 다시 적어야 했고, 상세 화면의 「이 값을 묶음으로 저장」은 이름 칸이 비면 서버에 요청을 안 보내고
맨 아래 작은 글씨만 띄워 사람이 「안 먹는다」고 봤다 (그날 admin 기록에 POST 0건, 직접 눌러 보면 저장된다).

## Plan

### 할 일 1. 여러 건 실행 창이 고친 칸 조각에 기본값을 합친다

- **RED** — `RunPickModal.test.tsx`: `초기글자={ MKT: { params: { loginId: 'u' }, expected: {} } }` 로 열고 실행을 누르면
  `onRun` 에 간 `expected` 가 `{ homePath: '/', flag: true }`(기본값)이다. 지금은 `{ homePath: '', flag: false }` 라 실패
- **GREEN** — `글자of` 가 `채운글자(칸, 글자[tcId]?.[which])` 를 돌려주고, `고친값` 도 같은 함수를 거친다. `고치기` 는 `글자of` 에서 시작한다
- **REFACTOR** — 없음

**files**: apps/admin/src/web/RunPickModal.tsx, apps/admin/src/web/RunPickModal.test.tsx
**depends-on**: []
**검증**: npx vitest run apps/admin/src/web/RunPickModal.test.tsx

### 할 일 2. 표 `case_input` 을 만든다

- **RED** — `db/case-input-columns.test.ts`(접두사 `XCI`): 표가 있고 `tc_id` 가 PK·`test_case` 참조다
- **GREEN** — `db/migrations/20260929000002_case_input.sql`
- **REFACTOR** — 없음

**files**: db/migrations/20260929000002_case_input.sql, apps/admin/src/db/case-input-columns.test.ts
**depends-on**: []
**검증**: DATABASE_URL=… npx vitest run apps/admin/src/db/case-input-columns.test.ts

### 할 일 3. 저장값 저장·지우기·읽기 (서버)

- **RED** — `execution/savedInput.test.ts`(접두사 `XSI`): PUT 이 명세 위반이면 400 `INVALID_PARAMS`+violations · 없는 케이스 404 ·
  두 번 PUT 하면 한 벌만 남고 뒤엣것 · DELETE 뒤 GET 이 null · 읽기 권한만 있는 사람은 403
- **GREEN** — `execution/savedInput.ts` (저장소 함수 + 라우트 둘) · `routes.ts` 에서 등록 · `auth/routeTable.ts` (PUT·DELETE 케이스쓰기) · `auth/scope.ts` (`/api/cases/:tcId/saved-input` → 케이스 tcId)
- **REFACTOR** — `paramSets.ts` 의 `caseSchemas` 를 그대로 쓴다

**files**: apps/admin/src/execution/savedInput.ts, apps/admin/src/execution/savedInput.test.ts, apps/admin/src/execution/routes.ts, apps/admin/src/auth/routeTable.ts, apps/admin/src/auth/scope.ts
**depends-on**: [2]
**검증**: DATABASE_URL=… npx vitest run apps/admin/src/execution/savedInput.test.ts apps/admin/src/auth

### 할 일 4. 케이스 응답에 `savedInput` 을 싣는다

- **RED** — `catalog/store.test.ts` 에 한 줄: 저장값이 있는 케이스는 목록·한 건 모두 `savedInput` 이 오고 없으면 `null`
- **GREEN** — `catalog/store.ts` 의 목록·한 건 SELECT 에 `LEFT JOIN case_input`
- **REFACTOR** — 없음

**files**: apps/admin/src/catalog/store.ts, apps/admin/src/catalog/store.test.ts
**depends-on**: [2]
**검증**: DATABASE_URL=… npx vitest run apps/admin/src/catalog/store.test.ts

### 할 일 5. 실행을 만들 때 빈 칸을 저장값으로 채운다

- **RED** — `savedInput.test.ts` 에: 저장값 `{loginId:'u'}` 가 있는 케이스를 `params: {}` 로 `createRun` 하면 `run_item.params` 가 `{loginId:'u'}` ·
  요청에 `loginId:'x'` 가 있으면 `x` 가 이긴다
- **GREEN** — `savedInput.ts` 에 `저장값을채운다(client, items)` · `store.ts` `createRun` 이 INSERT 전에 부른다 · `scripts/run-scheduled.ts` 주석을 새 규칙으로
- **REFACTOR** — 없음

**files**: apps/admin/src/execution/savedInput.ts, apps/admin/src/execution/savedInput.test.ts, apps/admin/src/execution/store.ts, scripts/run-scheduled.ts
**depends-on**: [3]
**검증**: DATABASE_URL=… npx vitest run apps/admin/src/execution

### 할 일 6. 화면 칸이 저장값을 먼저 채운다

- **RED** — `schema.test.ts`: `schemaToFields(schema, { loginId: 'u' })` 의 그 칸 `default` 가 `'u'`, `saved: true`, `optional: false` ·
  `Form` 안내 줄이 「저장값 u」, 비밀값이면 「저장값 ********」
- **GREEN** — `schema.ts` `schemaToFields(schema, saved?)` · `Form.tsx` 안내 줄 글자 · `api.ts` `CaseRow.savedInput` · 세 화면(RunSetup · RunPickModal · CaseRowParams)이 넘긴다
- **REFACTOR** — 없음

**files**: apps/admin/src/web/schema.ts, apps/admin/src/web/schema.test.ts, apps/admin/src/web/Form.tsx, apps/admin/src/web/api.ts, apps/admin/src/web/RunSetup.tsx, apps/admin/src/web/RunPickModal.tsx, apps/admin/src/web/CaseRowParams.tsx, apps/admin/src/web/messages/*.ts
**depends-on**: [1, 4]
**검증**: npx vitest run apps/admin/src/web

### 할 일 7. 「저장」 버튼 — 시안 A·B·C 를 먼저 보여 고른다

- **RED** — 고른 시안 자리의 화면 검사: 버튼을 누르면 `PUT` 이 지금 칸 값으로 가고, 성공하면 안내가 뜨고, 다시 열면 그 값이 칸에 있다 ·
  「코드 기본값으로」가 `DELETE` 를 부른다 · 케이스 쓰기 권한이 없으면 버튼이 없다
- **GREEN** — 시안대로 · `api.ts` `saveInput`·`clearInput`
- **REFACTOR** — 없음

**files**: 고른 시안이 정한다 (RunSetup.tsx · RunPickModal.tsx · CaseRowParams.tsx · CaseList.tsx 중) + 그 검사 파일 · apps/admin/src/web/api.ts · messages
**depends-on**: [3, 6]
**검증**: npx vitest run apps/admin/src/web

### 할 일 8. 「묶음으로 저장」이 이름이 비었을 때 드러낸다

- **RED** — `RunSetup.test.tsx`: 이름을 비우고 누르면 이름 칸에 포커스가 가고 그 칸 바로 옆에 「세트 이름을 적어 주세요」가 보인다
- **GREEN** — 이름 칸 ref 에 focus · 사유를 칸 옆에 둔다 (버튼은 비활성화하지 않는다 — §8.2)
- **REFACTOR** — 없음

**files**: apps/admin/src/web/RunSetup.tsx, apps/admin/src/web/RunSetup.test.tsx, apps/admin/src/web/messages/*.ts
**depends-on**: [6, 7]
**검증**: npx vitest run apps/admin/src/web/RunSetup.test.tsx

## SPEC 동반 수정 (§2.7)

### 할 일 9. 명세와 같이 움직이는 곳

- 도메인/실행 §7 API 두 줄 · §3.2 에 「저장값은 요청에 없는 칸만 채우고, 채운 값도 run_item 에 박제된다」 · §8.2 「저장된 ParamSet」 옆에 저장값 · §8.10 「고친 값은 그 실행에만」 옆에 저장 규칙
- 도메인/카탈로그 §7 응답 `savedInput` · §8.1 줄 칸 채우는 순서
- 공통/4-데이터모델 §6 `case_input` 정의 · 표 주인
- 공통/6-인프라 §9.2 「저장된 입력값 묶음에 이름 약속을 만들지 않는다 — 진실의 원천은 코드다」 → **문단 남기고 뒤집은 이유 덧붙임** (§2.7 ② — 이름 약속은 여전히 없다. 케이스마다 한 벌이라 약속이 필요 없다)
- `docs/SPEC.md` 표 주인 · 라우터 표 「실행 입력값을 저장·미리 채울 때」
- `docs/WORKSTREAMS.md` WS-B 킥오프 · CLAUDE.md fixture 줄 `XCI`·`XSI`
- 같은 규칙 찾기: `grep -rn "ParamSet\|param_set\|기본값으로 칸\|코드의 기본값" docs/spec/`

**files**: docs/spec/도메인/실행.md, docs/spec/도메인/카탈로그.md, docs/spec/공통/4-데이터모델.md, docs/spec/공통/6-인프라.md, docs/SPEC.md, docs/WORKSTREAMS.md, CLAUDE.md
**depends-on**: []
**검증**: npm run check:spec

## Plan 메타

할 일 9개 · 예상 묶음 4개 (1·2·9 → 3·4 → 5·6 → 7·8) · 구현 규율: TDD · 추가 검증: typecheck · check:tests · test:changed

## 리뷰 결과

(계획 검토가 채운다)
