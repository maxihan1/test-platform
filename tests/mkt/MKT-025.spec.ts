import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-025',
  name: '좋아요를 누르면 수가 1 오르고 다시 누르면 처음 값으로 돌아온다',
  precondition: ['회원으로 로그인해 좋아요를 누르지 않은 글 상세를 열었다', '좋아요를 누른 상태다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    postPath: z.string().min(1).describe('좋아요를 누를 게시글 상세 주소').default('/board/46'),
  }),
  expected: z.object({
    increase: z.number().describe('좋아요를 누르면 오를 수').default(1),
    notPressed: z.boolean().describe('시작할 때 좋아요가 눌리지 않은 상태일지 여부').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 좋아요버튼 = page.getByRole('button', { name: /좋아요/ });
  const 좋아요수 = async (): Promise<number> => Number(/좋아요\s*(\d+)/.exec(await 좋아요버튼.innerText())?.[1] ?? '-1');
  let 처음 = -1;

  await test.step('테스트 계정으로 로그인하고 게시글 상세를 열어 좋아요를 꺼 둔다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    await page.goto(params.postPath);
    await 좋아요버튼.waitFor();
    if ((await 좋아요버튼.getAttribute('aria-pressed')) === 'true') {
      await 좋아요버튼.click();
      await page.getByRole('button', { name: /좋아요/, pressed: false }).waitFor();
    }
  });

  await test.step('좋아요를 누르지 않은 상태인지 확인한다', async () => {
    처음 = await 좋아요수();
    await verify(
      '좋아요 버튼이 아직 눌리지 않은 상태다',
      (await 좋아요버튼.getAttribute('aria-pressed')) === 'true',
      expected.notPressed,
      { blocker: true },
    );
  });

  await test.step('「좋아요」를 누른다', async () => {
    await 좋아요버튼.click();
    await page.getByRole('button', { name: /좋아요/, pressed: true }).waitFor();
    await verify('좋아요 수가 1 오른 값으로 보인다', await 좋아요수(), 처음 + expected.increase);
  });

  await test.step('「좋아요」를 다시 누른다', async () => {
    await 좋아요버튼.click();
    await page.getByRole('button', { name: /좋아요/, pressed: false }).waitFor();
    await verify('좋아요 수가 처음 값으로 돌아온다', await 좋아요수(), 처음);
  });
});
