import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-023',
  name: '정렬을 「좋아요순」으로 바꾸면 공지가 아닌 글의 좋아요 수가 큰 것부터 보인다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    sort: z.string().min(1).describe('정렬 드롭다운 값').default('likes'),
  }),
  expected: z.object({
    descending: z.boolean().describe('좋아요 수가 내림차순일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('정렬을 「좋아요순」으로 바꾼다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await page.getByLabel('정렬').selectOption(params.sort);
    await page.locator('#board .skel-row').first().waitFor();
    await page.locator('#board .skel-row').first().waitFor({ state: 'detached' });
    const 좋아요 = await page.getByRole('row').evaluateAll((rows) =>
      (rows as HTMLTableRowElement[])
        .filter((r) => r.querySelector('th') === null)
        .filter((r) => (r.cells[0]?.textContent ?? '').trim() !== '공지')
        .map((r) => Number((r.cells[6]?.textContent ?? '').trim())),
    );
    await verify(
      '정렬을 「좋아요순」으로 바꾸면 공지가 아닌 글의 좋아요 수가 큰 것부터 보인다',
      좋아요.length > 0 && 좋아요.every((n, i) => Number.isFinite(n) && (i === 0 || 좋아요[i - 1] >= n)),
      expected.descending,
    );
  });
});
