import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-532',
  name: '빈 배송 정보로 「다음」을 누르면 「받는 분을 입력하세요」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
  unconfirmed:
    '기획서와 다름 — 차이 D14 · D15 · D16 · D17: 배송 정보 오류 문구가 기획서에 없다 (작성 요청 5873)',
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

    await test.step('배송 정보를 비운 채 「다음」을 누른다', async () => {
      await 주문서.다음버튼.click();
      await 주문서.오류문구('받는 분을 입력하세요').waitFor();
      await verify('빈 배송 정보로 「다음」을 누르면 「받는 분을 입력하세요」가 보인다', await 주문서.오류문구('받는 분을 입력하세요').isVisible(), true);
      await verify('「연락처는 숫자 10~11자로 입력하세요」가 보인다', await 주문서.오류문구('연락처는 숫자 10~11자로 입력하세요').isVisible(), true);
      await verify('「주소 검색으로 주소를 입력하세요」가 보인다', await 주문서.오류문구('주소 검색으로 주소를 입력하세요').isVisible(), true);
      await verify('「상세 주소를 입력하세요」가 보인다', await 주문서.오류문구('상세 주소를 입력하세요').isVisible(), true);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
