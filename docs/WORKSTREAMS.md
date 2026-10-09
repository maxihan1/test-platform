# WORKSTREAMS.md — 어느 폴더가 무슨 일을 하는가

> 범위가 번지지 않게 보는 지도다(CLAUDE.md §1.1). 막는 장치는 없다.
> 갈래별 킥오프 프롬프트 · 진행 이력 · 갈래 묶음 절(「📐 …」)은 `docs/archive/WORKSTREAMS.md` 에 보관했다 (2026-10-09). 진척은 `docs/wbs.md`(진행판)로 본다.

## 소유 경로 표

| ID | 갈래 | 소유 경로 | 의존 |
|----|------|----------|------|
| **WS-A** | 카탈로그 | `apps/admin/src/catalog/**` | kit 타입 |
| **WS-B** | 실행 | `apps/admin/src/execution/**` | kit 타입, 러너 계약 |
| **WS-C** | 러너 + 테스트 킷 | `apps/runner/**`, `packages/kit/src/runtime/**`, `tests/**` | kit 타입 |
| **WS-D** | 리포팅 | `apps/admin/src/reporting/**`, `infra/grafana/**` | DB 스키마 |
| **WS-E** | 화면 | `apps/admin/src/web/**` | Admin API 계약 |
| **WS-F** | 인증 | `apps/admin/src/auth/**`, `apps/admin/src/settings/**`, `scripts/**`(아래 `authoring-*` 빼고) | DB 스키마 (`app_user`·`service`·`service_env`·`user_service`) |
| **WS-시나리오** | E2E 시나리오 | `apps/admin/src/scenario/**` · `docs/spec/도메인/시나리오.md` (러너 고정 파일은 `apps/runner/**` 라 WS-C) | kit 타입(시나리오) · 러너 계약 |
| **WS-작성** | 작성 | `apps/admin/src/authoring/**` · `apps/authoring/**` · `scripts/authoring-*.ts` · `docs/spec/도메인/작성.md` | DB 스키마 (`authoring_request` 등) |

- **`docs/cases/**` 는 어느 갈래도 아니다.** 서비스별 요구사항 표와 용어 사전이 사는 자리이고 표면은 `DOC` 다. 그 표가 가리키는 케이스 파일은 `tests/**` 라 WS-C 소유다
- 화면(`apps/admin/src/web/**`)은 기능이 어느 갈래 것이든 WS-E 소유다

## 공용 골격 — 갈래 소유가 아니다

바꿔야 하면 CLAUDE.md §1.2 · §1.3 절차를 밟는다.

- `packages/kit/src/types.ts`(SPEC §5.1) · `db/migrations/`(§6) · `docker-compose.yml`(§9) — **계약 반영(`contracts`) 단위**가 SPEC 에 적힌 대로만 바꾼다
- `apps/admin/src/app.ts` — 서버 부트스트랩. 새 컨텍스트의 `routes.ts` 를 등록하는 한 줄만 손댄다(`app.test.ts` 가 등록 누락을 잡는다)
- `apps/admin/src/db/` — DB 연결 풀. 갈래는 import 만 한다
- `packages/kit/src/index.ts` — kit 배럴
- `tsconfig` · `playwright.config.ts`
- `.github/workflows/ci.yml` — 작성 에이전트 PR 검사. job 이름 `check` 가 main 보호의 필수 체크다(`docs/HOOKS.md`)
