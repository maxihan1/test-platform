import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-027',
  name: '이용약관 화면에 제목 「이용약관」과 첫 조항 「제1조 (목적)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    title: z.string().describe('화면 제목').default('이용약관'),
    firstArticle: z.string().describe('첫 조항 제목').default('제1조 (목적)'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('이용약관 화면을 연다', async () => {
    await page.goto('/terms/service');
    await page.getByText(/^제1조/).first().waitFor();
    await verify(
      '이용약관 화면에 제목 「이용약관」과 첫 조항 「제1조 (목적)」이 보인다',
      {
        title: await page.getByRole('heading', { level: 1 }).innerText(),
        firstArticle: await page.getByText(expected.firstArticle, { exact: true }).first().isVisible(),
      },
      { title: expected.title, firstArticle: true },
    );
  });
});
