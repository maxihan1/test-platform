import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 상품하나주문하기, 주문상태, 주문취소요청 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-416',
  name: '결제완료가 아닌 주문 취소 요청은 409 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 주문이 이미 취소돼 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 주문번호?: string } = {};

  try {
    await test.step('새로 가입한 회원의 주문을 하나 만들어 취소해 둔다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.주문번호 = (await 상품하나주문하기(request, 2)).id;
      await 주문취소요청(request, 준비.주문번호);
    });

    await test.step('주문이 이미 취소돼 있는지 확인한다', async () => {
      await verify('주문 상태가 「주문취소」다', await 주문상태(request, 준비.주문번호 ?? ''), '주문취소', { blocker: true });
    });

    await test.step('취소된 주문을 다시 취소한다', async () => {
      await verify('결제완료가 아닌 주문 취소 요청은 409 로 응답한다', await 주문취소요청(request, 준비.주문번호 ?? ''), 409);
    });

    await test.step('로그인 없이 주문 취소 요청을 보낸다', async () => {
      await request.post('/api/auth/logout');
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
      await verify('비로그인 주문 취소 요청은 401 로 응답한다', await 주문취소요청(request, 준비.주문번호 ?? ''), 401);
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});
