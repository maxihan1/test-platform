# E2E 시나리오 시험 실행 — 서버 ③-2

등급: 3 · 갈래: WS-B (+WS-F 권한 표) · 2026-10-04 · PR #147 · 진행판 E2E-F1-10

## 도메인 정리

- BC: 시나리오(도메인/시나리오 §3.7 · §7) · 실행(대기열 `enqueue` · 러너 호출 `callScenarioRunner` · 케이스 테스트 실행 `execution/trial.ts`) · 인증(§7 표 두 개)
- 계약: Admin API `/api/scenario-trials/**` — 명세 §7 에 통로 셋이 이미 있고 계약 블록이 `대기`다. 게이트 0(2026-10-04 사용자)이 비어 있던 상한·오류를 케이스 테스트 실행과 같게 정했다
- DB · kit · 러너: 안 건드린다. 시험 실행은 `test_run` 을 만들지 않는다

## 왜

조립 화면(E2E-F1-06)이 저장 전에 돌려 볼 통로가 없다. 그리고 2026-10-04 조사에서 새 작성 방식의 MKT·CDY 케이스가 E2E 부품으로 잘 안 이어질 수 있다는 실측이 나왔다
(뒷정리가 계정을 지움 · MKT 건너뛸 수 있는 준비 절차 6/432). 재설계(다음 PR)의 근거를 모으려면 실제로 이어 돌려 볼 도구가 먼저 있어야 한다.

## 게이트 0 결정 (2026-10-04 사용자 승인)

| 무엇 | 정한 것 |
|---|---|
| 동시 상한 | 사람당 동시 1건 · 메모리 전체 50건 — 넘으면 가장 오래된 끝난 것부터 버린다. 50건이 전부 돌고 있으면 409 `TRIAL_BUSY` |
| 결과 읽기 | 시작한 사람만. 남의 것 · 없는 번호 · 24시간 지난 번호 404 `TRIAL_NOT_FOUND` |
| 조립 거절 | 만들기와 같은 400 `INVALID_REQUEST`(조립 검사 전부) · 모르는/비활성 서비스 400 · 대상 서버 없음 400 `ENV_NOT_FOUND` |
| 사진 | 시작한 사람만 · 없음 404 `SCREENSHOT_NOT_FOUND` · trialId 가 UUID 모양이 아니면 404 `TRIAL_NOT_FOUND` · seq 가 숫자가 아니면 400 |
| 비밀값 | 결과 안 문자열에서 그 조립의 케이스 부품 params · expected 중 비밀 칸 값을 `********` 로 가린다(케이스 테스트 실행과 같은 함수) |
| 응답 | `{ status: 'RUNNING' }` 또는 `{ status: 'FINISHED', result }` (명세 §7 그대로. 케이스 테스트 실행의 `DONE` 과 글자가 다르다) |

## 명세가 안 정한 것 — 제안 (게이트 1)

| 무엇 | 제안 | 까닭 |
|---|---|---|
| 러너 | 서버 러너(`RUNNER_URL`). `LOCAL_RUNNER_URL` 을 안 쓰고 `TRIAL_OFF` 도 없다 | 명세 §3.7 「같은 상한을 나눠 쓴다」 — 서버 러너 대기열이다 |
| 대기열 | 진짜 실행과 같은 `enqueue` 에 한 자리. 「돌고 있음」은 대기 중도 포함한다 | 한 사람이 대기열을 여러 자리 못 잡게 |
| 케이스 테스트 실행과 상한 공유 | 따로 센다(보관소 둘) | 러너가 다르다(내 컴퓨터 / 서버) |
| 보관소 코드 | `execution/trial.ts` 의 보관 규칙(24시간 · 사람당 1 · 50 · 가림)을 결과 모양만 다르게 받는 공장 함수로 꺼내 둘이 같이 쓴다 | 같은 규칙을 두 곳에 적으면 한쪽만 바뀐다 |
| 옛 폴더 치우기 | 새 시험 시작 때 `artifacts/runs/trial/*` 중 수정 시각 24시간 지난 폴더를 지운다. 링크는 따라가지 않고 링크만 지운다(`lstat`) · 지우기 실패는 로그만 남기고 시작은 막지 않는다 | 명세 §7 · 치우기 실패로 시험 실행이 막히면 안 된다 |
| 러너 고장 | `callScenarioRunner` 가 이미 NA 응답으로 접는다. 그대로 결과로 둔다 | ③-1 과 같은 문장 |

## 게이트 1 — 지적 반영 (2026-10-04 사용자)

- 「왜」 고침: 이 통로는 **조립 화면보다 먼저 깔 통로**다. 재설계 근거 모으기는 기록이 남는 진짜 실행(③-1)으로 한다
- 문(gate)은 `(사람, trialId)` 로 보관소를 찾는다. 남의 것 · 없는 것 · UUID 아닌 것은 지나보내 라우트가 404 (BLOCKER 1)
- 보관소 공장 함수가 받는 것: 실패 결과 짓기 · 끝 글자 · 바쁨 문구. 보관소 인스턴스는 가벼운 모듈(`execution/trial.ts`)에 두 개 다 둔다 — scope.ts 가 무거운 모듈을 안 끌어오게
- 부품 여럿의 비밀값은 합친 뒤 긴 것부터 다시 정렬
- 시작 · 끝 로그 한 줄(사람 · 서비스 · trialId · 걸린 시간)
- 옛 폴더 치우기: UUID 모양 이름 · `lstat` · 기다리지 않음(실패는 로그)
- 명세에 「진짜 실행 뒤에 줄 서면 그동안 RUNNING」 한 줄. 새 상태 칸은 안 만든다
- 할 일 2 REFACTOR(runStore 와 합치기) 뺀다
- fixture: `XST`(`scenario/trial.test.ts`) · `XSTR`(`scenario/trialRoutes.test.ts`) — 정확한 service id · tc_id 목록으로 지우고 `LIKE` 안 씀. 계정 이름 `xst-a` · `xst-b`
- 미룸: 시험 실행 도중 멈추기(화면 PR 때 묻기)

## Plan

### 할 일 1. 시험 보관소를 결과 모양에 상관없이 쓰게 꺼낸다

- **RED** — `execution/trial.test.ts` 에 두 번째 보관소(다른 결과 모양)를 만들어 사람당 1 · 50 · 시작한 사람만 · 서비스 찾기(`주인정보`)가 각자 따로 도는지 단언. 공장 함수가 없어 실패
- **GREEN** — `시험보관소<R>(실패결과)` 공장 함수. 기존 `시작한다`·`읽는다`·`전부비운다` 는 케이스용 인스턴스로 그대로 내보낸다. 항목에 `서비스` 를 더해 문이 읽게 한다. `비밀글자들`·`가린다` 를 내보낸다
- **REFACTOR** — 없음

**files**: apps/admin/src/execution/trial.ts · apps/admin/src/execution/trial.test.ts
**depends-on**: []
**검증**: npx vitest run apps/admin/src/execution/trial.test.ts apps/admin/src/execution/trialRoutes.test.ts

### 할 일 2. 시험 실행 시작 — 조립 검사 · 요청 짓기 · 대기열 · 옛 폴더 치우기

- **RED** — `scenario/trial.test.ts`: ① 24시간 지난 `trial/<uuid>` 폴더만 지우고 새 것·링크 대상은 남긴다(임시 폴더, DB 없음) ② (DB) 조립 거절 · 서비스 비활성 · 대상 서버 없음이 각 오류로 ③ (DB, 가짜 러너) 받은 요청이 `runId: null` · `trialId` · 부품 `filePath` · 제한 시간 합을 싣는다 ④ 러너 응답 속 비밀값이 가려진다
- **GREEN** — `scenario/trial.ts` 의 `시험시작(사람, 본문)` · `옛시험치우기(뿌리, 지금)`
- **REFACTOR** — `runStore.ts` 와 겹치는 요청 짓기가 있으면 함수 하나로

**files**: apps/admin/src/scenario/trial.ts · apps/admin/src/scenario/trial.test.ts
**depends-on**: [1]
**검증**: npx vitest run apps/admin/src/scenario/trial.test.ts

### 할 일 3. 통로 셋 — POST · GET · 사진

- **RED** — `scenario/trialRoutes.test.ts`(접두사 `XST`): 202 trialId · 두 번째 409 TRIAL_BUSY · 남의 사람 404 · 끝나면 FINISHED + result · 사진 200 / 남의 사람 404 / 없는 사진 404 / UUID 아님 404 / seq 숫자 아님 400
- **GREEN** — `scenario/trialRoutes.ts` · `app.ts` 등록
- **REFACTOR** — 없음

**files**: apps/admin/src/scenario/trialRoutes.ts · apps/admin/src/scenario/trialRoutes.test.ts · apps/admin/src/app.ts
**depends-on**: [2]
**검증**: npx vitest run apps/admin/src/scenario/trialRoutes.test.ts

### 할 일 4. 권한 — 표 두 개와 문

- **RED** — `auth/gate.test.ts`: 통로 셋이 권한 표·범위 표에 있다(표 전수 검사가 이미 빨강이 된다) · POST 본문 service 가 남의 서비스면 403 · GET 의 서비스는 보관소에서 읽고 없는 번호는 지나보낸다(라우트가 404)
- **GREEN** — `routeTable.ts` 세 줄(POST 실행쓰기 · GET 둘 실행읽기) · `scope.ts` 원천 `시험`(보관소에서 서비스 찾기) · `gate.ts` 본문 갈래에 `/api/scenario-trials` POST
- **REFACTOR** — 본문 service 읽기를 `/api/scenarios` 와 한 함수로

**files**: apps/admin/src/auth/routeTable.ts · apps/admin/src/auth/scope.ts · apps/admin/src/auth/gate.ts · apps/admin/src/auth/gate.test.ts
**depends-on**: [1]
**검증**: npx vitest run apps/admin/src/auth/

### 할 일 5. 명세 — 게이트 0 · 1 결정을 §7 에 · 계약 블록 반영 완료

- 시나리오 §7 「시험 실행은 기록에 안 남는다」 문단에 위 두 표의 결정(상한 · 오류 글자 · 가림 · 서버 러너 · 치우기)을 적는다
- 계약 블록 `상태: 반영 완료 (2026-10-04, apps/admin/src/scenario/{trial,trialRoutes}.ts · apps/admin/src/execution/trial.ts · apps/admin/src/auth/{routeTable,scope,gate}.ts — PR #147)`
- 인증 §7 397줄 시험 실행에 경로를 붙인다

**files**: docs/spec/도메인/시나리오.md · docs/spec/도메인/인증.md
**depends-on**: [3, 4]
**검증**: npm run check:spec

### 할 일 6. 기록 — 진행판 · WORKSTREAMS · 접두사 · 진행 기록 · 재설계 할 일

- `docs/wbs.md` E2E-F1-10 체크 · **새 줄 E2E-F1-11 「새 작성 방식에 맞춰 E2E 명세 다시 잡기」**(조사 결과 다섯: 뒷정리가 계정을 지움 · MKT 준비 절차 6/432 · fanout 에 R16 없음 · 부품 사이 상태 누출 · 시간 초과 · 보류/미확정 · 옛 번호는 FN 으로 침)
- `docs/WORKSTREAMS.md` 「📐 E2E 시나리오」 ③-2 를 ✅ 로 · 재설계 인계 줄 · `kind='CASE'` 낡은 문구
- `CLAUDE.md` DB fixture 접두사 줄에 `XST`(`scenario/trial.test.ts` · `trialRoutes.test.ts`)
- `docs/progress/WS-B.md` 추가 · `npm run check:wbs`

**files**: docs/wbs.md · docs/WORKSTREAMS.md · CLAUDE.md · docs/progress/WS-B.md
**depends-on**: [5]
**검증**: npm run check:wbs && npm run check:spec

## SPEC 동반 수정 (§2.7)

| 할 일 | 무엇 | 결과 |
|---|---|---|
| 같은 규칙 찾기 | `grep -rn "시험 실행\|scenario-trials\|trial" docs/spec/` — 시나리오 §3.7 동시성 · §7 · §8.11, 인증 §7 396·397, 실행 §7 256(옛 사진 통로가 trial 막음 — 이미 맞음), 러너 §5.2 161·167, 6-인프라 90·91, 1-제품 180 | 할 일 5 가 §7 만 고치고 나머지는 §7 을 가리키는지 눈으로 본다 |
| 색인 네 곳 | 새 절 없음. 라우터 표에 「시험 실행」 길잡이가 있는지 본다 | `npm run check:spec` |
| SPEC 밖 | WORKSTREAMS(할 일 6) · spec-review 체크리스트(시나리오 시험 실행 항목 없음 — B 절에 「시험 결과는 시작한 사람만」 한 줄을 더할지 [6] 에서 본다) · SETUP·HOOKS·DESIGN·WORKFLOW·목업 해당 없음 · **코드 상수**: 24시간 · 50 · 가림 글자는 `execution/trial.ts` 한 곳 | 할 일 1 이 한 곳으로 모은다 |
| 숫자 빼기 | 새로 손으로 적는 개수 없음 | — |

## Plan 메타

할 일 6개 · 예상 묶음 4개(1 → 2·4 → 3 → 5·6) · 구현 규율: TDD · 추가 검증: `npm run typecheck` · `npx vitest run apps/admin/src/scenario apps/admin/src/execution apps/admin/src/auth`

## 리뷰 결과

**렌즈**: plan-eng-review · plan-ceo-review (3등급 = 2종) · 2026-10-04
**판정**: BLOCKER 1건 · 주의 12건

### BLOCKER 1 — 문이 GET 의 서비스를 보관소에서 찾을 때 주인을 안 본다
남의 trialId 를 다른 서비스 사람이 치면 문이 403 `SERVICE_FORBIDDEN`(접두사 포함)을 낸다 — 명세의 404 `TRIAL_NOT_FOUND` 와 어긋나고 「그 번호가 살아 있고 어느 서비스 것인지」가 샌다.
고칠 것: 문의 조회를 `(사람, trialId)` 로 — 남의 것 · 없는 것 · UUID 아닌 것은 지나보내 라우트가 404. 다른 서비스 사람 404 · 사진 통로 같음을 테스트에.

### 주의 (엔지니어링)
1. 대기열: 400건짜리 진짜 실행 뒤에 선 시험은 몇 시간 `RUNNING` 이다 — 명세·화면 안내에 「진짜 실행 뒤에 줄 선다」를 적을지
2. 끝 글자(`DONE`/`FINISHED`)와 실패 안내(「내 컴퓨터 러너」)가 다르다 — 공장 함수 인자로 받는다
3. 부품 여럿의 비밀값은 합친 뒤 긴 것부터 다시 정렬 · 테스트
4. 할 일 1 files 에 `execution/trialRoutes.ts` · 시나리오 인스턴스도 `전부비운다`
5. scope.ts 가 무거운 모듈을 끌어오지 않게 보관소 인스턴스는 가벼운 모듈에
6. 옛 폴더 치우기는 UUID 모양 이름만 · 시작 응답이 기다리지 않게
7. 접두사를 파일마다 따로(`XST` · `XSTR`) · 정확한 id 로 지운다 · 계정 · 지우는 순서

### 주의 (CEO)
1. 시험 결과는 24시간 메모리 · 화면 없음 — 재설계 근거 모으기는 기록이 남는 진짜 실행(③-1)이 맞다. 「왜」를 「조립 화면보다 먼저 깔 통로」로, 확인 방법(curl)을 계획에
2. 대기열 한 자리를 최대 60분 아무도 모르게 쓴다 — 시작·끝 로그 한 줄(사람 · 서비스 · trialId · 걸린 시간). 시험 중단은 다음에 묻는다
3. 거절 문구(`TrialBusyError`)도 인스턴스마다 — 엔지니어링 주의 2 와 같다
4. 할 일 2 REFACTOR(runStore 와 합치기)의 files 에 runStore.ts 가 없다 — 빼거나 넣는다
5. 명세 자리를 줄 번호로 적었다 — 표 이름으로

### 통과한 것
- 조립 거절을 `케이스재료` · `조립검사` 로 다시 쓰는 길(접두사 · UI · 60분 · 뿌리 밖)
- 사진 경로 — 러너가 trialId 를 UUID 로 막고 라우트는 UUID · 정수로만 조립
- `callScenarioRunner` 가 NA 로 접어 대기열이 안 던진다 · 24시간 뒤 굳은 항목도 풀린다
- DB · kit · 러너 무변경 · 상수 한 곳 · 재설계 할 일(E2E-F1-11)을 진행판에
