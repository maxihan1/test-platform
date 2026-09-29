# 케이스 목록 엑셀 내려받기 · 작성 모델 Sonnet 5.5 xhigh · AI 티 규칙

등급: 3 · 갈래: WS-A · WS-E · WS-F · WS-작성 · 2026-09-29 · PR #111

## 도메인 정리

- 카탈로그(§8.1 케이스 목록 · §7 통로) — 새 통로 `GET /api/catalog/export` (`/cases/:tcId` 와 안 겹치게 `cases/` 밖에 둔다)
- 작성(§3.6 · 공통/6 §9) — 자식 claude 모델 기본값
- 하네스 — tpx-cases · tpx-author 가 im-not-ai 규칙 한 장을 표 쓰기 전에 읽는다 (계약 아님)
- 게이트 0 승인 (2026-09-29 사용자)
  - export `?service=`(필수) `&q=&platform=&active=` → .xlsx `<접두사>-테스트케이스-<YYYY-MM-DD>.xlsx`
  - 시트 ① 테스트 케이스: TC ID · 케이스명 · 기기 · 전제 · 입력값(기본값, 비밀값 ••••) · 기대값(기본값) · 상태 · 마지막 결과
    상태 = 정식 · 미확정 — 사유 · 모킹(precondition 에 「가짜 응답(모킹)」) · 사람이 값 채움 — 작성 요청 N · 누가
  - 시트 ② 보류 처리 기록(작성 read 만): 작성 요청 · TC ID · 구분 · 사유 · 처리(값 채움/제거함/값 필요) · 넣은 값 · 누가 · 언제 · 반영(반영됨/반영 전)
  - 권한 (케이스, read) · exceljs(있음, default import)
  - 모델 `claude-sonnet-5-5` · `xhigh` · 예비 `opus`
- 화면 시안 B (사용자): 검색 줄 끝 「이 결과 엑셀로 (N건)」 — N 은 목록 응답의 total

## 왜

사용자 요청 셋 (2026-09-29). 엑셀은 납품·검수 서류. 제거한 보류 케이스는 코드에서 사라지므로 작성 기록(DB)에서만 찾는다.

## Plan

### 할 일 1. 명세

- **RED** — `npm run check:spec` (명세 할 일)
- **GREEN** — 카탈로그 §7 export 줄 · §8.1 「엑셀로 내려받기」 문단 · 공통/6 §9 모델 표 · 도메인/작성 §3.6 컨테이너 표 「모델」 줄. 계약 블록 `반영 완료 (2026-09-29, PR #111)`
- **REFACTOR** — 없음

**files**: docs/spec/도메인/카탈로그.md, docs/spec/공통/6-인프라.md, docs/spec/도메인/작성.md
**depends-on**: []
**검증**: `npm run check:spec`

### 할 일 2. 모델 기본값

- **RED** — `authoring-model.test.ts` 의 「비면 …」 이 sonnet-5-5 · xhigh · 예비 opus 를 기대 → 지금 실패. `deploy.test.ts` 가 compose 기본값을 보면 같이
- **GREEN** — `authoring-model.ts` 기본값 · `docker-compose.yml` 기본값
- **REFACTOR** — 없음

**files**: scripts/authoring-model.ts, scripts/authoring-model.test.ts, docker-compose.yml, apps/admin/src/deploy.test.ts
**depends-on**: []
**검증**: `npx vitest run scripts/authoring-model.test.ts apps/admin/src/deploy.test.ts`

### 할 일 3. 엑셀 만들기 (순수)

- **RED** — 줄 둘 · 보류 기록 둘을 주면 시트 둘 · 머리 칸 · 비밀값 •••• · 상태 글자(미확정 · 모킹 · 사람이 값 채움) · 작성 read 없으면 시트 하나 — 워크북을 다시 읽어 확인
- **GREEN** — `apps/admin/src/catalog/export.ts` (xlsx.ts 처럼 exceljs default import · 머리행 고정)
- **REFACTOR** — 판정 글자는 reporting 쪽 표와 같은 말을 쓴다

**files**: apps/admin/src/catalog/export.ts, apps/admin/src/catalog/export.test.ts
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/catalog/export.test.ts`

### 할 일 4. 통로 · 권한 · 자료 모으기

- **RED** — `GET /api/catalog/export?service=` 가 xlsx 헤더와 첨부 이름 · 검색 조건 반영 · 남의 서비스 403 · 읽기 권한 없으면 403 · 작성 read 없으면 시트 하나 (DB fixture `XCX`)
- **GREEN** — `catalog/routes.ts` 에 한 줄 · 목록 질의 재사용(쪽 없이) · last-by-case 재사용 · 보류 기록 질의(그 서비스 authoring_request 의 result.held × held_input, 뿌리의 MERGE DONE 이면 반영됨) · `routeTable.ts` · `scope.ts`
- **REFACTOR** — 300줄 넘으면 `catalog/exportData.ts` 로 뗀다

**files**: apps/admin/src/catalog/routes.ts, apps/admin/src/catalog/exportData.ts, apps/admin/src/catalog/export-routes.test.ts, apps/admin/src/auth/routeTable.ts, apps/admin/src/auth/scope.ts, CLAUDE.md(접두사)
**depends-on**: [3]
**검증**: `DATABASE_URL=… npx vitest run apps/admin/src/catalog apps/admin/src/auth`

### 할 일 5. 화면 — 시안 B

- **RED** — 검색 줄 끝에 「이 결과 엑셀로 (N건)」 · 누르면 지금 조건의 export 주소로 받는다 · 0건이면 누를 수 없다
- **GREEN** — `api.ts` 주소 함수 · `CaseList.tsx`(또는 CaseListParts) 버튼 · 문구 영어 번역
- **REFACTOR** — 없음

**files**: apps/admin/src/web/api.ts, apps/admin/src/web/CaseList.tsx, apps/admin/src/web/CaseListParts.tsx, apps/admin/src/web/CaseList.test.tsx, apps/admin/src/web/messages/*.ts
**depends-on**: [4]
**검증**: `npx vitest run apps/admin/src/web/CaseList.test.tsx apps/admin/src/web/messages.test.ts`

### 할 일 6. AI 티 규칙 한 장 (im-not-ai)

- **RED** — 스킬 파일 줄 수(≤200) · check:workflow
- **GREEN** — `tpx-cases/references/korean-ai-tells.md` = im-not-ai `skills/humanize-korean/references/quick-rules.md`(커밋 2f3d943, MIT 고지 · 출처) 에서 문서 단위 규칙(C-2 · C-9 · C-10 · E-1 · I-4) 뺀 것. `2-requirements.md` 에 「표를 쓰기 전에 읽는다 · 「」 안은 원문 · verify 는 표에서 복사 · 나중에 고쳐 쓰는 패스는 없다」, `tpx-author/SKILL.md` 한 줄
- **REFACTOR** — 없음

**files**: .claude/skills/tpx-cases/references/korean-ai-tells.md, .claude/skills/tpx-cases/references/2-requirements.md, .claude/skills/tpx-author/SKILL.md
**depends-on**: []
**검증**: `npm run check:workflow`

### 할 일 7. §2.7 동반 수정

- **GREEN** — SPEC.md 라우터 줄(케이스를 엑셀로) · 분량 · DESIGN.md 케이스 목록 · WORKSTREAMS · SETUP §8(모델 기본값 · 에이전트 다시 켜기) · progress
**files**: docs/SPEC.md, docs/DESIGN.md, docs/WORKSTREAMS.md, docs/SETUP.md, docs/progress/WS-A.md
**depends-on**: [1]
**검증**: `npm run check:spec`

## SPEC 동반 수정 (§2.7)

| 무엇 | 할 일 |
|---|---|
| 같은 규칙 찾기 — `grep -rn "opus\|effort\|예비" docs/spec` (모델 기본값이 적힌 자리 전부) · `grep -rn "엑셀\|xlsx" docs/spec` (증적 엑셀과 헷갈리지 않게) | 1 |
| 색인 — 라우터 줄 · 분량 | 7 |
| SPEC 밖 — DESIGN · SETUP · WORKSTREAMS · 코드 상수(authoring-model.ts · compose) | 2 · 7 |

## Plan 메타

할 일 7개 · 묶음 3개 ([1,2,3,6] → [4,7] → [5]) · TDD · 추가 검증 `npm run typecheck && npm test && npm run check:tests`

## 리뷰 결과

(계획 검토가 채운다)
