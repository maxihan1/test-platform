// 주소 해시가 어떤 화면으로 풀리는지

import { describe, expect, it } from 'vitest';

import { route } from './route.js';

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
});
