import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 리뷰목록받기 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-404',
  name: '리뷰 목록 요청은 그 상품 리뷰 목록을 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    상품번호: z.number().int().min(1).describe('상품 번호 — 리뷰가 있는 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/products/1/reviews 를 부른다', async () => {
    const 결과 = await 리뷰목록받기(request, params.상품번호, 5);
    await verify(
      '리뷰 목록 요청은 그 상품 리뷰 목록을 준다',
      { 상태: 결과.status, 리뷰있음: 결과.items.length > 0, 모두내용있음: 결과.items.every((리뷰) => typeof 리뷰.content === 'string') },
      { 상태: 200, 리뷰있음: true, 모두내용있음: true },
    );
  });
});
