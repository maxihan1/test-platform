// @vitest-environment jsdom
// 결과 화면 요약 띠 검사 — 통과율 도넛 · 실패 수 · 판정별 보기 · 직전 실행 대비 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { ItemStatus, RunCounts, RunInsights } from './api.js';
import { RunSummary } from './RunSummary.js';

afterEach(cleanup);

function 집계(pass: number, fail: number, na: number, 미확정?: RunCounts['unconfirmed']): RunCounts {
  return { total: pass + fail + na + (미확정?.total ?? 0), pass, fail, na, running: 0, unconfirmed: 미확정 };
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
) {
  return render(<RunSummary counts={counts} insights={insights} 판정={판정} on판정={on판정} />);
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

  it('확정 항목이 없으면 「—」와 「확정 항목 없음」이다', () => {
    const { container } = 그린다(집계(0, 0, 0, { total: 3, pass: 2, fail: 1, na: 0 }));
    expect(container.querySelector('.rs-big')?.textContent).toBe('—');
    expect(screen.getByText('확정 항목 없음')).toBeTruthy();
    expect(screen.queryByText(/중 .*건 통과/)).toBeNull();
  });

  it('중단 실행처럼 미실행만 있으면 0.0% 를 그대로 보인다', () => {
    const { container } = 그린다(집계(0, 0, 8));
    expect(container.querySelector('.rs-big')?.textContent).toBe('0.0%');
    expect(screen.queryByText('확정 항목 없음')).toBeNull();
  });

  it('「실패 N건」과 「항목 N건 중 M건 통과」를 적는다', () => {
    const { container } = 그린다(집계(47, 3, 0));
    expect(screen.getByText('실패 3건')).toBeTruthy();
    expect(container.querySelector('.v-fail')).not.toBeNull();
    expect(screen.getByText('항목 50건 중 47건 통과')).toBeTruthy();
  });

  it('실패가 0건이면 실패 색을 안 쓴다', () => {
    const { container } = 그린다(집계(10, 0, 0));
    expect(screen.getByText('실패 0건')).toBeTruthy();
    expect(container.querySelector('.v-fail')).toBeNull();
  });

  it('미확정이 있으면 묶음 글자 한 줄을 단다', () => {
    그린다(집계(47, 3, 0, { total: 2, pass: 1, fail: 1, na: 0 }));
    expect(screen.getByText('미확정 2(통과 1 · 실패 1)')).toBeTruthy();
  });

  it('미확정이 없으면 묶음 글자가 없다', () => {
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
  it('직전 실행 번호와 신규 실패 · 연속 실패 · 해결 수를 보이고 누르는 칸이 아니다', () => {
    그린다(집계(47, 3, 0), 견줌());
    expect(screen.getByText(/직전 실행 RUN 1038 대비/)).toBeTruthy();
    const 수 = (이름: string) =>
      within(screen.getByText(이름).closest('.rs-stat') as HTMLElement).getByText(/^\d+$/).textContent;
    expect(수('신규 실패')).toBe('2');
    expect(수('연속 실패')).toBe('1');
    expect(수('해결')).toBe('3');
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('주소가 바뀌었으면 한 줄로 알리고 빠진 케이스가 있으면 건수를 적는다', () => {
    그린다(집계(47, 3, 0), 견줌({ 주소바뀜: true, 빠진건수: 3 }));
    expect(screen.getByText('직전 실행은 다른 주소에서 실행됐습니다')).toBeTruthy();
    expect(screen.getByText('직전 실행에 있었으나 이번에 실행되지 않은 케이스 3건')).toBeTruthy();
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
