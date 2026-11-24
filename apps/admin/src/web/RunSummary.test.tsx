// @vitest-environment jsdom
// 결과 화면 요약 한 줄 검사 — 통과율 · 판정 막대와 칩 · 직전 실행 대비 (도메인/실행 §8.3)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type ItemStatus, type RunCounts, type RunInsights, type RunItemSummary } from './api.js';
import { RunSummary, type 변화칸 } from './RunSummary.js';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
});

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

const 항목줄 = (historyId: number, tcId: string, platform: 'desktop' | 'mobile' = 'desktop'): RunItemSummary => ({
  historyId, tcId, tcName: `${tcId} 이름`, platform, attempt: 1, params: {}, paramSchema: {}, status: 'PASS',
  durationMs: 1, error: null, startedAt: '2026-10-01T00:00:00Z', finishedAt: '2026-10-01T00:00:01Z',
});

function 그린다(
  counts: RunCounts,
  insights: RunInsights | null = null,
  판정: ItemStatus | 'ALL' = 'ALL',
  on판정: (v: ItemStatus | 'ALL') => void = () => undefined,
  거르개: { 변화?: 변화칸 | null; on변화?: (v: 변화칸 | null) => void; 항목들?: RunItemSummary[] } = {},
) {
  return render(<RunSummary counts={counts} insights={insights} 판정={판정} on판정={on판정} {...거르개} />);
}

describe('요약 한 줄 — 통과율과 숫자', () => {
  it('통과율은 통과 ÷ (통과 + 실패 + 미실행) 이고 소수 한 자리다', () => {
    const { container } = 그린다(집계(47, 2, 1));
    expect(container.querySelector('.rf-rate b')?.textContent).toBe('94.0%');
    expect(container.querySelector('.rf-rate')?.textContent).toContain('통과율');
  });

  it('판정 막대에 통과 · 실패 · 미실행 세 칸이 있고 길이가 그 수다', () => {
    const { container } = 그린다(집계(40, 5, 5));
    const 막대 = container.querySelector('.rf-bar') as HTMLElement;
    expect(막대.getAttribute('aria-hidden')).toBe('true');
    expect([...막대.querySelectorAll('i')].map((칸) => (칸 as HTMLElement).style.flexGrow)).toEqual(['40', '5', '5']);
  });

  it('항목이 없으면 「—」와 「항목 없음」이다', () => {
    const { container } = 그린다(집계(0, 0, 0));
    expect(container.querySelector('.rf-rate b')?.textContent).toBe('—');
    expect(screen.getByText('항목 없음')).toBeTruthy();
  });

  it('중단 실행처럼 미실행만 있으면 0.0% 를 그대로 보인다', () => {
    const { container } = 그린다(집계(0, 0, 8));
    expect(container.querySelector('.rf-rate b')?.textContent).toBe('0.0%');
    expect(screen.queryByText('항목 없음')).toBeNull();
  });

  it('미확정 항목도 통과율과 숫자에 들어가고 「그중 미확정 N건」 한 줄만 단다', () => {
    const { container } = 그린다(집계(47, 3, 0, 2));
    expect(container.querySelector('.rf-rate b')?.textContent).toBe('94.0%');
    expect(screen.getByRole('button', { name: /^전체/ }).textContent).toBe('전체 50');
    expect(screen.getByText('그중 미확정 2건')).toBeTruthy();
  });

  it('미확정이 없으면 「그중 미확정」 글이 없다', () => {
    그린다(집계(47, 3, 0));
    expect(screen.queryByText(/미확정/)).toBeNull();
  });

  it('걷어낸 글이 없다 — 「Fail 케이스 N건」 · 「항목 N건 중 M건 Pass」는 서지 않는다', () => {
    그린다(집계(47, 3, 0));
    expect(screen.queryByText(/Fail 케이스/)).toBeNull();
    expect(screen.queryByText(/건 중 .*건 Pass/)).toBeNull();
  });
});

describe('요약 한 줄 — 판정 칩', () => {
  it('네 칸이 버튼이고 수는 항목 수다', () => {
    그린다(집계(47, 3, 1));
    const 칸 = within(screen.getByRole('group', { name: /판정별 보기/ })).getAllByRole('button');
    expect(칸.map((b) => b.textContent)).toEqual(['전체 51', 'Pass 47', 'Fail 3', 'Not tested 1']);
  });

  it('Blocked 는 칩이 아니라 Not tested 칩 안의 괄호다 — 0 이면 괄호가 없다', () => {
    그린다({ ...집계(47, 3, 4), blocked: 2 });
    expect(screen.getByRole('button', { name: /^Not tested/ }).textContent).toBe('Not tested 4(Blocked 2)');
    expect(within(screen.getByRole('group', { name: /판정별 보기/ })).getAllByRole('button')).toHaveLength(4);
    cleanup();
    그린다({ ...집계(47, 3, 4), blocked: 0 });
    expect(screen.getByRole('button', { name: /^Not tested/ }).textContent).toBe('Not tested 4');
    cleanup();
    그린다(집계(47, 3, 4));
    expect(screen.queryByText(/Blocked/)).toBeNull();
  });

  it('고른 칸만 aria-pressed 가 true 이고 누르면 on판정 이 그 값으로 불린다', () => {
    const on판정 = vi.fn();
    그린다(집계(47, 3, 1), null, 'FAIL', on판정);
    expect(screen.getByRole('button', { name: /^Fail/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^전체/ }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /^Pass/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Not tested/ }));
    fireEvent.click(screen.getByRole('button', { name: /^전체/ }));
    expect(on판정.mock.calls.map((c) => c[0])).toEqual(['PASS', 'NA', 'ALL']);
  });
});

describe('요약 한 줄 — 이전 실행 대비', () => {
  it('직전 실행 번호와 회귀 실패 · 기존 실패 · 해결 수를 보인다', () => {
    그린다(집계(47, 3, 0), 견줌());
    const 고리 = screen.getByRole('link', { name: 'RUN 1038' });
    expect(고리.getAttribute('href')).toBe('#/runs/1038');
    expect(고리.parentElement?.textContent).toBe('이전 실행 RUN 1038 대비');
    const 수 = (이름: string) => screen.getByRole('button', { name: new RegExp(`^${이름}`) }).textContent;
    expect(수('회귀 실패')).toBe('회귀 실패 2');
    expect(수('기존 실패')).toBe('기존 실패 1');
    expect(수('해결')).toBe('해결 3');
  });

  it('회귀 실패를 누르면 그 변화로 거르고 한 번 더 누르면 푼다 (점검 2.20)', () => {
    const on변화 = vi.fn();
    그린다(집계(47, 3, 0), 견줌(), 'ALL', undefined, { 변화: null, on변화 });
    fireEvent.click(screen.getByRole('button', { name: /^회귀 실패/ }));
    expect(on변화).toHaveBeenLastCalledWith('새로깨짐');
    cleanup();
    그린다(집계(47, 3, 0), 견줌(), 'ALL', undefined, { 변화: '새로깨짐', on변화 });
    expect(screen.getByRole('button', { name: /^회귀 실패/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /^회귀 실패/ }));
    expect(on변화).toHaveBeenLastCalledWith(null);
  });

  it('수가 0 이거나 거르는 길이 없으면 회귀 · 기존 실패 칸은 눌리지 않는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 케이스들: [] }), 'ALL', undefined, { on변화: vi.fn() });
    expect((screen.getByRole('button', { name: /^회귀 실패/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    그린다(집계(47, 3, 0), 견줌());
    expect((screen.getByRole('button', { name: /^회귀 실패/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('해결이 0 이면 해결 칸도 눌리지 않는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 케이스들: 견줌().케이스들.filter((c) => c.판정 !== '고쳐짐') }));
    expect((screen.getByRole('button', { name: /^해결/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /^해결/ }).textContent).toBe('해결 0');
  });

  it('해결을 누르면 아래 해결 목록이 펴진다', () => {
    const { container } = 그린다(집계(47, 3, 0), 견줌());
    const 접이 = container.querySelector('details') as HTMLDetailsElement;
    expect(접이.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^해결/ }));
    expect(접이.open).toBe(true);
  });

  it('직전 대비 수는 케이스 수다 — 한 케이스가 디바이스 둘에서 새로 깨져도 1이다', () => {
    const 둘 = (['desktop', 'mobile'] as const).map((platform) => ({ tcId: 'ZRS-1', tcName: '케이스', platform, 판정: '새로깨짐' as const }));
    그린다(집계(47, 3, 0), 견줌({ 케이스들: 둘 }));
    expect(screen.getByRole('button', { name: /^회귀 실패/ }).textContent).toBe('회귀 실패 1');
  });

  it('주소가 바뀌었으면 한 줄로 알리고 빠진 케이스가 있으면 건수를 적는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 주소바뀜: true, 빠진건수: 3 }), 'ALL', undefined, { 항목들: ['ZRS-001', 'ZRS-002', 'ZRS-003', 'ZRS-004'].map((id, i) => 항목줄(i, id)) });
    expect(screen.getByText('이전 실행은 다른 주소에서 실행됐습니다')).toBeTruthy();
    expect(screen.getByText(/이전 실행에 있었으나 이번에 실행되지 않은 케이스 3건/)).toBeTruthy();
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
    그린다(집계(2, 0, 0), 견줌({ 빠진건수: 1 }), 'ALL', undefined, { 항목들: [줄(11, 'ZRS-001'), 줄(12, 'ZRS-002')] });
    expect(직전).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /이번에 실행되지 않은 케이스 1건/ }));

    await waitFor(() => expect(screen.getByText('ZRS-003 이름', { exact: false })).toBeTruthy());
    expect(직전).toHaveBeenCalledWith(1038);
    expect(screen.queryByText('ZRS-001 이름', { exact: false })).toBeNull();
  });

  it('빠진 케이스 목록은 케이스 하나를 한 줄로 보이고 빠진 디바이스를 모은다 (WEB-F9-20)', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({
      runId: 1038, title: '앞', triggeredBy: 'u', triggeredByName: null, env: 'qa', baseUrl: '', serviceName: 'ZRS', status: 'FINISHED',
      startedAt: '2026-10-01T00:00:00Z', finishedAt: '2026-10-01T00:01:00Z', counts: { total: 3, pass: 3, fail: 0, na: 0, running: 0 },
      items: [항목줄(1, 'ZRS-001'), 항목줄(2, 'ZRS-003'), 항목줄(3, 'ZRS-003', 'mobile')], evidence: [],
    });
    그린다(집계(3, 0, 0), 견줌({ 빠진건수: 1 }), 'ALL', undefined, { 항목들: [항목줄(11, 'ZRS-001'), 항목줄(12, 'ZRS-002')] });

    fireEvent.click(screen.getByRole('button', { name: /이번에 실행되지 않은 케이스 1건/ }));

    await waitFor(() => expect(screen.getAllByText('ZRS-003 이름', { exact: false })).toHaveLength(1));
  });

  it('일부만 골라 돌린 실행(빠진 케이스 수가 이번에 돈 케이스 수보다 많다)이면 빠진 케이스 줄을 감춘다 (점검표 B15e)', () => {
    그린다(집계(6, 0, 0), 견줌({ 빠진건수: 598 }), 'ALL', undefined, { 항목들: [항목줄(1, 'ZRS-001')] });
    expect(screen.queryByText(/이번에 실행되지 않은/)).toBeNull();
  });

  it('빠진 케이스 수가 이번에 돈 케이스 수와 같아도 감춘다 — 케이스 2건 × 디바이스 2 × 2회 = 8항목이어도 케이스로 센다 (WEB-F9-20)', () => {
    const 항목들 = ['ZRS-001', 'ZRS-002'].flatMap((id, i) => (['desktop', 'mobile'] as const).flatMap((p, j) => [항목줄(i * 10 + j * 2, id, p), 항목줄(i * 10 + j * 2 + 1, id, p)]));
    그린다(집계(8, 0, 0), 견줌({ 빠진건수: 2 }), 'ALL', undefined, { 항목들 });
    expect(screen.queryByText(/이번에 실행되지 않은/)).toBeNull();
  });

  it('빠진 케이스가 이번에 돈 케이스보다 적으면 줄이 선다', () => {
    그린다(집계(3, 0, 0), 견줌({ 빠진건수: 1 }), 'ALL', undefined, { 항목들: [항목줄(1, 'ZRS-001'), 항목줄(2, 'ZRS-002')] });
    expect(screen.getByText(/이번에 실행되지 않은 케이스 1건/)).toBeTruthy();
  });

  it('주소가 같고 빠진 것이 없으면 그 두 줄이 없다', () => {
    그린다(집계(47, 3, 0), 견줌());
    expect(screen.queryByText(/다른 주소/)).toBeNull();
    expect(screen.queryByText(/이번에 실행되지 않은/)).toBeNull();
  });

  it('insights 가 null 이면 대비 칸이 아예 없다', () => {
    const { container } = 그린다(집계(47, 3, 0), null);
    expect(container.querySelector('.rf-diff')).toBeNull();
    expect(screen.queryByText(/이전 실행/)).toBeNull();
  });

  it('previous 가 null 이면 대비 칸이 아예 없다', () => {
    const { container } = 그린다(집계(47, 3, 0), 견줌({ previous: null, 케이스들: [] }));
    expect(container.querySelector('.rf-diff')).toBeNull();
    expect(screen.queryByText(/이전 실행/)).toBeNull();
  });
});
