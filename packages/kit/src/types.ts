// 모든 바운디드 컨텍스트가 주고받는 유일한 타입 계약 (SPEC §5.1). 여기가 흔들리면 병렬 5갈래가 전부 어긋난다

export type TcId = string;                         // 'AUTH-002'
export type BrowserPlatform = 'desktop' | 'mobile';   // 브라우저 디바이스. E2E 웹 단계가 도는 창
export type Platform = BrowserPlatform | 'android';
export type ItemStatus = 'PASS' | 'FAIL' | 'NA';
export type JsonSchema = Record<string, unknown>;  // zod 내장 z.toJSONSchema 출력. 검증하지 않고 그대로 저장·전달한다

// 타입만으로는 검사기 · 화면이 목록을 돌 수 없어 값 하나를 계약에 둔다. 차례가 곧 표시 · 정렬 차례다
export const TECHNIQUES = ['경계값 분석', '동등 분할', '결정 테이블', '상태 전이', '오류 추정'] as const;
export type Technique = (typeof TECHNIQUES)[number];

export interface CaseSpec {
  tcId: TcId;
  name: string;
  platforms: Platform[];        // 비면 ['desktop']
  precondition: string[];
  paramSchema: JsonSchema;      // zod → z.toJSONSchema 변환 결과. 코드에서 null이면 빈 객체 스키마
  expectedSchema: JsonSchema;
  filePath: string;             // 소스 루트 기준 상대 경로
  held?: string;                // 있으면 보류 케이스 — 사람이 값을 채워야 돈다. 머리는 「판정 불가 — 」 또는 「보류 — 」
  techniques?: Technique[];     // 기능 테스트에만 · 칸의 설계 기법. 값은 DB · URL 에 그대로 가는 식별자라 바꾸지 않는다
  apiDoc?: number;              // API 케이스만 · 케이스가 만들어진 API 문서 판. 없으면 키가 없다 (도메인/API §3.8)
  elements?: string[];          // 게임 케이스만 · 닿는 게임 요소 열쇠(item:sword_short · zone:Town). 비면 키가 없다 (도메인/게임 §3.10 결정 9)
  smoke?: true;                 // 스모크 표시. 웹 · 앱 · 게임 다 쓴다. 없으면 키가 없다 (도메인/게임 §3.10 「빌드마다 돌리기」)
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
  shapeChecks?: ShapeCheck[];   // 그 절차에서 보낸 요청의 응답 모양 확인. 하나라도 FAIL 이면 그 절차 status 는 FAIL (도메인/API §3.8)
  error?: { message: string; stack?: string };
  skipped?: true;               // 사람이 체크를 풀어 건너뛴 「만들기」 절차. 판정 없이 PASS 로 적는다 (E2E 시나리오)
}

export interface ExecuteRequest {
  runId: number;                // 스크린샷 · trace 경로 artifacts/runs/{runId}/{historyId}/ 를 만들 때와 trace 를 켤지(0 이면 끔) 정할 때만 쓴다
  historyId: number;
  tcId: TcId;
  platform: Platform;           // Playwright project 이름과 일치시킨다
  filePath: string;
  baseUrl: string;              // 이번 실행이 두드릴 주소. admin이 대상 서버 이름을 주소로 바꿔 싣는다 (§5.2)
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;            // 기본 300000
  app?: string;                 // android 만. 그 대상 서버의 앱 파일 경로나 http(s) 주소(받는 쪽은 Appium 이 도는 PC). 없으면 러너 환경값 PLATFORM_APP (§5.2 · APP-F1-03)
  udid?: string;                // android 만. admin 이 디바이스 팜에서 잡은 폰. 없으면 러너 환경값 PLATFORM_DEVICE_UDID (§5.2 · APP-F1-10)
  farmToken?: string;           // android 만. 그 폰을 잡은 누른 사람의 팜 토큰. 없으면 러너 환경값 PLATFORM_APPIUM_TOKEN. 기록 · 로그에 안 넣는다 (§5.2 「팜 토큰은 누른 사람 것이 먼저다」 · APP-F1-13)
  engine?: 'GAME';              // 게임 애플리케이션의 android 항목만. admin 이 애플리케이션 종류를 보고 싣는다. 없으면 platform 으로 엔진을 고른다(android → Appium) (도메인/게임 §3.10 결정 6 · GAME-F1-07)
  adminKey?: { header: string; value: string };  // 게임 애플리케이션 항목만. 그 대상 서버 줄의 어드민 키 원문 — kit 이 몸통 admin 요청에 머리로 넣고 기록에서 가린다 (도메인/게임 §3.10 「케이스 꼴」 · GAME-F1-09)
  apiAuths?: ApiAuth[];         // 그 대상 서버 줄의 API 인증 전부. API 종류 애플리케이션 케이스만 (도메인/API §3.8 · API-F1-04)
  apiDoc?: ApiDocRef;           // 그 케이스의 판. CaseSpec.apiDoc 이 있을 때만 (도메인/API §3.8 · API-F1-05)
  recordHar?: { jobId: number }; // 성능 시나리오 녹화 — 오면 HAR 를 남긴다. jobId 는 기다리는 perf_ai_job 번호. 기록 · 증적에 안 남는다 (공통/3-공유계약 「성능 테스트 타입」)
}

export interface ApiAuth {      // 대상 서버 줄의 API 인증 하나 (service_env.api_auths). 러너 · kit 까지만 비밀값이 간다
  name: string;                 // '고객사 A' — 케이스가 api(이름) 으로 부른다
  tokenUrl: string;             // '/v1/oauth/token' 이면 케이스 요청과 같은 규칙(Playwright baseURL)으로 대상 서버 주소에 붙는다. 아니면 http(s) 주소 (도메인/API §3.8)
  clientId: string;
  clientSecret: string;
}

export interface ApiDocRef {    // 케이스가 만들어진 판의 원문. 서버가 실행 때 싣는다
  version: number;
  doc: unknown;                 // OpenAPI 3.x JSON 그대로
}

export interface ShapeCheck {   // 요청 하나의 응답 모양 확인 (도메인/API §3.8 「응답 모양 확인」)
  method: string;               // 'POST'
  path: string;                 // 문서의 경로 틀 '/v1/pushes/{id}'
  status: number;               // 받은 응답 코드
  result: 'PASS' | 'FAIL' | 'NO_SHAPE';   // NO_SHAPE — 그 코드에 문서 모양이 없어 코드만 봤다(통과로 센다)
  problems?: string[];          // FAIL 일 때만. 사람 말 한 줄씩, 많아야 5개
}

export interface ExecuteResponse {
  historyId: number;
  status: ItemStatus;
  durationMs: number;
  steps: StepResult[];
  error?: { message: string; stack?: string };
  device?: DeviceInfo;          // android 만. Appium 연결이 열렸을 때 싣는다 (도메인/리포팅 §8.4 「증적 문서 머리말」 · APP-F1-05)
  elementChecks?: ElementCheck[];  // 게임 항목만 · verify.element 가 남긴 줄마다. admin 이 game_element.server_value · checked_run 과 run_item.element_checks 에 쓴다 (GAME-F1-09 · WEB-F7-24)
  apiCalls?: ApiCallSeen[];     // 게임 항목만 · 케이스가 부른 대상 서버 API. android 는 trace 가 없어 이 칸으로 서비스 지도의 케이스 줄을 채운다 (GAME-F1-09)
  fps?: FpsSample[];            // 게임 정식 실행 항목만 · 러너가 1초마다 읽은 FPS. 하나도 못 읽었으면 키가 없다. admin 이 run_item.fps 에 쓴다 (WEB-F7-25)
}

export interface FpsSample {
  seq: number;                  // 읽은 때 돌던 절차 번호 — 화면이 시간축 단계 칸에 맞춰 그린다
  fps: number | null;           // 그 1초의 FPS. 못 읽은 초는 null
}

export interface ElementCheck {
  key: string;                  // 게임 요소 열쇠 'item:sword_long'
  serverValue: unknown;         // 서버가 준 값
  same: boolean;                // 케이스 기대값(기획서)과 같았나
}

export interface ApiCallSeen {  // 값 · 본문은 싣지 않는다
  method: string;               // 'POST'
  path: string;                 // 대상 서버 주소 기준 경로, 물음표 뒤는 빼고 번호 칸은 틀로 접는다 '/admin/players/:n'
  status: number;
}

// 앱 항목을 돌린 폰과 앱의 판. 못 읽은 칸은 null 이다 — 지어내지 않는다
export interface DeviceInfo {
  model: string | null;         // 기기 모델 (예: SM-G996N)
  osVersion: string | null;     // Android 판 (예: 14)
  appVersion: string | null;    // 앱 versionName. Appium 을 adb_shell 허용으로 켰을 때만 읽힌다
  // 앱 versionCode — 빌드마다 바뀌어 실행의 빌드 번호와 견준다(versionName 은 빌드마다 안 바뀌는 일이 많다). 이 칸 전 기록에는 없다 (도메인/실행 §3.11)
  appBuild?: string | null;
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
      skipSteps: string[];                         // 건너뛸 「만들기」 절차 제목. 비면 전부 돈다
      carryOver?: boolean;                         // 넘겨받기. 없으면 true. false 면 skipSteps · links 가 비어야 한다 (결정 12)
      links?: ScenarioLink[] }                     // 이어 주기. 비면 없다 (결정 12)
  | { kind: 'api'; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string;   // '/' 로 시작. baseUrl 기준
      body?: unknown; expectStatus: number;
      service?: string;                            // 부를 애플리케이션 접두사. 없으면 시나리오 서비스. 같은 프로젝트만 (결정 13)
      auth?: string;                               // 그 단계 애플리케이션 대상 서버의 API 인증 이름. 없으면 쿠키만 간다 (결정 14)
      values?: ScenarioApiValue[];                 // 값 주입 — path · body 의 {name} 자리에 앞 단계 응답 값을 넣는다
      expectJson?: ScenarioJsonCheck[] }           // 응답 값 확인 — 응답 JSON 한 자리가 그 값과 같아야 한다
  | { kind: 'mock'; urlPattern: string; status: number; contentType: string; body: string }  // urlPattern 은 Playwright glob
  | { kind: 'unmock'; urlPattern: string }         // 같은 글자로 건 mock 을 푼다
  | { kind: 'wait'; ms: number };                  // 60000 까지

// 이어 주기 중 조립하는 사람이 거는 넷. 무엇을 · 언제만 거는지는 도메인/시나리오 §3.7 결정 12 표가 정본이다 (2026-10-06)
export type ScenarioLink =
  | { kind: 'reuse'; method: ScenarioMethod; urlPattern: string; fromSeq: number }   // 앞 응답 돌려주기
  | { kind: 'block'; method: ScenarioMethod; urlPattern: string }                    // 요청 막기. 200 {} 를 준다
  | { kind: 'rewrite'; method: ScenarioMethod; urlPattern: string;                   // 바꿔 보내기. 본문은 그대로
      to: { method: 'PUT' | 'PATCH'; path: string; value: ScenarioResponseRef } }   // path 의 {} 자리에 value
  | { kind: 'bind'; param: string; value: ScenarioResponseRef };                      // 값 꽂기. params 의 그 칸

export type ScenarioMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ScenarioApiValue {                // API 호출 단계의 값 주입 하나 (결정 14)
  name: string;                                    // path · body 의 {name} 자리. 영문 · 숫자 · 한글 · _ 1~20자
  value: ScenarioResponseRef;
}

export interface ScenarioJsonCheck {               // API 호출 단계의 응답 값 확인 하나 (결정 14)
  jsonPath: string;                                // 응답 JSON 본문의 점 표기 경로. 'items.0.title'
  equals: unknown;                                 // JSON 값. 형까지 같아야 한다
}

export interface ScenarioResponseRef {             // 앞 부품이 받은 응답에서 값 하나
  fromSeq: number;                                 // 자기보다 앞의 case 부품. API 호출 단계의 값 주입은 앞의 api 부품도 된다 (결정 14)
  method: ScenarioMethod;
  urlPattern: string;                              // 그 부품에서 이 무늬에 처음 맞은 응답
  jsonPath: string;                                // 응답 JSON 본문의 점 표기 경로. 'data.id'
}

export interface ScenarioExecuteRequest {          // POST /execute-scenario (도메인/러너 §5.2)
  runId: number | null;                            // null 이면 시험 실행. 기록이 없다
  trialId?: string;                                // 시험 실행일 때만. admin 이 만든 UUID
  platform: Platform;                              // android 는 Android 앱 · 게임이 시작 애플리케이션일 때. 웹 단계는 그때 PC 창으로 돈다 (도메인/시나리오 §3.7 결정 16)
  // 아래 다섯은 앱 · 게임 단계가 있을 때만 — 폰 연결이 시나리오에 하나라 요청에 한 벌이다. 뜻은 ExecuteRequest 의 같은 이름 칸과 같다 (결정 16)
  app?: string;
  udid?: string;
  farmToken?: string;
  engine?: 'GAME';
  adminKey?: { header: string; value: string };   // 게임 단계 케이스에만 넘긴다. 부품 기록 · 결과에 안 넣는다
  baseUrl: string;
  parts: Array<ScenarioPart & { filePath?: string; baseUrl?: string; apiAuths?: ApiAuth[]; apiDoc?: ApiDocRef; appStep?: boolean }>;   // case 부품에만 filePath 를 admin 이 채워 보낸다.
                                                   // baseUrl 은 case · api 부품이 돌 주소 — 시작 애플리케이션이 아닌 단계에만 붙는다. 없으면 위 baseUrl (결정 13)
                                                   // apiAuths 는 API 애플리케이션 case 부품과 auth 를 단 api 부품에만 — 그 애플리케이션 · 짝지은 대상 서버의 인증. 부품 기록에는 안 넣는다 (도메인/API §3.8)
                                                   // apiDoc 은 그 case 부품 케이스가 만들어진 판. apiAuths 와 같이 부품 기록에는 안 넣는다
                                                   // appStep 은 앱 · 게임 단계인 case 부품에만 true — admin 이 애플리케이션 종류로 정한다. 그 단계는 창 대신 폰 연결로 돈다 (결정 16)
  timeoutMs: number;
  deleteStatuses?: ScenarioDeleteStatus[];         // 미룬 삭제에 줄 응답 코드. 없는 주소는 204 (도메인/시나리오 §3.7 결정 12)
  recordHar?: { jobId: number };                   // 성능 시나리오 녹화 — ExecuteRequest.recordHar 와 같다. 시나리오는 runId null
}

export interface ScenarioDeleteStatus {            // 정식 실행에서 본 그 서비스의 DELETE 성공 코드 — 서비스 지도 service_api.ok_status
  host: string;                                    // 포트까지
  path: string;                                    // 주소 틀 — 숫자 칸 :n · uuid · 긴 16진 칸 :id
  status: number;                                  // 200 ~ 299
}

export interface ScenarioPartResult {
  seq: number;                                     // 1부터. 부품 순서
  status: ItemStatus;                              // 안 돈 부품은 NA + error.message 'NOT_RUN'
  durationMs: number;
  steps: StepResult[];                             // case 부품만 찬다. 순번은 시나리오 전체에서 이어진다
  mocks: string[];                                 // 이 부품이 도는 동안 걸려 있던 mock 의 urlPattern
  bound?: Record<string, unknown>;                 // 값 꽂기로 넣은 값 (결정 12). API 호출 단계는 값 주입으로 넣은 값 (결정 14)
  error?: { message: string; stack?: string };
}

export interface ScenarioExecuteResponse {
  status: ItemStatus;                              // 부품이 전부 PASS 일 때만 PASS. 뒷정리 결과는 판정에 안 든다
  durationMs: number;
  parts: ScenarioPartResult[];
  cleanup?: ScenarioCleanup[];                     // 시나리오 끝에 보낸 미룬 삭제, 보낸 순서대로. 제한 시간에 끊기면 없다 (결정 12)
  device?: DeviceInfo;                             // 앱 · 게임 단계가 있고 폰 연결이 열렸을 때. 연결이 하나라 시나리오에 한 벌이다 (결정 16)
  error?: { message: string; stack?: string };     // TIMEOUT · 러너 고장
}

export interface ScenarioCleanup {
  fromSeq: number;                                 // 삭제를 미룬 부품
  method: 'DELETE';
  url: string;
  status?: number;                                 // 응답 코드. 못 보냈으면 없고 error 가 찬다
  error?: string;
}

// 표준 기획서 — 서버 · 화면 · 작성 에이전트가 같은 모양을 쓴다. 무엇이고 왜인지는 SPEC 도메인/작성 §3.6 「★ 표준 기획서」
export type PrdStatus = 'CONFIRMED' | 'NEEDS_CHECK';   // 확정 · 확인 필요. 확정은 사람이 판단한 것만이다

export interface PrdBasis {
  from: string;                                    // 자료 이름. 화면에서 본 것이면 '화면'
  ref?: string;                                    // 원본 번호('REQ-HOME-001') 또는 화면 주소. 없으면 키가 없다
  quote: string;                                   // 원본 문장 그대로
}

export interface PrdItem {
  reqId: string;                                   // '<접두사>-REQ-<3자리>' — 고정. 지운 번호는 다시 안 준다
  feature: string;                                 // 기능 묶음
  text: string;                                    // 요구 문장 — 규칙 하나. 숫자 · 조건 낱말은 원본 글자 그대로
  basis: PrdBasis[];                               // 근거 — 하나 이상. 문서끼리 다르면 둘 다
  status: PrdStatus;
  checkSince?: string;                             // 확인 필요가 된 때(ISO). 확인 필요인 동안 물려받고 확정이면 키가 없다
  byPerson?: true;                                 // 사람이 마지막으로 고친 항목 — 옮기기가 덮지 않는다
  fromIssues?: string[];                           // BTS 이슈 키('DM-12'). PRD 초안에서 온 항목만 · 다음 초안이 같은 항목을 고치면 키를 더한다
}

// 서비스 가이드 — 서버 · 화면 · 작성 에이전트가 같은 모양을 쓴다. 무엇이고 왜인지는 SPEC 도메인/작성 §3.6 「★ 서비스 가이드」
export type GuideSection = 'intro' | 'policy' | 'rules';   // 서비스 소개 · 정책 · 프로젝트 규칙

export interface GuideFile {
  id: number;
  name: string;                 // 사람이 준 파일 이름
  size: number;                 // 바이트
  section: GuideSection;
  uploadedAt: string;           // ISO
  uploadedByName: string;
}

export interface ServiceGuide {
  version: number;              // 0 이면 가이드가 아직 없다
  intro: string;
  policy: string;
  rules: string;
  files: GuideFile[];           // 올린 차례
  savedAt: string | null;       // 판 0 이면 null
  savedByName: string | null;
}

export interface GuideVersionRow {
  version: number;
  savedAt: string;
  savedByName: string;
  changed: {
    sections: GuideSection[];                               // 글이 바뀐 구획
    added: { name: string; section: GuideSection }[];       // 더한 파일
    removed: { name: string; section: GuideSection }[];     // 뺀 파일
  };
}
