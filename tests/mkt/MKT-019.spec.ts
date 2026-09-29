import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-019',
  name: '공지글이 분류와 상관없이 목록 맨 위에 「공지」 표시와 함께 고정된다',
  precondition: ['공지글이 있다'],
  params: z.object({
    category: z.string().min(1).describe('고를 분류 탭').default('질문'),
  }),
  expected: z.object({
    pinnedOnTop: z.boolean().describe('공지가 맨 위에 이어서 놓일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('분류 탭 「질문」을 누른다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await page.getByRole('tab', { name: params.category, exact: true }).click();
    await page.locator('#board .skel-row').first().waitFor();
    await page.locator('#board .skel-row').first().waitFor({ state: 'detached' });
    const 공지여부 = await page.getByRole('row').evaluateAll((rows) =>
      (rows as HTMLTableRowElement[])
        .filter((r) => r.querySelector('th') === null)
        .map((r) => (r.cells[0]?.textContent ?? '').trim() === '공지'),
    );
    const 공지수 = 공지여부.filter(Boolean).length;
    await verify(
      '공지글이 분류와 상관없이 목록 맨 위에 「공지」 표시와 함께 고정된다',
      공지수 > 0 && 공지여부.slice(0, 공지수).every(Boolean),
      expected.pinnedOnTop,
    );
  });
});
