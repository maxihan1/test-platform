// 호환성 결과 칸 · 머리 숫자 · 미점검 까닭의 순수 셈

import { describe, expect, it } from 'vitest';

import { type 결과재료, type 상태줄, type 케이스줄, 결과셈 } from './result.js';

const 상태 = (seq: number, 덧: Partial<상태줄> = {}): 상태줄 => ({
  seq, serial: `S${seq}`, heldSerial: null, model: `M${seq}`, name: `폰${seq}`, os: '14', fold: null, state: 'DONE', skipReason: null, ...덧,
});
const 케이스 = (id: number, seq: number, tcId: string, 덧: Partial<케이스줄> = {}): 케이스줄 => ({
  id, seq, tcId, name: `${tcId} 이름`, status: 'PASS', failedStep: null, checkState: 'done', started: true, startedAt: '2026-11-07T00:00:00.000Z', finished: true, 까닭: null, execId: null, blockedBy: null, checkCap: null, ...덧,
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
        { id: 1, caseRunId: 11, seq: 1, key: '/a', step: 1, status: 'done', before: 'element/click', issues: 의심 },
        { id: 2, caseRunId: 11, seq: 1, key: '/b', step: 2, status: 'done', before: 'element/click', issues: [] },
        { id: 3, caseRunId: 21, seq: 2, key: '/a', step: 1, status: 'done', before: 'element/click', issues: 의심 },
        { id: 4, caseRunId: 21, seq: 2, key: '/b', step: 2, status: 'done', before: 'element/click', issues: [] },
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

  it('화면 수 상한에 걸리면 걸린 케이스와 같은 프로시저의 뒤 케이스만 그 까닭이고 앞 케이스 · 다른 프로시저는 아니다 — 찍힌 화면은 그대로 이상 없음이다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1), 상태(2)],
      케이스들: [
        케이스(11, 1, 'A-1', { execId: 7 }), 케이스(12, 1, 'A-2', { execId: 7, checkCap: 400 }), 케이스(13, 1, 'A-3', { execId: 7 }), 케이스(14, 1, 'A-4', { execId: 8 }),
        케이스(21, 2, 'A-5', { checkCap: 400 }),
      ],
      지나는: new Map([['A-1', ['/a', '/a2']], ['A-2', ['/b', '/ok']], ['A-3', ['/c', '/a2']], ['A-4', ['/d']], ['A-5', ['/e']]]),
      화면들: [{ id: 1, caseRunId: 12, seq: 1, key: '/ok', step: 1, status: 'done', before: 'element/click', issues: [] }],
    }));
    const 까닭 = Object.fromEntries(r.rows.map((x) => [x.key, x.cells[0]?.reason]));
    const 한도 = 'AI 점검 화면 수 한도(400장) 초과';
    // '/a2' 는 앞 케이스도 지나지만 걸린 뒤 케이스가 하나라도 지나면 한도 까닭이다
    expect(까닭).toEqual({ '/a': '찍힌 화면이 없습니다', '/a2': 한도, '/b': 한도, '/c': 한도, '/d': '찍힌 화면이 없습니다', '/e': 한도 });
    expect(r.devices.map((d) => d.capped)).toEqual([[{ tcId: 'A-2', max: 400 }], [{ tcId: 'A-5', max: 400 }]]);
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
      화면들: [{ id: 1, caseRunId: 11, seq: 1, key: 'unknown:DMA-UI-031#4', step: 4, status: 'done', before: 'element/click', issues: 의심 }],
    }));
    expect(r.rows[0]?.name).toBe('화면 모름 — DMA-UI-031 4단계');
  });

  it('이상 없는 화면 모름은 점검 화면 · 숨긴 화면에 안 센다 — 점검 + 미점검이 전체 화면 수를 넘지 않게', () => {
    const r = 결과셈(재료({
      상태들: [상태(1)],
      케이스들: [케이스(11, 1, 'DMA-UI-133'), 케이스(12, 1, 'DMA-FN-250', { status: 'FAIL', failedStep: 1 })],
      지나는: new Map([['DMA-UI-133', ['/login']], ['DMA-FN-250', ['/receiver']]]),
      화면들: [
        { id: 1, caseRunId: 11, seq: 1, key: '/login', step: 1, status: 'done', before: 'element/click', issues: [] },
        { id: 2, caseRunId: 12, seq: 1, key: 'unknown:DMA-FN-250#1', step: 1, status: 'done', before: 'element/click', issues: [] },
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

  it('앞 케이스에 막혀 못 돈 케이스가 지날 화면은 미점검이고 까닭에 막은 케이스가 어떻게 끝났는지 붙는다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1), 상태(2)],
      케이스들: [
        케이스(1, 1, 'MTA-FN-278', { status: 'FAIL', execId: 9 }),
        케이스(2, 1, 'MTA-FN-279', { status: 'NA', 까닭: 'BLOCKED', blockedBy: 'MTA-FN-278', execId: 9 }),
        케이스(3, 2, 'MTA-FN-278', { status: 'NA', 까닭: 'Test timeout of 300000ms exceeded.', execId: 10 }),
        케이스(4, 2, 'MTA-FN-279', { status: 'NA', 까닭: 'BLOCKED', blockedBy: 'MTA-FN-278', execId: 10 }),
      ],
      지나는: new Map([['MTA-FN-279', ['app:Main/글쓰기']]]),
    }));
    expect(r.rows.find((x) => x.key === 'app:Main/글쓰기')?.cells).toEqual([
      { seq: 1, value: 'UNCHECKED', reason: 'MTA-FN-279 Blocked · 선행 케이스 MTA-FN-278 실패' },
      { seq: 2, value: 'UNCHECKED', reason: 'MTA-FN-279 Blocked · 선행 케이스 MTA-FN-278 제한 시간 초과' },
    ]);
  });

  it('프로시저가 끊겨 못 간 케이스(막힌 것 아님)가 지날 화면은 점검 까닭보다 못 돈 까닭이 먼저다', () => {
    const r = 결과셈(재료({
      상태들: [상태(1)],
      케이스들: [케이스(1, 1, 'MTA-FN-280', { status: 'NA', 까닭: 'TIMEOUT', execId: 9 })],
      지나는: new Map([['MTA-FN-280', ['app:Main/설정']]]),
    }));
    expect(r.rows.find((x) => x.key === 'app:Main/설정')?.cells).toEqual([{ seq: 1, value: 'UNCHECKED', reason: 'TIMEOUT' }]);
  });
});
