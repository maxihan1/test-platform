# WS-시나리오 진행 기록

## 2026-09-28
- 완료: 명세 PR #97 — 새 장 `docs/spec/도메인/시나리오.md`(§3.7 · §7 Scenario · §8.11) · 러너 §5.2 「시나리오 실행」 · 공유계약 §5.1 타입 · 데이터모델 「E2E 시나리오 표」 · 리포팅 「E2E 시나리오 증적」 · 실행 §8.7 탭 · 화면공통 자리 `E2E 시나리오` · 인증 권한 두 줄 · K12
- 완료: 설계서 「착수 전에 답이 있어야 하는 것」 전부 닫음. 체크 줄 = 「만들기」 절차 제목(사용자 결정)
- 미완: 코드 전부. 계약 블록은 전부 `상태: 대기`
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 순서는 `docs/WORKSTREAMS.md` 「📐 E2E 시나리오」 1~6. 다음은 1 계약 반영(kit 타입 · 마이그레이션). 러너 2 는 「testDir 밖 파일은 안 잡힌다」를 실행으로 먼저 잰다

## 2026-09-28 (2)
- 완료: 계약 반영 PR #98 — `packages/kit/src/types.ts` 시나리오 타입 넷 · `StepResult.skipped` · `db/migrations/20260928000004_scenario.sql` 표 넷 · `test_run.kind`·`scenario_id`·`scenario_version`
- 완료: 디바이스(`platform`)를 `scenario_version` 으로 옮김(게이트 1 사용자 결정 — 바꾼 뒤에도 옛 실행의 디바이스가 남는다)
- 완료: kit 계약 블록을 타입(반영 완료)·시나리오 모드(대기) 둘로 나눔
- 완료: `test_run` 의 (시나리오, 버전) 짝이 버전 표를 가리킨다 — `test_run_scenario_version_fkey`(게이트 2 사용자)
- 미완: 시나리오 모드 · 러너 · 서버 · 화면 · 증적
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 표 검사는 `apps/admin/src/db/scenario-columns.test.ts`(접두사 `XSC`) — 칸 모양과 제약 목록을 통째로 견준다. 다음은 WORKSTREAMS 2 KIT + WS-C 러너

## 2026-09-28 (3)
- 완료: 러너 PR #100 — kit 시나리오 모드(`packages/kit/src/runtime/scenario.ts` 등록부 · `test.ts` 실행 함수 · `step.ts` 제목으로 건너뛰기) · 러너 `POST /execute-scenario`(`apps/runner/src/scenario.ts` · `routes.ts`) · 고정 spec · 전용 설정 · 리포터(`apps/runner/scenario/`)
- 완료: 사용자 결정 둘(게이트 1) — 디바이스 미선언 케이스는 부품 FAIL · API 부품은 `page.request`(브라우저 쿠키 공유)
- 완료: 실측 — 인터넷 없는 fixture 로 진짜 chromium 4건(`apps/runner/scenario/e2e.test.ts`) · 러너 이미지에서 `/tests` 읽기 전용으로 한 바퀴
- 미완: 서버(WS-B) · 화면(WS-E) · 증적(WS-D) · K12(WS-A)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 고정 spec 은 kit 을 값으로 부르지 않는다(`wire.ts`) — 섞이면 이미지에서만 죽고 CI 는 못 본다. 고정 spec·kit 불러오기를 고치면 러너 이미지에서 한 번 부른다(PR #100 코멘트에 명령). 다음은 WORKSTREAMS 3 WS-A(K12) 또는 4 WS-B

## 2026-09-29
- 완료: WS-A PR #101 — K12 검사기(`apps/admin/src/catalog/rules.ts`) · 「만들기」 판별 `caseSteps`(`apps/admin/src/catalog/steps.ts`) · `tpx-cases` R16 에 K12
- 완료: 사용자 결정(게이트 1) — 애매하면 「만들기」로 안 친다. 반복문·도우미 함수 안 · 맨 함수 호출 · blocker 가 리터럴이 아님. 구현·검사 중 더 막은 것(게이트 2 확인) — 안쪽 절차를 품은 절차 · fixture 밖 점 호출(`kit.verify` · 도우미 객체) · `new` · 본문을 이름으로 넘김 · 제목 못 읽는 절차 (도메인/시나리오 §3.7)
- 완료: 실측 — 지금 케이스 29건에서 「만들기」는 DEMO-012·013·014 만, `usesRequest` 는 DEMO-003·004·005 만
- 미완: 서버(WS-B) · 화면(WS-E) · 증적(WS-D)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 서버 `GET /api/scenarios/case-parts/:tcId` 는 `caseSteps(파일 본문)` 을 부르고 `line` 만 뺀다. 조립 저장 때 `skipSteps` 가 `skippable` 인지도 같은 결과로 가린다. 다음은 WORKSTREAMS 4 WS-B

## 2026-09-29 (2)
- 완료: 서버를 PR 셋으로 나눔(사용자). ① 안전장치 PR #106 — 실행 목록·머리 집계(`거르는조건`)와 견주기 「직전 실행」에 `kind = 'CASE'` · Grafana `test_run` 패널 넷에 `kind = 'CASE'` · 시나리오 실행 중단 409 `NOT_ABORTABLE`(게이트 1 사용자) · 재기동 복구가 안 끝난 부품을 `NA` + `ABORTED` 로(부품 먼저 · 실행 나중) · `spec-review` B12
- 미완: ② 저장·버전·부품 재료·권한 표 · ③ 실행·시험 실행·사진·`?kind=scenario` · 화면(WS-E) · 증적(WS-D)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 번호 하나로 짚는 조회(`findRun`·증적)는 거르지 않았다 — ③ 이 시나리오 실행을 만들면 케이스 모양으로 나온다(WORKSTREAMS 4번 ③ 줄). 검사 `apps/admin/src/execution/kind.test.ts`(접두사 `XBK`). 앱을 띄우는 검사는 등록이 띄우는 `recoverRunning` 과 경합하므로 먼저 한 번 `await recoverRunning()` 한다

## 2026-09-29 (3)
- 완료: 서버 ② PR #107 — `/api/scenarios` 목록·만들기·상세·옛 버전·고치기(409 `STALE_VERSION`)·되돌리기·치우기 · `case-parts/:tcId` · 조립 검사(`scenario/validate.ts`) · 점검(`checks.ts`) · 재료(`parts.ts`) · 권한(등급표 여덟 쌍 · 시나리오 원천 · 만들기 본문 `service` 갈래)
- 완료: 게이트 0 사용자 — `STEP_NEW` 를 명세에서 뺐다. 게이트 1 사용자 — 되돌리기는 모양만 · 상세에 `service` · 파일 못 읽는 케이스는 비활성 · `lastRun` 은 ③
- 미완: ③ 실행·시험 실행·사진·`?kind=scenario`·`lastRun` · 화면(WS-E) · 증적(WS-D)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 진입점 `apps/admin/src/scenario/routes.ts`. 재료는 `케이스재료(tcIds, service)` 가 한 요청에 tcId 마다 한 번 읽는다 — ③ 의 실행 요청도 이것으로 `runnable` 을 본다. 제한 시간은 `시나리오제한시간`. fixture 접두사 XSS·XSP·XSR·XSA

## 2026-09-29 (4)
- 완료: 서버 ③-1 PR #109 — 사용자가 ③ 을 둘로 나눴다(진짜 실행 → 시험 실행). `POST /api/scenarios/:id/runs` · 실행 만들기(`scenario/runStore.ts`) · 러너 호출·결과 저장·줄 세우기(`execution/runner.ts` `callScenarioRunner` · `scenario/runResult.ts`) · 결과 조회·사진(`scenario/runRoutes.ts`) · 목록 `?kind=scenario` · 시나리오 목록 `lastRun` · 판정 접기 한 자리(`scenario/verdict.ts`)
- 완료: 게이트 0 사용자(제한 시간 바닥·API 몫 · 크기 100000바이트 · 치운 것 409 · 단건 조회 kind · 결과 응답 칸 · run_item 경유 예외) · 게이트 1 사용자(E2E 탭 집계 · runnable 에 60분·크기·뿌리 밖 · `SCENARIO_RUN` 404 · 결과 저장 순서)
- 미완: ③-2 시험 실행 · 화면(WS-E) · 증적(WS-D)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: ③-2 는 `callScenarioRunner` 를 `runId: null` + `trialId` 로 그대로 쓴다. 결과 저장 규칙의 정본은 도메인/시나리오 §7 「실행 결과를 적는 규칙」. fixture 접두사 XSE(runStore) · XSU(runRoutes)

## 2026-10-06
- 완료: 재설계 명세 PR #160 (E2E-F1-11) — 시나리오 §3.7 결정 12(작성 쪽 무변경 · 이어 주기 표 · 안전 규칙 · 넘겨받기 끔 · 한계 표 · 미확정) · 결정 3 부품마다 새 창 · 결정 4 절차 밖 코드 · 결정 6 케이스 API 요청도 모킹 · 결정 8 빈 칸은 저장값 · 부품 시험 한도 · §7 조립 거절 · case-parts `unconfirmed` · 결과 `bound` · `cleanup` · 러너 §5.2 · 공유계약 §5.1 ③④⑤ · 데이터모델 세 칸 · 리포팅 §8.4 표시
- 완료: 사용자 결정 둘 — 미확정 케이스는 「미확정 포함」을 달고 부품으로 쓴다 · 조립에서 비운 칸은 실행 때 케이스 저장값으로 채운다
- 완료: 사용자 결정 셋째 — 부품을 설계 기법으로 막지 않고 조립 팔레트에서 차례만 매긴다(상태 전이 · 기법 없음이 위, 입력 변형 케이스는 접기, §8.11). 목록 응답에 `techniques` 가 이미 있어 API 는 그대로다
- 완료: spec-review 치명 0 · 중대 3 · 경미 8 → 게이트 2 「고치고 재검사」(사용자 — 미확정이 섞인 통과는 따로 센다). 직접 만든 창 · 모듈 API 연결 감싸기와 `usesRequest` 빼는 조건 · 채운 뒤 값과 `bound` 가리기 · `lastRun.unconfirmed` · `unconfirmedPass` · 경미 7건 반영
- 미완: 구현 PR 셋 — ⓐ 계약(E2E-F1-12) → ⓑ 러너·kit(E2E-F1-13) → ⓒ 서버(E2E-F1-14) → 화면(E2E-F1-06) → 증적(E2E-F1-07) · 하네스 보강 PR(경미 1 [재발] — 「같은 규칙 찾기」가 `.claude/skills/**` 와 spec 차선에서도 돌게)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 새 계약 블록은 전부 `상태: 대기`. ⓑ 는 `request.newContext` 감싸기가 러너 이미지(`require`)에서 되는지 먼저 잰다(kit 두 벌 사고). `two-kinds.md` 의 「Page Object 에서 request 금지」 근거가 `usesRequest` 를 빼면 사라진다 — 작성 규칙이라 E2E PR 은 손대지 않는다
