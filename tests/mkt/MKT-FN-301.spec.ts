import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 추가상품번호, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-301',
  name: '한 줄만 체크하고 「선택 삭제」를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다',
  held: '보류 — 검증 실패: 체크한 줄만 지워지고 다른 줄은 남는다 (「확인」 뒤 화면 스크립트 오류로 삭제 요청이 나가지 않는다 · 차이 D29)',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 두 줄이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 확인창 = new 모달(page);
  const 내것: { 회원?: 임시회원 } = {};
  const 이름: { 첫째: string; 둘째: string } = { 첫째: '', 둘째: '' };

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 두 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.니트가디건, 추가상품번호.캐시미어머플러]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      const 줄들 = await 장바구니조회(page.request);
      이름.첫째 = 줄들[0]?.name ?? '';
      이름.둘째 = 줄들[1]?.name ?? '';
      await verify('장바구니에 상품 두 줄이 있다', 줄들.length, 2, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.nth(1).waitFor();
      await verify('장바구니에 상품 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    await test.step('첫 줄만 체크하고 「선택 삭제」를 누른다', async () => {
      await 장바구니.줄체크박스(이름.둘째).uncheck();
      await 장바구니.선택삭제누르기();
      await 확인창.열림기다리기();
      await verify('한 줄만 체크하고 「선택 삭제」를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다', await 확인창.창.getByText('선택한 상품 1개를 삭제하시겠습니까?', { exact: true }).isVisible(), true);
    });

    await test.step('확인 창의 「확인」을 누른다', async () => {
      await 확인창.버튼('확인').click();
      await 확인창.닫힘기다리기();
      await 장바구니.줄이사라지기를기다리기(이름.첫째);
      await verify('체크한 줄만 지워지고 다른 줄은 남는다', (await 장바구니.줄상품명들()).join(', '), 이름.둘째);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
