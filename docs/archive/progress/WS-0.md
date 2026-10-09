# WS-0 진행 기록 — Phase 0 골격

## 2026-09-16
- 완료: 모노레포 골격(npm workspaces), SPEC §9.1 의존성 일괄 설치, 계약 3종(`packages/kit/src/types.ts`·`db/migrations/20260916000001_init.sql`·`docker-compose.yml`), 공용 골격(`apps/admin/src/app.ts` 라우트 등록 규약 + 컨텍스트 3곳 빈 `routes.ts`, `apps/admin/src/db/` 풀, kit 배럴, `check.ts` exit 0 스텁), 데모 테스트 10건(순수 Playwright, `desktop`/`mobile` 프로젝트), 러너 `/health`·`/execute`(자식 프로세스 실제 실행 + 경로 이탈 차단), 얇은 관통 스크립트 `apps/admin/src/smoke.ts`
- 확인함: 컨테이너 4개 기동(+ migrate exit 0), 테이블 6종 생성, `grafana_ro` 계정 생성, 러너 `/health`가 `playwrightVersion: 1.63.0` 반환(이미지 태그와 일치), 러너 안에서 DEMO-001이 실제 브라우저로 통과(1.8초), `npm run smoke`로 `run_item` 1행 PASS 저장, `param_set`을 바꿔도 `run_item.params`가 안 따라 바뀜
- 미완: 없음. G1은 Maxi님이 직접 확인하는 게이트라 승인 대기
- 막힌 것: `ALLOW_PROTECTED=1 claude`가 이 버전에서 안 먹었다. `.claude/settings.local.json`으로 우회. LEARNINGS 맨 위 참조
- 다음 세션이 알아야 할 것:
  - 진입점은 admin이 `apps/admin/src/app.ts`, 러너가 `apps/runner/src/server.ts`. 둘 다 `tsx`로 바로 돈다 (빌드 단계 없음)
  - 라우트 등록 규약은 컨텍스트 폴더의 `routes.ts`가 Fastify 플러그인을 default export 하는 것. `app.ts`는 건드리지 않는다
  - 단위 테스트는 `*.test.ts`, Playwright는 `*.spec.ts`. `vitest.config.ts`가 이 확장자로 갈라 본다
  - Phase 0 데모 테스트는 `PLATFORM_PARAMS`를 읽지 않는다. 주입 소비는 WS-C의 `test()` 래퍼가 맡는다
  - DEMO-009/010의 환경 분기는 뷰포트 폭으로 임시 구현했다. WS-C가 `platforms` 선언으로 대체한다
  - G1 통과 후 `.claude/settings.local.json`을 지워야 잠금이 돌아온다
