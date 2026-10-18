import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 장바구니목록 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-409',
  name: '장바구니는 POST 로 담고 PATCH 로 수량을 바꾸고 DELETE 로 지운 결과를 GET 으로 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('장바구니에 담고 수량을 바꾸고 지운 뒤 조회한다', async () => {
      const 담기 = await request.post('/api/cart', { data: { productId: 2, qty: 1, color: '', size: '' } });
      const 줄번호 = ((await 담기.json()) as { id: number }).id;
      const 담은뒤 = (await 장바구니목록(request)).find((줄) => 줄.id === 줄번호)?.qty;
      const 바꾸기 = await request.patch(`/api/cart/${줄번호}`, { data: { qty: 3 } });
      const 바꾼뒤 = (await 장바구니목록(request)).find((줄) => 줄.id === 줄번호)?.qty;
      const 지우기 = await request.delete(`/api/cart/${줄번호}`);
      const 지운뒤 = (await 장바구니목록(request)).filter((줄) => 줄.id === 줄번호).length;
      await verify(
        '장바구니는 POST 로 담고 PATCH 로 수량을 바꾸고 DELETE 로 지운 결과를 GET 으로 준다',
        { 담기: 담기.ok(), 담은뒤, 바꾸기: 바꾸기.ok(), 바꾼뒤, 지우기: 지우기.ok(), 지운뒤 },
        { 담기: true, 담은뒤: 1, 바꾸기: true, 바꾼뒤: 3, 지우기: true, 지운뒤: 0 },
      );
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});
