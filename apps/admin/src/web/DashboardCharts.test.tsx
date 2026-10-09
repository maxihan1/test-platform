// @vitest-environment jsdom
// 앱 대시보드 그래프 셋 검사 — 일별 막대 · 실패 히트맵 · 요구사항 커버리지 게이지 · 통과율 선 (DESIGN.md 「대시보드」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api } from './api.js';
import { Dashboard } from './Dashboard.js';

const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;

const 날들 = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 8, 24 + i)).toISOString().slice(0, 10));

function 건(pass: number, fail: number, notRun: number) {
  return { pass, fail, notRun };
}

const 많은날들 = 날들.map((day, i) => ({ day, ...건(10 + i, i % 3, i % 4 === 1 ? 1 : 0) }));

function 칸들(열: number[]): (0 | 1 | 2)[] {
  return 날들.map((_, i) => (열.includes(i) ? (i % 2 === 0 ? 1 : 2) : 0));
}

const 히트 = Array.from({ length: 8 }, (_, i) => ({
  tcId: `ZDA-${String(i + 1).padStart(3, '0')}`,
  tcName: i === 2 ? '아주 길어서 줄 머리 칸에 다 들어가지 않는 케이스 이름이 한참 이어집니다' : `케이스 ${i + 1}`,
  failCount: 9 - i,
  cells: 칸들([i, i + 2, 13]),
}));

function 응답(고침: Partial<대시보드응답> = {}): 대시보드응답 {
  return {
    window: { tz: 시간대, today: '2026-10-07', days: 14, from: '2026-09-24', previousFrom: '2026-09-10' },
    services: [
      { id: 1, name: 'ZDA 결제' },
      { id: 2, name: 'ZDA 회원' },
      { id: 3, name: 'ZDA 배송' },
    ],
    passRate: { current: 건(174, 20, 6), previous: 건(83, 14, 3) },
    daily: 많은날들,
    newFailures: [],
    byService: [],
    heatmap: 히트,
    coverage: [
      { serviceId: 1, serviceName: 'ZDA 결제', cased: 34, total: 40, ratio: 0.85, casedFn: 32, casedUi: 10, finishedAt: '2026-10-05T12:00:00.000Z', requestId: 12 },
      { serviceId: 2, serviceName: 'ZDA 회원', cased: 0, total: 0, ratio: null, casedFn: 0, casedUi: 0, finishedAt: '2026-10-02T12:00:00.000Z', requestId: 9 },
    ],
    running: [],
    unconfirmed: 0,
    ...고침,
  };
}

function 읽기를(값: 대시보드응답) {
  return vi.spyOn(api, 'dashboard').mockResolvedValue(값 as never);
}

function 움직임줄이기() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
}

const 서비스열기 = vi.fn();

/** 작성 칸이 read 이상인 배정 서비스 — 커버리지 줄은 이 목록으로 만든다 */
const 기본재료 = {
  케이스갈수있나: true,
  작성서비스: [
    { id: 1, name: 'ZDA 결제' },
    { id: 2, name: 'ZDA 회원' },
    { id: 3, name: 'ZDA 배송' },
  ],
};

async function 열기(값: 대시보드응답) {
  읽기를(값);
  const 결과 = render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
  await screen.findByText('일별 테스트 결과');
  return 결과;
}

beforeEach(움직임줄이기);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('일별 테스트 결과', () => {
  it('막대 14개가 서고 막대마다 날짜 · 요일 · 판정 건수가 이름이다', async () => {
    const { container } = await 열기(응답());
    const 판 = container.querySelector('.dash-daily')!;
    const 막대들 = 판.querySelectorAll('svg g.dash-day');
    expect(막대들).toHaveLength(14);
    expect(막대들[13]!.querySelector('title')!.textContent).toBe('10/7 (수) 통과 23 · 미실행 1 · 실패 1');
    expect(막대들[1]!.querySelector('title')!.textContent).toBe('9/25 (금) 통과 11 · 미실행 1 · 실패 1');
  });

  it('아래부터 통과 · 미실행 · 실패 순으로 쌓고 건수가 0 인 마디는 그리지 않는다', async () => {
    const { container } = await 열기(응답());
    const 막대들 = container.querySelectorAll('.dash-daily svg g.dash-day');
    const 클래스 = (칸: Element) => [...칸.querySelectorAll('rect')].map((r) => r.getAttribute('class'));
    expect(클래스(막대들[0]!)).toEqual(['p']);
    expect(클래스(막대들[13]!)).toEqual(['p', 'n', 'f']);
    const 위치 = [...막대들[13]!.querySelectorAll('rect')].map((r) => Number(r.getAttribute('y')));
    expect(위치[0]).toBeGreaterThan(위치[1]!);
    expect(위치[1]).toBeGreaterThan(위치[2]!);
  });

  it('날짜 · 요일 · 실패 숫자는 SVG 가 아니라 HTML 이다', async () => {
    const { container } = await 열기(응답());
    const 판 = container.querySelector('.dash-daily')!;
    expect(판.querySelectorAll('svg text')).toHaveLength(0);
    const 날짜칸 = 판.querySelectorAll('.dash-days > span');
    expect(날짜칸).toHaveLength(14);
    expect(날짜칸[13]!.textContent).toBe('10/7수');
    expect(within(판 as HTMLElement).getAllByText('1', { selector: '.dash-fail-top' }).length).toBeGreaterThan(0);
  });

  it('주말에는 띠를 깐다', async () => {
    const { container } = await 열기(응답());
    expect(container.querySelectorAll('.dash-daily svg rect.dash-weekend')).toHaveLength(4);
  });

  it('통과 · 미실행 · 실패의 범례가 글자로 있다', async () => {
    const { container } = await 열기(응답());
    const 범례 = container.querySelector('.dash-daily .dash-key')!;
    expect(범례.textContent).toContain('통과');
    expect(범례.textContent).toContain('미실행');
    expect(범례.textContent).toContain('실패');
  });

  it('실행한 날이 셋 미만이면 정기 실행 안내 한 줄이 가운데 선다', async () => {
    const 적음 = 날들.map((day, i) => ({ day, ...(i >= 12 ? 건(8, 1, 0) : 건(0, 0, 0)) }));
    const { container } = await 열기(응답({ daily: 적음 }));
    const 판 = container.querySelector('.dash-daily')!;
    expect(판.textContent).toContain('하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다');
    expect(판.querySelectorAll('rect.p')).toHaveLength(2);
  });

  it('실행한 날이 셋 이상이면 안내가 없다', async () => {
    const { container } = await 열기(응답());
    expect(container.querySelector('.dash-daily')!.textContent).not.toContain('정기 실행을 켜 두면');
  });

  it('응답이 비어 있어도 14칸 자리를 그린다', async () => {
    const { container } = await 열기(응답({ daily: [] }));
    expect(container.querySelectorAll('.dash-daily svg g.dash-day')).toHaveLength(14);
  });
});

describe('실패 히트맵', () => {
  it('그림 전체에 요약 이름 하나가 있다', async () => {
    await 열기(응답());
    const 그림 = screen.getByRole('img', { name: /최근 14일 실패가 많은 케이스 8개/ });
    expect(그림.textContent).toContain('ZDA-001');
  });

  it('줄마다 등폭 TC ID 와 이름이 머리에 있고 14칸이 이어진다', async () => {
    const { container } = await 열기(응답());
    const 줄들 = container.querySelectorAll('.dash-heat .dash-heat-row');
    expect(줄들).toHaveLength(8);
    const 셋째 = 줄들[2]!;
    expect(셋째.querySelector('.mono')!.textContent).toBe('ZDA-003');
    expect(셋째.querySelector('.dash-heat-name')!.textContent).toContain('아주 길어서');
    expect(셋째.querySelectorAll('i')).toHaveLength(14);
  });

  it('칸은 title 만 갖고 색 단계는 0 · 1 · 2 이상 셋이다', async () => {
    const { container } = await 열기(응답());
    const 첫줄 = container.querySelector('.dash-heat .dash-heat-row')!;
    const 칸 = [...첫줄.querySelectorAll('i')];
    expect(칸[0]!.getAttribute('class')).toBe('h1');
    expect(칸[0]!.getAttribute('title')).toBe('ZDA-001 9/24 실패 1회');
    expect(칸[1]!.getAttribute('class')).toBe('h0');
    expect(칸[1]!.getAttribute('title')).toBe('ZDA-001 9/25 실패 없음');
    const 둘째줄 = container.querySelectorAll('.dash-heat .dash-heat-row')[1]!;
    expect(둘째줄.querySelectorAll('i')[3]!.getAttribute('title')).toBe('ZDA-002 9/27 실패 2회 이상');
    expect(둘째줄.querySelectorAll('i')[3]!.getAttribute('class')).toBe('h2');
  });

  it('눈금은 0 · 1 · 2 이상이고 날짜 축이 14칸이다', async () => {
    const { container } = await 열기(응답());
    const 눈금 = container.querySelector('.dash-heat .dash-key')!;
    expect(눈금.textContent).toContain('0');
    expect(눈금.textContent).toContain('1');
    expect(눈금.textContent).toContain('2 이상');
    expect(container.querySelectorAll('.dash-heat .dash-heat-days > span')).toHaveLength(14);
  });

  it('실패가 없어도 바닥 칸 한 줄을 그리고 이유를 적는다', async () => {
    const { container } = await 열기(응답({ heatmap: [] }));
    const 줄들 = container.querySelectorAll('.dash-heat .dash-heat-row');
    expect(줄들).toHaveLength(1);
    expect(줄들[0]!.querySelectorAll('i.h0')).toHaveLength(14);
    expect(screen.getByText('최근 14일 실패한 케이스가 없습니다')).toBeTruthy();
    expect(screen.getByRole('img', { name: '최근 14일 실패한 케이스가 없습니다' })).toBeTruthy();
  });
});

describe('요구사항 커버리지', () => {
  it('칸 머리에 마지막 작성 기준이 있다', async () => {
    const { container } = await 열기(응답());
    expect(container.querySelector('.dash-cov .dash-ttl')!.textContent).toContain('마지막 작성 기준');
  });

  it('기능 · UI 게이지 둘이 서비스를 합친 퍼센트와 덮은 요구 N / M 을 따로 보인다', async () => {
    const { container } = await 열기(응답());
    const 게이지들 = [...container.querySelectorAll('.dash-cov .dash-gauge-one')];
    expect(게이지들.map((g) => g.querySelector('.dash-gauge-kind')!.textContent)).toEqual(['기능 테스트', 'UI 테스트']);
    expect(게이지들.map((g) => g.querySelector('.dash-gauge-num')!.textContent)).toEqual(['80%', '25%']);
    expect(게이지들.map((g) => g.querySelector('.dash-gauge-cap')!.textContent)).toEqual(['덮은 요구 32 / 40', '덮은 요구 10 / 40']);
    expect(게이지들[0]!.querySelectorAll('.dash-gauge path.dash-gauge-v').length).toBeGreaterThan(0);
  });

  it('퍼센트는 올리지 않고 내린다 — 하나라도 덮지 못했으면 100 이 되지 않는다', async () => {
    const 거의 = 응답({
      coverage: [
        { serviceId: 1, serviceName: 'ZDA 결제', cased: 999, total: 1000, ratio: 0.999, casedFn: 999, casedUi: 0, finishedAt: '2026-10-05T12:00:00.000Z', requestId: 12 },
      ],
    });
    const { container } = await 열기(거의);
    expect(container.querySelector('.dash-gauge-num')!.textContent).toBe('99%');
  });

  it('서비스 줄에 이름 · 마지막 작성 날짜 링크 · 기능 · UI 막대와 퍼센트가 있다', async () => {
    const { container } = await 열기(응답());
    const 줄 = container.querySelectorAll('.dash-cov-row')[0]!;
    expect(줄.textContent).toContain('ZDA 결제');
    const 링크 = within(줄 as HTMLElement).getByRole('link');
    expect(링크.getAttribute('href')).toBe('#/authoring/12');
    expect(링크.textContent).toContain('10월 5일');
    expect([...줄.querySelectorAll('.dash-cov-pair')].map((짝) => 짝.textContent)).toEqual(['기능80%', 'UI25%']);
    expect(줄.querySelectorAll('.dash-cov-bar i')).toHaveLength(2);
    expect(줄.querySelector('.dash-cov-bar.ui i')).not.toBeNull();
  });

  it('갈래를 못 센 실행(이 칸 전)은 줄이 전체 막대 하나이고 게이지에서 빠지며 그 까닭을 한 줄로 적는다', async () => {
    const 옛 = 응답({
      coverage: [
        { serviceId: 1, serviceName: 'ZDA 결제', cased: 34, total: 40, ratio: 0.85, casedFn: 32, casedUi: 10, finishedAt: '2026-10-05T12:00:00.000Z', requestId: 12 },
        { serviceId: 2, serviceName: 'ZDA 회원', cased: 5, total: 60, ratio: 0.08, casedFn: null, casedUi: null, finishedAt: '2026-10-02T12:00:00.000Z', requestId: 9 },
      ],
    });
    const { container } = await 열기(옛);
    const 줄 = container.querySelectorAll('.dash-cov-row')[1]!;
    expect([...줄.querySelectorAll('.dash-cov-pair')].map((짝) => 짝.textContent)).toEqual(['전체8%']);
    expect(container.querySelector('.dash-gauge-cap')!.textContent).toBe('덮은 요구 32 / 40');
    expect(container.querySelector('.dash-gauge-note')!.textContent).toBe(
      '기능 · UI 를 나누기 전에 작성한 서비스 1개는 게이지에 넣지 않았습니다',
    );
  });

  it('모든 서비스가 갈래를 셌으면 까닭 줄이 없다', async () => {
    const { container } = await 열기(응답());
    expect(container.querySelector('.dash-gauge-note')).toBeNull();
  });

  it('요청 링크를 누르면 그 서비스로 바꾼다 — 작성 상세는 고른 서비스로 요청을 열고 대시보드에는 고르개가 없다', async () => {
    const { container } = await 열기(응답());
    서비스열기.mockClear();
    within(container.querySelectorAll('.dash-cov-row')[0] as HTMLElement).getByRole('link').click();
    expect(서비스열기).toHaveBeenCalledWith(1);
  });

  it('가운데 버튼으로 열어도 그 서비스로 바꾼다 — 새 탭은 저장된 고른 서비스를 읽는다', async () => {
    const { container } = await 열기(응답());
    서비스열기.mockClear();
    const 링크 = within(container.querySelectorAll('.dash-cov-row')[0] as HTMLElement).getByRole('link');
    fireEvent(링크, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    expect(서비스열기).toHaveBeenCalledWith(1);
  });

  it('오른쪽 단추(링크 주소 복사 메뉴)로는 서비스를 바꾸지 않는다 — 대시보드엔 고르개가 없어 바뀐 줄 모른다', async () => {
    const { container } = await 열기(응답());
    서비스열기.mockClear();
    const 링크 = within(container.querySelectorAll('.dash-cov-row')[0] as HTMLElement).getByRole('link');
    fireEvent(링크, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 2 }));
    expect(서비스열기).not.toHaveBeenCalled();
  });

  it('작성 칸이 none 인 서비스는 줄이 없다 — 「작성 기록이 없습니다」는 작성을 볼 수 있는 서비스에만 뜬다', async () => {
    읽기를(응답());
    const { container } = render(
      <Dashboard 서비스열기={서비스열기} {...기본재료} 작성서비스={기본재료.작성서비스.slice(0, 2)} />,
    );
    await screen.findByText('일별 테스트 결과');
    const 줄들 = [...container.querySelectorAll('.dash-cov-row')].map((줄) => 줄.textContent);
    expect(줄들).toHaveLength(2);
    expect(container.querySelector('.dash-cov')!.textContent).not.toContain('ZDA 배송');
  });

  it('요구가 0 이면 막대와 퍼센트를 비운다', async () => {
    const { container } = await 열기(응답());
    const 줄 = container.querySelectorAll('.dash-cov-row')[1]!;
    expect(줄.textContent).toContain('ZDA 회원');
    expect(줄.querySelector('.dash-cov-bar i')).toBeNull();
    expect([...줄.querySelectorAll('.num')].map((n) => n.textContent)).toEqual(['—', '—']);
  });

  it('작성 기록이 없는 서비스는 한 줄로 알린다', async () => {
    const { container } = await 열기(응답());
    const 줄 = container.querySelectorAll('.dash-cov-row')[2]!;
    expect(줄.textContent).toContain('ZDA 배송');
    expect(줄.textContent).toContain('작성 기록이 없습니다');
    expect(within(줄 as HTMLElement).queryByRole('link')).toBeNull();
  });

  it('요구가 하나도 없으면 게이지 가운데는 대시다', async () => {
    const { container } = await 열기(응답({ coverage: [] }));
    expect(container.querySelector('.dash-gauge-num')!.textContent).toBe('—');
    expect(container.querySelector('.dash-cov')!.textContent).not.toContain('덮은 요구');
  });
});

describe('화면 읽기 (PR #173 독립 검사)', () => {
  const 숨김 = (e: Element | null): boolean => e?.closest('[aria-hidden="true"]') != null;

  it('눈금 · 막대 위 실패 숫자 · 날짜 줄 · 게이지 눈금은 화면 읽기가 건너뛴다 — 맥락 없는 숫자가 이어 읽혔다', async () => {
    const { container } = await 열기(응답());
    for (const 선택자 of ['.dash-yaxis', '.dash-fail-top', '.dash-days', '.dash-heat-days', '.dash-tick']) {
      const 것들 = [...container.querySelectorAll(선택자)];
      expect(것들.length, 선택자).toBeGreaterThan(0);
      expect(것들.every(숨김), 선택자).toBe(true);
    }
  });

  it('일별 그림의 이름에 합계와 실패가 가장 많은 날이 있다', async () => {
    const { container } = await 열기(응답());
    expect(container.querySelector('.dash-daily svg')!.getAttribute('aria-label')).toBe(
      '최근 14일 통과 231 · 미실행 4 · 실패 13, 실패가 가장 많은 날 9/26',
    );
  });

  it('실패가 한 건도 없으면 가장 많은 날 말을 빼고 합계만 적는다', async () => {
    const 무실패 = 날들.map((day) => ({ day, ...건(5, 0, 0) }));
    const { container } = await 열기(응답({ daily: 무실패 }));
    expect(container.querySelector('.dash-daily svg')!.getAttribute('aria-label')).toBe('최근 14일 통과 70 · 미실행 0 · 실패 0');
  });
});

describe('통과율 칸의 일별 선', () => {
  it('실행한 날이 셋 이상일 때만 선이 선다', async () => {
    const { container } = await 열기(응답());
    const 칸 = container.querySelector('.dash-rate')!;
    expect(칸.querySelector('.dash-trend polyline')).not.toBeNull();
    expect(칸.querySelectorAll('.dash-trend-dot')).toHaveLength(14);
  });

  it('셋 미만이면 선이 없다', async () => {
    const 적음 = 날들.map((day, i) => ({ day, ...(i >= 12 ? 건(8, 1, 0) : 건(0, 0, 0)) }));
    const { container } = await 열기(응답({ daily: 적음 }));
    expect(container.querySelector('.dash-rate .dash-trend')).toBeNull();
  });
});
