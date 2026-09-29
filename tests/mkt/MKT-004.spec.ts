import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-004',
  name: '비회원 머리글에는 장바구니 배지가 보이지 않는다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    badgeVisible: z.boolean().describe('비회원 머리글에서 장바구니 배지가 보일지 여부').default(false),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('머리글 장바구니 자리를 본다', async () => {
    await page.goto('/');
    const 장바구니 = page.getByRole('banner').getByRole('link', { name: '장바구니' });
    await 장바구니.waitFor();
    await verify(
      '비회원 머리글에는 장바구니 배지가 보이지 않는다',
      await 장바구니.getByText(/^\d+$/).isVisible(),
      expected.badgeVisible,
    );
  });
});
