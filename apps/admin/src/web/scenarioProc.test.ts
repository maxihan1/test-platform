import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 든프로시저들, 막은판정, 케이스판정, 프로시저건너뛰기빼기, 프로시저떼기, 프로시저읽기 } from './scenarioProc.js';

const 케이스 = (tcId: string, 덮: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], ...덮 });

describe('프로시저떼기', () => {
  it('서버가 실어 준 프로시저 칸을 단계에서 떼 맨몸으로 돌려주고 케이스 번호로 찾게 모은다', () => {
    const { 단계들, 정보 } = 프로시저떼기([
      { ...케이스('MTA-FN-101', { skipSteps: ['로그인'] }), procId: 'MTA-TP-022', procName: '글쓰기', cases: [{ tcId: 'MTA-FN-100', name: '로그인' }, { tcId: 'MTA-FN-101', name: '글쓰기' }] },
      케이스('MTA-FN-900'),
      { kind: 'wait', ms: 5 },
    ]);
    expect(단계들[0]).toEqual(케이스('MTA-FN-101', { skipSteps: ['로그인'] }));
    expect(Object.keys(단계들[0]!)).not.toContain('procId');
    expect([...정보.keys()]).toEqual(['MTA-FN-101']);
    expect(정보.get('MTA-FN-101')).toEqual({ procId: 'MTA-TP-022', procName: '글쓰기', cases: [{ tcId: 'MTA-FN-100', name: '로그인' }, { tcId: 'MTA-FN-101', name: '글쓰기' }] });
  });
});

describe('프로시저읽기', () => {
  it('procId 가 없으면 프로시저 단계가 아니다', () => {
    expect(프로시저읽기({})).toBeNull();
    expect(프로시저읽기({ procId: 'P-1', procName: null })).toEqual({ procId: 'P-1', procName: '', cases: [] });
  });
});

describe('프로시저건너뛰기빼기', () => {
  it('프로시저 단계의 건너뛸 제목만 비우고 옛 꼴 케이스 단계는 그대로 둔다', () => {
    const 부품 = [케이스('A-1', { skipSteps: ['x'] }), 케이스('B-1', { skipSteps: ['y'] })];
    const 정보 = new Map([['A-1', { procId: 'P-1', procName: '', cases: [] }]]);
    const 결과 = 프로시저건너뛰기빼기(부품, 정보);
    expect(결과[0]).toEqual(케이스('A-1'));
    expect(결과[1]).toBe(부품[1]);
  });
});

describe('케이스판정', () => {
  it('status 가 없으면 안 돈 것이고 도는 중인 실행에서는 판정이 없다', () => {
    expect(케이스판정({ tcId: 'A' }, false)).toEqual({ status: 'NA', blocked: false, 도는중: false });
    expect(케이스판정({ tcId: 'A' }, true).도는중).toBe(true);
  });
  it('NA 에 BLOCKED 사유 또는 막은 케이스가 있으면 Blocked, 제한 시간 초과는 Not tested 다', () => {
    expect(케이스판정({ tcId: 'A', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'B' }, false).blocked).toBe(true);
    expect(케이스판정({ tcId: 'A', status: 'NA', error: { message: 'BLOCKED' } }, false).blocked).toBe(true);
    expect(케이스판정({ tcId: 'A', status: 'NA', error: { message: 'TIMEOUT' } }, false).blocked).toBe(false);
    expect(케이스판정({ tcId: 'A', status: 'FAIL' }, false)).toEqual({ status: 'FAIL', blocked: false, 도는중: false });
  });
});

describe('막은판정', () => {
  it('막은 케이스의 판정을 주고, 그 케이스도 막혔거나 안 돌았으면 모른다', () => {
    const cases = [
      { tcId: 'A', status: 'FAIL' as const },
      { tcId: 'B', status: 'NA' as const, error: { message: 'BLOCKED' }, blockedBy: 'A' },
      { tcId: 'C' },
    ];
    expect(막은판정(cases, 'A')).toBe('FAIL');
    expect(막은판정(cases, 'B')).toBeUndefined();
    expect(막은판정(cases, 'C')).toBeUndefined();
    expect(막은판정(cases, 'Z')).toBeUndefined();
  });
});

describe('든프로시저들', () => {
  it('케이스 단계가 든 프로시저 번호만 모은다', () => {
    const 번호 = (tcId: string) => (tcId === 'A-1' ? 'P-1' : undefined);
    expect([...든프로시저들([케이스('A-1'), 케이스('B-1'), { kind: 'wait', ms: 1 }], 번호)]).toEqual(['P-1']);
  });
});
