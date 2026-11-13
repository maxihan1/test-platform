// 정기 실행 달력 칸 계산 검사 (도메인/정기실행 §8.20)

import { describe, expect, it } from 'vitest';

import type { 세트, 회차 } from './schedApi.js';
import { 다음날, 시간범위, 월칸들, 칩들, 날더하기 } from './schedView.js';

const 세트하나 = (덮: Partial<세트> = {}): 세트 => ({
  id: 1,
  name: '결제 회귀',
  at: '02:00',
  tz: 'Asia/Seoul',
  days: [0, 1, 2, 3, 4, 5, 6],
  onceOn: null,
  isOn: true,
  isBase: false,
  items: [],
  envs: [],
  skipped: [],
  missing: { cases: 0, tests: 0 },
  avgMinutes: 35,
  last: null,
  baseable: false,
  ...덮,
});

// 2026-11-13(금) 10:30 서울
const 지금 = new Date('2026-11-13T01:30:00Z');

describe('날짜 셈', () => {
  it('하루씩 더하면 달과 해를 넘긴다', () => {
    expect(날더하기('2026-11-30', 1)).toBe('2026-12-01');
    expect(날더하기('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('월 칸은 월요일부터 그 달을 다 덮는 주들이다', () => {
    const 칸 = 월칸들('2026-11-01');
    expect(칸[0]).toBe('2026-10-26');
    expect(칸.at(-1)).toBe('2026-12-06');
    expect(칸).toHaveLength(42);
  });
});

describe('다음날', () => {
  it('오늘 시각이 지났으면 다음 돌 날부터다', () => {
    expect(다음날(세트하나({ at: '02:00' }), 지금)).toBe('2026-11-14');
    expect(다음날(세트하나({ at: '23:00' }), 지금)).toBe('2026-11-13');
  });

  it('요일 · 한 번만을 따르고, 꺼졌거나 한 번만이 지났으면 없다', () => {
    expect(다음날(세트하나({ days: [1] }), 지금)).toBe('2026-11-16');
    expect(다음날(세트하나({ days: null, onceOn: '2026-11-20' }), 지금)).toBe('2026-11-20');
    expect(다음날(세트하나({ days: null, onceOn: '2026-11-01' }), 지금)).toBeNull();
    expect(다음날(세트하나({ isOn: false }), 지금)).toBeNull();
  });
});

describe('칩들', () => {
  const 지난회차 = (덮: Partial<회차> = {}): 회차 => ({
    id: 9,
    setId: 1,
    plannedOn: '2026-11-12',
    plannedAt: '2026-11-11T17:00:00Z',
    startedAt: '2026-11-11T17:50:00Z',
    finishedAt: '2026-11-11T18:30:00Z',
    state: 'DONE',
    verdict: 'FAIL',
    suspects: 2,
    runs: [
      { runId: 4701, kind: 'FN', service: 'MKT', title: '정기 · 결제 회귀 · 기능', status: 'FINISHED', passed: 3, failed: 2, other: 0 },
      { runId: 4702, kind: 'COMPAT', service: 'MTA', title: '정기 · 결제 회귀 · 호환성', status: 'FINISHED', passed: 0, failed: 1, other: 0, suspects: 2 },
    ],
    notes: [],
    ...덮,
  });

  it('지난 회차는 실제 시작 · 대기 · 실패 수를 단다. 호환성 실패는 실패에 넣지 않는다', () => {
    const 칸 = 칩들([세트하나()], [지난회차()], '2026-11-12', '2026-11-12', 지금).get('2026-11-12')!;
    expect(칸).toHaveLength(1);
    expect(칸[0]).toMatchObject({ 상태: 'fail', 정한분: 120, 시작분: 170, 끝분: 210, 대기분: 50, 실패: 2, 의심: 2 });
  });

  it('앞으로의 예정은 세트로 그리고, 회차가 이미 있는 날 · 오늘 지난 시각 · 끈 세트는 그리지 않는다', () => {
    const 표 = 칩들([세트하나(), 세트하나({ id: 2, isOn: false })], [지난회차({ plannedOn: '2026-11-14' })], '2026-11-12', '2026-11-15', 지금);
    expect(표.get('2026-11-13')).toBeUndefined();
    expect(표.get('2026-11-14')?.map((c) => c.회차?.id)).toEqual([9]);
    expect(표.get('2026-11-15')?.map((c) => [c.세트.id, c.상태])).toEqual([[1, 'plan']]);
  });

  it('건너뛴 회차는 그리지 않는다', () => {
    expect(칩들([세트하나()], [지난회차({ state: 'SKIPPED' })], '2026-11-12', '2026-11-12', 지금).get('2026-11-12')).toBeUndefined();
  });

  it('앞 세트가 평균 시간만큼 길면 뒤 세트 예정은 그 뒤로 밀려 대기를 단다', () => {
    const 앞 = 세트하나({ id: 1, at: '01:00', avgMinutes: 170 });
    const 뒤 = 세트하나({ id: 2, at: '02:00', avgMinutes: 35 });
    const 칸 = 칩들([뒤, 앞], [], '2026-11-20', '2026-11-20', 지금).get('2026-11-20')!;
    expect(칸.map((c) => [c.세트.id, c.시작분, c.대기분])).toEqual([
      [1, 60, 0],
      [2, 230, 110],
    ]);
  });
});

describe('도는 · 줄 선 회차의 예상', () => {
  const 회차 = (덮: Partial<회차>): 회차 => ({
    id: 20, setId: 1, plannedOn: '2026-11-13', plannedAt: '2026-11-12T17:00:00Z', startedAt: null, finishedAt: null,
    state: 'QUEUED', verdict: 'NONE', suspects: 0, runs: [], notes: [], ...덮,
  });

  it('평균보다 오래 도는 회차 뒤의 예정은 지금 이후로 밀린다', () => {
    const 앞 = 세트하나({ id: 1, at: '09:00', avgMinutes: 30 });
    const 뒤 = 세트하나({ id: 2, at: '10:45', avgMinutes: 30 });
    const 칸 = 칩들([앞, 뒤], [회차({ setId: 1, plannedAt: '2026-11-13T00:00:00Z', startedAt: '2026-11-13T00:00:00Z', state: 'RUNNING' })], '2026-11-13', '2026-11-13', 지금).get('2026-11-13')!;
    expect(칸.map((c) => [c.세트.id, c.시작분])).toEqual([
      [1, 540],
      [2, 645],
    ]);
    expect(칸[0]!.끝분).toBe(630);
  });

  it('어제부터 줄 선 회차는 지금보다 앞서 시작할 수 없다', () => {
    const 칸 = 칩들([세트하나()], [회차({ plannedOn: '2026-11-12', plannedAt: '2026-11-11T17:00:00Z' })], '2026-11-12', '2026-11-12', 지금).get('2026-11-12')!;
    expect(칸[0]!.시작분).toBe(1440 + 630);
  });
});

describe('시간범위', () => {
  it('칸이 있는 시간대만 펼친다', () => {
    const 칸 = 칩들([세트하나({ at: '01:00', avgMinutes: 170 })], [], '2026-11-20', '2026-11-20', 지금).get('2026-11-20')!;
    expect(시간범위(칸)).toEqual([1, 4]);
    expect(시간범위([])).toBeNull();
  });
});
