import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회 } from './components/data.component.js';
import { 원, 회원정리 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-274',
  name: '「바로 구매」를 누르면 그 상품 하나만 담긴 주문서로 간다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 주문서 = new 주문서화면(page);
  const 머리 = new 머리글(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 상품 상세를 연다', async () => {
      내것.회원 = await 임시회원로그인(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 상세.열기(상품번호.니트가디건);
      await 머리.로그아웃버튼.waitFor();
      await verify('새로 만든 회원으로 로그인해 있다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('상품 상세에서 옵션을 고르고 「바로 구매」를 누른다', async () => {
      const 상품 = await 상품조회(page.request, 상품번호.니트가디건);
      await 상세.옵션고르기();
      await 상세.바로구매버튼.click();
      await 주문서.열릴때까지기다리기();
      await 주문서.결제수단단계로가기();
      await 주문서.최종확인단계로가기('계좌이체');
      const 기대 = `${상품.name} (${상품.colors[0]} / ${상품.sizes[0]}) × 1 — ${원(상품.salePrice)}`;
      await verify('「바로 구매」를 누르면 그 상품 하나만 담긴 주문서로 간다', (await 주문서.최종확인상품줄들()).join(', '), 기대);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
