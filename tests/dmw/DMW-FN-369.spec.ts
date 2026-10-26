import { defineCase, test, verify } from '@platform/kit';

import { 옵션있는상품 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-369',
  name: '상품 상세 API 는 이미지 · 옵션 · 재고 · 문의를 담아 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/products/{id} 를 부른다', async () => {
    const 상품 = await 옵션있는상품(request);
    const 응답 = await request.get(`/api/products/${상품.id}`);
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    const 몸 = (await 응답.json()) as Record<string, unknown>;
    const 이미지 = await verify('이미지 칸이 있다', Object.keys(몸).some((이름) => /image|img|thumb|photo/i.test(이름)), true);
    const 옵션 = await verify('옵션 칸이 있다', Array.isArray(몸.colors) && Array.isArray(몸.sizes), true);
    const 재고 = await verify('재고 칸이 있다', typeof 몸.stock === 'number', true);
    const 문의 = await verify('문의 칸이 있다', Array.isArray(몸.qna), true);
    await verify('상품 상세 API 는 이미지 · 옵션 · 재고 · 문의를 담아 응답한다', 이미지 && 옵션 && 재고 && 문의, true);
  });
});
