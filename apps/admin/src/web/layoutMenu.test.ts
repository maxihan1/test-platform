// 애플리케이션 종류마다 자리 목록(이름 · 하위 · QA 단계)이 어떻게 서는지 한 표로 지키는 검사

import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import { 빈띠사유, 자리목록 } from './layout.js';

const 기본: ServiceRow = {
  id: 1,
  prefix: 'PAY',
  name: '결제 애플리케이션',
  color: '#667788',
  projectId: 10,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람 = (줄: Partial<ServiceRow>): User => ({
  username: 'kim',
  displayName: '김철수',
  role: 'member',
  dashboard: 'read',
  mustChangePassword: false,
  services: [{ ...기본, ...줄 }],
});

function 메뉴(kind: ServiceRow['kind']) {
  return 자리목록(사람({ kind }), 'PAY', 'ko').map((자리) => [자리.이름, (자리.하위 ?? []).map((하위) => 하위.이름)] as const);
}

describe('종류별 자리 목록', () => {
  it('메뉴는 애플리케이션 종류 하나로만 정한다 — 테스트 종류는 메인 메뉴, 결과는 실행 기록 한 곳 (웹 · Android 앱 · 게임 · API)', () => {
    const 작성 = ['테스트 작성', []] as const;
    const 기능UI = ['기능 · UI 테스트', ['기능 테스트', 'UI 테스트']] as const;
    const E2E = ['E2E 테스트', []] as const;
    const 호환성 = ['호환성 테스트', []] as const;
    const 기록 = ['실행 기록', ['기능 테스트', 'UI 테스트', 'E2E', '호환성', '성능']] as const;
    const 뒤 = [['안정화 지표', []], ['그래프(Grafana)', []]] as const;

    expect(메뉴('SCREEN')).toEqual([['대시보드', []], ['PRD 관리', ['요구사항', '웹 가이드']], 작성, 기능UI, E2E, 호환성, ['성능 테스트', ['부하 테스트', '페이지 성능']], ['정기 실행', []], 기록, ...뒤]);
    expect(메뉴('APP')).toEqual([['대시보드', []], ['PRD 관리', ['요구사항', '앱 가이드']], 작성, 기능UI, E2E, 호환성, ['성능 테스트', ['부하 테스트', '앱 성능']], ['정기 실행', []], 기록, ...뒤]);
    expect(메뉴('GAME')).toEqual([['대시보드', []], ['PRD 관리', ['요구사항', '게임 가이드']], 작성, 기능UI, E2E, 호환성, ['성능 테스트', ['부하 테스트', '게임 성능']], ['정기 실행', []], 기록, ...뒤]);
    // API 는 화면이 없어 UI 테스트 · 호환성 · 안정화가 없다. 기능 테스트 · 성능 테스트(부하뿐)는 하위 없이 한 줄이다
    expect(메뉴('API')).toEqual([
      ['대시보드', []],
      ['PRD 관리', ['요구사항', 'API 문서', 'API 가이드']],
      작성,
      ['기능 테스트', []],
      E2E,
      ['성능 테스트', []],
      ['정기 실행', []],
      ['실행 기록', ['기능 테스트', 'E2E', '성능']],
      ['그래프(Grafana)', []],
    ]);
  });

  it('QA 단계 구분선 — 품질 현황 · 테스트 설계 · 테스트 수행 · 결과 분석 차례이고 설정은 단계 밖이다', () => {
    const 자리들 = 자리목록({ ...사람({ kind: 'SCREEN' }), role: 'admin' }, 'PAY', 'ko');
    const 단계마다첫자리 = 자리들.filter((자리, i) => 자리.단계 !== 자리들[i - 1]?.단계).map((자리) => [자리.단계, 자리.이름]);
    expect(단계마다첫자리).toEqual([
      ['품질 현황', '대시보드'],
      ['테스트 설계', 'PRD 관리'],
      ['테스트 수행', '기능 · UI 테스트'],
      ['결과 분석', '실행 기록'],
      [undefined, '설정'],
    ]);
  });

  it('성능 결과는 실행 기록 › 성능이다 — 성능 테스트 아래에 실행 기록이 없다', () => {
    const 자리들 = 자리목록(사람({ kind: 'APP' }), 'PAY', 'ko');
    expect(자리들.find((자리) => 자리.이름 === '실행 기록')?.하위?.at(-1)).toEqual({ 이름: '성능', 해시: '#/perf/runs', 라벨: '실행 기록 · 성능' });
    expect(자리들.find((자리) => 자리.이름 === '성능 테스트')?.하위?.map((하위) => 하위.해시)).toEqual(['#/perf/scenarios', '#/perf/devices']);
  });

  it('호환성은 실행 칸을 쓴다 — 실행을 못 보는 사람에게는 메뉴도 기록도 없고, 메뉴에 신규 꼬리표는 없다', () => {
    const 이름들 = (runs: 'none' | 'read') => 자리목록(사람({ kind: 'APP', permissions: { cases: 'read', runs, authoring: 'none' } }), 'PAY', 'ko').map((자리) => 자리.이름);
    // 그래프는 사람의 dashboard 칸이라 남는다 (도메인/인증 §3.5)
    expect(이름들('none')).toEqual(['기능 · UI 테스트', '그래프(Grafana)']);
    const 자리들 = 자리목록(사람({ kind: 'APP' }), 'PAY', 'ko');
    expect(자리들.find((자리) => 자리.이름 === '호환성 테스트')).toMatchObject({ 해시: '#/compat', 단계: '테스트 수행' });
    // 정기 실행은 수행의 맨 끝 — 이미 만든 테스트를 정한 시각에 돌린다 (도메인/정기실행 §3.16 결정 1)
    expect(자리들.find((자리) => 자리.이름 === '정기 실행')).toMatchObject({ 해시: '#/sched', 아이콘: 'sched', 단계: '테스트 수행' });
    expect(자리들.find((자리) => 자리.이름 === '실행 기록')?.하위?.find((하위) => 하위.이름 === '호환성')).toEqual({ 이름: '호환성', 해시: '#/runs/compat', 라벨: '실행 기록 · 호환성' });
  });

  it('Issue Bunker 를 이은 프로젝트에만 결함 관리 ↗ 가 안정화 지표 다음 · 그래프 앞에 서고 새 탭으로 연다', () => {
    const 이름들 = (btsUrl?: string | null) => 자리목록(사람({ btsUrl }), 'PAY', 'ko').map((자리) => 자리.이름);
    expect(이름들(undefined)).not.toContain('결함 관리');
    expect(이름들(null)).not.toContain('결함 관리');
    // 서버도 https:// 만 저장하지만 href 에 꽂는 값이라 다른 꼴은 메뉴를 세우지 않는다
    expect(이름들('javascript:alert(1)')).not.toContain('결함 관리');

    const 자리들 = 자리목록(사람({ btsUrl: 'https://bunker.example.com' }), 'PAY', 'ko');
    expect(자리들.map((자리) => 자리.이름).slice(-3)).toEqual(['안정화 지표', '결함 관리', '그래프(Grafana)']);
    expect(자리들.find((자리) => 자리.이름 === '결함 관리')).toEqual({ 이름: '결함 관리', 해시: 'https://bunker.example.com', 아이콘: 'defect', 바깥: true, 단계: '결과 분석' });
  });

  it('기능 칸이 다 none 이면 Bunker 를 이었어도 결함 관리가 없고 「권한을 받지 않았습니다」 안내가 그대로 뜬다', () => {
    const 칸없음: User = { ...사람({ btsUrl: 'https://bunker.example.com', permissions: { cases: 'none', runs: 'none', authoring: 'none' } }), dashboard: 'none' };
    expect(자리목록(칸없음, 'PAY', 'ko')).toEqual([]);
    expect(빈띠사유(칸없음, 'PAY', 'ko')?.무엇).toBe('권한을 받지 않았습니다. 관리자에게 요청하세요');
  });

  it('종류를 모르면 웹으로 읽는다 — 기기 성능이 없다', () => {
    expect(메뉴(undefined).find(([이름]) => 이름 === '성능 테스트')?.[1]).toEqual(['부하 테스트', '페이지 성능']);
  });
});
