// @vitest-environment jsdom
// 대시보드 「검토할 것」 세 칸 · AI 품질 줄 · 종류별 칸 (도메인/리포팅 §8.12 「검토할 것」 · 「종류별 칸」 · 도메인/BTS §8.15)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 종류칸, 응답시간 } from './DashboardKind.js';
import { AI품질줄, 검토할것, 결정갈곳 } from './DashboardReview.js';

const 빈건 = { pass: 0, fail: 0, notRun: 0 };

function 값(고침: Partial<대시보드응답> = {}): 대시보드응답 {
  const 서비스 = (serviceId: number, newFailureCount: number) => ({
    serviceId,
    serviceName: `앱${String(serviceId)}`,
    current: 빈건,
    currentUi: 빈건,
    previous: 빈건,
    lastRun: null,
    flow: [],
    newFailureCount,
    resolvedCount: 0,
    compared: true,
  });
  return {
    window: { tz: 'UTC', today: '2026-10-30', days: 14, from: '2026-10-17', previousFrom: '2026-10-03' },
    services: [],
    passRate: { current: { pass: 10, fail: 3, notRun: 2 }, previous: 빈건 },
    daily: [],
    newFailures: [],
    byService: [서비스(1, 5), 서비스(2, 3)],
    heatmap: [],
    coverage: [],
    running: [],
    unconfirmed: 0,
    failureTypes: {
      types: [
        { type: 'mismatch', fail: 2, notRun: 0 },
        { type: 'environment', fail: 1, notRun: 2 },
      ],
      stopped: 0,
    },
    decisions: [
      { serviceId: 1, count: 2 },
      { serviceId: 2, count: 4 },
    ],
    byKind: null,
    aiQuality: null,
    ...고침,
  };
}

const 칸찾기 = (이름: string) => screen.getByText(이름).closest('.dash-rv')!;

// 숫자가 0 부터 올라가는 움직임을 끈다 — 끄면 첫 그림부터 목표 수다
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => {
  cleanup();
});

describe('검토할 것', () => {
  it('회귀 실패는 서비스별 전체 수 · 결정 필요는 합 · 환경 오류는 실패와 미실행의 합이다', () => {
    render(<검토할것 값={값()} 이동={{ 서비스번호: null, 서비스열기: () => {} }} 서비스열기={() => {}} />);
    expect(칸찾기('회귀 실패').textContent).toContain('8');
    expect(칸찾기('결정 필요').textContent).toContain('6');
    expect(칸찾기('환경 오류').textContent).toContain('3');
  });

  it('결정 필요를 누르면 결정이 가장 많은 애플리케이션을 고르고 결정 목록으로 간다', () => {
    const 서비스열기 = vi.fn();
    render(<검토할것 값={값()} 이동={{ 서비스번호: null, 서비스열기: () => {} }} 서비스열기={서비스열기} />);
    const 고리 = 칸찾기('결정 필요');
    expect(고리.getAttribute('href')).toBe('#/authoring?todo=1');
    fireEvent.click(고리);
    expect(서비스열기).toHaveBeenCalledWith(2);
  });

  it('환경 오류는 실패한 실행 기록으로 가고, 회귀 실패는 같은 화면의 표로 내려가는 버튼이다', () => {
    render(<검토할것 값={값()} 이동={{ 서비스번호: null, 서비스열기: () => {} }} 서비스열기={() => {}} />);
    expect(칸찾기('환경 오류').getAttribute('href')).toBe('#/runs/fn?state=failed&days=14');
    expect(칸찾기('회귀 실패').tagName).toBe('BUTTON');
  });

  it('수가 0 이면 누르지 못하고, 작성 칸이 없으면 결정 필요는 「—」다', () => {
    const 비움 = 값({
      byService: [],
      decisions: [],
      failureTypes: { types: [{ type: 'environment', fail: 0, notRun: 0 }], stopped: 0 },
    });
    render(<검토할것 값={비움} 이동={{ 서비스번호: null, 서비스열기: () => {} }} 서비스열기={() => {}} />);
    for (const 이름 of ['회귀 실패', '결정 필요', '환경 오류']) expect(칸찾기(이름).tagName).toBe('DIV');
    expect(칸찾기('결정 필요').textContent).toContain('—');
  });

  it('결정이 모두 0 이면 갈 곳이 없고, 같은 수면 번호가 작은 애플리케이션이다', () => {
    expect(결정갈곳([{ serviceId: 3, count: 0 }])).toBeNull();
    expect(결정갈곳([{ serviceId: 9, count: 2 }, { serviceId: 4, count: 2 }])).toBe(4);
  });
});

describe('종류별 칸', () => {
  it('웹은 「브라우저별 결과」이고 디바이스 이름에 Chromium 을 붙여 통과율을 보인다', () => {
    render(
      <종류칸
        칸={{ onlyFail: [], fps: null, kind: 'SCREEN', rows: [{ label: 'desktop', pass: 47, fail: 3, notRun: 0, p95Ms: null }] }}
        일={14}
      />,
    );
    expect(screen.getByRole('heading', { name: '브라우저별 결과' })).toBeTruthy();
    expect(screen.getByText('PC · Chromium')).toBeTruthy();
    expect(screen.getByText('94%')).toBeTruthy();
  });

  it('앱은 기기 정보가 없는 결과를 막대로 세우지 않고 칸 아래 한 줄로 센다 — 실제 기기와 섞이지 않는다', () => {
    const { container } = render(
      <종류칸
        칸={{
          onlyFail: [],
          fps: null,
          kind: 'APP',
          rows: [
            { label: 'SM-G996N · Android 15', pass: 3, fail: 1, notRun: 0, p95Ms: null },
            { label: null, pass: 1, fail: 0, notRun: 1, p95Ms: null },
          ],
        }}
        일={14}
      />,
    );
    expect(screen.getByRole('heading', { name: '기기별 결과' })).toBeTruthy();
    expect(container.querySelectorAll('.dash-kind-list li')).toHaveLength(1);
    expect(screen.queryByText('기기 정보 없음')).toBeNull();
    expect(screen.getByText('기기 정보 없는 결과 2건')).toBeTruthy();
  });

  it('API 는 엔드포인트마다 95% 응답과 통과 / 전체를 표로 보인다', () => {
    render(
      <종류칸
        칸={{ onlyFail: [], fps: null, kind: 'API', rows: [{ label: 'PATCH /notifications/:n/read', pass: 11, fail: 1, notRun: 0, p95Ms: 2100 }] }}
        일={7}
      />,
    );
    expect(screen.getByText('PATCH')).toBeTruthy();
    expect(screen.getByText('/notifications/:n/read')).toBeTruthy();
    expect(screen.getByText('2.1s')).toBeTruthy();
    expect(screen.getByText('11/12')).toBeTruthy();
  });

  it('줄이 없으면 결과가 없다는 한 줄이고, 응답 시간이 없으면 「—」다', () => {
    render(<종류칸 칸={{ onlyFail: [], fps: null, kind: 'GAME', rows: [] }} 일={30} />);
    expect(screen.getByText('최근 30일 결과가 없습니다')).toBeTruthy();
    expect(응답시간(null)).toBe('—');
    expect(응답시간(182)).toBe('182ms');
  });

  it('칸 아래 한 줄 — 웹은 모바일에서만, 앱은 기기마다, 게임은 FPS 이고 셀 것이 없으면 없다', () => {
    const 줄 = { label: 'mobile', pass: 3, fail: 1, notRun: 0, p95Ms: null };
    const { rerender, container } = render(
      <종류칸 칸={{ kind: 'SCREEN', rows: [줄], onlyFail: [{ label: 'mobile', count: 7 }], fps: null }} 일={7} />,
    );
    expect(screen.getByText('모바일에서만 실패한 케이스 7건')).toBeTruthy();
    rerender(
      <종류칸
        칸={{ kind: 'APP', rows: [줄], onlyFail: [{ label: 'Galaxy A34 · Android 13', count: 9 }, { label: 'Pixel 7 · Android 14', count: 2 }], fps: null }}
        일={7}
      />,
    );
    expect(screen.getByText('Galaxy A34 · Android 13 에서만 실패한 케이스 9건, Pixel 7 · Android 14 에서만 실패한 케이스 2건')).toBeTruthy();
    rerender(<종류칸 칸={{ kind: 'GAME', rows: [], onlyFail: [], fps: { runs: 2, avg: 54.3, drops: 3, below: 30 } }} 일={7} />);
    expect(screen.getByText('게임 성능 측정 2회 · 평균 FPS 54.3 · 30 아래로 떨어짐 3회')).toBeTruthy();
    rerender(<종류칸 칸={{ kind: 'APP', rows: [줄], onlyFail: [], fps: null }} 일={7} />);
    expect(container.querySelector('.dash-kind-note')).toBeNull();
  });
});

describe('AI 품질줄', () => {
  it('BTS 를 안 이은 범위면 줄이 없다', () => {
    const { container } = render(<AI품질줄 값={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('두 숫자를 율과 셈으로 · 셀 것이 없는 쪽은 「아직 없음」', () => {
    render(<AI품질줄 값={{ draft: { picked: 41, written: 50 }, fix: { merged: 3, opened: 5 } }} />);
    expect(screen.getByText('초안 AI 82% (41/50줄)')).toBeTruthy();
    expect(screen.getByText('수정 AI 60% (3/5 PR)')).toBeTruthy();
    cleanup();
    render(<AI품질줄 값={{ draft: { picked: 0, written: 0 }, fix: { merged: 0, opened: 0 } }} />);
    expect(screen.getByText('초안 AI 아직 없음')).toBeTruthy();
    expect(screen.getByText('수정 AI 아직 없음')).toBeTruthy();
  });
});
