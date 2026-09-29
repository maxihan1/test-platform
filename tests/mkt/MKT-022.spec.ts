import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-022',
  name: '아무 글에도 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    field: z.string().min(1).describe('검색 조건 값').default('title'),
    query: z.string().min(2).describe('아무 글에도 없는 검색어').default('zzz없는검색어'),
  }),
  expected: z.object({
    emptyMessage: z.string().describe('나와야 할 안내 문구').default('검색 결과가 없습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('검색 조건 「제목」으로 아무 글에도 없는 검색어를 검색한다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await page.getByLabel('검색 조건').selectOption(params.field);
    await page.getByLabel('검색어').fill(params.query);
    await page.getByRole('button', { name: '검색' }).click();
    await page.getByRole('table').waitFor({ state: 'detached' });
    await verify(
      '아무 글에도 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다',
      await page.getByRole('main').getByText(expected.emptyMessage).innerText(),
      expected.emptyMessage,
    );
  });
});
