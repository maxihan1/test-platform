import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '비회원이 글쓰기 주소를 열면 로그인 화면이 열리고 주소에 「next=/board/write」가 붙는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원으로 글쓰기 주소를 연다', async () => {
    await 안내창끄기(page);
    await page.goto('/board/write');
    await 로그인.열릴때까지기다리기();
    await verify('비회원이다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '비회원이 글쓰기 주소를 열면 로그인 화면이 열리고 주소에 「next=/board/write」가 붙는다',
      [await 로그인.제목.innerText(), await 로그인.주소의다음값()],
      ['로그인', '/board/write'],
    );
  });

  await test.step('비회원으로 장바구니 주소를 연다', async () => {
    await page.goto('/cart');
    await 로그인.열릴때까지기다리기();
    await verify('로그인 화면이 열리고 주소에 「next=/cart」가 붙는다', [await 로그인.제목.innerText(), await 로그인.주소의다음값()], ['로그인', '/cart']);
  });

  await test.step('비회원으로 주문서 주소를 연다', async () => {
    await page.goto('/checkout');
    await 로그인.열릴때까지기다리기();
    await verify('로그인 화면이 열리고 주소에 「next=/checkout」이 붙는다', [await 로그인.제목.innerText(), await 로그인.주소의다음값()], ['로그인', '/checkout']);
  });

  await test.step('비회원으로 마이페이지 주소를 연다', async () => {
    await page.goto('/my/orders');
    await 로그인.열릴때까지기다리기();
    await verify('로그인 화면이 열리고 주소에 「next=/my/orders」가 붙는다', [await 로그인.제목.innerText(), await 로그인.주소의다음값()], ['로그인', '/my/orders']);
  });

  await test.step('비회원으로 1:1 문의 주소를 연다', async () => {
    await page.goto('/support/inquiry');
    await 로그인.열릴때까지기다리기();
    await verify(
      '로그인 화면이 열리고 주소에 「next=/support/inquiry」가 붙는다',
      [await 로그인.제목.innerText(), await 로그인.주소의다음값()],
      ['로그인', '/support/inquiry'],
    );
  });
});
