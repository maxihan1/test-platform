import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-016',
  name: '로그아웃 확인 창에서 「확인」을 누르면 홈으로 가서 머리글에 「로그인」 링크가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    confirmMessage: z.string().describe('확인 창 문구').default('로그아웃 하시겠습니까?'),
    homePath: z.string().describe('로그아웃 뒤 가 있을 주소').default('/'),
    loginLinkVisible: z.boolean().describe('머리글에 「로그인」 링크가 보일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 머리글 = page.getByRole('banner');

  await test.step('테스트 계정으로 로그인하고 게시판 목록으로 간다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await 머리글.getByRole('button', { name: '알림' }).waitFor();
    await page.goto('/board');
  });

  await test.step('머리글이 회원용인지 확인한다', async () => {
    await 머리글.getByRole('button', { name: '알림' }).waitFor();
    await verify(
      '머리글에 「로그아웃」 버튼이 있어 로그인이 됐다',
      await 머리글.getByRole('button', { name: '로그아웃' }).isVisible(),
      true,
      { blocker: true },
    );
  });

  await test.step('머리글 「로그아웃」을 누르고 확인 창에서 「확인」을 누른다', async () => {
    await 머리글.getByRole('button', { name: '로그아웃' }).click();
    const 확인창 = page.getByRole('dialog');
    await 확인창.waitFor();
    await verify('확인 창에 「로그아웃 하시겠습니까?」가 보인다', await 확인창.getByRole('paragraph').innerText(), expected.confirmMessage);
    await 확인창.getByRole('button', { name: '확인' }).click();
    await 머리글.getByRole('link', { name: '회원가입' }).waitFor();
    await verify(
      '홈으로 가서 머리글에 「로그인」 링크가 보인다',
      {
        주소: new URL(page.url()).pathname,
        로그인링크: await 머리글.getByRole('link', { name: '로그인' }).isVisible(),
      },
      { 주소: expected.homePath, 로그인링크: expected.loginLinkVisible },
    );
  });
});
