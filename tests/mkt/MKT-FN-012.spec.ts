import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내화면 } from './components/notice-screen.component.js';
import { 계정값 } from './helpers/account.helper.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-012',
  name: '장바구니 주소에서 로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(page);
  const 안내 = new 안내화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('장바구니 주소를 열어 로그인 화면으로 간 뒤 로그인한다', async () => {
    await 방해막기(page);
    await page.goto('/cart');
    await 로그인.제목.waitFor();
    await 로그인.로그인하기(계정.loginId, 계정.password);
    await 안내.제목글('장바구니').waitFor();
    await verify('장바구니 주소에서 로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다', 경로(page), '/cart');
  });
});
