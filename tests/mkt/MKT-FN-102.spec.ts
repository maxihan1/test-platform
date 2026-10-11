import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 가격맞춘장바구니걸기, 결제수단단계로가기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-102',
  name: '결제 금액이 49,999원이면 할부 「3개월」 을 고를 수 없다',
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
  const 주문서 = new 주문서화면(page);
  const 머리 = new 머리글(page);
  const 입력 = 정상배송입력();
  const 가격 = { 값: 46999 };
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

    await test.step('결제 금액이 49,999원인 주문서에서 「신용카드」 를 고른다', async () => {
      가격.값 = 46999;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await verify('결제 금액이 49,999원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 49,999원', { blocker: true });
      await 주문서.결제수단고르기('신용카드');
      await verify('결제 금액이 49,999원이면 할부 「3개월」 을 고를 수 없다', await 주문서.할부항목('3개월').isDisabled(), true);
    });

    await test.step('결제 금액이 50,000원인 주문서에서 「신용카드」 를 고른다', async () => {
      가격.값 = 47000;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await verify('결제 금액이 50,000원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 50,000원', { blocker: true });
      await 주문서.결제수단고르기('신용카드');
      await verify('결제 금액이 50,000원이면 할부 「3개월」 을 고를 수 있다', await 주문서.할부항목('3개월').isEnabled(), true);
    });

    await test.step('상품 금액이 29,999원인 주문서에서 쿠폰 드롭다운을 연다', async () => {
      가격.값 = 29999;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await verify('상품 금액이 29,999원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 32,999원', { blocker: true });
      await verify('상품 금액이 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다', await 주문서.쿠폰항목('3,000원 할인').isDisabled(), true);
    });

    await test.step('상품 금액이 30,000원인 주문서에서 쿠폰 드롭다운을 연다', async () => {
      가격.값 = 30000;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await verify('상품 금액이 30,000원이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 33,000원', { blocker: true });
      await verify('상품 금액이 30,000원이면 「3,000원 할인」 쿠폰을 고를 수 있다', await 주문서.쿠폰항목('3,000원 할인').isEnabled(), true);
    });

    await test.step('상품 금액이 50,000원인 주문서에서 10% 쿠폰을 고른다', async () => {
      가격.값 = 50000;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await 주문서.쿠폰고르기('10% 할인');
      await 주문서.결제수단고르기('계좌이체');
      await 주문서.다음누르기();
      await 주문서.최종확인단계.waitFor();
      const 금액 = await 주문서.금액요약읽기();
      await verify('상품 금액이 50,000원이다', 금액['상품 금액'], 50000, { blocker: true });
      await verify('상품 금액 50,000원에 10% 쿠폰을 쓰면 할인이 5,000원이다', -금액['쿠폰 할인'], 5000);
    });

    await test.step('상품 금액이 50,010원인 주문서에서 10% 쿠폰을 고른다', async () => {
      가격.값 = 50010;
      await 주문서.장바구니줄로열기([1]);
      await 결제수단단계로가기(주문서, 입력);
      await 주문서.쿠폰고르기('10% 할인');
      await 주문서.결제수단고르기('계좌이체');
      await 주문서.다음누르기();
      await 주문서.최종확인단계.waitFor();
      const 금액 = await 주문서.금액요약읽기();
      await verify('상품 금액이 50,010원이다', 금액['상품 금액'], 50010, { blocker: true });
      await verify('상품 금액 50,010원에 10% 쿠폰을 써도 할인은 5,000원에서 멈춘다', -금액['쿠폰 할인'], 5000);
    });
  } finally {
    await 해제?.();
  }
});
