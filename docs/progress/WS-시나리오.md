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
