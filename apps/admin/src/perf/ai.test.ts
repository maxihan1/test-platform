// 성능 AI 일 결과 모양 검사 · 동시 사용자 계산

import { describe, expect, it } from 'vitest';

import { 결과다듬기, 피크동시사용자 } from './ai.js';

const 트랜잭션 = { name: '로그인', method: 'POST', url: '/api/login', body: '{"id":"${username}"}' };

describe('피크 동시 사용자', () => {
  it('일 방문자 × 집중률 × 체류 분 ÷ 60분을 올림한다', () => {
    expect(피크동시사용자(10_000, 0.15, 5)).toBe(125);
    expect(피크동시사용자(1000, 0.1, 1)).toBe(2);
  });

  it('값이 하나라도 없으면 null 이다', () => {
    expect(피크동시사용자(null, 0.1, 5)).toBeNull();
  });
});

describe('결과 다듬기', () => {
  it('부하 크기 추천에 피크 · 최대(5배)를 admin 이 센다', () => {
    const r = 결과다듬기('SUGGEST_LOAD', {}, { dailyVisitors: 10_000, peakRatio: 0.15, avgStayMin: 5, reqIds: ['R-001'], basis: ['R-001 일 방문 1만'] });
    expect(r).toEqual({ output: expect.objectContaining({ peakMinutes: 60, peakVus: 125, maxVus: 625 }) });
  });

  it('녹화 초안에 녹화 셈을 붙인다', () => {
    const r = 결과다듬기('DRAFT_RECORD', { total: 23, staticExcluded: 17 }, { transactions: [트랜잭션], excluded: [{ url: 'http://ga.test', reason: '분석' }] });
    expect(r).toEqual({ output: expect.objectContaining({ recorded: { total: 23, staticExcluded: 17, used: 1, excluded: 1 }, notes: {} }) });
  });

  it('트랜잭션 이름이 겹치거나 메서드가 틀리면 까닭을 준다', () => {
    expect(결과다듬기('DRAFT_SWAGGER', {}, { transactions: [트랜잭션, 트랜잭션] })).toHaveProperty('error');
    expect(결과다듬기('DRAFT_FILE', {}, { transactions: [{ ...트랜잭션, method: 'TRACE' }] })).toHaveProperty('error');
  });

  it('성능 목표 추천은 직접 입력 꼬리표를 받지 않고 기획서 근거는 요구 번호를 든다', () => {
    const 목표 = { metric: 'ERROR_RATE', op: '<=', value: 1 };
    expect(결과다듬기('SUGGEST_TARGETS', {}, { targets: [{ ...목표, source: 'AI' }] })).toHaveProperty('output');
    expect(결과다듬기('SUGGEST_TARGETS', {}, { targets: [{ ...목표, source: 'MANUAL' }] })).toHaveProperty('error');
    expect(결과다듬기('SUGGEST_TARGETS', {}, { targets: [{ ...목표, source: 'PRD' }] })).toHaveProperty('error');
    expect(결과다듬기('SUGGEST_TARGETS', {}, { targets: [{ ...목표, source: 'PRD', reqId: 'R-002' }] })).toHaveProperty('output');
  });

  it('모르는 종류는 까닭을 준다', () => {
    expect(결과다듬기('SUGGEST_PAGES', {}, {})).toEqual({ error: '모르는 일 종류다: SUGGEST_PAGES' });
  });

  it('AI 분석은 제목 한 줄과 항목 1~10개(각 500자까지)만 받는다', () => {
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '300명에서 응답이 느려졌습니다', items: ['임계점: 300명', '병목 구간: 로그인'] })).toEqual({
      output: { title: '300명에서 응답이 느려졌습니다', items: ['임계점: 300명', '병목 구간: 로그인'] },
    });
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '제목', items: [] })).toHaveProperty('error');
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '제목', items: Array.from({ length: 11 }, () => '항목') })).toHaveProperty('error');
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '제목', items: ['가'.repeat(501)] })).toHaveProperty('error');
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '', items: ['항목'] })).toHaveProperty('error');
  });
});
