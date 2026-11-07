// 호환성 결과 칸 · 머리 숫자 · 미점검 까닭의 순수 셈

import { describe, expect, it } from 'vitest';

import { type 결과재료, type 상태줄, type 케이스줄, 결과셈 } from './result.js';

const 상태 = (seq: number, 덧: Partial<상태줄> = {}): 상태줄 => ({
  seq, serial: `S${seq}`, heldSerial: null, model: `M${seq}`, name: `폰${seq}`, os: '14', fold: null, state: 'DONE', skipReason: null, ...덧,
});
const 케이스 = (id: number, seq: number, tcId: string, 덧: Partial<케이스줄> = {}): 케이스줄 => ({
  id, seq, tcId, name: `${tcId} 이름`, status: 'PASS', failedStep: null, checkState: 'done', started: true, startedAt: '2026-11-07T00:00:00.000Z', finished: true, 까닭: null, ...덧,
});
const 재료 = (덧: Partial<결과재료>): 결과재료 => ({
  상태들: [], 케이스들: [], 화면들: [], 판정들: [], 지나는: new Map(), 화면수: new Map(), 이름: new Map(), ...덧,
});
const 의심 = [{ kind: 'overlap', box: [0, 0, 1, 1], note: '겹침' }];

describe('결과셈', () => {
  it('의심이 있으면 미판정 · 판정이 있으면 그 값 · 의심 없이 찍혔으면 이상 없음이고 이상 없는 화면은 숨긴다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1), 상태(2)],
      케이스들: [케이스(11, 1, 'A-1'), 케이스(21, 2, 'A-1')],
      지나는: new Map([['A-1', ['/a', '/b']]]),
      화면들: [
        { id: 1, caseRunId: 11, seq: 1, key: '/a', step: 1, status: 'done', issues: 의심 },
        { id: 2, caseRunId: 11, seq: 1, key: '/b', step: 2, status: 'done', issues: [] },
        { id: 3, caseRunId: 21, seq: 2, key: '/a', step: 1, status: 'done', issues: 의심 },
        { id: 4, caseRunId: 21, seq: 2, key: '/b', step: 2, status: 'done', issues: [] },
      ],
      판정들: [{ key: '/a', seq: 2, verdict: 'CONFIRMED', judgedBy: 'me', judgedAt: '2026-11-07T00:00:00.000Z' }],
    }));
    expect(r.rows).toEqual([{ key: '/a', name: '/a', cells: [{ seq: 1, value: 'PENDING' }, { seq: 2, value: 'CONFIRMED' }] }]);
    expect(r.hiddenOk).toBe(1);
    expect(r.counts).toMatchObject({ screens: 2, devices: 2, states: 2, confirmed: 1, pending: 1, notDefect: 0, unchecked: 0 });
    expect(r.cards.map((c) => [c.screenId, c.tcId, c.verdict])).toEqual([[1, 'A-1', null], [3, 'A-1', 'CONFIRMED']]);
    expect(r.affected).toEqual({ states: 2, total: 2 });
  });

  it('미점검 까닭 — 실패 단계 · 못 잡은 디바이스 · 점검 결과 없음 · 찍힌 화면 없음', () => {
    const r = 결과셈(재료({
      상태들: [상태(1), 상태(2, { state: 'SKIPPED', skipReason: '디바이스를 잡지 못했습니다' }), 상태(3)],
      케이스들: [
        케이스(11, 1, 'A-1', { status: 'FAIL', failedStep: 5 }),
        케이스(21, 2, 'A-1', { started: false, finished: false, status: 'NA', checkState: null }),
        케이스(31, 3, 'A-1', { checkState: 'missing' }),
      ],
      지나는: new Map([['A-1', ['/a']]]),
    }));
    expect(r.rows[0]?.cells).toEqual([
      { seq: 1, value: 'UNCHECKED', reason: 'A-1 이 5단계에서 실패' },
      { seq: 2, value: 'UNCHECKED', reason: '디바이스를 잡지 못했습니다' },
      { seq: 3, value: 'UNCHECKED', reason: 'AI 점검 결과를 받지 못했습니다' },
    ]);
    expect(r.counts.unchecked).toBe(1);
    expect(r.counts.screens).toBe(0);
  });

  it('돌거나 점검 중인 상태의 칸은 아직 안 세고, 점검 중 장 수는 케이스 화면 수로 어림한다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1, { state: 'CHECKING' }), 상태(2, { state: 'WAIT' })],
      케이스들: [케이스(11, 1, 'A-1', { checkState: 'checking' }), 케이스(21, 2, 'A-1', { started: false, finished: false, checkState: null })],
      지나는: new Map([['A-1', ['/a']]]),
      화면수: new Map([['A-1', 3]]),
    }));
    expect(r.rows).toEqual([]);
    expect(r.hiddenOk).toBe(0);
    expect(r.devices[0]).toMatchObject({ cases: { done: 1, total: 1 }, checks: { done: 0, total: 3 } });
  });

  it('화면 모름 열쇠는 tcId 와 단계로 이름을 짓는다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1)],
      케이스들: [케이스(11, 1, 'DMA-UI-031')],
      화면들: [{ id: 1, caseRunId: 11, seq: 1, key: 'unknown:DMA-UI-031#4', step: 4, status: 'done', issues: 의심 }],
    }));
    expect(r.rows[0]?.name).toBe('화면 모름 — DMA-UI-031 4단계');
  });

  it('이상 없는 화면 모름은 점검 화면 · 숨긴 화면에 안 센다 — 점검 + 미점검이 전체 화면 수를 넘지 않게', () => {
    const r = 결과셈(재료({
      상태들: [상태(1)],
      케이스들: [케이스(11, 1, 'DMA-UI-133'), 케이스(12, 1, 'DMA-FN-250', { status: 'FAIL', failedStep: 1 })],
      지나는: new Map([['DMA-UI-133', ['/login']], ['DMA-FN-250', ['/receiver']]]),
      화면들: [
        { id: 1, caseRunId: 11, seq: 1, key: '/login', step: 1, status: 'done', issues: [] },
        { id: 2, caseRunId: 12, seq: 1, key: 'unknown:DMA-FN-250#1', step: 1, status: 'done', issues: [] },
      ],
    }));
    expect(r.counts).toMatchObject({ screens: 1, unchecked: 1 });
    expect(r.hiddenOk).toBe(1);
    expect(r.rows.map((x) => x.key)).toEqual(['/receiver']);
  });

  it('지금 케이스는 시작했고 안 끝난 케이스다 — 다 끝났거나 아직 안 돌았으면 null', () => {
    const r = 결과셈(재료({
      상태들: [상태(1, { state: 'RUNNING' }), 상태(2, { state: 'WAIT' })],
      케이스들: [
        케이스(11, 1, 'A-1'),
        케이스(12, 1, 'A-2', { finished: false, checkState: null, startedAt: '2026-11-07T01:00:00.000Z' }),
        케이스(21, 2, 'A-1', { started: false, startedAt: null, finished: false, checkState: null }),
      ],
    }));
    expect(r.devices[0]?.now).toEqual({ tcId: 'A-2', name: 'A-2 이름', startedAt: '2026-11-07T01:00:00.000Z' });
    expect(r.devices[1]?.now).toBeNull();
    const 멈춤 = 결과셈(재료({ 상태들: [상태(1, { state: 'STOPPED' })], 케이스들: [케이스(11, 1, 'A-1', { finished: false, checkState: null })] }));
    expect(멈춤.devices[0]?.now).toBeNull();
  });
});
