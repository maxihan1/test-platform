// 동시 실행이 설정값(기본 2)을 넘지 않는지 본다 (SPEC §3.2 불변식).
// 실행 묶음마다가 아니라 서버 전체에서 2다 — CPU가 2코어라 그 이상은 느려지기만 한다 (SPEC §9)

import { afterEach, describe, expect, it } from 'vitest';

import { enqueue } from './dispatcher.js';

function 관찰기(): { 시작: () => void; 끝: () => void; 최대: () => number } {
  let 지금 = 0;
  let 최대 = 0;
  return {
    시작: () => { 지금 += 1; 최대 = Math.max(최대, 지금); },
    끝: () => { 지금 -= 1; },
    최대: () => 최대,
  };
}

function 잠깐(): Promise<void> {
  return new Promise((done) => setTimeout(done, 5));
}

afterEach(() => {
  delete process.env.EXECUTION_CONCURRENCY;
});

describe('enqueue', () => {
  it('동시에 도는 작업이 2를 넘지 않는다', async () => {
    const 본다 = 관찰기();
    const 일 = Array.from({ length: 8 }, () =>
      enqueue(async () => {
        본다.시작();
        await 잠깐();
        본다.끝();
      }),
    );

    await Promise.all(일);
    expect(본다.최대()).toBe(2);
  });

  it('서로 다른 실행이 한꺼번에 들어와도 합쳐서 2를 넘지 않는다', async () => {
    const 본다 = 관찰기();
    const 한묶음 = (): Promise<void>[] =>
      Array.from({ length: 4 }, () =>
        enqueue(async () => {
          본다.시작();
          await 잠깐();
          본다.끝();
        }),
      );

    await Promise.all([...한묶음(), ...한묶음()]);
    expect(본다.최대()).toBe(2);
  });

  it('작업 결과를 넣은 쪽에 돌려준다', async () => {
    const 결과 = await Promise.all([enqueue(async () => '가'), enqueue(async () => '나')]);
    expect(결과).toEqual(['가', '나']);
  });

  it('하나가 던져도 나머지는 계속 처리된다', async () => {
    const 끝난것: string[] = [];
    const 일 = [
      enqueue(async () => { throw new Error('첫 번째가 깨졌다'); }),
      enqueue(async () => { 끝난것.push('둘'); }),
      enqueue(async () => { 끝난것.push('셋'); }),
    ];

    await expect(일[0]).rejects.toThrow('첫 번째가 깨졌다');
    await Promise.all(일.slice(1));
    expect(끝난것).toEqual(['둘', '셋']);
  });

  it('설정값으로 동시 수를 올릴 수 있다', async () => {
    process.env.EXECUTION_CONCURRENCY = '4';
    const 본다 = 관찰기();

    await Promise.all(
      Array.from({ length: 8 }, () =>
        enqueue(async () => {
          본다.시작();
          await 잠깐();
          본다.끝();
        }),
      ),
    );
    expect(본다.최대()).toBe(4);
  });
});
