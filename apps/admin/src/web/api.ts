// Admin API 호출 한 곳 (SPEC §7). 응답 모양은 WS-A·WS-B가 실제로 내보내는 것을 그대로 옮겼다
// 목 데이터는 두지 않는다 — 개발 서버도 /api를 진짜 admin으로 프록시한다 (vite.config.ts)

import type { ItemStatus, JsonSchema, Platform, StepResult } from '@platform/kit';

import type { 등급 } from './role.js';

export type { ItemStatus, JsonSchema, Platform, StepResult };

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
  counts: { total: number; pass: number; fail: number; na: number; running: number };
}

export interface RunItemSummary {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  // 같은 케이스×디바이스를 몇 번째로 돌렸는지. 회차 요약이 이 값으로 센다 (SPEC §8.3)
  attempt: number;
  status: ItemStatus;
  durationMs: number | null;
  error: { message: string; stack?: string } | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunItemDetail extends RunItemSummary {
  runId: number;
  runTitle: string;
  precondition: string[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  // 입력·기대결과 칸의 라벨. 카탈로그가 아니라 이것을 읽는다 (SPEC §3.3)
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
  steps: StepResult[];
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

// 맨 위 띠의 서비스 목록이 이것이다. 배정받은 것만 온다 (SPEC §7 · §8)
export interface ServiceRow {
  id: number;
  prefix: string;
  name: string;
  color: string;
}

export interface User {
  username: string;
  displayName: string;
  role: 등급;
  services: ServiceRow[];
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
      body.detail ?? body.message ?? `요청이 실패했다 (${res.status})`,
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
    return call<Paged<CaseRow>>(`/catalog/cases?${params.toString()}`);
  },

  caseOf: (tcId: string) => call<CaseRow>(`/catalog/cases/${encodeURIComponent(tcId)}`),

  lastScan: () => call<LastScan | null>('/catalog/scan'),

  rescan: () => call<LastScan>('/catalog/scan', { method: 'POST' }),

  source: (tcId: string, line: number) =>
    call<SourceExcerpt>(`/cases/${encodeURIComponent(tcId)}/source?line=${line}`),

  lastByCase: () => call<{ items: LastResult[] }>('/runs/last-by-case'),

  runs: (service: string, page: number) =>
    call<Paged<RunSummary>>(`/runs?service=${encodeURIComponent(service)}&page=${page}`),

  run: (runId: number) => call<RunSummary & { items: RunItemSummary[] }>(`/runs/${runId}`),

  item: (runId: number, historyId: number) => call<RunItemDetail>(`/runs/${runId}/items/${historyId}`),

  createRun: (body: { title: string; triggeredBy?: string; items: RunRequestItem[] }) =>
    call<{ runId: number }>('/runs', json(body)),

  paramSets: (tcId: string) => call<{ items: ParamSetRow[] }>(`/cases/${encodeURIComponent(tcId)}/param-sets`),

  saveParamSet: (tcId: string, body: { name: string; params: Record<string, unknown>; expected: Record<string, unknown> }) =>
    call<ParamSetRow>(`/cases/${encodeURIComponent(tcId)}/param-sets`, json(body)),

  deleteParamSet: (id: number) => call<void>(`/param-sets/${id}`, { method: 'DELETE' }),

  screenshot: (runId: number, historyId: number, seq: number) => `/api/screenshots/${runId}/${historyId}/${seq}.png`,
};
