import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-024',
  name: '게시글 상세를 다시 열면 조회수가 1 오른 값으로 보인다',
  precondition: ['게시글 상세를 한 번 열어 조회수를 보았다'],
  params: z.object({
    postPath: z.string().min(1).describe('볼 게시글 상세 주소').default('/board/43'),
  }),
  expected: z.object({
    increase: z.number().describe('다시 열었을 때 오를 조회수').default(1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 조회수 = async (): Promise<number> =>
    Number(/(\d+)/.exec(await page.getByText(/^조회수 \d+$/).innerText())?.[1] ?? '-1');
  let 처음 = -1;

  await test.step('게시글 상세를 한 번 열어 조회수를 본다', async () => {
    await page.goto(params.postPath);
    await page.getByRole('button', { name: /좋아요/ }).waitFor();
    처음 = await 조회수();
    await verify('상세에 조회수가 숫자로 보인다', 처음 >= 0, true, { blocker: true });
  });

  await test.step('같은 게시글 상세를 다시 연다', async () => {
    await page.goto(params.postPath);
    await page.getByRole('button', { name: /좋아요/ }).waitFor();
    await verify('게시글 상세를 다시 열면 조회수가 1 오른 값으로 보인다', await 조회수(), 처음 + expected.increase);
  });
});
