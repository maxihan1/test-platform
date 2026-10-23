// 1초 숫자 보내기 고리가 끝난 뒤 남은 초를 실패에도 끝까지 보내는지 본다 (도메인/성능 §5.4)

import { describe, expect, it } from 'vitest';

import { pumpSeconds, type SecondSource } from './sendLoop.js';

describe('pumpSeconds', () => {
  it('끝난 뒤 몰아 보내기가 한 번 실패해도 남은 초를 다시 보낸다', async () => {
    const bins = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const src: SecondSource = {
      take: (sec) => {
        bins.delete(sec);
        return { sec, vus: 1, txs: [] };
      },
      leftovers: () => [...bins].sort((a, b) => a - b),
    };
    const sent: number[] = [];
    let failed = false;
    const next = await pumpSeconds(Date.now(), src, Promise.resolve(), async (s) => {
      if (s.sec === 3 && !failed) {
        failed = true;
        return false;
      }
      sent.push(s.sec);
      return true;
    });
    expect(sent).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9]);
    expect(next).toBe(10);
  });
});
