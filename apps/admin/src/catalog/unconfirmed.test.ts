// 미확정 꼬리표 규칙 K11 을 검사한다

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

  it('⑨ 따옴표 키에 변수를 달아도 위반이다', () => {
    expect(k11(케이스(`'unconfirmed': 사유,`, `const 사유 = '기획서와 다름';`))).toHaveLength(1);
  });

  it('⑩ 계산된 키 [k] 는 위반이다 — 펼침처럼 글자로 못 읽는다', () => {
    expect(k11(케이스(`[k]: '기획서와 다름',`, `const k = 'unconfirmed';`))).toHaveLength(1);
  });
});

function k13(source: string): string[] {
  return checkSource('x.spec.ts', source)
    .violations.filter((v) => v.rule === 'K13')
    .map((v) => v.what);
}

describe('K13 — held 는 K11 과 같은 모양 검사', () => {
  it('사유 리터럴은 통과한다', () => {
    expect(k13(케이스(`held: '판정 불가 — 기획서에 한도가 없다',`))).toEqual([]);
  });

  it('빈 문자열·공백뿐은 위반이다', () => {
    expect(k13(케이스(`held: '',`))).toHaveLength(1);
    expect(k13(케이스(`held: '  ',`))).toHaveLength(1);
  });

  it('변수는 위반이다', () => {
    expect(k13(케이스(`held: 사유,`, `const 사유 = '보류 — x';`))).toHaveLength(1);
  });

  it('축약 { held } 는 위반이다', () => {
    expect(k13(케이스('held,', `const held = '보류 — x';`))).toHaveLength(1);
  });

  it('펼침·계산된 키는 꼬리표가 없어도 위반이다', () => {
    expect(k13(케이스('...base,', `const base = {};`))).toHaveLength(1);
    expect(k13(케이스(`[k]: '보류 — x',`, `const k = 'held';`))).toHaveLength(1);
  });

  it('held 를 어겨도 K11 로 잡지 않는다', () => {
    expect(k11(케이스(`held: '',`))).toEqual([]);
  });
});
