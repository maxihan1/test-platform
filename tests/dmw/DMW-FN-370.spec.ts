import { defineCase, test, verify } from '@platform/kit';

import { 상품목록 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-370',
  name: '리뷰 목록 API 는 리뷰 목록을 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/products/{id}/reviews 를 부른다', async () => {
    const 리뷰있는상품 = (await 상품목록(request)).find((하나) => 하나.reviewCount > 0);
    if (리뷰있는상품 === undefined) throw new Error('리뷰가 있는 상품을 찾지 못했다');
    let 상태 = 0;
    let 몸: { items?: unknown[] } = {};
    for (let 번 = 0; 번 < 3; 번 += 1) {
      const 응답 = await request.get(`/api/products/${리뷰있는상품.id}/reviews`);
      상태 = 응답.status();
      if (상태 !== 500) {
        몸 = (await 응답.json()) as { items?: unknown[] };
        break;
      }
    }
    const 코드 = await verify('응답 코드가 200이다', 상태, 200);
    const 목록 = await verify('리뷰가 한 건 이상 있다', (몸.items?.length ?? 0) > 0, true);
    await verify('리뷰 목록 API 는 리뷰 목록을 돌려준다', 코드 && 목록, true);
  });
});
