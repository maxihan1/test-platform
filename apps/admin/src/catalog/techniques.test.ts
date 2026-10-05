// 설계 기법 칸 규칙 K14 와 케이스 파일 글에서 기법을 읽는 함수를 검사한다

import { describe, expect, it } from 'vitest';

import { checkSource } from './rules.js';
import { 케이스기법 } from './techniques.js';

function 케이스(extra: string, head = '', tcId = 'DEMO-FN-001'): string {
  return `import { defineCase, test, verify } from '@platform/kit';
${head}
export const spec = defineCase({
  tcId: '${tcId}',
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

function k14(source: string): string[] {
  return checkSource('x.spec.ts', source)
    .violations.filter((v) => v.rule === 'K14')
    .map((v) => v.what);
}

describe('K14 — techniques 는 목록 안 낱말의 리터럴 배열', () => {
  it('목록 안 낱말 리터럴 배열은 통과한다', () => {
    expect(k14(케이스(`techniques: ['경계값 분석', '결정 테이블'],`))).toEqual([]);
  });

  it('치환 없는 템플릿 원소도 통과한다', () => {
    expect(k14(케이스('techniques: [`상태 전이`],'))).toEqual([]);
  });

  it('키가 없으면 통과한다', () => {
    expect(k14(케이스(''))).toEqual([]);
  });

  it('기능 케이스의 빈 배열은 통과한다 — 기법 없음', () => {
    expect(k14(케이스('techniques: [],'))).toEqual([]);
  });

  it('종류 글자가 없는 옛 tcId 는 기능 케이스로 본다', () => {
    expect(k14(케이스(`techniques: ['동등 분할'],`, '', 'DEMO-001'))).toEqual([]);
  });

  it('배열이 아니면 위반이다', () => {
    expect(k14(케이스(`techniques: '경계값 분석',`))).toHaveLength(1);
  });

  it('변수는 위반이다', () => {
    expect(k14(케이스('techniques: 기법,', `const 기법 = ['경계값 분석'] as const;`))).toHaveLength(1);
  });

  it('축약 { techniques } 는 위반이다', () => {
    expect(k14(케이스('techniques,', `const techniques = ['경계값 분석'] as const;`))).toHaveLength(1);
  });

  it('변수 원소는 위반이다', () => {
    expect(k14(케이스('techniques: [기법],', `const 기법 = '경계값 분석';`))).toHaveLength(1);
  });

  it('템플릿 치환 원소는 위반이다', () => {
    expect(k14(케이스('techniques: [`${a}`],', `const a = '경계값 분석';`))).toHaveLength(1);
  });

  it('펼침 원소는 위반이다', () => {
    expect(k14(케이스('techniques: [...기법],', `const 기법 = ['경계값 분석'] as const;`))).toHaveLength(1);
  });

  it('목록 밖 낱말은 위반이고 그 낱말을 알린다', () => {
    expect(k14(케이스(`techniques: ['오류 추정'],`))).toEqual(['techniques 원소 「오류 추정」은 목록에 없다']);
  });

  it('같은 낱말이 둘이면 위반이다', () => {
    expect(k14(케이스(`techniques: ['경계값 분석', '경계값 분석'],`))).toHaveLength(1);
  });

  it('UI 판정은 실행한 tcId 로 checkSpec 이 한다 — 글자 검사는 꼴만 본다', () => {
    expect(k14(케이스('techniques: [],', '', 'DEMO-UI-001'))).toEqual([]);
    expect(k14(케이스(`techniques: ['오류 추정'],`, '', 'DEMO-UI-001'))).toEqual(['techniques 원소 「오류 추정」은 목록에 없다']);
  });

  it('위반 줄은 원소가 적힌 줄이다', () => {
    const found = checkSource('x.spec.ts', 케이스(`techniques: ['오류 추정'],`)).violations.filter((v) => v.rule === 'K14');
    expect(found[0]?.line).toBe(9);
  });

  it('펼침은 K11 이 막으므로 K14 가 또 내지 않는다', () => {
    const source = 케이스('...base,', `const base = { techniques: ['경계값 분석'] };`);
    expect(k14(source)).toEqual([]);
    expect(checkSource('x.spec.ts', source).violations.map((v) => v.rule)).toContain('K11');
  });
});

describe('케이스기법 — 케이스 파일 글에서 기법을 읽는다', () => {
  it('리터럴 배열이면 목록 차례로 · 중복 없이 낱말을 준다', () => {
    expect(케이스기법(케이스(`techniques: ['결정 테이블', '경계값 분석', '결정 테이블'],`))).toEqual(['경계값 분석', '결정 테이블']);
  });

  it('키가 없으면 빈 목록이다', () => {
    expect(케이스기법(케이스(''))).toEqual([]);
  });

  it('목록 밖 낱말이 있으면 K14 몫이라 null 이다 — 적힌 낱말을 「없음」으로 안내하지 않게', () => {
    expect(케이스기법(케이스(`techniques: ['경계값분석', '상태 전이'],`))).toBeNull();
  });

  it('변수 값은 읽을 수 없어 null 이다', () => {
    expect(케이스기법(케이스('techniques: 기법,', `const 기법 = ['경계값 분석'] as const;`))).toBeNull();
  });

  it('변수 원소가 섞여도 null 이다', () => {
    expect(케이스기법(케이스(`techniques: ['동등 분할', 기법],`, `const 기법 = '경계값 분석';`))).toBeNull();
  });

  it('펼침이 있으면 기법이 숨었을 수 있어 null 이다', () => {
    expect(케이스기법(케이스('...base,', `const base = { techniques: ['경계값 분석'] };`))).toBeNull();
  });

  it('defineCase 가 없으면 null 이다', () => {
    expect(케이스기법('export const spec = 1;\n')).toBeNull();
  });
});
