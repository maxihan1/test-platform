import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 장바구니비우기, 장바구니담기, 상품번호 } from './components/data.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-010',
  name: '상품 두 줄을 담고 쇼핑 화면을 열면 장바구니 아이콘 옆 빨간 배지에 「2」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(page.request);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await page.request.get('/api/auth/me')).status(), 200, { blocker: true });
    });

    await test.step('서로 다른 상품 두 개를 장바구니에 담고 쇼핑 화면을 연다', async () => {
      await 장바구니담기(page.request, 상품번호.USB허브);
      await 장바구니담기(page.request, 상품번호.니트가디건);
      await 안내창끄기(page);
      await 쇼핑.장바구니응답과함께열기();
      await 쇼핑.머리글.장바구니배지.waitFor();
      await verify(
        '상품 두 줄을 담고 쇼핑 화면을 열면 장바구니 아이콘 옆 빨간 배지에 「2」가 보인다',
        { 글자: await 쇼핑.머리글.장바구니배지.innerText(), 빨강: await 쇼핑.배지가빨간가() },
        { 글자: '2', 빨강: true },
      );
    });
  } finally {
    if (회원) {
      await 장바구니비우기(page.request);
      await 임시회원지우기(page.request, 회원);
    }
  }
});
