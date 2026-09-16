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
