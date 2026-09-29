import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-029',
  name: '없는 게시글 번호로 상세에 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    missingPostPath: z.string().min(1).describe('없는 게시글 상세 주소').default('/board/999999'),
  }),
  expected: z.object({
    message: z.string().describe('나와야 할 안내 문구').default('삭제되었거나 존재하지 않는 게시글입니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('없는 게시글 번호로 상세에 들어간다', async () => {
    await page.goto(params.missingPostPath);
    await page.getByRole('main').getByRole('link', { name: '목록' }).waitFor();
    await verify(
      '없는 게시글 번호로 상세에 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
      await page.getByRole('main').getByRole('paragraph').innerText(),
      expected.message,
    );
  });
});
