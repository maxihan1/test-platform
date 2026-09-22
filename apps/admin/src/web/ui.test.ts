import { describe, expect, it } from 'vitest';

import { seconds, when } from './ui.js';

describe('시각과 소요시간은 언어를 따른다 (SPEC §8 다국어)', () => {
  const 그때 = '2026-09-22T05:13:00.000Z';

  it('한국어와 영어의 형식이 다르다', () => {
    const 한 = when(그때, 'ko');
    const 영 = when(그때, 'en');
    expect(한).not.toBe(영);
  });

  it('한국어는 년·월·일을 그 낱말로 적는다', () => {
    expect(when(그때, 'ko')).toMatch(/년.*월.*일/u);
  });

  it('영어에는 한글이 하나도 없다. 형식을 손으로 조립하면 여기가 안 바뀐다', () => {
    expect(when(그때, 'en')).not.toMatch(/[가-힣]/u);
  });

  it('값이 없으면 두 언어가 같은 줄표를 쓴다. 빈 칸을 지어내지 않는다', () => {
    expect(when(null, 'ko')).toBe('—');
    expect(when(null, 'en')).toBe('—');
  });

  it('소요시간도 언어를 탄다', () => {
    expect(seconds(1250, 'ko')).toBe('1.25초');
    expect(seconds(1250, 'en')).not.toMatch(/[가-힣]/u);
    expect(seconds(null, 'ko')).toBe('—');
  });
});
