// 주소 해시가 어떤 화면으로 풀리는지

import { describe, expect, it } from 'vitest';

import { route, 돌아갈자리 } from './route.js';

describe('route', () => {
  it('빈 주소는 케이스 목록이다', () => {
    expect(route('')).toEqual({ name: 'cases' });
    expect(route('#/')).toEqual({ name: 'cases' });
    expect(route('#/cases')).toEqual({ name: 'cases' });
  });

  it('케이스 실행 설정', () => {
    expect(route('#/cases/DEMO-003/run')).toEqual({ name: 'setup', tcId: 'DEMO-003' });
  });

  it('실행 묶음 목록과 실행 1건', () => {
    expect(route('#/runs')).toEqual({ name: 'runs' });
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

  it('돌아갈 자리는 지금 주소다. 로그인이 끝나면 원래 가려던 화면으로 보낸다', () => {
    expect(돌아갈자리('#/runs/123')).toBe('#/runs/123');
  });

  it('로그인 화면 자체는 돌아갈 자리로 기억하지 않는다. 기억하면 로그인 뒤 또 로그인 화면이다', () => {
    expect(돌아갈자리('#/login')).toBe('#/cases');
  });

  it('빈 주소는 케이스 목록으로 돌려보낸다', () => {
    expect(돌아갈자리('')).toBe('#/cases');
  });
});
