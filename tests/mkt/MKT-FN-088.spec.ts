import { defineCase, test, verify } from '@platform/kit';

type 목록본문 = { items: unknown[]; total: number; page: number; size: number };

export const spec = defineCase({
  tcId: 'MKT-FN-088',
  name: '목록 조회는 items · total · page · size 를 담아 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('글 목록과 상품 목록을 page · size 로 조회한다', async () => {
    const 글 = (await (await request.get('/api/posts?page=2&size=3')).json()) as 목록본문;
    const 상품 = (await (await request.get('/api/products?page=2&size=5')).json()) as 목록본문;
    await verify(
      '목록 조회는 items · total · page · size 를 담아 응답한다',
      [
        Array.isArray(글.items),
        typeof 글.total,
        글.page,
        글.size,
        Array.isArray(상품.items),
        typeof 상품.total,
        상품.page,
        상품.size,
      ],
      [true, 'number', 2, 3, true, 'number', 2, 5],
    );
  });
});
