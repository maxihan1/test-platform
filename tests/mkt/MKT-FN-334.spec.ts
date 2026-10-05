import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-334',
  name: '동의 체크박스를 켜면 「15,900원 결제하기」 버튼이 눌린다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 12,900원 상품 한 줄이 있다',
    '배송 정보와 결제 수단은 맞게 채웠다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 12,900원 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 12,900원 12,900원 상품 한 줄이 있다', (await 장바구니조회(page.request)).map((줄) => `${줄.unitPrice * 줄.qty}`).join(', '), '12900', { blocker: true });
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

    await test.step('「③ 최종 확인」에서 동의 체크박스를 켠다', async () => {
      await 주문서.동의체크박스.check();
      await verify('동의 체크박스를 켜면 「15,900원 결제하기」 버튼이 눌린다', await 주문서.결제버튼상태(), '15,900원 결제하기 · 눌림');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
