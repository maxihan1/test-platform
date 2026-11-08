// 첫 절차를 로그인 이어받기 대상(carry)으로 가리는 판별을 검사한다 (도메인/시나리오 §3.7 결정 4)

import { describe, expect, it } from 'vitest';

import { caseSteps } from './steps.js';

function body(inner: string): string {
  return `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'DEMO-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
${inner}
});
`;
}

function carry(source: string): boolean[] {
  return caseSteps(source).steps.map((s) => s.carry);
}

const 로그인 = `
  await test.step('일반 회원으로 로그인해 목록을 연다', async () => {
    await page.goto('https://x');
    await verify('목록이 보인다', true, true, { blocker: true });
  });`;

describe('caseSteps carry', () => {
  it('확인이 든 첫 절차도 이어받기 대상이다 — 둘째 절차부터는 아니다', () => {
    const src = body(`${로그인}
  await test.step('장바구니를 연다', async () => {
    await page.goto('https://x/cart');
    await verify('장바구니가 보인다', true, true, { blocker: true });
  });
`);
    expect(caseSteps(src).steps.map((s) => [s.title, s.skippable, s.carry])).toEqual([
      ['일반 회원으로 로그인해 목록을 연다', false, true],
      ['장바구니를 연다', false, false],
    ]);
  });

  it('이미 「만들기」로 건너뛸 수 있는 첫 절차는 carry 를 따로 달지 않는다', () => {
    const src = body(`
  await test.step('할 일을 만든다', async () => {
    await page.getByRole('textbox').fill('우유');
  });
  await test.step('한 건인지 확인한다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
`);
    expect(caseSteps(src).steps.map((s) => [s.skippable, s.carry])).toEqual([
      [true, false],
      [false, false],
    ]);
  });

  it('반복문 안의 첫 절차는 한 제목이 몇 번 도는지 몰라 대상이 아니다', () => {
    const src = body(`
  for (const x of [1, 2]) {
    await test.step('로그인한다', async () => {
      await verify('된다', x, x);
    });
  }
`);
    expect(carry(src)).toEqual([false]);
  });

  it('if 안의 첫 절차는 돌지 않을 수 있어 대상이 아니다', () => {
    const src = body(`
  if (Date.now() > 0) {
${로그인}
  }
`);
    expect(carry(src)).toEqual([false]);
  });

  it('제목을 글자로 못 읽는 절차가 하나라도 있으면 대상이 아니다', () => {
    const src = body(`${로그인}
  const 제목 = '장바구니';
  await test.step(제목, async () => {
    await verify('된다', 1, 1);
  });
`);
    expect(carry(src)).toEqual([false]);
  });
});
