import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 둘째아이디 } from './helpers/account.helper.js';
import { 내주문번호들, 로그아웃, 옵션없는상품번호, 재고1상품 } from './helpers/shop.helper.js';
import { 바로주문, 배송가능일, 시험배송정보, 주문취소 } from './helpers/order.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-144',
  name: '로그인 없이 쿠폰 목록을 요청하면 401 로 응답한다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '두 번째 회원으로 로그인해 있다', '회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 비밀번호 = params.password ?? '';
  let 첫주문번호 = '';
  let 배송중주문번호 = '';
  let 만든주문번호: string | undefined;

  try {
    await test.step('첫 번째 회원의 주문 번호를 받아 두고 로그아웃한다', async () => {
      await verify('로그인 응답 코드가 200이다', await API로그인(request, params.loginId ?? '', 비밀번호), 200, { blocker: true });
      const 주문들 = await 내주문번호들(request);
      첫주문번호 = 주문들[0]?.id ?? '';
      배송중주문번호 = 주문들.find((주문) => 주문.status === '배송중')?.id ?? '';
      await verify('첫 번째 회원의 주문이 있다', 첫주문번호 !== '', true, { blocker: true });
      await verify('첫 번째 회원의 배송중 주문이 있다', 배송중주문번호 !== '', true, { blocker: true });
      await 로그아웃(request);
    });

    await test.step('로그인 없이 쿠폰 목록 API 를 요청한다', async () => {
      await verify('로그인 없이 쿠폰 목록을 요청하면 401 로 응답한다', (await request.get('/api/coupons')).status(), 401);
    });

    await test.step('로그인 없이 장바구니 API 를 요청한다', async () => {
      await verify('로그인 없이 장바구니를 요청하면 401 로 응답한다', (await request.get('/api/cart')).status(), 401);
    });

    await test.step('로그인 없이 주문 API 를 요청한다', async () => {
      const 응답 = await request.post('/api/orders', {
        data: {
          shipping: { ...시험배송정보, deliveryDate: 배송가능일() },
          payment: { method: '계좌이체', cardCompany: '', installment: '' },
          couponId: null,
          direct: { productId: 옵션없는상품번호, color: '', size: '', qty: 1 },
        },
      });
      await verify('로그인 없이 주문을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('재고보다 많은 수량으로 주문 API 를 요청한다', async () => {
      await verify('두 번째 회원으로 로그인한다', await API로그인(request, 둘째아이디, 비밀번호), 200, { blocker: true });
      const 상품 = await 재고1상품(request);
      const 주문 = await 바로주문(request, { productId: 상품.id, qty: 2 });
      만든주문번호 = 주문.id;
      await verify('재고보다 많이 주문을 요청하면 409 로 응답한다', 주문.status, 409);
    });

    await test.step('로그인 없이 내 주문 목록 API 를 요청한다', async () => {
      await 로그아웃(request);
      await verify('로그인 없이 내 주문 목록을 요청하면 401 로 응답한다', (await request.get('/api/orders?period=all')).status(), 401);
    });

    await test.step('첫 번째 회원의 주문 상세 API 를 요청한다', async () => {
      await verify('두 번째 회원으로 로그인한다', await API로그인(request, 둘째아이디, 비밀번호), 200, { blocker: true });
      await verify('남의 주문 상세를 요청하면 403 으로 응답한다', (await request.get(`/api/orders/${첫주문번호}`)).status(), 403);
    });

    await test.step('로그인 없이 주문 취소 API 를 요청한다', async () => {
      await 로그아웃(request);
      const 응답 = await request.post(`/api/orders/${첫주문번호}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify('로그인 없이 주문 취소를 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('배송중인 내 주문의 취소 API 를 요청한다', async () => {
      await verify('첫 번째 회원으로 로그인한다', await API로그인(request, params.loginId ?? '', 비밀번호), 200, { blocker: true });
      const 응답 = await request.post(`/api/orders/${배송중주문번호}/cancel`, { data: { reason: '단순 변심', detail: '' } });
      await verify('배송중인 주문의 취소를 요청하면 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('주소 검색 API 를 빈 검색어로 요청한다', async () => {
      await 로그아웃(request);
      await verify('주소 검색을 빈 검색어로 요청하면 400 으로 응답한다', (await request.get('/api/address', { params: { q: '' } })).status(), 400);
    });
  } finally {
    if (만든주문번호 !== undefined) {
      await API로그인(request, 둘째아이디, 비밀번호);
      await 주문취소(request, 만든주문번호);
    }
  }
});
