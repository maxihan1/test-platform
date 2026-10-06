import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-533',
  name: '범위 밖 날짜에는 「배송 희망일은 2일 뒤부터 14일 뒤까지 고를 수 있습니다」가 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 상품 한 줄이 있다',
    '브라우저 시계는 2026-10-05(월)이다',
  ],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
  unconfirmed:
    '기획서와 다름 — 차이 D18: 배송 희망일 범위 밖 문구가 기획서에 없다 (작성 요청 5873)',
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

    await test.step('브라우저 시계를 2026-10-05(월)로 맞추고 주문서를 연다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await page.clock.setFixedTime(new Date('2026-10-05T10:00:00'));
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await verify('브라우저 시계는 2026-10-05(월)이다', await 주문서.브라우저날짜(), '2026-10-05(월)', { blocker: true });
    });

    await test.step('배송 희망일에 1일 뒤 2026-10-06 을 넣고 「다음」을 누른다', async () => {
      await 주문서.배송희망일칸.fill('2026-10-06');
      await 주문서.다음버튼.click();
      await verify('범위 밖 날짜에는 「배송 희망일은 2일 뒤부터 14일 뒤까지 고를 수 있습니다」가 보인다', await 주문서.오류문구('배송 희망일은 2일 뒤부터 14일 뒤까지 고를 수 있습니다').isVisible(), true);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
