import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기 } from './helpers/api.helper.js';
import { 주문상세열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-298',
  name: '취소가 되면 「주문 취소」 창이 닫힌다',
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
  const 상세 = new 주문상세화면(driver);
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

    await test.step('주문 상세를 연다', async () => {
      await 주문상세열기(driver, 주문번호);
    });

    await test.step('결제완료 주문의 상세를 확인한다', async () => {
      await verify('결제완료 주문 상세가 보인다', await 상세.상태.getText().catch(() => ''), '결제완료', { blocker: true });
    });

    await test.step('「주문 취소」 창을 연다', async () => {
      await 상세.취소창열기();
    });

    await test.step('「주문 취소」 창을 확인한다', async () => {
      await verify('「주문 취소」 창이 보인다', await 상세.창보이나(), true, { blocker: true });
    });

    await test.step('「단순 변심」을 고르고 「취소하기」를 누른다', async () => {
      await 상세.사유고르기(0);
      await 상세.취소하기누르기();
      const 토스트글 = await new 토스트(driver).글();
      await 상세.창닫힐때까지();
      await verify('취소가 되면 「주문 취소」 창이 닫힌다', await 상세.창보이나(), false);

      await verify('취소가 되면 토스트 「주문이 취소되었습니다」가 보인다', 토스트글, '주문이 취소되었습니다');

      await 상세.상태바뀔때까지('주문취소');
      await verify('취소가 되면 상태가 「주문취소」로 바뀐다', await 상세.상태.getText(), '주문취소');

      const 사유줄 = (await 상세.끝까지읽기()).find((글) => 글.startsWith('취소 사유')) ?? '';
      await verify('취소가 되면 「취소 사유 단순 변심」 줄이 보인다', 사유줄, '취소 사유 단순 변심');
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
