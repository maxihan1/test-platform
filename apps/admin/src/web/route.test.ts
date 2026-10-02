// 주소 해시가 어떤 화면으로 풀리는지

import { describe, expect, it } from 'vitest';

import type { ServiceRow, User } from './api.js';
import type { 권한칸 } from './role.js';
import { route, 갈자리, 돌아갈자리, 집 } from './route.js';

function 서비스(prefix: string, permissions: 권한칸): ServiceRow {
  return { id: 1, prefix, name: prefix, color: '#000000', envs: [], hasSlackWebhook: false, permissions };
}

function 사람(services: ServiceRow[]): User {
  return { username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false, services };
}

const 다봄 = 사람([서비스('PAY', { cases: 'read', runs: 'read', authoring: 'read' })]);
// 케이스가 none 이라 집이 작성으로 내려간다
const 케이스없음 = 사람([서비스('PAY', { cases: 'none', runs: 'read', authoring: 'write' })]);
const 실행만 = 사람([서비스('PAY', { cases: 'none', runs: 'read', authoring: 'none' })]);

describe('route', () => {
  it('빈 주소는 케이스 목록이다', () => {
    expect(route('')).toEqual({ name: 'cases', kind: 'FN' });
    expect(route('#/')).toEqual({ name: 'cases', kind: 'FN' });
    expect(route('#/cases')).toEqual({ name: 'cases', kind: 'FN' });
    // 사이드바 하위 메뉴 — 종류가 주소에 남아 새로고침에도 안 풀린다 (화면공통 §8 · PR #132)
    expect(route('#/cases/fn')).toEqual({ name: 'cases', kind: 'FN' });
    expect(route('#/cases/ui')).toEqual({ name: 'cases', kind: 'UI' });
    expect(route('#/cases/zz')).toMatchObject({ name: 'unknown' });
  });

  it('케이스 실행 설정', () => {
    expect(route('#/cases/DEMO-003/run')).toEqual({ name: 'setup', tcId: 'DEMO-003' });
  });

  it('실행 묶음 목록과 실행 1건', () => {
    expect(route('#/runs')).toEqual({ name: 'runs', kind: 'FN' });
    expect(route('#/runs/ui')).toEqual({ name: 'runs', kind: 'UI' });
    expect(route('#/runs/fn')).toEqual({ name: 'runs', kind: 'FN' });
    expect(route('#/runs/123')).toEqual({ name: 'run', runId: 123 });
  });

  it('항목 상세', () => {
    expect(route('#/runs/123/items/161')).toEqual({ name: 'item', runId: 123, historyId: 161 });
  });

  it('숫자가 아닌 실행 번호는 모르는 주소다', () => {
    expect(route('#/runs/abc')).toMatchObject({ name: 'unknown' });
    expect(route('#/runs/123/items/xyz')).toMatchObject({ name: 'unknown' });
  });

  it('모르는 주소는 그대로 알려 준다', () => {
    expect(route('#/nowhere')).toEqual({ name: 'unknown', hash: '#/nowhere' });
  });

  it('작성 줄 목록', () => {
    expect(route('#/authoring')).toEqual({ name: 'authoring' });
  });

  it('작성 한 건 상세', () => {
    expect(route('#/authoring/12')).toEqual({ name: 'authoringItem', id: 12 });
  });

  it('작성 번호가 숫자가 아니면 모르는 주소다. 서버도 숫자 글자만 받는다', () => {
    expect(route('#/authoring/12a')).toEqual({ name: 'unknown', hash: '#/authoring/12a' });
  });

  it('로그인 화면', () => {
    expect(route('#/login')).toEqual({ name: 'login' });
  });

  it('비밀번호 변경 화면', () => {
    expect(route('#/password')).toEqual({ name: 'password' });
  });

  it('회원가입 화면', () => {
    expect(route('#/signup')).toEqual({ name: 'signup' });
  });

  it('회원가입 화면도 돌아갈 자리로 기억하지 않는다. 로그인한 사람에게는 집이다', () => {
    expect(돌아갈자리('#/signup', 다봄, 'PAY')).toBe('#/cases');
  });

  it('돌아갈 자리는 지금 주소다. 로그인이 끝나면 원래 가려던 화면으로 보낸다', () => {
    expect(돌아갈자리('#/runs/123', 다봄, 'PAY')).toBe('#/runs/123');
  });

  it('로그인 화면 자체는 돌아갈 자리로 기억하지 않는다. 기억하면 로그인 뒤 또 로그인 화면이다', () => {
    expect(돌아갈자리('#/login', 다봄, 'PAY')).toBe('#/cases');
  });

  it('빈 주소는 케이스 목록으로 돌려보낸다', () => {
    expect(돌아갈자리('', 다봄, 'PAY')).toBe('#/cases');
  });

  it('집은 남은 자리 중 맨 위다. 케이스가 none 이면 케이스가 집이 아니다', () => {
    expect(집(다봄, 'PAY')).toBe('#/cases');
    expect(집(케이스없음, 'PAY')).toBe('#/authoring');
    expect(집(실행만, 'PAY')).toBe('#/runs');
  });

  it('none 인 자리 주소를 직접 치면 집으로 보낸다', () => {
    expect(갈자리('#/cases', 케이스없음, 'PAY')).toBe('#/authoring');
    expect(갈자리('', 케이스없음, 'PAY')).toBe('#/authoring');
    expect(갈자리('#/authoring', 실행만, 'PAY')).toBe('#/runs');
    expect(갈자리('#/runs', 사람([서비스('PAY', { cases: 'read', runs: 'none', authoring: 'none' })]), 'PAY')).toBe('#/cases');
  });

  it('한 건 주소는 띠의 서비스로 가르지 않는다. 그 건의 서비스는 화면이 안다', () => {
    const 둘 = 사람([
      서비스('AAA', { cases: 'read', runs: 'none', authoring: 'none' }),
      서비스('BBB', { cases: 'read', runs: 'read', authoring: 'read' }),
    ]);
    expect(갈자리('#/runs/5', 둘, 'AAA')).toBe('#/runs/5');
    expect(갈자리('#/runs/5/items/9', 둘, 'AAA')).toBe('#/runs/5/items/9');
    expect(갈자리('#/authoring/12', 둘, 'AAA')).toBe('#/authoring/12');
    expect(갈자리('#/cases/BBB-001/run', 케이스없음, 'PAY')).toBe('#/cases/BBB-001/run');
  });

  it('권한이 있는 자리나 기능에 안 매인 주소는 그대로 둔다', () => {
    expect(갈자리('#/cases', 다봄, 'PAY')).toBe('#/cases');
    expect(갈자리('#/settings', 다봄, 'PAY')).toBe('#/settings');
    expect(갈자리('#/nowhere', 다봄, 'PAY')).toBe('#/nowhere');
  });

  it('로그인 뒤 돌아갈 자리도 같은 규칙을 따른다', () => {
    expect(돌아갈자리('#/cases', 케이스없음, 'PAY')).toBe('#/authoring');
    expect(돌아갈자리('#/login', 케이스없음, 'PAY')).toBe('#/authoring');
    expect(돌아갈자리('', 실행만, 'PAY')).toBe('#/runs');
  });
});
