# 테스트 자동화 플랫폼 — 스펙

> 이 문서는 구현의 **단일 진실 원천(Single Source of Truth)** 이다.
> 여기 적힌 타입·계약·스키마와 다르게 구현하면 병렬 작업이 충돌한다.
> 변경이 필요하면 **구현하지 말고 먼저 이 문서를 고칠 것.**

---

## 1. 제품 정의

QA·개발자·PM이 **테스트 코드를 몰라도** 화면에서 테스트 케이스를 찾아,
입력값을 바꿔 실행하고, 결과를 **명세 기반 문서**로 받을 수 있는 플랫폼.

### 핵심 가치 (구현 우선순위 순)

| # | 가치 | 왜 |
|---|------|-----|
| 1 | 코드 재배포 없이 파라미터·기대값 변경 | 테스트 데이터가 바뀔 때마다 개발자를 부르지 않는다 |
| 2 | 자연어 케이스명으로 검색·실행 | 파일명을 외울 필요가 없다 |
| 3 | 실패 지점을 검증 문장 단위로 표시 | "왜 실패했는지"를 로그 없이 안다 |
| 4 | 명세 기반 증적 문서 자동 생성 | 공공/금융 검수 산출물 공수 제거 |
| 5 | 성공률·소요시간 지표 대시보드 | 자동화 품질 자체를 모니터링 |

### 범위 밖 (의도적 제외)

메시지 큐 / 러너 수평 확장 / S3 업로드.
전부 **대량 실행 대응** 장치이며 현재 규모(단일 서버, 동시 2)에서는 불필요하다.
단, 나중에 붙일 수 있도록 **이음새(seam)** 는 설계에 남긴다. → §5.3

화면은 React + Vite로 빌드한다. 번들러는 대량 실행 대응 장치가 아니라 화면 개발 도구이므로 범위 안이다.
(2026-09-16 결정. 테스트 대상은 데모지만 플랫폼 자체는 완제품이어야 한다.) → §9.1

---

## 2. 유비쿼터스 언어

| 용어 | 코드 식별자 | 정의 |
|------|------------|------|
| 테스트 케이스 | `TestCase` | 코드에 선언된 검증 항목 1건. 명세 그 자체 |
| 케이스 ID | `tcId` | 사람이 부여하고 코드에 적어두는 불변 식별자 (`AUTH-002`) |
| 케이스 명세 | `CaseSpec` | 사전조건 + 이름 + 파라미터 스키마 + 기대결과 스키마 |
| 파라미터 세트 | `ParamSet` | 실행에 주입할 입력값 묶음 (저장 가능) |
| 실행 | `TestRun` | 한 번의 실행 묶음. 화면의 `RUN ID` |
| 실행 항목 | `RunItem` | 실행 안의 케이스 1건 결과. 화면의 `History ID` |
| 스텝 | `Step` | 절차 1단계 |
| 검증 문장 | `Assertion` | 스텝 안의 단언 1개. "응답 코드가 200이다" |
| 환경 | `platform` | 실행 환경. `desktop` \| `mobile`. 명세가 아니라 실행의 성질이다 |
| 증적 | `Evidence` | 실행 결과로 생성된 제출용 문서 |

**금지어**: `testId`, `caseId`, `test_case_id` 혼용 금지. **`tcId` 하나만 쓴다.**

### tcId 형식

```
<도메인>-<3자리 번호>        AUTH-001   PROD-014   ORDER-003   DEMO-001
```

- 도메인은 대문자 2~6자. 기능 영역을 뜻한다 (`AUTH`, `PROD`, `ORDER`, `CART`)
- 번호는 도메인 안에서 001부터. 한 번 쓴 번호는 케이스를 지워도 재사용하지 않는다
- 화면·문서·검색 어디서든 이 문자열 그대로 쓴다. 접두사나 접미사를 붙이지 않는다

---

## 3. 바운디드 컨텍스트

```
┌──────────────────── admin (컨테이너) ─────────────────────┐
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │  Catalog    │  │  Execution   │  │   Reporting    │    │
│  │  카탈로그    │  │    실행       │  │    리포팅       │    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
│         │                │                   │            │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │ HTTP              │
          ▼                ▼                   ▼
    ┌──────────┐   ┌────────────────┐   ┌───────────┐
    │ 소스코드  │   │ runner (컨테이너)│   │ postgres  │
    │ (git 폴더)│   │   Playwright    │   │(컨테이너)  │
    └──────────┘   └────────────────┘   └───────────┘
                                              ▲
                                              │ 읽기 전용
                                         ┌──────────┐
                                         │ grafana  │
                                         └──────────┘
```

### 3.1 Catalog — 무엇을 테스트할 수 있는가

- **책임**: 소스 폴더를 스캔해 `CaseSpec`을 추출하고 검색 가능하게 유지
- **애그리거트 루트**: `TestCase` (식별자 `tcId`)
- **불변식**
  - `tcId`는 전역 유일. 중복 발견 시 스캔 실패시키고 양쪽 파일 경로를 보고한다
  - **코드가 진실의 원천**. DB의 `test_case`는 캐시이며, 스캔 때마다 덮어쓴다
  - 코드에서 사라진 케이스는 삭제하지 않고 `is_active = false`로 둔다 (과거 실행 이력이 참조하므로)
- **추출 방식** (2026-09-16 결정): 스캐너는 `tests/**/*.spec.ts`를 환경변수 `PLATFORM_SCAN=1`을 켠 채
  동적으로 import 해 `export const spec`을 읽는다. kit의 `test()`는 이 변수가 켜져 있으면 Playwright에
  등록하지 않고 조용히 반환한다. zod 스키마는 실행해야 JSON Schema가 되므로 텍스트 파싱은 하지 않는다.
  admin 이미지에 `@platform/kit`·`zod`·`@playwright/test`가 설치돼 있어야 한다
- **스캔 시점** (2026-09-16 결정): admin은 **기동할 때 한 번** 자동으로 스캔한다. 배포는 컨테이너 재기동이므로
  배포 직후 목록이 최신이 된다. 그 밖에는 화면의 `다시 스캔하기` 버튼(→ `POST /api/catalog/scan`)으로 돌린다.
  기동 시 스캔이 실패(tcId 중복 등)해도 admin은 뜬다. 실패 사유는 마지막 스캔 결과(`GET /api/catalog/scan`)에 남기고
  목록 화면 위에 보여준다

### 3.2 Execution — 언제 무슨 값으로 돌렸는가

- **책임**: 실행 요청을 받아 러너에 분배하고 결과를 영속화
- **애그리거트 루트**: `TestRun` (식별자 `runId`) → `RunItem[]` → `Step[]`
- **불변식**
  - `RunItem`은 실행 시점의 `params`/`expected`를 **스냅샷으로 복사해 저장**한다.
    `param_set`을 참조만 하면 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다
  - 동시 실행 수는 설정값(기본 2)을 넘지 않는다
  - `RunItem`은 생성 시 `status = NA`, `finished_at = NULL`이다. 실행이 끝나야 판정이 들어간다.
    러너 고장·타임아웃도 `NA`이며 `error`가 채워진 것으로 구분한다
  - `TestRun.status`는 모든 `RunItem`이 종료되어야 `FINISHED`가 된다

### 3.3 Reporting — 결과를 어떻게 보여주는가

- **책임**: 저장된 결과를 읽어 증적 문서와 지표를 만든다
- **읽기 전용**. 이 컨텍스트는 어떤 테이블에도 write 하지 않는다 (`evidence_document` 제외)
- 산출물 2종
  - **증적 문서**: 사람이 제출. HTML 생성 → PDF 변환.
    PDF 변환은 admin이 Playwright의 `page.pdf()`로 직접 한다 (2026-09-16 결정).
    그래서 admin 이미지도 Playwright 공식 이미지에서 시작한다 (§9)
  - **지표**: Grafana가 Postgres를 직접 조회. 별도 시계열 DB 없음

### 3.4 Runner — 실제로 돌린다

- **책임**: 케이스 1건을 주어진 값으로 실행하고 구조화된 결과를 반환
- **완전 무상태**. DB에 접근하지 않는다. 이 규칙이 깨지면 컨테이너 분리가 무의미해진다
- 입출력은 §5.2 계약만 사용

---

## 4. 명세 선언 방식 (가장 중요)

테스트 코드 안에 명세를 함께 선언한다. 이 선언 하나가 **입력 폼 · 검증 · 증적 문서**를 전부 만든다.

```ts
// tests/auth/login.spec.ts
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'AUTH-002',
  name: '유효한 이메일과 비밀번호로 로그인하면 토큰이 발급된다',
  platforms: ['desktop', 'mobile'],     // 생략 시 ['desktop']
  precondition: [
    '가입 완료된 사용자 계정이 존재한다',
    '계정이 잠금 상태가 아니다',
  ],
  params: z.object({
    username: z.string().min(1).describe('아이디'),
    password: z.string().min(1).describe('비밀번호'),
  }),
  expected: z.object({
    statusCode: z.number().describe('응답 코드'),
    hasToken:   z.boolean().describe('토큰 발급 여부'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const res = await test.step('로그인 API를 호출한다', async () => {
    const res = await request.post('/api/login', { data: params });
    await verify('응답 코드가 정상이다', res.status(), expected.statusCode, { blocker: true });
    return res;
  });

  await test.step('토큰을 검증한다', async () => {
    const body = await res.json();
    await verify('토큰이 발급된다', !!body.token, expected.hasToken);
  });

  await test.step('로그인 후 화면을 확인한다', async () => {
    await page.goto('/dashboard');
  }, { capture: true });
});
```

### 각 필드가 어디에 쓰이는가

| 필드 | 쓰이는 곳 |
|------|----------|
| `tcId` | 검색, 파라미터 주입 키, 증적 문서 항목 번호, 이력 추적 |
| `platforms` | 실행 화면의 환경 선택지, 실행 시 생성될 `RunItem` 개수 |
| `name` | 목록 화면, 증적 문서 "검증 항목" 칸 |
| `precondition` | 증적 문서 "사전조건" 칸 |
| `params` | **입력 폼 자동 생성** (`describe`가 한글 라벨, `enum`이면 드롭다운, `optional`이면 선택 입력), 실행 전 검증 |
| `expected` | 기대값 입력 폼, 증적 문서 "기대결과" 칸 |
| `test.step` | 증적 문서 "시험 절차" 칸, 실패 지점 표시 |
| `verify` | 증적 문서 "판정" 칸, 검증 문장 단위 PASS/FAIL |

`spec`은 반드시 `export const spec`으로 내보낸다. 스캐너가 이 이름을 찾는다 (§3.1).

`verify(문장, 실제값, 기대값, { blocker?: true })` — 앞의 세 인자를 그대로 결과에 남긴다.
`expect`를 직접 쓰면 문장이 남지 않으므로 **테스트 코드에서 `expect` 직접 사용을 금지**한다.

### verify 실패 규칙 (2026-09-16 결정)

- `verify`는 **절차(`test.step`) 안에서만** 부른다. 밖에서 부르면 kit이 에러를 던진다.
  화면과 증적 문서가 절차 아래에 검증 문장을 보여주는 구조이기 때문이다
- 실패해도 **기본은 계속 간다.** 그 문장은 FAIL로 기록되고 다음 문장·다음 절차를 계속 돌린다.
  화면 문구가 바뀐 정도의 실패로 뒤 절차까지 버리지 않기 위해서다
- 뒤를 돌릴 의미가 없는 검증에는 `{ blocker: true }`를 붙인다. 이 문장이 실패하면 **그 절차를 끝으로 멈춘다.**
  로그인 실패처럼 뒤 절차의 전제가 무너지는 경우다. 시스템은 값만 보고 사유를 알 수 없으므로 작성자가 표시한다
- 예외(요소를 못 찾음, 페이지가 안 뜸 등)는 코드가 더 갈 수 없으므로 **항상 멈춘다.** 그 절차는 FAIL + `error`
- 판정: 검증 문장이 하나라도 FAIL이면 절차도 항목도 FAIL. 멈춘 뒤 돌지 않은 절차는 문서에 나오지 않는다
  (절차는 실행해 봐야 알 수 있다). 대신 멈추게 한 문장에 `실행 중단`을 표시해 뒤가 왜 없는지 알린다

### 테스트 코드에는 주석을 쓰지 않는다

주석이 들어갈 자리를 이미 선언이 가져갔다.

| 적고 싶은 것 | 적을 자리 |
|-------------|----------|
| 이 테스트가 무엇을 검증하는가 | `name` |
| 어떤 상태를 전제하는가 | `precondition` |
| 이 단계에서 무엇을 하는가 | `test.step`의 제목 |
| 여기서 무엇을 확인하는가 | `verify`의 문장 |

주석은 화면에도 증적 문서에도 나오지 않는다. 같은 설명이 두 군데 생기면
코드를 고칠 때 한쪽만 고쳐져 주석이 거짓말을 시작한다.

**적용 범위**: `tests/**` 만. 러너·스캐너 등 플랫폼 코드는 CLAUDE.md의
기존 규칙(왜만 적는다)을 따른다.

### 케이스 파일 규칙 — `npm run check:tests`가 기계로 검사한다 (2026-09-16 결정)

테스트 코드는 사람이 쓸 수도 있다. 그래서 아래 규칙은 Claude 훅이 아니라 **저장소에 올릴 때 CI가** 검사한다.
검사기는 WS-A의 스캐너를 저장 없이 돌리는 모드이며, 어긋나면 `파일:줄 — 무엇이 — 왜 문제` 한 줄로 알린다.

| # | 규칙 | 어기면 무엇이 안 되나 |
|---|------|---------------------|
| K1 | 파일 1개 = 케이스 1건. `export const spec = defineCase(...)`가 정확히 하나 | 스캐너가 명세를 못 찾는다 |
| K2 | `tcId`가 `<대문자 2~6자>-<3자리>` 형식이고 전체에서 유일 | 검색·이력·문서 번호가 깨진다 |
| K3 | `name`이 비어 있지 않은 문장 | 목록과 문서의 "검증 항목" 칸이 빈다 |
| K4 | `precondition`·`params`·`expected`는 생략 불가. 없으면 `precondition: []`, `params: null`, `expected: null`로 **없다고 적는다.** 스키마가 있으면 모든 필드에 `.describe()` | 깜빡한 것과 정말 없는 것을 구분할 수 없다. `.describe()`가 없으면 입력 폼 라벨을 못 만든다 |
| K5 | `platforms`가 `desktop`·`mobile`만 | 러너의 `--project`가 실패한다 |
| K6 | `test.step`의 제목과 `verify`의 문장이 비어 있지 않은 문자열 리터럴이고, `verify`가 1개 이상 | 절차·판정 칸이 비어 증적이 못 된다 |
| K7 | 주석 없음, `expect` 직접 호출 없음 | 위 "테스트 코드에는 주석을 쓰지 않는다" |
| K8 | `npx playwright test --list`가 파일마다 테스트 1개를 등록 | 문법 오류, import 실패 |

문장이 검수자가 읽을 만한가(품질)는 기계가 못 본다. 그건 갈래를 끝낼 때 spec-review가 본다.

**없으면 없다고 적는다.** (2026-09-16 결정) `null`은 선언에서만 쓴다. 스캐너는 빈 객체 스키마로 기록하고
(`param_schema`·`expected_schema`는 `NOT NULL` 그대로), 실행 때 kit은 빈 객체를 넘긴다.
화면은 입력칸을 만들지 않고, 문서는 "입력 없음"으로 쓴다. `platforms`만 생략할 수 있다 — 기본값 `['desktop']`이 의도된 것이다.

입력값·기대값이 없는 케이스는 이렇게 생긴다.

```ts
export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: [],
  params: null,
  expected: null,
});
```

### 스크린샷

- **실패한 스텝은 자동으로 찍는다.** 통과한 화면은 아무도 열어보지 않고,
  전부 찍으면 실행 한 번에 수십 장이 쌓여 디스크가 금방 찬다
- **증적용으로 명시 지정**: `test.step(제목, fn, { capture: true })`.
  인자 순서는 Playwright의 `test.step(title, body, options)`와 같다. kit의 `test`는 Playwright를
  감싼 래퍼이고 `capture`는 kit이 추가한 옵션이다.
  검수 문서에 "이 화면이 이렇게 나왔다"를 넣어야 할 때 쓴다. 기본값은 false
- API 테스트는 화면이 없으므로 대신 요청·응답 원문을 같은 자리에 남긴다

---

## 5. 계약 (변경 시 반드시 이 문서부터 수정)

### 5.1 Shared Kernel 타입

`packages/kit/src/types.ts`. 모든 컨텍스트가 이 타입만 주고받는다.

```ts
export type TcId = string;                         // 'AUTH-002'
export type Platform = 'desktop' | 'mobile';
export type ItemStatus = 'PASS' | 'FAIL' | 'NA';
export type JsonSchema = Record<string, unknown>;  // zod-to-json-schema 출력. 검증하지 않고 그대로 저장·전달한다

export interface CaseSpec {
  tcId: TcId;
  name: string;
  platforms: Platform[];        // 비면 ['desktop']
  precondition: string[];
  paramSchema: JsonSchema;      // zod → zod-to-json-schema 변환 결과. 코드에서 null이면 빈 객체 스키마
  expectedSchema: JsonSchema;
  filePath: string;             // 소스 루트 기준 상대 경로
}

export interface AssertionResult {
  statement: string;            // '응답 코드가 정상이다'
  status: ItemStatus;
  actual: unknown;
  expected: unknown;
  blocker?: boolean;            // true면 이 실패로 실행을 중단했다 (§4 verify 실패 규칙)
}

export interface StepResult {
  seq: number;
  title: string;                // '로그인 API를 호출한다'
  status: ItemStatus;
  durationMs: number;
  assertions: AssertionResult[];
  line?: number;                // 실패한 소스 줄 번호. 코드 뷰가 이 줄을 중심으로 연다
  screenshotPath?: string;      // 실패 시 자동, 또는 capture:true인 스텝
  httpTrace?: { request: unknown; response: unknown };  // API 테스트용
  error?: { message: string; stack?: string };
}

export interface ExecuteRequest {
  runId: number;                // 스크린샷 경로 artifacts/runs/{runId}/{historyId}/ 를 만들 때만 쓴다
  historyId: number;
  tcId: TcId;
  platform: Platform;           // Playwright project 이름과 일치시킨다
  filePath: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;            // 기본 300000
}

export interface ExecuteResponse {
  historyId: number;
  status: ItemStatus;
  durationMs: number;
  steps: StepResult[];
  error?: { message: string; stack?: string };
}
```

### 5.2 Runner HTTP 계약

```
POST http://runner:4000/execute
Content-Type: application/json
Body:     ExecuteRequest
200 OK:   ExecuteResponse
400:      { error: 'INVALID_REQUEST', detail: string }
404:      { error: 'CASE_NOT_FOUND', detail: string }
500:      { error: 'RUNNER_ERROR', detail: string }

GET  http://runner:4000/health   → 200 { ok: true, playwrightVersion: string }
```

- **동기 호출.** Execution이 동시성 2로 제한해 호출한다
- 러너는 `ExecuteRequest.params`를 환경변수 `PLATFORM_PARAMS`(JSON 문자열)로 주입하고
  `npx playwright test <filePath> --project=<platform>`을 자식 프로세스로 실행한다
- 결과는 커스텀 리포터가 stdout에 **JSON 한 줄**(`@@RESULT@@{...}`)로 뱉고 러너가 파싱한다
- **타임아웃**: `timeoutMs`가 지나면 러너가 자식 프로세스를 죽이고 `200`으로
  `{ status: 'NA', error: { message: 'TIMEOUT' }, steps: <파싱된 것이 있으면 그것, 없으면 []> }`을 돌려준다.
  `500`은 러너 자체의 고장(프로세스 기동 실패 등)에만 쓴다
- Execution이 러너를 부를 때의 HTTP 타임아웃은 `timeoutMs + 30초`다. 러너가 먼저 끊어야 부분 결과가 남는다
- 케이스 1건 = Playwright 프로세스 1개(`workers: 1`). 동시 실행은 Execution의 동시성(2)으로만 제어한다

### 5.3 나중을 위한 이음새

| 확장 | 바꿀 곳 | 나머지 영향 |
|------|--------|-----------|
| 러너 여러 대 | Execution의 디스패처가 러너 URL 목록을 라운드로빈 | 없음 |
| 메시지 큐 도입 | `POST /execute` 호출부를 큐 발행으로 교체 + 콜백 수신 엔드포인트 추가 | Runner 내부 로직 변경 없음 |
| S3 배포 | Catalog 스캔 대상 경로만 교체 | 없음 |

**이 이음새를 지키는 유일한 규칙: 러너는 DB를 모른다.**

---

## 6. 데이터 모델

```sql
-- 카탈로그 (스캔 결과 캐시. 진실의 원천은 코드)
CREATE TABLE test_case (
  tc_id           TEXT PRIMARY KEY,
  name            TEXT        NOT NULL,
  platforms       JSONB       NOT NULL DEFAULT '["desktop"]',
  precondition    JSONB       NOT NULL DEFAULT '[]',
  file_path       TEXT        NOT NULL,
  param_schema    JSONB       NOT NULL,
  expected_schema JSONB       NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 저장된 입력값 묶음 (파라미터별 행 분리 금지. JSONB 통째로)
CREATE TABLE param_set (
  id          BIGSERIAL PRIMARY KEY,
  tc_id       TEXT        NOT NULL REFERENCES test_case(tc_id),
  name        TEXT        NOT NULL,
  params      JSONB       NOT NULL,
  expected    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tc_id, name)
);

-- 실행 묶음
CREATE TABLE test_run (
  run_id       BIGSERIAL PRIMARY KEY,
  title        TEXT        NOT NULL,
  triggered_by TEXT        NOT NULL,
  env          TEXT        NOT NULL DEFAULT 'demo',
  status       TEXT        NOT NULL,   -- RUNNING | FINISHED | ABORTED
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ
);

-- 실행 항목 (params/expected는 실행 시점 스냅샷)
CREATE TABLE run_item (
  history_id  BIGSERIAL PRIMARY KEY,
  run_id      BIGINT      NOT NULL REFERENCES test_run(run_id),
  tc_id       TEXT        NOT NULL,
  platform    TEXT        NOT NULL DEFAULT 'desktop',  -- desktop | mobile
  tc_name     TEXT        NOT NULL,   -- 스냅샷. 이름이 나중에 바뀌어도 증적은 그대로
  precondition JSONB      NOT NULL DEFAULT '[]',
  params      JSONB       NOT NULL,
  expected    JSONB       NOT NULL,
  status      TEXT        NOT NULL,   -- PASS | FAIL | NA. 생성 시 NA, finished_at이 NULL이면 아직 실행 전
  duration_ms INTEGER,
  error       JSONB,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX ON run_item (run_id);
CREATE INDEX ON run_item (tc_id, platform, started_at DESC);  -- 케이스×환경 이력 추적
-- 같은 run 안에서 같은 케이스가 환경별로 각각 1행씩 쌓인다
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform);

-- 절차 + 검증 문장
CREATE TABLE run_item_step (
  id              BIGSERIAL PRIMARY KEY,
  history_id      BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  status          TEXT    NOT NULL,
  duration_ms     INTEGER,
  assertions      JSONB   NOT NULL DEFAULT '[]',  -- AssertionResult[]
  line            INTEGER,                        -- 실패한 소스 줄 번호
  screenshot_path TEXT,
  http_trace      JSONB,                          -- API 테스트의 요청·응답 원문
  error           JSONB,
  UNIQUE (history_id, seq)
);

-- 생성된 증적 문서
CREATE TABLE evidence_document (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT      NOT NULL REFERENCES test_run(run_id),
  format       TEXT        NOT NULL,   -- HTML | PDF
  file_path    TEXT        NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Admin API

```
# Catalog
POST   /api/catalog/scan                 소스 폴더 재스캔 → { added, updated, deactivated, duplicates[] }
GET    /api/catalog/scan                 마지막 스캔 결과 → { scannedAt, added, updated, deactivated, duplicates[], error? }
GET    /api/catalog/cases?q=&page=       케이스 검색 (이름·tcId 부분 일치)
GET    /api/catalog/cases/:tcId          단건 + 스키마

# ParamSet
GET    /api/cases/:tcId/param-sets
POST   /api/cases/:tcId/param-sets       { name, params, expected } — 저장 전 스키마 검증
DELETE /api/param-sets/:id

# Execution
POST   /api/runs                         { title, items: [{ tcId, platforms[], params, expected }] } → { runId }
                                         platforms 배열 길이만큼 run_item이 생성된다
GET    /api/runs?page=                   실행 목록
GET    /api/runs/:runId                  실행 + 항목 목록
GET    /api/runs/:runId/items/:historyId 항목 상세 (스텝·검증 문장 포함)
GET    /api/cases/:tcId/history?platform= 케이스별 이력. platform 생략 시 전 환경

# 실패 분석 (상세 화면 전용. 증적 문서에는 포함하지 않는다)
GET    /api/cases/:tcId/source?line=     실패 줄 ±5줄 발췌 → { lines: [{no, text}], focus }
GET    /api/screenshots/:runId/:historyId/:seq.png   스크린샷 원본

# Reporting
POST   /api/runs/:runId/evidence         { format } → { filePath }
GET    /api/evidence/:id                 문서 다운로드
```

---

## 8. 화면

### 8.1 케이스 목록
`TC ID | 케이스명(문장형) | 지원 환경 | 마지막 결과 | [실행]`
→ JSON 원문은 목록에 절대 노출하지 않는다.
목록 위에 `다시 스캔하기` 버튼과 마지막 스캔 시각·결과(추가/갱신/비활성/중복)를 둔다.
스캔이 실패했으면 그 사유를 같은 자리에 보여준다.

### 8.2 실행 설정
선택한 케이스의 `paramSchema`를 읽어 **입력 폼을 자동 생성**한다.
`enum` → 셀렉트, `boolean` → 토글, `optional` → 선택 입력, `describe` → 라벨.
저장된 `ParamSet`을 불러오는 드롭다운 제공.
케이스의 `platforms`에 선언된 환경만 체크박스로 노출하고, 기본은 전부 선택.
스키마 검증 실패 시 해당 칸 아래에 이유를 표시한다(버튼은 비활성화하지 않는다).

### 8.3 실행 결과 목록
케이스 1건 = 1행. 환경별 결과는 판정 칸에 나란히 묶어 보여준다.

`TC ID | 케이스명 | PC 판정 | 모바일 판정 | 소요시간 | [상세]`

환경별로 행을 쪼개지 않는 이유: 목록 길이가 두 배가 되고,
"PC는 되는데 모바일만 깨짐"이 한 줄에서 안 보이게 된다.
환경을 지원하지 않는 케이스는 해당 칸을 `—`로 비운다.
필터: 상태(전체/PASS/FAIL/NA) + 환경(전체/PC/모바일).

### 8.4 항목 상세 — 명세 기반 포맷
```
AUTH-002  유효한 이메일과 비밀번호로 로그인하면 토큰이 발급된다   [모바일]  [FAIL]

사전조건   · 가입 완료된 사용자 계정이 존재한다
           · 계정이 잠금 상태가 아니다

입력       아이디      testuser
           비밀번호    ********

시험 절차
  1. 로그인 API를 호출한다                                    PASS  (312ms)
       ✓ 응답 코드가 정상이다          기대 200      실제 200
  2. 토큰을 검증한다                                          FAIL  (88ms)
       ✗ 토큰이 발급된다               기대 true     실제 false

       [스크린샷 썸네일 — 클릭 시 원본]

       ▸ 실패 지점 코드                                    (접힌 상태가 기본)
           18  const body = await res.json();
           19  await verify('토큰이 발급된다', !!body.token, expected.hasToken);
           20  await verify('유효기간이 3600초다', body.expiresIn, 3600);
```

스크린샷은 실패한 검증 문장 바로 아래에 둔다. 스텝 헤더가 아니라 문장 아래다.
어느 확인에서 깨졌는지와 그때 화면이 나란히 붙어야 의미가 있다.
실행을 멈추게 한 검증 문장(`blocker`)에는 옆에 `실행 중단`을 표시한다. 그 뒤 절차가 왜 없는지 설명이 필요하다.

**코드 뷰**는 실패한 스텝에만, 접힌 상태로, 상세 맨 아래가 아니라 해당 스텝 안에 둔다.
이 플랫폼의 전제는 "코드를 몰라도 쓴다"이므로 기본 노출은 하지 않는다.
증적 문서에는 코드와 `httpTrace`를 넣지 않는다 — 스크린샷만 들어간다.

증적 문서는 **실행(run) 단위로 1부**다. 항목(`history_id`)마다 위 블록이 반복되고,
환경이 2개인 케이스는 환경별로 2번 나온다. 화면의 상세는 항목 1건, 문서는 항목 전부 — 블록 모양은 같다.

### 8.5 대시보드 (Grafana)
성공률 추이 / 평균 소요시간 / 실패 TOP 10 케이스 / 최근 실행 목록.
Postgres 데이터소스로 `run_item`을 직접 조회한다.

---

## 9. 인프라

```yaml
# docker-compose.yml (구조만)
services:
  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  admin:
    build: ./apps/admin               # FROM mcr.microsoft.com/playwright:<버전>-jammy (증적 PDF용 브라우저)
    ports: ["3000:3000"]
    depends_on: [postgres]
    volumes:
      - "./tests:/tests:ro"           # 스캔과 실패 지점 코드 발췌가 소스를 읽는다
      - "artifacts:/artifacts"        # 스크린샷 서빙, 증적 문서 저장
  runner:
    build: ./apps/runner              # FROM mcr.microsoft.com/playwright:<버전>-jammy
    ports: ["4000:4000"]
    volumes:
      - "./tests:/tests:ro"           # 테스트 소스 읽기 전용 마운트
      - "artifacts:/artifacts"        # 스크린샷 공유 볼륨 (admin과 공유)
    mem_limit: 4g                     # 폭주해도 admin을 끌고 내려가지 않게
  grafana:
    image: grafana/grafana
    ports: ["3001:3000"]
    depends_on: [postgres]
    volumes: ["./infra/grafana/provisioning:/etc/grafana/provisioning:ro"]   # WS-D가 채운다
volumes:
  pgdata: {}
  artifacts: {}
```

- 대상 서버: 2 vCPU / 16GB EC2 (Ubuntu)
- 동시 실행 2 고정 (Execution 디스패처). CPU가 2코어이므로 그 이상은 느려지기만 한다.
  Playwright 프로세스 하나는 케이스 1건만 돌리므로 `workers: 1`이다
- 러너와 admin 둘 다 Playwright 공식 이미지를 쓴다 (시스템 라이브러리 문제 회피. admin은 PDF용).
  이미지 태그와 `@playwright/test` 버전은 **정확히 같아야** 한다. 다르면 브라우저 바이너리를 못 찾는다
- 러너와 admin은 바깥 인터넷(HTTPS)으로 나갈 수 있어야 한다. 데모 대상이 공개 사이트다 (§10)
- `/tests`는 읽기 전용이라 그 안에 `node_modules`를 둘 수 없다. 러너 이미지가
  `@playwright/test`·`@platform/kit`·`zod`를 `/tests` 밖에서 resolve 되게 갖고 있어야 한다
- 스크린샷은 러너와 어드민이 **공유 볼륨**에 둔다.
  경로 규칙: `artifacts/runs/{runId}/{historyId}/{seq}.png`
  러너가 쓰고 어드민이 `/api/screenshots/...`로 서빙한다. 러너는 DB를 여전히 모른다
- 증적 문서는 `artifacts/evidence/{runId}/{id}.{html|pdf}`에 둔다. `evidence_document.file_path`가 이 경로다
- Grafana는 읽기 전용 DB 계정으로 붙는다. 계정은 Phase 0에서 만든다 (마이그레이션 또는 postgres init 스크립트)

### 9.1 기술 스택 (2026-09-16 확정)

| 층 | 선택 | 비고 |
|----|------|------|
| 언어·런타임 | TypeScript, Node 20 이상, npm workspaces 모노레포 | Node 버전은 Playwright 이미지에 든 것을 따른다 |
| admin 서버 | Fastify | 컨텍스트별 `routes.ts`를 플러그인으로 등록한다 (WORKSTREAMS 공용 골격) |
| 화면 | React + Vite | `apps/admin/src/web/**`가 Vite 프로젝트. 빌드 산출물을 admin이 `/`에서 정적 서빙, API는 `/api/**` |
| DB 접근 | `pg` + 순수 SQL | ORM 없음. spec-review가 컬럼명을 grep으로 확인할 수 있어야 한다 |
| 마이그레이션 | SQL 파일 + dbmate | `db/migrations/*.sql`. compose의 일회성 서비스로 적용한다 |
| 명세·검증 | zod + zod-to-json-schema | §4 |
| 단위 테스트 | Vitest | 각 앱 안 `*.test.ts`. `tests/**`는 Playwright 전용 |
| E2E·데모 | Playwright | `tests/**` |
| PDF | Playwright `page.pdf()` | admin 안에서 (§3.3) |

여기 없는 것을 쓰려면 CLAUDE.md §3 대로 먼저 묻는다.

---

## 10. 데모용 테스트 자산

플랫폼 개발·검증을 위한 **가짜 테스트 10건**. 실제 서비스가 아니라 공개 데모 대상을 쓴다 (2026-09-16 결정).

- 브라우저 케이스: `https://demo.playwright.dev/todomvc`
- API 케이스: `https://jsonplaceholder.typicode.com`
- `DEMO-007`(타임아웃)은 외부 사이트에 기대지 않는다. `timeoutMs`를 5000으로 준 실행에서
  `page.waitForTimeout(60_000)`으로 러너의 타임아웃 처리(§5.2)를 검증한다

| tcId | `platforms` | 목적 |
|------|------------|------|
| `DEMO-001` | `['desktop']` | 단순 PASS |
| `DEMO-002` | `['desktop']` | 의도적 FAIL (실패 표시 확인) |
| `DEMO-003` | `['desktop']` | 파라미터 3개 (폼 생성 확인) |
| `DEMO-004` | `['desktop']` | `enum` 파라미터 (드롭다운 확인) |
| `DEMO-005` | `['desktop']` | `optional` 파라미터 |
| `DEMO-006` | `['desktop']` | 스텝 3단 (절차 표시 확인) |
| `DEMO-007` | `['desktop']` | 타임아웃 (에러 처리 확인) |
| `DEMO-008` | `['desktop','mobile']` | **환경 2개.** 한 케이스에서 run_item 2행이 생기는지 확인 |
| `DEMO-009` | `['desktop','mobile']` | **환경별 결과 분기.** PC는 통과, 모바일은 실패하도록 작성 |
| `DEMO-010` | `['mobile']` | 모바일 전용 케이스. PC 칸이 `—`로 비는지 확인 |

`DEMO-008`~`DEMO-010`이 환경 축을 검증하는 3건이다. 이게 없으면
"묶어서 보여주기" 화면과 환경별 이력 추적을 개발 중에 확인할 방법이 없다.

Playwright `projects` 설정은 `desktop`(Chromium 데스크톱)과
`mobile`(`devices['iPhone 14']`) 2개로 시작한다. 프로젝트 이름은
`Platform` 타입 값과 **철자까지 일치**해야 한다. 러너가 그대로 넘긴다.

---

## 11. 완료 기준

### Phase 0 — 골격 (단독 세션)
- [ ] `docker compose up`으로 4개 컨테이너가 뜬다
- [ ] 마이그레이션이 적용되고 §6 테이블이 전부 존재한다
- [ ] `packages/kit`의 §5.1 타입이 컴파일된다
- [ ] `GET /health`가 러너에서 200을 반환한다
- [ ] 데모 테스트 10건이 작성되어 있다 (환경 2개 케이스 포함)
- [ ] 러너 컨테이너 안에서 `npx playwright test`로 `DEMO-001`이 **실제로** 돈다
      (브라우저 기동, `/tests` 읽기 전용 마운트, 모듈 해석이 여기서 검증된다)
- [ ] **가장 얇은 관통**: 케이스 1건을 하드코딩으로 실행해 `run_item`에 결과가 1행 쌓인다.
      러너 스텁의 가짜 응답으로는 관통이 아니다. 실제 실행의 exit code로 PASS/FAIL을 만든다

### Phase 1 — 병렬 5갈래 (WORKSTREAMS.md 참조)
- [ ] 화면에서 케이스 검색 → 값 입력 → 실행 → 결과 상세까지 클릭으로 완주
- [ ] 코드 수정·재배포 없이 파라미터를 바꿔 다시 실행 가능
- [ ] 실패한 검증 문장이 화면에 문장으로 표시됨
- [ ] 환경 2개를 선택해 실행하면 결과가 환경별로 나뉘어 한 행에 묶여 표시됨
- [ ] 실패한 스텝에 스크린샷이 자동으로 붙고 화면에서 열림
- [ ] 실패 지점 코드가 ±5줄로 펼쳐짐
- [ ] 증적 문서 PDF가 §8.4 포맷으로 생성됨 (코드·httpTrace 제외, 스크린샷 포함)
- [ ] `npm run check:tests`가 CI에서 통과함 (§4 케이스 파일 규칙 K1~K8)
- [ ] Grafana에 성공률 추이가 그려짐
