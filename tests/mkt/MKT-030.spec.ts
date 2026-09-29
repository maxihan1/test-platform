import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-030',
  name: '비회원이 장바구니로 들어가 로그인하면 원래 가려던 장바구니 화면으로 돌아온다',
  precondition: ['테스트 회원 계정이 있다', '비회원이 장바구니로 들어가 로그인 화면으로 보내졌다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    loginHeading: z.string().describe('보내진 로그인 화면 제목').default('로그인'),
    cartPath: z.string().describe('로그인 뒤 돌아올 장바구니 주소').default('/cart'),
    cartHeading: z.string().describe('돌아온 화면 제목').default('장바구니'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 제목 = page.getByRole('heading', { level: 1 });

  await test.step('장바구니 주소로 바로 들어간다', async () => {
    await page.goto('/cart');
    await page.getByLabel('아이디').waitFor();
    await verify('비회원이 장바구니로 들어가 로그인 화면으로 보내졌다', await 제목.innerText(), expected.loginHeading, { blocker: true });
  });

  await test.step('로그인 화면에서 맞는 아이디와 비밀번호로 「로그인」을 누른다', async () => {
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    await verify(
      '로그인하면 원래 가려던 장바구니 화면으로 돌아온다',
      { 주소: new URL(page.url()).pathname, 제목: await 제목.innerText() },
      { 주소: expected.cartPath, 제목: expected.cartHeading },
    );
  });
});
