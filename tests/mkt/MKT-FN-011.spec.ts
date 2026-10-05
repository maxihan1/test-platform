import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 장바구니비우기, 장바구니담기, 상품번호 } from './components/data.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-011',
  name: '장바구니가 빈 회원이 쇼핑 화면을 열면 장바구니 배지가 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
  techniques: ['경계값 분석'],
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

    await test.step('장바구니가 빈 채 쇼핑 화면을 연다', async () => {
      await 안내창끄기(page);
      await 쇼핑.장바구니응답과함께열기();
      await verify('장바구니가 빈 회원이 쇼핑 화면을 열면 장바구니 배지가 보이지 않는다', await 쇼핑.머리글.장바구니배지.isVisible(), false);
    });

    await test.step('상품 하나를 장바구니에 담고 쇼핑 화면을 새로 고친다', async () => {
      await 장바구니담기(page.request, 상품번호.USB허브);
      await 쇼핑.장바구니응답과함께새로고침();
      await 쇼핑.머리글.장바구니배지.waitFor();
      await verify('상품 한 줄을 담으면 장바구니 배지에 「1」이 보인다', await 쇼핑.머리글.장바구니배지.innerText(), '1');
    });
  } finally {
    if (회원) {
      await 장바구니비우기(page.request);
      await 임시회원지우기(page.request, 회원);
    }
  }
});
