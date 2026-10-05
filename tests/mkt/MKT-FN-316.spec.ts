import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-316',
  name: '배송 요청 사항에서 「직접 입력」을 고르면 입력칸이 새로 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('주문서를 연다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await verify('주문서 「① 배송 정보」 단계가 열려 있다', await 주문서.현재단계이름(), '① 배송 정보', { blocker: true });
    });

    await test.step('배송 요청 사항에서 「직접 입력」을 고른다', async () => {
      const 전 = await 주문서.요청직접입력칸.isVisible();
      await 주문서.배송요청상자.selectOption({ label: '직접 입력' });
      const 후 = await 주문서.요청직접입력칸.isVisible();
      await verify('배송 요청 사항에서 「직접 입력」을 고르면 입력칸이 새로 보인다', `${전 ? '보임' : '안 보임'} → ${후 ? '보임' : '안 보임'}`, '안 보임 → 보임');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
