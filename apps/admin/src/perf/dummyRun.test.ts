// 더미 클라이언트 실행의 순수 셈 — 사용자 몫 나누기 · 단계 줄이기 · 대상 칸 · 올리기 크기 막기

import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { describe, expect, it } from 'vitest';

import { 올리기막기 } from './dummy.js';
import { 단계나누기, 대상칸, 몫나누기 } from './dummyRun.js';

describe('몫나누기', () => {
  it('합이 항상 최대 동시 사용자와 같다', () => {
    for (const [total, weights] of [[10, [500, 500]], [7, [300, 100, 100]], [1, [500, 500, 500]], [100, [1, 1, 1]], [2, [3, 1]]] as const) {
      expect(몫나누기(total, [...weights]).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('남는 사용자는 나머지가 큰 에이전트부터, 같으면 앞 에이전트부터 받고 몫이 0 인 에이전트도 생긴다', () => {
    expect(몫나누기(2, [3, 1])).toEqual([2, 0]);
    expect(몫나누기(1, [500, 500, 500])).toEqual([1, 0, 0]);
    expect(몫나누기(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(몫나누기(7, [300, 100, 100])).toEqual([4, 2, 1]);
  });
});

describe('단계나누기', () => {
  it('단계마다 에이전트 합이 그 단계 목표와 같고 정점은 몫과 같다', () => {
    const 단계 = [{ durationSec: 10, target: 1 }, { durationSec: 20, target: 4 }];
    expect(단계나누기(단계, [2, 2])).toEqual([
      [{ durationSec: 10, target: 1 }, { durationSec: 20, target: 2 }],
      [{ durationSec: 10, target: 0 }, { durationSec: 20, target: 2 }],
    ]);
    expect(단계나누기([{ durationSec: 5, target: 3 }], [3, 0])).toEqual([[{ durationSec: 5, target: 3 }], [{ durationSec: 5, target: 0 }]]);
    expect(단계나누기([{ durationSec: 5, target: 0 }], [0, 0])).toEqual([[{ durationSec: 5, target: 0 }], [{ durationSec: 5, target: 0 }]]);
  });
});

describe('대상칸', () => {
  it('주소의 호스트와 포트를 주고 포트가 없으면 https 443 · http 80 이다', () => {
    expect(대상칸('https://game.test')).toEqual({ host: 'game.test', port: '443' });
    expect(대상칸('http://game.test')).toEqual({ host: 'game.test', port: '80' });
    expect(대상칸('http://game.test:7000/x')).toEqual({ host: 'game.test', port: '7000' });
  });
});

describe('올리기막기', () => {
  const 흘리기 = (...덩어리: Buffer[]) => pipeline(Readable.from(덩어리), 올리기막기(10), new Writable({ write: (_c, _e, done) => done() }));

  it('zip 머리로 시작하고 상한 안이면 지나간다 — 머리가 여러 덩어리에 쪼개져도', async () => {
    await expect(흘리기(Buffer.from([0x50, 0x4b]), Buffer.from([0x03, 0x04, 1, 2]))).resolves.toBeUndefined();
  });

  it('머리가 다르거나 4바이트보다 짧으면 INVALID_REQUEST', async () => {
    await expect(흘리기(Buffer.from('abcdefg'))).rejects.toMatchObject({ status: 400, error: 'INVALID_REQUEST' });
    await expect(흘리기(Buffer.from([0x50, 0x4b]))).rejects.toMatchObject({ status: 400 });
  });

  it('상한을 넘으면 PAYLOAD_TOO_LARGE', async () => {
    await expect(흘리기(Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(7))).rejects.toMatchObject({ status: 413, error: 'PAYLOAD_TOO_LARGE' });
  });
});
