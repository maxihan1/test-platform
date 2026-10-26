import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디, 일회용회원으로주문만들기, 재고읽기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-284',
  name: '「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  const 주문수량 = 2;
  let 회원아이디 = '';
  let 주문번호 = '';
  let 상품번호 = 0;
  let 취소전재고 = 0;

  await test.step('일회용 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
    await 안내창막기(page);
    const 만듦 = await 일회용회원으로주문만들기(page, 주문수량);
    회원아이디 = 만듦.회원.loginId;
    주문번호 = 만듦.주문번호;
    상품번호 = 만듦.상품.id;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('결제완료 주문의 취소 모달을 연다', async () => {
    await 상세.열기(주문번호);
    await 상세.취소모달열기();
    await verify('취소 사유를 고르는 모달이 보인다', await 상세.취소모달.창.isVisible(), true, { blocker: true });
  });

  await test.step('결제완료 주문의 취소 모달에서 「취소 신청」을 누른다', async () => {
    취소전재고 = await 재고읽기(page.request, 상품번호);
    await 상세.취소신청누르기();
    await 상세.주문취소버튼.waitFor({ state: 'detached' });
    await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태.innerText(), '주문취소');
  });

  await test.step('취소한 주문 상품의 재고를 확인한다', async () => {
    const 취소뒤재고 = await 재고읽기(page.request, 상품번호);
    await verify('주문을 취소하면 그 상품 재고가 주문 수량만큼 되돌아온다', 취소뒤재고 - 취소전재고, 주문수량);
  });
});
