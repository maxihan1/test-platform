import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 주문서값으로 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문만들기 } from './helpers/order.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-409',
  name: '「취소하기」를 빠르게 두 번 눌러도 주문은 한 번만 취소되어 오류 토스트가 보이지 않는다',
  platforms: ['android'],
  techniques: ['오류 추정'],
  precondition: ['「주문 취소」 창에서 「단순 변심」을 골랐다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z.string().describe('주문할 상품 — 품절이 아닌 상품').default('USB-C 허브'),
    receiver: z.string().describe('주문서 받는 분 — 이름').default('김데모'),
    phone: z.string().describe('주문서 연락처 — 휴대폰 번호').default('01012345678'),
    keyword: z.string().describe('주소 검색어 — 검색 결과가 나오는 도로명').default('테헤란로'),
    detail: z.string().describe('상세 주소 — 아무 글').default('1층'),
    payment: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단 — 신용카드 · 계좌이체 · 무통장입금').default('신용카드'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 주문상세화면(driver);
  const 알림 = new 토스트(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 하나를 주문한다', async () => {
    await 주문만들기(driver, params.product, 주문서값으로(params));
  });

  await test.step('주문 상세의 「주문 취소」 창에서 「단순 변심」을 고른다', async () => {
    await 상세.취소창열기().catch(() => undefined);
    await 상세.사유고르기('단순 변심').catch(() => undefined);
    await verify('「주문 취소」 창이 떠 있다', await 상세.취소창보이나(), true, { blocker: true });
  });

  await test.step('「취소하기」를 빠르게 두 번 누른다', async () => {
    await 상세.취소하기두번누르기().catch(() => undefined);
    await 알림.뜰때까지(8000).catch(() => undefined);
    const 토스트글 = (await 알림.보이나()) ? await 알림.글() : '';
    await 상세.상태가될때까지('주문취소').catch(() => undefined);
    const 상태 = await 상세.상태글();
    const 오류토스트 = 토스트글 !== '' && 토스트글 !== '주문이 취소되었습니다' ? 토스트글 : '';
    const 한번만취소 = await verify('주문은 한 번만 취소되어 상태가 「주문취소」다', 상태, '주문취소');
    const 오류없음 = await verify('오류 토스트가 보이지 않는다', 오류토스트, '');
    await verify('「취소하기」를 빠르게 두 번 눌러도 주문은 한 번만 취소되어 오류 토스트가 보이지 않는다', 한번만취소 && 오류없음, true);
  }, { capture: true });
});
