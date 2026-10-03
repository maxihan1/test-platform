import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-108',
  name: '리뷰 조회가 실패하면 500 과 code UNAVAILABLE 로 응답한다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    reviewsId: z.number().describe('리뷰를 읽을 상품 번호').default(3),
    tries: z.number().describe('리뷰 조회 횟수').default(30),
    listTries: z.number().describe('목록 조회 횟수').default(15),
  }),
  expected: z.object({
    failCode: z.string().describe('실패 응답 code').default('UNAVAILABLE'),
    maxSeconds: z.number().describe('가장 느린 응답 상한(초)').default(1.5),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/products/{id}/reviews 를 여러 번 부른다', async () => {
    const 실패들: string[] = [];
    for (let 번 = 0; 번 < params.tries; 번 += 1) {
      const 응답 = await request.get(`/api/products/${params.reviewsId}/reviews`);
      if (응답.status() === 500) {
        const 본문 = (await 응답.json()) as { code?: string };
        실패들.push(본문.code ?? '');
      }
    }
    await verify(
      '리뷰 조회가 실패하면 500 과 code UNAVAILABLE 로 응답한다',
      { 실패한적있음: 실패들.length > 0, 실패는모두기대코드: 실패들.every((code) => code === expected.failCode) },
      { 실패한적있음: true, 실패는모두기대코드: true },
    );
  });

  await test.step('GET /api/products 를 여러 번 부르며 응답 시간을 잰다', async () => {
    let 가장느린초 = 0;
    for (let 번 = 0; 번 < params.listTries; 번 += 1) {
      const 시작 = Date.now();
      await request.get('/api/products');
      가장느린초 = Math.max(가장느린초, (Date.now() - 시작) / 1000);
    }
    await verify('응답이 늦게 와도 1.5초를 넘지 않는다', 가장느린초 <= expected.maxSeconds, true);
  });
});
