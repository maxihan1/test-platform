// 성능 실행 Slack 알림 문장과 보낼지 말지 — 머리글 · 성능 저하 꼬리표 · 중단 사유 한 줄

import { describe, expect, it } from 'vitest';

import { 알림문장, 알림보낼까, type 알림재료 } from './notify.js';

const 기본: 알림재료 = {
  id: 12, scenarioName: '상품 목록', status: 'DONE', verdict: 'PASS', stopReason: null, testType: 'LOAD', env: 'qa',
  peakVus: 120, p95Ms: 842, errorRate: 0.34, degraded: false,
};

describe('알림 문장', () => {
  it('통과는 머리 [통과] 와 시나리오 · 번호 · 유형 · 대상 서버 · 숫자 셋을 한 줄에 담는다', () => {
    expect(알림문장(기본)).toBe('[통과] 상품 목록 PRF-0012 · 부하 테스트 · qa · 최대 동시 사용자 120명 · 95% 응답시간 0.8초 · 에러율 0.3%');
  });

  it('성능 저하는 판정 머리 뒤에 [성능 저하] 를 단다', () => {
    expect(알림문장({ ...기본, verdict: 'FAIL', degraded: true, testType: 'SOAK' })).toMatch(/^\[실패\] \[성능 저하\] 상품 목록 PRF-0012 · 내구성 테스트 /);
  });

  it('판정 없는 중단은 [중단] 이고 중단 사유 한 줄이 따라온다', () => {
    const 글 = 알림문장({ ...기본, status: 'STOPPED', verdict: null, stopReason: 'USER', testType: 'SPIKE' });
    expect(글.split('\n')).toEqual(['[중단] 상품 목록 PRF-0012 · 스파이크 테스트 · qa · 최대 동시 사용자 120명 · 95% 응답시간 0.8초 · 에러율 0.3%', '실행을 중단했습니다']);
  });

  it('에러율 20% 로 멈춘 실행은 판정이 실패라 [실패] 이고, 고장 난 실행은 [오류] 다', () => {
    expect(알림문장({ ...기본, status: 'STOPPED', verdict: 'FAIL', stopReason: 'ERROR_LIMIT' })).toMatch(/^\[실패\] /);
    expect(알림문장({ ...기본, status: 'ERROR', verdict: null, peakVus: null, p95Ms: null, errorRate: null })).toBe('[오류] 상품 목록 PRF-0012 · 부하 테스트 · qa');
  });

  it('스트레스 테스트는 유형 이름이 스트레스 테스트다', () => {
    expect(알림문장({ ...기본, testType: 'STRESS' })).toContain(' · 스트레스 테스트 · ');
  });
});

describe('알림 보낼까', () => {
  it('정기 실행은 늘 보낸다', () => {
    expect(알림보낼까('SCHEDULED', false, false)).toBe(true);
  });

  it('사람이 건 실행은 성능 저하 알림을 켰고 실제로 저하일 때만 보낸다', () => {
    expect(알림보낼까('MANUAL', true, true)).toBe(true);
    expect(알림보낼까('MANUAL', true, false)).toBe(false);
    expect(알림보낼까('MANUAL', false, true)).toBe(false);
  });
});
