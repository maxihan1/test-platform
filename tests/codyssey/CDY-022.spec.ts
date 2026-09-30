import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-022',
  name: 'FAQ 목록에서 쪽 번호 「2」를 누르면 다음 열 건이 나온다',
  precondition: ['FAQ 목록이 첫 쪽으로 열려 있다'],
  params: null,
  expected: z.object({
    firstPageCount: z.number().describe('첫 쪽 질문 수').default(10),
    secondPageCount: z.number().describe('둘째 쪽 질문 수').default(10),
    titleChanged: z.boolean().describe('첫 질문 제목이 바뀔지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  const 제목들 = page.getByRole('heading', { level: 3 });
  let 첫쪽제목 = '';

  await test.step('FAQ 화면을 연다', async () => {
    await page.goto('/board/faqGoList');
    await 제목들.first().waitFor();
    첫쪽제목 = await 제목들.first().innerText();
    await verify('FAQ 목록이 첫 쪽으로 열려 있고 질문이 열 건 보인다', await 제목들.count(), expected.firstPageCount, { blocker: true });
  });

  await test.step('쪽 번호 「2」를 누른다', async () => {
    await page.getByRole('button', { name: '2', exact: true }).click();
    for (let i = 0; i < 30 && (await 제목들.first().innerText()) === 첫쪽제목; i++) await page.waitForTimeout(100);
    await verify(
      'FAQ 목록에서 쪽 번호 「2」를 누르면 다음 열 건이 나온다',
      {
        secondPageCount: await 제목들.count(),
        titleChanged: (await 제목들.first().innerText()) !== 첫쪽제목,
      },
      { secondPageCount: expected.secondPageCount, titleChanged: expected.titleChanged },
    );
  });
});
