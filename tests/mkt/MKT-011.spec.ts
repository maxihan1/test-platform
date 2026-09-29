import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-011',
  name: '홈 기본 탭은 인기글이고 글 5건이 좋아요 많은 순으로 보인다',
  precondition: ['비회원으로 홈에 들어와 있다', '「인기글」 탭이 선택되어 있다'],
  params: null,
  expected: z.object({
    selectedTab: z.string().describe('기본으로 선택될 탭').default('인기글'),
    postCount: z.number().describe('보여야 할 글 수').default(5),
    descending: z.boolean().describe('좋아요 수가 내림차순일지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  const 글줄 = page.getByRole('tabpanel').getByRole('listitem');

  await test.step('글 목록 탭을 본다', async () => {
    await page.goto('/');
    await 글줄.getByRole('link').first().waitFor();
    await verify(
      '선택된 탭이 「인기글」이고 글이 5건 보인다',
      {
        선택된탭: await page.getByRole('tab', { selected: true }).innerText(),
        글수: await 글줄.count(),
      },
      { 선택된탭: expected.selectedTab, 글수: expected.postCount },
    );
  });

  await test.step('글 목록의 좋아요 수를 본다', async () => {
    const 좋아요 = (await 글줄.allInnerTexts()).map((t) => Number(/좋아요 (\d+)/.exec(t)?.[1] ?? '-1'));
    await verify(
      '좋아요 수가 큰 것부터 작은 것 순으로 보인다',
      좋아요.every((n, i) => n >= 0 && (i === 0 || 좋아요[i - 1] >= n)),
      expected.descending,
    );
  });
});
