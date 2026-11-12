// 상태 차례(신규 · 재발 · 증가 · 기존)와 해결 확인 판정이 명세 표대로인지 본다
import { describe, expect, it } from 'vitest';

import { 상태정하기, 해결확인인가 } from './state.js';

const 시작 = new Date('2026-11-12T03:00:00Z');
const 전 = new Date('2026-11-11T09:00:00Z');
const 도는중 = new Date('2026-11-12T03:10:00Z');

describe('상태정하기', () => {
  it('처음 보는 지문은 신규다', () => {
    expect(상태정하기(null, 3, null, 시작)).toBe('NEW');
  });

  it('실행 시작 전에 해결 처리한 종류는 증가보다 먼저 재발이다 — 해결 확인된 것도', () => {
    expect(상태정하기({ resolvedAt: 전, confirmedRunId: null }, 5, 1, 시작)).toBe('REOPENED');
    expect(상태정하기({ resolvedAt: 전, confirmedRunId: 41 }, 1, null, 시작)).toBe('REOPENED');
  });

  it('실행이 도는 중에 누른 해결 처리는 재발로 걷지 않고 다음 차례로 간다', () => {
    expect(상태정하기({ resolvedAt: 도는중, confirmedRunId: null }, 5, 1, 시작)).toBe('UP');
    expect(상태정하기({ resolvedAt: 도는중, confirmedRunId: null }, 1, 1, 시작)).toBe('ONGOING');
  });

  it('이전 실행보다 발생 케이스가 많으면 증가, 같거나 적거나 이전에 없었으면 기존이다', () => {
    const 기록 = { resolvedAt: null, confirmedRunId: null };
    expect(상태정하기(기록, 3, 2, 시작)).toBe('UP');
    expect(상태정하기(기록, 2, 2, 시작)).toBe('ONGOING');
    expect(상태정하기(기록, 1, 2, 시작)).toBe('ONGOING');
    expect(상태정하기(기록, 4, null, 시작)).toBe('ONGOING');
  });
});

describe('해결확인인가', () => {
  it('해결 처리 뒤에 시작한 실행에서 안 남았고 아직 확인 전이면 확인한다', () => {
    expect(해결확인인가({ resolvedAt: 전, confirmedRunId: null }, 시작)).toBe(true);
  });

  it('해결 처리 전 · 실행 중 해결 처리 · 이미 확인한 것은 아니다', () => {
    expect(해결확인인가({ resolvedAt: null, confirmedRunId: null }, 시작)).toBe(false);
    expect(해결확인인가({ resolvedAt: 도는중, confirmedRunId: null }, 시작)).toBe(false);
    expect(해결확인인가({ resolvedAt: 전, confirmedRunId: 41 }, 시작)).toBe(false);
  });
});
