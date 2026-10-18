import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '비회원이 글쓰기 화면을 열면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('비회원으로 글쓰기 화면 주소를 연다', async () => {
    await 이동.주소열기('/board/write');
    await verify('비회원이 글쓰기 화면을 열면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });

  await test.step('비회원으로 장바구니 화면 주소를 연다', async () => {
    await 이동.주소열기('/cart');
    await verify('비회원이 장바구니 화면을 열면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });

  await test.step('비회원으로 주문서 화면 주소를 연다', async () => {
    await 이동.주소열기('/checkout');
    await verify('비회원이 주문서 화면을 열면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });

  await test.step('비회원으로 주문 내역 화면 주소를 연다', async () => {
    await 이동.주소열기('/my/orders');
    await verify('비회원이 마이페이지 주문 내역을 열면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });

  await test.step('비회원으로 1:1 문의 화면 주소를 연다', async () => {
    await 이동.주소열기('/support/inquiry');
    await verify('비회원이 1:1 문의 화면을 열면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });
});
