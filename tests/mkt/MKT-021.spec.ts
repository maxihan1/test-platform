import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-021',
  name: '검색어를 1자만 넣고 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    shortQuery: z.string().min(1).describe('1자 검색어').default('가'),
  }),
  expected: z.object({
    toast: z.string().describe('나와야 할 토스트 문구').default('검색어를 2자 이상 입력하세요'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('검색어에 1자만 넣고 「검색」을 누른다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await page.getByLabel('검색어').fill(params.shortQuery);
    await page.getByRole('button', { name: '검색' }).click();
    const 토스트 = page.getByRole('status');
    await 토스트.waitFor();
    await verify('검색어를 1자만 넣고 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 토스트.innerText(), expected.toast);
  });
});
