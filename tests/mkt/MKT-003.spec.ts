import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-003',
  name: '회원으로 로그인하면 머리글이 회원용으로 바뀌고 관리자 링크는 보이지 않는다',
  precondition: ['테스트 회원 계정이 있다', '관리자가 아닌 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    homePath: z.string().describe('로그인 뒤 가 있을 주소').default('/'),
    adminLinkCount: z.number().describe('일반 회원 머리글에 있을 관리자 링크 수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('테스트 계정으로 로그인한다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
  });

  await test.step('로그인이 됐는지 확인한다', async () => {
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    await verify('로그인 뒤 주소가 홈(/)이다', new URL(page.url()).pathname, expected.homePath, { blocker: true });
  });

  await test.step('머리글 오른쪽을 본다', async () => {
    const 머리글 = page.getByRole('banner');
    await verify(
      '머리글에 「마이페이지」와 「로그아웃」이 보이고 인사 문구가 「님」으로 끝난다',
      {
        마이페이지: await 머리글.getByRole('link', { name: '마이페이지' }).isVisible(),
        로그아웃: await 머리글.getByRole('button', { name: '로그아웃' }).isVisible(),
        인사끝: (await 머리글.getByText(/님$/).innerText()).endsWith('님'),
      },
      { 마이페이지: true, 로그아웃: true, 인사끝: true },
    );
  });

  await test.step('머리글에서 관리자 링크를 찾는다', async () => {
    await verify(
      '머리글에 「관리자」 링크가 보이지 않는다',
      await page.getByRole('banner').getByRole('link', { name: '관리자' }).count(),
      expected.adminLinkCount,
    );
  });
});
