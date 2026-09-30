import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-035',
  name: '공지사항 검색에서 없는 검색어를 찾으면 「검색결과가 없습니다.」가 보인다',
  precondition: ['공지사항 목록이 열려 있다'],
  params: z.object({
    keyword: z.string().min(1).describe('결과가 없을 검색어').default('zzzzzz없는말'),
  }),
  expected: z.object({
    message: z.string().describe('결과가 없을 때 문구').default('검색결과가 없습니다.'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('공지사항 목록을 연다', async () => {
    await page.goto('/board/noticeGoList');
    await page.getByRole('heading', { level: 3 }).first().waitFor();
    await verify('공지사항 목록에 공지가 보인다', (await page.getByRole('heading', { level: 3 }).count()) > 0, true, { blocker: true });
  });

  await test.step('없는 검색어를 넣고 「검색」을 누른다', async () => {
    await page.getByPlaceholder('검색어를 입력하세요.').fill(params.keyword);
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await page.getByText(/검색\s*결과가 없습니다/).waitFor();
    await verify('공지사항 검색에서 없는 검색어를 찾으면 「검색결과가 없습니다.」가 보인다', await page.getByText(/검색\s*결과가 없습니다/).innerText(), expected.message);
  });
});
