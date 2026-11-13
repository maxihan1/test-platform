// 정기 실행 마법사 계산 검사 — 겹치는 세트 · 기준 꼴 · 실행을 만드는 애플리케이션 · 본문 · 다음 실행 (도메인/정기실행 §3.16 · §7)

import { describe, expect, it } from 'vitest';

import type { 세트 } from './schedApi.js';
import { 겹치는세트들, 기준꼴, 다른기준있나, 다음실행들, 본문, 섞인E2E있나, 실행앱들, 처음값, type 후보 } from './schedForm.js';

const 세트하나 = (덮: Partial<세트> = {}): 세트 => ({
  id: 1,
  name: '결제 회귀',
  at: '02:00',
  tz: 'Asia/Seoul',
  days: [1, 2, 3, 4, 5],
  onceOn: null,
  isOn: true,
  isBase: false,
  items: [{ kind: 'FN', service: 'MKT', tcIds: null, label: '기능 전체' }],
  envs: [],
  skipped: [],
  missing: { cases: 0, tests: 0 },
  avgMinutes: 35,
  last: null,
  baseable: true,
  ...덮,
});

const 후: 후보 = {
  services: [],
  scenarios: [{ id: 3, name: '주문 → 어드민 확인', service: 'MKT', path: ['MKT', 'ADM'], runnable: true }],
  compatSets: [],
};

describe('겹치는세트들', () => {
  it('같은 날 돌고 [시각, 시각 + 평균] 이 걸치면 겹친다', () => {
    const 앞 = 세트하나();
    expect(겹치는세트들([앞], { id: null, at: '02:30', days: [1], onceOn: null, avgMinutes: null })).toEqual([앞]);
    expect(겹치는세트들([앞], { id: null, at: '02:36', days: [1], onceOn: null, avgMinutes: null })).toEqual([]);
    expect(겹치는세트들([앞], { id: null, at: '01:50', days: [1], onceOn: null, avgMinutes: 20 })).toEqual([앞]);
  });

  it('도는 날이 다르거나 꺼졌거나 나 자신이면 겹치지 않는다', () => {
    expect(겹치는세트들([세트하나()], { id: null, at: '02:00', days: [0, 6], onceOn: null, avgMinutes: null })).toEqual([]);
    expect(겹치는세트들([세트하나({ isOn: false })], { id: null, at: '02:00', days: [1], onceOn: null, avgMinutes: null })).toEqual([]);
    expect(겹치는세트들([세트하나()], { id: 1, at: '02:00', days: [1], onceOn: null, avgMinutes: null })).toEqual([]);
  });

  it('「한 번만」은 그 날짜의 요일로 견준다 — 2026-11-16 은 월요일이다', () => {
    expect(겹치는세트들([세트하나()], { id: null, at: '02:00', days: null, onceOn: '2026-11-16', avgMinutes: null })).toHaveLength(1);
    expect(겹치는세트들([세트하나()], { id: null, at: '02:00', days: null, onceOn: '2026-11-15', avgMinutes: null })).toHaveLength(0);
  });
});

describe('기준꼴 · 다른기준있나', () => {
  it('한 애플리케이션의 기능 · UI 줄만 · 반복이면 그 접두사', () => {
    expect(기준꼴([{ kind: 'FN', service: 'MKT' }, { kind: 'UI', service: 'MKT' }], [1, 2])).toBe('MKT');
    expect(기준꼴([{ kind: 'FN', service: 'MKT' }], null)).toBeNull();
    expect(기준꼴([{ kind: 'FN', service: 'MKT' }, { kind: 'FN', service: 'ADM' }], [1])).toBeNull();
    expect(기준꼴([{ kind: 'E2E', service: 'MKT' }], [1])).toBeNull();
  });

  it('같은 애플리케이션의 다른 기준 세트가 있으면 막는다 — 자기 자신은 빼고', () => {
    const 기준 = 세트하나({ isBase: true });
    expect(다른기준있나([기준], 'MKT', null)).toBe(true);
    expect(다른기준있나([기준], 'MKT', 1)).toBe(false);
    expect(다른기준있나([기준], 'ADM', null)).toBe(false);
  });
});

describe('실행앱들 · 본문', () => {
  const 값 = { ...처음값(null, '2026-11-13'), name: ' 출시 전 점검 ', items: [{ kind: 'FN' as const, service: 'ADM', tcIds: ['ADM-FN-001'], label: '' }, { kind: 'E2E' as const, service: 'OLD', tcIds: null, scenarioId: 3, label: '주문 → 어드민 확인' }], envs: { ADM: 'stg', MKT: 'qa', ZZZ: 'qa' } };

  it('E2E 는 시나리오의 지금 시작 애플리케이션이 실행을 만든다', () => {
    expect(실행앱들(값.items, 후)).toEqual(['ADM', 'MKT']);
    expect(실행앱들(값.items, null)).toEqual(['ADM', 'OLD']);
    expect(섞인E2E있나(값.items, 후)).toBe(true);
  });

  it('본문은 종류마다 칸이 다르고 실행을 만드는 애플리케이션의 서버만 싣는다', () => {
    expect(본문(값, ['ADM', 'MKT'])).toEqual({
      name: '출시 전 점검',
      at: '02:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      items: [{ kind: 'FN', service: 'ADM', tcIds: ['ADM-FN-001'] }, { kind: 'E2E', scenarioId: 3 }],
      envs: [{ service: 'ADM', env: 'stg' }, { service: 'MKT', env: 'qa' }],
    });
    expect(본문({ ...값, 반복: 'once', onceOn: '2026-11-20' }, []).onceOn).toBe('2026-11-20');
  });
});

describe('다음실행들', () => {
  // 2026-11-13(금) 10:30 서울
  const 지금 = new Date('2026-11-13T01:30:00Z');

  it('셋까지, 오늘 시각이 지났으면 다음 날부터', () => {
    expect(다음실행들({ ...처음값(null, '2026-11-13'), at: '10:00' }, 'Asia/Seoul', 지금)).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
    expect(다음실행들({ ...처음값(null, '2026-11-13'), at: '11:00' }, 'Asia/Seoul', 지금)[0]).toBe('2026-11-13');
  });

  it('지난 「한 번만」은 다음 실행이 없다', () => {
    expect(다음실행들({ ...처음값(null, '2026-11-13'), 반복: 'once', onceOn: '2026-11-13', at: '09:00' }, 'Asia/Seoul', 지금)).toEqual([]);
  });
});
