import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-403',
  name: '상품 상세 응답에 이미지 · 옵션 · 재고 · 문의가 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    상품번호: z.number().int().min(1).describe('상품 번호 — 옵션이 있는 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/products/1 을 부른다', async () => {
    const 응답 = await request.get(`/api/products/${params.상품번호}`);
    const 본문 = (await 응답.json()) as Record<string, unknown>;
    const 키들 = Object.keys(본문);
    await verify(
      '상품 상세 응답에 이미지 · 옵션 · 재고 · 문의가 있다',
      {
        이미지: 키들.some((키) => /image/i.test(키)),
        옵션: Array.isArray(본문['colors']) && Array.isArray(본문['sizes']),
        재고: typeof 본문['stock'] === 'number',
        문의: Array.isArray(본문['qna']),
      },
      { 이미지: true, 옵션: true, 재고: true, 문의: true },
    );
  });
});
