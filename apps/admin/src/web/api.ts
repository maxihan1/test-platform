// Admin API 호출 한 곳 (SPEC §7). 응답 모양은 WS-A·WS-B가 실제로 내보내는 것을 그대로 옮겼다
// 목 데이터는 두지 않는다 — 개발 서버도 /api를 진짜 admin으로 프록시한다 (vite.config.ts)

import type { ItemStatus, JsonSchema, Platform, RunningStep, StepResult } from '@platform/kit';

import type { 등급 } from './role.js';

export type { ItemStatus, JsonSchema, Platform, RunningStep, StepResult };

export interface Paged<T> {
  items: T[];
  /**
   * 총건수.
   *
   * SPEC §8.1 은 이것을 **안내로만** 쓰고 다음 페이지가 있는지는 응답이 주는 값으로
   * 판단하라고 한다. **아직 그렇게 안 되어 있다** — `CaseList` 와 `RunList` 가
   * 이 값으로 페이지 수를 계산한다. 킥오프 2·14 로 ② 덩이에서 고친다.
   * 그때 쓸 값이 아래 `totalIsExact` 다
   */
  total: number;
  /** 총건수가 정확한 값인가. 근사치가 되는 날 빈 페이지가 생기지 않게 한다 (SPEC §7) */
  totalIsExact?: boolean;
  page: number;
  pageSize: number;
}

export interface CaseRow {
  tcId: string;
  name: string;
  platforms: Platform[];
  precondition: string[];
  filePath: string;
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
  isActive: boolean;
  scannedAt: string;
  /** 미확정 사유와 처음 미확정이 된 시각 (도메인/카탈로그 §3.1). 없으면 확정 케이스다 */
  unconfirmed?: string | null;
  unconfirmedSince?: string | null;
}

/** 케이스 목록 응답. 머리의 미확정 요약은 검색 조건을 안 따른다 — 서비스 전체다 (도메인/카탈로그 §7) */
export interface CasePage extends Paged<CaseRow> {
  unconfirmed?: { count: number; oldestSince: string | null };
}

export interface LastScan {
  scannedAt: string;
  added: number;
  updated: number;
  deactivated: number;
  duplicates: { tcId: string; files: [string, string] }[];
  error?: string;
}

export interface LastResult {
  tcId: string;
  platform: Platform;
  status: ItemStatus;
  historyId: number;
  runId: number;
  durationMs: number | null;
  finishedAt: string;
  /** 최근 판정, 새 것부터. 맨 앞은 늘 위 `status` 와 같다 — 줄의 흐름 막대가 읽는다 (SPEC §8.1) */
  recent: ItemStatus[];
}

export interface RunSummary {
  runId: number;
  title: string;
  triggeredBy: string;
  // 그때의 이름을 박제한 값. 비면 '실행자 미상 (인증 도입 이전)' 으로 쓴다 (SPEC §3.5 · §8.7)
  triggeredByName: string | null;
  env: string;
  // 그날 실제로 친 주소와 그때의 서비스 이름 (SPEC §6 · §8.3 RUN 머리)
  baseUrl: string;
  serviceName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  counts: RunCounts;
}

/**
 * 실행 집계 (도메인/실행 §7). pass·fail·na 는 **확정 항목만**이고 미확정은 `unconfirmed` 에서 따로 센다 (§3.2).
 * `unconfirmed` 를 선택으로 둔 것은 이 칸을 모르는 기존 화면 검사의 가짜 응답을 안 고치려고다 — 없으면 미확정 0 으로 읽는다
 */
export interface RunCounts {
  total: number;
  pass: number;
  fail: number;
  na: number;
  running: number;
  unconfirmed?: { total: number; pass: number; fail: number; na: number };
}

// 그 실행으로 만든 증적 문서 (SPEC §7 · §8.4). status 는 PENDING | READY | FAILED
export interface EvidenceRow {
  id: number;
  format: string;
  status: string;
  /** PENDING·FAILED 면 아직 파일이 없다 */
  filePath: string | null;
  error: string | null;
  generatedAt: string;
}

/** 직전 실행과 견줘 케이스마다 무엇이 달라졌는가 (SPEC §7 `/runs/:runId/insights`) */
export type 변화 = '새로깨짐' | '계속깨짐' | '고쳐짐' | '그대로';

/** 이번 실행의 실패를 같은 사유끼리 묶은 것. 견줄 앞 실행이 없어도 온다 */
export interface 실패덩어리 {
  대표문장: string;
  건수: number;
  항목들: { historyId: number; tcId: string; tcName: string; platform: Platform }[];
}

// 서버의 reporting/insights.ts 가 내는 `비교` 와 같은 모양이다. **그쪽에서 import 하지 않는다** —
// web 이 reporting 컨텍스트를 직접 가져오면 경계가 무너진다 (spec-review C2). 다른 응답도 같은 방식이다
export interface RunInsights {
  previous: { runId: number; startedAt: string } | null;
  /** 같은 env 뒤의 주소를 설정 화면에서 바꿨으면 사실은 다른 서버다. 막지 않고 사실만 알린다 */
  주소바뀜: boolean;
  /** 앞 실행에는 있었고 이번에 없는 (케이스, 디바이스)의 수 */
  빠진건수: number;
  케이스들: { tcId: string; tcName: string; platform: Platform; 판정: 변화 }[];
  실패덩어리들: 실패덩어리[];
}

export interface RunItemSummary {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  // 같은 케이스×디바이스를 몇 번째로 돌렸는지. 회차 요약이 이 값으로 센다 (SPEC §8.3)
  attempt: number;
  // 목록의 「어떤 값으로 돌린 결과인가」 한 줄이 쓴다 (SPEC §8.3).
  // §8.1 의 「JSON 원문을 목록에 노출하지 않는다」는 케이스 목록 규칙이라 여기엔 적용되지 않는다
  params: Record<string, unknown>;
  paramSchema: JsonSchema;
  status: ItemStatus;
  durationMs: number | null;
  error: { message: string; stack?: string } | null;
  startedAt: string;
  finishedAt: string | null;
  /** 실행 때 박제한 미확정 사유. 지금의 케이스를 읽으면 확정된 뒤 옛 실행이 바뀌어 보인다 (도메인/실행 §8.3) */
  unconfirmed?: string | null;
}

/**
 * 러너가 지금 어느 절차에 서 있는지. `timeoutMs` 는 러너가 아니라 admin 이 붙인다 —
 * 절차 경과만으로는 「느린 것」과 「멈춘 것」을 가를 수 없어 화면이 견줄 상한이 같이 와야 한다
 */
export type 항목진행 = RunningStep & { timeoutMs: number };

export interface RunItemDetail extends RunItemSummary {
  runId: number;
  runTitle: string;
  precondition: string[];
  expected: Record<string, unknown>;
  // 기대결과 칸의 라벨. 카탈로그가 아니라 이것을 읽는다 (SPEC §3.3).
  // params·paramSchema 는 RunItemSummary 에 있다 — 목록도 같은 값을 쓴다
  expectedSchema: JsonSchema;
  steps: StepResult[];
}

/** 케이스 한 건의 실행 이력 한 줄 (SPEC §7 `GET /api/cases/:tcId/history`) */
/** 실행 기록 화면 머리의 집계 (SPEC §8.7). **거르개를 건 뒤의 집합**을 센다 */
export interface RunTally {
  runs: number;
  allPass: number;
  hasFail: number;
  /** 평균을 낸 실행 수. 도는 실행은 소요가 없어 빠진다 */
  durationOf: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

/** 실행 목록을 좁히는 조건 (SPEC §8.7). **화면이 거르지 않는다** — 쪽으로 나뉘어 오기 때문이다 */
export interface RunQuery {
  q?: string;
  state?: 'running' | 'failed';
  env?: string;
}

export interface HistoryRow {
  historyId: number;
  runId: number;
  runTitle: string;
  platform: Platform;
  status: ItemStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ParamSetRow {
  id: number;
  tcId: string;
  name: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  createdAt: string;
}

export interface Violation {
  path: string;
  message: string;
}

export interface EnvRow {
  env: string;
  baseUrl: string;
  /**
   * 대상 서버의 테스트 계정 (도메인/인증 §7 「envs[] 한 줄」). 설정 화면만 받는다 — `/auth/me` 에는 안 온다.
   * 비밀번호 원문은 오지 않고 설정됐는지만 온다
   */
  loginId?: string | null;
  hasLoginPassword?: boolean;
}

/**
 * 설정 저장 때 보내는 한 줄. 계정 칸은 **키를 안 보내면 서버가 지금 것을 유지**하고 null·빈 글자면 지운다 (도메인/인증 §7).
 * 비밀번호는 화면이 받은 적이 없으니 새로 넣을 때만 싣는다
 */
export interface EnvInput {
  env: string;
  baseUrl: string;
  loginId?: string | null;
  loginPassword?: string | null;
}

// 맨 위 띠의 서비스 목록이 이것이다. 배정받은 것만 온다 (SPEC §7 · §8)
export interface ServiceRow {
  id: number;
  prefix: string;
  name: string;
  color: string;
  /** 실행 설정의 대상 서버 드롭다운이 읽는다. 화면이 이 값을 받을 통로가 여기뿐이다 (SPEC §8.2) */
  envs: EnvRow[];
  /** Slack 칸을 그릴지. 주소 자체는 오지 않는다 (SPEC §7) */
  hasSlackWebhook: boolean;
  /** 케이스 폴더 이름. 선택으로 둔 건 기존 화면 검사의 가짜 응답이 이 값을 안 담아서다 */
  testsDir?: string;
}

export interface User {
  username: string;
  displayName: string;
  role: 등급;
  services: ServiceRow[];
}

/**
 * 설정 화면이 보는 서비스 (SPEC §7 `/settings/services` · §8.8).
 *
 * 띠의 `ServiceRow` 와 다르다 — 그쪽은 **배정받은 것만** 오고 여기는 **전부** 온다.
 * 비활성까지 포함한다. 설정 화면은 내려 둔 것도 봐야 다시 올릴 수 있다.
 */
export interface SettingsServiceRow extends ServiceRow {
  /**
   * 토큰 칸을 「설정됨」으로 그릴지. 토큰 자체는 오지 않는다 (도메인/인증 §8.8).
   * 서버는 늘 싣는다. 선택으로 둔 것은 이 칸을 모르는 기존 화면 검사의 가짜 행을 안 고치려고다 — 없으면 「안 넣음」으로 읽는다
   */
  hasFigmaToken?: boolean;
  testsRepo: string;
  /** 플랫폼이 실제로 훑을 폴더. 서비스마다 저장소가 다르다 (SPEC §9.2) */
  testsDir: string;
  isActive: boolean;
  caseCount: number;
}

/** 설정 화면이 보는 계정 (SPEC §7 `/settings/users` · §8.8). `services` 는 접두사 목록이다 */
/**
 * 작성 대기줄의 한 줄 (SPEC §7 · 공통/4-데이터모델 §6).
 *
 * 서버 `authoring/store.ts` 의 `요청` 과 같은 모양이다 — 거기가 정본이고 여기는 화면이 읽는 쪽이다.
 * 화면이 안 쓰는 칸(기획서 본문·소스 스냅샷·사진 폴더)은 싣지 않는다.
 */
export interface AuthoringRow {
  id: number;
  kind: 'AUTHOR' | 'RERUN' | 'MERGE';
  sourceId: number | null;
  /** DRAFT 는 자료를 올리는 중 — 아직 줄에 안 섰다 (도메인/작성 §7 「자료」) */
  status: 'DRAFT' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  stage: string | null;
  /** 그 한 줄이 마지막으로 바뀐 시각. **「도는 중」과 「거기서 맥이 죽었다」를 가른다** */
  stageAt: string | null;
  requestedByName: string;
  claimedBy: string | null;
  prUrl: string | null;
  error: string | null;
  createdAt: string;
  /** 맥이 집어 간 시각. 단계를 한 번도 안 올렸을 때 「멈췄나」를 재는 기준이 된다 */
  startedAt: string | null;
  finishedAt: string | null;
  /** 상세 응답에만 온다. 목록에는 없다 */
  assets?: AuthoringAsset[];
  /**
   * 역방향 칸 (도메인/작성 §3.6 「★ 역방향」). 계정은 오지 않는다 — 집기 응답에만 있다.
   * 선택으로 둔 것은 이 칸을 모르는 기존 화면 검사의 가짜 행을 안 고치려고다. 서버는 늘 싣는다
   */
  compare?: boolean;
  env?: string | null;
  startUrl?: string | null;
  /** 끝내기가 실은 결과. 모양을 서버가 검사하지 않는다 — 읽는 쪽이 방어한다 (`authoringView.ts` 의 `차이목록`) */
  result?: unknown;
}

/** 작성 요청의 자료 한 건. 피그마 자료의 `name` 은 정규화한 주소다 (도메인/작성 §7 「자료」) */
export interface AuthoringAsset {
  id: number;
  position: number;
  kind: 'FILE' | 'FIGMA';
  name: string;
  figmaUrl: string | null;
  size: number | null;
  /** 사람이 넣은 입력인지 에이전트 산출물인지. 없으면 입력이다(옛 가짜 행) */
  role?: 'INPUT' | 'MARKED' | 'REVERSE_SPEC';
  /** 표시 사본(MARKED)이 어느 입력의 사본인지 */
  sourceAssetId?: number | null;
}

export interface UserRow {
  username: string;
  displayName: string;
  role: 등급;
  isActive: boolean;
  services: string[];
  // 옛 검사 fixture 가 이 둘 없이 UserRow 를 만든다. 서버는 늘 보낸다 — 없으면 false 로 읽는다
  hasAgentToken?: boolean;
  /** 서버 환경변수 AUTHORING_AGENT_USER 가 가리키는 계정만 true. 토큰은 이 계정만 가진다 */
  isAuthoringAgent?: boolean;
}

export interface SourceExcerpt {
  lines: { no: number; text: string }[];
  focus: number;
}

export interface RunRequestItem {
  tcId: string;
  platforms: Platform[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs?: number;
}

// 서버가 칸별 사유를 돌려준 것(400 INVALID_PARAMS)과 진짜 고장을 갈라야
// 화면이 오류를 칸 아래에 붙일지 위에 붙일지 정할 수 있다 (SPEC §8.2)
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly violations: Violation[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: string;
  detail?: string;
  // 문이 등급 부족을 알릴 때 필요한 등급을 여기 싣는다 (gate.ts 의 FORBIDDEN).
  // 안 읽으면 화면이 아래 기본 문구를 등급 이름으로 착각해 헛문장을 낸다 (2026-09-19 실측)
  need?: string;
  message?: string;
  violations?: Violation[];
}

/** 세션이 끊겼을 때 돌아올 자리. 로그인이 끝나면 여기로 돌려보낸다 (SPEC §8.6) */
const 돌아갈자리키 = '돌아갈자리';

// 인증 세 통로는 401 이 정상 답이라 가로채지 않는다.
// 로그인 — 가로채면 로그인 화면에서 또 로그인 화면으로 보내는 무한이 된다
// 나는 누구인가 — 처음 열 때의 401 이 사고처럼 보인다
// 나가기 — 이미 끊긴 세션으로 나가면 돌아갈 자리가 남아 다음 로그인이 엉뚱한 화면으로 간다
const 끊김을가로채지않는곳 = ['/auth/login', '/auth/me', '/auth/logout'];

// 세션이 끊겼다고 화면에 알리는 자리.
// **주소만 바꾸면 안 된다** — 화면은 「로그인했다」를 자기 상태로 들고 있어서
// 해시가 #/login 이 되어도 그 상태가 그대로면 곧장 집으로 되돌려 버린다.
// 그러면 로그인 화면이 끝내 안 뜨고 사람은 옛 화면에 갇힌다
let 세션끊김: (() => void) | null = null;

export function 세션끊김을받는다(fn: () => void): void {
  세션끊김 = fn;
}

export function 돌아갈자리를꺼낸다(): string | null {
  try {
    const 값 = sessionStorage.getItem(돌아갈자리키);
    if (값 !== null) sessionStorage.removeItem(돌아갈자리키);
    return 값;
  } catch {
    // 브라우저가 저장을 막아도 로그인 자체는 되어야 한다
    return null;
  }
}

/**
 * 세션이 도중에 끊기면 로그인 화면으로 보낸다.
 *
 * `auth/identify.ts` 가 세션이 살아 있어도 계정이 비활성이면 그 자리에서 끊는다.
 * 여기서 안 받으면 화면은 「요청이 실패했다 (401)」 빨간 글자만 띄우고 멈춘다 —
 * 새로고침해도 같아서 사람이 도구가 고장난 줄 안다.
 *
 * 화면 다섯 곳에 각각 넣지 않는다. call() 이 모든 요청의 길목이다.
 */
function 로그인으로보낸다(): void {
  try {
    // 화면 하나가 요청 셋을 동시에 보낸다 (케이스 목록이 cases·scan·last-by-case).
    // 먼저 온 401 이 이미 자리를 적었으면 덮어쓰지 않는다 —
    // 덮어쓰면 뒤에 온 것이 '#/login' 을 적어 원래 가려던 화면을 잃는다
    if (location.hash !== '#/login' && sessionStorage.getItem(돌아갈자리키) === null) {
      sessionStorage.setItem(돌아갈자리키, location.hash);
    }
  } catch {
    // 저장이 막혀도 로그인 화면으로는 보낸다. 돌아갈 자리를 잃을 뿐이다
  }
  location.hash = '#/login';
  세션끊김?.();
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);

  if (res.status === 401 && !끊김을가로채지않는곳.some((열린곳) => path.startsWith(열린곳))) {
    로그인으로보낸다();
  }

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // 본문이 JSON이 아니면 상태 코드만으로 알린다
    }
    throw new ApiError(
      res.status,
      body.error ?? String(res.status),
      // 여기서 한국어를 지어내지 않는다. 비워 두면 `errorText.ts` 가 번역된 폴백 문장을 낸다 —
      // 통신 계층이 화면 글자를 만들면 그 문장만 영어로 안 바뀐다
      body.detail ?? body.need ?? body.message ?? '',
      body.violations ?? [],
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export interface CaseQuery {
  /** 맨 위 띠에서 고른 서비스의 접두사. 서버가 늘 적용한다 — 검색 조건이 아니다 (SPEC §8 · §8.1) */
  service: string;
  q?: string;
  platform?: Platform;
  /** 생략하면 활성만. 비활성 케이스는 기본으로 감춘다 (SPEC §8.1) */
  active?: boolean;
  page?: number;
}

export const api = {
  login: (username: string, password: string) =>
    call<{ user: User }>('/auth/login', json({ username, password })),

  logout: () => call<void>('/auth/logout', { method: 'POST' }),

  me: () => call<{ user: User }>('/auth/me'),

  cases: (query: CaseQuery) => {
    const params = new URLSearchParams({ service: query.service, page: String(query.page ?? 1) });
    if (query.q !== undefined && query.q !== '') params.set('q', query.q);
    if (query.platform !== undefined) params.set('platform', query.platform);
    if (query.active === false) params.set('active', 'false');
    return call<CasePage>(`/catalog/cases?${params.toString()}`);
  },

  caseOf: (tcId: string) => call<CaseRow>(`/catalog/cases/${encodeURIComponent(tcId)}`),

  lastScan: () => call<LastScan | null>('/catalog/scan'),

  rescan: () => call<LastScan>('/catalog/scan', { method: 'POST' }),

  source: (tcId: string, line: number) =>
    call<SourceExcerpt>(`/cases/${encodeURIComponent(tcId)}/source?line=${line}`),

  lastByCase: () => call<{ items: LastResult[] }>('/runs/last-by-case'),

  /**
   * 케이스 한 건의 이력 (SPEC §7).
   *
   * **목록이 부르지 않는다.** 사람이 상세를 폈을 때만 부른다 —
   * 목록에서 케이스마다 부르면 §8.1 의 「이력을 따로 부르지 않는다」를 어긴다
   */
  caseHistory: (tcId: string) => call<Paged<HistoryRow>>(`/cases/${encodeURIComponent(tcId)}/history`),

  runs: (service: string, page: number, 조건: RunQuery = {}) => {
    const params = new URLSearchParams({ service, page: String(page) });
    if (조건.q !== undefined && 조건.q !== '') params.set('q', 조건.q);
    if (조건.state !== undefined) params.set('state', 조건.state);
    if (조건.env !== undefined && 조건.env !== '') params.set('env', 조건.env);
    return call<Paged<RunSummary> & { summary: RunTally }>(`/runs?${params.toString()}`);
  },

  run: (runId: number) =>
    call<RunSummary & { items: RunItemSummary[]; evidence: EvidenceRow[] }>(`/runs/${runId}`),

  /** 직전 실행과 견준 결과. 실행 상세 응답과 별개의 조회다 (SPEC §7) */
  insights: (runId: number) => call<RunInsights>(`/runs/${runId}/insights`),

  /** 지금 도는 절차들. 상세 조회와 별개다 — 상세는 DB 를, 이쪽은 러너의 지금을 본다 (SPEC §7) */
  progress: (runId: number) => call<{ items: 항목진행[] }>(`/runs/${runId}/progress`),

  /** 증적을 만든다. 실행까지 등급부터다 (SPEC §3.5) */
  makeEvidence: (runId: number, format: string) =>
    call<EvidenceRow>(`/runs/${runId}/evidence`, json({ format })),

  /** 만든 문서를 받는 주소. 받기는 보기만 등급도 할 수 있다 (SPEC §3.5) */
  evidenceUrl: (id: number) => `/api/evidence/${id}`,

  item: (runId: number, historyId: number) => call<RunItemDetail>(`/runs/${runId}/items/${historyId}`),

  createRun: (body: {
    title: string;
    /** 대상 서버 키. **기본값을 두지 않는다** — 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §8.2) */
    env: string;
    /** 회차 수. 요청 최상위에 하나다 (SPEC §3.2) */
    repeat?: number;
    /** 끝났을 때 Slack 으로 알릴지. 기본 꺼짐 (SPEC §8.9) */
    notifySlack?: boolean;
    items: RunRequestItem[];
    // 실행자는 싣지 않는다. 로그인한 세션에서 서버가 채운다 —
    // 보내는 쪽이 정할 수 있으면 아무 이름이나 적을 수 있어 증적이 증적이 아니게 된다 (SPEC §3.5)
  }) => call<{ runId: number }>('/runs', json(body)),

  /** 대기 중인 것과 돌고 있는 것을 둘 다 끊는다 (SPEC §8.3) */
  abortRun: (runId: number) => call<{ aborted: number }>(`/runs/${runId}/abort`, { method: 'POST' }),

  paramSets: (tcId: string) => call<{ items: ParamSetRow[] }>(`/cases/${encodeURIComponent(tcId)}/param-sets`),

  saveParamSet: (tcId: string, body: { name: string; params: Record<string, unknown>; expected: Record<string, unknown> }) =>
    call<ParamSetRow>(`/cases/${encodeURIComponent(tcId)}/param-sets`, json(body)),

  deleteParamSet: (id: number) => call<void>(`/param-sets/${id}`, { method: 'DELETE' }),

  screenshot: (runId: number, historyId: number, seq: number) => `/api/screenshots/${runId}/${historyId}/${seq}.png`,

  // 작성 대기줄 (SPEC §7 · 도메인/작성 §7). 넣기·읽기는 화면이 부르고
  // 집기·단계·끝내기는 맥이 부른다 — 화면은 그 넷을 안 부른다
  authoringRequests: (service: string, page: number) =>
    call<{ items: AuthoringRow[]; total: number; page: number; pageSize: number }>(
      `/authoring/requests?service=${encodeURIComponent(service)}&page=${page}`,
    ),

  authoringRequest: (service: string, id: number) =>
    call<AuthoringRow>(`/authoring/requests/${id}?service=${encodeURIComponent(service)}`),

  /**
   * 요청자는 싣지 않는다. 로그인한 세션에서 서버가 채운다 (도메인/작성 §7).
   * AUTHOR 는 DRAFT 로 선다 — 파일을 다 올린 뒤 `submitAuthoringRequest` 로 줄에 세운다
   */
  createAuthoringRequest: (
    service: string,
    body:
      | { kind: 'AUTHOR'; figma: string[]; compare?: true; env?: string; startUrl?: string }
      | { kind: 'RERUN'; sourceId: number },
  ) => call<{ id: number }>(`/authoring/requests?service=${encodeURIComponent(service)}`, json(body)),

  /** 파일 바이트를 그대로 보낸다. 이름은 본문에 자리가 없어 주소에 싣는다 */
  uploadAuthoringAsset: (service: string, id: number, file: File) =>
    call<{ id: number }>(
      `/authoring/requests/${id}/assets?service=${encodeURIComponent(service)}&name=${encodeURIComponent(file.name)}`,
      { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file },
    ),

  /** 본문이 없다. JSON 머리글을 달면 서버가 빈 JSON 이라며 400 을 낸다 — 그래서 json() 을 안 쓴다 */
  submitAuthoringRequest: (service: string, id: number) =>
    call<{ ok: true }>(`/authoring/requests/${id}/submit?service=${encodeURIComponent(service)}`, {
      method: 'POST',
    }),

  authoringAssetUrl: (id: number, assetId: number) => `/api/authoring/requests/${id}/assets/${assetId}`,

  /**
   * 머지를 줄에 세운다 — **운영 등급만**.
   *
   * 경로가 갈린 이유는 등급 때문이다. 같은 경로에 `kind: 'MERGE'` 로 얹으면 등급이
   * **본문 값**에 따라 갈려야 하고, 그러려면 문이 본문을 읽어야 한다 (도메인/작성 §7).
   */
  createAuthoringMerge: (service: string, sourceId: number) =>
    call<{ id: number }>(`/authoring/merges?service=${encodeURIComponent(service)}`, json({ sourceId })),

  // 설정 (SPEC §7 · §8.8). 전부 운영(admin) 등급만 닿는다 — 서버 auth/gate.ts 가 막는다
  settingsServices: () => call<{ items: SettingsServiceRow[] }>('/settings/services'),

  createService: (body: {
    prefix: string;
    name: string;
    color: string;
    testsRepo: string;
    testsDir: string;
    envs: EnvInput[];
    slackWebhook?: string;
    figmaToken?: string;
  }) => call<{ id: number }>('/settings/services', json(body)),

  /**
   * 서비스를 고친다. **접두사는 안 보낸다** — 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다.
   * `tcId` 안에 이미 박혀 있어 바꾸면 기존 케이스가 어느 서비스 것도 아니게 된다 (SPEC §8.8)
   */
  updateService: (
    id: number,
    body: {
      name?: string;
      color?: string;
      testsRepo?: string;
      testsDir?: string;
      isActive?: boolean;
      envs?: EnvInput[];
      /** 빈 글자를 보내면 알림을 끈다. 안 보내면 지금 것을 그대로 둔다 */
      slackWebhook?: string;
      /** 웹훅과 같다 — 빈 글자는 지우고, 안 보내면 그대로 둔다 */
      figmaToken?: string;
    },
  ) => call<{ ok: true }>(`/settings/services/${id}`, { ...json(body), method: 'PATCH' }),

  settingsUsers: () => call<{ items: UserRow[] }>('/settings/users'),

  /** 임시 비밀번호가 **이 응답에만** 있다. 다음부터는 다시 만들 수만 있다 (SPEC §8.8) */
  createUser: (body: { username: string; displayName: string; role: 등급; services: string[] }) =>
    call<{ username: string; tempPassword: string }>('/settings/users', json(body)),

  updateUser: (
    username: string,
    body: { displayName?: string; role?: 등급; isActive?: boolean; services?: string[] },
  ) =>
    call<{ ok: true }>(`/settings/users/${encodeURIComponent(username)}`, {
      ...json(body),
      method: 'PATCH',
    }),

  resetPassword: (username: string) =>
    call<{ tempPassword: string }>(`/settings/users/${encodeURIComponent(username)}/password`, {
      method: 'POST',
    }),

  /** 토큰이 **이 응답에만** 있다. 다시 발급하면 옛 토큰은 그 자리에서 죽는다 */
  issueAgentToken: (username: string) =>
    call<{ agentToken: string }>(`/settings/users/${encodeURIComponent(username)}/agent-token`, {
      method: 'POST',
    }),

  revokeAgentToken: (username: string) =>
    call<void>(`/settings/users/${encodeURIComponent(username)}/agent-token`, { method: 'DELETE' }),
};
