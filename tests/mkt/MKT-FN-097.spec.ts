import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결제수단단계로가기, 날짜뒤, 상품읽기, 장바구니로주문서열기, 전체상품읽기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-097',
  name: '받는 분을 비우면 「다음」 을 눌러도 결제 수단 단계로 넘어가지 않는다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다', '30,000원보다 싼 상품 하나를 바로 구매로 주문서에 담았다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 입력 = 정상배송입력();
  let 상품금액 = 0;

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('주문서 배송 정보 단계를 확인한다', async () => {
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('받는 분만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 받는분: '' });
    await 주문서.다음누르기();
    await verify('받는 분을 비우면 「다음」 을 눌러도 결제 수단 단계로 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('연락처만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 연락처: '' });
    await 주문서.다음누르기();
    await verify('연락처를 비우면 「다음」 을 눌러도 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('상세 주소만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 상세주소: '' });
    await 주문서.다음누르기();
    await verify('상세 주소를 비우면 「다음」 을 눌러도 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('배송 희망일에 어제 날짜를 넣고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 희망일: 날짜뒤(-1) });
    await 주문서.다음누르기();
    await verify('배송 희망일에 지난 날짜를 넣으면 다음으로 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('30,000원보다 싼 상품을 바로 구매로 담아 주문서를 연다', async () => {
    const 후보 = (await 전체상품읽기(request)).filter((p) => !p.soldOut && p.salePrice < 30000).sort((가, 나) => 가.salePrice - 나.salePrice);
    let 고른: { id: number; salePrice: number } | undefined;
    for (const p of 후보) {
      const 상세 = await 상품읽기(request, p.id);
      if (상세.colors.length === 0 && 상세.sizes.length === 0) { 고른 = p; break; }
    }
    if (고른 === undefined) throw new Error('30,000원보다 싼 옵션 없는 상품이 없다');
    상품금액 = 고른.salePrice;
    await 주문서.직접구매로열기({ productId: 고른.id, qty: 1 });
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('결제 수단에서 「신용카드」 를 고르고 할부를 연다', async () => {
    await 결제수단단계로가기(주문서, 입력);
    await verify('결제 금액이 상품 금액에 배송비 3,000원을 더한 값이다', await 주문서.결제금액미리보기.innerText(), `결제 금액 ${(상품금액 + 3000).toLocaleString('ko-KR')}원`, { blocker: true });
    await 주문서.결제수단고르기('신용카드');
    await verify('결제 금액이 50,000원보다 적은 주문은 할부 「3개월」 을 고를 수 없다', await 주문서.할부항목('3개월').isDisabled(), true);
  });

  await test.step('결제 수단 단계에서 쿠폰 드롭다운을 연다', async () => {
    await verify('상품 금액이 30,000원보다 적은 주문에서는 「3,000원 할인」 쿠폰이 흐리게 보이고 고를 수 없다', await 주문서.쿠폰항목('3,000원 할인').isDisabled(), true);
  });
});
