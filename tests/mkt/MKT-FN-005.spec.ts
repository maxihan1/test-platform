import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-005',
  name: '로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('장바구니 주소를 열어 로그인 화면에서 로그인한다', async () => {
    await page.goto('/cart');
    await 로그인.제목.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 보내진곳 = new URL(page.url()).pathname;
    await 로그인.입력하기(params.loginId ?? '', params.password ?? '');
    await 로그인.누르기();
    await 머리.인사.waitFor();
    await verify('로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다', { 보내진곳, 돌아온곳: new URL(page.url()).pathname }, { 보내진곳: '/login', 돌아온곳: '/cart' });
  });
});
