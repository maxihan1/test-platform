# 실행 화면 개선 8건

등급: 3 · 갈래: WS-E(화면) · WS-B(서버) · WS-F(권한 표) · 2026-09-30

## 도메인 정리
실행(Execution) · 카탈로그(케이스 줄) · 인증(권한 표). 새 개념은 「케이스 테스트 실행」 하나다 —
기록(test_run·run_item)을 만들지 않고 내 컴퓨터 러너로 브라우저 창을 띄워 돌리는 실행.
나머지 일곱은 화면 고침이거나 원인 확인이다.

## 왜
사용자 8건 (2026-09-30).
1. 줄의 입력 칸 이름이 설명 문장이라 62px 칸에서 줄바꿈으로 깨진다 → 줄임 + 마우스 오버로 전체 설명
2. 저장된 비밀번호가 빈 칸처럼 보인다(줄에서는 기본값 줄을 감춘다) → 「입력됨」 표시
3·4. 실행할 케이스 모달이 좁고 바깥을 누르면 닫혀 입력 중인 값을 잃는다
5. RUN 20388 MKT-030·032 미실행 = **저장된 로그인 값이 없어서**. case_input 에 두 건이 없고 run_item.params 가 비어 있었다.
   로그인이 안 돼 배너를 30초 기다리다 Playwright 시간 초과(`Test timeout of 30000ms exceeded`) → NA. (코드 고침 없음. 값 저장이 해법)
6. RUN 20389 0·0·0 = **35건 전부 미확정**(`화면만 — 기획서 없음`)이라 확정 집계에서 빠진다(도메인/실행 §3.2, 설계대로).
   목록 줄이 0 셋 옆에 작은 글씨로만 미확정을 적어 「아무것도 안 돌았다」로 읽힌다 → 판정 없는 실행은 세 칸을 「—」로
7. 테스트 실행 (게이트 0 승인 2026-09-30 「내 컴퓨터 러너」)
8. 케이스 줄 마지막 결과 열: 「실행 이력 없음」·판정 흐름 폭이 달라 상세·실행 버튼 자리가 줄마다 틀어진다

## Plan

### 할 일 1. 테스트 실행 저장소 (메모리) — 서버
- **RED** — `trial.test.ts`: 시작하면 RUNNING 으로 잡히고 러너 응답이 오면 DONE+결과, 러너에 못 닿으면 DONE+NA+안내 문장.
  시작한 사람 아닌 사람이 읽으면 null. 24시간 지난 것은 새 시작 때 치운다. DB 에 아무것도 안 쓴다
- **GREEN** — `execution/trial.ts` (`Map<trialId, …>` · 러너 호출은 주입)
- **REFACTOR** — 없음
**files**: apps/admin/src/execution/trial.ts, apps/admin/src/execution/trial.test.ts
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/execution/trial.test.ts`

### 할 일 2. 테스트 실행 라우트 — 서버
- **RED** — `trialRoutes.test.ts`(접두사 `XTR`): `POST /api/cases/:tcId/test-run` 이 202 + trialId, 값이 명세에 안 맞으면 400 + violations,
  없는 케이스 404, 시작한 사람만 `GET /api/cases/:tcId/test-run/:trialId` 로 읽고 남은 읽으면 404. `test_run`·`run_item` 행 수 그대로
- **GREEN** — `execution/trialRoutes.ts`. 검증은 createRun 과 같은 `validate.ts` 를 쓴다. `LOCAL_RUNNER_URL`(기본 `http://localhost:4001`)로 `POST /execute`,
  `runId: 0` · `historyId` 는 시각 기반 정수. 동시 실행 상한 자리를 쓰지 않는다(내 컴퓨터). `app.ts` 에 등록
- **REFACTOR** — 러너 보내기는 `runner.ts` 의 `러너에보낸다` 를 주소만 받게 최소로 넓힌다
**files**: apps/admin/src/execution/trialRoutes.ts, apps/admin/src/execution/trialRoutes.test.ts, apps/admin/src/execution/runner.ts, apps/admin/src/app.ts
**depends-on**: [1]
**검증**: `DATABASE_URL=postgres://platform:platform@127.0.0.1:5433/platform_h108 npx vitest run apps/admin/src/execution/trialRoutes.test.ts apps/admin/src/execution/runner.test.ts`

### 할 일 3. 권한 표 — 인증
- **RED** — `scope.test.ts` 가 라우트를 훑어 빠진 것을 잡는다(새 두 라우트가 표에 없어 실패). `gate.test.ts`: read 만 있는 사람은 POST 403
- **GREEN** — `scope.ts` 두 줄(`케이스 tcId`), `routeTable.ts` 두 줄(`POST` 실행쓰기 · `GET` 실행읽기)
**files**: apps/admin/src/auth/scope.ts, apps/admin/src/auth/routeTable.ts, apps/admin/src/auth/gate.test.ts
**depends-on**: [2]
**검증**: `DATABASE_URL=postgres://platform:platform@127.0.0.1:5433/platform_h108 npx vitest run apps/admin/src/auth/scope.test.ts apps/admin/src/auth/gate.test.ts`

### 할 일 4. 내 컴퓨터 러너 켜기 — 러너·compose
- **RED** — `playwright.config` 의 headless 판단을 순수 함수로 빼 `PLATFORM_HEADED=1` 이면 false 인 것을 `apps/runner/src/headed.test.ts` 로 단언.
  `deploy.test.ts` 가 compose 의 admin 에 `LOCAL_RUNNER_URL` 과 `host.docker.internal` 이 있는지 본다
- **GREEN** — `playwright.config.ts` `use.headless`, 러너 `server.ts` 의 `HOST`(내 컴퓨터는 `127.0.0.1` 만 열어 LAN 에 안 연다),
  `package.json` 스크립트 `runner:local`(`PLATFORM_HEADED=1 HOST=127.0.0.1 PORT=4001 PLATFORM_TESTS_DIR=./tests tsx apps/runner/src/server.ts`), compose admin 환경변수 + `extra_hosts`
**files**: playwright.config.ts, apps/runner/src/server.ts, apps/runner/src/headed.ts, apps/runner/src/headed.test.ts, package.json, docker-compose.yml, apps/admin/src/deploy.test.ts
**depends-on**: []
**검증**: `npx vitest run apps/runner/src/headed.test.ts apps/admin/src/deploy.test.ts`

### 할 일 5. 화면 — 테스트 실행 칸
- **RED** — `TestRun.test.tsx`: 「테스트 실행」을 누르면 주소 칸 값과 지금 입력값으로 POST, 실행 중 표시, 끝나면 통과/실패·단계 표시.
  러너에 못 닿으면 「내 컴퓨터 러너를 켜세요: npm run runner:local」. 「기록에 남지 않습니다」 안내가 보인다. 실행 쓰기가 없으면 버튼이 없다
- **GREEN** — `TestRun.tsx` + `api.ts`(`startTrial`·`getTrial`) + RunSetup 에 한 줄 얹기 + `messages/*.ts` 영어 키.
  주소 칸 기본값은 고른 대상 서버 주소이고, Docker 안 이름(점 없는 호스트)이면 `localhost` 로 바꿔 채운다
**files**: apps/admin/src/web/TestRun.tsx, apps/admin/src/web/TestRun.test.tsx, apps/admin/src/web/api.ts, apps/admin/src/web/RunSetup.tsx, apps/admin/src/web/messages/runs.ts
**depends-on**: [2]
**검증**: `npx vitest run apps/admin/src/web/TestRun.test.tsx apps/admin/src/web/RunSetup.test.tsx apps/admin/src/web/messages.test.ts`

### 할 일 6. 저장된 비밀번호 「입력됨」 (2번)
- **RED** — `Form.test.tsx`: 저장된 비밀값이고 칸이 비면 입력 칸의 placeholder 가 「입력됨」이고 값은 비어 있다. 저장 안 된 비밀값은 placeholder 가 없다
- **GREEN** — `Form.tsx` 입력 칸에 placeholder 한 줄 (`.pcell` 이 기본값 줄을 감춰도 칸 안에서 보인다)
**files**: apps/admin/src/web/Form.tsx, apps/admin/src/web/Form.test.tsx, apps/admin/src/web/messages/cases.ts
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/web/Form.test.tsx apps/admin/src/web/messages.test.ts`

### 할 일 7. 칸 이름 줄임 + 마우스 오버 (1번)
- **RED** — `Form.test.tsx`: 라벨에 `title` 이 있고 값은 「설명 · 칸 이름(key)」. CSS 는 `styles.test.ts` 가 줄임 규칙(`text-overflow: ellipsis`)을 본다
- **GREEN** — `Form.tsx` 라벨 `title`, `.pcell .field label` 한 줄 줄임(폭 62 → 84px, 줄에서만)
**files**: apps/admin/src/web/Form.tsx, apps/admin/src/web/Form.test.tsx, apps/admin/src/web/styles.css, apps/admin/src/web/styles.test.ts
**depends-on**: [6]
**검증**: `npx vitest run apps/admin/src/web/Form.test.tsx apps/admin/src/web/styles.test.ts`

### 할 일 8. 실행할 케이스 모달 넓게 · 바깥 눌러도 안 닫힘 (3·4번)
- **RED** — `Modal.test.tsx`: `바깥눌러닫기={false}` 이면 뒷막을 눌러도 안 닫히고 Esc·버튼은 닫는다. 기본은 그대로 닫는다. `RunPickModal.test.tsx`: 뒷막을 눌러도 `onClose` 안 불림
- **GREEN** — `Modal.tsx` prop, `RunPickModal.tsx` 에서 끔 + `매우넓게` 크기(`min(1120px, 94vw)`), `styles.css`, `DESIGN.md` 「모달」에 예외 한 줄
**files**: apps/admin/src/web/Modal.tsx, apps/admin/src/web/Modal.test.tsx, apps/admin/src/web/RunPickModal.tsx, apps/admin/src/web/RunPickModal.test.tsx, apps/admin/src/web/styles.css, docs/DESIGN.md
**depends-on**: [7]
**검증**: `npx vitest run apps/admin/src/web/Modal.test.tsx apps/admin/src/web/RunPickModal.test.tsx`

### 할 일 9. 마지막 결과 열 정렬 (8번) · 실행 기록 0·0·0 (6번)
- **RED** — `RunList.test.tsx`: 전부 미확정인 실행 줄은 통과·실패·미실행 자리에 「—」이고 「미확정 35(통과 33 · 미실행 2)」가 판정 글자로 눈에 띈다.
  `CaseListParts.test.tsx`: 판정 묶음이 고정 폭 칸이고 이력 없음도 같은 폭
- **GREEN** — `.devices`/`.device` 폭을 칸 수 기준 고정(`.device-none`·흐름이 폭을 못 밀게), `.right` 를 버튼 자리 고정으로. `RunList.tsx` 미확정 줄 처리. 눈으로 밝게·어둡게 아닌 **밝게만**(어두운 테마 없음) 확인
**files**: apps/admin/src/web/styles.css, apps/admin/src/web/CaseListParts.tsx, apps/admin/src/web/CaseListParts.test.tsx, apps/admin/src/web/RunList.tsx, apps/admin/src/web/RunList.test.tsx, apps/admin/src/web/messages/runs.ts
**depends-on**: [8]
**검증**: `npx vitest run apps/admin/src/web/RunList.test.tsx apps/admin/src/web/CaseListParts.test.tsx apps/admin/src/web/styles.test.ts`

## SPEC 동반 수정 (§2.7)

### 할 일 10. 같은 규칙 찾기 + 명세 고치기
- 낱말 「시험 실행」·「내 컴퓨터」·「headed」·「LOCAL_RUNNER_URL」·「닫는 길 셋」 으로 `docs/spec/` 전부 grep 한 결과를 계획 끝에 붙인다
- 도메인/실행: §3.2(케이스 테스트 실행 — 기록 안 남음), §7 API 두 줄 + 계약 블록(`상태:`), §8.2 화면(테스트 실행 칸·모달 안 닫힘·입력 칸 줄임·입력됨), §8.7(판정 없는 실행 「—」)
- 도메인/러너: 내 컴퓨터 러너(`PLATFORM_HEADED`·`HOST`)
- 공통/6-인프라: compose `LOCAL_RUNNER_URL`·`extra_hosts`, 내 컴퓨터 러너 켜는 법
- 도메인/인증 §7 표(`테스트 실행`은 `(실행, write)` · 결과 읽기 `(실행, read)`+시작한 사람만)
- SPEC.md 색인 라우터 표, WORKSTREAMS 킥오프(WS-B·WS-E), SETUP.md(내 컴퓨터 러너), DESIGN.md
- CLAUDE.md fixture 표에 `XTR`(`execution/trialRoutes.test.ts`) — 자기 `service_id` 로만 지운다
**files**: docs/spec/도메인/실행.md, docs/spec/도메인/러너.md, docs/spec/공통/6-인프라.md, docs/spec/도메인/인증.md, docs/SPEC.md, docs/WORKSTREAMS.md, docs/SETUP.md, CLAUDE.md
**depends-on**: []
**검증**: `npm run check:spec`

## Plan 메타
할 일 10개 · 예상 묶음 4개 · 구현 규율: TDD · 추가 검증: `npm run typecheck` · `npm run check:spec` · `npm run check:tests`

## 리뷰 결과
(계획 검토가 채운다)

**렌즈**: 엔지니어링 · 디자인 · 전략 (3등급 = 3종) · 2026-09-30
**방식**: gstack 세 렌즈 스킬이 대화형(질문·시안 생성)이라 체인의 「비대화형 한 번」 규칙과 맞지 않아, 세 관점을 한 번 훑는 방식으로 대신했다. 렌즈 스킬의 자체 절차·기록은 돌리지 않았다.
**판정**: BLOCKER 0건 · 주의 8건

### 주의 1 — 「내 컴퓨터」는 관리 서버와 같은 기계일 때만 뜻이 맞다
`LOCAL_RUNNER_URL` 이 가리키는 곳은 **관리 서버가 도는 기계(Docker 호스트)** 다. 지금처럼 맥 한 대에 다 있으면 내 맥이지만,
회사마다 서버를 따로 두는 납품 형태에서는 브라우저를 보는 사람의 컴퓨터가 아니라 서버 기계에 창이 뜬다(또는 못 닿는다).
고칠 것: 기본값을 두지 않고 **환경변수가 있을 때만 켠다**(없으면 「이 서버에는 테스트 실행이 켜져 있지 않습니다」). 이 한계를 명세·SETUP 에 적는다.

### 주의 2 — 열 주소를 사용자가 적는다
`baseUrl` 이 스킴 검사 없이 러너에 가면 `file:`·`javascript:` 같은 주소로 창이 열린다. `http://`·`https://` 만 받고 400 을 낸다(테스트 포함).

### 주의 3 — 결과에 비밀값이 새지 않게
테스트 실행 결과(단계·오류)가 입력값을 되돌려 줄 수 있다. 실행 기록 조회가 쓰는 가림(`가린값들`)을 그대로 거친 뒤 응답한다(테스트 포함).

### 주의 4 — 메모리 저장소 상한
24시간 보관만 있으면 계속 눌러 쌓인다. 한 사람 동시에 1건 · 전체 50건 상한을 두고, 넘으면 429 대신 가장 오래된 끝난 것부터 버린다.

### 주의 5 — 맥 Docker 에서 127.0.0.1 로만 연 러너에 닿는지 실측
`HOST=127.0.0.1` 로 열면 LAN 노출은 막지만, 컨테이너의 `host.docker.internal` 이 그 주소에 닿는지는 아직 확인하지 않았다.
게이트 2 전에 실제 컨테이너에서 한 번 부른 결과를 요약에 싣는다. 안 닿으면 러너를 `0.0.0.0` 이 아니라 Docker 게이트웨이 주소로 연다.

### 주의 6 — 입력 칸 이름을 뒤에서 자르면 두 칸이 같아 보인다
「테스트 회원 아이디」·「테스트 회원 비밀번호」를 끝에서 자르면 둘 다 「테스트 회원…」이 된다. 줄 안에서 **같이 보이는 칸들의 공통 앞부분을 뗀 짧은 이름**
(「아이디」「비밀번호」)을 보이고 전체 설명은 마우스 오버(`title`)에 둔다. 뗄 게 없거나 다 떼면 비면 원래 이름 그대로 + 줄임. (할 일 7 을 이렇게 고친다)

### 주의 7 — 화면 시안 먼저 (사용자 규칙)
테스트 실행 칸(새 화면 조각)과 줄의 입력 칸 표시는 [5] 전에 시안 A·B·C 를 보여 고르게 한다. 계획에 이 단계가 없어 게이트 1 뒤에 넣는다.

### 주의 8 — 모달 Esc 와 RunSetup 분량
바깥 클릭만 막으면 Esc 로는 여전히 닫혀 값을 잃는다. 「바깥 클릭만 막는다, Esc·취소는 그대로」로 못박고 DESIGN.md 에 적는다.
`RunSetup.tsx` 는 이미 392줄이다 — 새 코드는 `TestRun.tsx` 에 두고 RunSetup 에는 한 줄만 얹어 늘리지 않는다.

### 통과한 것
- 기록(test_run·run_item)을 안 만드는 설계와 권한 표(실행 쓰기·읽기 + 시작한 사람만)
- 새 라우트가 케이스 tcId 범위를 써서 새 범위 종류가 필요 없다
- 모든 새 라우트·화면에 테스트가 먼저 잡혀 있고 fixture 접두사 `XTR` 를 CLAUDE.md 표에 올린다
- 5·6번은 코드 결함이 아니라 원인 확인(저장값 없음 · 미확정 집계)이고 6번은 표시만 고친다

**후속 후보(이번 범위 밖)**: 시간 초과로 끝난 항목이 「러너에 닿지 못했습니다」로 보이는지 화면 라벨 점검. 사용자별 로컬 러너 등록(원격 서버용).

## 게이트 1 지적 반영 (2026-09-30 「지적 반영하고 진행」)

위 주의 8건을 아래처럼 할 일에 얹는다. 재검토는 하지 않는다.

- **할 일 2·4 (주의 1)** — `LOCAL_RUNNER_URL` 에 기본값을 두지 않는다. 없으면 `POST /api/cases/:tcId/test-run` 이 409 `TRIAL_OFF` 와
  「이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 SETUP」을 준다. compose 는 `LOCAL_RUNNER_URL: "${LOCAL_RUNNER_URL:-}"`. 한계(서버와 같은 기계일 때만 「내 컴퓨터」)를 명세·SETUP·화면 안내에 적는다
- **할 일 2 (주의 2)** — `baseUrl` 은 `http:`·`https:` 만. 아니면 400 (RED 에 추가)
- **할 일 1·2 (주의 3)** — 응답 단계·오류를 `web/mask.ts` 의 `가린값들` 로 거친 뒤 낸다 (RED 에 추가: 비밀번호 값이 응답 어디에도 없다)
- **할 일 1 (주의 4)** — 사람당 진행 1건, 전체 50건, 넘으면 가장 오래된 끝난 것부터 버린다 (RED 에 추가)
- **할 일 4 (주의 5)** — `host.docker.internal` 에서 `127.0.0.1` 로 연 러너에 닿는지 실제 컨테이너로 부른 결과를 게이트 2 요약에 싣는다. 안 닿으면 `HOST` 를 Docker 게이트웨이 주소로 바꾼다
- **할 일 7 (주의 6)** — 줄 안 라벨은 같이 보이는 칸들의 **공통 앞부분을 뗀 이름**을 보이고 전체 설명·칸 이름(key)은 `title`. 순수 함수 `짧은이름들(fields)` 를 `schema.ts` 에 두고 단위 검사(「테스트 회원 아이디/비밀번호」→「아이디/비밀번호」, 하나뿐이면 그대로, 다 떼면 빈 경우 그대로)
- **할 일 5·7 앞 (주의 7)** — 시안 A·B·C Artifact 를 사용자에게 보여 고르게 한 뒤 구현한다 (대상: 테스트 실행 칸 · 줄의 입력 칸 표시)
- **할 일 8 (주의 8)** — 「바깥 클릭만 막는다. Esc·취소는 그대로」 를 DESIGN.md 「모달」에 적는다. RunSetup 에는 한 줄만 얹는다 (로직은 `TestRun.tsx`)

## 할 일 10 grep 결과 (2026-09-30)

`docs/spec/` 와 `docs/DESIGN.md` 를 낱말 「시험 실행」 · 「내 컴퓨터」 · 「headed」 · 「LOCAL_RUNNER_URL」 · 「닫는 길 셋」 · 「바깥 누르기」 로 훑었다.

| 낱말 | 찾은 곳 | 판정과 처리 |
|------|--------|------------|
| 시험 실행 | 도메인/시나리오 §7 · §8.11 · 3-공유계약 `trialId` · 1-제품과-구조 용어 표 · 6-인프라 스크린샷 경로 · 인증 §7 표 · 실행 §3.2 | **E2E 시나리오 조립을 돌려 보는 다른 기능이다** — 새 기능 이름을 「케이스 테스트 실행」으로 부르고 실행 §3.2 에 둘의 차이 한 줄을 적었다. 6-인프라 §9 의 동시 실행 줄은 「시나리오 시험 실행」으로 고쳐 헷갈리지 않게 했다(나머지 두 줄은 시나리오 경로라 문맥이 분명해 그대로). 시나리오 장은 안 건드렸다 |
| 내 컴퓨터 · headed · LOCAL_RUNNER_URL | 없음 | 새 규칙이라 겹치는 곳이 없다. 정본은 실행 §7, 러너·인프라·SETUP 은 그 절을 가리킨다 |
| 닫는 길 셋 · 바깥 누르기 | DESIGN.md 「모달」 · 실행 §8.9 완료 모달 | DESIGN.md 가 정본이라 그 아래에 「예외 하나」로 RunPickModal 을 적었다(문단은 남겼다). §8.9 완료 모달은 읽기만 하는 상자라 셋 다 그대로다 |
| 동시 실행 상한의 자리 | 실행 §3.2 · 6-인프라 §9 | 시나리오 실행·시험 실행은 한 자리를 쓰고 케이스 테스트 실행은 안 쓴다고 두 곳에 적었다 |
| 케이스 줄 입력 칸 이름 | 카탈로그 §8.1 「줄에서 값을 고치고 상세를 연다」가 줄 규칙의 정본으로 알려져 있다 | 이번 규칙은 실행 §8.2 에 적었다(범위 지정). **카탈로그 §8.1 에는 안 적었다** — 그쪽에서 실행 §8.2 를 가리키게 하는 한 줄은 카탈로그 갈래(WS-A)가 넘겨받는다 |
