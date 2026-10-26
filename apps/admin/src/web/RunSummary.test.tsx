// @vitest-environment jsdom
// 결과 화면 요약 띠 검사 — 통과율 도넛 · 실패 수 · 판정별 보기 · 직전 실행 대비 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type ItemStatus, type RunCounts, type RunInsights, type RunItemSummary } from './api.js';
import { RunSummary, type 변화칸 } from './RunSummary.js';

afterEach(cleanup);

function 집계(pass: number, fail: number, na: number, 미확정?: number): RunCounts {
  return { total: pass + fail + na, pass, fail, na, running: 0, unconfirmed: 미확정 };
}

function 견줌(고침: Partial<RunInsights> = {}): RunInsights {
  const 칸 = (판정: '새로깨짐' | '계속깨짐' | '고쳐짐' | '그대로', n: number) =>
    Array.from({ length: n }, (_, i) => ({
      tcId: `ZRS-${판정}-${i}`,
      tcName: `케이스 ${판정} ${i}`,
      platform: 'desktop' as const,
      판정,
    }));
  return {
    previous: { runId: 1038, startedAt: '2026-10-01T00:00:00Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [...칸('새로깨짐', 2), ...칸('계속깨짐', 1), ...칸('고쳐짐', 3), ...칸('그대로', 4)],
    실패덩어리들: [],
    ...고침,
  };
}

function 그린다(
  counts: RunCounts,
  insights: RunInsights | null = null,
  판정: ItemStatus | 'ALL' = 'ALL',
  on판정: (v: ItemStatus | 'ALL') => void = () => undefined,
  실패케이스수 = counts.fail,
  거르개: { 변화?: 변화칸 | null; on변화?: (v: 변화칸 | null) => void; 항목들?: RunItemSummary[] } = {},
) {
  return render(<RunSummary counts={counts} 실패케이스수={실패케이스수} insights={insights} 판정={판정} on판정={on판정} {...거르개} />);
}

describe('요약 띠 — 통과율과 숫자', () => {
  it('통과율은 통과 ÷ (통과 + 실패 + 미실행) 이고 소수 한 자리다', () => {
    const { container } = 그린다(집계(47, 2, 1));
    expect(container.querySelector('.rs-big')?.textContent).toBe('94.0%');
  });

  it('도넛에 통과 · 실패 · 미실행 세 호가 있고 길이가 몫이다', () => {
    const { container } = 그린다(집계(40, 5, 5));
    const 길이 = (칸: string) => container.querySelector(`.rs-seg.${칸}`)?.getAttribute('stroke-dasharray');
    expect(길이('p')).toBe('80 20');
    expect(길이('f')).toBe('10 90');
    expect(길이('n')).toBe('10 90');
  });

  it('항목이 없으면 「—」와 「항목 없음」이다', () => {
    const { container } = 그린다(집계(0, 0, 0));
    expect(container.querySelector('.rs-big')?.textContent).toBe('—');
    expect(screen.getByText('항목 없음')).toBeTruthy();
    expect(screen.queryByText(/중 .*건 통과/)).toBeNull();
  });

  it('중단 실행처럼 미실행만 있으면 0.0% 를 그대로 보인다', () => {
    const { container } = 그린다(집계(0, 0, 8));
    expect(container.querySelector('.rs-big')?.textContent).toBe('0.0%');
    expect(screen.queryByText('항목 없음')).toBeNull();
  });

  it('「실패 케이스 N건」은 케이스 수이고 「항목 N건 중 M건 통과」는 항목 수다', () => {
    const { container } = 그린다(집계(47, 3, 0), null, 'ALL', () => undefined, 2);
    expect(screen.getByText('실패 케이스 2건')).toBeTruthy();
    expect(container.querySelector('.v-fail')).not.toBeNull();
    expect(screen.getByText('항목 50건 중 47건 통과')).toBeTruthy();
  });

  it('실패가 0건이면 실패 색을 안 쓴다', () => {
    const { container } = 그린다(집계(10, 0, 0));
    expect(screen.getByText('실패 케이스 0건')).toBeTruthy();
    expect(container.querySelector('.v-fail')).toBeNull();
  });

  it('미확정 항목도 통과율과 숫자에 들어가고 「그중 미확정 N건」 한 줄만 단다', () => {
    const { container } = 그린다(집계(47, 3, 0, 2));
    expect(container.querySelector('.rs-big')?.textContent).toBe('94.0%');
    expect(screen.getByText('항목 50건 중 47건 통과')).toBeTruthy();
    expect(screen.getByText('그중 미확정 2건')).toBeTruthy();
  });

  it('미확정이 없으면 「그중 미확정」 글이 없다', () => {
    그린다(집계(47, 3, 0));
    expect(screen.queryByText(/미확정/)).toBeNull();
  });
});

describe('요약 띠 — 판정별 보기', () => {
  it('네 칸이 버튼이고 수는 항목 수다', () => {
    그린다(집계(47, 3, 1));
    const 칸 = within(screen.getByRole('group', { name: /판정별 보기/ })).getAllByRole('button');
    expect(칸.map((b) => b.textContent)).toEqual(['전체51', '통과47', '실패3', '미실행1']);
  });

  it('고른 칸만 aria-pressed 가 true 이고 누르면 on판정 이 그 값으로 불린다', () => {
    const on판정 = vi.fn();
    그린다(집계(47, 3, 1), null, 'FAIL', on판정);
    expect(screen.getByRole('button', { name: /^실패/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^전체/ }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /^통과/ }));
    fireEvent.click(screen.getByRole('button', { name: /^미실행/ }));
    fireEvent.click(screen.getByRole('button', { name: /^전체/ }));
    expect(on판정.mock.calls.map((c) => c[0])).toEqual(['PASS', 'NA', 'ALL']);
  });
});

describe('요약 띠 — 직전 실행 대비', () => {
  it('직전 실행 번호와 신규 실패 · 연속 실패 · 해결 수를 보인다', () => {
    그린다(집계(47, 3, 0), 견줌());
    const 고리 = screen.getByRole('link', { name: 'RUN 1038' });
    expect(고리.getAttribute('href')).toBe('#/runs/1038');
    expect(고리.closest('.rs-axis')?.textContent).toBe('직전 실행 RUN 1038 대비 · 케이스 수');
    const 수 = (이름: string) =>
      within(screen.getByText(이름).closest('.rs-stat') as HTMLElement).getByText(/^\d+$/).textContent;
    expect(수('신규 실패')).toBe('2');
    expect(수('연속 실패')).toBe('1');
    expect(수('해결')).toBe('3');
  });

  it('신규 실패를 누르면 그 변화로 거르고 한 번 더 누르면 푼다 (점검 2.20)', () => {
    const on변화 = vi.fn();
    그린다(집계(47, 3, 0), 견줌(), 'ALL', undefined, undefined, { 변화: null, on변화 });
    fireEvent.click(screen.getByRole('button', { name: /^신규 실패/ }));
    expect(on변화).toHaveBeenLastCalledWith('새로깨짐');
    cleanup();
    그린다(집계(47, 3, 0), 견줌(), 'ALL', undefined, undefined, { 변화: '새로깨짐', on변화 });
    expect(screen.getByRole('button', { name: /^신규 실패/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /^신규 실패/ }));
    expect(on변화).toHaveBeenLastCalledWith(null);
  });

  it('수가 0 이거나 거르는 길이 없으면 신규 · 연속 칸은 눌리지 않는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 케이스들: [] }), 'ALL', undefined, undefined, { on변화: vi.fn() });
    expect((screen.getByRole('button', { name: /^신규 실패/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    그린다(집계(47, 3, 0), 견줌());
    expect((screen.getByRole('button', { name: /^신규 실패/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('해결을 누르면 아래 해결 목록이 펴진다', () => {
    const { container } = 그린다(집계(47, 3, 0), 견줌());
    const 접이 = container.querySelector('details.rr-fold') as HTMLDetailsElement;
    expect(접이.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^해결/ }));
    expect(접이.open).toBe(true);
  });

  it('직전 대비 수는 케이스 수다 — 한 케이스가 디바이스 둘에서 새로 깨져도 1이다', () => {
    const 둘 = (['desktop', 'mobile'] as const).map((platform) => ({ tcId: 'ZRS-1', tcName: '케이스', platform, 판정: '새로깨짐' as const }));
    그린다(집계(47, 3, 0), 견줌({ 케이스들: 둘 }));
    const 수 = within(screen.getByText('신규 실패').closest('.rs-stat') as HTMLElement).getByText(/^\d+$/).textContent;
    expect(수).toBe('1');
  });

  it('주소가 바뀌었으면 한 줄로 알리고 빠진 케이스가 있으면 건수를 적는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 주소바뀜: true, 빠진건수: 3 }));
    expect(screen.getByText('직전 실행은 다른 주소에서 실행됐습니다')).toBeTruthy();
    expect(screen.getByText(/직전 실행에 있었으나 이번에 실행되지 않은 케이스 3건/)).toBeTruthy();
  });

  it('빠진 케이스는 눌렀을 때 직전 실행과 맞대 이름을 목록으로 보인다 (점검 2.20)', async () => {
    const 줄 = (historyId: number, tcId: string): RunItemSummary => ({
      historyId, tcId, tcName: `${tcId} 이름`, platform: 'desktop', attempt: 1, params: {}, paramSchema: {}, status: 'PASS',
      durationMs: 1, error: null, startedAt: '2026-10-01T00:00:00Z', finishedAt: '2026-10-01T00:00:01Z',
    });
    const 직전 = vi.spyOn(api, 'run').mockResolvedValue({
      runId: 1038, title: '앞', triggeredBy: 'u', triggeredByName: null, env: 'qa', baseUrl: '', serviceName: 'ZRS', status: 'FINISHED',
      startedAt: '2026-10-01T00:00:00Z', finishedAt: '2026-10-01T00:01:00Z', counts: { total: 3, pass: 3, fail: 0, na: 0, running: 0 },
      items: [줄(1, 'ZRS-001'), 줄(2, 'ZRS-002'), 줄(3, 'ZRS-003')], evidence: [],
    });
    그린다(집계(2, 0, 0), 견줌({ 빠진건수: 1 }), 'ALL', undefined, undefined, { 항목들: [줄(11, 'ZRS-001'), 줄(12, 'ZRS-002')] });
    expect(직전).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /이번에 실행되지 않은 케이스 1건/ }));

    await waitFor(() => expect(screen.getByText('ZRS-003 이름', { exact: false })).toBeTruthy());
    expect(직전).toHaveBeenCalledWith(1038);
    expect(screen.queryByText('ZRS-001 이름', { exact: false })).toBeNull();
  });

  it('주소가 같고 빠진 것이 없으면 그 두 줄이 없다', () => {
    그린다(집계(47, 3, 0), 견줌());
    expect(screen.queryByText(/다른 주소/)).toBeNull();
    expect(screen.queryByText(/이번에 실행되지 않은/)).toBeNull();
  });

  it('insights 가 null 이면 대비 칸이 아예 없다', () => {
    const { container } = 그린다(집계(47, 3, 0), null);
    expect(container.querySelector('.rs-diff')).toBeNull();
    expect(screen.queryByText(/직전 실행/)).toBeNull();
  });

  it('previous 가 null 이면 대비 칸이 아예 없다', () => {
    const { container } = 그린다(집계(47, 3, 0), 견줌({ previous: null, 케이스들: [] }));
    expect(container.querySelector('.rs-diff')).toBeNull();
    expect(screen.queryByText(/직전 실행/)).toBeNull();
  });
});

describe('요약 띠 — 디바이스별 실패 단추 (도메인/실행 §8.3 표 1번 줄)', () => {
  const 나눔 = [
    { platform: 'desktop' as const, 수: 4 },
    { platform: 'mobile' as const, 수: 6 },
    { platform: 'android' as const, 수: 0 },
  ];
  const 띠 = (device: 'ALL' | 'desktop', on디바이스: (v: string) => void) => (
    <RunSummary counts={집계(595, 10, 1)} 실패케이스수={6} insights={null} 판정="ALL" on판정={() => undefined} 디바이스실패={나눔} device={device} on디바이스={on디바이스} />
  );

  it('디바이스마다 실패 케이스 수 단추를 둔다 — 누르면 그 디바이스, 다시 누르면 전체, 0건은 누를 수 없다', () => {
    const on디바이스 = vi.fn();
    const { rerender } = render(띠('ALL', on디바이스));
    const 묶음 = screen.getByRole('group', { name: '디바이스별 실패 케이스' });
    expect(within(묶음).getAllByRole('button').map((b) => b.textContent)).toEqual(['PC 4건', '모바일 6건', 'Android 앱 0건']);
    expect(within(묶음).getByRole('button', { name: 'Android 앱 0건' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(within(묶음).getByRole('button', { name: 'PC 4건' }));
    expect(on디바이스).toHaveBeenLastCalledWith('desktop');

    rerender(띠('desktop', on디바이스));
    const PC = screen.getByRole('button', { name: 'PC 4건' });
    expect(PC.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(PC);
    expect(on디바이스).toHaveBeenLastCalledWith('ALL');
  });

  it('디바이스가 하나이거나 실패가 없으면 단추가 없다', () => {
    render(<RunSummary counts={집계(9, 1, 0)} 실패케이스수={1} insights={null} 판정="ALL" on판정={() => undefined} 디바이스실패={[{ platform: 'desktop', 수: 1 }]} />);
    expect(screen.queryByRole('group', { name: '디바이스별 실패 케이스' })).toBeNull();
    cleanup();
    render(<RunSummary counts={집계(10, 0, 0)} 실패케이스수={0} insights={null} 판정="ALL" on판정={() => undefined} 디바이스실패={나눔.map((d) => ({ ...d, 수: 0 }))} />);
    expect(screen.queryByRole('group', { name: '디바이스별 실패 케이스' })).toBeNull();
  });
});
