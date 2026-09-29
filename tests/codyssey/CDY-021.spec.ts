import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-021',
  name: 'FAQ 질문을 누르면 같은 화면에서 답이 펼쳐진다',
  precondition: ['FAQ 목록에 질문이 보인다'],
  params: null,
  expected: z.object({
    answerShown: z.boolean().describe('질문을 누른 뒤 항목의 글이 늘어날지 여부').default(true),
    path: z.string().describe('질문을 누른 뒤 주소 경로').default('/board/faqGoList'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 항목 = page.getByRole('listitem').filter({ hasText: /^No\./ });
  let 전 = 0;

  await test.step('FAQ 화면을 연다', async () => {
    await page.goto('/board/faqGoList');
    await 항목.first().waitFor();
    전 = (await 항목.first().innerText()).length;
    await verify('FAQ 목록에 질문이 보인다', (await 항목.count()) > 0, true, { blocker: true });
  });

  await test.step('첫 질문을 누른다', async () => {
    await 항목.first().click();
    for (let i = 0; i < 30 && (await 항목.first().innerText()).length === 전; i++) await page.waitForTimeout(100);
    await verify(
      'FAQ 질문을 누르면 같은 화면에서 답이 펼쳐진다',
      {
        answerShown: (await 항목.first().innerText()).length > 전,
        path: new URL(page.url()).pathname,
      },
      { answerShown: expected.answerShown, path: expected.path },
    );
  });
});
