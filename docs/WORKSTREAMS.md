# WORKSTREAMS.md — 병렬 작업 분할

> Phase 0가 끝나기 전에는 **절대 병렬로 시작하지 않는다.**
> Phase 0는 계약을 확정하는 단계이고, 계약이 없으면 각 세션이 서로 다른 구조를 가정한다.

---

## 소유 경로 표 (충돌 방지의 핵심)

| ID | 워크스트림 | 소유 경로 | 의존 |
|----|-----------|----------|------|
| **WS-0** | 골격 | 전체 (단독) | — |
| **WS-A** | 카탈로그 | `apps/admin/src/catalog/**` | kit 타입 |
| **WS-B** | 실행 | `apps/admin/src/execution/**` | kit 타입, 러너 계약 |
| **WS-C** | 러너 + 테스트 킷 | `apps/runner/**`, `packages/kit/src/runtime/**`, `tests/**` | kit 타입 |
| **WS-D** | 리포팅 | `apps/admin/src/reporting/**`, `infra/grafana/**` | DB 스키마 |
| **WS-E** | 화면 | `apps/admin/src/web/**` | Admin API 계약 |

**아무도 건드리지 않는 곳**: `packages/kit/src/types.ts`, `db/migrations/`, `docker-compose.yml`

**Phase 0가 만들고 이후 잠그는 공용 골격** (훅의 `ownership` 검사가 막는다. 바꿔야 하면 CLAUDE.md §1.2 절차)
- `apps/admin/src/app.ts` — 서버 부트스트랩. 각 컨텍스트 폴더의 `routes.ts`를 **정해진 규약**으로 불러 등록한다.
  갈래는 자기 폴더의 `routes.ts`만 채우고 이 파일은 건드리지 않는다
- `apps/admin/src/db/` — DB 연결 풀. 갈래는 import만 한다
- `packages/kit/src/index.ts` — kit 배럴. `./types`와 `./runtime`을 재수출한다 (runtime은 Phase 0에서 스텁)
- admin의 정적 서빙 경로(Vite 빌드 산출물)는 Phase 0가 `app.ts`에 고정한다.
  Vite 설정 자체(`apps/admin/src/web/vite.config.ts`)는 WS-E 소유다
- 각 `package.json`, `tsconfig`, `playwright.config.ts` — 의존성은 Phase 0에서 한 번에 깐다.
  갈래가 새 패키지가 필요하면 CLAUDE.md §3 대로 묻는다
- `.github/workflows/ci.yml` — CI. 스크립트 이름(`typecheck`·`test`·`check:tests`)이 계약이다

각 세션은 **자기 폴더 안에서만 파일을 만든다.** 다른 폴더가 필요하면 계약(타입/API)을 통해서만 접근한다.

---

## 왜 이렇게 갈라지는가

- **A와 B**는 둘 다 admin 안에 있지만 데이터 흐름이 반대다. A는 코드→DB(쓰기), B는 DB→러너→DB. 겹치는 테이블이 없다
- **C**는 별도 컨테이너라 물리적으로 격리된다. HTTP 계약만 지키면 내부를 어떻게 짜든 상관없다
- **D**는 읽기 전용이라 누구와도 충돌하지 않는다. 가장 안전한 병렬 대상
- **E**는 API를 소비만 한다. API가 아직 없으면 목(mock) 응답으로 먼저 만든다

**A·B·C가 동시에 진행되려면 `CaseSpec`과 `ExecuteRequest/Response`가 먼저 확정돼야 한다.** 그게 Phase 0의 존재 이유다.

---

## Phase 0 킥오프 프롬프트

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-0(골격) 담당이다.

이번 세션의 목표는 기능 구현이 아니라 계약 확정이다.
이후 5개 세션이 병렬로 작업할 것이므로, 여기서 만든 타입·스키마·계약이
흔들리면 전부 충돌한다.

만들 것:
1. 모노레포 골격 (apps/admin, apps/runner, packages/kit, db/migrations, infra)
2. docker-compose.yml — postgres, admin, runner, grafana 4개 컨테이너 (SPEC §9 구조 그대로)
   러너와 admin 둘 다 mcr.microsoft.com/playwright 공식 이미지 기반, 러너는 mem_limit 4g
3. db/migrations — SPEC §6 테이블 전부
4. packages/kit/src/types.ts — SPEC §5.1 타입 전부
5. 러너에 GET /health, POST /execute 스텁 (실제 실행은 WS-C가 채움)
6. 데모 테스트 10건 (SPEC §10) — 아직 defineCase 없이 순수 Playwright로
   playwright.config에 projects를 desktop/mobile 2개로 정의할 것
   DEMO-008~010이 디바이스 축 검증용이므로 빠뜨리지 마라
7. 가장 얇은 관통: 케이스 1건을 하드코딩으로 실행해 run_item에 1행 저장
   /execute 스텁이 가짜 응답을 돌려주는 것으로는 관통이 아니다.
   러너 컨테이너 안에서 실제로 `npx playwright test <DEMO-001 파일> --project=desktop`을
   자식 프로세스로 돌리고, 리포터 없이 exit code만으로 PASS/FAIL을 만들어 돌려줘라.
   브라우저 기동·/tests 읽기 전용 마운트·모듈 해석이 여기서 검증된다
8. 공용 골격 — WORKSTREAMS.md "Phase 0가 만들고 이후 잠그는 공용 골격" 목록 전부.
   특히 apps/admin/src/app.ts의 라우트 등록 규약을 정하고 각 컨텍스트 폴더에 빈 routes.ts를 둬라
9. 의존성을 한 번에 깔아라 (갈래 세션은 package.json을 못 고친다).
   SPEC §9.1의 스택 기준: fastify, @fastify/static, pg, zod, zod-to-json-schema,
   react, react-dom, vite, @vitejs/plugin-react, vitest, typescript, tsx, @playwright/test.
   설치 전에 목록을 보고하고 승인을 받아라
10. CI는 이미 있다 (.github/workflows/ci.yml). 루트 package.json에 typecheck · test · check:tests
    스크립트를 그 이름 그대로 만들어라. check:tests는 apps/admin/src/catalog/check.ts를 가리키고,
    그 파일은 "아직 검사기 없음"을 찍고 exit 0 하는 스텁으로 둔다 (WS-A가 채운다).
    첫 푸시에서 CI가 초록불인지 확인한다

확인할 것:
- 러너 이미지 태그와 @playwright/test 버전이 정확히 같은가
- admin에도 ./tests(읽기 전용)와 artifacts 볼륨이 마운트됐는가 (SPEC §9)
- Grafana가 붙을 읽기 전용 DB 계정이 있는가
- playwright.config.ts의 projects 이름이 desktop / mobile 철자 그대로인가

7번이 이 세션의 진짜 완료 기준이다. 이게 돌아야 계약이 검증된 것이다.

순서대로 하나씩 진행하고, 각 단계마다 내가 직접 확인할 방법을 알려줘.
먼저 계획을 보고하고 승인을 기다려.
```

---

## Phase 1 킥오프 프롬프트 (각 세션에 하나씩)

### WS-A 카탈로그

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-A(카탈로그) 담당이다.
소유 경로는 apps/admin/src/catalog/** 이다. 이 폴더 밖은 수정하지 마라.

만들 것:
1. 스캐너 — tests/ 폴더를 훑어 defineCase 선언에서 CaseSpec을 추출
   - PLATFORM_SCAN=1을 켠 채 파일을 동적 import 해 export const spec을 읽는다 (SPEC §3.1)
   - zod 스키마를 JSON Schema로 변환해 param_schema/expected_schema에 저장
   - tcId 중복 발견 시 스캔을 실패시키고 충돌한 두 파일 경로를 보고
   - 코드에서 사라진 케이스는 삭제하지 말고 is_active=false
2. POST /api/catalog/scan, GET /api/catalog/scan (마지막 결과)
   admin 기동 시 같은 스캔을 한 번 자동 실행한다. 실패(tcId 중복 등)해도 서버는 뜨고 사유를 마지막 결과에 남긴다
3. GET /api/catalog/cases?q= — 이름과 tcId 부분 일치 검색
4. GET /api/catalog/cases/:tcId
5. GET /api/cases/:tcId/source?line= — 해당 줄 ±5줄 발췌 반환
6. npm run check:tests — 스캐너를 DB 없이 돌려 SPEC §4 케이스 파일 규칙 K1~K8을 검사한다.
   K4: precondition·params·expected 키가 아예 없으면 실패, null / []은 통과, 스키마가 있으면 모든 필드 describe 필수
   위반은 `파일:줄 — 무엇이 — 왜 문제` 한 줄씩 출력하고 exit 1.
   Phase 0가 apps/admin/src/catalog/check.ts를 exit 0 스텁으로 둬 뒀다. 그 파일을 채워라.
   CI(.github/workflows/ci.yml)와 pre-push가 이 이름으로 부른다

주의: test_case 테이블은 캐시다. 진실의 원천은 코드이므로 스캔 때마다 덮어쓴다.
packages/kit/src/types.ts는 읽기만 하고 수정하지 마라.

TDD로 진행하고, 각 단계마다 내가 터미널에서 확인할 명령을 알려줘.
```

### WS-B 실행

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-B(실행) 담당이다.
소유 경로는 apps/admin/src/execution/** 이다. 이 폴더 밖은 수정하지 마라.

만들 것:
1. POST /api/runs — test_run 생성 후 run_item들을 만들고 디스패처에 넘김
   - 요청의 platforms 배열 길이만큼 run_item을 만든다 (케이스 1건 × 디바이스 2개 = 2행)
   - params/expected는 반드시 스냅샷으로 복사 저장 (param_set 참조 금지)
   - tc_name, precondition도 스냅샷
2. 디스패처 — 동시성 2로 제한해 러너의 POST /execute를 동기 호출
   - 응답을 run_item / run_item_step에 저장
   - 러너가 죽거나 타임아웃이면 해당 항목만 NA로 기록하고 나머지는 계속
3. GET /api/runs, /api/runs/:runId, /api/runs/:runId/items/:historyId
4. GET /api/cases/:tcId/history — 케이스별 이력
   GET /api/screenshots/... — 공유 볼륨의 스크린샷 서빙
5. ParamSet CRUD — 저장 전 param_schema로 검증

러너는 아직 스텁일 수 있다. ExecuteResponse 형태의 가짜 응답으로 먼저 만들어라.
러너 내부 구현은 WS-C 담당이니 apps/runner/**는 절대 건드리지 마라.

TDD로 진행하고, 각 단계마다 내가 curl로 확인할 방법을 알려줘.
```

### WS-C 러너 + 테스트 킷

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-C(러너 + 테스트 킷) 담당이다.
소유 경로는 apps/runner/**, packages/kit/src/runtime/**, tests/** 이다.
packages/kit/src/types.ts는 읽기만 하고 수정하지 마라.

만들 것:
1. defineCase() — SPEC §4 형태. zod 스키마를 받아 CaseSpec을 만든다
   precondition·params·expected는 타입상 필수 키다 (params·expected는 null 허용).
   null이면 빈 객체 스키마로 바꾸고, test() 래퍼는 그 케이스에 빈 객체를 넘긴다
2. test() 래퍼 — 환경변수 PLATFORM_PARAMS에서 params/expected를 주입
   PLATFORM_SCAN=1이면 Playwright에 등록하지 않고 조용히 반환한다 (스캐너가 이 상태로 import 한다)
3. verify(문장, 실제값, 기대값, { blocker? }) — AssertionResult를 남긴다 (SPEC §4 verify 실패 규칙)
   기본은 실패해도 계속 간다. blocker면 그 절차를 끝으로 멈춘다. 절차 밖에서 부르면 에러를 던진다
   예외는 항상 멈추고 그 절차를 FAIL + error로 남긴다
   테스트 코드에서 expect 직접 사용은 금지이므로 verify가 유일한 검증 수단이다
4. 커스텀 리포터 — StepResult[]를 조립해 stdout에 @@RESULT@@{json} 한 줄로 출력
   메모리에 전부 쌓지 말고 테스트 종료 시점마다 흘려보낼 것
   실패한 스텝은 스크린샷을 artifacts/runs/{runId}/{historyId}/{seq}.png에 저장하고
   경로를 StepResult.screenshotPath에 남긴다. capture:true인 스텝도 동일
   실패 위치의 소스 줄 번호를 StepResult.line에 담는다
   테스트 코드에는 주석을 쓰지 마라 (SPEC §4)
5. POST /execute — ExecuteRequest를 받아 자식 프로세스로 playwright 실행,
   stdout을 파싱해 ExecuteResponse 반환
6. GET /health
7. 데모 테스트 10건을 defineCase 형태로 전환
8. ExecuteRequest.platform을 --project 인자로 넘겨 실행

이게 전체에서 가장 까다로운 부분이다. 3번(verify)부터 만들고 데모 테스트 1건으로
증명한 뒤 나머지로 넘어가라.

TDD로 진행하고, 각 단계마다 확인 방법을 알려줘.
```

### WS-D 리포팅

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-D(리포팅) 담당이다.
소유 경로는 apps/admin/src/reporting/** 와 infra/grafana/** 이다.
이 컨텍스트는 읽기 전용이다. evidence_document 외에는 어떤 테이블에도 쓰지 마라.

만들 것:
1. 증적 문서 생성 — SPEC §8.4 포맷의 HTML
   머리말 / 사전조건 / 입력(라벨-값) / 시험 절차 / 검증 문장별 기대·실제·판정
   JSON 원문을 그대로 노출하지 말 것. 스키마의 describe를 라벨로 쓴다
   문서는 실행(run) 단위로 1부다. 항목마다 블록이 반복되고,
   디바이스가 2개인 케이스는 2번, 반복 실행한 케이스는 회차마다 한 블록씩 나온다
2. HTML → PDF 변환 — admin 컨테이너 안에서 Playwright의 page.pdf()로 (SPEC §3.3)
   내는 형식은 PDF 하나다. HTML은 제출물이 아니라 PDF를 만드는 중간 산물이다
3. POST /api/runs/:runId/evidence → { id, format, filePath, generatedAt }
   GET /api/evidence/:id
4. Grafana 프로비저닝 — Postgres 데이터소스 + 대시보드 JSON
   패널: 성공률 추이 / 평균 소요시간 / 실패 TOP10 케이스 / 최근 실행 목록
   성공률 추이는 정기 실행(§9.2)이 있어야 선이 된다. 그 설정은 네 몫이 아니다

반드시 지킬 것 (개정 SPEC의 불변식):
- 문서를 만들 때 test_case를 읽지 마라 (SPEC §3.3). 라벨은 run_item에 박제된
  param_schema·expected_schema에서만 꺼낸다. 카탈로그를 읽으면 케이스 코드를 고친 순간
  과거 증적이 함께 바뀐다
- 같은 실행의 증적은 언제 뽑아도 글자까지 같아야 한다. 만든 시각만 새로 적힌다
- 비밀값(.meta({ secret: true })) 칸은 ******** 로 적는다 (SPEC §4.1).
  DB에는 평문이 그대로 있다 — 가리는 것은 문서와 화면뿐이다
- 코드와 httpTrace는 넣지 않는다. 스크린샷만 들어간다
- 머리말에 인스턴스 이름·테스트 저장소 주소·실행 제목·시각·실행자·대상 서버와 주소를 적는다.
  전부 test_run에 박제된 값을 읽는다. 실행자가 비면 `실행자 미상 (인증 도입 이전)`,
  정기 실행이면 `스케줄러`
- 중단된 실행(ABORTED)도 문서를 만들 수 있다. 돌지 못한 항목은 미실행과 사유로 남긴다

run_item에 데이터가 없으면 더미 행을 직접 INSERT해서 개발해도 된다.
단 마이그레이션 파일은 수정하지 마라.

문서 레이아웃을 먼저 HTML로 만들어 내가 눈으로 확인한 뒤 PDF로 넘어가라.
```

> **착수 전 확인** — 증적 문서 본체는 `run_item.param_schema`·`attempt` 와
> `test_run` 머리말 칸이 DB에 들어간 뒤에야 만들 수 있다 (개정 SPEC §6).
> 그 전에 만들면 라벨을 `test_case`에서 읽게 되는데, 그것이 §3.3이 이름 붙여 금지한 패턴이다.
> **Grafana 패널 4종은 새 컬럼에 기대지 않으므로 먼저 해도 된다.**

### WS-E 화면

```
docs/SPEC.md와 CLAUDE.md를 읽어줘. 너는 WS-E(화면) 담당이다.
소유 경로는 apps/admin/src/web/** 이다. 서버 코드는 건드리지 마라.
화면은 React + Vite다 (SPEC §9.1). Vite 설정은 네 폴더 안의 것을 쓴다.
시작 전에 docs/DESIGN.md와 docs/design-mockup.html을 반드시 열어봐라.
색·간격·구조는 목업을 기준으로 삼는다.

화면 네 개는 이미 만들어져 main에 들어가 있다 (apps/admin/src/web/, 21개 파일).
케이스 목록 · 실행 설정(폼 자동 생성) · 실행 결과 목록 · 항목 상세, 그리고 검색창과
2초 자동 갱신, '값을 바꿔 다시 실행' 버튼까지 있다. 새로 만드는 것이 아니라
**개정 스펙에 맞춰 더하고 고치는 것**이다.

고칠 것 (먼저):
1. 용어 두 축을 가른다 (SPEC §2) — platform은 `디바이스`, env는 `대상 서버`다.
   화면에서 `환경`이라는 낱말을 없앤다. 코드 값(desktop·mobile)은 그대로 둔다
2. 케이스 목록이 `모두 N건`으로 페이지 수를 계산하고 있다. 이것부터 고친다 (SPEC §8.1).
   총건수는 안내로만 쓰고, 다음 페이지가 있는지는 응답이 주는 값으로 판단한다
3. 자동 갱신을 멈추는 조건에 `ABORTED`가 빠져 있다. 중단된 실행에서 영영 안 멈춘다 (SPEC §8.3).
   실행 목록에서 `ABORTED`가 `도는 중`으로 보이는 것도 같은 자리다
4. 항목 상세가 입력 라벨을 카탈로그에서 읽는다. run_item에 박제된 param_schema로 바꾼다.
   SPEC §3.3이 이름 붙여 금지한 패턴이다 — 케이스 코드를 고치면 과거 증적이 함께 바뀐다

더할 것:
5. 검색 조건 다섯 (SPEC §8.1 표가 정본) — 글자 / 기능 영역 / 디바이스 / 활성 여부 / 마지막 결과.
   1~4는 서버가 거르고 5는 화면이 겹쳐 거른다. 기능 영역 선택지는 카탈로그가 내주는 것을 쓴다
6. 실행 설정에 대상 서버 드롭다운(필수, 기본값 없음) · 반복 횟수 · 실행자 표시 (SPEC §8.2)
7. 비밀값 칸 가리기 — .meta({ secret: true })가 달린 칸은 타이핑할 때도 글자가 보이지 않고
   결과 화면에는 ******** 로 나온다 (SPEC §4.1). DB에는 평문이 그대로다
8. 멈춤 버튼 + 확인 대화, 회차 요약(`3/5 통과`), 케이스명 아래 파라미터 한 줄 (SPEC §8.3)
9. 증적 문서 버튼 — 실행 결과 목록의 RUN 머리에 둔다. 상태 4가지에 따라 문구가 바뀐다 (SPEC §8.4)
10. 로그인 화면 (SPEC §8.6) — 아이디·비밀번호·버튼만. 미로그인 시 리다이렉트 후 원래 자리로 복귀.
    실패 문구는 한 문장으로, 어느 쪽이 틀렸는지 알려주지 않는다. 회원가입 없음
11. 인스턴스 띠 — 화면 상단에 이름과 색, 브라우저 탭 제목에도 이름 (SPEC §9.2)

폼 자동 생성이 이 플랫폼의 핵심 기능이다. 고칠 때 깨뜨리지 마라.

API가 아직 없으면 목 데이터로 먼저 만들고, 붙일 때 교체해라.
목 데이터는 SPEC §5.1 타입을 정확히 따라야 한다.
```

---

## 병합 전 전체 검사

병합에 들어가기 전에, 어느 워크스트림도 담당하지 않은 **새 세션**에서 돌린다.

```
spec-review 스킬로 전체 범위 SPEC 검사를 돌려줘.
너는 이 코드를 작성하지 않았다. 고치지 말고 보고만 해라.
```

코드베이스 전체를 훑는 작업이므로 dynamic workflow(`/effort ultracode`)가 맞는 자리다.
치명 항목이 남아 있으면 병합하지 않는다.

## 병합 순서

병렬 작업이 끝나면 **한 세션에서** 순서대로 붙인다.

1. WS-C 러너를 실제로 띄운다 → WS-B의 가짜 응답을 진짜 호출로 교체
2. WS-A 스캔 결과로 WS-E 목록 화면의 목 데이터 교체
3. WS-B 실행 API로 WS-E 실행 버튼 연결
4. 실제 실행 결과로 WS-D 증적 문서 생성
5. Grafana 대시보드 확인

각 단계에서 **화면을 눌러 확인한 뒤** 다음으로 넘어간다.
한꺼번에 붙이고 안 되면 어디가 문제인지 찾는 데 며칠이 걸린다.

---

## 세션 수 조절

동시에 5개를 돌리는 게 부담스러우면 2~3개씩 나눠도 된다. 추천 조합:

- **1차**: WS-C(러너) + WS-A(카탈로그) — 서로 완전히 독립
- **2차**: WS-B(실행) + WS-E(화면) — 계약 기반으로 병행
- **3차**: WS-D(리포팅) — 데이터가 쌓인 뒤가 훨씬 수월하다

WS-C가 가장 오래 걸리므로 가장 먼저 시작하는 게 좋다.
