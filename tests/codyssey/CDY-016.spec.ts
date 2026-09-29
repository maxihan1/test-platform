import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-016',
  name: '연간 교육일정 화면의 표 머리가 「과정 구분」·「세부 업무」와 1월부터 12월까지다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    columns: z.string().describe('표 머리 이름을 " | " 로 이은 것').default('과정 구분 | 세부 업무 | 1월 | 2월 | 3월 | 4월 | 5월 | 6월 | 7월 | 8월 | 9월 | 10월 | 11월 | 12월'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('연간 교육일정 화면을 연다', async () => {
    await page.goto('/apply/schedule');
    await page.getByRole('columnheader', { name: '12월', exact: true }).waitFor();
    const 이름들 = (await page.getByRole('columnheader').allInnerTexts()).map((t) => t.trim());
    await verify('연간 교육일정 화면의 표 머리가 「과정 구분」·「세부 업무」와 1월부터 12월까지다', 이름들.join(' | '), expected.columns);
  });
});
