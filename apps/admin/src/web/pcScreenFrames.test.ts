// 윈도우 PC 화면 영상 흐름 가르기 · 조각 머리 풀기 · 코덱 이름 (도메인/실행 §7 「…/pc-screen」)

import { describe, expect, it } from 'vitest';

import { 머리를푼다, 잇는다, 조각을가른다, 코덱 } from './pcScreenFrames.js';

function 조각(종류: number, 시각: number, 영상: number[]): Uint8Array {
  const b = new Uint8Array(9 + 영상.length);
  b[0] = 종류;
  new DataView(b.buffer).setFloat64(1, 시각);
  b.set(영상, 9);
  return b;
}

function 길이붙인(c: Uint8Array): Uint8Array {
  const b = new Uint8Array(4 + c.length);
  new DataView(b.buffer).setUint32(0, c.length);
  b.set(c, 4);
  return b;
}

describe('조각을가른다', () => {
  it('다 온 조각만 떼고 덜 온 끝은 남긴다 — 남은 것과 다음 바이트를 이으면 마저 갈린다', () => {
    const 하나 = 길이붙인(new Uint8Array([1, 2, 3]));
    const 둘 = 길이붙인(new Uint8Array([4, 5]));
    const 흐름 = 잇는다(하나, 둘);

    const 앞 = 조각을가른다(흐름.subarray(0, 하나.length + 3));
    expect(앞.조각들.map((c) => [...c])).toEqual([[1, 2, 3]]);
    expect(앞.남은.length).toBe(3);

    const 뒤 = 조각을가른다(잇는다(앞.남은, 흐름.subarray(하나.length + 3)));
    expect(뒤.조각들.map((c) => [...c])).toEqual([[4, 5]]);
    expect(뒤.남은.length).toBe(0);
  });

  it('길이 4바이트도 덜 왔으면 하나도 안 뗀다', () => {
    expect(조각을가른다(new Uint8Array([0, 0])).조각들).toEqual([]);
  });
});

describe('머리를푼다', () => {
  it('종류 · 시각 · 영상을 푼다 — 시각이 NaN 이면 없다', () => {
    expect(머리를푼다(조각(1, 1500, [9, 9]))).toEqual({ 종류: 'key', 시각: 1500, 영상: new Uint8Array([9, 9]) });
    expect(머리를푼다(조각(2, Number.NaN, [7]))).toEqual({ 종류: 'config', 시각: undefined, 영상: new Uint8Array([7]) });
    expect(머리를푼다(조각(0, 3, []))?.종류).toBe('delta');
  });

  it('머리보다 짧거나 모르는 종류면 버린다', () => {
    expect(머리를푼다(new Uint8Array([1, 0, 0]))).toBeUndefined();
    expect(머리를푼다(조각(5, 0, [1]))).toBeUndefined();
  });
});

describe('코덱', () => {
  it('설정 조각의 SPS 에서 avc1 이름을 만든다', () => {
    // 00 00 01 67(SPS) 64 00 1f … · 00 00 01 68(PPS)
    expect(코덱(new Uint8Array([0, 0, 0, 1, 0x67, 0x64, 0x00, 0x1f, 0xac, 0, 0, 1, 0x68, 0xee]))).toBe('avc1.64001f');
  });

  it('SPS 가 없거나 잘렸으면 없다', () => {
    expect(코덱(new Uint8Array([0, 0, 1, 0x68, 1, 2, 3]))).toBeUndefined();
    expect(코덱(new Uint8Array([0, 0, 1, 0x67, 0x64]))).toBeUndefined();
  });
});
