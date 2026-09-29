import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-007',
  name: '바닥글에 「이용약관」·「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    links: z.string().describe('바닥글 약관 링크 이름을 쉼표로 이은 것').default('이용약관, 개인정보처리방침'),
    copyright: z.string().describe('바닥글 저작권 문구').default('© 2026 DemoMarket'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('바닥글을 본다', async () => {
    await page.goto('/');
    const 바닥글 = page.getByRole('contentinfo');
    await page.getByRole('button', { name: '상담하기' }).waitFor();
    await verify(
      '바닥글에 「이용약관」·「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
      {
        링크: (await 바닥글.getByRole('link').allInnerTexts()).join(', '),
        저작권: await 바닥글.getByText(expected.copyright).innerText(),
      },
      { 링크: expected.links, 저작권: expected.copyright },
    );
  });
});
