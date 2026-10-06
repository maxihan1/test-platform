import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회, 장바구니조회 } from './components/data.component.js';
import { 회원정리 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-272',
  name: '수량 10으로 담으면 장바구니 그 줄 수량이 10이다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니가 비어 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      내것.회원 = await 임시회원로그인(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 상세.열기(상품번호.니트가디건);
      await 머리.로그아웃버튼.waitFor();
      await verify('새로 만든 회원으로 로그인해 있다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있다', (await 장바구니조회(page.request)).length, 0, { blocker: true });
    });

    await test.step('재고가 10개 넘는 상품을 수량 10으로 담는다', async () => {
      await verify('재고가 10개 넘는 상품이다', (await 상품조회(page.request, 상품번호.니트가디건)).stock > 10, true, { blocker: true });
      await 상세.옵션고르기();
      await 상세.수량적기(10);
      await 상세.장바구니담기누르고응답기다리기();
      const 줄들 = await 장바구니조회(page.request);
      await verify('수량 10으로 담으면 장바구니 그 줄 수량이 10이다', 줄들.map((줄) => 줄.qty).join(', '), '10');
    });

    await test.step('같은 상품 · 같은 옵션을 1개 더 담는다', async () => {
      await 상세.열기(상품번호.니트가디건);
      await 머리.로그아웃버튼.waitFor();
      await 상세.옵션고르기();
      await 상세.장바구니담기누르고응답기다리기();
      const 줄들 = await 장바구니조회(page.request);
      await verify('10개 든 줄에 1개를 더 담아도 수량은 10을 넘지 않는다', 줄들.every((줄) => 줄.qty <= 10), true);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
