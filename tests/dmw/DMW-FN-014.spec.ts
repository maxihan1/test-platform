import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면제목 } from './components/page-heading.component.js';
import { 계정값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-014',
  name: '장바구니 주소에서 보내진 로그인 화면에서 로그인하면 장바구니 화면으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('장바구니 주소를 열어 로그인 화면으로 간다', async () => {
    await page.goto('/cart');
    await 로그인.아이디.waitFor();
    await 로그인.머리.그려질때까지();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('장바구니 주소에서 보내진 로그인 화면에서 로그인한다', async () => {
    const 계정 = 계정값(params.loginId, params.loginPassword);
    await 로그인.적기(계정.아이디, 계정.비밀번호);
    await 로그인.로그인누르기();
    await 로그인.머리.로그아웃.waitFor();
    await verify('장바구니 주소에서 보내진 로그인 화면에서 로그인하면 장바구니 화면으로 돌아간다', await 제목.글('장바구니').isVisible(), true);
  });
});
