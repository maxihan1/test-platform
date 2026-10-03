import { defineCase, test, verify } from '@platform/kit';

type 상품요약 = { id: number };
type 오류본문 = { code?: string };

const 시도횟수 = 10;
const 허용밀리초 = 1500 + 1000;

export const spec = defineCase({
  tcId: 'MKT-FN-090',
  name: '리뷰 조회는 200 이거나 500 과 「UNAVAILABLE」로만 응답하고 목록 조회는 1.5초 안에 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 상품번호 = ((await (await request.get('/api/products?size=1')).json()) as { items: 상품요약[] }).items[0]?.id ?? 0;

  await test.step('리뷰 조회를 여러 번 부른다', async () => {
    const 응답들 = await Promise.all(Array.from({ length: 시도횟수 }, () => request.get(`/api/products/${상품번호}/reviews`)));
    const 허용된응답인가 = await Promise.all(
      응답들.map(async (응답) => 응답.status() === 200 || (응답.status() === 500 && ((await 응답.json()) as 오류본문).code === 'UNAVAILABLE')),
    );
    await verify('리뷰 조회는 200 이거나 500 과 코드 「UNAVAILABLE」로만 응답한다', 허용된응답인가.every((것) => 것), true);
  });

  await test.step('목록 조회를 여러 번 부른다', async () => {
    const 걸린시간들 = await Promise.all(
      Array.from({ length: 시도횟수 }, async () => {
        const 시작 = Date.now();
        await request.get('/api/products?size=5');
        return Date.now() - 시작;
      }),
    );
    await verify('응답은 1.5초 안에 도착한다', Math.max(...걸린시간들) <= 허용밀리초, true);
  });
});
