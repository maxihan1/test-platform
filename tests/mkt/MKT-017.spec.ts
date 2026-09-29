import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-017',
  name: '분류 탭 「질문」을 누르면 공지가 아닌 글의 분류 칸이 모두 「질문」이다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    category: z.string().min(1).describe('고를 분류 탭').default('질문'),
  }),
  expected: z.object({
    allMatch: z.boolean().describe('공지가 아닌 글의 분류가 모두 고른 분류일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('분류 탭 「질문」을 누른다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await page.getByRole('tab', { name: params.category, exact: true }).click();
    await page.locator('#board .skel-row').first().waitFor();
    await page.locator('#board .skel-row').first().waitFor({ state: 'detached' });
    const 분류들 = await page.getByRole('row').evaluateAll((rows) =>
      (rows as HTMLTableRowElement[])
        .filter((r) => r.querySelector('th') === null)
        .filter((r) => (r.cells[0]?.textContent ?? '').trim() !== '공지')
        .map((r) => (r.cells[1]?.textContent ?? '').trim()),
    );
    await verify(
      '분류 탭 「질문」을 누르면 공지가 아닌 글의 분류 칸이 모두 「질문」이다',
      분류들.length > 0 && 분류들.every((v) => v === params.category),
      expected.allMatch,
    );
  });
});
