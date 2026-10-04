// 작성 결과 일관성 검사 — 같은 기획서로 여러 번 작성한 결과가 얼마나 같은지 재는 숫자
import { describe, expect, it } from 'vitest';

import { 확인문장들 } from './authoring-consistency.js';

describe('확인 문장 뽑기 (8·9번 측정 · 2026-10-04)', () => {
  it('verify 의 첫 인자 문자열을 차례대로 뽑고 빈칸은 하나로 모은다', () => {
    const 글 = [
      "await verify('로고가 보인다', a, true);",
      'await verify(\n      "목록에   두 건이\n 보인다",\n      [x],\n      [y],\n    );',
      "await verify(변수, 1, 1);",
      'await verify(`금액은 ${n}원`, 1, 1);',
    ].join('\n');
    expect(확인문장들(글)).toEqual(['로고가 보인다', '목록에 두 건이 보인다']);
  });

  it('작은따옴표 안의 이스케이프된 따옴표에서 끊기지 않는다', () => {
    expect(확인문장들("verify('「It\\'s」가 보인다', 1, 1)")).toEqual(["「It's」가 보인다"]);
  });
});
