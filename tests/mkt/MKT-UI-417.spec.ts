import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 결제수단단계로가기, 정상배송입력 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-417',
  name: '배송 요청 사항 드롭다운 첫 항목은 「선택 안 함」 이다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('장바구니 화면을 연다', async () => {
    await 장바구니.열기();
    await verify('장바구니에 상품이 담겨 있다', (await 장바구니.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('장바구니에서 「주문하기」 를 눌러 주문서를 연다', async () => {
    await 장바구니.주문하기누르기();
    await 주문서.받는분.waitFor();
    await verify('배송 요청 사항 드롭다운 첫 항목은 「선택 안 함」 이다', (await 주문서.요청사항.locator('option').allInnerTexts())[0], '선택 안 함');
  });

  await test.step('배송 정보를 채우고 결제 수단 단계에서 「신용카드」 를 고른다', async () => {
    await 결제수단단계로가기(주문서, 정상배송입력());
    await 주문서.결제수단고르기('신용카드');
    await verify('할부 드롭다운 아래에 「할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다」 안내가 보인다', await 주문서.할부안내.isVisible(), true);
  });
});
