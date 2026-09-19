import { describe, expect, it } from 'vitest';

import { 다음이있나 } from './paging.js';

describe('다음 페이지가 있는가', () => {
  it('받은 건수가 한 쪽 크기와 같으면 더 있을 수 있다', () => {
    expect(다음이있나({ items: new Array(50).fill(0), pageSize: 50 })).toBe(true);
  });

  it('한 쪽 크기보다 적게 오면 마지막 쪽이다', () => {
    expect(다음이있나({ items: new Array(12).fill(0), pageSize: 50 })).toBe(false);
  });

  it('하나도 안 오면 마지막 쪽이다', () => {
    expect(다음이있나({ items: [], pageSize: 50 })).toBe(false);
  });

  it('총건수를 아예 받지 않는다. 그 값이 근사치가 되는 날 빈 페이지가 생긴다 (SPEC §8.1)', () => {
    // 인자에 total 자리가 없다는 것이 이 규칙을 타입으로 말한다.
    // 서버 응답을 통째로 넘겨도 읽는 것은 items 와 pageSize 뿐이다
    const 응답 = { items: new Array(12).fill(0), total: 999999, totalIsExact: false, page: 1, pageSize: 50 };
    expect(다음이있나(응답)).toBe(false);
  });
});
