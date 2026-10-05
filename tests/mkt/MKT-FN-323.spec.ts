import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-323',
  name: '배송 희망일이 1일 뒤면 「다음」을 눌러도 「① 배송 정보」 단계에 머문다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 상품 한 줄이 있다',
    '브라우저 시계는 2026-10-05(월)이다',
    '배송 희망일 말고 배송 정보는 맞게 채웠다',
  ],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
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
      await 주문서.배송정보채우기({ 희망일: '' });
      await verify('배송 희망일 말고 배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 연락처, 우편번호, 주소, 상세 주소', { blocker: true });
    });

    await test.step('배송 희망일에 1일 뒤 2026-10-06 을 넣고 「다음」을 누른다', async () => {
      await 주문서.배송희망일칸.fill('2026-10-06');
      await 주문서.다음버튼.click();
      await verify('배송 희망일이 1일 뒤면 「다음」을 눌러도 「① 배송 정보」 단계에 머문다', await 주문서.현재단계이름(), '① 배송 정보');
    });

    await test.step('배송 희망일을 2일 뒤 2026-10-07 로 고치고 「다음」을 누른다', async () => {
      await 주문서.배송희망일칸.fill('2026-10-07');
      await 주문서.다음버튼.click();
      await verify('배송 희망일이 2일 뒤면 「② 결제 수단」으로 넘어간다', await 주문서.현재단계이름(), '② 결제 수단');
    });

    await test.step('「이전」으로 돌아가 배송 희망일을 14일 뒤 2026-10-19 로 고치고 「다음」을 누른다', async () => {
      await 주문서.이전버튼.click();
      await 주문서.배송희망일칸.fill('2026-10-19');
      await 주문서.다음버튼.click();
      await verify('배송 희망일이 14일 뒤면 「② 결제 수단」으로 넘어간다', await 주문서.현재단계이름(), '② 결제 수단');
    });

    await test.step('「이전」으로 돌아가 배송 희망일을 15일 뒤 2026-10-20 으로 고치고 「다음」을 누른다', async () => {
      await 주문서.이전버튼.click();
      await 주문서.배송희망일칸.fill('2026-10-20');
      await 주문서.다음버튼.click();
      await verify('배송 희망일이 15일 뒤면 「② 결제 수단」으로 넘어가지 않는다', (await 주문서.현재단계이름()) === '② 결제 수단', false);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
