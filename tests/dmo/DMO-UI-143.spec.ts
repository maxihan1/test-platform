import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나, 주문합계읽기 } from './helpers/orders-flow.helper.js';
import { 주문상세읽기 } from './helpers/ops-data.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-143',
  name: '주문 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 결제완료 주문이 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 주문관리화면(page);
  const 회원 = { loginId: '' };
  let 주문 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원에게 결제완료 주문을 만든다', async () => {
    회원.loginId = (await 회원가입(request)).loginId;
    주문 = await 주문하나(page, 회원.loginId, '결제완료');
  });

  await test.step('만든 결제완료 주문이 주문 관리 화면에 보이는지 확인한다', async () => {
    await 화면.열기();
    await 화면.주문줄(주문).waitFor();
    await verify('일회용 회원에게 결제완료 주문이 있다', await 화면.상태글자(주문), '결제완료', { blocker: true });
  });

  await test.step('그 주문 줄의 「상세」를 누른다', async () => {
    const 상세 = await 주문상세읽기(page, 주문);
    const 합계 = await 주문합계읽기(page, 주문);
    await 화면.상세열기(주문);
    const 창글 = await 화면.틀.확인창.innerText();
    const 창 = await verify('상세 창이 뜬다', await 화면.틀.확인창.isVisible(), true);
    const 상품 = await verify('창에 상품이 보인다', 상세.lines.every((줄) => 창글.includes(줄.name)), true);
    const 배송 = await verify('창에 배송 정보가 보인다', 창글.includes(상세.shipping.address), true);
    const 금액 = await verify('창에 금액이 보인다', 창글.includes(`${합계.toLocaleString('ko-KR')}원`), true);
    await verify('주문 관리 화면에서 「상세」를 누르면 상품 · 배송 정보 · 금액이 든 창이 뜬다', 창 && 상품 && 배송 && 금액, true);
  });

  await test.step('상세 창의 「확인」을 누른다', async () => {
    await 화면.상세창확인누르기();
    await verify('상세 창에서 「확인」을 누르면 창이 닫힌다', await 화면.창닫혔나(), true);
  });

  await test.step('그 주문의 상태 드롭다운에서 「주문취소」를 고른다', async () => {
    await 화면.취소고르기(주문);
    await verify('주문 관리 화면에서 「주문취소」를 고르면 확인 창이 뜬다', await 화면.확인창떴나(), true);
  });

  await test.step('주문취소 확인 창의 「닫기」를 누른다', async () => {
    await 화면.취소창닫기();
    const 닫힘 = await verify('확인 창이 닫힌다', await 화면.창닫혔나(), true);
    await 화면.주문줄(주문).waitFor();
    const 돌아옴 = await verify('드롭다운이 「결제완료」로 돌아온다', await 화면.상태글자(주문), '결제완료');
    await verify('주문취소 확인 창에서 「닫기」를 누르면 창이 닫히고 드롭다운이 「결제완료」로 돌아온다', 닫힘 && 돌아옴 === true, true);
  });
});
