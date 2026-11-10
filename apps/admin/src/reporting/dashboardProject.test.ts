// 대시보드 프로젝트 요약의 순수 셈 — 요구사항 추적 · 설계 분포 · 케이스 마지막 결과 · E2E 최근 결과

import { describe, expect, it } from 'vitest';
import type { ItemStatus, PrdItem } from '@platform/kit/types';

import { E2E셈, PRD셈, 케이스셈, 솎기, type 시나리오재료 } from './dashboardProject.js';

const 항목 = (reqId: string, status: PrdItem['status'] = 'CONFIRMED'): PrdItem => ({ reqId, feature: 'f', text: reqId, basis: [], status });
const 결과표 = (m: Record<string, ItemStatus>) => (tcId: string, p: string) => m[`${tcId}:${p}`];

describe('PRD셈', () => {
  it('요구마다 붙은 케이스를 접어 통과 · 실패 · 일부 미실행 · 테스트 없음으로 나눈다', () => {
    const 판 = { version: 3, items: [항목('A-REQ-001'), 항목('A-REQ-002'), 항목('A-REQ-003', 'NEEDS_CHECK'), 항목('A-REQ-004')] };
    const 지도 = {
      'A-REQ-001': [{ tcId: 'A-FN-001', axis: '정상', techniques: [], platforms: ['desktop' as const] }],
      'A-REQ-002': [
        { tcId: 'A-FN-001', axis: '예외', techniques: [], platforms: ['desktop' as const] },
        { tcId: 'A-FN-002', axis: '예외', techniques: [], platforms: ['desktop' as const] },
      ],
      'A-REQ-003': [
        { tcId: 'A-UI-001', axis: 'UI', techniques: [], platforms: ['desktop' as const, 'mobile' as const] },
        { tcId: 'A-FN-001', axis: '정상', techniques: [], platforms: ['desktop' as const] },
      ],
      'A-REQ-999': [{ tcId: 'A-FN-009', axis: '경계', techniques: [], platforms: ['desktop' as const] }],
    };
    const 셈 = PRD셈(판, 지도, 결과표({ 'A-FN-001:desktop': 'PASS', 'A-FN-002:desktop': 'FAIL', 'A-UI-001:desktop': 'PASS' }));
    expect(셈).toEqual({
      version: 3,
      requirements: 4,
      needsCheck: 1,
      rtm: { pass: 1, fail: 1, notRun: 1, none: 1 },
      axis: { normal: 1, error: 2, ui: 1, boundary: 0 },
    });
  });

  it('판이 없으면 0 이다', () => {
    expect(PRD셈(null, {}, 결과표({}))).toMatchObject({ version: 0, requirements: 0, rtm: { pass: 0, fail: 0, notRun: 0, none: 0 } });
  });
});

describe('케이스셈', () => {
  it('기능 · UI 를 번호로 가르고 지원 기기를 다 접어 마지막 결과를 센다', () => {
    const 셈 = 케이스셈(
      [
        { tcId: 'A-FN-001', platforms: ['desktop', 'mobile'] },
        { tcId: 'A-FN-002', platforms: ['desktop', 'mobile'] },
        { tcId: 'A-UI-001', platforms: ['desktop'] },
        { tcId: 'A-FN-003', platforms: ['desktop'] },
      ],
      결과표({ 'A-FN-001:desktop': 'PASS', 'A-FN-001:mobile': 'PASS', 'A-FN-002:desktop': 'PASS', 'A-FN-002:mobile': 'FAIL', 'A-UI-001:desktop': 'PASS' }),
    );
    expect(셈).toEqual({ cases: { fn: 3, ui: 1 }, last: { pass: 2, fail: 1, notRun: 1 } });
  });
});

describe('E2E셈', () => {
  const 시나리오 = (id: number, verdict: ItemStatus | null, finishedAt: string | null): 시나리오재료 => ({
    id, name: `S${String(id)}`, serviceName: '웹', platform: 'desktop', steps: 3,
    lastRun: { runId: id * 10, verdict, finishedAt },
  });

  it('판정이 난 시나리오만 세고 최근 다섯을 끝난 차례로 싣는다', () => {
    const 요약 = E2E셈([
      시나리오(1, 'PASS', '2026-11-01T00:00:00Z'),
      시나리오(2, 'FAIL', '2026-11-09T00:00:00Z'),
      시나리오(3, null, null),
      { ...시나리오(4, 'PASS', null), lastRun: null },
      시나리오(5, 'PASS', '2026-11-05T00:00:00Z'),
      시나리오(6, 'NA', '2026-11-06T00:00:00Z'),
      시나리오(7, 'PASS', '2026-11-07T00:00:00Z'),
      시나리오(8, 'PASS', '2026-11-08T00:00:00Z'),
    ]);
    expect(요약).toMatchObject({ pass: 4, fail: 1, notRun: 1, total: 8 });
    expect(요약.recent.map((r) => r.scenarioId)).toEqual([2, 8, 7, 6, 5]);
  });
});

describe('솎기', () => {
  it('상한 아래면 그대로, 넘으면 고르게 줄인다', () => {
    expect(솎기([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(솎기([...Array(10).keys()], 4)).toEqual([0, 3, 6, 9]);
  });
});
