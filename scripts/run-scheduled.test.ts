// 손으로 돌리는 정기 실행 명령의 인자 읽기를 본다

import { describe, expect, it } from 'vitest';

import { 세트번호 } from './run-scheduled.js';

describe('run-scheduled 세트 번호', () => {
  it('양의 정수 하나만 받는다', () => {
    expect(세트번호(['12'])).toBe(12);
    expect(세트번호([])).toBeNull();
    expect(세트번호(['MKT'])).toBeNull();
    expect(세트번호(['0'])).toBeNull();
    expect(세트번호(['3', '4'])).toBeNull();
  });
});
