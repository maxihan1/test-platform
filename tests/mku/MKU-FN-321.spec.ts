import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-321',
  name: 'GET /api/products/1 은 이미지 · 옵션 · 재고 · 문의를 돌려준다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  await test.step('GET /api/products/1 을 부른다', async () => {
    const 응답 = await request.get('/api/products/1');
    await verify('GET /api/products/1 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 본문 = (await 응답.json()) as { images?: unknown; colors?: unknown; stock?: unknown; qna?: unknown };
    await verify('GET /api/products/1 은 이미지 · 옵션 · 재고 · 문의를 돌려준다', [Array.isArray(본문.images), Array.isArray(본문.colors), typeof 본문.stock === 'number', Array.isArray(본문.qna)], [true, true, true, true]);
  });
});
