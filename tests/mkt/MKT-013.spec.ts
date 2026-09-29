import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-013',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈으로 가서 머리글에 「로그아웃」이 보인다',
  precondition: ['테스트 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    homePath: z.string().describe('로그인 뒤 가 있을 주소').default('/'),
    logoutVisible: z.boolean().describe('머리글에 「로그아웃」이 보일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('로그인 화면에서 맞는 아이디와 비밀번호로 「로그인」을 누른다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    const 머리글 = page.getByRole('banner');
    await 머리글.getByRole('button', { name: '알림' }).waitFor();
    await verify(
      '맞는 아이디와 비밀번호로 로그인하면 홈으로 가서 머리글에 「로그아웃」이 보인다',
      {
        주소: new URL(page.url()).pathname,
        로그아웃: await 머리글.getByRole('button', { name: '로그아웃' }).isVisible(),
      },
      { 주소: expected.homePath, 로그아웃: expected.logoutVisible },
    );
  });
});
