// admin 분포 칸이 에이전트와 같은 경계인지, 합친 분포에서 95% 를 ±5% 로 세는지 본다

import { describe, expect, it } from 'vitest';

import * as agent from '../../../perf-agent/src/hist.js';
import { HIST_BUCKETS, addHist, bucketOf, emptyHist, percentile } from './hist.js';

describe('분포 칸', () => {
  it('에이전트와 칸 수 · 경계가 같다', () => {
    expect(HIST_BUCKETS).toBe(agent.HIST_BUCKETS);
    for (let ms = 0; ms < 70_000; ms = ms < 10 ? ms + 0.01 : ms * 1.003) {
      expect(bucketOf(ms)).toBe(agent.bucketOf(ms));
    }
  });

  it('에이전트 둘의 분포를 칸끼리 더해 95% 응답시간을 다시 센다', () => {
    const a = emptyHist();
    const b = emptyHist();
    for (let i = 0; i < 90; i++) a[bucketOf(100)]++;
    for (let i = 0; i < 10; i++) b[bucketOf(1000)]++;
    const sum = emptyHist();
    addHist(sum, a);
    addHist(sum, b);
    const p95 = percentile(sum, 0.95) ?? 0;
    expect(Math.abs(p95 - 1000) / 1000).toBeLessThanOrEqual(0.05);
    const p50 = percentile(sum, 0.5) ?? 0;
    expect(Math.abs(p50 - 100) / 100).toBeLessThanOrEqual(0.05);
  });

  it('빈 분포는 null 이다', () => {
    expect(percentile(emptyHist(), 0.95)).toBeNull();
  });
});
