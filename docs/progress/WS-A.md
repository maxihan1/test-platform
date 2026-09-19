# WS-A 진행 기록 — 카탈로그

## 2026-09-16
- 완료: 스캐너 · `npm run check:tests`(K1~K8) · `test_case` 저장 · 카탈로그 API 5종 · 기동 시 자동 스캔.
  단위 테스트 59건 (DB 없는 환경에서는 16건 건너뜀)
- 확인함:
  - `PLATFORM_SCAN=1`로 `tests/**`를 동적 import 해 `export const spec` 10건을 읽는다.
    JSON Schema 변환은 kit의 `defineCase`가 이미 `z.toJSONSchema(schema, { io: 'input' })`로 해 둔다 —
    스캐너가 다시 변환하지 않는다
  - tcId 중복 → 서버는 뜨고, 양쪽 파일 경로가 `GET /api/catalog/scan`의 `duplicates[]`에 남고,
    **캐시는 덮어쓰지 않는다** (중복 fixture로 실제 기동해 확인)
  - 코드에서 사라진 케이스는 행이 남고 `is_active=false`. 다시 나타나면 `true`로 올라온다
  - `check:tests`는 규칙을 어긴 파일에서 `파일:줄 — [K번호] 무엇이 — 왜 문제` 한 줄씩 찍고 exit 1
  - `GET /api/cases/:tcId/source?line=13` → 8~17행 발췌, `focus: 13`
- 미완: 없음
- 막힌 것: 없음. 걸린 세 건(PLATFORM_SCAN 누수, 스캔이 통째로 죽는 설계, fixture typecheck 충돌)은
  고쳤고 LEARNINGS에 적었다
- SPEC 검사: `docs/reviews/2026-09-16-WS-A.md` — 치명 0 · 중대 0 · 경미 0 (자기검사)

### 다음 세션이 알아야 할 것

- **진입점**: 스캔은 `scanner.ts`의 `scan()`, 규칙 검사는 `rules.ts`의 `checkSource`/`checkSpec`/`checkRegistration`,
  DB는 `store.ts`, HTTP는 `routes.ts`. `check.ts`는 이 셋을 붙이는 글루일 뿐이다
- **`check.ts`는 DB를 import 하지 않는다.** CI에 postgres가 없다. `store.ts`가 풀을 쓰는 시점도
  함수 안의 동적 import다 — `db/index.ts`가 import 시점에 `DATABASE_URL`을 요구하기 때문이다
- **DB가 필요한 테스트는 `describe.skipIf(DATABASE_URL 없음)`이다.** 손으로 돌릴 때는
  `DATABASE_URL='postgres://platform:platform@localhost:5433/platform' npx vitest run apps/admin/src/catalog/`
- **기동 시 자동 스캔은 `routes.ts` 플러그인 안에서 띄운다.** `app.ts`는 Phase 0 공용 골격이라 건드리지 않았다
- **K8은 `--list --reporter=json`의 `suites[].file`로 본다.** 프로젝트(desktop·mobile) 수만큼
  같은 spec이 겹쳐 나오므로 **제목 가짓수**로 세야 파일당 1건이 잡힌다 (LEARNINGS WS-C)
- **WS-B·WS-E에게**: 케이스 목록(`GET /api/catalog/cases`)에 '마지막 결과'가 없다.
  `run_item`은 실행 컨텍스트 소유라 카탈로그가 읽지 않았다. 결정이 필요하다 —
  `docs/reviews/2026-09-16-WS-A.md` 기타 2 참조 (WS-B의 일괄 조회 엔드포인트를 권함)

## 2026-09-18 — 개정 SPEC 반영 (7~11번) + contracts 단위

이 세션은 **contracts(공용 밑작업)를 먼저 돌리고 이어서 WS-A** 를 했다. 사용자 결정이다.
WS-A 의 4가지 중 둘이 `service` 표를 읽어야 하는데 그 표가 없었기 때문이다.

### contracts — 커밋 5개

- DB 테스트 fixture 정리 범위를 `ZZA%` 로 좁힘
- 마이그레이션 `20260917000001_service_user_snapshot.sql` — §6 SQL 예시 그대로.
  `service`·`service_env`·`app_user`·`user_service` 신설, `test_run`·`run_item`·`evidence_document` 새 칸,
  대시보드 계정의 기본 읽기 허용 끄기
- `ExecuteRequest.baseUrl` 신설 + 러너가 `PLATFORM_BASE_URL` 로 넘기고 `playwright.config` 가 받음. `retries: 0` 명시
- 포트를 `.env` 로, 러너 바깥 포트 제거, 상시 넷 `restart: unless-stopped`,
  admin 이미지 안에서 화면 빌드, `SESSION_SECRET` 없으면 기동 거부
- `@fastify/secure-session` · `exceljs` 추가

### WS-A — 커밋 4개

- **K9·K10** 을 `checkSpec` 에 넣음. 둘 다 변환된 JSON Schema 만 보면 된다 —
  소스를 다시 파싱하지 않는다
- **접두사 자유 형식** — `rules.ts` 의 정규식 한 줄. 저장소에서 그 자리가 전부였다
- **스캔이 서비스마다 자기 폴더만** 훑음. 비활성 처리 범위도 그 서비스 접두사 안으로
- **검색 조건** `?service=`(필수) · `?platform=` · `?active=`, 응답에 `totalIsExact` · `sort`

### 확인 방법

```
docker compose -p test_platform run --rm migrate    # 마이그레이션 적용
npm run check:tests                                  # 케이스 10건 · K1~K10 통과
DATABASE_URL=postgres://platform:platform@localhost:5433/platform npx vitest run apps/admin/src/catalog/
curl 'localhost:3000/api/catalog/cases?service=DEMO'          # 데모 10건
curl 'localhost:3000/api/catalog/cases'                       # 400 SERVICE_REQUIRED
curl 'localhost:3000/api/catalog/cases?service=NOPE'          # 403 SERVICE_FORBIDDEN
```

### 다음 세션이 알아야 할 것

- **스캔은 이제 `service` 표가 있어야 돈다.** 표가 비면 훑을 폴더가 없어 0건이다.
  데모를 보려면 `prefix='DEMO'` · `tests_dir='demo'` 행이 필요하다.
  `routes.test.ts` 가 `beforeAll` 에서 그 행을 넣는다. 첫 서비스를 만드는 명령은 WS-F 몫이다
- **`save(specs, deactivateMissing, prefix)`** — 세 번째 인자가 비활성 처리 범위다.
  이게 없던 것이 DB 테스트가 병렬로 서로를 밟던 원인이었다
- **403 판정은 `routes.ts` 의 `볼수있나()` 한 함수 안에 있다.** 지금은 활성 서비스면 통과다.
  WS-F 가 로그인한 사람의 배정 목록으로 바꾼다
- **`?service=` 가 필수라 화면이 지금 그대로면 400 을 받는다.** `web/api.ts` 의 `cases()` 가
  `?q=&page=` 만 보낸다. 서비스 띠를 붙이는 WS-E 몫이다 (소유 밖이라 건드리지 않았다)
- **`execution` 테스트 18건이 빨간불이다.** `test_run.env` 의 기본값을 뺀 결과이고
  §6 이 예고한 그대로다. 실행 요청에 `env` 를 받는 WS-B 킥오프 E 가 고친다

## 2026-09-20 — 낡은 기록 정리 (닫힌 것 표시)

위 항목 중 아래는 **이미 코드로 닫혔다.** 열린 것으로 읽고 다시 시작하지 마라.
윗줄은 그때의 기록이라 그대로 둔다 — 무엇이 닫혔는지는 여기만 본다.

- **`web/api.ts` 의 `cases()` 가 서비스를 안 보낸다** (2026-09-18 「다음 세션이 알아야 할 것」) —
  닫혔다. `apps/admin/src/web/api.ts:317` 이 `service` 를 실어 보낸다
- **케이스 목록에 '마지막 결과'가 없다. 결정이 필요하다** (2026-09-16 「다음 세션이 알아야 할 것」) —
  닫혔다. `GET /api/runs/last-by-case` 와 `apps/admin/src/web/catalogView.ts` 로 갔다
- **403 판정이 `routes.ts` 의 `볼수있나()` 한 함수 안** (2026-09-18 「다음 세션이 알아야 할 것」) —
  닫혔다. `apps/admin/src/auth/gate.ts` · `apps/admin/src/auth/scope.ts` 로 갔다 (PR #28)
