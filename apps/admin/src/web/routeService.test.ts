// 주소가 가리키는 애플리케이션 읽기와 애플리케이션을 바꿀 때 주소 고치기 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)

import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import type { 권한칸 } from './role.js';
import { 결정필요주소, 케이스주소 } from './route.js';
import { 링크를못보나, 서비스바꾼주소, 서비스번호꼴, 설정자리채운주소, 주소의서비스 } from './routeService.js';

function 서비스(prefix: string, permissions: 권한칸, id: number): ServiceRow {
  return { id, prefix, name: prefix, color: '#000000', projectId: 1, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions };
}

const 다읽음 = { cases: 'read', runs: 'read', authoring: 'read' } as const;
const 나: User = {
  username: 'kim',
  displayName: '김철수',
  role: 'member',
  dashboard: 'read',
  mustChangePassword: false,
  services: [서비스('PAY', 다읽음, 11), 서비스('MEM', 다읽음, 12), 서비스('OPS', { cases: 'none', runs: 'read', authoring: 'read' }, 13)],
};

describe('주소의 애플리케이션', () => {
  it('요구 번호 주소는 그 번호 접두사의 배정 애플리케이션을 고른다 — 다른 애플리케이션 실행의 실패 카드에서 요구 번호를 눌러도 띠 애플리케이션의 PRD 를 열지 않게', () => {
    expect(주소의서비스('#/prd/MEM-REQ-004', 나)).toBe('MEM');
  });

  it('배정에 없는 접두사 · 애플리케이션을 가리키지 않는 주소는 띠를 그대로 둔다', () => {
    expect(주소의서비스('#/prd/SET-REQ-001', 나)).toBe(null);
    expect(주소의서비스('#/prd', 나)).toBe(null);
    expect(주소의서비스('#/cases/fn?case=MEM-FN-001', 나)).toBe(null);
    expect(주소의서비스('#/authoring?todo=1', 나)).toBe(null);
  });

  it('어느 화면이든 service= 칸의 접두사로 고른다 — 다른 애플리케이션을 고른 사람이 케이스 링크를 열어도 「케이스 없음」이 뜨지 않게', () => {
    expect(결정필요주소('MEM')).toBe('#/authoring?todo=1&service=MEM');
    expect(주소의서비스(결정필요주소('MEM'), 나)).toBe('MEM');
    expect(주소의서비스(케이스주소('MEM-FN-001'), 나)).toBe('MEM');
    expect(주소의서비스('#/prd?service=MEM', 나)).toBe('MEM');
    expect(주소의서비스('#/runs/e2e?run=5&service=MEM', 나)).toBe('MEM');
  });

  it('대시보드가 써 온 번호 꼴도 받는다 — 붙여 둔 고리가 썩지 않게. 「전체」는 아무것도 고르지 않는다', () => {
    expect(주소의서비스('#/dashboard?service=12', 나)).toBe('MEM');
    expect(주소의서비스('#/cases/fn?service=12', 나)).toBe('MEM');
    expect(주소의서비스('#/dashboard?service=99', 나)).toBe(null);
    expect(주소의서비스('#/dashboard?service=all', 나)).toBe(null);
    expect(서비스번호꼴('12')).toBe(12);
    expect(서비스번호꼴('012')).toBe(null);
    expect(서비스번호꼴('MEM')).toBe(null);
    expect(서비스번호꼴(null)).toBe(null);
  });

  it('배정은 받았어도 그 화면 칸이 none 이면 고르지 않는다 — 고르면 집으로 튕긴다. 칸이 있는 화면은 고른다', () => {
    expect(주소의서비스('#/cases/fn?service=OPS', 나)).toBe(null);
    expect(주소의서비스('#/authoring?service=OPS', 나)).toBe('OPS');
  });

  it('못 보는 애플리케이션을 가리켰을 때만 안내한다 — 안 가리켰거나 지금 고른 것이면 알릴 것이 없다', () => {
    expect(링크를못보나('#/cases/fn?service=SET', 나, 'PAY')).toBe(true);
    expect(링크를못보나('#/cases/fn?service=99', 나, 'PAY')).toBe(true);
    expect(링크를못보나('#/cases/fn?service=OPS', 나, 'PAY')).toBe(true);
    expect(링크를못보나('#/cases/fn?service=OPS', 나, 'OPS')).toBe(false);
    expect(링크를못보나('#/cases/fn?service=MEM', 나, 'PAY')).toBe(false);
    expect(링크를못보나('#/cases/fn', 나, 'PAY')).toBe(false);
    expect(링크를못보나('#/dashboard?service=all', 나, 'PAY')).toBe(false);
    expect(링크를못보나('#/dashboard?service=99', 나, 'PAY')).toBe(false);
  });
});

describe('애플리케이션을 바꿀 때 주소', () => {
  it('service= 칸만 새 것으로 고친다 — 대시보드는 자기 고르개가 번호로 고친다', () => {
    expect(서비스바꾼주소('#/runs/e2e?run=5&service=MEM', 'MEM', 'PAY')).toBe('#/runs/e2e?run=5&service=PAY');
    expect(서비스바꾼주소('#/scenarios?service=MEM', 'MEM', 'PAY')).toBe('#/scenarios?service=PAY');
    expect(서비스바꾼주소('#/cases/fn?q=x', 'MEM', 'PAY')).toBe('#/cases/fn?q=x');
    expect(서비스바꾼주소('#/cases/fn', 'MEM', 'PAY')).toBe('#/cases/fn');
    expect(서비스바꾼주소('#/dashboard?service=12', 'MEM', 'PAY')).toBe('#/dashboard?service=12');
  });

  it('안정화 지표는 앞 애플리케이션의 실행 번호를 떼고 창만 남긴다 — 남으면 새 애플리케이션 화면이 404 로 빈다', () => {
    expect(서비스바꾼주소('#/stability?run=3044', 'MEM', 'PAY')).toBe('#/stability');
    expect(서비스바꾼주소('#/stability?run=3044&days=30', 'MEM', 'PAY')).toBe('#/stability?days=30');
    expect(서비스바꾼주소('#/stability', 'MEM', 'PAY')).toBe('#/stability');
  });

  it('설정은 보던 애플리케이션의 자리면 따라가고, 설정 메뉴로 다른 것을 골라 둔 자리는 그대로 둔다', () => {
    expect(서비스바꾼주소('#/settings/MEM', 'MEM', 'PAY')).toBe('#/settings/PAY');
    expect(서비스바꾼주소('#/settings/mem', 'MEM', 'PAY')).toBe('#/settings/PAY');
    expect(서비스바꾼주소('#/settings/OPS', 'MEM', 'PAY')).toBe('#/settings/OPS');
    expect(서비스바꾼주소('#/settings/users', 'MEM', 'PAY')).toBe('#/settings/users');
  });

  it('자리 없이 연 설정은 연 애플리케이션 자리로 채운다 — 고른 애플리케이션이 없으면 그대로 둔다', () => {
    expect(설정자리채운주소('#/settings', 'MEM')).toBe('#/settings/MEM');
    expect(설정자리채운주소('#/settings', null)).toBe('#/settings');
    expect(설정자리채운주소('#/settings/OPS', 'MEM')).toBe('#/settings/OPS');
    expect(설정자리채운주소('#/cases/fn', 'MEM')).toBe('#/cases/fn');
  });
});
