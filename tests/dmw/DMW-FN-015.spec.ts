import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-015',
  name: '비회원이 장바구니 주소를 열면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  await 안내창막기(page);

  await test.step('장바구니 주소를 연다', async () => {
    await page.goto('/cart');
    await 로그인.아이디.waitFor();
    await 로그인.머리.그려질때까지();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('비회원이 장바구니 주소를 열면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });

  await test.step('글쓰기 주소를 연다', async () => {
    await page.goto('/board/write');
    await 로그인.아이디.waitFor();
    await verify('비회원이 글쓰기 주소를 열면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });

  await test.step('주문서 주소를 연다', async () => {
    await page.goto('/checkout');
    await 로그인.아이디.waitFor();
    await verify('비회원이 주문서 주소를 열면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });

  await test.step('마이페이지 주소를 연다', async () => {
    await page.goto('/my/orders');
    await 로그인.아이디.waitFor();
    await verify('비회원이 마이페이지 주소를 열면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });

  await test.step('1:1 문의 주소를 연다', async () => {
    await page.goto('/support/inquiry');
    await 로그인.아이디.waitFor();
    await verify('비회원이 1:1 문의 주소를 열면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });
});
