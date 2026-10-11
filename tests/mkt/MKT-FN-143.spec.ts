import { defineCase, test, verify } from '@platform/kit';

import { 여섯개넘게맞는글자 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-143',
  name: '맞는 상품이 6개 넘는 글자로 자동완성을 요청해도 5개까지만 온다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('맞는 상품이 6개 넘는 글자로 자동완성 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/products/suggest', { params: { q: await 여섯개넘게맞는글자(request) } });
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    await verify('맞는 상품이 6개 넘는 글자로 자동완성을 요청해도 5개까지만 온다', ((await 응답.json()) as { items: unknown[] }).items.length, 5);
  });
});
