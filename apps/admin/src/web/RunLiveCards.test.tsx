// @vitest-environment jsdom
// 정식 실행 진행 창의 화면 카드와 맨 위 주황 띠 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · 시안 7판 ⑦)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { Platform, RunItemSummary, 항목진행 } from './api.js';
import type { RunDetail } from './runProgress.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 장면통로 } from './TrialLive.js';

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:1') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function 흘리기() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

function 항목(n: number, platform: Platform): RunItemSummary {
  return {
    historyId: n,
    tcId: `ZZL-${String(n).padStart(3, '0')}`,
    tcName: `케이스 ${n}`,
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status: 'PASS',
    durationMs: null,
    error: null,
    startedAt: '2026-11-05T00:00:00.000Z',
    finishedAt: null,
  };
}

function 실행(items: RunItemSummary[], 덧: Partial<RunDetail> = {}): RunDetail {
  return {
    runId: 128,
    title: 'ZZL 화면 카드',
    triggeredBy: 'zzl',
    triggeredByName: '테스터',
    env: 'stage',
    baseUrl: 'https://zzl.example.test',
    serviceName: 'ZZL',
    status: 'RUNNING',
    startedAt: '2026-11-05T00:00:00.000Z',
    finishedAt: null,
    counts: { total: items.length, pass: 0, fail: 0, na: 0, running: items.length },
    items,
    ...덧,
  };
}

function 절차(historyId: number, 덧: Partial<항목진행> = {}): 항목진행 {
  return { historyId, seq: 6, title: '수량을 3으로 바꾼다', elapsedMs: 12000, timeoutMs: 30000, ...덧 };
}

const 카드들 = () => [...document.querySelectorAll('.lc')];

describe('정식 실행 진행 창 — 화면 카드 (시안 7판 ⑦)', () => {
  it('맨 위 주황 띠가 끝나면 실행 기록에 RUN 번호로 남는다고 알린다', () => {
    render(<RunProgressModal data={실행([항목(1, 'desktop')])} 진행목록={[]} onClose={() => {}} />);

    const 띠 = document.querySelector('.start-band.rec');
    expect(띠?.textContent).toBe('정식 실행 끝나면 실행 기록에 RUN 128 로 남습니다');
  });

  it('한 건 실행의 띠는 붙을 실행이 있으면 그 RUN 에, 없으면 케이스 상세에 남는다고 말한다', () => {
    const { rerender } = render(
      <RunProgressModal data={실행([항목(1, 'desktop')], { origin: 'SINGLE', rerunOf: 112 })} 진행목록={[]} onClose={() => {}} />,
    );
    expect(document.querySelector('.start-band.rec')?.textContent).toContain('끝나면 RUN 112 결과에 다시 실행으로 추가됩니다');

    rerender(<RunProgressModal data={실행([항목(1, 'desktop')], { origin: 'SINGLE', rerunOf: null })} 진행목록={[]} onClose={() => {}} />);
    expect(document.querySelector('.start-band.rec')?.textContent).toContain('끝나면 이 케이스 상세에 남습니다');
  });

  it('장면을 찍는 PC 항목은 그 항목의 장면 통로를 받아 그리고 지금 단계와 경과 · 제한을 적는다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'frame', 그림: new Blob(['jpeg']) });
    render(<RunProgressModal data={실행([항목(15, 'desktop')])} 진행목록={[절차(15, { live: true })]} onClose={() => {}} />);
    await 흘리기();

    expect(받기).toHaveBeenCalledWith('/api/runs/128/items/15/live');
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:1');
    const 카드 = 카드들()[0]!;
    expect(카드.textContent).toContain('서버 브라우저');
    expect(카드.textContent).toContain('6단계 · 수량을 3으로 바꾼다');
    expect(카드.textContent).toContain('12초 경과 / 제한 30초');
  });

  it('실제 기기 모바일은 「실제 기기」와 Device VISION 링크, 가상 기기는 「가상 기기 · iPhone 14」다', () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    render(
      <RunProgressModal
        data={실행([항목(1, 'mobile'), 항목(2, 'mobile')])}
        진행목록={[절차(1, { live: true, vision: { url: 'https://vision.example.test/#phone=s1' } }), 절차(2, { live: true })]}
        onClose={() => {}}
      />,
    );

    const [실제, 가상] = 카드들();
    expect(실제!.textContent).toContain('실제 기기');
    expect(screen.getByRole('link', { name: 'Device VISION ↗' }).getAttribute('href')).toBe('https://vision.example.test/#phone=s1');
    expect(가상!.textContent).toContain('가상 기기 · iPhone 14');
  });

  it('장면을 안 찍는 항목(Android 앱 · API)은 장면 칸 없이 카드만 서고 장면 통로를 묻지 않는다', () => {
    const 받기 = vi.spyOn(장면통로, '받기');
    render(
      <RunProgressModal
        data={실행([항목(1, 'android')])}
        진행목록={[절차(1, { live: false, vision: { url: 'https://vision.example.test/#phone=a1' } })]}
        onClose={() => {}}
      />,
    );

    expect(카드들()).toHaveLength(1);
    expect(document.querySelector('.lc-scene')).toBeNull();
    expect(screen.getByRole('link', { name: 'Device VISION ↗' })).toBeTruthy();
    expect(받기).not.toHaveBeenCalled();
  });

  it('카드는 둘까지다 — 셋째로 도는 항목은 이름 줄로 남는다', () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    render(
      <RunProgressModal
        data={실행([항목(1, 'desktop'), 항목(2, 'desktop'), 항목(3, 'desktop')])}
        진행목록={[절차(1, { live: true }), 절차(2, { live: true }), 절차(3, { live: true })]}
        onClose={() => {}}
      />,
    );

    expect(카드들()).toHaveLength(2);
    expect(document.querySelector('.now-step')?.textContent).toContain('수량을 3으로 바꾼다');
    expect(screen.getByText('ZZL-003 케이스 3')).toBeTruthy();
  });

  it('「크게 보기」를 누르면 그 카드만 남고, 다시 누르면 둘로 돌아온다', () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    render(
      <RunProgressModal
        data={실행([항목(1, 'desktop'), 항목(2, 'mobile')])}
        진행목록={[절차(1, { live: true }), 절차(2, { live: true })]}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: '크게 보기' })[1]!);
    expect(카드들()).toHaveLength(1);
    expect(카드들()[0]!.classList.contains('big')).toBe(true);
    expect(카드들()[0]!.textContent).toContain('ZZL-002');

    fireEvent.click(screen.getByRole('button', { name: '작게 보기' }));
    expect(카드들()).toHaveLength(2);
  });

  it('끝난 실행은 띠도 카드도 없다', () => {
    const 끝 = 실행([{ ...항목(1, 'desktop'), finishedAt: '2026-11-05T00:01:00.000Z' }], {
      status: 'FINISHED',
      finishedAt: '2026-11-05T00:01:00.000Z',
      counts: { total: 1, pass: 1, fail: 0, na: 0, running: 0 },
    });
    render(<RunProgressModal data={끝} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.start-band.rec')).toBeNull();
    expect(카드들()).toHaveLength(0);
  });
});
