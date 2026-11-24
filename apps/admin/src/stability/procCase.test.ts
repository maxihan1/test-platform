// 프로시저 오류를 흐름이 멈춘 케이스 · 시각으로 케이스에 붙이는지 본다
import { describe, expect, it } from 'vitest';

import { 깨진케이스, 시각으로붙인다, type 단위케이스 } from './procCase.js';

const 케이스 = (tcId: string, status: string, message: string | null, 시작: string, 단계: 단위케이스['단계'] = []): 단위케이스 & { tcId: string } => ({
  tcId,
  status,
  message,
  caseStartedAt: 시작,
  단계,
});

const 로그인 = 케이스('A-101', 'PASS', null, '2026-11-24T03:00:00Z', [
  { seq: 1, startedAt: '2026-11-24T03:00:01Z' },
  { seq: 2, startedAt: '2026-11-24T03:00:05Z' },
]);
const 글쓰기 = 케이스('A-102', 'FAIL', 'boom', '2026-11-24T03:00:10Z', [
  { seq: 1, startedAt: '2026-11-24T03:00:11Z' },
  { seq: 2, startedAt: null },
]);

describe('깨진케이스', () => {
  it('실패한 케이스를 고른다', () => {
    expect(깨진케이스([로그인, 글쓰기]).tcId).toBe('A-102');
  });

  it('제한 시간 초과 · 시작한 Blocked 도 흐름이 멈춘 케이스다', () => {
    const 초과 = 케이스('A-102', 'NA', 'Test timeout of 120000ms exceeded.', '2026-11-24T03:00:10Z');
    expect(깨진케이스([로그인, 초과]).tcId).toBe('A-102');
    const 막힘 = 케이스('A-103', 'NA', 'BLOCKED', '2026-11-24T03:00:20Z');
    expect(깨진케이스([로그인, 글쓰기, 막힘]).tcId).toBe('A-103');
  });

  it('판정 확인만 틀린 앞 실패는 흐름을 안 멈춘다 — 마지막 케이스가 통과면 첫 케이스다', () => {
    const 통과 = 케이스('A-103', 'PASS', null, '2026-11-24T03:00:20Z');
    expect(깨진케이스([로그인, 글쓰기, 통과]).tcId).toBe('A-101');
  });

  it('끝까지 갔거나 그 밖의 미실행이면 첫 케이스다', () => {
    const 멈춤 = 케이스('A-102', 'NA', 'ABORTED', '2026-11-24T03:00:10Z');
    expect(깨진케이스([로그인, 멈춤]).tcId).toBe('A-101');
  });
});

describe('시각으로붙인다', () => {
  it('오류 시각 이상인 마지막 절차 시작의 케이스와 단계다', () => {
    expect(시각으로붙인다('2026-11-24T03:00:07Z', [로그인, 글쓰기])).toMatchObject({ 케이스: { tcId: 'A-101' }, seq: 2 });
    expect(시각으로붙인다('2026-11-24T03:00:30Z', [로그인, 글쓰기])).toMatchObject({ 케이스: { tcId: 'A-102' }, seq: 1 });
  });

  it('앞 케이스 절차 뒤에 다음 케이스가 시작했으면 그 케이스의 준비 구간이라 단계를 비운다', () => {
    const 늦은절차 = 케이스('A-102', 'FAIL', 'boom', '2026-11-24T03:00:10Z', [{ seq: 1, startedAt: '2026-11-24T03:00:15Z' }]);
    expect(시각으로붙인다('2026-11-24T03:00:12Z', [로그인, 늦은절차])).toMatchObject({ 케이스: { tcId: 'A-102' }, seq: null });
  });

  it('절차 시작이 다 늦으면 케이스 시작 시각으로 케이스만 맞춘다', () => {
    const 시각없음 = 케이스('A-102', 'PASS', null, '2026-11-24T03:00:10Z', [{ seq: 1, startedAt: null }]);
    expect(시각으로붙인다('2026-11-24T03:00:10.500Z', [케이스('A-101', 'PASS', null, '2026-11-24T03:00:00Z'), 시각없음])).toMatchObject({
      케이스: { tcId: 'A-102' },
      seq: null,
    });
  });

  it('시각이 없거나 모든 케이스보다 이르면 흐름이 깨진 케이스다', () => {
    expect(시각으로붙인다(null, [로그인, 글쓰기])).toMatchObject({ 케이스: { tcId: 'A-102' }, seq: null });
    expect(시각으로붙인다('2026-11-24T02:59:00Z', [로그인, 글쓰기])).toMatchObject({ 케이스: { tcId: 'A-102' }, seq: null });
  });
});
