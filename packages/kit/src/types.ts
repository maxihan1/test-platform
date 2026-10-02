// 모든 바운디드 컨텍스트가 주고받는 유일한 타입 계약 (SPEC §5.1). 여기가 흔들리면 병렬 5갈래가 전부 어긋난다

export type TcId = string;                         // 'AUTH-002'
export type Platform = 'desktop' | 'mobile';
export type ItemStatus = 'PASS' | 'FAIL' | 'NA';
export type JsonSchema = Record<string, unknown>;  // zod 내장 z.toJSONSchema 출력. 검증하지 않고 그대로 저장·전달한다

export interface CaseSpec {
  tcId: TcId;
  name: string;
  platforms: Platform[];        // 비면 ['desktop']
  precondition: string[];
  paramSchema: JsonSchema;      // zod → z.toJSONSchema 변환 결과. 코드에서 null이면 빈 객체 스키마
  expectedSchema: JsonSchema;
  filePath: string;             // 소스 루트 기준 상대 경로
  unconfirmed?: string;         // 있으면 미확정 케이스, 값은 사유 한 문장. 역방향 작성과 정방향의 화면 입력 규칙만 단다
  held?: string;                // 있으면 보류 케이스 — 사람이 값을 채워야 돈다. 머리는 「판정 불가 — 」 또는 「보류 — 」
}

export interface AssertionResult {
  statement: string;            // '응답 코드가 정상이다'
  status: ItemStatus;
  actual: unknown;
  expected: unknown;
  blocker?: boolean;            // true면 이 실패로 실행을 중단했다 (SPEC §4 verify 실패 규칙)
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
  skipped?: true;               // 사람이 체크를 풀어 건너뛴 「만들기」 절차. 판정 없이 PASS 로 적는다 (E2E 시나리오)
}

export interface ExecuteRequest {
  runId: number;                // 스크린샷 경로 artifacts/runs/{runId}/{historyId}/ 를 만들 때만 쓴다
  historyId: number;
  tcId: TcId;
  platform: Platform;           // Playwright project 이름과 일치시킨다
  filePath: string;
  baseUrl: string;              // 이번 실행이 두드릴 주소. admin이 대상 서버 이름을 주소로 바꿔 싣는다 (§5.2)
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

// kit이 절차를 시작할 때 stdout으로 흘리는 것. 아직 흐른 시간이 없어 칸을 만들지 않는다
export interface StepProgress {
  historyId: number;
  seq: number;
  title: string;
}

// 러너가 GET /progress로 답하는 것. 경과는 킷이 아니라 러너가 자기 시계로 잰다
export interface RunningStep extends StepProgress {
  elapsedMs: number;
}

// E2E 시나리오 — admin 과 러너가 주고받는 모양. 무엇이고 왜인지는 SPEC 도메인/시나리오 §3.7
export type ScenarioPart =                         // 부품 목록의 정본은 도메인/시나리오 §3.7 「부품」 표
  | { kind: 'case'; tcId: TcId; params: Record<string, unknown>; expected: Record<string, unknown>;
      skipSteps: string[] }                        // 건너뛸 「만들기」 절차 제목. 비면 전부 돈다
  | { kind: 'api'; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string;   // '/' 로 시작. baseUrl 기준
      body?: unknown; expectStatus: number }
  | { kind: 'mock'; urlPattern: string; status: number; contentType: string; body: string }  // urlPattern 은 Playwright glob
  | { kind: 'unmock'; urlPattern: string }         // 같은 글자로 건 mock 을 푼다
  | { kind: 'wait'; ms: number };                  // 60000 까지

export interface ScenarioExecuteRequest {          // POST /execute-scenario (도메인/러너 §5.2)
  runId: number | null;                            // null 이면 시험 실행. 기록이 없다
  trialId?: string;                                // 시험 실행일 때만. admin 이 만든 UUID
  platform: Platform;
  baseUrl: string;
  parts: Array<ScenarioPart & { filePath?: string }>;   // case 부품에만 filePath 를 admin 이 채워 보낸다
  timeoutMs: number;
}

export interface ScenarioPartResult {
  seq: number;                                     // 1부터. 부품 순서
  status: ItemStatus;                              // 안 돈 부품은 NA + error.message 'NOT_RUN'
  durationMs: number;
  steps: StepResult[];                             // case 부품만 찬다. 순번은 시나리오 전체에서 이어진다
  mocks: string[];                                 // 이 부품이 도는 동안 걸려 있던 mock 의 urlPattern
  error?: { message: string; stack?: string };
}

export interface ScenarioExecuteResponse {
  status: ItemStatus;                              // 부품이 전부 PASS 일 때만 PASS
  durationMs: number;
  parts: ScenarioPartResult[];
  error?: { message: string; stack?: string };     // TIMEOUT · 러너 고장
}
