// 모든 바운디드 컨텍스트가 주고받는 유일한 타입 계약 (SPEC §5.1). 여기가 흔들리면 병렬 5갈래가 전부 어긋난다

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
