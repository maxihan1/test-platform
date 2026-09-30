import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-026',
  name: '코디세이 사람들 화면에 제목 「코디세이 사람들」과 검색란·「검색」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    title: z.string().describe('화면 제목').default('코디세이 사람들'),
    searchVisible: z.boolean().describe('검색란이 보일지 여부').default(true),
    searchButtonVisible: z.boolean().describe('「검색」 버튼이 보일지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('코디세이 사람들 화면을 연다', async () => {
    await page.goto('/board/promotion/list');
    await page.getByRole('button', { name: '검색', exact: true }).waitFor();
    await verify(
      '코디세이 사람들 화면에 제목 「코디세이 사람들」과 검색란·「검색」 버튼이 보인다',
      {
        title: await page.getByRole('heading', { level: 1 }).innerText(),
        searchVisible: await page.getByPlaceholder('검색어를 입력하세요.').isVisible(),
        searchButtonVisible: await page.getByRole('button', { name: '검색', exact: true }).isVisible(),
      },
      { title: expected.title, searchVisible: expected.searchVisible, searchButtonVisible: expected.searchButtonVisible },
    );
  });
});
