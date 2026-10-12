import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-244',
  name: '상품 목록 조회는 200 과 JSON 본문으로 응답한다',
  precondition: ['비회원이다', '새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;
  let 줄번호 = 0;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('GET /api/products 를 부른다', async () => {
      const res = await request.get('/api/products');
      const JSON본문 = (res.headers()['content-type'] ?? '').includes('application/json') && Array.isArray(((await res.json()) as { items?: unknown }).items);
      await verify('상품 목록 조회는 200 과 JSON 본문으로 응답한다', [res.status(), JSON본문], [200, true]);
    });

    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('새로 가입한 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 요청세션아이디(request), 정보.loginId, { blocker: true });
    });

    await test.step('POST /api/cart 로 상품을 담는다', async () => {
      const res = await request.post('/api/cart', { data: { productId: 34, qty: 1, color: '', size: '' } });
      줄번호 = ((await res.json()) as { id?: number }).id ?? 0;
      await verify('장바구니 담기는 201 로 응답한다', res.status(), 201);
    });

    await test.step('DELETE /api/cart/{itemId} 로 담은 줄을 지운다', async () => {
      const res = await request.delete(`/api/cart/${String(줄번호)}`);
      await verify('장바구니 줄 삭제는 204 로 응답하고 본문이 없다', [res.status(), await res.text()], [204, '']);
    });
  } finally {
    await 탈퇴(request);
  }
});
