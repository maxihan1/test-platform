import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-280',
  name: '목록 조회에 page=2 · size=5 를 주면 items 5건과 total · page 2 · size 5 가 돌아온다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/posts?page=2&size=5 를 부른다', async () => {
    const res = await request.get('/api/posts', { params: { page: 2, size: 5 } });
    const 본문 = (await res.json()) as { items?: unknown[]; total?: unknown; page?: unknown; size?: unknown };
    const 맞다 = Array.isArray(본문.items) && 본문.items.length === 5 && typeof 본문.total === 'number' && 본문.page === 2 && 본문.size === 5;
    await verify('목록 조회에 page=2 · size=5 를 주면 items 5건과 total · page 2 · size 5 가 돌아온다', 맞다, true);
  });
});
