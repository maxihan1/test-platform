import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-001',
  name: '머리글에 로고 「데모마켓」과 메뉴 「커뮤니티」·「쇼핑」·「고객센터」가 보인다',
  precondition: ['비회원으로 볼 수 있는 홈이 있다'],
  params: null,
  expected: z.object({
    logo: z.string().describe('머리글 로고 글자').default('데모마켓'),
    menus: z.string().describe('가운데 메뉴 이름을 쉼표로 이은 것').default('커뮤니티, 쇼핑, 고객센터'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('홈을 연다', async () => {
    await page.goto('/');
    const 주메뉴 = page.getByRole('navigation', { name: '주 메뉴' });
    await 주메뉴.getByRole('link').first().waitFor();
    await verify(
      '머리글에 로고 「데모마켓」과 메뉴 「커뮤니티」·「쇼핑」·「고객센터」가 보인다',
      {
        로고: await page.getByRole('banner').getByRole('link').first().innerText(),
        메뉴: (await 주메뉴.getByRole('link').allInnerTexts()).join(', '),
      },
      { 로고: expected.logo, 메뉴: expected.menus },
    );
  });
});
