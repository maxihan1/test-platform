// 애플리케이션 종류마다 자리 목록(이름 · 하위)이 어떻게 서는지 한 표로 지키는 검사

import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import { 자리목록 } from './layout.js';

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

function 메뉴(kind: ServiceRow['kind']) {
  const user: User = { username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false, services: [{ ...기본, kind }] };
  return 자리목록(user, 'PAY', 'ko').map((자리) => [자리.이름, (자리.하위 ?? []).map((하위) => 하위.이름)] as const);
}

describe('종류별 자리 목록', () => {
  it('메뉴는 애플리케이션 종류 하나로만 정한다 — 웹 · Android 앱 · 게임 · API', () => {
    const 앞 = [['대시보드', []]] as const;
    const 뒤 = [['그래프(Grafana)', []]] as const;
    const 작성 = [['테스트 작성', []]] as const;
    const 스크립트 = ['테스트 스크립트', ['기능 테스트', 'UI 테스트']] as const;
    const 시나리오 = ['E2E 시나리오', []] as const;
    const 실행 = ['실행 기록', ['기능 테스트', 'UI 테스트', 'E2E']] as const;

    expect(메뉴('SCREEN')).toEqual([...앞, ['PRD 관리', ['요구사항', '웹 가이드']], ...작성, 스크립트, 시나리오, 실행, ['성능 테스트', ['부하 테스트', '페이지 성능', '실행 기록']], ...뒤]);
    expect(메뉴('APP')).toEqual([...앞, ['PRD 관리', ['요구사항', '앱 가이드']], ...작성, 스크립트, 시나리오, 실행, ['성능 테스트', ['부하 테스트', '앱 성능', '실행 기록']], ...뒤]);
    expect(메뉴('GAME')).toEqual([...앞, ['PRD 관리', ['요구사항', '게임 가이드']], ...작성, 스크립트, 시나리오, 실행, ['성능 테스트', ['부하 테스트', '게임 성능', '실행 기록']], ...뒤]);
    // API 는 맨 위 「API」 묶음이 없고 API 문서가 PRD 관리 아래에 선다. 테스트 스크립트는 하위 없이 한 줄, 실행 기록은 UI 테스트만 빠진다
    expect(메뉴('API')).toEqual([
      ...앞,
      ['PRD 관리', ['요구사항', 'API 문서', 'API 가이드']],
      ...작성,
      ['테스트 스크립트', []],
      시나리오,
      ['실행 기록', ['기능 테스트', 'E2E']],
      ['성능 테스트', ['부하 테스트', '실행 기록']],
      ...뒤,
    ]);
  });

  it('종류를 모르면 웹으로 읽는다 — 기기 성능이 없다', () => {
    expect(메뉴(undefined).find(([이름]) => 이름 === '성능 테스트')?.[1]).toEqual(['부하 테스트', '페이지 성능', '실행 기록']);
  });
});
