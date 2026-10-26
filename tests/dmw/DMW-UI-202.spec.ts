import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 날짜글 } from './helpers/common-tools.helper.js';
import { 상품하나주문 } from './helpers/data.helper.js';
import { 끝쪽옵션없는상품, 로그인한아이디, 서로다른상품둘주문, 주문목록 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-202',
  name: '주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 주문내역화면(page);
  let 회원아이디 = '';
  let 첫주문 = { id: '', total: 0 };
  let 상품이름 = '';

  await test.step('일회용 회원으로 로그인해 주문 하나를 만든다', async () => {
    await 안내창막기(page);
    const 회원 = await 일회용회원으로로그인(page);
    회원아이디 = 회원.loginId;
    const 상품 = await 끝쪽옵션없는상품(page.request);
    상품이름 = 상품.name;
    첫주문 = await 상품하나주문(page.request, 상품.id);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify('주문 내역 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역 줄을 확인한다', async () => {
    const 서버줄 = (await 주문목록(page.request, '3m')).find((줄) => 줄.id === 첫주문.id);
    const 칸들 = await 화면.줄(첫주문.id).locator('td').allInnerTexts();
    const 주문일 = await verify('줄에 주문일이 보인다', 칸들[0], 날짜글(new Date(서버줄?.createdAt ?? 0)));
    const 주문번호 = await verify('줄에 주문번호가 보인다', 칸들[1], 첫주문.id);
    const 상품명 = await verify('줄에 대표 상품명이 보인다', 칸들[2], 상품이름);
    const 금액 = await verify('줄에 결제 금액이 보인다', 칸들[3], `${첫주문.total.toLocaleString('ko-KR')}원`);
    const 상태 = await verify('줄에 상태가 보인다', 칸들[4], '결제완료');
    await verify('주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다', 주문일 && 주문번호 && 상품명 && 금액 && 상태, true);
  });

  await test.step('상품 둘을 한 번에 주문한 뒤 주문 내역을 연다', async () => {
    const 둘주문 = await 서로다른상품둘주문(page.request);
    await 화면.열기();
    const 칸들 = await 화면.줄(둘주문.id).locator('td').allInnerTexts();
    await verify('상품을 여럿 주문한 줄의 상품명은 「<대표 상품명> 외 <N>건」으로 보인다', 칸들[2], `${둘주문.대표상품명} 외 1건`);
  });
});
