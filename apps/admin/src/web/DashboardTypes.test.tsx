// @vitest-environment jsdom
// 대시보드 「실패 유형」 칸 검사 (도메인/리포팅 §8.12 「실패 유형」 · DESIGN.md 「대시보드」). 칸 자리 · 차례는 Dashboard.test 가 본다

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 실패유형칸 } from './DashboardTypes.js';

type 유형 = 대시보드응답['failureTypes']['types'][number]['type'];

function 칸을그린다(나눔: Partial<Record<유형, [number, number]>>, stopped = 0) {
  const 차례 = ['mismatch', 'notFound', 'timeout', 'environment', 'other'] as const;
  const 값 = {
    window: { tz: 'UTC', today: '2026-10-12', days: 14, from: '2026-09-29', previousFrom: '2026-09-15' },
    passRate: { current: { pass: 0, fail: 10, notRun: 0 }, previous: { pass: 0, fail: 0, notRun: 0 } },
    daily: [] as 대시보드응답['daily'],
    failureTypes: { types: 차례.map((type) => ({ type, fail: 나눔[type]?.[0] ?? 0, notRun: 나눔[type]?.[1] ?? 0 })), stopped },
  } as 대시보드응답;
  render(<실패유형칸 값={값} />);
  return screen.getByText('실패 유형', { selector: 'h2' }).closest('section')!;
}

afterEach(() => {
  cleanup();
});

describe('실패 유형 칸', () => {
  it('다섯 유형을 늘 같은 차례로 두고 건수 · 몫 · 실패와 미실행 나눔을 적는다 — 멈춘 것은 따로 한 줄', () => {
    const 칸 = 칸을그린다({ mismatch: [6, 0], notFound: [1, 3] }, 2);
    expect(칸.classList.contains('dash-flat')).toBe(true);
    expect(within(칸).getByRole('heading').textContent).toBe('실패 유형 10건');
    const 줄들 = [...칸.querySelectorAll('.dash-types-list > li')];
    expect(줄들.map((줄) => 줄.querySelector('.dash-types-head > :first-child')!.textContent)).toEqual([
      '기대 결과 불일치',
      '요소 미검출',
      '타임아웃',
      '환경 오류',
      '그 밖',
    ]);
    expect(줄들[0]!.textContent).toContain('60%');
    expect(within(줄들[1] as HTMLElement).getByRole('img').getAttribute('aria-label')).toBe('실패 1 · 미실행 3');
    expect(줄들[1]!.textContent).toContain('실패 1 · 미실행 3 — 화면에서 버튼 · 입력 칸을 끝내 찾지 못함');
    expect(줄들[2]!.textContent).toContain('제한 시간 안에 끝나지 않음');
    expect(줄들[2]!.textContent).not.toContain('실패 0');
    expect(within(칸).getByText('실행이 멈춰 돌지 못한 2건은 세지 않았습니다')).toBeTruthy();
  });

  it('실패 · 미실행이 하나도 없으면 줄 대신 짧게 알린다', () => {
    const 칸 = 칸을그린다({});
    expect(within(칸).getByText('최근 14일 실패 · 미실행이 없습니다')).toBeTruthy();
    expect(칸.querySelector('.dash-types-list')).toBeNull();
    expect(칸.textContent).not.toContain('세지 않았습니다');
  });

  it('멈춘 미실행뿐이면 「없습니다」를 띄우지 않고 멈춘 수만 적는다 — 통과율 칸에는 미실행이 보인다', () => {
    const 칸 = 칸을그린다({}, 3);
    expect(칸.textContent).not.toContain('미실행이 없습니다');
    expect(within(칸).getByText('실행이 멈춰 돌지 못한 3건은 세지 않았습니다')).toBeTruthy();
  });
});
