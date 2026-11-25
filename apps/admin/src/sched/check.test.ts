// 정기 실행 세트 줄 판정 — 「프로시저 작성」을 켠 애플리케이션은 기능 줄 하나로 담는다 (도메인/정기실행 §3.16 「테스트 프로시저」)
import { describe, expect, it } from 'vitest';

import { 기준앱, 빠진셈, 빠진까닭, 저장문제, type 재료, type 줄, type 앱 } from './check.js';

const 앱하나 = (id: number, prefix: string, procedureMode: boolean): 앱 => ({ id, prefix, name: prefix, kind: 'APP', isActive: true, projectId: 1, procedureMode });
const 재료 = (살아있는: string[] = []): 재료 => ({
  projectId: 1,
  앱들: new Map([
    [1, 앱하나(1, 'MTA', true)],
    [2, 앱하나(2, 'MKA', false)],
  ]),
  서버들: new Map([
    [1, new Map([['qa', false]])],
    [2, new Map([['qa', false]])],
  ]),
  시나리오: new Map(),
  호환성: new Map(),
  살아있는케이스: new Set(살아있는),
});
const 줄하나 = (kind: 'FN' | 'UI', serviceId: number, tcIds: string[] | null = null): 줄 => ({ kind, serviceId, tcIds, scenarioId: null, compatSetId: null });
const 고름 = new Map([
  [1, 'qa'],
  [2, 'qa'],
]);

describe('프로시저 작성을 켠 애플리케이션의 세트 줄', () => {
  it('UI 줄은 돌 때 PROCEDURE_ONE_KIND 로 빠지고 카드의 빠진 테스트로 센다 — 꺼진 애플리케이션의 UI 줄은 그대로 돈다', () => {
    const 재 = 재료();
    expect(빠진까닭(줄하나('UI', 1), 고름, 재)).toBe('PROCEDURE_ONE_KIND');
    expect(빠진까닭(줄하나('UI', 2), 고름, 재)).toBeNull();
    expect(빠진셈([줄하나('FN', 1), 줄하나('UI', 1)], 고름, 재)).toEqual({ skipped: [{ seq: 2, reason: 'PROCEDURE_ONE_KIND' }], missing: { cases: 0, tests: 1 } });
  });

  it('UI 줄을 새로 담으면 거절하고 이미 있던 UI 줄은 받는다', () => {
    const 재 = 재료();
    expect(저장문제([줄하나('UI', 1)], 고름, null, 재)).toBe('items.1: 「프로시저 작성」을 켠 애플리케이션은 기능 테스트 줄 하나로 담습니다');
    expect(저장문제([줄하나('UI', 1)], 고름, { 줄들: [줄하나('UI', 1)], 고름 }, 재)).toBeNull();
    expect(저장문제([줄하나('UI', 2)], 고름, null, 재)).toBeNull();
  });

  it('기능 줄이 UI 번호 케이스를 받는다 — 꺼진 애플리케이션의 기능 줄은 UI 번호를 거절한다', () => {
    const 재 = 재료(['MTA-UI-001', 'MTA-FN-002', 'MKA-UI-001']);
    expect(저장문제([줄하나('FN', 1, ['MTA-UI-001', 'MTA-FN-002'])], 고름, null, 재)).toBeNull();
    expect(저장문제([줄하나('FN', 2, ['MKA-UI-001'])], 고름, null, 재)).toBe('items.1: 선택할 수 없는 케이스입니다 (MKA-UI-001)');
  });

  it('기준 세트 꼴은 켠 애플리케이션의 UI 줄을 빼고 본다', () => {
    const { 앱들 } = 재료();
    expect(기준앱([줄하나('FN', 1), 줄하나('UI', 1)], [1, 2], 앱들)).toBe(1);
    expect(기준앱([줄하나('UI', 1)], [1, 2], 앱들)).toBeNull();
    expect(기준앱([줄하나('UI', 2)], [1, 2], 앱들)).toBe(2);
  });
});
