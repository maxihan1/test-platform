import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-018',
  name: '게시판 목록 표에 일곱 칸이 있고 댓글이 달린 글 제목 옆에 댓글 수가 붙는다',
  precondition: ['게시판 목록이 열려 있다', '댓글이 달린 글이 목록에 있다'],
  params: null,
  expected: z.object({
    headers: z.string().describe('표 칸 제목을 쉼표로 이은 것').default('번호, 분류, 제목, 작성자, 작성일, 조회수, 좋아요'),
    bracketed: z.boolean().describe('댓글 수가 대괄호로 싸여 붙을지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('목록 표의 칸 제목을 본다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify(
      '표에 「번호」·「분류」·「제목」·「작성자」·「작성일」·「조회수」·「좋아요」 칸이 있다',
      (await page.getByRole('columnheader').allInnerTexts()).join(', '),
      expected.headers,
    );
  });

  await test.step('댓글이 달린 글의 제목 칸을 본다', async () => {
    const 칸들 = (await page.getByRole('cell').allInnerTexts()).map((t) => t.trim());
    await verify(
      '제목 옆에 「[3]」처럼 대괄호로 싸인 댓글 수가 붙어 보인다',
      칸들.some((t) => /\[\d+\]$/.test(t)),
      expected.bracketed,
    );
  });
});
