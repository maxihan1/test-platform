import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-250',
  name: '비회원이 부른 상품 상세는 200 이고 이미지 · 옵션 · 재고 · 문의 칸이 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/products/1 을 부른다', async () => {
    const res = await request.get('/api/products/1');
    const 본문 = (await res.json()) as { images?: unknown; colors?: unknown; sizes?: unknown; stock?: unknown; qna?: unknown };
    const 칸들 = [Array.isArray(본문.images), Array.isArray(본문.colors) && Array.isArray(본문.sizes), typeof 본문.stock === 'number', Array.isArray(본문.qna)];
    await verify('비회원이 부른 상품 상세는 200 이고 이미지 · 옵션 · 재고 · 문의 칸이 있다', [res.status(), ...칸들], [200, true, true, true, true]);
  });
});
