import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 리뷰조회 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-322',
  name: 'GET /api/products/1/reviews 는 리뷰 목록을 돌려준다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  await test.step('GET /api/products/1/reviews 를 부른다', async () => {
    const { 상태, 목록 } = await 리뷰조회(request, 1);
    await verify('GET /api/products/1/reviews 응답 코드가 200 이다', 상태, 200, { blocker: true });
    await verify('GET /api/products/1/reviews 는 리뷰 목록을 돌려준다', 목록.length > 0 && 목록.every((리뷰) => typeof 리뷰.content === 'string'), true);
  });
});
