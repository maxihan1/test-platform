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
