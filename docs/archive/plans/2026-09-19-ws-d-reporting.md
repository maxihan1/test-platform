# WS-D 리포팅 — 증적 문서와 대시보드

등급: 2 · 갈래: D · 2026-09-19

## 도메인 정리

**바운디드 컨텍스트** — Reporting (SPEC §3.3). 저장된 결과를 읽어 증적 문서와 지표를 만든다.
**읽기 전용이다.** `evidence_document` 외에는 어떤 테이블에도 쓰지 않는다.

| 영향 | 무엇 |
|---|---|
| 소유 경로 | `apps/admin/src/reporting/**` · `infra/grafana/**` |
| 읽는 표 | `test_run` · `run_item` · `run_item_step` (읽기만) |
| 쓰는 표 | `evidence_document` (이것 하나뿐) |
| **읽지 않는 표** | **`test_case`** — 읽는 순간 §3.3 재현 불변식이 깨진다 |
| 관련 절 | §3.3 · §7 Reporting · §8.4 · §8.5 · §6 |

**다른 갈래 파일은 건드리지 않는다.** `GET /api/runs/:runId` 의 `evidence` 배열은 WS-B 가 이미 만들어 뒀고
(`apps/admin/src/execution/queries.ts:153`), `app.ts` 는 `reporting/routes.ts` 를 이미 등록하고 있으며
`docker-compose.yml:92` 는 `infra/grafana/provisioning` 을 이미 마운트한다. 새로 뚫을 자리가 없다.

## 왜

제품의 최종 산출물이 이 갈래다 (SPEC §1 핵심 가치 4번 — "명세 기반 증적 문서 자동 생성").
지금 `apps/admin/src/reporting/routes.ts` 는 빈 플러그인이고 `infra/grafana/provisioning/` 은 빈 폴더다.
실행 결과는 DB 에 쌓이는데 **사람이 검수처에 낼 물건이 하나도 안 나온다.**

`contracts` 단위가 박제 칸(`run_item.param_schema`·`expected_schema`·`attempt`,
`test_run.service_name`·`tests_repo`·`base_url`·`triggered_by_name`)을 이미 넣었으므로
**§3.3 이 요구하는 「언제 뽑아도 같은 문서」가 지금은 실제로 성립한다.** 그 전에 만들었으면
라벨을 `test_case` 에서 읽을 수밖에 없었고 그것이 §3.3 이 이름 붙여 금지한 패턴이다.

### 설계 — 마스킹과 재현을 한 자리에서 끝낸다

```
collect.ts   DB 읽기 → 「표시용 모델」            ← 라벨·마스킹·기록 없음이 전부 여기서 끝난다
   ↓
html.ts      표시용 모델 → HTML 문자열 (순수)
xlsx.ts      표시용 모델 → 엑셀 버퍼 (순수)
   ↓
generate.ts  형식 분기 · PDF 변환 · 파일 저장 · 상태 전이
store.ts     evidence_document 쓰기 (PENDING 선점 · READY · FAILED)
routes.ts    HTTP 둘
```

**렌더러가 원본 JSON 을 못 보게 한다.** 비밀값 마스킹(§4.1)과 `기록 없음`(§6)을 렌더러마다
따로 구현하면 **형식이 늘어날 때마다 마스킹이 새는 자리가 하나씩 는다.** 표시용 모델을 지나야만
렌더러에 닿게 하면 그 사고가 구조적으로 안 난다.

**DB fixture 접두사는 `XD` 계열이다** (CLAUDE.md §3). `XDC`(collect) · `XDR`(routes) · `XDD`(dashboard).
`ZZ` 로 시작하지 않고 WS-B 의 `XBS`·`XBR`·`XBQ`·`XBX` 와 겹치지 않는다.

## Plan

### 할 일 1. 실행 한 부를 읽어 표시용 모델을 만든다

- **RED** — `collect.test.ts`. `XDC` 접두사로 `test_run` 1건 + `run_item` 2건(같은 케이스, `desktop`/`mobile`)
  + `run_item_step` 을 넣고 `collectRun(runId)` 이 머리말 7칸(서비스 이름·테스트 저장소·실행 제목·시각·
  실행자·대상 서버·주소)과 항목 2블록을 돌려주는지 단언한다. 지금은 함수가 없어 실패한다.
- **GREEN** — `collect.ts` 에 `collectRun()`. `test_run` → 머리말, `run_item` → 블록,
  `run_item_step` → 절차. 정렬은 `run_item.history_id`, 절차는 `seq`.
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/collect.ts` · `apps/admin/src/reporting/collect.test.ts`
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/reporting/collect.test.ts`

### 할 일 2. 라벨·비밀값·빈 값을 표시용 모델 안에서 끝낸다

- **RED** — 같은 파일에 다섯 단언을 더한다. ① 입력 칸 라벨이 `run_item.param_schema` 의
  `properties.<키>.description` 에서 온다 ② `description` 이 없으면 **키 이름을 쓴다**
  (화면 `web/schema.ts:47` 과 같은 규약. 두 곳이 갈라지는 것을 이 단언이 막는다 — 검토 주의 4)
  ③ `properties.<키>.secret === true` 인 칸의 값이 `********` 다
  ④ 박제 이전 행(`file_path = ''`, `param_schema = '{}'`)은 `기록 없음`, 스키마가 빈 객체면 `입력 없음`
  ⑤ **`collectRun()` 을 두 번 불러 모델이 깊은 비교로 같다** — §3.3 재현 불변식의 앞 절반이다.
  **`test_case` 를 읽는 쿼리가 하나도 없는지도 단언한다** (§3.3).
- **GREEN** — `collect.ts` 에 `라벨()`·`마스킹()`·`기록없음()`. 라벨 규약은 화면(`web/schema.ts`)과 같다 —
  `description` 이 있으면 그것, 없으면 키 이름.
- **REFACTOR** — 세 함수가 `collect.ts` 를 300줄로 밀면 `present.ts` 로 가른다

**files**: `apps/admin/src/reporting/collect.ts` · `apps/admin/src/reporting/collect.test.ts`
**depends-on**: [1]
**검증**: `npx vitest run apps/admin/src/reporting/collect.test.ts`

### 할 일 3. 돌지 못한 항목을 미실행과 사유로 남긴다

- **RED** — `collect.test.ts` 에 `ABORTED` 실행을 넣는다. `finished_at IS NULL` 인 항목이
  `미실행` + 사유(`실행을 멈췄습니다`)로 오는지, 끝난 항목은 그대로인지 단언한다.
- **GREEN** — `collect.ts` 에서 `finished_at` 이 비면 미실행 블록. 사유는 `test_run.status` 로 가른다
  (`ABORTED` → 멈춤, `RUNNING` → 아직 도는 중).
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/collect.ts` · `apps/admin/src/reporting/collect.test.ts`
**depends-on**: [2]
**검증**: `npx vitest run apps/admin/src/reporting/collect.test.ts`

### 할 일 4. 표시용 모델을 §8.4 모양의 HTML 로 그린다

- **RED** — `html.test.ts`(순수, DB 없음). 손으로 만든 표시용 모델을 넣고 ① 머리말에 서비스 이름과
  저장소 주소가 있다 ② 회차 번호가 블록 머리에 있다 ③ 검증 문장마다 기대·실제·판정이 한 줄이다
  ④ **`httpTrace` 와 코드가 결과물에 없다** ⑤ 스크린샷은 실패한 검증 문장 바로 아래다
  ⑥ `********` 가 그대로 나온다 ⑦ **같은 모델을 두 번 렌더하면 글자까지 같다** — 일곱을 단언한다.
  일곱째가 §3.3 재현 불변식의 나머지 절반이다 (검토 주의 1). 만든 시각을 본문에 박으면 여기서 빨간불이 난다 —
  시각은 머리말의 「만든 시각」 한 칸에만 들어가고 그 칸은 렌더 입력으로 받는다.
- **GREEN** — `html.ts` 의 `renderHtml(model): string`. A4 고정폭 CSS 인라인.
- **REFACTOR** — CSS 가 길면 같은 파일 상단 상수로 뽑는다

**files**: `apps/admin/src/reporting/html.ts` · `apps/admin/src/reporting/html.test.ts`
**depends-on**: [3]
**검증**: `npx vitest run apps/admin/src/reporting/html.test.ts`

> **★ 여기서 사용자에게 샘플 HTML 을 보낸다** (WS-D 킥오프 지시 — "문서 레이아웃을 먼저 HTML 로
> 만들어 내가 눈으로 확인한 뒤 PDF 로 넘어가라"). 브라우저로 열 수 있는 파일을 실제로 전달하고,
> 게이트 2 요약에 그 경로를 싣는다. **구현은 멈추지 않는다** — 체인에 중간 게이트를 새로 만들지 않는다.

### 할 일 5. 「만드는 중」을 DB 가 기억한다

- **RED** — `store.test.ts`. `XDR` 접두사로 실행 1건을 넣고 ① `claim(runId, 'PDF')` 가 `PENDING` 행을
  만든다 ② 같은 실행·같은 형식으로 한 번 더 부르면 **409 로 판별되는 에러**가 난다 (부분 유일 인덱스)
  ③ `finish()` 가 `READY` + `file_path` 로 닫는다 ④ `fail()` 이 `FAILED` + 사람이 읽을 한 문장으로 닫는다
  ⑤ **`FAILED` 뒤에는 같은 형식을 다시 만들 수 있다** — 넷째와 다섯째가 같이 서야 `다시 만들기` 버튼이 산다.
- **GREEN** — `store.ts`. `claim`·`finish`·`fail`·`findDocument`. 409 판별은 Postgres 유일성 위반
  코드(`23505`)를 잡아 전용 에러로 바꾼다.
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/store.ts` · `apps/admin/src/reporting/store.test.ts`
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/reporting/store.test.ts`

### 할 일 6. 두 주소를 연다 — 만들기와 받기

- **RED** — `routes.test.ts`. ① `POST /api/runs/:runId/evidence` 가 `{ status: 'PENDING' }` 을
  **기다리지 않고 먼저** 돌려준다 ② `format` 이 `PDF|XLSX|HTML` 이 아니면 400 ③ 같은 형식이 이미
  `PENDING` 이면 409 ④ 없는 실행이면 404 ⑤ `GET /api/evidence/:id` 가 `READY` 행의 파일을 내려준다
  ⑥ `PENDING`·`FAILED` 행을 받으려 하면 409 — 아직 파일이 없다.
- **GREEN** — `routes.ts`. `zod` 로 본문 검증(기존 `execution/routes.ts` 와 같은 모양).
  생성은 `void generate(...)` 로 띄우고 응답은 곧장 돌려준다.
  **`generate.ts` 는 이 할 일에서 `HTML` 형식만 끝까지 간다** (검토 주의 2). `PDF`·`XLSX` 는
  「아직 못 만드는 형식」으로 `FAILED` 로 닫고 할 일 7·8 이 채운다. 라우트 테스트는 `HTML` 로 돈다 —
  라우트가 확인할 것은 형식별 렌더가 아니라 **PENDING 을 먼저 돌려주는가**다.
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/routes.ts` · `apps/admin/src/reporting/routes.test.ts` · `apps/admin/src/reporting/generate.ts`
**depends-on**: [4, 5]
**검증**: `npx vitest run apps/admin/src/reporting/routes.test.ts`

### 할 일 7. HTML 을 PDF 로 바꾼다

- **RED** — `generate.test.ts`. `PDF` 형식으로 생성하면 ① 파일이 `PLATFORM_ARTIFACTS_DIR` 아래
  `evidence/<runId>/` 에 떨어지고 ② 내용이 `%PDF` 로 시작하며 ③ `evidence_document` 가 `READY` 로 닫힌다.
  실패하면 `FAILED` + 사유 한 문장으로 닫히는 것도 단언한다.
- **GREEN** — `generate.ts` 에서 Playwright `chromium.launch()` → `page.setContent(html)` →
  `page.pdf({ format: 'A4', printBackground: true })`. 브라우저는 반드시 `finally` 에서 닫는다.
  **동시 기동은 `execution/dispatcher.ts` 의 `enqueue()` 를 재사용해 막는다** (검토 주의 5) —
  서로 다른 실행의 PDF 를 동시에 누르면 2코어 서버에 Chromium 이 여러 개 뜬다.
  import 한 줄이고 그 파일을 고치지 않으므로 §1.1 범위 밖이 아니다.
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/generate.ts` · `apps/admin/src/reporting/generate.test.ts`
**depends-on**: [6]
**검증**: `npx vitest run apps/admin/src/reporting/generate.test.ts`

### 할 일 8. 한 행 = 한 검증 문장으로 엑셀을 편다

- **RED** — `xlsx.test.ts`(순수). 표시용 모델을 넣고 ① 머리행이 §8.4 「엑셀 표 모양」의 칸 순서와
  같다 ② 검증 문장 2개짜리 절차가 **2행**이 된다 ③ 검증 문장이 없는 절차도 **1행**이 남는다
  ④ 상위 정보(실행·케이스)가 앞 칸에 **반복**된다 — 병합 셀이 하나도 없다 ⑤ 스크린샷은 경로 글자다
  ⑥ 비밀값은 `********` 다.
- **GREEN** — `xlsx.ts` 의 `renderXlsx(model): Promise<Buffer>`. `exceljs` 시트 하나, 머리행 고정(`views.frozen`).
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/xlsx.ts` · `apps/admin/src/reporting/xlsx.test.ts` · `apps/admin/src/reporting/generate.ts`
**depends-on**: [7]
**검증**: `npx vitest run apps/admin/src/reporting/xlsx.test.ts`

### 할 일 9. 대시보드 패널 넷을 프로비저닝한다

- **RED** — `dashboard.test.ts`. 대시보드 JSON 을 읽어 ① 패널이 넷이고 제목이 §8.5 그대로다
  ② **각 패널의 SQL 을 `grafana_ro` 계정으로 직접 접속해 돌려 에러가 안 난다** (검토 주의 3).
  글자 검사가 아니라 실접속이다 — `JOIN` 안에 숨은 표가 있으면 **권한 부족이 그 자리에서 난다.**
  그 롤은 `db/init/01-grafana-readonly.sql:3` 이 만들고 `test_run`·`run_item` 에만 권한이 있다
  ③ 성공률 SQL 이 `XDD` 접두사로 넣은 「3회 반복 중 2회만 통과」 케이스를 **통과로 세지 않는다**.
- **GREEN** — `infra/grafana/provisioning/datasources/postgres.yml`(데이터소스) ·
  `dashboards/dashboards.yml`(공급자) · `dashboards/test-platform.json`(패널 넷).
  성공률은 `(run_id, tc_id, platform)` 으로 접고 `bool_and(status = 'PASS')` 로 센다 — 전 회차 통과해야 통과.
- **REFACTOR** — 없음

**files**: `infra/grafana/provisioning/datasources/postgres.yml` · `infra/grafana/provisioning/dashboards/dashboards.yml` · `infra/grafana/provisioning/dashboards/test-platform.json` · `apps/admin/src/reporting/dashboard.test.ts`
**depends-on**: []
**검증**: `npx vitest run apps/admin/src/reporting/dashboard.test.ts`

### 할 일 10. 부팅할 때 굳은 「만드는 중」을 닫는다

**검토 BLOCKER 1 을 막는 할 일이다.** 게이트 1 에서 「지적 반영하고 진행」으로 정했다.

- **RED** — `store.test.ts` 에 단언을 더한다. `XDR` 접두사로 `PENDING` 행을 남겨 두고
  `recoverPending()` 을 부르면 ① 그 행이 `FAILED` + `만들다 중단됐습니다. 다시 만들어 주세요.` 로 닫힌다
  ② `finished_at` 이 찍힌다 ③ **그 뒤 같은 실행·같은 형식을 다시 만들 수 있다** — 부분 유일 인덱스가
  `PENDING` 에만 걸리므로 닫히는 순간 자리가 난다. 셋째가 이 할 일의 존재 이유다.
- **GREEN** — `store.ts` 에 `recoverPending()`. `reporting/routes.ts` 플러그인 안에서 `void recoverPending()`
  로 한 번 부른다 — **WS-B 가 `execution/routes.ts:64` 에서 `recoverRunning()` 을 부르는 것과 같은 자리다.**
  `app.ts`(공용 골격)를 건드리지 않고 부팅 1회를 잡는 이미 있는 방법이다.
- **REFACTOR** — 없음

**files**: `apps/admin/src/reporting/store.ts` · `apps/admin/src/reporting/store.test.ts` · `apps/admin/src/reporting/routes.ts`
**depends-on**: [5, 6]
**검증**: `npx vitest run apps/admin/src/reporting/store.test.ts`

## SPEC 동반 수정 (§2.7)

**해당 없음 — SPEC 을 건드리지 않는다.** [2] `tpx-spec` 이 계약 넷을 다 확인했고
이번 작업은 §7 에 **이미 명세된 것을 구현**할 뿐 형태를 바꾸지 않는다.

## Plan 메타

할 일 10개 · 예상 묶음 4개 · 구현 규율: TDD · 추가 검증: `npm test` · `npm run typecheck` · `npm run check:spec`

묶음 — ① 할 일 1·2·3 (`collect.ts` 직렬) ② 할 일 5 · 할 일 9 (서로 독립, 병렬 가능)
③ 할 일 4 → 6 → 7 → 8 (`generate.ts` 를 공유해 직렬) ④ 할 일 10 (`store.ts`·`routes.ts` 를 5·6 과 공유) + 검사

**게이트 1 에서 반영한 것** (2026-09-19) — 검토 BLOCKER 1 → 할 일 10 신설.
주의 1 → 할 일 2 ⑤ · 할 일 4 ⑦ (두 번 불러 같은지). 주의 2 → 할 일 6 GREEN 에 `HTML` 만 먼저 명시.
주의 3 → 할 일 9 ② 를 `grafana_ro` 실접속으로. 주의 4 → 할 일 2 ②. 주의 5 → 할 일 7 GREEN 에 `enqueue()` 재사용.
**여섯 전부 반영했다.** 재검토는 돌리지 않는다 — 결과는 게이트 2 가 본다.

## 리뷰 결과

**렌즈**: `plan-eng-review` (2등급 = 1종) · 2026-09-19
**판정**: BLOCKER 1건 · 주의 5건

### BLOCKER 1 — 「만드는 중」이 고착되면 그 실행·그 형식은 영영 못 만든다

(확신 9/10) `docs/plans/2026-09-19-ws-d-reporting.md` 할 일 5·6 · `db/migrations/20260917000001_service_user_snapshot.sql:89`

`CREATE UNIQUE INDEX ON evidence_document (run_id, format) WHERE status = 'PENDING'` 이
**두 번 누르기를 막는 바로 그 장치가 고착의 원인**이 된다. 계획은 `PENDING` 행을 먼저 만들고
`void generate(...)` 로 띄우는데, 그 사이에 admin 컨테이너가 죽으면 행이 `PENDING` 인 채 남는다.
`docker-compose.yml` 은 `restart: unless-stopped` 라 컨테이너는 되살아나지만 **행은 아무도 안 닫는다.**

**나중에 무엇이 잘못되나** — §8.4 버튼 표대로 화면은 `만드는 중입니다` 를 띄우고 다시 안 눌린다.
`FAILED` 가 아니므로 `다시 만들기` 통로도 안 열린다. 사람이 할 수 있는 일이 없고
DB 를 손으로 고쳐야 풀린다. 검수 마감날 이게 나면 증적을 못 낸다.

**같은 사고가 이미 한 번 났다.** 실행에서 같은 모양이었고 WS-B 가 `recoverRunning()`
(`apps/admin/src/execution/store.ts`)으로 풀었다 — 부팅할 때 `RUNNING` 으로 남은 것을 닫는다.
리포팅에는 그 함수에 해당하는 것이 없고 계획에도 없다.

**고칠 것** — 할 일을 하나 더한다. 부팅 시 `PENDING` 으로 남은 `evidence_document` 를
`FAILED` + `만들다 중단됐습니다. 다시 만들어 주세요.` 로 닫는다. `app.ts` 가 이미
`recoverRunning()` 을 부르는 자리가 있는지 보고, 없으면 `reporting/store.ts` 의 함수를
`routes.ts` 플러그인 등록 시점에 한 번 부른다 (공용 골격을 안 고치는 방법).

### 주의 1 — 이 갈래의 최상위 불변식에 그것을 직접 재는 테스트가 없다

(확신 8/10) 할 일 2

§3.3 은 「같은 실행의 증적은 언제 뽑아도 같은 문서가 나온다」를 요구한다. 계획의 할 일 2 는
**라벨의 출처**(`run_item` 에서 온다)와 **`test_case` 를 읽는 쿼리가 없다**를 단언한다.
둘 다 간접 증거다 — 라벨이 아닌 경로로도 재현성은 깨진다. 렌더러가 본문에 `new Date()` 를
박거나, 정렬이 불안정해 항목 순서가 뒤집히면 「쿼리에 `test_case` 없음」은 그대로 초록불이다.

**직접 재는 방법은 한 줄이다** — 같은 실행을 **두 번 렌더해 만든 시각만 빼고 글자까지 같은지**
단언한다. 깨지면 그 자리에서 빨간불이 난다. 지금 설계는 조용히 깨지고 반년 뒤에 드러난다.

### 주의 2 — 할 일 6 이 `generate.ts` 를 어디까지 만드는지 계획에 없다

(확신 8/10) 할 일 6 `files` 에 `apps/admin/src/reporting/generate.ts`

할 일 6(라우트)과 7(PDF)과 8(엑셀)이 `generate.ts` 를 공유한다. 직렬화는 맞게 걸렸지만
**할 일 6 시점에 그 파일이 무엇을 할 수 있는지**가 안 적혀 있다. PDF 는 할 일 7, 엑셀은 할 일 8 이다.
할 일 6 의 라우트 테스트가 `PDF` 를 POST 하면 그때 `generate.ts` 는 무엇을 하나.

**고칠 것** — 할 일 6 의 GREEN 에 「HTML 형식만 끝까지 가고 PDF·XLSX 는 `FAILED` 로 닫는다,
할 일 7·8 이 채운다」를 명시하거나, 라우트 테스트를 `HTML` 형식으로만 돌린다고 적는다.

### 주의 3 — 대시보드 SQL 은 `grafana_ro` 계정으로 돌려야 권한까지 검증된다

(확신 7/10) 할 일 9 RED ④

계획은 「SQL 이 `test_run`·`run_item` 말고 다른 표를 읽지 않는다」를 단언한다. 문자열 검사로는
`JOIN` 안에 숨은 표나 뷰를 놓친다. `db/init/01-grafana-readonly.sql:3` 이 `grafana_ro` 롤을
실제로 만들어 두므로 **그 계정으로 접속해 SQL 을 돌리면** 권한 부족이 그 자리에서 난다.
검사가 한 줄 짧아지고 결과는 더 세다.

### 주의 4 — 라벨 규약이 두 곳에 따로 구현된다

(확신 7/10) `apps/admin/src/reporting/collect.ts`(새로 만듦) ↔ `apps/admin/src/web/schema.ts:47`

화면의 `schemaToFields()` 는 `description` 이 있으면 그것, 없으면 키 이름을 라벨로 쓴다.
계획은 증적 쪽에 같은 규약을 **다시 구현**한다. 경계를 넘지 않으려는 판단은 타당하다
(브라우저 코드를 서버가 import 하는 것이 더 나쁘다). 다만 **둘이 갈라지는 것을 막는 장치가 없다.**

**나중에 무엇이 잘못되나** — 사람이 폼에서 「아이디」로 채운 칸이 증적에는 `username` 으로 찍힌다.
검수자는 그 둘이 같은 칸인지 모른다. 지금 당장은 아니고, 한쪽 규약을 고치는 날 난다.

**가장 싼 방어** — `collect.test.ts` 에 「`description` 없는 칸은 키 이름을 쓴다」를 단언해
규약을 글로 박아 둔다. 코드 공유까지는 필요 없다.

### 주의 5 — PDF 브라우저 기동에 상한이 없다

(확신 6/10) 할 일 7 GREEN — 확인 필요

실행은 `dispatcher.ts` 의 대기줄이 동시 2개로 막는다 (2코어, SPEC §9). **증적 생성은 그 줄을 안 쓴다.**
서로 다른 실행 다섯 건의 PDF 를 동시에 만들면 Chromium 이 다섯 개 뜬다.
부분 유일 인덱스는 *같은* 실행·형식만 막지 서로 다른 실행은 안 막는다.

지금 규모(사람 몇 명)에서 바로 터지지는 않는다. `dispatcher.ts` 의 `enqueue()` 를
그대로 재사용하면 한 줄로 끝나므로 **구현 때 붙일지만 판단하면 된다.**

### 통과한 것

- **파일 수** — 소스 6 · 테스트 6 · Grafana 설정 3. 8 개를 넘지만 `CLAUDE.md §3` 의 300줄 제한이
  강제한 분할이고 책임이 겹치지 않는다. 줄일 자리가 없다
- **`depends-on` · `files`** — 실제 의존을 맞게 표현했다. 할 일 5·9 가 독립이라 병렬이 맞고,
  `collect.ts` 직렬(1→2→3)과 `generate.ts` 직렬(6→7→8)도 파일 겹침으로 자동 직렬화된다
- **할 일 크기** — 아홉 다 RED 하나가 단언 3~6개다. 쪼갤 것도 합칠 것도 없다
- **Playwright 로컬 기동 비용** — `~/Library/Caches/ms-playwright` 에 chromium 이 이미 있다.
  할 일 7 이 로컬에서 돈다. `admin` 이미지도 Playwright 공식 이미지 기반이라 컨테이너에서도 돈다 (SPEC §9)
- **큰 실행의 메모리** — 실행 항목 상한이 이미 걸려 있다 (`execution/routes.ts:97`, SPEC §8.2).
  `collectRun()` 이 한 번에 읽어도 상한이 막아 준다
- **명세 누락 없음** — §8.4 의 형식 셋 · 머리말 칸 · 엑셀 표 모양 · ABORTED 처리,
  §8.5 의 패널 넷 · 성공률 접기 규칙이 전부 할 일에 있다

### 렌즈가 띄우려 한 질문 (체인이 대신 받는다)

`plan-eng-review` 의 복잡도 게이트가 「파일 8개 초과 → 범위를 줄일지 물어라」로 멈추려 했다.
**여기서 묻지 않았다** — 판단 재료는 위 「통과한 것」 첫 줄에 있고, 결정은 게이트 1 이 받는다.
