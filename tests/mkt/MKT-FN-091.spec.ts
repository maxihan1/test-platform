import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 가격맞춘장바구니걸기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-091',
  name: '체크한 금액이 49,999원이면 배송비가 3,000원이다',
  platforms: ['desktop'],
  precondition: ['장바구니 응답은 가격을 맞춘 가짜 응답(모킹)이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 가격 = { 값: 49999 };
  let 해제: (() => Promise<void>) | undefined;

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('장바구니 응답을 가격을 맞춘 가짜 응답으로 바꾼다', async () => {
      해제 = await 가격맞춘장바구니걸기(page.context(), 가격);
    });

    await test.step('체크한 금액이 49,999원인 장바구니를 연다', async () => {
      가격.값 = 49999;
      await 장바구니.열기();
      await verify('체크한 금액이 49,999원이다', await 장바구니.상품금액.innerText(), '49,999원', { blocker: true });
      await verify('체크한 금액이 49,999원이면 배송비가 3,000원이다', await 장바구니.배송비.innerText(), '3,000원');
      await verify(
        '체크한 금액이 49,999원이면 「1원 더 담으면 무료 배송」 이 보인다',
        (await 장바구니.무료배송안내.isVisible()) ? await 장바구니.무료배송안내.innerText() : '안 보임',
        '1원 더 담으면 무료 배송',
      );
    });

    await test.step('체크한 금액이 50,000원인 장바구니를 연다', async () => {
      가격.값 = 50000;
      await 장바구니.열기();
      await verify('체크한 금액이 50,000원이다', await 장바구니.상품금액.innerText(), '50,000원', { blocker: true });
      await verify('체크한 금액이 50,000원이면 배송비가 0원이다', await 장바구니.배송비.innerText(), '0원');
      await verify('체크한 금액이 50,000원이면 무료 배송 안내가 보이지 않는다', await 장바구니.무료배송안내.isVisible(), false);
    });
  } finally {
    await 해제?.();
  }
});
