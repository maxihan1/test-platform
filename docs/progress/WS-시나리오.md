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
- 미완: 시나리오 모드 · 러너 · 서버 · 화면 · 증적
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 표 검사는 `apps/admin/src/db/scenario-columns.test.ts`(접두사 `XSC`) — 칸 모양과 제약 목록을 통째로 견준다. 다음은 WORKSTREAMS 2 KIT + WS-C 러너
