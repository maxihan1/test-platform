// 분포 칸 경계가 명세(도메인/성능 §3.9 「분포」)와 같은지 본다 — QA Hub 가 같은 경계로 95% 를 다시 센다

import { describe, expect, it } from 'vitest';

import { HIST_BUCKETS, bucketOf } from './hist.js';

describe('bucketOf', () => {
  it('1ms 이하는 칸 0, 1.1^i ms 는 칸 i 에 든다', () => {
    expect(bucketOf(0)).toBe(0);
    expect(bucketOf(1)).toBe(0);
    expect(bucketOf(1.05)).toBe(1);
    expect(bucketOf(1.1)).toBe(1);
    expect(bucketOf(1.1 ** 50)).toBe(50);
    expect(bucketOf(1.1 ** 50 * 1.01)).toBe(51);
  });

  it('116칸이고 약 57.6초 넘는 응답은 마지막 칸에 센다', () => {
    expect(HIST_BUCKETS).toBe(116);
    expect(bucketOf(57_000)).toBe(115);
    expect(bucketOf(600_000)).toBe(115);
  });
});
