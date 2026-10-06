import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 있어야한다 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/common-cart.page.js';
import { 로그인화면 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '장바구니 주소에서 넘어간 로그인 화면에서 로그인하면 장바구니 화면으로 돌아간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 장바구니 = new 장바구니화면(page);
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시킨다', async () => {
      회원 = await 임시회원가입(page.request);
    });

    await test.step('장바구니 주소를 연다', async () => {
      await 안내창끄기(page);
      await 장바구니.열기();
      await 로그인.열릴때까지기다리기();
      await verify('비회원이다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('장바구니 주소에서 넘어간 로그인 화면에서 새로 만든 회원으로 로그인한다', async () => {
      const 나 = 있어야한다(회원, '새로 만든 회원');
      await 로그인.로그인하기(나.loginId, 나.password);
      await 장바구니.제목.waitFor();
      await verify('장바구니 주소에서 넘어간 로그인 화면에서 로그인하면 장바구니 화면으로 돌아간다', new URL(page.url()).pathname, '/cart');
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
