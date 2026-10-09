# SPEC 검사 결과 — run-ui-fixes (2026-09-30)

검사 범위: `git diff origin/main...HEAD` (파일 47개, PR #115). 독립 세션 검사 — 코드를 만든 세션이 아니다.
돌린 것: `npm run check:spec` 통과 (없는 절 0 · 깨진 링크 0 · 틀린 분량 0 · 상태 줄 없는 블록 0) ·
`vitest` 67개 파일 1110건 통과 (trial · trialRoutes(DB) · scope · gate · deploy · headed · `apps/admin/src/web` 전체).
돌리지 않은 것: `typecheck` · `check:tests` · 실제 컨테이너에서 `host.docker.internal` 접속 실측.

## 요약
치명 0건 · 중대 2건 · 경미 3건 · 확인 못 함 2건 — **병합 가능** (중대 2건은 사용자 판단, 둘 다 문서 한 줄씩)

## 치명
없음.

핵심 불변식(기록을 만들지 않는다)은 지켜졌다. `trialRoutes.ts` · `trial.ts` 는 `test_run` · `run_item` 에 쓰지 않고
`test_case` 읽기와 `case_input` 읽기(`저장값을채운다`)만 한다. `trialRoutes.test.ts:225` 가 행 수 불변을 단언하고 통과했다.

## 중대

### H2 — 줄의 라벨 열 너비가 DESIGN.md 에서 옛 값(62px)이다
어디:   `docs/DESIGN.md:399` (코드는 `apps/admin/src/web/styles.css:2491` `.pcell .field` 이 `84px minmax(0, 1fr)`)
무엇:   DESIGN.md 는 「줄에서는 라벨 열을 62px 로 줄이고 기본값 줄을 감춘다」라고 적는데, 이번 diff 가 줄의 라벨 열을 84px 로 바꿨다.
        같은 diff 가 DESIGN.md 를 고쳤지만(모달 예외) 이 줄은 안 고쳤다.
왜 문제: 화면 기준 문서가 코드와 다른 숫자를 말해서, 다음 세션이 DESIGN.md 를 믿고 62px 로 되돌리거나
        84px 를 위반으로 읽는다. 이번 8건 중 1번이 바로 이 줄을 건드린 일이다.
고칠 곳: WS-E (DESIGN.md — 숫자를 빼고 `.pcell .field` 를 가리키게 하는 편이 CLAUDE.md §2.7 ⑤ 에 맞다)
        같은 원인의 코드 주석: `apps/admin/src/web/styles.css:2489` 「라벨 열을 62px 로 줄인다」(값은 84px). 좁은 화면(`styles.css:1422`)의
        62px 언급은 그 화면에서 1열로 접히기 전 값을 말하는 옛 설명이라 이번 범위 밖이지만 같이 확인할 만하다.

### H3 — 색인 라우터 표가 「케이스 줄의 입력 칸 이름」 규칙으로 안내하지 않는다
어디:   `docs/SPEC.md:177` (라우터 표 「케이스 목록 줄에서 값을 고치거나 상세를 여는 자리를 고친다」 줄)
무엇:   이번에 줄의 칸 이름 규칙(공통 앞부분 떼기 · 마우스 오버 · 값 전체 title · 「입력됨」)을 `실행 §8.2 「케이스 줄의 입력 칸 이름」` 에 적었다.
        그런데 줄 자리를 고치는 사람이 가는 라우터 줄은 여전히 카탈로그 §8.1 이 정본이라고만 말하고, 카탈로그 §8.1 에는 이 규칙도 가리키는 한 줄도 없다.
        새로 더한 라우터 줄(케이스 테스트 실행)만 이번 diff 에 있다. 계획 끝 grep 표가 「카탈로그 갈래(WS-A)가 넘겨받는다」고 적었으나 넘긴 곳(킥오프 항목)은 diff 에 없다.
왜 문제: 줄의 라벨을 고치려는 세션이 카탈로그 §8.1 만 읽고 실행 §8.2 의 새 규칙을 모른 채 다른 방식으로 그려, 목록 줄과 여러 건 창이 다른 이름을 보인다
        (실행 §8.2 가 「한 벌의 규칙」이라고 못박은 것이 깨진다).
고칠 곳: 문서 — 라우터 줄 177 에 실행 §8.2 를 한 구절로 가리키거나, WORKSTREAMS WS-A 킥오프에 넘기는 항목 한 줄

## 경미

### H5/H2 — 킥오프의 파일 이름
어디:   `docs/WORKSTREAMS.md:951` (WS-F 킥오프 5번)
무엇:   「문 두 표(`auth/gate.ts` 등급표 · `auth/scope.ts` 라우트표)」 — 이번에 등급표 두 줄을 실제로 넣은 파일은 `auth/routeTable.ts` 다 (`gate.ts` 아님).
왜 문제: 킥오프는 세션이 SPEC 보다 먼저 읽는다. 없는 자리를 열게 한다. (같은 파일의 앞줄들도 `gate.ts` 를 쓰지만 이번 diff 가 더한 줄은 이번 diff 가 바르게 적어야 한다)
고칠 곳: WS-F 킥오프 (`routeTable.ts`)

### C5 — 계획 `files` 와 실제 diff 의 차이
어디:   `docs/plans/2026-09-30-run-ui-fixes.md` 할 일 4 · 9
무엇:   계획에 있으나 diff 에 없다 — `apps/runner/src/headed.ts` (headless 판단을 `playwright.config.ts` 안 삼항으로 처리) ·
        `apps/admin/src/web/CaseListParts.tsx` · `CaseListParts.test.tsx` (판정 폭을 `styles.css` 로만 처리, 단언은 `styles.test.ts`).
        반대로 계획에 없는 파일이 있다 — `CaseRowParams.tsx`(`줄` prop 한 줄) · `schema.ts` · `schema.test.ts`는 계획 「게이트 1 지적 반영」이 언급한 것이라 정상이고, `.env.example` · `scanner.test.ts` 는 계획 밖이다.
왜 문제: 계획이 「고치겠다」고 한 자리가 안 고쳐진 이유가 계획 표에 없다. 게이트 2 요약에 이유가 있으면 통과다 — 그 요약이 이 검사에 없어 **확인 못 함**.
고칠 곳: 게이트 2 요약에 이유 한 줄 (또는 계획의 files 정정)

### C1/G — 범위 밖 수정 두 건의 사유 기재 (이미 알려진 것)
어디:   `apps/admin/src/catalog/scanner.test.ts:87` · `.env.example`
무엇:   `scanner.test.ts` 는 main 에서 이미 깨져 있던 `specs[0]` 가정을 `find(tcId === 'DEMO-001')` 로 고친 것 — 테스트를 느슨하게 한 것이 아니라 정확한 대상을 지목하도록 좁혔다(G2 해당 없음).
        `.env.example` 은 `LOCAL_RUNNER_URL` 자리(계획 files 에 없다, `deploy.test.ts` 가 그 줄을 단언한다).
왜 문제: 두 건 모두 게이트 2 요약에 실려야 한다 (CLAUDE.md §1.1). 요약을 못 봐서 기재 여부는 **확인 못 함**.
고칠 곳: 게이트 2 요약

## 확인 못 함
- **G8** — 새 검사(trial · trialRoutes · Form · Modal · RunList · headed · deploy)를 일부러 부숴 빨개지는 것을 봤는지, 결과가 PR 에 있는지. PR 본문·게이트 2 요약이 이 검사에 없다. 새 검사 자체는 전부 통과했다.
- **G6 / 계획 주의 5** — 브라우저로 새로고침 없이 폴링이 도는지, 컨테이너의 `host.docker.internal` → `127.0.0.1` 전용 러너 접속을 실측했는지.
  문서(SETUP §10 · 6-인프라)는 「맥 Docker Desktop 에서만 확인했다」고 정직하게 적었으나, 이 세션은 그 실측을 재현하지 않았다.

## 통과한 항목
A1(kit 변경 없음) · A2(마이그레이션 없음) · A3(compose `LOCAL_RUNNER_URL`·`extra_hosts`가 6-인프라 §9 와 일치, Dockerfile 변경 없음) ·
A4(러너 요청은 `ExecuteRequest` 그대로, 새 엔드포인트 없음) · A5(두 통로의 경로·응답·`TRIAL_OFF`/`TRIAL_BUSY`/`INVALID_PARAMS`/`CASE_NOT_FOUND`/`TRIAL_NOT_FOUND`가 실행 §7 블록과 일치.
경미한 덧붙임: 코드는 지원하지 않는 platform 이면 400 을 내는데 §7 에 적힌 줄은 없다 — `상태: 반영 완료` 블록과 어긋나지는 않는다) · A6 · A7(서버가 쓰는 JSONB 없음) ·
B1~B2(스냅샷 영향 없음 — `run_item` 을 안 만든다) · B3(러너 DB 접근 없음, `HOST` 만 추가) · B4~B11 해당 없음 · B12(`test_run` 을 훑는 새 조회 없음) · B13(`tests/` 변경 없음) ·
C2(`execution/trial.ts` 가 `../web/mask.js` 를 import 하는 것은 카탈로그·실행·리포팅 사이 직접 import 가 아니라 화면 쪽 순수 함수 재사용이며, 이전부터 실행 코드에 같은 방식이 있다 — 다만 지켜볼 자리로 적는다) · C3(러너가 쓰는 곳은 `runner:local` 의 `./artifacts` 로 `.gitignore` 에 있다) · C4(다른 곳이 막아 준다는 주석 없음) ·
C6(`grep "상태: 대기"` — 새 블록은 `반영 완료 (2026-09-30, PR #115)` 로 닫힘) ·
D1~D5(`tcId` 표기 · 접두사 `XTR` 형식 · 디바이스 이름 이상 없음) · E1~E4 해당 없음(`tests/**` 변경 없음) ·
F1~F10(F8 — 판정 색은 `Verdict` 와 기존 `--pass`/`--fail`/`--na` 자리 안이고, 미확정 강조는 `--ink` 로 판정 색을 안 씀 · F9 — 고친 화면 tsx 마다 같은 이름의 `*.test.tsx` 가 있고 변경분을 단언한다) ·
G1 · G2 · G3(`XTR` 정리가 자기 `service_id`·`tc_id` 목록으로만 지우고 `LIKE` 없음, CLAUDE.md §3 표에 `XTR` 등록) · G4~G5 · G7(경계 검사가 gate.test 에서 read 만 있는 사람 POST 403 을 단언) · G9 해당 없음 ·
H1(`check:spec` 통과) · H4(기존 절 번호 불변 — 새 절은 §7·§8.2 안의 소제목으로 더함) · H5(SPEC.md 색인 분량 행이 `check:spec` 과 일치, 손으로 쓴 개수 문장 새로 없음).

## 기타
- `GET /api/cases/:tcId/test-run/:trialId` 는 경로의 `tcId` 와 저장된 시험의 케이스가 같은지 보지 않는다(`trial.ts` 는 시작한 사람과 번호만 본다). 시작한 사람만 읽으므로 새 누수는 없다.
  다만 서비스 권한이 그 사이 회수돼도 다른 케이스 경로로 읽을 수 있다. 체크리스트 항목으로 만들 정도는 아니다.
- `RunSetup.tsx` 는 원래 300줄을 넘는 파일이고 이번에 2줄 늘었다(알려진 것 — `TestRun.tsx` 에 로직을 두어 최소로 얹었다). CLAUDE.md §3 「300줄」 초과는 pre-existing 이라 지적하지 않는다.
- 문서 정합 제안: 6-인프라 「내 컴퓨터 러너」와 러너 §5.2 는 WS-C 킥오프(`PLATFORM_HEADED`·`HOST`)에 항목이 없다. 계약 블록의 영향에는 WS-C 가 있으므로 다음 러너 작업에서 킥오프 한 줄을 더하는 것을 제안한다.
