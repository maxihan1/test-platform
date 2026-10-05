import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 내주문번호들, 상품번호, 상품조회, 장바구니조회, 장바구니주문 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-342',
  name: '결제하는 사이 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원 둘이 있다', '첫째 회원 장바구니에 재고 1개인 상품이 담겨 있다', '첫째 회원은 최종 확인 단계까지 왔다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '결정 테이블'],
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 알림 = new 토스트(page);
  const 내것: { 첫째?: 임시회원; 둘째?: 임시회원 } = {};
  const 이전주문: { 번호들: string[] } = { 번호들: [] };

  try {
    await test.step('새로 만든 회원 둘을 만들고 둘 다 장바구니에 재고 1개인 상품을 담는다', async () => {
      const 첫째 = await 회원과장바구니(page.request, [상품번호.콜드브루]);
      내것.첫째 = 첫째;
      const 둘째 = await 회원과장바구니(request, [상품번호.콜드브루]);
      내것.둘째 = 둘째;
      await verify('새로 만든 회원 둘이 있다', [await 로그인한아이디(page.request), await 로그인한아이디(request)], [첫째.loginId, 둘째.loginId], { blocker: true });
      const 줄들 = await 장바구니조회(page.request);
      await verify(
        '첫째 회원 장바구니에 재고 1개인 상품이 담겨 있다',
        `${줄들.map((줄) => 줄.productId).join(', ')} · 재고 ${(await 상품조회(page.request, 상품번호.콜드브루)).stock}개`,
        `${상품번호.콜드브루} · 재고 1개`,
        { blocker: true },
      );
    });

    await test.step('첫째 회원이 주문서 「③ 최종 확인」 단계까지 간다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      이전주문.번호들 = await 내주문번호들(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await 주문서.결제수단단계로가기();
      await 주문서.최종확인단계로가기('계좌이체');
      await verify('첫째 회원은 최종 확인 단계까지 왔다', await 주문서.현재단계이름(), '③ 최종 확인', { blocker: true });
    });

    await test.step('둘째 회원이 그 상품을 먼저 산 뒤 첫째 회원이 「결제하기」를 누른다', async () => {
      const 상품 = await 상품조회(page.request, 상품번호.콜드브루);
      await 장바구니주문(request);
      await 주문서.동의체크박스.check();
      await 주문서.결제하기버튼.click();
      const 문구 = `재고가 부족한 상품이 있습니다: ${상품.name}`;
      await 알림.기다리기('재고가 부족한 상품이 있습니다');
      await verify('결제하는 사이 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다', await 알림.문구(문구).first().isVisible(), true);
      const 지금 = await 내주문번호들(page.request);
      await verify('재고가 모자라면 첫째 회원의 주문 내역에 새 주문이 생기지 않는다', `새 주문 ${지금.filter((번호) => !이전주문.번호들.includes(번호)).length}건`, '새 주문 0건');
    });
  } finally {
    if (내것.둘째) await 회원정리(request, 내것.둘째);
    if (내것.첫째) await 회원정리(page.request, 내것.첫째);
  }
});
