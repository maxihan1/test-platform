import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-026',
  name: '비회원이 좋아요를 누르면 로그인 안내 모달이 뜨고 「취소」를 누르면 상세에 머문다',
  precondition: ['비회원으로 게시글 상세를 열었다', '로그인 안내 모달이 떠 있다'],
  params: z.object({
    postPath: z.string().min(1).describe('열어 볼 게시글 상세 주소').default('/board/44'),
  }),
  expected: z.object({
    message: z.string().describe('모달 문구').default('로그인이 필요합니다. 로그인 화면으로 이동할까요?'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 모달 = page.getByRole('dialog');

  await test.step('비회원으로 게시글 상세를 열고 「좋아요」를 누른다', async () => {
    await page.goto(params.postPath);
    const 좋아요버튼 = page.getByRole('button', { name: /좋아요/ });
    await 좋아요버튼.waitFor();
    await 좋아요버튼.click();
    await 모달.waitFor();
    await verify(
      '확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 보인다',
      await 모달.getByRole('paragraph').innerText(),
      expected.message,
    );
  });

  await test.step('「취소」를 누른다', async () => {
    await 모달.getByRole('button', { name: '취소' }).click();
    await 모달.waitFor({ state: 'detached' });
    await verify('게시글 상세 주소에 그대로 머문다', new URL(page.url()).pathname, params.postPath);
  });
});
