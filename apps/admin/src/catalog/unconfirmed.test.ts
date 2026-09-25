// 미확정 꼬리표 규칙 K11 과 「이미 있던 케이스에 새로 단 꼬리표」 판별을 검사한다

import { describe, expect, it } from 'vitest';

import { checkSource } from './rules.js';

function 케이스(extra: string, head = ''): string {
  return `import { defineCase, test, verify } from '@platform/kit';
${head}
export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: [],
  params: null,
  expected: null,
  ${extra}
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await verify('제목이 보인다', true, true);
  });
});
`;
}

function k11(source: string): string[] {
  return checkSource('x.spec.ts', source)
    .violations.filter((v) => v.rule === 'K11')
    .map((v) => v.what);
}

describe('K11 — unconfirmed 는 비지 않은 문자열 리터럴', () => {
  it('① 사유 리터럴은 통과한다', () => {
    expect(k11(케이스(`unconfirmed: '기획서와 다름',`))).toEqual([]);
  });

  it('② 빈 문자열은 위반이다', () => {
    expect(k11(케이스(`unconfirmed: '',`))).toHaveLength(1);
  });

  it('③ 공백뿐인 문자열은 위반이다', () => {
    expect(k11(케이스(`unconfirmed: '   ',`))).toHaveLength(1);
  });

  it('④ 변수는 위반이다', () => {
    expect(k11(케이스(`unconfirmed: 사유,`, `const 사유 = '기획서와 다름';`))).toHaveLength(1);
  });

  it('⑤ 템플릿 식은 위반이다', () => {
    expect(k11(케이스('unconfirmed: `a${b}`,', `const b = 'x';`))).toHaveLength(1);
  });

  it('⑥ 키가 없으면 통과한다', () => {
    expect(k11(케이스(''))).toEqual([]);
  });

  it('⑦ 축약 { unconfirmed } 는 위반이다', () => {
    expect(k11(케이스('unconfirmed,', `const unconfirmed = '기획서와 다름';`))).toHaveLength(1);
  });

  it('⑧ 펼침이 있으면 위반이다 — 사유를 글자로 못 읽는다', () => {
    expect(k11(케이스('...base,', `const base = { unconfirmed: '기획서와 다름' };`))).toHaveLength(1);
  });
});
