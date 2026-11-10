// @vitest-environment jsdom
// 앱 대시보드 화면 검사 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError } from './api.js';
import { Dashboard } from './Dashboard.js';

const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** main.tsx 가 사람의 권한에서 뽑아 넘기는 재료 — 케이스 자리가 있는 사람 */
const 기본재료 = { 케이스갈수있나: true, 설정갈수있나: false, 프로젝트: null };

function 건(pass: number, fail: number, notRun: number) {
  return { pass, fail, notRun };
}

function 응답(고침: Partial<대시보드응답> = {}): 대시보드응답 {
  return {
    window: { tz: 시간대, today: '2026-10-07', days: 14, from: '2026-09-24', previousFrom: '2026-09-10' },
    services: [
      { id: 1, name: 'ZDA 결제' },
      { id: 2, name: 'ZDA 회원' },
    ],
    passRate: { current: 건(174, 20, 6), previous: 건(83, 14, 3) },
    daily: [],
    newFailures: [
      {
        runId: 7,
        serviceId: 1,
        serviceName: 'ZDA 결제',
        env: 'qa',
        kind: 'FN',
        tcId: 'ZDA-001',
        tcName: '카드로 결제한다',
        platform: 'mobile',
        finishedAt: '2026-10-07T05:10:00.000Z',
        reason: '결제 완료 문구가 보이지 않는다',
        type: 'mismatch',
      },
      {
        runId: 6,
        serviceId: 2,
        serviceName: 'ZDA 회원',
        env: 'qa',
        kind: 'UI',
        tcId: 'ZDA-014',
        tcName: '가입 화면이 열린다',
        platform: 'desktop',
        finishedAt: '2026-10-06T05:10:00.000Z',
        reason: null,
        type: 'other',
      },
    ],
    byService: [
      {
        serviceId: 1,
        serviceName: 'ZDA 결제',
        current: 건(40, 5, 0),
        currentUi: 건(0, 0, 0),
        previous: 건(30, 5, 0),
        lastRun: { runId: 7, finishedAt: '2026-10-07T05:10:00.000Z', ...건(8, 2, 0) },
        flow: ['P', 'F', 'N', 'P'],
        newFailureCount: 2,
        resolvedCount: 1,
        compared: true,
      },
      {
        serviceId: 2,
        serviceName: 'ZDA 회원',
        current: 건(47, 5, 3),
        currentUi: 건(0, 0, 0),
        previous: 건(0, 0, 0),
        lastRun: { runId: 6, finishedAt: '2026-10-06T05:10:00.000Z', ...건(9, 0, 0) },
        flow: ['P'],
        newFailureCount: 0,
        resolvedCount: 0,
        compared: false,
      },
    ],
    heatmap: [],
    coverage: [],
    running: [],
    unconfirmed: 0,
    failureTypes: { types: [], stopped: 0 },
    decisions: [],
    byKind: null,
    aiQuality: null,
    project: 요약(),
    ...고침,
  };
}

type 앱 = 대시보드응답['project']['apps'][number];

function 앱하나(serviceId: number, name: string, kind: 앱['kind'], 고침: Partial<앱> = {}): 앱 {
  return {
    serviceId,
    name,
    prefix: `ZD${serviceId}`,
    kind,
    prd: { version: 3, requirements: 10, needsCheck: 2, rtm: { pass: 6, fail: 1, notRun: 1, none: 2 }, axis: { normal: 5, error: 3, ui: 2, boundary: 1 } },
    cases: { fn: 8, ui: 2 },
    last: 건(8, 1, 1),
    scenarios: 1,
    extra: { pageLcp: { url: '/cart', ms: 312 }, fps: null, p95Ms: null },
    ...고침,
  };
}

function 요약(고침: Partial<대시보드응답['project']> = {}): 대시보드응답['project'] {
  return {
    apps: [앱하나(1, 'ZDA 결제', 'SCREEN'), 앱하나(2, 'ZDA 회원', 'API', { prd: null, cases: { fn: 4, ui: 0 }, last: 건(3, 1, 0), extra: { pageLcp: null, fps: null, p95Ms: 41 } })],
    e2e: {
      pass: 1,
      fail: 1,
      notRun: 0,
      total: 3,
      recent: [
        { scenarioId: 31, name: '장바구니 다시 담기', serviceName: 'ZDA 결제', platform: 'mobile', steps: 3, runId: 90, verdict: 'PASS', finishedAt: '2026-10-07T05:00:00.000Z' },
        { scenarioId: 32, name: '주문 · 결제', serviceName: 'ZDA 결제', platform: 'desktop', steps: 4, runId: 91, verdict: 'FAIL', finishedAt: '2026-10-06T05:00:00.000Z' },
      ],
    },
    perf: {
      load: {
        runId: 9, serviceName: 'ZDA 결제', scenarioName: '상품 둘러보기', startedAt: '2026-10-05T01:00:00.000Z', verdict: 'PASS',
        peakVus: 50, maxTps: 50, p95Ms: 22, errorRate: 0, targets: { p95Ms: 2000, errorRate: 1 },
        series: [{ sec: 0, vus: 10, rps: 20, p95Ms: 12 }, { sec: 1, vus: 50, rps: 50, p95Ms: 47 }],
        hosts: null,
      },
      pages: { runId: 8, serviceName: 'ZDA 결제', startedAt: null, targets: { lcpMs: 2500, fcpMs: null, cls: null }, rows: [{ url: '/', lcpMs: 3000, fcpMs: 400, cls: 0.04 }] },
      app: null,
      game: null,
    },
    decisionItems: [{ serviceId: 1, kind: 'CHECK', text: '비회원이 담기를 누르면 로그인 화면으로 간다' }, { serviceId: 1, kind: 'SCREENS', text: null }],
    ...고침,
  };
}

function 실행중(runId: number, 끝난: number, 전체: number, 실패 = 0) {
  return {
    runId,
    serviceId: 1,
    serviceName: 'ZDA 결제',
    title: `ZDA 점검 ${runId}`,
    doneItems: 끝난,
    totalItems: 전체,
    failedItems: 실패,
    startedAt: '2026-10-07T04:00:00.000Z',
  };
}

function 움직임줄이기(줄임: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 줄임 && 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
}

function 읽기를(값: 대시보드응답, running?: 대시보드응답['running']) {
  return vi.spyOn(api, 'dashboard').mockImplementation(((_tz: string, only?: 'running') =>
    Promise.resolve(only === 'running' ? { running: running ?? 값.running } : 값)) as typeof api.dashboard);
}

async function 흘린다(밀리초: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(밀리초);
  });
}

beforeEach(() => {
  움직임줄이기(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('머리와 읽기', () => {
  it('열 때 집계를 한 번 읽고 제목과 부제를 그린다', async () => {
    const 읽기 = 읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('대시보드');
    expect(await screen.findByText(/애플리케이션 2개 · 최근 14일/)).toBeTruthy();
    expect(읽기).toHaveBeenCalledTimes(1);
    expect(읽기).toHaveBeenCalledWith(시간대, undefined, {});
  });

  it('읽는 동안 불러오는 중을 보인다 — 머리는 먼저 선다', async () => {
    let 풀기: (값: 대시보드응답) => void = () => undefined;
    vi.spyOn(api, 'dashboard').mockImplementation((() => new Promise((ok) => (풀기 = ok as typeof 풀기))) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    await act(async () => 풀기(응답()));
    expect(screen.queryByText('불러오는 중입니다.')).toBeNull();
  });

  it('400 이면 판 하나에 이유를 적고 칸은 그리지 않는다', async () => {
    vi.spyOn(api, 'dashboard').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', 'Moon/Base'));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 판 = await screen.findByRole('alert');
    expect(판.textContent).toContain('Moon/Base');
    expect(screen.queryByText('회귀 실패')).toBeNull();
  });

  it('다른 오류는 서버가 준 말을 판 하나에 낸다', async () => {
    vi.spyOn(api, 'dashboard').mockRejectedValue(new ApiError(500, 'INTERNAL', '서버가 잠깐 멈췄습니다'));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect((await screen.findByRole('alert')).textContent).toContain('서버가 잠깐 멈췄습니다');
  });
});

describe('실행 중 줄', () => {
  it('도는 실행이 없으면 줄 자체가 없다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('회귀 실패', { selector: 'h2' });
    expect(screen.queryByText(/^실행 중 /)).toBeNull();
  });

  it('RUN 번호 · 애플리케이션과 제목 · 끝난 수 / 전체가 보이고 누르면 그 실행으로 간다', async () => {
    읽기를(응답({ running: [실행중(12, 3, 8, 1)] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('실행 중 1건')).toBeTruthy();
    const 링크 = screen.getByRole('link', { name: /RUN 12/ });
    expect(링크.getAttribute('href')).toBe('#/runs/12');
    expect(링크.textContent).toContain('ZDA 점검 12');
    expect(링크.textContent).toContain('ZDA 결제 · RUN 12');
    expect(링크.textContent).toContain('3 / 8건');
    expect(링크.textContent).toContain('실패 1');
    expect(screen.getByText('실행 중 1건').querySelector('.pulse')).not.toBeNull();
  });

  it('둘까지 보이고 나머지는 「외 N건」이다', async () => {
    읽기를(응답({ running: [실행중(1, 0, 4), 실행중(2, 1, 4), 실행중(3, 2, 4), 실행중(4, 2, 4)] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('실행 중 4건')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /RUN \d/ })).toHaveLength(2);
    expect(screen.getByText('외 2건').closest('a')).toBeNull();
  });
});

describe('맨 위 다섯 칸', () => {
  it('PRD · 테스트 케이스 · 최근 실행 결과 · E2E · 95% 응답시간을 숫자와 한 줄로 보이고 누를 수 없다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸들 = await screen.findByRole('region', { name: '프로젝트 요약' });
    expect(칸들.textContent).toContain('기획서 1개 · 확인 필요 2');
    expect(within(칸들).getByText('10')).toBeTruthy();
    expect(within(칸들).getByText('14')).toBeTruthy();
    expect(칸들.textContent).toContain('기능 12 · UI 2');
    // 케이스마다 마지막 결과 — 통과 11 / 14
    expect(within(칸들).getByText('78.6')).toBeTruthy();
    expect(칸들.textContent).toContain('통과율 · 실패 2');
    expect(within(칸들).getByText('50.0')).toBeTruthy();
    expect(칸들.textContent).toContain('통과 1 · 실패 1 · 시나리오 3개');
    expect(within(칸들).getByText('22')).toBeTruthy();
    expect(칸들.textContent).toContain('에러율 0% · 최대 TPS 50');
    expect(within(칸들).queryAllByRole('link')).toHaveLength(0);
  });

  it('셀 것이 없으면 0 대신 「—」다', async () => {
    읽기를(응답({ project: 요약({ e2e: { pass: 0, fail: 0, notRun: 0, total: 0, recent: [] }, perf: { load: null, pages: null, app: null, game: null } }) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸들 = await screen.findByRole('region', { name: '프로젝트 요약' });
    expect(칸들.textContent).toContain('부하 테스트 기록 없음');
    expect(within(칸들).getAllByText('—')).toHaveLength(2);
  });
});

describe('요구사항 추적 · 테스트 케이스', () => {
  it('커버리지는 테스트가 있는 요구사항 / 전체이고 PRD 가 있는 애플리케이션만 줄이 선다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '요구사항 추적 (RTM)' })).closest('section')!;
    expect(within(칸).getByText('80.0')).toBeTruthy();
    expect(칸.textContent).toContain('통과 6');
    expect(칸.textContent).toContain('일부 미실행 1');
    expect(칸.textContent).toContain('테스트 없음 2');
    expect(칸.textContent).toContain('ZDA 결제');
    expect(칸.textContent).not.toContain('ZDA 회원');
    expect(within(칸).getByRole('button', { name: '추적표 엑셀' })).toBeTruthy();
  });

  it('기능 · UI 수와 애플리케이션별 수 · 설계 분포를 보인다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '케이스' })).closest('section')!;
    expect(칸.textContent).toContain('기능 테스트 12');
    expect(칸.textContent).toContain('UI 테스트 2');
    expect(칸.textContent).toContain('ZDA 결제 10 · ZDA 회원 4');
    expect(within(칸).getByText('정상').closest('.dash-ax')!.textContent).toContain('5');
  });
});

describe('애플리케이션 카드', () => {
  it('카드마다 통과율 · 흐름 · 종류별 한 줄이 있고 누르면 그 애플리케이션을 고른다', async () => {
    const 열기 = vi.fn();
    읽기를(응답());
    render(<Dashboard 서비스열기={열기} {...기본재료} />);
    const 카드 = (await screen.findByText('ZDA 결제', { selector: '.dash-app b' })).closest('a')!;
    expect(within(카드).getByText('80.0')).toBeTruthy();
    expect(카드.textContent).toContain('최근 실행 4회');
    expect(카드.textContent).toContain('페이지 성능 · /cart LCP');
    expect(카드.textContent).toContain('312ms');
    act(() => 카드.click());
    expect(열기).toHaveBeenCalledWith(1);
    const api카드 = screen.getByText('ZDA 회원', { selector: '.dash-app b' }).closest('a')!;
    expect(api카드.textContent).toContain('95% 응답시간');
    expect(api카드.textContent).toContain('41ms');
  });

  it('처음 넷만 보이고 「더보기」를 누르면 넷씩 늘며 다 보이면 단추가 사라진다', async () => {
    const 앱들 = Array.from({ length: 6 }, (_, i) => 앱하나(i + 1, `앱${i + 1}`, 'SCREEN'));
    읽기를(응답({ project: 요약({ apps: 앱들 }) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('애플리케이션 6개');
    expect(document.querySelectorAll('.dash-app')).toHaveLength(4);
    act(() => screen.getByRole('button', { name: '더보기 (2)' }).click());
    expect(document.querySelectorAll('.dash-app')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: /더보기/ })).toBeNull();
  });

  it('실행한 테스트가 없는 애플리케이션은 숫자 대신 안내다', async () => {
    읽기를(응답({ project: 요약({ apps: [앱하나(1, 'ZDA 결제', 'SCREEN', { last: 건(0, 0, 0) })] }) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 카드 = (await screen.findByText('ZDA 결제', { selector: '.dash-app b' })).closest('a')!;
    expect(카드.textContent).toContain('아직 실행한 테스트가 없습니다');
  });
});

describe('E2E · 성능 · 결정 필요', () => {
  it('E2E 줄은 시나리오 번호 · 이름 · 판정이고 누르면 그 실행으로 간다. 성공한 줄만 지나가는 점이 있다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 줄 = (await screen.findByText('장바구니 다시 담기')).closest('a')!;
    expect(줄.getAttribute('href')).toBe('#/runs/90');
    expect(줄.textContent).toContain('SC-31');
    expect(줄.textContent).toContain('ZDA 결제 · 모바일');
    expect(줄.querySelectorAll('.dash-chain i')).toHaveLength(3);
    expect(줄.querySelector('.mv')).not.toBeNull();
    const 실패줄 = screen.getByText('주문 · 결제').closest('a')!;
    expect(실패줄.querySelector('.mv')).toBeNull();
    expect(실패줄.textContent).toContain('실패');
  });

  it('페이지 성능은 페이지마다 한 줄이고 목표를 넘은 숫자는 실패 색이다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '페이지 성능' })).closest('section')!;
    const 줄 = within(칸).getAllByRole('row')[1]!;
    expect(within(줄).getByText('3,000ms').classList.contains('bad')).toBe(true);
    expect(within(줄).getByText('400ms').classList.contains('bad')).toBe(false);
  });

  it('앱 · 게임 성능은 그 종류 애플리케이션이 있을 때만 서고, 측정이 없으면 숨기지 않고 「값 없음」이다', async () => {
    읽기를(응답({ project: 요약({ apps: [앱하나(1, 'ZDA 앱', 'APP')] }) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '앱 성능' })).closest('section')!;
    expect(칸.textContent).toContain('값 없음');
    expect(칸.classList.contains('wide')).toBe(true);
    expect(screen.queryByRole('heading', { name: '게임 성능' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '페이지 성능' })).toBeNull();
  });

  it('결정 필요는 전체 수와 앞 줄이고 글이 없는 갈래는 갈래 이름으로 적으며 누르면 그 애플리케이션 결정 목록으로 간다', async () => {
    const 열기 = vi.fn();
    읽기를(응답({ decisions: [{ serviceId: 1, count: 5 }] }));
    render(<Dashboard 서비스열기={열기} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '결정 필요' })).closest('section')!;
    expect(칸.querySelector('.num')!.textContent).toBe('5');
    const 줄 = within(칸).getByText('비회원이 담기를 누르면 로그인 화면으로 간다').closest('a')!;
    expect(줄.getAttribute('href')).toBe('#/authoring?todo=1&service=ZD1');
    expect(칸.textContent).toContain('테스트가 확인하지 않은 화면이 있습니다');
    act(() => 줄.click());
    expect(열기).toHaveBeenCalledWith(1);
  });
});

describe('회귀 실패 목록', () => {
  it('같은 케이스는 한 줄이고 디바이스를 칩 하나로 합친다 · 실패 유형 칩의 말풍선이 대표 문장이다', async () => {
    const 첫 = 응답().newFailures[0]!;
    읽기를(응답({ newFailures: [첫, { ...첫, platform: 'desktop' }, 응답().newFailures[1]!] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '회귀 실패' })).closest('section')!;
    const 줄들 = within(칸).getAllByRole('link');
    expect(줄들).toHaveLength(2);
    expect(줄들[0]!.getAttribute('href')).toBe('#/runs/fn?run=7&tc=ZDA-001');
    expect(줄들[0]!.textContent).toContain('PC · 모바일');
    expect(within(줄들[0]!).getByText('기대 결과 불일치').getAttribute('title')).toBe('결제 완료 문구가 보이지 않는다');
    expect(칸.querySelector('.num')!.textContent).toBe('2');
  });

  it('회귀 실패가 없고 견줄 앞 실행도 없으면 견줄 것이 없다고 중립으로 적는다', async () => {
    읽기를(응답({ newFailures: [], byService: 응답().byService.map((서비스) => ({ ...서비스, newFailureCount: 0, compared: false })) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('견줄 앞 실행이 없습니다')).toBeTruthy();
    expect(screen.queryByText('회귀 실패가 없습니다')).toBeNull();
  });

  it('앞 실행이 있는데 회귀 실패가 없으면 좋은 소식으로 짧게 적는다', async () => {
    읽기를(응답({ newFailures: [], byService: 응답().byService.map((서비스) => ({ ...서비스, newFailureCount: 0, compared: true })) }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('회귀 실패가 없습니다')).toBeTruthy();
  });
});

describe('비어 있을 때', () => {
  const 빈응답 = () =>
    응답({
      passRate: { current: 건(0, 0, 0), previous: 건(0, 0, 0) },
      newFailures: [],
      byService: [],
      project: 요약({
        apps: [앱하나(1, 'ZDA 결제', 'SCREEN', { cases: { fn: 0, ui: 0 }, last: 건(0, 0, 0) })],
        e2e: { pass: 0, fail: 0, notRun: 0, total: 0, recent: [] },
        perf: { load: null, pages: null, app: null, game: null },
      }),
    });

  it('케이스도 실행도 없으면 칸 대신 안내 한 장이다', async () => {
    읽기를(빈응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('아직 테스트가 없습니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: '케이스 보기' }).getAttribute('href')).toBe('#/cases');
    for (const 제목 of ['회귀 실패', '요구사항 추적 (RTM)', '성능 테스트']) expect(screen.queryByRole('heading', { name: 제목 })).toBeNull();
  });

  it('케이스 자리가 없는 사람에게는 「케이스 보기」 단추를 두지 않는다', async () => {
    읽기를(빈응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} 케이스갈수있나={false} />);
    expect(await screen.findByText('아직 테스트가 없습니다')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '케이스 보기' })).toBeNull();
  });

  it('설정에 갈 수 있는 사람에게만 정기 실행을 켜는 자리로 가는 링크를 단다', async () => {
    읽기를(빈응답());
    const { unmount } = render(<Dashboard 서비스열기={() => {}} {...기본재료} 설정갈수있나 />);
    expect((await screen.findByRole('link', { name: '설정에서 정기 실행 켜기' })).getAttribute('href')).toBe('#/settings');
    unmount();
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('아직 테스트가 없습니다');
    expect(screen.queryByRole('link', { name: '설정에서 정기 실행 켜기' })).toBeNull();
  });
});

describe('칸 차례', () => {
  it('다섯 칸 → 추적 · 케이스 → 애플리케이션 → E2E → 성능 · 실패 유형 → 회귀 실패 · 결정 필요 차례다', async () => {
    읽기를(응답({ running: [실행중(12, 3, 8)] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('실행 중 1건');
    const 순서 = ['실행 중 1건', 'PRD', '요구사항 추적 (RTM)', 'AI가 기획서로 작성', '애플리케이션 2개', 'E2E 시나리오 최근 결과', '부하 테스트', '실패 유형', '회귀 실패', '결정 필요'];
    const 위치 = 순서.map((글) => screen.getByText(글, { selector: 'h2, .dash-live-head, .nm, .dash-lab' }));
    for (let i = 1; i < 위치.length; i += 1) {
      expect(위치[i - 1]!.compareDocumentPosition(위치[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, 순서[i]).toBeTruthy();
    }
  });
});

describe('새로 고침', () => {
  it('실행 중이 있으면 15초마다 실행 중 줄만 받고 집계는 다시 받지 않는다', async () => {
    vi.useFakeTimers();
    const 읽기 = 읽기를(응답({ running: [실행중(12, 3, 8)] }), [실행중(12, 5, 8)]);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    expect(읽기).toHaveBeenCalledTimes(1);
    await 흘린다(15_000);
    expect(읽기).toHaveBeenCalledTimes(2);
    expect(읽기).toHaveBeenLastCalledWith(시간대, 'running', {});
    expect(screen.getByRole('link', { name: /RUN 12/ }).textContent).toContain('5 / 8건');
  });

  it('도는 실행이 없으면 타이머를 걸지 않는다', async () => {
    vi.useFakeTimers();
    const 읽기 = 읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    await 흘린다(60_000);
    expect(읽기).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('받아 온 줄에서 이전에 있던 실행이 빠지면 집계를 한 번 더 받는다', async () => {
    vi.useFakeTimers();
    const 읽기 = 읽기를(응답({ running: [실행중(12, 3, 8), 실행중(13, 1, 8)] }), [실행중(13, 2, 8)]);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    await 흘린다(15_000);
    expect(읽기.mock.calls.map((인자) => 인자[1] ?? 'all')).toEqual(['all', 'running', 'all']);
  });

  it('집계를 다시 받다 실패해도 다음 주기에 다시 받는다 — 도는 실행이 다 끝난 뒤라 타이머가 꺼져도 「끝났다」 신호를 잃지 않는다', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const 첫 = 응답({ running: [실행중(12, 3, 8)] });
    const 새 = 응답({ project: 요약({ apps: [앱하나(1, 'ZDA 결제', 'SCREEN', { last: 건(19, 1, 0) })] }), running: [] });
    let 전체부름 = 0;
    const 읽기 = vi.spyOn(api, 'dashboard').mockImplementation(((_tz: string, only?: 'running') => {
      if (only === 'running') return Promise.resolve({ running: [] });
      전체부름 += 1;
      if (전체부름 === 1) return Promise.resolve(첫);
      return 전체부름 === 2 ? Promise.reject(new Error('일시 오류')) : Promise.resolve(새);
    }) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    await 흘린다(15_000);
    expect(읽기.mock.calls.map((인자) => 인자[1] ?? 'all')).toEqual(['all', 'running', 'all']);
    await 흘린다(15_000);
    expect(읽기.mock.calls.map((인자) => 인자[1] ?? 'all')).toEqual(['all', 'running', 'all', 'all']);
    await 흘린다(0);
    expect(screen.getAllByText('95.0').length).toBeGreaterThan(0);
    await 흘린다(30_000);
    expect(읽기).toHaveBeenCalledTimes(4);
  });

  it('집계를 받는 동안에는 다음 주기에 또 부르지 않는다 — 서버가 느릴 때 무거운 요청이 탭마다 쌓이지 않는다', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const 첫 = 응답({ running: [실행중(12, 3, 8)] });
    let 전체부름 = 0;
    vi.spyOn(api, 'dashboard').mockImplementation(((_tz: string, only?: 'running') => {
      if (only === 'running') return Promise.resolve({ running: [] });
      전체부름 += 1;
      if (전체부름 === 1) return Promise.resolve(첫);
      if (전체부름 === 2) return Promise.reject(new Error('일시 오류'));
      return new Promise(() => {});
    }) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    await 흘린다(15_000);
    await 흘린다(15_000);
    expect(전체부름).toBe(3);
    await 흘린다(45_000);
    expect(전체부름).toBe(3);
  });

  it('화면을 떠나면 타이머를 끈다', async () => {
    vi.useFakeTimers();
    읽기를(응답({ running: [실행중(12, 3, 8)] }));
    const { unmount } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('등장 움직임은 처음 한 번만이다 — 다시 받을 때 칸이 새로 그려지지 않는다', async () => {
    vi.useFakeTimers();
    const 첫 = 응답({ running: [실행중(12, 3, 8)] });
    const 둘째 = 응답({ project: 요약({ apps: [앱하나(1, 'ZDA 결제', 'SCREEN', { last: 건(19, 1, 0) })] }), running: [] });
    let 부름 = 0;
    vi.spyOn(api, 'dashboard').mockImplementation(((_tz: string, only?: 'running') => {
      부름 += 1;
      if (only === 'running') return Promise.resolve({ running: [] });
      return Promise.resolve(부름 === 1 ? 첫 : 둘째);
    }) as typeof api.dashboard);

    const { container } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    const 칸들 = container.querySelector('.dash-stats')!;
    await 흘린다(15_000);
    await 흘린다(0);
    expect(container.querySelector('.dash-stats')).toBe(칸들);
    expect(within(칸들 as HTMLElement).getByText('95.0')).toBeTruthy();
  });
});
