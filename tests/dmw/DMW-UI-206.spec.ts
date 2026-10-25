import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디, 일회용회원으로주문만들기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-206',
  name: '「주문 취소」를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」를 고르는 모달이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  let 회원아이디 = '';
  let 주문번호 = '';

  await test.step('일회용 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
    await 안내창막기(page);
    const 만듦 = await 일회용회원으로주문만들기(page);
    회원아이디 = 만듦.회원.loginId;
    주문번호 = 만듦.주문번호;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('결제완료 주문의 상세를 연다', async () => {
    await 상세.열기(주문번호);
    await verify('「주문 취소」 버튼이 보이는 주문 상세 화면이다', await 상세.주문취소버튼.isVisible(), true, { blocker: true });
  });

  await test.step('결제완료 주문 상세에서 「주문 취소」를 누른다', async () => {
    await 상세.취소모달열기();
    const 모달 = await verify('취소 사유를 고르는 모달이 보인다', await 상세.취소모달.창.isVisible(), true);
    const 사유들 = await verify('취소 사유는 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」다', (await 상세.사유선택.getByRole('option').allInnerTexts()).join(', '), '단순 변심, 상품 정보 상이, 배송 지연, 기타');
    await verify('「주문 취소」를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」를 고르는 모달이 보인다', 모달 && 사유들, true);
  });

  await test.step('취소 사유에서 「기타」를 고른다', async () => {
    await 상세.사유고르기('기타');
    await verify('취소 사유 「기타」를 고르면 사유 입력칸이 보인다', await 상세.사유입력.isVisible(), true);
  });
});
