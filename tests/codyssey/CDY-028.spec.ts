import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-028',
  name: '개인정보처리방침 화면에 제목 「개인정보처리방침」과 첫 조항 「제1조 (개인정보의 처리 목적, 항목, 보유기간 및 수집방법)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    title: z.string().describe('화면 제목').default('개인정보처리방침'),
    firstArticle: z.string().describe('첫 조항 제목').default('제1조 (개인정보의 처리 목적, 항목, 보유기간 및 수집방법)'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('개인정보처리방침 화면을 연다', async () => {
    await page.goto('/terms/privacy');
    await page.getByText(/^제1조/).first().waitFor();
    await verify(
      '개인정보처리방침 화면에 제목 「개인정보처리방침」과 첫 조항 「제1조 (개인정보의 처리 목적, 항목, 보유기간 및 수집방법)」이 보인다',
      {
        title: await page.getByRole('heading', { level: 1 }).innerText(),
        firstArticle: await page.getByText(expected.firstArticle, { exact: true }).first().isVisible(),
      },
      { title: expected.title, firstArticle: true },
    );
  });
});
