import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-023',
  name: 'FAQ 검색에서 없는 검색어를 찾으면 「검색 결과가 없습니다.」가 보이고 질문이 사라진다',
  precondition: ['FAQ 목록이 열려 있다'],
  params: z.object({
    keyword: z.string().min(1).describe('결과가 없을 검색어').default('zzzzzz없는말'),
  }),
  expected: z.object({
    message: z.string().describe('결과가 없을 때 문구').default('검색 결과가 없습니다.'),
    titleCount: z.number().describe('결과가 없을 때 질문 제목 수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('FAQ 화면을 연다', async () => {
    await page.goto('/board/faqGoList');
    await page.getByRole('heading', { level: 3 }).first().waitFor();
    await verify('FAQ 목록에 질문이 보인다', (await page.getByRole('heading', { level: 3 }).count()) > 0, true, { blocker: true });
  });

  await test.step('없는 검색어를 넣고 「검색」을 누른다', async () => {
    await page.getByPlaceholder('검색어를 입력하세요.').fill(params.keyword);
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await page.getByText(/검색\s*결과가 없습니다/).waitFor();
    await verify(
      'FAQ 검색에서 없는 검색어를 찾으면 「검색 결과가 없습니다.」가 보이고 질문이 사라진다',
      {
        message: await page.getByText(/검색\s*결과가 없습니다/).innerText(),
        titleCount: await page.getByRole('heading', { level: 3 }).count(),
      },
      { message: expected.message, titleCount: expected.titleCount },
    );
  });
});
