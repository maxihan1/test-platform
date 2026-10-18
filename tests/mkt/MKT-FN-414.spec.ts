import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 상품하나주문하기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-414',
  name: '남의 주문 상세 요청은 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['다른 새 회원이 주문을 하나 했다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 회원요청 = page.request;
  const 준비: { 주인?: 회원정보; 나?: 회원정보; 주문번호?: string } = {};

  try {
    await test.step('다른 새 회원이 주문을 한다', async () => {
      준비.주인 = await 새회원으로로그인(request);
      준비.주문번호 = (await 상품하나주문하기(request, 2)).id;
      준비.나 = await 새회원으로로그인(회원요청);
    });

    await test.step('두 회원이 로그인해 있는지 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(회원요청), true, { blocker: true });
    });

    await test.step('회원으로 그 주문 상세를 부른다', async () => {
      const 응답 = await 회원요청.get(`/api/orders/${encodeURIComponent(준비.주문번호 ?? '')}`);
      await verify('남의 주문 상세 요청은 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그인 없이 주문 목록을 부른다', async () => {
      await request.post('/api/auth/logout');
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
      const 응답 = await request.get('/api/orders', { params: { period: 'all' } });
      await verify('비로그인 주문 목록 요청은 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 회원과주문정리(request, 준비.주인, 준비.주문번호 === undefined ? [] : [준비.주문번호]);
    await 회원과주문정리(회원요청, 준비.나);
  }
});
