// @vitest-environment jsdom
// 앱 대시보드 화면 검사 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError } from './api.js';
import { Dashboard } from './Dashboard.js';

const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** main.tsx 가 사람의 권한에서 뽑아 넘기는 재료 — 케이스 자리가 있는 사람 · 작성 칸이 read 이상인 서비스 */
const 기본재료 = { 케이스갈수있나: true, 작성서비스: [] as { id: number; name: string }[] };

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
      },
    ],
    byService: [
      {
        serviceId: 1,
        serviceName: 'ZDA 결제',
        current: 건(40, 5, 0),
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
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('품질 현황');
    expect(await screen.findByText(/서비스 2개 · 최근 14일/)).toBeTruthy();
    expect(읽기).toHaveBeenCalledTimes(1);
    expect(읽기).toHaveBeenCalledWith(시간대);
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
    expect(screen.queryByText('신규 실패')).toBeNull();
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
    await screen.findByText('신규 실패');
    expect(screen.queryByText(/^실행 중 /)).toBeNull();
  });

  it('RUN 번호 · 서비스와 제목 · 끝난 수 / 전체가 보이고 누르면 그 실행으로 간다', async () => {
    읽기를(응답({ running: [실행중(12, 3, 8, 1)] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('실행 중 1건')).toBeTruthy();
    const 링크 = screen.getByRole('link', { name: /RUN 12/ });
    expect(링크.getAttribute('href')).toBe('#/runs/12');
    expect(링크.textContent).toContain('ZDA 결제 · ZDA 점검 12');
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

describe('신규 실패 표', () => {
  it('서비스 · TC ID · 케이스 이름 링크 · 디바이스 · 언제 · 사유가 한 줄에 있다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByText('신규 실패')).closest('section')!;
    const 줄들 = within(칸).getAllByRole('row');
    const 첫줄 = 줄들[1]!;
    expect(within(첫줄).getByText('ZDA-001')).toBeTruthy();
    expect(within(첫줄).getByText('ZDA 결제')).toBeTruthy();
    const 이름 = within(첫줄).getByRole('link', { name: '카드로 결제한다' });
    expect(이름.getAttribute('href')).toBe('#/runs/7');
    expect(이름.classList.contains('ink')).toBe(true);
    expect(within(첫줄).getByText('모바일')).toBeTruthy();
    expect(within(첫줄).getByText('RUN 7')).toBeTruthy();
    expect(within(첫줄).getByText('결제 완료 문구가 보이지 않는다')).toBeTruthy();
    expect(within(줄들[2]!).getByText('PC')).toBeTruthy();
    expect(within(줄들[2]!).getByText('사유 없음')).toBeTruthy();
  });

  it('머리의 건수는 서비스별로 센 전체와 보이는 줄 가운데 큰 쪽이다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 제목 = (await screen.findByText('신규 실패')).closest('h2')!;
    expect(제목.textContent).toBe('신규 실패 2');
  });

  it('신규 실패가 없고 견줄 앞 실행도 없으면 견줄 것이 없다고 중립으로 적는다', async () => {
    읽기를(
      응답({
        newFailures: [],
        byService: 응답().byService.map((서비스) => ({ ...서비스, flow: ['P', 'P'], newFailureCount: 0, resolvedCount: 0, compared: false })),
      }),
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('견줄 앞 실행이 없습니다')).toBeTruthy();
    expect(screen.getAllByText('견줄 실행 없음')).toHaveLength(2);
    expect(screen.queryByText('새 실패가 없습니다')).toBeNull();
  });

  it('앞 실행이 있는데 신규 실패가 없으면 좋은 소식으로 짧게 적는다', async () => {
    읽기를(
      응답({
        newFailures: [],
        byService: 응답().byService.map((서비스) => ({ ...서비스, flow: ['P'], newFailureCount: 0, resolvedCount: 0, compared: true })),
      }),
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('새 실패가 없습니다')).toBeTruthy();
    expect(screen.queryByText('견줄 실행 없음')).toBeNull();
    expect(screen.queryByText('견줄 앞 실행이 없습니다')).toBeNull();
  });
});

describe('통과율 칸', () => {
  it('가운데 큰 숫자와 직전 대비 증감을 보인다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('87')).toBeTruthy();
    expect(screen.getByText('▲ 4%p 직전 14일 대비')).toBeTruthy();
  });

  it('통과 · 실패 · 미실행과 직전 14일을 글자로 적는다 — 색만으로 말하지 않는다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '통과율' })).closest('section')!;
    for (const 글 of ['통과', '실패', '미실행', '직전 14일']) expect(within(칸).getByText(글)).toBeTruthy();
    expect(within(칸).getByText('최근 14일 판정 200건')).toBeTruthy();
    const 통과줄 = within(칸).getByText('통과').closest('li')!;
    expect(통과줄.textContent).toContain('174');
    expect(통과줄.textContent).toContain('87%');
    expect(within(칸).getByText('실패').closest('li')!.textContent).toContain('10%');
  });

  it('직전 14일이 비면 안쪽 고리를 비우고 실행 없음을 적는다', async () => {
    읽기를(응답({ passRate: { current: 건(174, 20, 6), previous: 건(0, 0, 0) } }));
    const { container } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('직전 14일 실행 없음')).toBeTruthy();
    expect(container.querySelector('.dash-ring-inner')).toBeNull();
    const 칸 = screen.getByRole('heading', { name: '통과율' }).closest('section')!;
    expect(within(칸).queryByText(/직전 14일 대비/)).toBeNull();
  });

  it('직전이 있으면 안쪽 고리가 있다', async () => {
    읽기를(응답());
    const { container } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('87');
    expect(container.querySelector('.dash-ring-inner')).not.toBeNull();
  });

  it('미확정이 있으면 통과율 숫자에 이미 든 그중 미확정 N건 한 줄을 단다. 없으면 달지 않는다', async () => {
    읽기를(응답({ unconfirmed: 3 }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('그중 미확정 3건')).toBeTruthy();
    cleanup();
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('87');
    expect(screen.queryByText(/그중 미확정/)).toBeNull();
  });
});

describe('서비스별 품질 표', () => {
  it('서비스마다 통과율 · 대비 · 흐름 · 견줌 칩 · 마지막 실행이 한 줄이다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '서비스별 품질' })).closest('section')!;
    const 줄들 = within(칸).getAllByRole('row');
    const 결제 = 줄들[1]!;
    expect(within(결제).getByText('ZDA 결제')).toBeTruthy();
    expect(within(결제).getByText('89%')).toBeTruthy();
    expect(within(결제).getByText('▲ 3%p')).toBeTruthy();
    expect(within(결제).getByRole('img', { name: /통과 2/ }).querySelectorAll('i')).toHaveLength(4);
    expect(within(결제).getByText('신규 실패 2').classList.contains('f')).toBe(true);
    expect(within(결제).getByText('해결 1').classList.contains('p')).toBe(true);
    const 회원 = 줄들[2]!;
    expect(within(회원).getByText('견줄 실행 없음')).toBeTruthy();
    expect(within(회원).getByText('—', { selector: '.dash-delta' })).toBeTruthy();
  });

  it('마지막 실행에 실패가 있는지를 점이 글로도 말한다', async () => {
    읽기를(응답());
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByRole('heading', { name: '서비스별 품질' });
    expect(screen.getByRole('img', { name: '마지막 실행에 실패가 있습니다' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '마지막 실행에 실패가 없습니다' })).toBeTruthy();
  });
});

describe('비어 있을 때', () => {
  it('실행이 하나도 없으면 칸 여섯 대신 안내 한 장이다', async () => {
    읽기를(
      응답({
        passRate: { current: 건(0, 0, 0), previous: 건(0, 0, 0) },
        newFailures: [],
        byService: [],
        unconfirmed: 0,
      }),
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('아직 실행한 테스트가 없습니다')).toBeTruthy();
    expect(screen.getByText(/정기 실행/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '테스트 스크립트로 가기' }).getAttribute('href')).toBe('#/cases');
    for (const 제목 of ['신규 실패', '통과율', '서비스별 품질', '일별 테스트 결과', '실패 히트맵', '요구사항 커버리지']) {
      expect(screen.queryByRole('heading', { name: 제목 })).toBeNull();
    }
  });
});

describe('케이스 자리가 없는 사람', () => {
  it('빈 안내판에 「테스트 스크립트로 가기」 단추를 두지 않는다 — 눌러도 갈 자리가 없어 곧바로 되돌려졌다', async () => {
    읽기를(응답({ passRate: { current: 건(0, 0, 0), previous: 건(0, 0, 0) }, newFailures: [], byService: [], unconfirmed: 0 }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} 케이스갈수있나={false} />);
    expect(await screen.findByText('아직 실행한 테스트가 없습니다')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '테스트 스크립트로 가기' })).toBeNull();
  });
});

describe('그래프 칸 자리', () => {
  it('일별 · 히트맵 · 커버리지는 판이고 쌓이는 순서는 화면 읽기 순서다 (안의 그림은 DashboardCharts.test 가 본다)', async () => {
    읽기를(응답({ running: [실행중(12, 3, 8)] }));
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('실행 중 1건');
    const 순서 = ['실행 중 1건', '신규 실패', '통과율', '서비스별 품질', '일별 테스트 결과', '실패 히트맵', '요구사항 커버리지'];
    const 위치 = 순서.map((글) => screen.getByText(글, { selector: 'h2, .dash-live-head' }));
    for (let i = 1; i < 위치.length; i += 1) {
      expect(위치[i - 1]!.compareDocumentPosition(위치[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, 순서[i]).toBeTruthy();
    }
    for (const 제목 of ['일별 테스트 결과', '실패 히트맵', '요구사항 커버리지']) {
      const 판 = screen.getByRole('heading', { name: 제목 }).closest('section')!;
      expect(판.classList.contains('dash-slab')).toBe(true);
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
    expect(읽기).toHaveBeenLastCalledWith(시간대, 'running');
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
    expect(읽기.mock.calls.map((인자) => 인자.length)).toEqual([1, 2, 1]);
  });

  it('집계를 다시 받다 실패해도 다음 주기에 다시 받는다 — 도는 실행이 다 끝난 뒤라 타이머가 꺼져도 「끝났다」 신호를 잃지 않는다', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const 첫 = 응답({ running: [실행중(12, 3, 8)] });
    const 새 = 응답({ passRate: { current: 건(190, 6, 4), previous: 건(83, 14, 3) }, running: [] });
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
    expect(읽기.mock.calls.map((인자) => 인자.length)).toEqual([1, 2, 1]);
    await 흘린다(15_000);
    expect(읽기.mock.calls.map((인자) => 인자.length)).toEqual([1, 2, 1, 1]);
    await 흘린다(0);
    expect(document.querySelector('.dash-big')!.textContent).toBe('95%');
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

  it('등장 움직임은 처음 한 번만이다 — 다시 받을 때 칸이 새로 그려지지 않고 숫자가 0 에서 다시 오르지 않는다', async () => {
    움직임줄이기(false);
    vi.useFakeTimers();
    const 첫 = 응답({ running: [실행중(12, 3, 8)] });
    const 둘째 = 응답({ passRate: { current: 건(190, 6, 4), previous: 건(83, 14, 3) }, running: [] });
    let 부름 = 0;
    vi.spyOn(api, 'dashboard').mockImplementation(((_tz: string, only?: 'running') => {
      부름 += 1;
      if (only === 'running') return Promise.resolve({ running: [] });
      return Promise.resolve(부름 === 1 ? 첫 : 둘째);
    }) as typeof api.dashboard);

    const { container } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await 흘린다(0);
    const 숫자 = container.querySelector('.dash-big')!;
    const 판 = container.querySelector('.dash-board')!;
    const 도넛 = container.querySelector('.dash-ring')!;
    expect(숫자.textContent).toBe('0%');
    await 흘린다(450);
    expect(숫자.textContent).toBe('87%');

    await 흘린다(15_000);
    await 흘린다(0);
    expect(container.querySelector('.dash-big')).toBe(숫자);
    expect(container.querySelector('.dash-board')).toBe(판);
    expect(container.querySelector('.dash-ring')).toBe(도넛);
    expect(숫자.textContent).toBe('95%');
    expect(container.querySelectorAll('.dash-board > *')).toHaveLength(6);
  });
});
