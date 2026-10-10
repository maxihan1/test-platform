# apps/admin — DB 테스트 fixture 접두사

> 루트 `CLAUDE.md` §3 「DB 테스트 fixture」에서 옮겨 왔다 (2026-10-08 · 세션마다 늘 읽히던 분량을 줄이려고).
> 이 폴더의 파일을 작업할 때만 읽힌다. 아래 「이 줄에 적는다」는 이 목록을 말한다.
> 이 파일의 기존 규칙 수정 · 삭제는 루트 `CLAUDE.md` §2.5 와 같이 승인 대상이다(새 접두사 추가는 직접).

- **DB 테스트 fixture**: 접두사는 **갈래마다 고유하게**, 정리 구문(`DELETE ... LIKE`)은 **자기 것에만** 맞게 쓴다.
  넓은 패턴은 다른 파일이 만든 fixture 까지 범위에 넣어 실행 도중에 지운다.
  WS-A `ZZA` · WS-B `XBS`·`XBR`·`XBQ`·`XBX` · WS-D `XDC`·`XDR`·`XDD`·`XDG` ·
  WS-F `xfu1`~`xfu4`·`XFS1`·`XFS1B`·`XFS2`~`XFS4`·`XFS5`(`auth/scope.test.ts`) ·
  WS-작성 `XWA`(`authoring/store.test.ts`)·`XWAR`(`authoring/routes.test.ts`)·
  `XWS`(`authoring/assetStore.test.ts`)·`XWU`(`authoring/assets.test.ts`) ·
  역방향 작성 `XWV`(`authoring/reverse.test.ts`)·`XWO`(`authoring/outputs.test.ts`)(2026-09-26 — 자기 `service_id` 로만 지운다) ·
  작성 토큰 `XWK`(`authoring/usage.test.ts`, 2026-09-27 — `authoring_request` 는 자기 `service_id` 로, 마지막에 그 `service` 행까지 지운다) ·
  작성 중단 `XWT`(`authoring/stop.test.ts` — 계정 `xwt1` 도 지운다)·`XWTC`(`authoring/stop-columns.test.ts`)(2026-09-27 — 둘 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  역방향 증적 `XDU`(`reporting/collect-unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XDU%'`·`tc_id LIKE 'XDU-%'`·`prefix = 'XDU'`) ·
  역방향 견주기 `XDV`(`reporting/insights-unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XDV%'`·`prefix = 'XDV'`) ·
  대시보드 작성 현황 `XDH`·`XDHOFF`(`reporting/dashboard-authoring.test.ts`, 2026-09-26 — `authoring_request` 는 그 서비스의 `service_id` 로 ·
  `test_case` 는 `tc_id LIKE 'XDH-%'`·`'XDHOFF-%'` · 마지막에 `service WHERE prefix IN ('XDH','XDHOFF')` 까지 지운다) ·
  계약 반영 `XRC`(`db/reverse-columns.test.ts`, 2026-09-25 — 자기 `service_id` 로만 지운다) ·
  E2E 시나리오 표 `XSC`(`db/scenario-columns.test.ts`, 2026-09-28 — 부품 → `test_run` → 버전 → 시나리오를 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  시나리오 실행 거르기 `XBK`(`execution/kind.test.ts`, 2026-09-29 — `XSC` 와 같은 순서로 자기 `service_id` 로만 지우고 그 `service` 행까지) ·
  실행 저장값 표 `XCI`(`db/case-input-columns.test.ts`)·저장값 `XSI`(`execution/savedInput.test.ts`)(2026-09-29 — 둘 다 자기 `service_id`·`tc_id` 목록으로 `run_item` → `test_run` → `case_input` → `service_env` → `test_case` → `service` 순으로 지운다) ·
  시나리오 저장 `XSS`·`XSS2`(`scenario/store.test.ts`)·부품 재료 `XSP`(`scenario/parts.test.ts`)·라우트 `XSR`(`scenario/routes.test.ts`)·문 `XSA`·`XSA2`·`XSA3`(계정 `xsa-reader`·`xsa-writer`, `auth/gate.test.ts`·`auth/scope.test.ts`)(2026-09-29 — 전부 자기 `service_id`·id·이름 목록으로만 지우고 `LIKE` 를 안 쓴다. **`XSA` 로 시작하는 새 이름을 고르지 않는다**) ·
  시나리오 실행 `XSE`(`scenario/runStore.test.ts`)·실행 라우트 `XSU`(`scenario/runRoutes.test.ts`)(2026-09-29 — 둘 다 자기 `service_id` 로 step → part → `test_run` → 버전 → 시나리오 → `service_env` → 자기 `tc_id` 목록의 `test_case` → `service` 순으로 지운다) ·
  작성 이어하기 `XRM`(`db/resume-columns.test.ts`)·`XWM`(`authoring/resume.test.ts`)(2026-09-28 — 둘 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 실행 기록 `XWH`(`authoring/history.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 커버리지 칸 `XWG`(`db/coverage-columns.test.ts`)·끝내기 셈 `XWJ`(`authoring/coverage-routes.test.ts`)·대시보드 커버리지 `XDJ`(`reporting/dashboard-coverage.test.ts`)(2026-09-30 — 셋 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 이어 작성 칸 `XCF`(`db/continue-columns.test.ts`)·이어 작성 상세 `XWN`(`authoring/continue-detail.test.ts`)·거절 `XWP`(남의 서비스 `XWPB` 도 — `authoring/continue-reject.test.ts`)·자료 복사 `XWQ`(`authoring/continue-copy.test.ts`)(2026-09-30 — `XWN`·`XWP`·`XWQ` 셋은 판을 `authoring/continue-fixture.ts` 가 같이 차리고 자기 `service_id` 로 자료 → 요청 → `service_env` 순으로 지운다. `XCF` 는 요청 → `service` 순. 넷 다 그 `service` 행까지 지우고 `LIKE` 를 안 쓴다) ·
  케이스 엑셀 `XCX`(`catalog/export-routes.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지. 계정은 `'xcx-%'` · 케이스는 `tc_id LIKE 'XCX-%'`) ·
  작성 보류 입력 `XWL`(`authoring/held.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 보류 통로 `XWLR`(`authoring/held-routes.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  케이스 테스트 실행 `XTR`(`execution/trialRoutes.test.ts`, 2026-09-30 — 자기 `service_id` 로만 지우고 그 `service` 행까지) ·
  시나리오 시험 실행 `XST`(`scenario/trial.test.ts`)·통로 `XSTR`·`XSTR2`(`scenario/trialRoutes.test.ts` — 계정 `xstr-a`·`xstr-b`·`xstr-c`)(2026-10-04 — 둘 다 자기 `service_id`·정확한 tc_id·계정 목록으로만 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다. **`XST` 로 시작하는 새 이름을 고르지 않는다**) ·
  작성 보류 머지 `XWLM`(`authoring/held-merge.test.ts`, 2026-09-29 — `held-routes.test.ts` 에서 떼어 냈다. 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  역방향 WS-B `XBU`(`execution/unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XBU%'`·`tc_id LIKE 'XBU-%'`·`prefix = 'XBU'`) ·
  에이전트 토큰 `xfu5`(계정)·`XFS6`(서비스)(`auth/agentToken.test.ts`, 2026-09-23 — `xfu4` 와 겹치지 않게 `'xfu5%'` 로만 지운다) ·
  테스트 계정 `xfu7`(계정)·`XFS7`(서비스)(`settings/testAccount.test.ts`, 2026-09-26 — `'xfu7%'`·`'XFS7%'` 로 지운다) ·
  권한 칸 `xfu8`(계정)·`XFS8`(서비스)(`db/permissions-columns.test.ts`, 2026-09-28 — `user_service`·`app_user` 는 `'xfu8%'`, `service` 는 `'XFS8%'` 로 지운다) ·
  설정 계정 `xfu9`(계정)·`XFS9`(서비스)(`settings/users.test.ts`, 2026-09-28 — `routes.test.ts` 에서 떼어 냈다. `'xfu9%'`·`'XFS9%'` 로 지운다) ·
  가입 수락·거절 `xpa`(계정)·`XPA`(서비스)(`settings/approve.test.ts`, 2026-09-28 — `'xpa%'`·`'XPA%'` 로 지운다) ·
  회원가입 `xsg`(계정)(`auth/signup.test.ts`, 2026-09-28 — `'xsg%'` 로 지운다) ·
  비밀번호 변경 `xpw`(계정)(`auth/password-change.test.ts`, 2026-09-28 — `'xpw%'` 로 지운다) ·
  Grafana 통로 `xgfp`(계정)(`grafana/proxy.test.ts`)·`xgfg`(계정)(`grafana/gate.test.ts`)(2026-09-28 — 각자 `'xgfp%'`·`'xgfg%'` 로만 지운다. `'xgf%'` 로 넓히지 않는다) ·
  케이스 고치기 `XEA`(`db/edit-columns.test.ts`)·`XEB`(`authoring/edit-routes.test.ts` — 케이스 `XEB-001`~`003` · `XEBO-001`)·`XEC`(`authoring/edit-finish.test.ts` — 케이스 `XEC-001`~`004`)(2026-10-01 — 셋 다 자기 `service_id` 와 정확한 tc_id 목록으로만 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다. **`XEB` 로 시작하는 새 이름을 고르지 않는다**) ·
  반영 겹침 `XCN`(`db/conflict-columns.test.ts`)·`XWY`(`authoring/conflict-routes.test.ts`)(2026-10-01 — 둘 다 자기 `service_id` 로 요청을 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다) ·
  실행 종류 `XRK`(`execution/run-kind-db.test.ts`, 2026-10-02 — 자기 `service_id` 로 `test_run` 을 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다) ·
  케이스 종류 거르기 `XCK`(`catalog/kind-filter.test.ts`, 2026-10-02 — 정확한 tc_id 목록으로만 `test_case` 를 지운다. `LIKE` 를 안 쓴다) · 훑지 않을 경로 칸 `XEX`(`db/crawl-exclude-columns.test.ts`, 2026-10-04 — 자기 service_id 로 지우고 그 service 행까지. LIKE 를 안 쓴다) · 케이스 기법 칸 `XCT`(`db/case-techniques-columns.test.ts`)·목록 기법 거르기 `XTQ`(`catalog/technique-filter.test.ts`)(2026-10-05 — 둘 다 정확한 tc_id 목록으로만 지운다. `LIKE` 를 안 쓴다. **`XCT` · `XTQ` 로 시작하는 새 이름을 고르지 않는다**) · 시나리오 이어 주기 칸 `XRL`(`db/scenario-relink-columns.test.ts`, 2026-10-06 — 자기 service_id 로 부품 → test_run → 버전 → 시나리오 → service 순으로 지운다. `LIKE` 를 안 쓴다) · 시나리오 실행 저장값 채우기 `XSF`(`scenario/runFill.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 결과 꽂은 값 · 뒷정리 `XSB`(`scenario/runBound.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 미확정 통과 셈 `XSG`(`scenario/unconfirmedCount.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 결과 머리 `XSH`(`scenario/runHead.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 실행 줄 판정 `XSV`(`execution/scenarioRowVerdict.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 목록 쓰는 케이스 거르기 `XSN`(`scenario/uses.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 앱 대시보드 질의 `XDQ`·`XDQB`·`XDQT`(`reporting/dashboardResults.test.ts`, 2026-10-07 — 자기 service_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 증적 라우트 `XDR` 의 `service` 행(`reporting/routes.test.ts`, 2026-10-07 — 대시보드 통로 검사가 만든다. `prefix = 'XDR'` 정확 일치로만 지운다. **`XDR` 로 시작하는 새 서비스 접두사를 고르지 않는다**) · 정식 실행 선언 대조 `XBP`(`execution/declared.test.ts`, 2026-10-07 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 실패 카드 질의 `XFC`(`reporting/failures.test.ts` · `reporting/failures-routes.test.ts` 는 `XFCR` · 계정 `xfcr-reader`·`xfcr-noruns`, 2026-10-08 — 자기 service_id · 정확한 계정 이름으로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 표준 기획서 판 칸 `XPV`(`db/prd-columns.test.ts`, 2026-10-10 — 자기 service_id 로 요청의 읽은 판을 비우고 판 → 요청 → service 순으로 지운다. `LIKE` 를 안 쓴다) · 표준 기획서 저장소 `XPS`(`prd/store.test.ts`, 2026-10-10 — 자기 service_id 로 지도 → 정확한 tc_id 목록의 test_case → 읽은 판 비우기 → 판 → 요청 → service 순으로 지운다. `LIKE` 를 안 쓴다) · 표준 기획서 API `XPR`(`prd/routes.test.ts`)·에이전트 통로 `XPG`(`prd/agentRoutes.test.ts` — 계정 이름 `xpg-agent`·`xpg-person` 은 표에 안 넣는다)(2026-10-10 — 둘 다 자기 service_id 로 읽은 판 비우기 → 판 → 요청 → service 순으로 지운다. `LIKE` 를 안 쓴다. 2026-10-11 `XPR` 은 추적표 엑셀 검사로 자기 service_id 의 run_item → test_run → req_case 와 정확한 tc_id(`XPR-FN-001` · `002`)의 test_case 도 지운다) · 지도 ① 채우기 `XMP`(`catalog/reqMap.test.ts`, 2026-10-11 — 자기 service_id 로 지도 → service 순으로 지운다. `LIKE` 를 안 쓴다) · 미확정 계산 `XUN`(`prd/unconfirmed.test.ts`, 2026-10-11 — 자기 service_id 로 지도 → 판 → 정확한 tc_id 목록의 test_case → service 순으로 지운다. `LIKE` 를 안 쓴다) · 지도 ② 채우기 `XCS`(`catalog/screenMap.test.ts`, 2026-10-11 — 정확한 tc_id 목록으로 지도 → test_case 를 지우고 자기 service_id 로 service 행까지. `LIKE` 를 안 쓴다) · 케이스 목록 맥락 `XCL`(`catalog/context-list.test.ts`, 2026-10-11 — 정확한 tc_id 목록으로 지도 ② 를, 자기 service_id 로 지도 ① · 판을 지우고 tc_id 목록의 test_case → service 행까지. `LIKE` 를 안 쓴다) · 실패 요구사항 · 판정 `XDB`(`reporting/failReqs.test.ts`, 2026-10-11 — 자기 service_id 로 버그 → run_item → test_run → 시나리오 → 작성 요청 → 지도 → 판 → service 순으로 지운다. 계정 `xdb-writer`·`xdb-reader`. `LIKE` 를 안 쓴다) · 화면이 맞음 반영 통로 `XPF`·남의 서비스 `XPFB`(`prd/screenRight.test.ts`, 2026-10-11 — 자기 service_id 로 읽은 판 비우기 → 판 → 요청 → run_item → test_run → req_case → service 순으로 지운다. test_case 는 안 만든다. `LIKE` 를 안 쓴다).
  **`XWA`·`XWAR`·`XWS`·`XWU`·`XRC`·`XWV`·`XWO`·`XWK`·`XWT`·`XWTC` 는 `authoring_request` 를 `LIKE` 가 아니라 자기 `service_id` 로만 지운다** —
  `XWAR` 이 `XWA` 로 시작하므로 `LIKE 'XWA%'` 로 넓히면 남의 fixture 를 실행 도중에 지운다 (2026-09-22).
  **WS-D·WS-F는 `ZZ`로 시작하는 것을 쓰지 않는다.**
  **새 접두사를 쓰면 이 줄에 적는다.** 안 적으면 다음 갈래가 같은 것을 골라 남의 fixture를 실행 도중에 지운다 (2026-09-19)
  **`LIKE`로 넓힐 때는 그 아래 것을 전부 적는다** — `identify.test.ts`가 `'XFS1%'`로 지우므로
  `XFS1`로 시작하는 이름은 그 파일 것이다. 다른 갈래가 `XFS1x`를 고르면 실행 중에 지워진다 (2026-09-19)
  `gate.test.ts`가 `'XFS3%'`로 지우므로 `XFS3`으로 시작하는 이름도 그 파일 것이다 (2026-09-19)
  **`XDG`는 파일 둘이 나눠 쓴다** — `generate.test.ts`가 `XDG 증적 생성 실행`,
  `insights.test.ts`가 `XDG 견주기`다. **둘 다 `'XDG%'`로 넓히면 안 된다** (2026-09-21).
  나중에 온 쪽이 `'XDG%'`를 쓸 뻔했고, 그랬으면 앞엣것의 fixture를 실행 도중에 지웠다 —
  `XFS1`에서 이미 겪은 그 일이다. **접두사가 이미 표에 있어도 그 아래를 누가 쓰는지 다시 본다**
  **`XBR`도 표가 갈린다** — `routes.test.ts`가 `test_case`·`param_set`은 `tc_id LIKE 'XBR%'`로,
  진행 조회 검사는 `test_run.title LIKE 'XBR 진행%'`로 지운다. **`test_run`에 `'XBR%'`를 쓰면 안 된다**
  (2026-09-21). 같은 접두사라도 **어느 표를 지우는지가 다르면 다른 것**이다
  **★ 자기가 만든 것도 치운다** — 행만 지우고 **서비스·계정 같은 부모 행을 살려 두면**
  다른 검사가 「지금 살아 있는 것」을 훑을 때 **2회차부터 다른 세상에서 시작한다.**
  2026-09-22 에 그래서 전체 검사가 **1회차만 통과**했고, 깨진 것은 **내가 안 건드린 파일들**이었다.
  **증상이 남의 파일에서 나도 원인은 내 검사가 남긴 것일 수 있다**
  **이유는 병렬이 아니다.** `vitest.config.ts`가 `fileParallelism: false`로 병렬을 껐다 —
  넓은 `DELETE ... LIKE`가 **다른 파일의 fixture까지 범위에 넣는 것**이 문제다 (2026-09-19)
  확인은 1회다 (2026-09-25 — 서비스 전이라 연속 3회를 걷었다. 되살릴 때 spec-review G3 과 함께 바꾼다).
  **그래서 이 규율이 더 중요해졌다** — 2회차에만 드러나는 찌꺼기를 기계가 더는 못 잡는다
