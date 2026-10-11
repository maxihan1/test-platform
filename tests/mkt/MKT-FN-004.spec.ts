import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-004',
  name: '비회원이 로그인이 필요한 화면 주소를 열면 로그인 화면으로 간다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 화면들 = [
    { 화면: '글쓰기', 주소: '/board/write' },
    { 화면: '장바구니', 주소: '/cart' },
    { 화면: '주문서', 주소: '/checkout' },
    { 화면: '마이페이지', 주소: '/my/orders' },
    { 화면: '1:1 문의', 주소: '/support/inquiry' },
  ];

  await 방해막기(page);

  await test.step('비회원으로 로그인 화면을 연다', async () => {
    await 로그인.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('비회원으로 글쓰기 · 장바구니 · 주문서 · 마이페이지 · 1:1 문의 주소를 차례로 연다', async () => {
    const 도착: Record<string, string> = {};
    for (const { 화면, 주소 } of 화면들) {
      await page.goto(주소);
      await 로그인.제목.waitFor();
      도착[화면] = new URL(page.url()).pathname;
    }
    await verify(
      '비회원이 로그인이 필요한 화면 주소를 열면 로그인 화면으로 간다',
      도착,
      { 글쓰기: '/login', 장바구니: '/login', 주문서: '/login', 마이페이지: '/login', '1:1 문의': '/login' },
    );
  });
});
