import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-337',
  name: '결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴의 주문번호가 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 12,900원 상품 한 줄이 수량 1로 있다',
    '배송 정보와 결제 수단은 맞게 채웠다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};
  const 재고: { 전?: number } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 12,900원 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 12,900원 12,900원 상품 한 줄이 수량 1로 있다', (await 장바구니조회(page.request)).map((줄) => `${줄.unitPrice} × ${줄.qty}`).join(', '), '12900 × 1', { blocker: true });
    });

    await test.step('주문서 「② 결제 수단」에서 결제 수단을 고른다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await 주문서.배송정보채우기();
      await 주문서.다음버튼.click();
      await 주문서.결제수단('계좌이체').check();
      await verify('배송 정보와 결제 수단은 맞게 채웠다', `${(await 주문서.채워진칸이름들()).join(', ')} · ${(await 주문서.결제수단('계좌이체').isChecked()) ? '계좌이체' : '결제 수단 없음'}`, '받는 분, 연락처, 우편번호, 주소, 상세 주소, 배송 희망일 · 계좌이체', { blocker: true });
    });

    await test.step('주문서 「③ 최종 확인」 단계로 간다', async () => {
      await 주문서.다음버튼.click();
      await 주문서.동의체크박스.waitFor();
      await verify('주문서 「③ 최종 확인」 단계가 열려 있다', await 주문서.현재단계이름(), '③ 최종 확인', { blocker: true });
    });

    await test.step('동의 체크박스를 켜고 「15,900원 결제하기」를 누른다', async () => {
      재고.전 = (await 상품조회(page.request, 상품번호.USB허브)).stock;
      await 주문서.동의체크박스.check();
      await 주문서.결제하기버튼.click();
      await 완료.제목.waitFor();
      await verify('결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴의 주문번호가 보인다', /^DM\d{8}-\d{4}$/.test(await 완료.주문번호.innerText()), true);
      await verify('주문 완료 화면에 결제 금액 「15,900원」이 보인다', await 완료.결제금액.innerText(), '15,900원');
      await verify('주문 완료 화면에 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다', [await 완료.주문내역보기.isVisible(), await 완료.쇼핑계속하기.isVisible()], [true, true]);
    });

    await test.step('주문 뒤 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await verify('주문한 상품이 장바구니에서 빠져 「장바구니가 비어 있습니다」가 보인다', await 장바구니.빈문구.isVisible(), true);
    });

    await test.step('주문 뒤 그 상품의 재고를 확인한다', async () => {
      const 후 = (await 상품조회(page.request, 상품번호.USB허브)).stock;
      await verify('그 상품의 재고가 주문 수량 1만큼 줄어 있다', (재고.전 ?? 0) - 후, 1);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
