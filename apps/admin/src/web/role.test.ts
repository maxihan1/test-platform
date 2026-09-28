import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import { 기능보나, 서비스권한, 케이스서비스, 할수있나, type 권한칸 } from './role.js';

function 서비스(prefix: string, permissions: 권한칸): ServiceRow {
  return { id: 1, prefix, name: prefix, color: '#000000', envs: [], hasSlackWebhook: false, permissions };
}

const 전부읽기: 권한칸 = { cases: 'read', runs: 'read', authoring: 'read' };
const 전부쓰기: 권한칸 = { cases: 'write', runs: 'write', authoring: 'write' };

function 사람(role: User['role'], services: ServiceRow[]): User {
  return { username: 'kim', displayName: '김철수', role, dashboard: 'read', mustChangePassword: false, services };
}

// 결제는 실행 쓰기, 회원은 실행 읽기만
const 김 = 사람('member', [
  서비스('PAY', { cases: 'read', runs: 'write', authoring: 'none' }),
  서비스('MEM', { cases: 'write', runs: 'read', authoring: 'write' }),
]);

describe('서비스별 권한', () => {
  it('실행은 고른 서비스의 실행 쓰기를 본다. 결제에서만 된다', () => {
    expect(할수있나(김, 'PAY', '실행')).toBe(true);
    expect(할수있나(김, 'PAY', '멈춤')).toBe(true);
    expect(할수있나(김, 'PAY', '증적만들기')).toBe(true);
    expect(할수있나(김, 'MEM', '실행')).toBe(false);
    expect(할수있나(김, 'MEM', '멈춤')).toBe(false);
    expect(할수있나(김, 'MEM', '증적만들기')).toBe(false);
  });

  it('증적 받기는 실행 읽기면 된다. 받는 것은 읽기다', () => {
    expect(할수있나(김, 'MEM', '증적받기')).toBe(true);
  });

  it('입력값 저장은 케이스 쓰기가 필요하다', () => {
    expect(할수있나(김, 'PAY', '입력값저장')).toBe(false);
    expect(할수있나(김, 'MEM', '입력값저장')).toBe(true);
  });

  it('다시 스캔은 케이스 쓰기가 필요하다', () => {
    expect(할수있나(김, 'PAY', '다시스캔')).toBe(false);
    expect(할수있나(김, 'MEM', '다시스캔')).toBe(true);
  });

  it('작성 요청은 작성 쓰기가 필요하다', () => {
    expect(할수있나(김, 'PAY', '작성요청')).toBe(false);
    expect(할수있나(김, 'MEM', '작성요청')).toBe(true);
  });

  it('머지와 설정은 운영 계정만. 작성 쓰기로도 안 된다', () => {
    expect(할수있나(김, 'MEM', '작성머지')).toBe(false);
    expect(할수있나(김, 'MEM', '설정')).toBe(false);
    const 운영 = 사람('admin', [서비스('PAY', 전부쓰기)]);
    expect(할수있나(운영, 'PAY', '작성머지')).toBe(true);
    expect(할수있나(운영, 'PAY', '설정')).toBe(true);
    expect(할수있나(운영, null, '설정')).toBe(true);
  });

  it('배정 안 받은 서비스나 서비스를 안 고른 채로는 아무것도 못 한다', () => {
    expect(할수있나(김, 'ZZZ', '증적받기')).toBe(false);
    expect(할수있나(김, null, '증적받기')).toBe(false);
  });

  it('로그인하지 않은 사람은 아무것도 못 한다', () => {
    expect(할수있나(null, 'PAY', '실행')).toBe(false);
    expect(할수있나(null, 'PAY', '증적받기')).toBe(false);
  });

  it('고른 서비스의 칸을 꺼낸다. 없으면 null', () => {
    expect(서비스권한(김, 'PAY')?.runs).toBe('write');
    expect(서비스권한(김, 'ZZZ')).toBe(null);
    expect(서비스권한(null, 'PAY')).toBe(null);
  });

  it('기능이 none 이면 그 기능을 못 본다', () => {
    expect(기능보나(김, 'PAY', 'authoring')).toBe(false);
    expect(기능보나(김, 'MEM', 'authoring')).toBe(true);
    expect(기능보나(사람('member', [서비스('PAY', 전부읽기)]), 'PAY', 'runs')).toBe(true);
    expect(기능보나(김, null, 'cases')).toBe(false);
  });
});

describe('케이스서비스', () => {
  it('tcId 의 첫 - 앞이 서비스 접두사다', () => {
    expect(케이스서비스('PAY-001')).toBe('PAY');
    expect(케이스서비스('MEM2-010-B')).toBe('MEM2');
  });

  it('- 가 없으면 서비스를 모른다', () => {
    expect(케이스서비스('PAY')).toBe(null);
    expect(케이스서비스('-001')).toBe(null);
  });
});
