import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-005',
  name: '비회원이 장바구니로 들어가면 로그인 화면이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    heading: z.string().describe('보여야 할 화면 제목').default('로그인'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('장바구니 주소로 바로 들어간다', async () => {
    await page.goto('/cart');
    await page.getByLabel('아이디').waitFor();
    await verify(
      '비회원이 장바구니로 들어가면 로그인 화면이 보인다',
      await page.getByRole('heading', { level: 1 }).innerText(),
      expected.heading,
    );
  });
});
