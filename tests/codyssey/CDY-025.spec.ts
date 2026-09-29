import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-025',
  name: '공지사항 검색에서 「올인원」을 찾으면 제목에 「올인원」이 든 공지만 남는다',
  precondition: ['공지사항 목록이 열려 있다'],
  params: z.object({
    keyword: z.string().min(1).describe('찾을 검색어').default('올인원'),
  }),
  expected: z.object({
    hasResult: z.boolean().describe('결과가 한 건 이상일지 여부').default(true),
    allContain: z.boolean().describe('모든 결과 제목에 검색어가 들어 있을지 여부').default(true),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params, expected }) => {
  const 제목들 = page.getByRole('heading', { level: 3 });
  let 전체수 = 0;

  await test.step('공지사항 목록을 연다', async () => {
    await page.goto('/board/noticeGoList');
    await 제목들.first().waitFor();
    전체수 = await 제목들.count();
    await verify('공지사항 목록에 공지가 보인다', 전체수 > 0, true, { blocker: true });
  });

  await test.step('검색어를 넣고 「검색」을 누른다', async () => {
    await page.getByPlaceholder('검색어를 입력하세요.').fill(params.keyword);
    await page.getByRole('button', { name: '검색', exact: true }).click();
    for (let i = 0; i < 40; i++) {
      const 수 = await 제목들.count();
      if (수 > 0 && 수 !== 전체수) break;
      await page.waitForTimeout(100);
    }
    const 결과 = (await 제목들.allInnerTexts()).map((t) => t.trim());
    await verify(
      '공지사항 검색에서 「올인원」을 찾으면 제목에 「올인원」이 든 공지만 남는다',
      { hasResult: 결과.length > 0, allContain: 결과.every((t) => t.includes(params.keyword)) },
      { hasResult: expected.hasResult, allContain: expected.allContain },
    );
  });
});
