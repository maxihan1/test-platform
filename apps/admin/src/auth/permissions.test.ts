// 실행 칸 trial(보기 + 테스트 모드)이 등급표에서 어디까지 열리나 (SPEC 도메인/인증 §3.5 「테스트 모드」 · §7)

import { describe, expect, it } from 'vitest';

import { 권한이되나 } from './gate.js';
import { 칸이되나, type 서비스권한 } from './permissions.js';
import { 필요권한 } from './routeTable.js';

const 사람 = (runs: 서비스권한['runs']) => ({
  role: 'member' as const,
  services: [{ prefix: 'XA', permissions: { cases: 'read', runs, authoring: 'none' } satisfies 서비스권한 }],
});
const 되나 = (runs: 서비스권한['runs'], 메서드: string, 틀: string) => 권한이되나(사람(runs), 필요권한(틀, 메서드), ['XA']);

describe('실행 칸 trial', () => {
  it('높이는 read 와 write 사이다', () => {
    expect([칸이되나('trial', 'read'), 칸이되나('trial', 'trial'), 칸이되나('trial', 'write')]).toEqual([true, true, false]);
    expect([칸이되나('read', 'trial'), 칸이되나('write', 'trial')]).toEqual([false, true]);
  });

  it('테스트 모드 시작 두 통로는 trial 부터 열리고 read 는 막힌다', () => {
    for (const 틀 of ['/api/cases/:tcId/test-run', '/api/scenario-trials']) {
      expect(필요권한(틀, 'POST'), 틀).toEqual({ 기능: 'runs', 칸: 'trial' });
      expect([되나('read', 'POST', 틀), 되나('trial', 'POST', 틀), 되나('write', 'POST', 틀)], 틀).toEqual([false, true, true]);
    }
  });

  it('기록이 남는 일 · 시나리오 저장 · 토큰을 쓰는 일은 trial 에 안 열린다', () => {
    const 막힐것 = [
      ['POST', '/api/runs'],
      ['POST', '/api/scenarios'],
      ['PUT', '/api/scenarios/:id'],
      ['POST', '/api/scenarios/:id/runs'],
      ['POST', '/api/scenarios/link-suggestions'],
      ['POST', '/api/scenarios/flow-suggestions'],
    ] as const;
    for (const [메서드, 틀] of 막힐것) {
      expect(필요권한(틀, 메서드), `${메서드} ${틀}`).toEqual({ 기능: 'runs', 칸: 'write' });
      expect(되나('trial', 메서드, 틀), `${메서드} ${틀}`).toBe(false);
    }
  });

  it('보기는 read 처럼 열린다 — 실행 기록 · 테스트 모드 결과 · 장면', () => {
    const 열릴것 = ['/api/runs', '/api/cases/:tcId/test-run/:trialId', '/api/cases/:tcId/test-run/:trialId/live', '/api/scenario-trials/:trialId/live'];
    for (const 틀 of 열릴것) expect(되나('trial', 'GET', 틀), 틀).toBe(true);
  });
});
