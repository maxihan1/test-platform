// @vitest-environment jsdom
// 실행 기록 목록 검사 (SPEC §8.7, 2026-09-22 신설 · 2026-10-19 ⑫ A안 — 목록 + 오른쪽 결과 칸).
//
// 지키는 것 — ① 빈 목록 문장이 「이 서비스에서」로 갈린다 ② 총건수를 페이지 계산에 안 쓴다 ③ 색만으로 판정을 전달하지 않는다
// ④ 거르는 일은 서버가 한다 ⑤ 고른 실행 · 거르개가 주소에 남는다 ⑥ 줄을 눌러도 화면을 떠나지 않는다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type EnvRow, type Paged, type RunListRow, type RunTally, type ServiceRow } from './api.js';
import { 지금앱칸 } from './Head.js';
import { use이동 } from './leaveGuard.js';
import { RunList } from './RunList.js';
import { 도는중응답 } from './RunResult.fixture.js';
import type { 판정 } from './role.js';

const 운영: 판정 = () => true;
const 서버들: EnvRow[] = [
  { env: 'qa', baseUrl: 'https://qa.example.com' },
  { env: 'stage', baseUrl: 'https://stage.example.com' },
];

beforeEach(() => {
  window.location.hash = '#/runs/fn';
  // 결과 칸은 따로 검사한다(RunResult*.test) — 여기서는 답을 안 줘 「불러오는 중」에 둔다
  vi.spyOn(api, 'run').mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function 실행(runId: number, fail: number, 덮어쓸: Partial<RunListRow> = {}): RunListRow {
  return {
    runId,
    title: `ZRL 실행 ${runId}`,
    triggeredBy: 'zrl',
    triggeredByName: '김검사',
    env: 'qa',
    baseUrl: 'https://qa.example.com',
    serviceName: 'ZRL 애플리케이션',
    status: 'FINISHED',
    origin: 'MANUAL',
    rerunOf: null,
    startedAt: '2026-09-22T00:00:00.000Z',
    finishedAt: '2026-09-22T00:10:00.000Z',
    counts: { total: 3, pass: 3 - fail, fail, na: 0, running: 0 },
    change: null,
    ...덮어쓸,
  };
}

const 빈집계: RunTally = { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 };
type 답 = Paged<RunListRow> & { summary: RunTally };

// 한 쪽 크기를 2 로 두면 2건짜리 쪽은 「더 있다」다 (paging.ts)
const 한쪽: 답 = { items: [실행(2113, 1), 실행(2112, 0)], total: 42, page: 1, pageSize: 2, summary: { ...빈집계, runs: 42 } };
const 빈쪽: 답 = { items: [], total: 0, page: 1, pageSize: 2, summary: 빈집계 };

async function 그리기(답: 답 = 한쪽, kind: 'UI' | 'FN' = 'FN') {
  const 스파이 = vi.spyOn(api, 'runs').mockResolvedValue(답);
  const 것 = render(<RunList kind={kind} service="ZRL" envs={서버들} 판정하기={() => 운영} />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이 };
}

const 줄 = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.run-row')];

describe('RunList 머리', () => {
  it('제목이 h1 이고 본문 면 바깥에 선다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(container.querySelector('.head h1')?.textContent).toBe('실행 기록 › 기능 테스트');
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('고른 종류로 부르고 제목에 「실행 기록 › 종류」로 위치를 적는다', async () => {
    const { 스파이, container } = await 그리기(한쪽, 'UI');
    expect(스파이).toHaveBeenCalledWith('ZRL', 1, { kind: 'UI' });
    await screen.findByText('ZRL 실행 2113');
    expect(screen.getByRole('heading', { level: 1, name: '실행 기록 › UI 테스트' })).toBeTruthy();
    expect(container.querySelector('.head-meta')?.textContent).toBe('모두 42건');
  });

  it('머리 집계 띠가 없다 — 평균 소요는 판단에 안 쓰였다 (점검 1.5)', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(container.querySelector('.stats')).toBeNull();
    expect(screen.queryByText('평균 소요')).toBeNull();
  });
});

describe('RunList 줄 (§8.7 「A안」)', () => {
  it('왼쪽 띠 — 실패면 실패 색, 미실행이 섞이면 회색, 도는 중이면 진행 색, 전부 통과면 통과 색', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [
        실행(1, 1),
        실행(2, 0, { status: 'ABORTED', counts: { total: 960, pass: 0, fail: 0, na: 960, running: 0 } }),
        실행(3, 0, { status: 'RUNNING', finishedAt: null, counts: { total: 3, pass: 1, fail: 0, na: 0, running: 2 } }),
        실행(4, 0),
      ],
    });
    await screen.findByText('ZRL 실행 4');

    const 색 = 줄(container).map((el) => el.querySelector<HTMLElement>('.gutter')?.style.background);
    expect(색).toEqual(['var(--fail)', 'var(--na)', 'var(--accent-mark)', 'var(--pass)']);
  });

  it('작은 글에 RUN 번호 · 시작 방식 · 대상 서버 · 실행자 · 소요가 있다', async () => {
    const { container } = await 그리기({ ...한쪽, items: [실행(2120, 0, { origin: 'RERUN', rerunOf: 2113 })] });
    await screen.findByText('ZRL 실행 2120');

    const 글 = container.querySelector('.run-row small')?.textContent ?? '';
    for (const 조각 of ['RUN 2120', '실패 다시 실행', 'qa', '김검사', '10분']) expect(글).toContain(조각);
  });

  it('직전 대비 꼬리표 — 0 인 것은 빼고, change 가 null 이면 없다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [실행(2130, 3, { change: { newFail: 2, stillFail: 1 } }), 실행(2131, 0, { change: { newFail: 0, stillFail: 0 } })],
    });
    await screen.findByText('ZRL 실행 2130');

    const [첫, 둘] = 줄(container);
    expect(첫?.querySelector('.run-tags')?.textContent).toBe('회귀 실패 2기존 실패 1');
    expect(둘?.querySelector('.run-tags')).toBeNull();
  });

  it('해결도 꼬리표다 — 실패가 없어도 해결만 있으면 선다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [실행(2134, 1, { change: { newFail: 1, stillFail: 0, fixed: 3 } }), 실행(2135, 0, { change: { newFail: 0, stillFail: 0, fixed: 2 } })],
    });
    await screen.findByText('ZRL 실행 2134');

    const [첫, 둘] = 줄(container);
    expect(첫?.querySelector('.run-tags')?.textContent).toBe('회귀 실패 1해결 3');
    expect(둘?.querySelector('.fc-fixed')?.textContent).toBe('해결 2');
  });

  it('실행 위치 — 웹은 디바이스마다 브라우저, 앱 · 게임은 Device VISION 과 폰 모델', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [
        실행(2136, 0, { platforms: ['desktop', 'mobile'] }),
        실행(2137, 0, { platforms: ['android'], devices: ['SM-S911N'] }),
        실행(2138, 0, { platforms: ['android'], devices: ['Pixel 7', 'SM-S911N'] }),
        실행(2139, 0, { platforms: ['android'], devices: [] }),
      ],
    });
    await screen.findByText('ZRL 실행 2136');

    const 글 = 줄(container).map((r) => r.querySelector('small')?.textContent ?? '');
    expect(글[0]).toContain('qa · PC Chrome · 모바일 Safari · 김검사');
    expect(글[1]).toContain('qa · Device VISION · SM-S911N · 김검사');
    expect(글[2]).toContain('qa · Device VISION · Pixel 7 외 1대 · 김검사');
    expect(글[3]).toContain('qa · Device VISION · 김검사');
  });

  it('미확정은 「그중 미확정 N건」 한 줄이고 없으면 쓰지 않는다', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [실행(2132, 2, { counts: { total: 3, pass: 1, fail: 2, na: 0, running: 0, unconfirmed: 2 } }), 실행(2133, 0)],
    });
    await screen.findByText('ZRL 실행 2132');

    expect(screen.getByText('그중 미확정 2건').className).toBe('unconf-line');
    expect(줄(container)[1]?.querySelector('.unconf-line')).toBeNull();
  });

  it('디바이스가 둘 이상이고 실패가 있으면 실패를 디바이스별 케이스 수로 나눠 적는다 — 하나이거나 실패가 없으면 숫자 하나', async () => {
    const { container } = await 그리기({
      ...한쪽,
      items: [
        실행(20932, 10, { counts: { total: 606, pass: 595, fail: 10, na: 1, running: 0 }, failCases: { desktop: 4, mobile: 6 } }),
        실행(20931, 0, { failCases: { desktop: 0, mobile: 0 } }),
        실행(20930, 2, { failCases: { android: 2 } }),
      ],
    });
    await screen.findByText('ZRL 실행 20932');

    const 칸 = (i: number) => [...(줄(container)[i]?.querySelectorAll('.tally') ?? [])].map((e) => e.textContent);
    expect(칸(0)).toEqual(['595 통과1 미실행', '실패PC 4모바일 6']);
    expect(칸(1)).toEqual(['3 통과0 실패0 미실행']);
    expect(칸(2)).toEqual(['1 통과2 실패0 미실행']);
  });

  it('판정을 색만으로 전달하지 않는다 — 통과 · 실패 · 미실행이 글자로 적힌다', async () => {
    await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(screen.getAllByText('통과').length).toBeGreaterThan(0);
    expect(screen.getAllByText('미실행').length).toBeGreaterThan(0);
  });
});

describe('RunList 거르개 — 거르는 일은 서버가 한다', () => {
  it('검색어를 서버에 실어 보낸다 — 케이스 번호 · 이름에도 맞는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.change(screen.getByLabelText('케이스 · 제목으로 찾기'), { target: { value: 'ZRL-FN-007' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, expect.objectContaining({ q: 'ZRL-FN-007' })));
  });

  it('상태 · 대상 서버 · 시작 방식 · 기간을 고르면 같이 실린다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'failed' } });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'stage' } });
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'rerun' } });
    fireEvent.change(screen.getByLabelText('기간'), { target: { value: '14' } });

    await waitFor(() =>
      expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, { kind: 'FN', state: 'failed', env: 'stage', origin: 'rerun', days: 14 }),
    );
    expect(window.location.hash).toBe('#/runs/fn?state=failed&env=stage&origin=rerun&days=14');
    expect(document.querySelector('.head')?.textContent).toMatch(/최근 14일 42건/);
  });

  it('시작 방식 「빌드 실행」은 서버에 origin=build 로 거른다 (도메인/실행 §8.7)', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'build' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, { kind: 'FN', origin: 'build' }));
    expect(window.location.hash).toBe('#/runs/fn?origin=build');
  });
});

describe('RunList 빈 목록', () => {
  it('한 번도 안 돌린 사람에게는 애플리케이션을 짚어 말한다', async () => {
    await 그리기(빈쪽);
    expect(await screen.findByText(/이 애플리케이션에서 아직 실행한 기록이 없습니다/)).toBeTruthy();
  });

  it('거르개에 안 걸린 사람에게는 다른 문장을 준다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    스파이.mockResolvedValue(빈쪽);
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'scheduled' } });

    expect(await screen.findByText(/조건에 맞는 실행이 없습니다/)).toBeTruthy();
  });
});

describe('RunList 지킬 것', () => {
  it('총건수로 페이지 수를 계산하지 않는다', async () => {
    // total 42 · pageSize 2 · items 2 → 「다음」이 살아 있고, 총건수는 안내로만 쓴다
    await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(screen.getByRole('button', { name: '다음' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/21쪽/)).toBeNull();
  });

  it('칸마다 이름이 있다. 좁은 화면에서도 감추지 않는 자리다', async () => {
    await 그리기();
    await screen.findByText('ZRL 실행 2113');
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['실행', '판정']);
  });

  it('도는 실행이 있으면 3초마다 목록을 다시 받아 끝난 카드의 숫자 · 상태를 바꾼다. 다 끝나면 그친다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 도는 = 실행(20925, 0, { status: 'RUNNING', finishedAt: null, counts: { total: 249, pass: 79, fail: 0, na: 0, running: 1 } });
    const { container, 스파이 } = await 그리기({ ...한쪽, items: [도는] });
    await screen.findByText('ZRL 실행 20925');
    스파이.mockResolvedValue({ ...한쪽, items: [{ ...도는, status: 'FINISHED', finishedAt: '2026-09-22T00:50:00.000Z', counts: { total: 249, pass: 247, fail: 2, na: 0, running: 0 } }] });

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    await waitFor(() => expect(줄(container)[0]?.textContent).toContain('247'));
    const 끝난뒤 = 스파이.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(스파이.mock.calls.length).toBe(끝난뒤);
  });

  it('다시 받기는 보이는 줄만 덮는다 — 실패해도 목록이 오류 화면으로 안 바뀌고, 위에 새 실행이 서도 줄과 결과 칸이 그대로다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 도는 = 실행(20925, 0, { status: 'RUNNING', finishedAt: null });
    const { container, 스파이 } = await 그리기({ ...한쪽, items: [도는] });
    await screen.findByText('ZRL 실행 20925');
    스파이.mockRejectedValue(new Error('502'));
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(줄(container).map((el) => el.textContent?.includes('ZRL 실행 20925'))).toEqual([true]);

    스파이.mockResolvedValue({ ...한쪽, items: [실행(20929, 0, { status: 'RUNNING', finishedAt: null }), 도는] });
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(줄(container)).toHaveLength(1);
    expect(screen.queryByText('ZRL 실행 20929')).toBeNull();
  });
});

describe('RunList 오른쪽 결과 칸 (§8.7 「A안」)', () => {
  it('주소에 실행이 없으면 맨 위 줄을 결과 칸에 연다 — 주소에는 적지 않는다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(api.run).toHaveBeenCalledWith(2113);
    expect(줄(container)[0]?.getAttribute('aria-current')).toBe('true');
    expect(container.querySelector('.runs-split.picked')).toBeNull();
    expect(window.location.hash).toBe('#/runs/fn');
  });

  it('줄을 누르면 화면을 떠나지 않고 결과 칸이 그 실행으로 바뀌며 주소에 남는다 — 상자는 없다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2112');

    fireEvent.click(줄(container)[1]!);

    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2112));
    expect(window.location.hash).toBe('#/runs/fn?run=2112');
    expect(줄(container)[1]?.getAttribute('aria-current')).toBe('true');
    expect(container.querySelector('.runs-split.picked')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('주소의 실행과 거르개로 연다 — 항목 상세에 갔다 돌아와도 풀리지 않는다 (점검 2.9)', async () => {
    window.location.hash = '#/runs/fn?run=2001&state=failed&page=2';
    const { 스파이 } = await 그리기();

    expect(스파이).toHaveBeenCalledWith('ZRL', 2, { kind: 'FN', state: 'failed' });
    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2001));
    // 거르개에 걸려 목록에 없는 실행도 결과 칸은 그대로 연다 — 대신 까닭을 한 줄 적는다
    expect(await screen.findByText('고른 실행은 지금 조건 밖입니다')).toBeTruthy();
  });

  it('같은 화면에서 조건이 다른 고리(「RUN N에서 통과」)를 누르면 주소가 옛 실행으로 돌아가지 않고 결과 칸이 그 실행을 연다', async () => {
    window.location.hash = '#/runs/fn?run=2112';
    vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    function 뿌리() {
      const { 조건번 } = use이동();
      return <RunList key={조건번} kind="FN" service="ZRL" envs={서버들} 판정하기={() => 운영} />;
    }
    render(<뿌리 />);
    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2112));

    const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
    window.location.hash = '#/runs/fn?run=2113&tc=ZRL-001';
    await 도착;

    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2113));
    expect(window.location.hash).toBe('#/runs/fn?run=2113');
  });

  it('「목록으로」를 누르면 고른 실행을 풀어 좁은 창에서 목록이 다시 보인다', async () => {
    window.location.hash = '#/runs/fn?run=2112';
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2112');

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(container.querySelector('.runs-split.picked')).toBeNull();
    expect(window.location.hash).toBe('#/runs/fn');
  });
});

describe('RunList 결과 칸 권한', () => {
  it('주소의 실행이 다른 애플리케이션 것이면 결과 칸 버튼을 그 애플리케이션 권한으로 가른다 — 띠 권한이면 실행 읽기만 있는 사람에게 「실행 중단」이 섰다', async () => {
    window.location.hash = '#/runs/fn?run=2113';
    vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    vi.spyOn(api, 'run').mockResolvedValue({
      ...도는중응답,
      runId: 2113,
      items: [
        {
          historyId: 1, tcId: 'MEM-FN-001', tcName: '회원 가입', platform: 'desktop', attempt: 1, params: {}, paramSchema: {},
          status: 'PASS', durationMs: 1, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: null,
        },
      ],
    });
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [], remainingMs: null });
    const 보기만: 판정 = () => false;
    render(<RunList kind="FN" service="ZRL" envs={서버들} 판정하기={(접두사) => (접두사 === 'MEM' ? 보기만 : 운영)} />);

    await screen.findByText('결제 회귀');
    expect(screen.queryByText('실행 중단')).toBeNull();
  });

  it('API 애플리케이션 실행 줄은 대상 서버 이름 뒤에 친 주소를 붙인다 — 웹은 이름만 (시안 11판 「실행 기록」 · WEB-F7-18)', async () => {
    vi.spyOn(api, 'runs').mockResolvedValue({ ...한쪽, items: [실행(2140, 0)] });
    const { container } = render(
      <지금앱칸.Provider value={{ kind: 'API' } as ServiceRow}>
        <RunList kind="FN" service="ZRL" envs={서버들} 판정하기={() => 운영} />
      </지금앱칸.Provider>,
    );
    await screen.findByText('ZRL 실행 2140');
    expect(container.querySelector('.run-row small')?.textContent).toContain('qa · https://qa.example.com');
    cleanup();
    const 웹 = await 그리기({ ...한쪽, items: [실행(2141, 0)] });
    await screen.findByText('ZRL 실행 2141');
    expect(웹.container.querySelector('.run-row small')?.textContent).not.toContain('https://qa.example.com');
  });
});

describe('다른 애플리케이션 실행 주소 (2026-10-31 시험 d5)', () => {
  it('주소의 실행이 다른 애플리케이션 것이면 왼쪽 줄을 그 애플리케이션으로 바꾸고 고른 실행은 남긴다', async () => {
    window.location.hash = '#/runs/fn?run=20930';
    vi.spyOn(api, 'run').mockResolvedValue({ ...도는중응답, runId: 20930, items: [{ ...도는중응답.items[0]!, tcId: 'ASH-FN-292' }] } as never);
    vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    const 바꿈 = vi.fn();
    const { rerender } = render(<RunList kind="FN" service="DMN" envs={서버들} 판정하기={() => 운영} 서비스바꿈={바꿈} />);
    await waitFor(() => expect(바꿈).toHaveBeenCalledWith('ASH'));
    rerender(<RunList kind="FN" service="ASH" envs={서버들} 판정하기={() => 운영} 서비스바꿈={바꿈} />);
    await waitFor(() => expect(window.location.hash).toContain('run=20930'));
    expect(바꿈).toHaveBeenCalledTimes(1);
  });

  it('같은 애플리케이션 실행이면 바꾸지 않는다', async () => {
    window.location.hash = '#/runs/fn?run=2113';
    vi.spyOn(api, 'run').mockResolvedValue({ ...도는중응답, runId: 2113, items: [{ ...도는중응답.items[0]!, tcId: 'ZRL-001' }] } as never);
    vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    const 바꿈 = vi.fn();
    render(<RunList kind="FN" service="ZRL" envs={서버들} 판정하기={() => 운영} 서비스바꿈={바꿈} />);
    await waitFor(() => expect(api.run).toHaveBeenCalled());
    await act(async () => {});
    expect(바꿈).not.toHaveBeenCalled();
  });
});
