import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기, 주문읽기 } from './helpers/api.helper.js';
import { 주문상세열기, 한국날짜 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-095',
  name: '주문 상세에 주문번호 · 상태 · 「주문일 {날짜}」 · 상품 줄 · 받는 분 · 주소 · 배송 희망일 · 결제 수단 · 금액 넷이 보인다',
  platforms: ['android'],
  precondition: ['결제완료 주문이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 주문번호 = '';
  try {
    await test.step('서버에서 주문을 만든다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      주문번호 = await 주문만들기(request, { productId: params.주문상품번호 });
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('그 주문의 상세를 연다', async () => {
      const 상세 = new 주문상세화면(driver);
      await 주문상세열기(driver, 주문번호);
      await verify('결제완료 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '결제완료', { blocker: true });

      const 주문 = await 주문읽기(request, 주문번호);
      const 배송 = 주문.shipping;
      const 화면글 = (await 상세.끝까지읽기()).join('\n');
      const 항목: [string, string][] = [
        ['주문번호', 주문.id],
        ['상태', 주문.status],
        ['주문일', `주문일 ${한국날짜(주문.createdAt)}`],
        ['상품 줄', 주문.lines[0].name],
        ['받는 분', `받는 분 ${배송.receiver} · ${배송.phone}`],
        ['주소', `[${배송.zipcode}] ${배송.address} ${배송.detail}`],
        ['배송 희망일', `배송 희망일 ${배송.deliveryDate}`],
        ['결제 수단', `결제 수단 ${주문.payment.method}`],
        ['상품 금액', '상품 금액'],
        ['쿠폰 할인', '쿠폰 할인'],
        ['배송비', '배송비'],
        ['결제 금액', '결제 금액'],
      ];
      const 빠진항목 = 항목.filter(([, 글]) => !화면글.includes(글)).map(([이름]) => 이름);
      await verify('주문 상세에 주문번호 · 상태 · 「주문일 {날짜}」 · 상품 줄 · 받는 분 · 주소 · 배송 희망일 · 결제 수단 · 금액 넷이 보인다', 빠진항목.join(', '), '');
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
