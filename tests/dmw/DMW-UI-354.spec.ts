import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 로그인한아이디, 일회용회원으로주문만들기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-354',
  name: '주문 상세 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  const 제목 = new 화면제목(page);
  let 회원아이디 = '';
  let 주문번호 = '';
  let 상품이름 = '';

  await test.step('일회용 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
    await 안내창막기(page);
    const 만듦 = await 일회용회원으로주문만들기(page);
    회원아이디 = 만듦.회원.loginId;
    주문번호 = 만듦.주문번호;
    상품이름 = 만듦.상품.name;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('결제완료 주문의 상세를 연다', async () => {
    await 상세.열기(주문번호);
    await verify('「주문 취소」 버튼이 보이는 주문 상세 화면이다', await 상세.주문취소버튼.isVisible(), true, { blocker: true });
  });

  await test.step('주문 취소 모달의 「닫기」를 누른다', async () => {
    await 상세.취소모달열기();
    await 상세.모달닫기.click();
    await 상세.취소모달.사라질때까지();
    await verify('주문 상세에서 주문 취소 모달 「닫기」를 누르면 모달이 닫힌다', await 상세.취소모달.창.isVisible(), false);
  });

  await test.step('주문 상세의 상품명을 누른다', async () => {
    await 상세.상품링크들.filter({ hasText: 상품이름 }).click();
    await 제목.글(상품이름).waitFor();
    await verify('주문 상세에서 상품명을 누르면 그 상품 상세가 보인다', await 제목.글(상품이름).isVisible(), true);
  });
});
