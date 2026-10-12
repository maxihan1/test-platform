import { defineCase, test, verify } from '@platform/kit';

import { 안내화면 } from './components/notice-screen.component.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-002',
  name: '비회원이 글쓰기 화면을 열면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 안내 = new 안내화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('글쓰기 화면 /board/write 를 연다', async () => {
    await 방해막기(page);
    await page.goto('/board/write');
    await 안내.제목글('로그인').waitFor();
    await verify('비회원이 글쓰기 화면을 열면 로그인 화면으로 간다', 경로(page), 로그인화면.주소);
  });

  await test.step('장바구니 화면 /cart 를 연다', async () => {
    await page.goto('/cart');
    await 안내.제목글('로그인').waitFor();
    await verify('비회원이 장바구니 화면을 열면 로그인 화면으로 간다', 경로(page), 로그인화면.주소);
  });

  await test.step('주문서 화면 /checkout 을 연다', async () => {
    await page.goto('/checkout');
    await 안내.제목글('로그인').waitFor();
    await verify('비회원이 주문서 화면을 열면 로그인 화면으로 간다', 경로(page), 로그인화면.주소);
  });

  await test.step('마이페이지 주문 내역 /my/orders 를 연다', async () => {
    await page.goto('/my/orders');
    await 안내.제목글('로그인').waitFor();
    await verify('비회원이 마이페이지를 열면 로그인 화면으로 간다', 경로(page), 로그인화면.주소);
  });

  await test.step('1:1 문의 화면 /support/inquiry 를 연다', async () => {
    await page.goto('/support/inquiry');
    await 안내.제목글('로그인').waitFor();
    await verify('비회원이 1:1 문의 화면을 열면 로그인 화면으로 간다', 경로(page), 로그인화면.주소);
  });
});
