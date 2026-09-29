import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-020',
  name: '게시판 목록 첫 페이지에 글이 10건 보이고 「이전」은 눌리지 않는다',
  precondition: ['게시글이 한 페이지를 넘게 있다', '게시판 목록 첫 페이지가 열려 있다'],
  params: null,
  expected: z.object({
    pageSize: z.number().describe('한 페이지에 보일 공지 아닌 글 수').default(10),
    prevDisabled: z.boolean().describe('첫 페이지에서 「이전」이 눌리지 않을지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('게시판 목록 첫 페이지를 연다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    const 일반줄 = await page.getByRole('row').evaluateAll((rows) =>
      (rows as HTMLTableRowElement[])
        .filter((r) => r.querySelector('th') === null)
        .filter((r) => (r.cells[0]?.textContent ?? '').trim() !== '공지').length,
    );
    await verify('공지가 아닌 글이 10건 보인다', 일반줄, expected.pageSize);
  });

  await test.step('쪽 넘김을 본다', async () => {
    await verify(
      '「이전」이 눌리지 않는다',
      await page.getByRole('button', { name: '이전', exact: true }).isDisabled(),
      expected.prevDisabled,
    );
  });
});
