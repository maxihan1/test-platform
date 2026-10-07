// 디바이스 줄 잠금(phone.ts)의 새치기 없는 줄서기를 본다 (SPEC 실행 §3.2)

import { beforeEach, describe, expect, it, vi } from 'vitest';

type 폰모듈 = typeof import('./phone.js');
let 폰: 폰모듈;

beforeEach(async () => {
  vi.resetModules();
  폰 = await import('./phone.js');
});

const 한턴 = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe('폰을바로잡는다', () => {
  it('비어 있으면 잡고 true, 잡은 동안은 false 다', () => {
    expect(폰.폰을바로잡는다()).toBe(true);
    expect(폰.폰을바로잡는다()).toBe(false);
  });

  it('기다리는 것이 있으면 놓인 직후에도 false 다 — 줄 선 것이 먼저다', async () => {
    expect(폰.폰을바로잡는다()).toBe(true);
    const 돈것: string[] = [];
    const 기다림 = 폰.폰차례(async () => { 돈것.push('기다리던 것'); });

    폰.폰을놓는다();
    expect(폰.폰을바로잡는다()).toBe(false);

    await 기다림;
    expect(돈것).toEqual(['기다리던 것']);
  });
});

describe('폰을놓는다', () => {
  it('놓으면 먼저 온 기다림부터 돈다', async () => {
    expect(폰.폰을바로잡는다()).toBe(true);
    const 순서: string[] = [];
    const 일 = [
      폰.폰차례(async () => { 순서.push('하나'); }),
      폰.폰차례(async () => { 순서.push('둘'); }),
    ];

    폰.폰을놓는다();
    await Promise.all(일);
    expect(순서).toEqual(['하나', '둘']);
  });

  it('기다리는 것이 없으면 다시 바로 잡을 수 있다', () => {
    expect(폰.폰을바로잡는다()).toBe(true);
    폰.폰을놓는다();
    expect(폰.폰을바로잡는다()).toBe(true);
  });
});

describe('폰차례', () => {
  it('셋은 겹치지 않고 차례로 돈다', async () => {
    let 지금 = 0;
    let 최대 = 0;
    const 일 = (): Promise<void> =>
      폰.폰차례(async () => {
        지금 += 1;
        최대 = Math.max(최대, 지금);
        await 한턴();
        지금 -= 1;
      });

    await Promise.all([일(), 일(), 일()]);
    expect(최대).toBe(1);
  });

  it('일이 던져도 놓는다', async () => {
    await expect(폰.폰차례(async () => { throw new Error('깨졌다'); })).rejects.toThrow('깨졌다');
    expect(폰.폰을바로잡는다()).toBe(true);
  });
});
